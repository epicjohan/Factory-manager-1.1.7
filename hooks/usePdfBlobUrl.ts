import { useState, useEffect, useRef } from 'react';

// Module-level cache: once a blob is created for a given data URL hash, reuse it forever.
// This prevents Chrome's PDF viewer from resetting/shrinking zoom on each remount.
const blobCache = new Map<string, string>();

function hashDataUrl(url: string): string {
    // Use the first 200 + last 200 chars as a fast key (avoids hashing megabytes of base64)
    if (url.length <= 400) return url;
    return `${url.length}:${url.slice(0, 200)}:${url.slice(-200)}`;
}

export function usePdfBlobUrl(url: string | null | undefined): string | null {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const lastSourceUrl = useRef<string | null | undefined>(undefined);

    useEffect(() => {
        // Skip if the source URL hasn't actually changed
        if (url === lastSourceUrl.current) return;
        lastSourceUrl.current = url;

        // Nothing to process
        if (!url) {
            setBlobUrl(null);
            return;
        }

        // If it's a normal HTTP(S) URL, pass it through directly
        if (!url.startsWith('data:')) {
            setBlobUrl(url);
            return;
        }

        // Safety: only process data:application/pdf
        if (!url.startsWith('data:application/pdf')) {
            setBlobUrl(null);
            return;
        }

        // Check cache first
        const cacheKey = hashDataUrl(url);
        const cached = blobCache.get(cacheKey);
        if (cached) {
            setBlobUrl(cached);
            return;
        }

        let active = true;

        // Convert base64 data URL to blob
        try {
            fetch(url)
                .then(res => {
                    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
                    return res.blob();
                })
                .then(blob => {
                    if (active) {
                        const created = URL.createObjectURL(blob);
                        blobCache.set(cacheKey, created); // Cache it permanently
                        setBlobUrl(created);
                    }
                })
                .catch(err => {
                    console.warn("usePdfBlobUrl: could not convert data URL to blob:", err);
                    if (active) setBlobUrl(null);
                });
        } catch (err) {
            console.warn("usePdfBlobUrl: synchronous error:", err);
            if (active) setBlobUrl(null);
        }

        return () => {
            active = false;
        };
    }, [url]);

    return blobUrl;
}
