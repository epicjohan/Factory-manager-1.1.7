import React, { useState } from 'react';
import { X, CheckCircle, Search, User } from '../../icons';
import { db } from '../../services/storage';
import { generateId, getNowISO } from '../../services/db/core';
import { QmsAudit } from '../../types';

interface NewAuditModalProps {
    frameworkId: string;
    onClose: () => void;
    onAdd: (audit: QmsAudit) => void;
}

export const NewAuditModal: React.FC<NewAuditModalProps> = ({ frameworkId, onClose, onAdd }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
    const [auditorName, setAuditorName] = useState('');
    const [result, setResult] = useState<'PLANNED' | 'PASSED' | 'FAILED' | 'WARNINGS'>('PLANNED');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newAudit: QmsAudit = {
            id: generateId(),
            frameworkId,
            date,
            type,
            auditorName: auditorName.trim() || undefined,
            result,
            notes: notes.trim() || undefined,
            updated: getNowISO()
        };

        await db.addQmsAudit(newAudit);
        onAdd(newAudit);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter flex items-center gap-3">
                        <CheckCircle className="text-emerald-500" />
                        Nieuwe Audit Registreren
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Audit Datum</label>
                            <input
                                required
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Soort Audit</label>
                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
                                {(['INTERNAL', 'EXTERNAL'] as const).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t)}
                                        className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all
                                            ${type === t 
                                                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        {t === 'INTERNAL' ? 'Intern' : 'Extern'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Auditor Naam / Instantie</label>
                        <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={auditorName}
                                onChange={e => setAuditorName(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                placeholder="Bijv. John Doe of TÜV"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Resultaat & Status</label>
                        <select
                            value={result}
                            onChange={e => setResult(e.target.value as any)}
                            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                        >
                            <option value="PLANNED">Gepland (PLANNED)</option>
                            <option value="PASSED">Geslaagd (PASSED)</option>
                            <option value="FAILED">Gefaald / Afgekeurd (FAILED)</option>
                            <option value="WARNINGS">Voorwaardelijk  / Minor NC (WARNINGS)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Opmerkingen / Conclusie</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                            placeholder="Korte samenvatting van de uitkomst..."
                        />
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        >
                            Annuleren
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-emerald-500/30 transition-all"
                        >
                            Audit Opslaan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
