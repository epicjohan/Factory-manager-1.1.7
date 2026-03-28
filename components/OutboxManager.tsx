
import React, { useState, useEffect } from 'react';
import { db } from '../services/storage';
import { SyncEntry } from '../types';
import { Cloud, X, Clock, Database, ArrowRight, RefreshCw, CheckCircle, Trash2, AlertTriangle, ShieldAlert } from '../icons';
import { useConfirm } from '../contexts/ConfirmContext';

interface OutboxManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const OutboxManager: React.FC<OutboxManagerProps> = ({ isOpen, onClose }) => {
    const [entries, setEntries] = useState<SyncEntry[]>([]);
    const confirm = useConfirm();

    useEffect(() => {
        const loadOutbox = async () => {
            const dataRaw = await db.getOutbox();
            setEntries(Array.isArray(dataRaw) ? dataRaw : []);
        };
        loadOutbox();
        window.addEventListener('outbox-changed', loadOutbox);
        return () => window.removeEventListener('outbox-changed', loadOutbox);
    }, []);

    if (!isOpen) return null;

    const getActionColor = (action: string) => {
        switch(action) {
            case 'INSERT': return 'text-green-500';
            case 'UPDATE': return 'text-blue-500';
            case 'DELETE': return 'text-red-500';
            default: return 'text-slate-400';
        }
    };

    const getFriendlyTableName = (table: string) => {
        return table.replace('fm_table_', '').replace(/_/g, ' ');
    };

    const handleRemoveItem = async (id: string) => {
        const ok = await confirm({
            title: 'Item uit wachtrij verwijderen',
            message: 'De wijziging wordt NIET naar de server gestuurd. Gebruik dit alleen bij hardnekkige fouten.',
        });
        if (ok) await db.removeFromOutbox([id]);
    };

    const handleClearOutbox = async () => {
        const ok = await confirm({
            title: 'Volledige wachtrij wissen',
            message: 'LET OP: Alle lokale wijzigingen worden NIET naar de server gestuurd. Zeker weten?',
        });
        if (ok) {
            const ids = entries.map(e => e.id);
            await db.removeFromOutbox(ids);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]" onClick={onClose}></div>
            <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-[90] flex flex-col border-l border-slate-200 dark:border-slate-700 animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <div className="flex items-center gap-2">
                        <Cloud className="text-blue-500" size={20} />
                        <h3 className="font-bold text-slate-800 dark:text-white">Sync Wachtrij</h3>
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full font-mono font-black">{entries.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {entries.length > 0 && (
                            <button onClick={handleClearOutbox} title="Hele wachtrij wissen" className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                <ShieldAlert size={18} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                    <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed font-black uppercase tracking-widest">
                        Data Douane Monitor
                    </p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 italic font-medium">
                        Deze wijzigingen worden gebufferd en verstuurd zodra er verbinding is.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {entries.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <CheckCircle size={48} className="mx-auto mb-4 opacity-20 text-green-500" />
                            <p className="text-sm font-black uppercase tracking-widest">In Sync</p>
                            <p className="text-[10px] mt-1 italic font-medium">Geen uitstaande wijzigingen.</p>
                        </div>
                    ) : (
                        entries.map((entry) => (
                            <div key={entry.id} className={`p-4 bg-white dark:bg-slate-850 rounded-2xl border shadow-sm group transition-all ${entry.error ? 'border-red-500 bg-red-50/5' : 'border-slate-100 dark:border-slate-800'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getActionColor(entry.action)} border-current bg-current/5`}>
                                            {entry.action}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 italic">
                                            <Database size={10} /> {getFriendlyTableName(entry.table)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-mono font-bold text-slate-400">
                                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                        <button 
                                            onClick={() => handleRemoveItem(entry.id)} 
                                            className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                            title="Verwijder dit item"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="text-xs text-slate-700 dark:text-slate-200 font-bold truncate italic mb-2 px-1">
                                    {entry.data.name || entry.data.title || entry.data.machineNumber || entry.data.description || 'Record update'}
                                </div>

                                {entry.error && (
                                    <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/40 rounded-[2rem] text-[10px] text-red-700 dark:text-red-300 font-bold flex items-start gap-2 animate-in shake duration-500 border border-red-200 dark:border-red-900">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                            <span className="block uppercase text-[8px] opacity-70 mb-0.5">Foutmelding Server:</span>
                                            <span className="break-words font-mono leading-tight">{entry.error}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {entries.length > 0 && (
                    <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                         <div className="flex items-center justify-center gap-3 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">
                            <RefreshCw size={14} className="animate-spin-slow" /> Verwerken...
                         </div>
                    </div>
                )}
            </div>
        </>
    );
};
