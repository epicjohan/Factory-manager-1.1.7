
import React, { useState, useMemo } from 'react';
import { Layers, Plus, Search, Trash2, Box, ArrowRight } from '../../icons';
import { Article, ArticleBOMItem } from '../../types';
import { generateId } from '../../services/db/core';

interface ArticleBOMProps {
    items: ArticleBOMItem[];
    allArticles: Article[];
    currentArticleId: string;
    isLocked: boolean;
    onUpdate: (items: ArticleBOMItem[], customLogMessage?: string) => void;
}

export const ArticleBOM: React.FC<ArticleBOMProps> = ({ items, allArticles, currentArticleId, isLocked, onUpdate }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [qty, setQty] = useState(1);

    // Filter available articles (exclude self and already added items could be allowed but usually warned)
    const availableArticles = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return allArticles.filter(a =>
            a.id !== currentArticleId && // Prevent self-reference
            (a.articleCode.toLowerCase().includes(lowerSearch) || a.name.toLowerCase().includes(lowerSearch))
        ).slice(0, 10); // Limit results
    }, [allArticles, currentArticleId, searchTerm]);

    const handleAdd = (child: Article) => {
        const newItem: ArticleBOMItem = {
            id: generateId(),
            childArticleId: child.id,
            childArticleName: child.name,
            childArticleCode: child.articleCode,
            position: ((items.length + 1) * 10).toString(),
            quantity: qty
        };
        onUpdate([...items, newItem], `Onderdeel toegevoegd aan stuklijst: ${child.name} (${child.articleCode}).`);
        setSearchTerm('');
        setQty(1);
        setIsAdding(false);
    };

    const handleRemove = (id: string) => {
        if (isLocked) return;
        if (window.confirm('Item verwijderen uit stuklijst?')) {
            const item = items.find(i => i.id === id);
            onUpdate(items.filter(i => i.id !== id), `Onderdeel verwijderd uit stuklijst: ${item?.childArticleName}.`);
        }
    };

    const handleQtyChange = (id: string, newQty: number) => {
        if (isLocked) return;
        const item = items.find(i => i.id === id);
        const updated = items.map(i => i.id === id ? { ...i, quantity: newQty } : i);
        onUpdate(updated, `Stuklijst: Aantal van ${item?.childArticleName} gewijzigd naar ${newQty}.`);
    };

    return (
        <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <Layers size={20} className="text-purple-600" /> Stuklijst (B.O.M.)
                </h3>
                {!isLocked && !isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-[2rem] font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Plus size={18} /> Item Toevoegen
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-purple-200 dark:border-purple-900/50 mb-6 animate-in slide-in-from-top-2">
                    <div className="flex gap-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Zoek artikel op code of naam..."
                                className="w-full pl-10 pr-4 py-3 rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-purple-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="w-24">
                            <input
                                type="number"
                                className="w-full p-3 rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-center outline-none focus:ring-2 focus:ring-purple-500"
                                value={qty}
                                onChange={e => setQty(Math.max(1, parseInt(e.target.value)))}
                            />
                        </div>
                        <button onClick={() => setIsAdding(false)} className="px-6 py-3 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-[2rem] font-bold">Annuleren</button>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {searchTerm && availableArticles.map(a => (
                            <button
                                key={a.id}
                                onClick={() => handleAdd(a)}
                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:shadow-md transition-all text-left group"
                            >
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Box size={14} className="text-slate-400" /> {a.name}
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono mt-0.5">{a.articleCode} • Rev {a.revision}</div>
                                </div>
                                <div className="flex items-center gap-2 text-purple-600 font-bold text-xs">
                                    Toevoegen <ArrowRight size={14} />
                                </div>
                            </button>
                        ))}
                        {searchTerm && availableArticles.length === 0 && (
                            <div className="text-center py-4 text-slate-400 text-sm italic">Geen artikelen gevonden.</div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-slate-700">
                        <tr>
                            <th className="px-8 py-5">Pos</th>
                            <th className="px-6 py-5">Artikelnummer</th>
                            <th className="px-6 py-5">Omschrijving</th>
                            <th className="px-6 py-5 text-center">Aantal</th>
                            <th className="px-8 py-5 text-right">Actie</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {items.sort((a, b) => parseInt(a.position) - parseInt(b.position)).map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-blue-900/5 transition-colors group">
                                <td className="px-8 py-5 font-mono font-bold text-slate-400">{item.position}</td>
                                <td className="px-6 py-5">
                                    <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-900">{item.childArticleCode}</span>
                                </td>
                                <td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-200">
                                    {item.childArticleName}
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <input
                                        disabled={isLocked}
                                        type="number"
                                        className="w-16 p-1 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 outline-none font-bold text-slate-900 dark:text-white transition-colors"
                                        value={item.quantity}
                                        onChange={e => handleQtyChange(item.id, parseInt(e.target.value))}
                                    />
                                </td>
                                <td className="px-8 py-5 text-right">
                                    {!isLocked && (
                                        <button onClick={() => handleRemove(item.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-2xl transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr><td colSpan={5} className="py-16 text-center text-slate-400 italic">Nog geen onderdelen in stuklijst.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
