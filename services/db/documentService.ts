import { DMSDocument, Article } from '../../types';
import { KEYS, loadTable, saveTable, outboxUtils, getNowISO, generateId, getCurrentUserName } from './core';

export const documentService = {
    getDocuments: () => loadTable<DMSDocument[]>(KEYS.DOCUMENTS, []),

    getDocumentById: async (id: string) => {
        const items = await documentService.getDocuments();
        return items.find(d => d.id === id);
    },

    getDocumentsByIds: async (ids: string[]) => {
        const items = await documentService.getDocuments();
        return items.filter(d => ids.includes(d.id));
    },

    addDocumentFromBase64: async (name: string, type: string, base64Url: string, size?: number): Promise<DMSDocument> => {
        const now = getNowISO();
        const items = await loadTable<DMSDocument[]>(KEYS.DOCUMENTS, []);

        // Bepaal volgend documentnummer (DOC-YYYY-XXXX-RRRR)
        // A-02 FIX: Random suffix (4 tekens) voorkomt duplicate nummers bij meerdere
        // gelijktijdige clients die lokaal hetzelfde volgnummer berekenen.
        const currentYear = new Date().getFullYear().toString();
        const currentDocsThisYear = items.filter(d => d.documentNumber?.includes(currentYear)).length;
        const nextNum = (currentDocsThisYear + 1).toString().padStart(4, '0');
        const suffix = generateId(4);
        const documentNumber = `DOC-${currentYear}-${nextNum}-${suffix}`;

        const doc: DMSDocument = {
            id: generateId(),
            documentNumber,
            name,
            type,
            size,
            url: base64Url,
            uploadedBy: getCurrentUserName(),
            uploadDate: now,
            isSynced: false
        };

        items.push(doc);
        await saveTable(KEYS.DOCUMENTS, items);

        // Let PocketBase sync handle the actual file upload conversion
        await outboxUtils.addToOutbox(KEYS.DOCUMENTS, 'INSERT', doc);

        return doc;
    },

    // D-04: Metadata van een bestaand document bijwerken (naam, type)
    updateDocument: async (id: string, updates: Partial<Pick<DMSDocument, 'name' | 'type'>>): Promise<DMSDocument | null> => {
        const now = getNowISO();
        const items = await loadTable<DMSDocument[]>(KEYS.DOCUMENTS, []);
        const idx = items.findIndex(d => d.id === id);

        if (idx === -1) return null;

        const updated: DMSDocument = {
            ...items[idx],
            ...updates,
            // Voeg updated timestamp toe (als any want het zit niet in het type maar wel in de sync)
        };
        (updated as any).updated = now;

        items[idx] = updated;
        await saveTable(KEYS.DOCUMENTS, items);
        await outboxUtils.addToOutbox(KEYS.DOCUMENTS, 'UPDATE', updated);
        await outboxUtils.logAudit('UPDATE_DOCUMENT', getCurrentUserName(), `Document '${updated.name}' bijgewerkt.`);

        return updated;
    },

    deleteDocument: async (id: string) => {
        const items = await loadTable<DMSDocument[]>(KEYS.DOCUMENTS, []);
        const idx = items.findIndex(x => x.id === id);

        if (idx !== -1) {
            const removedDoc = items[idx];
            items.splice(idx, 1);
            await saveTable(KEYS.DOCUMENTS, items);
            await outboxUtils.addToOutbox(KEYS.DOCUMENTS, 'DELETE', removedDoc);
        }
    },

    // D-04: Zoek documenten op naam of documentnummer (case-insensitive)
    searchDocuments: async (query: string): Promise<DMSDocument[]> => {
        const items = await documentService.getDocuments();
        if (!query || !query.trim()) return items;

        const q = query.toLowerCase().trim();
        return items.filter(d =>
            d.name.toLowerCase().includes(q) ||
            d.documentNumber?.toLowerCase().includes(q) ||
            d.type?.toLowerCase().includes(q) ||
            d.uploadedBy?.toLowerCase().includes(q)
        );
    },

    // D-04: Vind documenten die niet (meer) gekoppeld zijn aan een ArticleFile.
    // Dit zijn potentiële wees-documenten die opslagruimte innemen zonder referentie.
    getOrphanedDocuments: async (): Promise<DMSDocument[]> => {
        const [documents, articles] = await Promise.all([
            loadTable<DMSDocument[]>(KEYS.DOCUMENTS, []),
            loadTable<Article[]>(KEYS.ARTICLES, [])
        ]);

        // Verzamel alle documentIds die nog ergens gekoppeld zijn
        const referencedIds = new Set<string>();
        for (const article of articles) {
            for (const file of (article.files || [])) {
                if (file.documentId) {
                    referencedIds.add(file.documentId);
                }
                // Ook previousVersions meerekenen — die zijn nog geldig
                for (const prevId of (file.previousVersions || [])) {
                    referencedIds.add(prevId);
                }
            }
        }

        // Documenten die nergens gerefereerd worden
        return documents.filter(d => !referencedIds.has(d.id));
    },

    // D-04: Statistieken over de DMS-opslag (voor admin/dashboard)
    getDocumentStats: async () => {
        const documents = await documentService.getDocuments();
        const articles = await loadTable<Article[]>(KEYS.ARTICLES, []);

        // Tel gekoppelde documenten
        const referencedIds = new Set<string>();
        for (const article of articles) {
            for (const file of (article.files || [])) {
                if (file.documentId) referencedIds.add(file.documentId);
                for (const prevId of (file.previousVersions || [])) {
                    referencedIds.add(prevId);
                }
            }
        }

        const totalSize = documents.reduce((sum, d) => sum + (d.size || 0), 0);
        const orphanedDocs = documents.filter(d => !referencedIds.has(d.id));
        const syncedCount = documents.filter(d => d.isSynced).length;

        // Groepeer op type
        const typeDistribution: Record<string, number> = {};
        for (const doc of documents) {
            const ext = doc.name.split('.').pop()?.toLowerCase() || doc.type || 'onbekend';
            typeDistribution[ext] = (typeDistribution[ext] || 0) + 1;
        }

        return {
            totalDocuments: documents.length,
            totalSizeBytes: totalSize,
            totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
            orphanedCount: orphanedDocs.length,
            syncedCount,
            unsyncedCount: documents.length - syncedCount,
            typeDistribution
        };
    }
};
