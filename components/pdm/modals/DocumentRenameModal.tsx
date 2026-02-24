import React, { useState, useEffect } from 'react';
import { X, FileCode, File as FileIcon, Image as ImageIcon, CheckCircle2 } from '../../../icons';

interface DocumentRenameModalProps {
    files: File[];
    role: string;
    onClose: () => void;
    onConfirm: (renamedFiles: File[]) => void;
}

export const DocumentRenameModal: React.FC<DocumentRenameModalProps> = ({ files, role, onClose, onConfirm }) => {
    // We store the list of files to be renamed.
    // the value in the input represents the name WITHOUT the extension to prevent errors.
    const [fileState, setFileState] = useState<{ originalFile: File, newBaseName: string, extension: string }[]>([]);

    useEffect(() => {
        const initialState = files.map(f => {
            const lastDotIndex = f.name.lastIndexOf('.');
            const hasExtension = lastDotIndex !== -1 && lastDotIndex !== 0; // Guard against hidden files like .gitignore
            const baseName = hasExtension ? f.name.substring(0, lastDotIndex) : f.name;
            const ext = hasExtension ? f.name.substring(lastDotIndex) : '';
            return {
                originalFile: f,
                newBaseName: baseName,
                extension: ext
            };
        });
        setFileState(initialState);
    }, [files]);

    const handleNameChange = (index: number, newName: string) => {
        const updated = [...fileState];
        updated[index].newBaseName = newName;
        setFileState(updated);
    };

    const handleConfirm = () => {
        // Reconstruct the new File objects
        const renamedFiles = fileState.map(item => {
            const finalName = item.newBaseName.trim() + item.extension;
            // Native File constructor allows creating a new file with identical data but new name.
            return new File([item.originalFile], finalName, { type: item.originalFile.type, lastModified: item.originalFile.lastModified });
        });
        onConfirm(renamedFiles);
    };

    const getIconInfo = (type: string) => {
        if (type.startsWith('image/')) return { icon: <ImageIcon size={20} />, color: 'text-blue-500 bg-blue-50' };
        if (type.includes('pdf')) return { icon: <FileIcon size={20} />, color: 'text-red-500 bg-red-50' };
        if (role === 'NC' || role === 'CAM') return { icon: <FileCode size={20} />, color: 'text-orange-500 bg-orange-50' };
        return { icon: <FileIcon size={20} />, color: 'text-slate-500 bg-slate-50' };
    };

    if (fileState.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl relative border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors z-10">
                    <X size={20} />
                </button>

                <div className="mb-6 pr-12">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Bestanden Hernoemen</h3>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Controleer de bestandsnamen voor ze in het systeem worden opgeslagen.</p>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-4 custom-scrollbar">
                    {fileState.map((item, idx) => {
                        const iconData = getIconInfo(item.originalFile.type);
                        return (
                            <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Invoernaam File {idx + 1}</label>
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-transparent shadow-sm ${iconData.color}`}>
                                        {iconData.icon}
                                    </div>
                                    <div className="flex-1 relative flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 overflow-hidden transition-all shadow-sm">
                                        <input
                                            type="text"
                                            value={item.newBaseName}
                                            onChange={(e) => handleNameChange(idx, e.target.value)}
                                            className="w-full pl-4 py-3 bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none"
                                            placeholder="Nieuwe bestandsnaam..."
                                        />
                                        {item.extension && (
                                            <span className="pr-4 py-3 text-sm font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 pointer-events-none select-none">
                                                {item.extension}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Annuleren</button>
                    <button onClick={handleConfirm} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                        <CheckCircle2 size={16} /> Bevestigen & Upload
                    </button>
                </div>
            </div>
        </div>
    );
};
