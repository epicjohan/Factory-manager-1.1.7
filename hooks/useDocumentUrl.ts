import { useState, useEffect } from 'react';
import { ArticleFile } from '../types';
import { documentService } from '../services/db/documentService';
import { SyncService } from '../services/sync';
import { KEYS } from '../services/db/core';

export const useDocumentUrl = (file: ArticleFile | null | undefined, serverUrl?: string) => {
    const [url, setUrl] = useState<string | null>(file?.url || null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;

        const resolveUrl = async () => {
            if (!file) {
                if (isMounted) { setUrl(null); setLoading(false); }
                return;
            }

            // If we already have a robust URL (Base64 from legacy or external HTTP)
            if (file.url && (file.url.startsWith('data:') || file.url.startsWith('http'))) {
                if (isMounted) { setUrl(file.url); setLoading(false); }
                return;
            }

            // New DMS Relation Logic
            if (file.documentId) {
                try {
                    const doc = await documentService.getDocumentById(file.documentId);
                    if (doc) {
                        // Priority 1: Legacy Base64 is stored in the doc object
                        if (doc.url && doc.url.startsWith('data:')) {
                            if (isMounted) { setUrl(doc.url); setLoading(false); }
                            return;
                        }

                        // Priority 2: Not yet synced, but we don't have base64? (Shouldn't happen on new uploads)
                        if (!doc.isSynced && serverUrl) {
                            // Fallback string construction
                            const pbUrl = SyncService.resolveFileUrl(doc.id, { name: doc.name }, KEYS.DOCUMENTS, serverUrl);
                            if (isMounted) { setUrl(pbUrl); setLoading(false); }
                            return;
                        }

                        // Priority 3: Synced to PB
                        if (serverUrl) {
                            const pbUrl = SyncService.resolveFileUrl(doc.id, { name: doc.name }, KEYS.DOCUMENTS, serverUrl);
                            if (isMounted) { setUrl(pbUrl); setLoading(false); }
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Failed resolving document URL", e);
                }
            }

            // Legacy / Missing Fallback
            if (serverUrl && file.name) {
                // If there's no documentId but we are linked to a PB setup/article with a filename
                // This shouldn't normally be hit perfectly without recordId, but safe fallback
                const fallbackUrl = SyncService.resolveFileUrl(file.id, file.name, KEYS.ARTICLES, serverUrl);
                if (isMounted) { setUrl(fallbackUrl); setLoading(false); }
                return;
            }

            if (isMounted) { setUrl(null); setLoading(false); }
        };

        setLoading(true);
        resolveUrl();

        return () => { isMounted = false; };
    }, [file, serverUrl]);

    return { url, loading };
};
