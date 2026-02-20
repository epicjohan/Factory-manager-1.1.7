
import React, { useRef, useState } from 'react';
import { 
    Upload, FileText, Trash2, File, 
    X, Download, Box, Search, UserCircle, Eye, AlertTriangle
} from 'lucide-react';
import { ArticleFile, FileRole } from '../../types';
import { generateId } from '../../services/db/core';
import { ImageProcessor } from '../../services/db/imageProcessor';

interface ArticleFilesProps {
    files: ArticleFile[];
    isLocked: boolean;
    onUpdate: (files: ArticleFile[]) => void;
    onPreview: (file: ArticleFile) => void;
    user: any;
}

/**
 * Beheert alleen de BRON bestanden op Artikel niveau (PDF, STEP).
 * Geen lock-systeem nodig, aangezien dit vaste klantdata is.
 */
export const ArticleFiles: React.FC<ArticleFilesProps> = ({ files, isLocked, onUpdate, onPreview, user }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedRole, setSelectedRole] = useState<FileRole>(FileRole.DRAWING);
    const [fileToDelete, setFileToDelete] = useState<ArticleFile | null>(null);

    // Filter alleen de bronbestanden (zonder setupId)
    const sourceFiles = files.filter(f => !f.setupId);

    const handleFiles = async (fileList: FileList | null) => {
        if (!fileList || isLocked) return;

        const newFilesList: ArticleFile[] = [...files];
        
        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const reader = new FileReader();

            const filePromise = new Promise<ArticleFile>((resolve) => {
                reader.onload = async () => {
                    let result = reader.result as string;
                    
                    if (file.type.startsWith('image/')) {
                        try {
                            result = await ImageProcessor.compress(result);
                        } catch (e) { console.warn('Compression failed', e); }
                    }

                    resolve({
                        id: generateId(),
                        name: file.name,
                        type: file.type,
                        url: result,
                        uploadedBy: user?.name || 'Onbekend',
                        uploadDate: new Date().toISOString(),
                        fileRole: selectedRole,
                        version: 1
                    });
                };
                reader.readAsDataURL(file);
            });
            
            newFilesList.push(await filePromise);
        }

        onUpdate(newFilesList);
    };

    const handleDeleteClick = (file: ArticleFile) => {
        if (isLocked) return;
        setFileToDelete(file);
    };

    const confirmDelete = () => {
        if (!fileToDelete) return;
        onUpdate(files.filter(f => f.id !== fileToDelete.id));
        setFileToDelete(null);
    };

    const handleDownload = (file: ArticleFile) => {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getRoleIcon = (role: FileRole) => {
        switch(role) {
            case FileRole.DRAWING: return <FileText size={18} className="text-blue-500" />;
            case FileRole.MODEL: return <Box size={18} className="text-purple-500" />;
            default: return <File size={18} className="text-slate-400" />;
        }
    };

    const getRoleLabel = (role: FileRole) => {
        switch(role) {
            case FileRole.DRAWING: return 'Tekening (PDF)';
            case FileRole.MODEL: return '3D Model (STEP)';
            default: return 'Overig';
        }
    };

    return (
        <div className="animate-in fade-in duration-300 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" /> Bron-Documentatie
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Klantbestanden & Specificaties (Read-Only Copy)</p>
                </div>
                
                {!isLocked && (
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                        {[FileRole.DRAWING, FileRole.MODEL, FileRole.OTHER].map(role => (
                            <button 
                                key={role}
                                onClick={() => setSelectedRole(role as FileRole)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${selectedRole === role ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md' : 'text-slate-500'}`}
                            >
                                {getRoleIcon(role as FileRole)}
                                {getRoleLabel(role as FileRole)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {!isLocked && (
                    <div 
                        className={`aspect-square rounded-[2.5rem] border-4 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl shadow-xl mb-4 group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-800">
                            <Upload size={32} className="text-blue-600" />
                        </div>
                        <span className="font-black text-xs text-slate-500 uppercase tracking-[0.2em]">{getRoleLabel(selectedRole)}</span>
                    </div>
                )}

                {sourceFiles.map(file => (
                    <div key={file.id} className="relative group aspect-square bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 transition-all overflow-hidden flex flex-col shadow-sm hover:shadow-xl">
                        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 relative">
                            <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 transition-transform group-hover:scale-110">
                                {file.fileRole === FileRole.MODEL ? <Box size={48} className="text-purple-500" /> : <FileText size={48} className="text-blue-500" />}
                            </div>

                            <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 backdrop-blur-sm p-6">
                                <h3 className="text-white text-center font-bold text-sm mb-2 px-2 line-clamp-2">{file.name}</h3>
                                <button onClick={() => handleDownload(file)} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 px-4 transition-transform active:scale-95">
                                    <Download size={18} /> Downloaden
                                </button>
                                <div className="flex gap-2 w-full">
                                    <button onClick={() => onPreview(file)} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 px-4"><Eye size={14}/> Preview</button>
                                    {!isLocked && (
                                        <button onClick={() => handleDeleteClick(file)} className="p-3 bg-red-500/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/30"><Trash2 size={16}/></button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-white dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 shrink-0">
                            <div className="flex items-center gap-2 mb-1">
                                {getRoleIcon(file.fileRole)}
                                <div className="text-xs font-black text-slate-800 dark:text-white truncate flex-1 uppercase tracking-tight" title={file.name}>{file.name}</div>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><UserCircle size={10} /> {file.uploadedBy}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {sourceFiles.length === 0 && isLocked && (
                <div className="py-32 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
                    <FileText size={64} className="opacity-10 mb-4" />
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em]">Geen bronbestanden geüpload</p>
                </div>
            )}

            {/* DELETE CONFIRM MODAL */}
            {fileToDelete && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative border-2 border-red-500">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Bestand Verwijderen?</h3>
                            <p className="text-xs font-bold text-slate-500 mt-2">
                                Weet u zeker dat u <strong className="text-slate-800 dark:text-white">{fileToDelete.name}</strong> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setFileToDelete(null)} className="flex-1 py-3 text-slate-500 font-bold uppercase text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                Annuleren
                            </button>
                            <button onClick={confirmDelete} className="flex-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-all">
                                Verwijderen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
