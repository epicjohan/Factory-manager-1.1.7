import { useState, useEffect } from 'react';

export function usePdfBlobUrl(url: string | null | undefined): string | null {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!url || !url.startsWith('data:application/pdf')) {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                setBlobUrl(null);
            }
            return;
        }

        let active = true;
        let createdUrl = '';

        // Convert base64 to blob without blocking UI
        fetch(url)
            .then(res => res.blob())
            .then(blob => {
                if (active) {
                    createdUrl = URL.createObjectURL(blob);
                    setBlobUrl(createdUrl);
                }
            })
            .catch(err => console.error("Error creating PDF blob:", err));

        return () => {
            active = false;
            if (createdUrl) {
                URL.revokeObjectURL(createdUrl);
            }
        };
    }, [url]);

    // If it's not a data URL, just return it directly so normal URLs keep working
    if (url && !url.startsWith('data:application/pdf')) {
        return url;
    }

    return blobUrl;
}
