
import React, { useState } from 'react';
import { X, GitBranch, AlertTriangle } from '../../../icons';

interface RevisionWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    currentVersion: number;
    title?: string;
    subtitle?: string;
}

export const RevisionWizardModal: React.FC<RevisionWizardModalProps> = ({
    isOpen, onClose, onConfirm, currentVersion,
    title = 'Nieuwe Setup Versie',
    subtitle
}) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!reason.trim()) return;
        onConfirm(reason);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">

                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <GitBranch size={18} className="text-blue-600" /> {title}
                        </h3>
                        <p className="text-xs text-slate-500 font-bold">
                            {subtitle ?? `Van Versie ${currentVersion} naar ${currentVersion + 1}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-[2rem] border border-blue-100 dark:border-blue-800 flex gap-4">
                        <AlertTriangle className="text-blue-600 shrink-0" size={24} />
                        <div className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                            <strong>Let op:</strong> De huidige versie wordt gearchiveerd (Old/Blauw) en is niet meer aanpasbaar. Er wordt een nieuwe kopie gemaakt met status <strong>Draft</strong> waarin u wijzigingen kunt doorvoeren.
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            Reden van wijziging *
                        </label>
                        <textarea
                            autoFocus
                            rows={3}
                            className="w-full p-4 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all text-sm"
                            placeholder="Bijv. Cyclus optimalisatie, nieuw gereedschap..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-800 rounded-[2rem] transition-colors">
                        Annuleren
                    </button>
                    <button onClick={handleConfirm} disabled={!reason.trim()} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">
                        Bevestigen
                    </button>
                </div>
            </div>
        </div>
    );
};
