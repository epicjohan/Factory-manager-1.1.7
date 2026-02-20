
import React from 'react';
import { ArticleFile, FileRole } from '../../types';
import { FileText, Maximize, X } from 'lucide-react';

interface PDFContextPanelProps {
    file: ArticleFile | null;
    onClose: () => void;
    onMaximize: () => void;
}

export const PDFContextPanel: React.FC<PDFContextPanelProps> = ({ file, onClose, onMaximize }) => {
    if (!file) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <FileText size={64} className="mb-4 opacity-20" />
                <h4 className="font-bold text-white mb-2">Geen Tekening Geselecteerd</h4>
                <p className="text-xs text-slate-400">Selecteer een tekening in de bestandenlijst of open een setup met gekoppelde media.</p>
            </div>
        );
    }

    const isImage = file.type.startsWith('image/');

    return (
        <div className="flex flex-col h-full bg-slate-900">
            {/* HEADER */}
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-blue-600 rounded-lg text-white shrink-0">
                        <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate uppercase tracking-wide">{file.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">v{file.version} • {new Date(file.uploadDate).toLocaleDateString()}</div>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={onMaximize} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Volledig Scherm">
                        <Maximize size={16} />
                    </button>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors" title="Sluiten">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 bg-black/50 relative overflow-hidden flex items-center justify-center">
                {isImage ? (
                    <img src={file.url} className="max-w-full max-h-full object-contain" alt="Preview" />
                ) : (
                    <iframe 
                        src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0`} 
                        className="w-full h-full border-none bg-white" 
                        title="PDF Preview"
                    />
                )}
            </div>
        </div>
    );
};
