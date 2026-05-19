
import React, { useState, useMemo } from 'react';
import { MaterialType, MaterialProfile, MaterialCategory, StorageLocation } from '../../types';
import { db } from '../../services/storage';
import { generateId, KEYS } from '../../services/db/core';
import { useTable } from '../../hooks/useTable';
import { useConfirm } from '../../contexts/ConfirmContext';
import {
    Plus, Edit, Trash2, X, Save, Layers, Square,
    CheckCircle, AlertTriangle, Search, LayoutGrid, MapPin
} from '../../icons';

const COLOR_OPTIONS = [
    'bg-slate-500','bg-red-500','bg-orange-500','bg-amber-500','bg-yellow-500',
    'bg-lime-500','bg-green-500','bg-emerald-500','bg-teal-500','bg-cyan-500',
    'bg-sky-500','bg-blue-500','bg-indigo-500','bg-violet-500','bg-purple-500',
    'bg-fuchsia-500','bg-pink-500','bg-rose-500','bg-zinc-400',
];

// ── Modal Component ────────────────────────────────────────

interface TypeModalProps {
    item: Partial<MaterialType> | null;
    onSave: (item: MaterialType) => void;
    onClose: () => void;
}

const TypeModal: React.FC<TypeModalProps & { categories: MaterialCategory[] }> = ({ item, onSave, onClose, categories }) => {
    const [name, setName] = useState(item?.name || '');
    const [category, setCategory] = useState(item?.category || (categories[0]?.code || ''));
    const [density, setDensity] = useState<number | ''>(item?.density ?? '');
    const [notes, setNotes] = useState(item?.notes || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
            id: item?.id || generateId(),
            name: name.trim(),
            category,
            density: density === '' ? undefined : Number(density),
            notes: notes.trim() || undefined
        });
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        {item?.id ? 'Materiaalsoort Bewerken' : 'Nieuwe Materiaalsoort'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Naam *</label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Bijv: S235JR, 7075-T6, PA6"
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Categorie *</label>
                        <div className="grid grid-cols-4 gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.code}
                                    type="button"
                                    onClick={() => setCategory(cat.code)}
                                    className={`py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-1.5 ${category === cat.code ? `${cat.color} text-white border-transparent shadow-lg` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                        {categories.length === 0 && <p className="text-[10px] text-orange-500 font-bold mt-1">Maak eerst categorieën aan onder "Categorieën"</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Dichtheid (kg/dm³)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={density}
                                onChange={e => setDensity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                placeholder="7.85"
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Notities</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Optioneel"
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Annuleren
                        </button>
                        <button type="submit" className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                            <Save size={16} /> Opslaan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Profile Modal ──────────────────────────────────────────

interface ProfileModalProps {
    item: Partial<MaterialProfile> | null;
    onSave: (item: MaterialProfile) => void;
    onClose: () => void;
}

const DIM_FIELDS = [
    { key: 'hasDiameter', label: 'Diameter (Ø)' },
    { key: 'hasWidth', label: 'Breedte' },
    { key: 'hasHeight', label: 'Hoogte' },
    { key: 'hasLength', label: 'Lengte' },
    { key: 'hasThickness', label: 'Dikte / Wanddikte' },
] as const;

const ProfileModal: React.FC<ProfileModalProps> = ({ item, onSave, onClose }) => {
    const [name, setName] = useState(item?.name || '');
    const [code, setCode] = useState(item?.code || '');
    const [dims, setDims] = useState({
        hasDiameter: item?.hasDiameter ?? false,
        hasWidth: item?.hasWidth ?? false,
        hasHeight: item?.hasHeight ?? false,
        hasLength: item?.hasLength ?? true,
        hasThickness: item?.hasThickness ?? false,
    });
    const [notes, setNotes] = useState(item?.notes || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !code.trim()) return;
        onSave({
            id: item?.id || generateId(),
            name: name.trim(),
            code: code.trim().toUpperCase(),
            ...dims,
            notes: notes.trim() || undefined
        });
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        {item?.id ? 'Profielvorm Bewerken' : 'Nieuwe Profielvorm'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Naam *</label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Rondstaf"
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Code *</label>
                            <input
                                required
                                type="text"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                placeholder="RONDSTAF"
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Afmetingsvelden</label>
                        <div className="grid grid-cols-2 gap-2">
                            {DIM_FIELDS.map(f => (
                                <button
                                    key={f.key}
                                    type="button"
                                    onClick={() => setDims(d => ({ ...d, [f.key]: !d[f.key] }))}
                                    className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold border-2 transition-all ${dims[f.key] ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                >
                                    <CheckCircle size={16} className={dims[f.key] ? 'text-white' : 'text-slate-300'} />
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Notities</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Optioneel"
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Annuleren
                        </button>
                        <button type="submit" className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                            <Save size={16} /> Opslaan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────

export const SettingsMaterials: React.FC = () => {
    const confirm = useConfirm();
    const { data: materialTypes } = useTable<MaterialType>(KEYS.MATERIAL_TYPES);
    const { data: materialProfiles } = useTable<MaterialProfile>(KEYS.MATERIAL_PROFILES);
    const { data: materialCategories } = useTable<MaterialCategory>(KEYS.MATERIAL_CATEGORIES);

    const [typeModal, setTypeModal] = useState<Partial<MaterialType> | null | false>(false);
    const [profileModal, setProfileModal] = useState<Partial<MaterialProfile> | null | false>(false);
    const [catModal, setCatModal] = useState<Partial<MaterialCategory> | null | false>(false);
    const [locModal, setLocModal] = useState<Partial<StorageLocation> | null | false>(false);

    const { data: storageLocations } = useTable<StorageLocation>(KEYS.STORAGE_LOCATIONS);

    const getCatConfig = (code: string) => materialCategories.find(c => c.code === code) || { name: code, color: 'bg-slate-400' };

    // ── Type CRUD ──
    const handleSaveType = async (item: MaterialType) => {
        const exists = materialTypes.find(t => t.id === item.id);
        if (exists) { await db.updateMaterialType(item); } else { await db.addMaterialType(item); }
        setTypeModal(false);
    };
    const handleDeleteType = async (id: string) => {
        const ok = await confirm({ title: 'Materiaalsoort verwijderen', message: 'Weet u zeker dat u deze materiaalsoort wilt verwijderen?' });
        if (ok) await db.deleteMaterialType(id);
    };

    // ── Profile CRUD ──
    const handleSaveProfile = async (item: MaterialProfile) => {
        const exists = materialProfiles.find(p => p.id === item.id);
        if (exists) { await db.updateMaterialProfile(item); } else { await db.addMaterialProfile(item); }
        setProfileModal(false);
    };
    const handleDeleteProfile = async (id: string) => {
        const ok = await confirm({ title: 'Profielvorm verwijderen', message: 'Weet u zeker dat u deze profielvorm wilt verwijderen?' });
        if (ok) await db.deleteMaterialProfile(id);
    };

    // ── Category CRUD ──
    const handleSaveCat = async (item: MaterialCategory) => {
        const exists = materialCategories.find(c => c.id === item.id);
        if (exists) { await db.updateMaterialCategory(item); } else { await db.addMaterialCategory(item); }
        setCatModal(false);
    };
    const handleDeleteCat = async (id: string) => {
        const ok = await confirm({ title: 'Categorie verwijderen', message: 'Weet u zeker dat u deze categorie wilt verwijderen?' });
        if (ok) await db.deleteMaterialCategory(id);
    };

    // ── Location CRUD ──
    const handleSaveLoc = async (item: StorageLocation) => {
        const exists = storageLocations.find(l => l.id === item.id);
        if (exists) { await db.updateStorageLocation(item); } else { await db.addStorageLocation(item); }
        setLocModal(false);
    };
    const handleDeleteLoc = async (id: string) => {
        const ok = await confirm({ title: 'Locatie verwijderen', message: 'Weet u zeker dat u deze locatie wilt verwijderen?' });
        if (ok) await db.deleteStorageLocation(id);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* ── CATEGORIEËN ── */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><LayoutGrid size={18} className="text-orange-500" /> Categorieën</h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Definieer materiaalcategorieën met een herkenbare kleur</p>
                    </div>
                    <button onClick={() => setCatModal(null)} className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95"><Plus size={14} /> Toevoegen</button>
                </div>
                {materialCategories.length > 0 ? (
                    <div className="p-4 flex flex-wrap gap-2">
                        {materialCategories.map(cat => (
                            <div key={cat.id} className="group flex items-center gap-2 pl-3 pr-1 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all">
                                <div className={`w-4 h-4 rounded-full ${cat.color} shadow-sm`} />
                                <span className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">{cat.name}</span>
                                <span className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-600 px-1.5 py-0.5 rounded-lg">{cat.code}</span>
                                <button onClick={() => setCatModal(cat)} className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 opacity-0 group-hover:opacity-100 transition-all"><Edit size={12} /></button>
                                <button onClick={() => handleDeleteCat(cat.id)} className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <LayoutGrid size={48} className="opacity-10 mb-4" />
                        <p className="font-black uppercase tracking-widest text-xs">Nog geen categorieën</p>
                        <p className="text-[10px] mt-1">Klik op "Toevoegen" om categorieën zoals Staal, Aluminium of RVS aan te maken.</p>
                    </div>
                )}
            </div>

            {/* ── MATERIAALSOORTEN ── */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <Layers size={18} className="text-blue-500" /> Materiaalsoorten
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Definieer de beschikbare materialen (bv. S235JR, 7075-T6, 316L)</p>
                    </div>
                    <button
                        onClick={() => setTypeModal(null)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <Plus size={14} /> Toevoegen
                    </button>
                </div>

                {materialTypes.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {materialTypes.map(mt => {
                            const cat = getCatConfig(mt.category);
                            return (
                                <div key={mt.id} className="px-6 py-4 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${cat.color} shadow-sm`} />
                                        <div>
                                            <div className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{mt.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cat.name}</span>
                                                {mt.density && (
                                                    <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg">
                                                        {mt.density} kg/dm³
                                                    </span>
                                                )}
                                                {mt.notes && <span className="text-[10px] text-slate-400 italic">{mt.notes}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setTypeModal(mt)} className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all" title="Bewerken">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteType(mt.id)} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all" title="Verwijderen">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <Layers size={48} className="opacity-10 mb-4" />
                        <p className="font-black uppercase tracking-widest text-xs">Nog geen materiaalsoorten</p>
                        <p className="text-[10px] mt-1">Klik op "Toevoegen" om uw eerste materiaalsoort aan te maken.</p>
                    </div>
                )}
            </div>

            {/* ── PROFIELVORMEN ── */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <Layers size={18} className="text-purple-500" /> Profielvormen
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Definieer welke vormen beschikbaar zijn en welke afmetingen per vorm relevant zijn</p>
                    </div>
                    <button
                        onClick={() => setProfileModal(null)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20 active:scale-95"
                    >
                        <Plus size={14} /> Toevoegen
                    </button>
                </div>

                {materialProfiles.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {materialProfiles.map(mp => {
                            const activeDims = DIM_FIELDS.filter(f => mp[f.key]);
                            return (
                                <div key={mp.id} className="px-6 py-4 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                            <Square size={18} className="text-purple-500" />
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                                {mp.name}
                                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg">{mp.code}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                {activeDims.map(d => (
                                                    <span key={d.key} className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-lg uppercase tracking-widest">
                                                        {d.label}
                                                    </span>
                                                ))}
                                                {mp.notes && <span className="text-[10px] text-slate-400 italic ml-1">{mp.notes}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setProfileModal(mp)} className="p-2 rounded-xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all" title="Bewerken">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteProfile(mp.id)} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all" title="Verwijderen">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <Layers size={48} className="opacity-10 mb-4" />
                        <p className="font-black uppercase tracking-widest text-xs">Nog geen profielvormen</p>
                        <p className="text-[10px] mt-1">Klik op "Toevoegen" om vormen zoals Rondstaf, Blok of Plaat aan te maken.</p>
                    </div>
                )}
            </div>

            {/* ── OPSLAGLOCATIES ── */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><MapPin size={18} className="text-teal-500" /> Opslaglocaties</h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Definieer standaard opslaglocaties voor ruwdelen</p>
                    </div>
                    <button onClick={() => setLocModal(null)} className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-teal-500/20 active:scale-95"><Plus size={14} /> Toevoegen</button>
                </div>
                {storageLocations.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {storageLocations.map(loc => (
                            <div key={loc.id} className="px-6 py-3.5 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl"><MapPin size={16} className="text-teal-500" /></div>
                                    <div>
                                        <div className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">{loc.code}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-slate-400 font-medium">{loc.name}</span>
                                            {loc.zone && <span className="text-[9px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-1.5 py-0.5 rounded-lg">{loc.zone}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setLocModal(loc)} className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-all"><Edit size={16} /></button>
                                    <button onClick={() => handleDeleteLoc(loc.id)} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <MapPin size={48} className="opacity-10 mb-4" />
                        <p className="font-black uppercase tracking-widest text-xs">Nog geen locaties</p>
                        <p className="text-[10px] mt-1">Klik op "Toevoegen" om locaties zoals ST-01-A, HAL-2-B aan te maken.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {typeModal !== false && (
                <TypeModal
                    item={typeModal}
                    categories={materialCategories}
                    onSave={handleSaveType}
                    onClose={() => setTypeModal(false)}
                />
            )}
            {profileModal !== false && (
                <ProfileModal
                    item={profileModal}
                    onSave={handleSaveProfile}
                    onClose={() => setProfileModal(false)}
                />
            )}
            {catModal !== false && (() => {
                const isEdit = !!catModal?.id;
                const [catName, setCatName] = [catModal?.name || '', (v: string) => setCatModal({...catModal, name: v})];
                const [catCode, setCatCode] = [catModal?.code || '', (v: string) => setCatModal({...catModal, code: v})];
                const [catColor, setCatColor] = [catModal?.color || 'bg-blue-500', (v: string) => setCatModal({...catModal, color: v})];
                return (
                    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{isEdit ? 'Categorie Bewerken' : 'Nieuwe Categorie'}</h3>
                                <button onClick={() => setCatModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={20} /></button>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); if (!catName.trim() || !catCode.trim()) return; handleSaveCat({ id: catModal?.id || generateId(), name: catName.trim(), code: catCode.trim().toUpperCase(), color: catColor, order: catModal?.order }); }} className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Naam *</label><input required type="text" value={catName} onChange={e => setCatName(e.target.value)} placeholder="Staal" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                    <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Code *</label><input required type="text" value={catCode} onChange={e => setCatCode(e.target.value)} placeholder="STAAL" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono font-bold dark:text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase" /></div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Kleur *</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLOR_OPTIONS.map(c => (
                                            <button key={c} type="button" onClick={() => setCatColor(c)} className={`w-8 h-8 rounded-xl ${c} transition-all ${catColor === c ? 'ring-4 ring-offset-2 ring-blue-500 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button type="button" onClick={() => setCatModal(false)} className="flex-1 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Annuleren</button>
                                    <button type="submit" className="flex-[2] py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"><Save size={16} /> Opslaan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
            {locModal !== false && (() => {
                const isEdit = !!locModal?.id;
                const [lCode, setLCode] = [locModal?.code || '', (v: string) => setLocModal({...locModal, code: v})];
                const [lName, setLName] = [locModal?.name || '', (v: string) => setLocModal({...locModal, name: v})];
                const [lZone, setLZone] = [locModal?.zone || '', (v: string) => setLocModal({...locModal, zone: v})];
                return (
                    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{isEdit ? 'Locatie Bewerken' : 'Nieuwe Locatie'}</h3>
                                <button onClick={() => setLocModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={20} /></button>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); if (!lCode.trim() || !lName.trim()) return; handleSaveLoc({ id: locModal?.id || generateId(), code: lCode.trim().toUpperCase(), name: lName.trim(), zone: lZone.trim() || undefined }); }} className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Code *</label><input required type="text" value={lCode} onChange={e => setLCode(e.target.value)} placeholder="ST-01-A" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono font-bold dark:text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase" /></div>
                                    <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Naam *</label><input required type="text" value={lName} onChange={e => setLName(e.target.value)} placeholder="Stelling 1, Schap A" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                </div>
                                <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Zone</label><input type="text" value={lZone} onChange={e => setLZone(e.target.value)} placeholder="Hal 1, Magazijn" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button type="button" onClick={() => setLocModal(false)} className="flex-1 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Annuleren</button>
                                    <button type="submit" className="flex-[2] py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-teal-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"><Save size={16} /> Opslaan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
