import React, { useState, useRef, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
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

    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(window.innerWidth - 40);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (entries[0]?.contentRect?.width) {
                // Keep some padding
                setContainerWidth(Math.max(300, entries[0].contentRect.width - 20));
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={containerRef} className={`relative flex flex-col items-center bg-slate-100 overflow-hidden ${className}`}>
            <div className="flex-1 w-full h-full flex justify-center py-4 bg-slate-800 rounded-xl overflow-hidden">
                <TransformWrapper 
                    initialScale={1} 
                    minScale={0.5} 
                    maxScale={8} 
                    centerOnInit={true}
                    wheel={{ step: 0.1 }}
                >
                    {({ resetTransform }) => (
                        <React.Fragment>
                            {/* Zoom knoppen toegevoegd mocht pinch of double click niet handig zijn */}
                            <div className="absolute top-4 right-4 z-[60] flex gap-2 bg-black/60 p-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                                <button onClick={() => resetTransform()} className="px-3 py-1 text-xs font-bold text-white uppercase tracking-widest hover:text-blue-400">Reset</button>
                            </div>
                            
                            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                                // Fit bounds
                                width={containerWidth} 
                            />
                        </div>
                    ))}
                </Document>
                            </TransformComponent>
                        </React.Fragment>
                    )}
                </TransformWrapper>
            </div>
            
            {numPages > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/60 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md">
                    {numPages} Pagina's
                </div>
            )}
        </div>
    );
};
