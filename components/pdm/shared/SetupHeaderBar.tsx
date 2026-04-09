/**
 * F-02: Geëxtraheerd uit SetupDocumentView.tsx
 * Toont de setup-naam, versie-badge, machine-info en actieknoppen.
 */

import React from 'react';
import { SetupVariant } from '../../../types';
import { CheckCircle2, Monitor, Copy, Star, Trash2, Box } from '../../../icons';

interface SetupHeaderBarProps {
    setup: SetupVariant;
    isProcessSetup: boolean;
    machineName?: string;
    machineNumber?: string;
    isArticleObsolete: boolean;
    isArchived: boolean;
    onSetDefault: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

export const SetupHeaderBar: React.FC<SetupHeaderBarProps> = ({
    setup, isProcessSetup, machineName, machineNumber,
    isArticleObsolete, isArchived, onSetDefault, onDuplicate, onDelete
}) => (
    <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-start">
        <div>
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{setup.name}</h1>
                {setup.isDefault && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Standaard
                    </span>
                )}
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                    v{setup.version || 1}
                </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-500">
                {isProcessSetup ? <Box size={14} /> : <Monitor size={14} />}
                {isProcessSetup ? 'Proces Instructie' : machineName ? `${machineName} (${machineNumber})` : 'Geen machine geselecteerd'}
            </div>
        </div>
        <div className="flex gap-2">
            {!isArticleObsolete && !isArchived && (
                <>
                    {!setup.isDefault && (
                        <button
                            onClick={onSetDefault}
                            className="px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 hover:border-emerald-500 rounded-2xl transition-all flex items-center gap-2 shadow-sm mr-2"
                            title="Stel in als standaard route"
                        >
                            <Star size={14} /> <span className="hidden sm:inline">Gebruik als Standaard</span>
                        </button>
                    )}
                    <button
                        onClick={onDuplicate}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-colors"
                        title="Setup Dupliceren"
                    >
                        <Copy size={20} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                        title="Setup Verwijderen"
                    >
                        <Trash2 size={20} />
                    </button>
                </>
            )}
        </div>
    </div>
);
