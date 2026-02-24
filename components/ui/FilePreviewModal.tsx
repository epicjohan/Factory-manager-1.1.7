import React, { useEffect, useState } from 'react';
import { X, Download, FileText, ZoomIn, ExternalLink } from '../../icons';
import { ArticleFile } from '../../types';
import { usePdfBlobUrl } from '../../hooks/usePdfBlobUrl';
import { documentService } from '../../services/db/documentService';

interface FilePreviewModalProps {
    file: ArticleFile | null;
    onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);

    // Sluit bij druk op ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        if (!file) {
            setFileUrl(null);
            return;
        }

        if (file.documentId && !file.url) {
            setIsLoadingUrl(true);
            documentService.getDocumentById(file.documentId)
                .then(doc => {
                    if (doc && doc.url) {
                        setFileUrl(doc.url);
                    } else {
                        setFileUrl(file.url || null);
                    }
                })
                .catch(err => {
                    console.error("Failed to load document data:", err);
                    setFileUrl(file.url || null);
                })
                .finally(() => {
                    setIsLoadingUrl(false);
                });
        } else {
            setFileUrl(file.url || null);
            setIsLoadingUrl(false);
        }
    }, [file]);

    const isImage = file?.type?.startsWith('image/') || false;
    const isPdf = file?.type === 'application/pdf';
    const safePdfUrl = usePdfBlobUrl(isPdf ? fileUrl : null);

    if (!file) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-slate-900 border-b border-white/10 shrink-0 shadow-xl z-50">
                <div className="text-white">
                    <h3 className="font-black text-lg md:text-xl uppercase tracking-tight truncate max-w-[200px] md:max-w-md">{file.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">
                        {new Date(file.uploadDate).toLocaleString()} • {file.uploadedBy}
                    </p>
                </div>
                <div className="flex gap-4">
                    <a
                        href={fileUrl || '#'}
                        download={file.name}
                        className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-white transition-all border border-slate-700"
                        title="Downloaden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Download size={24} />
                    </a>
                    <button
                        onClick={onClose}
                        className="p-4 bg-red-600 hover:bg-red-500 rounded-2xl text-white transition-all shadow-lg shadow-red-900/20"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Content Viewer - 100% Height minus Header */}
            <div className="flex-1 overflow-auto flex items-center justify-center relative bg-slate-900/50 touch-pan-x touch-pan-y" onClick={onClose}>
                <div
                    className="relative w-full h-full flex items-center justify-center p-2 md:p-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    {isLoadingUrl ? (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                            <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                            <span className="text-sm font-bold tracking-widest uppercase">Document inladen...</span>
                        </div>
                    ) : isImage ? (
                        <img
                            src={fileUrl || ''}
                            alt={file.name}
                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                        />
                    ) : isPdf ? (
                        safePdfUrl ? (
                            <iframe
                                src={safePdfUrl}
                                className="w-full h-full bg-white rounded-2xl shadow-2xl border-none"
                                title="PDF Preview"
                                style={{ minHeight: '80vh' }}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-white text-slate-500 rounded-2xl" style={{ minHeight: '80vh' }}>
                                Laden of bestandstype onbekend...
                            </div>
                        )
                    ) : (
                        <div className="text-center text-white bg-slate-800 p-10 rounded-2xl border border-slate-700">
                            <FileText size={64} className="mx-auto mb-4 text-blue-400" />
                            <h3 className="text-xl font-bold mb-2">Voorbeeld niet beschikbaar</h3>
                            <p className="text-slate-400 mb-6">Dit bestandstype kan niet direct worden weergegeven.</p>
                            <a
                                href={fileUrl || '#'}
                                download={file.name}
                                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold inline-flex items-center gap-2 uppercase tracking-widest text-sm shadow-xl"
                            >
                                <ExternalLink size={18} /> Bestand Openen
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer hint - Only for images */}
            {isImage && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 text-white/90 px-6 py-3 rounded-full text-xs font-black pointer-events-none backdrop-blur-md uppercase tracking-widest border border-white/10 shadow-xl">
                    <ZoomIn size={14} className="inline mr-2" /> Tik naast de afbeelding om te sluiten
                </div>
            )}
        </div>
    );
};
