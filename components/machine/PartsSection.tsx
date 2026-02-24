import React, { useState, useMemo } from 'react';
import {
    Machine,
    MachinePart,
    Permission
} from '../../types';
import { db } from '../../services/storage';
import { KEYS, generateId } from '../../services/db/core';
import { useAuth } from '../../contexts/AuthContext';
import { useTable } from '../../hooks/useTable';
import {
    Plus,
    Trash2,
    Search,
    ShoppingCart,
    CloudCog,
    AlertTriangle,
    Package,
    X,
    MapPin,
    Euro
} from '../../icons';

interface PartsSectionProps {
    machine: Machine;
}

export const PartsSection: React.FC<PartsSectionProps> = ({ machine }) => {
    const { hasPermission } = useAuth();

    const { data: allMachineParts } = useTable<MachinePart>(KEYS.PARTS_MACHINE);

    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        description: '',
        articleCode: '',
        supplier: '',
        price: 0,
        stock: 0,
        minStock: 0,
        location: ''
    });

    const machineParts = useMemo(() => {
        return (allMachineParts || []).filter(p => p.machineId === machine.id);
    }, [allMachineParts, machine.id]);

    const filteredParts = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return machineParts.filter(p =>
            (p.description || '').toLowerCase().includes(lowerSearch) ||
            (p.articleCode || '').toLowerCase().includes(lowerSearch) ||
            (p.location || '').toLowerCase().includes(lowerSearch)
        ).sort((a, b) => {
            const aStock = Number(a.stock) || 0;
            const aMin = Number(a.minStock) || 0;
            const bStock = Number(b.stock) || 0;
            const bMin = Number(b.minStock) || 0;

            const aLow = aStock <= aMin;
            const bLow = bStock <= bMin;
            if (aLow && !bLow) return -1;
            if (!aLow && bLow) return 1;
            return (a.description || '').localeCompare(b.description || '');
        });
    }, [machineParts, searchTerm]);

    const handleAddPart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (machine.isArchived || !hasPermission(Permission.MANAGE_INVENTORY)) return;

        const newPart: MachinePart = {
            id: generateId(),
            machineId: machine.id,
            ...formData,
            price: Number(formData.price) || 0,
            stock: Number(formData.stock) || 0,
            minStock: Number(formData.minStock) || 0
        };

        await db.addMachinePart(newPart);

        setFormData({
            description: '',
            articleCode: '',
            supplier: '',
            price: 0,
            stock: 0,
            minStock: 0,
            location: ''
        });
        setShowForm(false);
    };

    const handleDeletePart = async (partId: string) => {
        if (window.confirm('Weet u zeker dat u dit onderdeel wilt verwijderen uit het register van deze machine?')) {
            await db.deleteMachinePart(partId);
        }
    };

    const canManage = !machine.isArchived && hasPermission(Permission.MANAGE_INVENTORY);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" size={18} />
                    <input
                        type="text"
                        placeholder="Zoek op naam, code of locatie..."
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {machineParts.length} Onderdelen
                    </div>
                    {canManage && !showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                        >
                            <Plus size={18} /> Nieuw Item
                        </button>
                    )}
                </div>
            </div>

            {showForm && (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border-2 border-blue-500 dark:border-blue-500/50 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center mb-8 border-b border-slate-50 dark:border-slate-700 pb-4">
                        <div className="flex items-center gap-4 text-left">
                            <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg flex items-center justify-center">
                                <Package size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white text-xl uppercase tracking-tighter italic">Voorraad Registratie</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Koppel reserveonderdelen</p>
                            </div>
                        </div>
                        <button onClick={() => setShowForm(false)} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shadow-sm">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleAddPart} className="space-y-8 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Omschrijving / Benaming</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white text-base font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Bijv: Tandriem Spindelmotor..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Artikel Code / SKU</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white text-base font-mono font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                                    value={formData.articleCode}
                                    onChange={e => setFormData({ ...formData, articleCode: e.target.value })}
                                    placeholder="SKU-8821-XJ"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Leverancier</label>
                                <input
                                    type="text"
                                    className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={formData.supplier}
                                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                    placeholder="Naam leverancier..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Stukprijs (€)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Euro size={16} /></div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full pl-12 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white text-lg font-mono font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Magazijnlocatie</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><MapPin size={16} /></div>
                                    <input
                                        type="text"
                                        className="w-full pl-12 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="ST-02-B"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-inner">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] ml-1 text-center">Huidige Voorraad</label>
                                <input
                                    type="number"
                                    className="w-full p-4 rounded-2xl border-2 border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-3xl font-black text-center outline-none focus:border-blue-500 transition-all shadow-lg"
                                    value={formData.stock}
                                    onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-1 text-center">Min. Voorraad (Alert)</label>
                                <input
                                    type="number"
                                    className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-3xl font-black text-center outline-none focus:border-blue-500 transition-all"
                                    value={formData.minStock}
                                    onChange={e => setFormData({ ...formData, minStock: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-800 transition-colors">Annuleren</button>
                            <button type="submit" className="flex-2 px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all active:scale-95">Item Opslaan</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-8 py-6">Onderdeel / Beschrijving</th>
                                <th className="px-6 py-6">Locatie</th>
                                <th className="px-6 py-6">Artikel Code</th>
                                <th className="px-6 py-6 text-right">Prijs p/st</th>
                                <th className="px-6 py-6 text-center">Stock Status</th>
                                {canManage && <th className="px-8 py-6 text-right">Beheer</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredParts.map(part => {
                                const stock = Number(part.stock) || 0;
                                const minStock = Number(part.minStock) || 0;
                                const isLow = stock <= minStock;
                                const isPending = (part as any).isPending;
                                const price = Number(part.price) || 0;

                                return (
                                    <tr key={part.id} className={`group transition-all hover:bg-slate-50 dark:hover:bg-blue-900/5 ${isLow ? 'bg-red-50/10 dark:bg-red-900/5' : ''}`}>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl shrink-0 shadow-sm ${isLow ? 'bg-red-100 text-red-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 group-hover:text-blue-500'} transition-colors`}>
                                                    <Package size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-black text-slate-800 dark:text-slate-200 text-base flex items-center gap-2 uppercase tracking-tight">
                                                        <span className="truncate">{part.description}</span>
                                                        {isPending && <CloudCog size={16} className="text-orange-500 animate-spin-slow shrink-0" />}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">{part.supplier || 'Geen leverancier vermeld'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-full w-fit uppercase tracking-tighter">
                                                <MapPin size={12} className="text-blue-500 shrink-0" />
                                                {part.location || 'N.v.t.'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="font-mono text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded border border-slate-100 dark:border-slate-700">
                                                {part.articleCode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right font-mono text-slate-600 dark:text-slate-300 font-black italic">
                                            €{price.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className={`px-5 py-2 rounded-2xl font-black text-sm min-w-[5rem] text-center shadow-inner border-2 transition-all ${isLow ? 'bg-red-600 border-red-500 text-white animate-pulse' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}>
                                                    {stock} <span className="text-[9px] opacity-70">ST.</span>
                                                </span>
                                                {isLow && (
                                                    <span className="text-[8px] font-black text-red-600 dark:text-red-400 uppercase tracking-[0.2em] flex items-center gap-1">
                                                        <AlertTriangle size={10} className="shrink-0" /> BIJBESTELLEN
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {canManage && (
                                            <td className="px-8 py-5 text-right">
                                                <button
                                                    onClick={() => handleDeletePart(part.id)}
                                                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-2xl transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                                    title="Verwijder onderdeel uit register"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredParts.length === 0 && (
                        <div className="py-32 text-center text-slate-400 italic flex flex-col items-center bg-slate-50/30 dark:bg-slate-900/20">
                            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700 mb-6 opacity-30">
                                <ShoppingCart size={48} className="text-slate-300" />
                            </div>
                            <p className="font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Niets gevonden</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <div className="bg-slate-900 text-white px-8 py-4 rounded-full shadow-xl flex items-center gap-6 border border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Voorraad OK: {machineParts.length - machineParts.filter(p => (Number(p.stock) || 0) <= (Number(p.minStock) || 0)).length}</span>
                    </div>
                    <div className="w-px h-6 bg-white/10"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Kritiek: {machineParts.filter(p => (Number(p.stock) || 0) <= (Number(p.minStock) || 0)).length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};