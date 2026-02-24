import React, { useState, useMemo } from 'react';
import { db } from '../services/storage';
import { KEYS, generateId } from '../services/db/core';
import { GeneralPart, Machine, AssetType } from '../types';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    Package,
    Trash2,
    Edit,
    Euro,
    Box,
    Wrench,
    MapPin,
    AlertTriangle,
    CloudCog,
    X
} from '../icons';
import { MachineCard } from '../components/MachineCard';
import { useAuth } from '../contexts/AuthContext';
import { useTable } from '../hooks/useTable';

export const InventoryManagement: React.FC = () => {
    const navigate = useNavigate();
    const { canAccessAsset } = useAuth();

    const { data: allParts } = useTable<GeneralPart>(KEYS.PARTS_GENERAL);
    const { data: allMachines } = useTable<Machine>(KEYS.MACHINES);

    const [activeTab, setActiveTab] = useState<'EQUIPMENT' | 'STOCK'>('EQUIPMENT');
    const [search, setSearch] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingPart, setEditingPart] = useState<GeneralPart | null>(null);
    const [formData, setFormData] = useState<Partial<GeneralPart>>({});

    const equipmentAssets = useMemo(() => {
        return (allMachines || []).filter(m => canAccessAsset(m.id) && m.type === AssetType.OTHER);
    }, [allMachines, canAccessAsset]);

    const handleOpenModal = (part?: GeneralPart) => {
        if (part) {
            setEditingPart(part);
            setFormData(part);
        } else {
            setEditingPart(null);
            setFormData({
                description: '',
                articleCode: '',
                supplier: '',
                price: 0,
                stock: 0,
                minStock: 0,
                location: ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || !formData.articleCode) return;

        if (editingPart) {
            await db.updateGeneralPart({
                ...editingPart,
                ...formData
            } as GeneralPart);
        } else {
            await db.addGeneralPart({
                id: generateId(),
                description: formData.description!,
                articleCode: formData.articleCode!,
                supplier: formData.supplier || '',
                price: Number(formData.price) || 0,
                stock: Number(formData.stock) || 0,
                minStock: Number(formData.minStock) || 0,
                location: formData.location || ''
            } as GeneralPart);
        }
        setShowModal(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Weet u zeker dat u dit onderdeel wilt verwijderen?')) {
            await db.deleteGeneralPart(id);
        }
    };

    const filteredParts = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return (allParts || []).filter(p =>
            (p.description || '').toLowerCase().includes(lowerSearch) ||
            (p.articleCode || '').toLowerCase().includes(lowerSearch) ||
            (p.supplier || '').toLowerCase().includes(lowerSearch) ||
            (p.location || '').toLowerCase().includes(lowerSearch)
        ).sort((a, b) => {
            const aLow = (a.minStock !== undefined && (Number(a.stock) || 0) <= (Number(a.minStock) || 0));
            const bLow = (b.minStock !== undefined && (Number(b.stock) || 0) <= (Number(b.minStock) || 0));
            if (aLow && !bLow) return -1;
            if (!aLow && bLow) return 1;
            return (a.description || '').localeCompare(b.description || '');
        });
    }, [allParts, search]);

    const filteredAssets = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return equipmentAssets.filter(a =>
            (a.name || '').toLowerCase().includes(lowerSearch) ||
            (a.machineNumber || '').toLowerCase().includes(lowerSearch)
        );
    }, [equipmentAssets, search]);

    const totalInventoryValue = useMemo(() => {
        return (allParts || []).reduce((acc, part) => {
            const price = Number(part.price) || 0;
            const stock = Number(part.stock) || 0;
            return acc + (price * stock);
        }, 0);
    }, [allParts]);

    return (
        <div className="max-w-7xl mx-auto pb-10 space-y-6 text-left">
            <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 italic uppercase">
                            <Package className="text-orange-500" />
                            Materieel <span className="text-blue-600">&</span> Voorraad
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Beheer overige apparatuur en centrale magazijnartikelen.</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 w-fit">
                    <button
                        onClick={() => setActiveTab('EQUIPMENT')}
                        className={`px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'EQUIPMENT' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Wrench size={16} /> Apparatuur
                    </button>
                    <button
                        onClick={() => setActiveTab('STOCK')}
                        className={`px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'STOCK' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Box size={16} /> Magazijn
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder={activeTab === 'EQUIPMENT' ? "Zoek apparatuur..." : "Zoek artikel of locatie..."}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {activeTab === 'STOCK' && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-500/20 w-full md:w-auto justify-center"
                    >
                        <Plus size={20} /> Nieuw Artikel
                    </button>
                )}
            </div>

            {activeTab === 'EQUIPMENT' && (
                <div className="space-y-6">
                    {filteredAssets.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAssets.map(asset => (
                                <MachineCard key={asset.id} machine={asset} />
                            ))}
                        </div>
                    ) : (
                        <div className="col-span-full py-24 text-center flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-800/20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <Wrench size={64} className="mb-6 opacity-10" />
                            <p className="font-black uppercase tracking-widest">Geen materieel gevonden</p>
                            <p className="text-xs mt-2 max-w-xs mx-auto leading-relaxed">Voeg apparaten die geen CNC-machine zijn toe via de "Nieuwe Asset" knop in de Admin sectie.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'STOCK' && (
                <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-4 px-6 rounded-[2rem] shadow-xl flex items-center gap-4 w-fit ml-auto border border-white/10">
                        <div className="p-2.5 bg-emerald-500 rounded-[2rem] text-white shadow-lg">
                            <Euro size={20} />
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Totale Voorraadwaarde</div>
                            <div className="text-xl font-black font-mono italic">€ {totalInventoryValue.toFixed(2)}</div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-5">Omschrijving</th>
                                        <th className="px-6 py-5">Locatie</th>
                                        <th className="px-6 py-5">Artikel Code</th>
                                        <th className="px-6 py-5">Leverancier</th>
                                        <th className="px-6 py-5 text-right">Prijs p/st</th>
                                        <th className="px-6 py-5 text-center">Voorraad</th>
                                        <th className="px-6 py-5 text-right w-32">Beheer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredParts.map(part => {
                                        const stock = Number(part.stock) || 0;
                                        const minStock = Number(part.minStock) || 0;
                                        const lowStock = part.minStock !== undefined && stock <= minStock;
                                        const isPending = (part as any).isPending;
                                        const price = Number(part.price) || 0;

                                        return (
                                            <tr key={part.id} className={`hover:bg-slate-50 dark:hover:bg-blue-900/5 group transition-colors ${lowStock ? 'bg-red-50/10' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-slate-800 dark:text-white text-base uppercase tracking-tight">{part.description}</div>
                                                        {isPending && <CloudCog size={14} className="text-orange-500 animate-spin-slow shrink-0" />}
                                                    </div>
                                                    {lowStock && (
                                                        <div className="flex items-center gap-1 text-[9px] text-red-500 font-black mt-1 uppercase tracking-widest">
                                                            <AlertTriangle size={10} /> BIJBESTELLEN VEREIST
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-full w-fit uppercase tracking-tighter">
                                                        <MapPin size={12} className="text-blue-500 shrink-0" />
                                                        {part.location || 'N.v.t.'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-xs font-black text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded border border-slate-100 dark:border-slate-700">
                                                        {part.articleCode}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{part.supplier || '-'}</td>
                                                <td className="px-6 py-4 text-right font-mono font-black italic text-slate-600 dark:text-slate-300">€{price.toFixed(2)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`px-4 py-1.5 rounded-[2rem] text-xs font-black min-w-[5rem] text-center shadow-inner border-2 transition-all ${lowStock ? 'bg-red-600 border-red-500 text-white animate-pulse' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}>
                                                            {stock} <span className="text-[9px] opacity-70">ST.</span>
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleOpenModal(part)}
                                                            className="p-2.5 bg-slate-50 dark:bg-slate-700 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                                                            title="Bewerken"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(part.id)}
                                                            className="p-2.5 bg-slate-50 dark:bg-slate-700 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                                                            title="Verwijderen"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {filteredParts.length === 0 && (
                            <div className="p-24 text-center text-slate-400 flex flex-col items-center">
                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                                    <Box size={40} className="opacity-20" />
                                </div>
                                <p className="font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Niets gevonden</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-xl border border-slate-200 dark:border-slate-700 animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-8 border-b border-slate-50 dark:border-slate-700 pb-4">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic flex items-center gap-3">
                                <Box size={28} className="text-blue-600" />
                                {editingPart ? 'Artikel Bewerken' : 'Nieuw Voorraad Artikel'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 text-left">Omschrijving / Benaming</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Bijv: Universele V-Snaar Type X"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 text-left">Artikelcode / SKU</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                                        value={formData.articleCode || ''}
                                        onChange={e => setFormData({ ...formData, articleCode: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 text-left">Leverancier</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={formData.supplier || ''}
                                        onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 text-left">Magazijnlocatie</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                                        value={formData.location || ''}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="ST-00-A"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 text-left">Stukprijs (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={formData.price || ''}
                                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-inner">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] ml-1 text-center">Huidige Voorraad</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 rounded-[2rem] border-2 border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-3xl font-black text-center outline-none focus:border-blue-500 transition-all shadow-lg"
                                        value={formData.stock || ''}
                                        onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-1 text-center">Min. Voorraad (Alert)</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-3xl font-black text-center outline-none focus:border-blue-500 transition-all"
                                        value={formData.minStock || ''}
                                        onChange={e => setFormData({ ...formData, minStock: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-800 transition-colors">
                                    Annuleren
                                </button>
                                <button type="submit" className="flex-2 px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all active:scale-95">
                                    Opslaan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};