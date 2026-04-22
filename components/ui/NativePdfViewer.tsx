import React, { useState } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2 } from '../../icons';

// In Vite, this is the recommended way to load the pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface NativePdfViewerProps {
    fileUrl: string | File | Blob;
    className?: string;
    onLoadSuccess?: () => void;
    onLoadError?: (error: Error) => void;
}

export const NativePdfViewer: React.FC<NativePdfViewerProps> = ({ fileUrl, className = '', onLoadSuccess, onLoadError }) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [loading, setLoading] = useState(true);

    const onDocumentLoadSuccess = (pdf: any) => {
        setNumPages(pdf.numPages);
        setLoading(false);
        if (onLoadSuccess) onLoadSuccess();
    };

    const handleLoadError = (error: Error) => {
        setLoading(false);
        console.error('Failed to load PDF natively:', error);
        if (onLoadError) onLoadError(error);
    };

    return (
        <div className={`relative flex flex-col items-center bg-slate-100 overflow-y-auto custom-scrollbar ${className}`}>
            <div className="flex-1 w-full flex justify-center py-4">
                <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={handleLoadError}
                    loading={
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-4 mt-20">
                            <Loader2 size={48} className="animate-spin" />
                            <p className="font-bold text-sm uppercase tracking-widest">Document Inladen...</p>
                        </div>
                    }
                    error={
                        <div className="flex flex-col items-center justify-center text-slate-500 mt-20 p-8 text-center">
                            <p className="font-bold mb-2">Fout bij laden van de tekening.</p>
                            <p className="text-xs">U kunt proberen de tekening handmatig te downloaden via de knop onderin of in de bestanden sectie.</p>
                        </div>
                    }
                >
                    {/* Render all pages or just the first page depending on the UX needed. Often 1 is enough for drawings, but loop handles manuals */}
                    {Array.from(new Array(numPages), (el, index) => (
                        <div key={`page_${index + 1}`} className="mb-4 shadow-xl border border-slate-200">
                            <Page
                                pageNumber={index + 1}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                // Width scaling to fit standard screens (adjusting to responsive bounds dynamically is hard in react-pdf without resize observer, so we use max-width 100%)
                                width={Math.min(window.innerWidth - 40, 1200)} 
                            />
                        </div>
                    ))}
                </Document>
            </div>
            
            {numPages > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/60 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md">
                    {numPages} Pagina's
                </div>
            )}
        </div>
    );
};
