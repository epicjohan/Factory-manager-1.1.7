import React from 'react';
import {
    Upload, Download, Eye, Cpu, Archive, History as ClockCounterClockwise
} from '../../../icons';
import { ArticleFile } from '../../../types';

interface NCProgramCardProps {
    ncFile: ArticleFile | undefined;
    isLocked: boolean;
    isArchived: boolean;
    onUploadClick: () => void;
    onLibraryClick: () => void;
    onPreview: (file: ArticleFile) => void;
    onViewHistory: (file: ArticleFile) => void;
    onDownload: (file: ArticleFile) => void;
}

export const NCProgramCard: React.FC<NCProgramCardProps> = ({
    ncFile, isLocked, isArchived,
    onUploadClick, onLibraryClick, onPreview, onViewHistory, onDownload
}) => {
    return (
        <div className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full">
            {/* HEADER */}
            <div className="flex justify-between items-start mb-8 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-slate-900 rounded-2xl text-emerald-500 shadow-xl">
                        <Cpu size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">NC Programma</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Machine G-Code (ISO)</p>
                    </div>
                </div>
                {ncFile && (
                    <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-2xl shadow-sm">V{ncFile.version}</div>
                )}
            </div>

            {/* CONTENT */}
            <div className="flex-1 mb-8 flex flex-col justify-center">
                {ncFile ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                        <div className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400 truncate">{ncFile.name}</div>
                        <div className="flex justify-between items-center mt-4 text-[10px]">
                            <div className="font-bold text-slate-400 uppercase tracking-widest flex gap-3">
                                <span>{new Date(ncFile.uploadDate).toLocaleDateString()}</span>
                                <span>{ncFile.uploadedBy}</span>
                            </div>
                            {ncFile.previousVersions && ncFile.previousVersions.length > 0 && (
                                <button
                                    onClick={() => onViewHistory(ncFile)}
                                    className="text-[10px] font-black uppercase flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors"
                                    title="Toont alleen versiehistorie binnen de huidige revisie. Eerdere revisies hebben hun eigen historie."
                                >
                                    <ClockCounterClockwise size={12} /> {ncFile.previousVersions.length} Oude Versie{ncFile.previousVersions.length !== 1 ? 's' : ''}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                        <Cpu size={64} className="opacity-10 mb-6" />
                        <p className="text-xs mb-6 font-bold uppercase tracking-widest">Nog geen G-code geüpload</p>
                        {!isArchived && (
                            <div className="flex gap-4">
                                <button onClick={onUploadClick} className="px-6 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                    <Upload size={18} /> Upload Nieuw
                                </button>
                                <button onClick={onLibraryClick} className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800/50 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-sm border border-slate-200 dark:border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-3">
                                    <Archive size={18} /> Bibliotheek
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-3 mt-auto shrink-0">
                {ncFile && !isArchived && (
                    <button onClick={onUploadClick} className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                        <Upload size={18} /> {isLocked ? 'Proces Wijziging (Update)' : 'Nieuwe NC Versie'}
                    </button>
                )}
                {ncFile && (
                    <div className="flex gap-2">
                        <button onClick={() => onPreview(ncFile)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-[2rem] font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-colors">
                            <Eye size={14} /> Inzien
                        </button>
                        <button onClick={() => onDownload(ncFile)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-[2rem] font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-colors">
                            <Download size={14} /> Download
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
