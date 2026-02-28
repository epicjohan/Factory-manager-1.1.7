
import React, { useState } from 'react';
import { Edit, Plus, Trash2, Monitor, Box } from '../../icons';
import { PredefinedOperation, AssetType, Machine, SetupTemplate, OperationType } from '../../types';
import { generateId } from '../../services/db/core';

interface CatalogManagerProps {
    mkgOperations: PredefinedOperation[];
    machines: Machine[];
    templates: SetupTemplate[];
    onSave: (op: PredefinedOperation) => void;
    onDelete: (id: string) => void;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({ mkgOperations, machines, templates, onSave, onDelete }) => {
    // Local form state
    const [catCode, setCatCode] = useState('');
    const [catName, setCatName] = useState('');
    const [catCategory, setCatCategory] = useState('');
    const [catOpType, setCatOpType] = useState<OperationType>('MACHINING');
    const [catTemplateId, setCatTemplateId] = useState('');
    const [catMachineId, setCatMachineId] = useState('');
    const [catMachineType, setCatMachineType] = useState<AssetType>(AssetType.CNC);
    const [editingCatalogOp, setEditingCatalogOp] = useState<PredefinedOperation | null>(null);

    const getMachineLabel = (id?: string) => {
        if (!id) return 'Geen Machine';
        const m = machines.find(mac => mac.id === id);
        return m ? `${m.name} (${m.machineNumber})` : 'Onbekende Machine';
    };

    const handleCatalogMachineSelect = (mId: string) => {
        setCatMachineId(mId);
        if (mId) {
            const m = machines.find(x => x.id === mId);
            if (m) {
                setCatCode(m.machineNumber);
                setCatName(m.name);
                setCatMachineType(m.type);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data: PredefinedOperation = {
            id: editingCatalogOp?.id || generateId(),
            code: catCode,
            name: catName,
            category: catCategory,
            operationType: catOpType,
            setupTemplateId: catOpType === 'PROCESS' ? catTemplateId : undefined,
            defaultMachineId: catOpType === 'MACHINING' ? catMachineId : undefined,
            defaultMachineType: catMachineType
        };
        onSave(data);

        // Reset
        setCatCode(''); setCatName(''); setCatCategory('');
        setCatMachineId(''); setCatTemplateId(''); setCatOpType('MACHINING');
        setEditingCatalogOp(null);
    };

    const handleEdit = (op: PredefinedOperation) => {
        setEditingCatalogOp(op);
        setCatCode(op.code);
        setCatName(op.name);
        setCatCategory(op.category || '');
        setCatOpType(op.operationType || 'MACHINING');
        setCatTemplateId(op.setupTemplateId || '');
        setCatMachineId(op.defaultMachineId || '');
        if (op.defaultMachineType) setCatMachineType(op.defaultMachineType);
    };

    return (
        <div className="animate-in fade-in duration-300 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-inner">
                        <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm mb-8 flex items-center gap-3 border-b dark:border-slate-700 pb-4 italic">
                            {editingCatalogOp ? <Edit size={20} className="text-blue-500" /> : <Plus size={20} className="text-blue-500" />}
                            {editingCatalogOp ? 'Bewerk Catalogus Code' : 'Nieuwe Catalogus Code'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* TYPE SELECTOR */}
                            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl flex border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                                <button
                                    type="button"
                                    onClick={() => setCatOpType('MACHINING')}
                                    className={`flex-1 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${catOpType === 'MACHINING' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Monitor size={14} className="inline mr-2" /> Machine
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCatOpType('PROCESS')}
                                    className={`flex-1 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${catOpType === 'PROCESS' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Box size={14} className="inline mr-2" /> Proces
                                </button>
                            </div>

                            {catOpType === 'MACHINING' ? (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 italic">Link met Asset (Auto-fill)</label>
                                    <select
                                        className="w-full p-4 rounded-2xl border-2 border-blue-100 dark:border-blue-900/50 bg-white dark:bg-slate-800 font-bold outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all"
                                        value={catMachineId}
                                        onChange={e => handleCatalogMachineSelect(e.target.value)}
                                    >
                                        <option value="">-- Geen Machine Koppeling --</option>
                                        {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.machineNumber})</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 italic">Koppel Proces Sjabloon</label>
                                    <select
                                        className="w-full p-4 rounded-2xl border-2 border-orange-100 dark:border-orange-900/50 bg-white dark:bg-slate-800 font-bold outline-none focus:ring-4 focus:ring-orange-500/10 shadow-sm transition-all"
                                        value={catTemplateId}
                                        onChange={e => setCatTemplateId(e.target.value)}
                                    >
                                        <option value="">-- Selecteer Sjabloon --</option>
                                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-2 ml-1">Kiest de velden (bijv. "Doos type") die de operator moet invullen.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">MKG Code *</label>
                                <input required type="text" className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-black text-blue-600 uppercase outline-none focus:border-blue-500 shadow-sm" value={catCode} onChange={e => setCatCode(e.target.value)} placeholder="bijv. FR-01 of INPAK" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Omschrijving *</label>
                                <input required type="text" className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold outline-none focus:border-blue-500 shadow-sm" value={catName} onChange={e => setCatName(e.target.value)} placeholder="bijv. Frezen 3-assig" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Categorie</label>
                                <input type="text" className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium outline-none focus:border-blue-500 shadow-sm" value={catCategory} onChange={e => setCatCategory(e.target.value)} placeholder="bijv. Verspaning of Logistiek" />
                            </div>
                            <div className="pt-4 flex gap-4">
                                {editingCatalogOp && (
                                    <button type="button" onClick={() => { setEditingCatalogOp(null); setCatCode(''); setCatName(''); setCatCategory(''); setCatMachineId(''); setCatOpType('MACHINING'); setCatTemplateId(''); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-200 transition-all">Annuleren</button>
                                )}
                                <button type="submit" className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-500/30 uppercase text-xs tracking-widest transition-all active:scale-95">Registreren</button>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[3rem] overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-slate-700">
                                <tr>
                                    <th className="px-8 py-5">Code</th>
                                    <th className="px-6 py-5">Omschrijving</th>
                                    <th className="px-6 py-5">Koppeling</th>
                                    <th className="px-8 py-5 text-right">Actie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {mkgOperations.sort((a, b) => a.code.localeCompare(b.code)).map(mo => (
                                    <tr key={mo.id} className="hover:bg-slate-50 dark:hover:bg-blue-900/5 group transition-colors">
                                        <td className="px-8 py-5 font-mono font-black text-blue-600 text-sm italic uppercase">{mo.code}</td>
                                        <td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-300 italic uppercase">
                                            <div>{mo.name}</div>
                                            <div className="text-[9px] text-slate-400 font-bold not-italic tracking-wider uppercase">{mo.category || '-'}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {mo.operationType === 'PROCESS' ? (
                                                <span className="text-[10px] font-black text-orange-500 bg-orange-50 dark:bg-orange-900/40 px-3 py-1.5 rounded-full uppercase flex items-center gap-2 w-fit border border-orange-100 dark:border-orange-900">
                                                    <Box size={12} /> PROCES
                                                </span>
                                            ) : (
                                                mo.defaultMachineId ? (
                                                    <span className="text-[10px] font-black text-blue-500 bg-blue-50 dark:bg-blue-900/40 px-3 py-1.5 rounded-full uppercase flex items-center gap-2 w-fit border border-blue-100 dark:border-blue-900">
                                                        <Monitor size={12} /> {getMachineLabel(mo.defaultMachineId)}
                                                    </span>
                                                ) : <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(mo)} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-[2rem] text-slate-400 hover:text-blue-500 transition-all shadow-sm"><Edit size={18} /></button>
                                                <button onClick={() => onDelete(mo.id)} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-[2rem] text-slate-400 hover:text-red-500 transition-all shadow-sm"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {mkgOperations.length === 0 && (
                                    <tr><td colSpan={4} className="py-32 text-center text-slate-400 italic font-medium">De catalogus is leeg. Voeg bewerkingen toe om deze te kunnen selecteren in de routing.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
