import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Factory, User } from '../../icons';
import { db } from '../../services/storage';
import { generateId, getNowISO } from '../../services/db/core';
import { QmsFramework, QmsFrameworkType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface NewFrameworkModalProps {
    onClose: () => void;
    onAdd: (framework: QmsFramework) => void;
}

export const NewFrameworkModal: React.FC<NewFrameworkModalProps> = ({ onClose, onAdd }) => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [type, setType] = useState<QmsFrameworkType>('ISO_NORM');
    const [description, setDescription] = useState('');
    const [certifier, setCertifier] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const newFw: QmsFramework = {
            id: generateId(),
            name: name.trim(),
            type,
            description: description.trim(),
            status: 'ACTIVE',
            certifier: certifier.trim() || undefined,
            updated: getNowISO()
        };

        await db.addQmsFramework(newFw);
        onAdd(newFw);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter flex items-center gap-3">
                        <ShieldCheck className="text-blue-600" />
                        Nieuw Dossier
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Soort Normering / Audit</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                type="button"
                                onClick={() => setType('ISO_NORM')}
                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 font-bold transition-all text-sm
                                    ${type === 'ISO_NORM' 
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}
                            >
                                <FileText size={20} className={type === 'ISO_NORM' ? 'text-blue-500' : 'opacity-50'} />
                                ISO Norm
                            </button>
                            <button 
                                type="button"
                                onClick={() => setType('CUSTOMER_AUDIT')}
                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 font-bold transition-all text-sm
                                    ${type === 'CUSTOMER_AUDIT' 
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}
                            >
                                <Factory size={20} className={type === 'CUSTOMER_AUDIT' ? 'text-emerald-500' : 'opacity-50'} />
                                Klant Audit
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Titel (bijv. ISO 9001 of ASML)</label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder={type === 'ISO_NORM' ? 'ISO 9001:2015' : 'ASML Qualify Audit'}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Omschrijving (optioneel)</label>
                            <input
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Korte omschrijving van dit dossier..."
                            />
                        </div>

                        {type === 'ISO_NORM' && (
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Certificerende Instantie (optioneel)</label>
                                <input
                                    type="text"
                                    value={certifier}
                                    onChange={e => setCertifier(e.target.value)}
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="Bijv. TÜV Nederland, Lloyd's, etc."
                                />
                            </div>
                        )}
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
                            disabled={!name.trim()}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Aanmaken
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
