import { useState, useEffect, useMemo } from 'react';
import { ArticleFile } from '../types';
import { documentService } from '../services/db/documentService';
import { SyncService } from '../services/sync';
import { KEYS } from '../services/db/core';

export const useDocumentMap = (files: ArticleFile[], serverUrl?: string) => {
    const [urlMap, setUrlMap] = useState<Record<string, string>>({});
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    // Create a stable dependency string so we don't infinitely fetch on every render
    const fileDepString = useMemo(() =>
        JSON.stringify(files.map(f => `${f.id}:${f.documentId || ''}:${f.url ? f.url.substring(0, 20) : ''}`)),
        [files]);

    useEffect(() => {
        let isMounted = true;

        const resolveUrls = async () => {
            if (!files || files.length === 0) {
                if (isMounted) { setUrlMap({}); setLoadingMap({}); }
                return;
            }

            // Eagerly set loading states for files we don't have yet
            const initialLoadingMap: Record<string, boolean> = {};
            files.forEach(f => initialLoadingMap[f.id] = true);
            if (isMounted) setLoadingMap(prev => ({ ...prev, ...initialLoadingMap }));

            const newUrlMap: Record<string, string> = {};
            const newLoadingMap: Record<string, boolean> = {};
            const idsToFetch: string[] = [];

            for (const file of files) {
                // Priority 0: Has ready-to-use legacy Base64 url or external URL
                if (file.url && (file.url.startsWith('data:') || file.url.startsWith('http'))) {
                    newUrlMap[file.id] = file.url;
                    newLoadingMap[file.id] = false;
                    continue;
                }

                // Priority 1: Has documentId -> Needs DB fetch
                if (file.documentId) {
                    idsToFetch.push(file.documentId);
                    newLoadingMap[file.id] = true;
                } else if (serverUrl && file.name) {
                    // Fallback Legacy PB Setup/Article if no local base64/docId
                    newUrlMap[file.id] = SyncService.resolveFileUrl(file.id, file.name, KEYS.ARTICLES, serverUrl);
                    newLoadingMap[file.id] = false;
                } else {
                    // Unresolvable
                    newLoadingMap[file.id] = false;
                }
            }

            // Bulk Fetch from DB (1 call instead of N calls)
            if (idsToFetch.length > 0) {
                try {
                    // Only fetch unique IDs to minimize parsing overhead
                    const uniqueIds = Array.from(new Set(idsToFetch));
                    const docs = await documentService.getDocumentsByIds(uniqueIds);
                    const docMap = new Map(docs.map(d => [d.id, d]));

                    for (const file of files) {
                        if (file.documentId && newLoadingMap[file.id]) {
                            const doc = docMap.get(file.documentId);
                            if (doc) {
                                if (doc.url && doc.url.startsWith('data:')) {
                                    newUrlMap[file.id] = doc.url;
                                } else if (serverUrl) {
                                    newUrlMap[file.id] = SyncService.resolveFileUrl(doc.id, { name: doc.name }, KEYS.DOCUMENTS, serverUrl);
                                }
                            }
                            newLoadingMap[file.id] = false;
                        }
                    }
                } catch (e) {
                    console.error("Bulk fetch failed in useDocumentMap", e);
                    // Mark loading as false for failed fetches
                    for (const file of files) {
                        if (file.documentId) newLoadingMap[file.id] = false;
                    }
                }
            }

            if (isMounted) {
                setUrlMap(prev => ({ ...prev, ...newUrlMap }));
                setLoadingMap(prev => ({ ...prev, ...newLoadingMap }));
            }
        };

        resolveUrls();

        return () => { isMounted = false; };
    }, [fileDepString, serverUrl]);

    return { urlMap, loadingMap };
};
