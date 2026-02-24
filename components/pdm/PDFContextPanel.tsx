
import React, { useState, useEffect } from 'react';
import { ArticleFile, FileRole } from '../../types';
import { FileText, Maximize, X } from '../../icons';
import { usePdfBlobUrl } from '../../hooks/usePdfBlobUrl';
import { documentService } from '../../services/db/documentService';

interface PDFContextPanelProps {
    file: ArticleFile | null;
    onClose: () => void;
    onMaximize: () => void;
}

export const PDFContextPanel: React.FC<PDFContextPanelProps> = ({ file, onClose, onMaximize }) => {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);

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

    if (!file) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <FileText size={64} className="mb-4 opacity-20" />
                <h4 className="font-bold text-white mb-2">Geen Tekening Geselecteerd</h4>
                <p className="text-xs text-slate-400">Selecteer een tekening in de bestandenlijst of open een setup met gekoppelde media.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-900">
            {/* HEADER */}
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-blue-600 rounded-2xl text-white shrink-0">
                        <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate uppercase tracking-wide">{file.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">v{file.version} • {new Date(file.uploadDate).toLocaleDateString()}</div>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={onMaximize} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-colors" title="Volledig Scherm">
                        <Maximize size={16} />
                    </button>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-2xl transition-colors" title="Sluiten">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 bg-black/50 relative overflow-hidden flex items-center justify-center">
                {isLoadingUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <div className="w-8 h-8 border-4 border-slate-800 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <span className="text-xs uppercase tracking-widest font-bold">Document inladen...</span>
                    </div>
                ) : isImage ? (
                    <img src={fileUrl || ''} className="max-w-full max-h-full object-contain" alt="Preview" />
                ) : (
                    safePdfUrl ? (
                        <iframe
                            src={`${safePdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                            className="w-full h-full border-none bg-white"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-white text-slate-500">
                            Laden of bestandstype onbekend...
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
