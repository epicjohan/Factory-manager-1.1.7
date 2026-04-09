import React from 'react';
import {
    FileCode, Download, Upload, CheckCircle2, Lock, Eye,
    Archive, ShieldAlert, UserCircle, History as ClockCounterClockwise
} from '../../../icons';
import { ArticleFile } from '../../../types';

interface CAMProjectCardProps {
    camFile: ArticleFile | undefined;
    isLocked: boolean;
    isArchived: boolean;
    isCheckoutByMe: boolean;
    isLockedByOthers: boolean;
    onUploadClick: () => void;
    onLibraryClick: () => void;
    onCheckOut: () => void;
    onCancelLock: () => void;
    onCheckIn: () => void;
    onViewHistory: (file: ArticleFile) => void;
    onDownload: (file: ArticleFile) => void;
}

export const CAMProjectCard: React.FC<CAMProjectCardProps> = ({
    camFile, isLocked, isArchived, isCheckoutByMe, isLockedByOthers,
    onUploadClick, onLibraryClick, onCheckOut, onCancelLock, onCheckIn,
    onViewHistory, onDownload
}) => {
    return (
        <div className={`p-8 rounded-[2.5rem] border-2 transition-all shadow-sm flex flex-col h-full ${camFile?.lockedBy ? 'bg-orange-50 border-orange-500 dark:bg-orange-900/10' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
            {/* HEADER */}
            <div className="flex justify-between items-start mb-8 shrink-0">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl shadow-inner ${camFile?.lockedBy ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>
                        <FileCode size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">CAM Project</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bronbestand (Check-in/Out)</p>
                    </div>
                </div>
                {camFile && (
                    <div className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-2xl">V{camFile.version}</div>
                )}
            </div>

            {/* CONTENT */}
            <div className="flex-1 mb-8 flex flex-col justify-center">
                {camFile ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-current/10">
                            <div className="font-bold text-sm truncate uppercase tracking-tight">{camFile.name}</div>
                            <div className="flex justify-between items-center mt-4 text-[10px]">
                                <div className="font-bold text-slate-400 uppercase tracking-widest flex gap-3">
                                    <span>{new Date(camFile.uploadDate).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><UserCircle size={12} /> {camFile.uploadedBy}</span>
                                </div>
                                {camFile.previousVersions && camFile.previousVersions.length > 0 && (
                                    <button
                                        onClick={() => onViewHistory(camFile)}
                                        className="text-[10px] font-black uppercase flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors"
                                        title="Toont alleen versiehistorie binnen de huidige revisie. Eerdere revisies hebben hun eigen historie."
                                    >
                                        <ClockCounterClockwise size={12} /> {camFile.previousVersions.length} Oude Versie{camFile.previousVersions.length !== 1 ? 's' : ''}
                                    </button>
                                )}
                            </div>
                        </div>
                        {camFile.lockedBy && (
                            <div className="bg-orange-500 text-white p-3 rounded-[2rem] flex items-center gap-3 animate-pulse">
                                <ShieldAlert size={18} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Gereserveerd door {camFile.lockedBy}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                        <FileCode size={64} className="opacity-10 mb-6" />
                        <p className="text-xs mb-6 font-bold uppercase tracking-widest">Nog geen CAM project geüpload</p>
                        {!isLocked && !isArchived && (
                            <div className="flex gap-4">
                                <button onClick={onUploadClick} className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3">
                                    <Upload size={18} /> Upload Nieuw
                                </button>
                                <button onClick={onLibraryClick} className="px-6 py-4 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 dark:bg-slate-800/50 dark:hover:bg-blue-600/20 dark:text-slate-400 dark:hover:text-blue-400 rounded-2xl font-black uppercase text-xs tracking-widest shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800/50 transition-all active:scale-95 flex items-center justify-center gap-3">
                                    <Archive size={18} /> Bibliotheek
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-3 mt-auto shrink-0">
                {camFile && (
                    isCheckoutByMe ? (
                        <>
                            <button onClick={onCheckIn} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95">
                                <CheckCircle2 size={18} /> Check-In Nieuwe Versie
                            </button>
                            <button onClick={onCancelLock} className="w-full py-3 text-red-500 font-bold uppercase text-[10px] tracking-widest hover:bg-red-50 rounded-[2rem] transition-all">Bewerking Annuleren</button>
                        </>
                    ) : isLockedByOthers ? (
                        <div className="text-center">
                            <button disabled className="w-full py-4 bg-slate-200 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 cursor-not-allowed">
                                <Lock size={18} /> In gebruik door {camFile.lockedBy}
                            </button>
                            <button onClick={() => onDownload(camFile)} className="mt-3 text-blue-600 text-[10px] font-black uppercase hover:underline">Download Kopie (Read-Only)</button>
                        </div>
                    ) : (
                        !isLocked && !isArchived ? (
                            <button onClick={onCheckOut} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform">
                                <Download size={18} /> Check-out & Bewerk
                            </button>
                        ) : (
                            <button onClick={() => onDownload(camFile)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Download (Read Only)</button>
                        )
                    )
                )}
            </div>
        </div>
    );
};
