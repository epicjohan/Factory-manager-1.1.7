import React from 'react';
import {
    X, AlertTriangle, CornerUpRight, Download, UserCircle,
    History as ClockCounterClockwise
} from '../../../icons';
import { ArticleFile, DMSDocument } from '../../../types';
import { downloadDmsDocument } from '../../../utils/fileUtils';

// --- REASON MODAL (Proces Wijziging) ---

interface ReasonModalProps {
    isOpen: boolean;
    reason: string;
    onReasonChange: (reason: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ReasonModal: React.FC<ReasonModalProps> = ({
    isOpen, reason, onReasonChange, onConfirm, onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative border-2 border-orange-500">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-orange-50">
                        <CornerUpRight size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Proces Wijziging</h3>
                    <p className="text-xs font-bold text-slate-500 mt-2">Dit artikel is vrijgegeven. Geef een reden op voor deze wijziging.</p>
                </div>

                <textarea
                    autoFocus
                    rows={3}
                    className="w-full p-4 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium outline-none focus:border-orange-500 transition-all text-sm mb-6"
                    placeholder="Bijv. Optimalisatie voeding, aanpassing ijlgang..."
                    value={reason}
                    onChange={e => onReasonChange(e.target.value)}
                />

                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 text-slate-500 font-bold uppercase text-xs rounded-[2rem] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Annuleren</button>
                    <button onClick={onConfirm} disabled={!reason.trim()} className="flex-2 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-lg disabled:opacity-50 transition-all">Wijziging Doorvoeren</button>
                </div>
            </div>
        </div>
    );
};

// --- CANCEL CONFIRM MODAL ---

interface CancelConfirmModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const CancelConfirmModal: React.FC<CancelConfirmModalProps> = ({
    isOpen, onConfirm, onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative border-2 border-red-500">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Check-out Ongedaan Maken?</h3>
                    <p className="text-xs font-bold text-slate-500 mt-2">
                        Hiermee geeft u het bestand vrij. Eventuele lokale wijzigingen die nog niet zijn geüpload, gaan verloren.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 text-slate-500 font-bold uppercase text-xs rounded-[2rem] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        Terug
                    </button>
                    <button onClick={onConfirm} className="flex-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-lg transition-all">
                        Bevestig Annulering
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- VERSION HISTORY MODAL ---

interface VersionHistoryModalProps {
    isOpen: boolean;
    file: ArticleFile | null;
    docs: DMSDocument[];
    onClose: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
    isOpen, file, docs, onClose
}) => {
    if (!isOpen || !file) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl relative border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors">
                    <X size={20} />
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-800 shadow-sm shrink-0">
                        <ClockCounterClockwise size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Versie Historie</h3>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-2">
                            <span>{file.name}</span>
                            <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300">ACTUEEL: V{file.version || 1}</span>
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-2xl border border-blue-100 dark:border-blue-800/50 mb-4 flex items-start gap-2.5">
                    <span className="text-blue-500 shrink-0 mt-0.5">ℹ</span>
                    <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 leading-relaxed">
                        Deze historie toont alleen wijzigingen binnen de huidige revisie. Bestanden uit eerdere revisies zijn terug te vinden bij de voorgaande revisie van dit artikel.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-3 custom-scrollbar">
                    {docs.length > 0 ? docs.map((doc, idx) => {
                        const histVersion = (file.version || 1) - 1 - idx;

                        return (
                            <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm font-black text-xs">
                                        V{Math.max(1, histVersion)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                            {doc.name}
                                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black border border-slate-200 px-1.5 py-0.5 rounded">Overschreven</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                            <UserCircle size={12} /> {doc.uploadedBy}
                                            <span className="opacity-50">•</span>
                                            {new Date(doc.uploadDate).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => downloadDmsDocument(doc)}
                                    className="bg-white hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Download size={14} /> Download
                                </button>
                            </div>
                        )
                    }) : (
                        <div className="py-12 text-center text-slate-400 text-sm font-bold uppercase tracking-widest italic border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                            Geen historische versies gevonden.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
