export const ImageProcessor = {
    /**
     * Resizes and compresses an image if it exceeds limits.
     * Keeps industrial sync light.
     */
    compress: async (source: string, maxWidth = 800, quality = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Only resize if it's wider than maxWidth
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context failed"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                // Always convert to JPEG for database storage consistency
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = source;
        });
    },

    isBase64Image: (str: string) => str.startsWith('data:image/')
};