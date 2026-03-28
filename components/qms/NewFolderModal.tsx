import React, { useState } from 'react';
import { X, Folders } from '../../icons';
import { db } from '../../services/storage';
import { generateId, getNowISO } from '../../services/db/core';
import { QmsFolder } from '../../types';

interface NewFolderModalProps {
    frameworkId: string;
    onClose: () => void;
    onAdd: (folder: QmsFolder) => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({ frameworkId, onClose, onAdd }) => {
    const currentYear = new Date().getFullYear();
    const [name, setName] = useState('');
    const [year, setYear] = useState<number>(currentYear);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const newFolder: QmsFolder = {
            id: generateId(),
            frameworkId,
            year,
            name: name.trim(),
            documents: [], // initially empty JSON array
            updated: getNowISO()
        };

        await db.addQmsFolder(newFolder);
        onAdd(newFolder);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter flex items-center gap-3">
                        <Folders className="text-blue-600" />
                        Nieuwe Map (Dossier)
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Map Naam (bijv. Interne Audits Q1 of Kwaliteitshandboek)</label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Bewijslast Q1"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Dossier Jaar</label>
                        <input
                            required
                            type="number"
                            min="2000"
                            max="2100"
                            value={year}
                            onChange={e => setYear(Number(e.target.value))}
                            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                        />
                        <p className="text-xs text-slate-500 mt-2">Mappen worden gegroepeerd per jaar in het dashboard.</p>
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
                            Toevoegen
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
