/**
 * D-02 FIX: Gecentraliseerde file utilities.
 * Vervangt 5× gedupliceerde handleDownload() en biedt een DMS-aware URL resolver.
 * 
 * Alle bestanden worden opgeslagen via documentService (DMS) en geresolved via documentId.
 * Het legacy url-veld op ArticleFile is verwijderd (D-01).
 */

import { ArticleFile, DMSDocument } from '../types';
import { documentService } from '../services/db/documentService';
import { SyncService } from '../services/sync';
import { db } from '../services/storage';
import { KEYS } from '../services/db/core';

/**
 * Resolvet de downloadbare URL voor een ArticleFile.
 * Haalt de base64/blob URL op uit de DMS store via documentId of genereert dynamisch de PB link.
 */
export const resolveFileUrl = async (file: ArticleFile): Promise<string | null> => {
    if (!file.documentId) return null;
    try {
        const doc = await documentService.getDocumentById(file.documentId);
        if (!doc) return null;

        // B-08 FIX: Dynamisch opbouwen op basis van de server settings als `.file` (Pocketbase Filename) beschikbaar is.
        // Hiermee omzeilen we hardcoded "localhost" URLs die onbruikbaar zijn voor andere PC's.
        const pbFile = (doc as any).file;
        if (pbFile) {
            const serverConfig = await db.getServerSettings();
            if (serverConfig && serverConfig.url) {
                return SyncService.resolveFileUrl(doc.id, pbFile, KEYS.DOCUMENTS, serverConfig.url);
            }
        }

        return doc.url || null;
    } catch (e) {
        console.error('[fileUtils] Fout bij resolven van document URL:', e);
        return null;
    }
};

/**
 * Download een ArticleFile via de DMS.
 * Resolvet eerst de URL via documentId, maakt dan een download-link aan.
 */
export const downloadFile = async (file: ArticleFile): Promise<void> => {
    const url = await resolveFileUrl(file);
    if (!url) {
        console.warn(`[fileUtils] Geen URL gevonden voor document ${file.documentId}`);
        return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Download een DMSDocument direct (voor versie-historie modals).
 */
export const downloadDmsDocument = (doc: DMSDocument): void => {
    const link = document.createElement('a');
    link.href = doc.url || '';
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Open een preview van een ArticleFile in een nieuw browser venster.
 * Ondersteunt PDFs en afbeeldingen.
 */
export const previewFile = async (file: ArticleFile): Promise<void> => {
    const url = await resolveFileUrl(file);
    if (!url) return;
    
    if (file.type === 'application/pdf' || file.type?.startsWith('image/')) {
        const newWindow = window.open();
        if (newWindow) {
            newWindow.document.write(
                `<iframe width='100%' height='100%' src='${url}' style='border:none; margin:0; padding:0;'></iframe>`
            );
        }
    }
};
