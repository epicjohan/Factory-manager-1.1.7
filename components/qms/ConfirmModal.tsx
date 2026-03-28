import React from 'react';
import { AlertTriangle, Trash2, X } from '../../icons';

interface ConfirmModalProps {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    title,
    message,
    confirmLabel = 'Verwijderen',
    onConfirm,
    onCancel,
    danger = true,
}) => (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col items-center text-center gap-4">
                <div className={`p-4 rounded-2xl ${danger ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'}`}>
                    <AlertTriangle size={32} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">{title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
                </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-2xl transition-colors"
                >
                    Annuleren
                </button>
                <button
                    onClick={onConfirm}
                    className={`flex-1 px-4 py-3 text-sm font-black text-white rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                        danger
                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                            : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                    }`}
                >
                    <Trash2 size={15} /> {confirmLabel}
                </button>
            </div>
        </div>
    </div>
);
