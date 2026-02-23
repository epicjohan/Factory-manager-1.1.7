import React, { useState, useEffect } from 'react';
import {
    FileText, Plus, X, HelpCircle, Save, CheckCircle,
    Image, FileCode, Terminal, Archive, Box, Edit,
    Table, Camera, ClipboardList, Ruler, BarChart
} from '../../icons';
import { db } from '../../services/storage';
import { DocumentCategory } from '../../types';
import { generateId } from '../../services/db/core';

const AVAILABLE_ICONS = [
    { id: 'FileText', icon: FileText, label: 'Tekst / Document' },
    { id: 'Image', icon: Image, label: 'Afbeelding' },
    { id: 'Camera', icon: Camera, label: 'Foto / Camera' },
    { id: 'Table', icon: Table, label: 'Excel / Spreadsheet' },
    { id: 'ClipboardList', icon: ClipboardList, label: 'Rapport / Checklist' },
    { id: 'Ruler', icon: Ruler, label: 'Meetrapport / Ruler' },
    { id: 'BarChart', icon: BarChart, label: 'Weergave / Grafiek' },
    { id: 'FileCode', icon: FileCode, label: 'Code / CAM' },
    { id: 'Terminal', icon: Terminal, label: 'Terminal / NC' },
    { id: 'Archive', icon: Archive, label: 'Archief / Zip' },
    { id: 'Box', icon: Box, label: '3D Model' }
];

const AVAILABLE_COLORS = [
    { class: 'text-blue-500', label: 'Blauw', bg: 'bg-blue-100' },
    { class: 'text-red-500', label: 'Rood', bg: 'bg-red-100' },
    { class: 'text-green-500', label: 'Groen', bg: 'bg-green-100' },
    { class: 'text-orange-500', label: 'Oranje', bg: 'bg-orange-100' },
    { class: 'text-purple-500', label: 'Paars', bg: 'bg-purple-100' },
    { class: 'text-slate-500', label: 'Grijs', bg: 'bg-slate-100' }
];

export const SettingsDocs: React.FC = () => {
    const [categories, setCategories] = useState<DocumentCategory[]>([]);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'saving'>('idle');

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSystemEdit, setIsSystemEdit] = useState(false);

    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [newApplicableTo, setNewApplicableTo] = useState<'ARTICLE' | 'SETUP' | 'BOTH'>('ARTICLE');
    const [newIcon, setNewIcon] = useState('FileText');
    const [newColor, setNewColor] = useState('text-blue-500');

    useEffect(() => {
        const load = async () => {
            const settings = await db.getSystemSettings();
            if (settings.documentCategories && settings.documentCategories.length > 0) {
                setCategories(settings.documentCategories);
            } else {
                setCategories([
                    { id: '1', name: 'Tekening (PDF)', code: 'DRAWING', applicableTo: 'BOTH', isSystem: true, color: 'text-blue-500', icon: 'FileText' },
                    { id: '2', name: '3D Model', code: 'MODEL', applicableTo: 'BOTH', isSystem: true, color: 'text-purple-500', icon: 'Box' },
                    { id: '5', name: 'Overig', code: 'OTHER', applicableTo: 'BOTH', isSystem: true, color: 'text-slate-500', icon: 'FileText' }
                ]);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaveStatus('saving');
        const current = await db.getSystemSettings();
        await db.setSystemSettings({ ...current, documentCategories: categories });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
    };

    const resetForm = () => {
        setEditingId(null);
        setIsSystemEdit(false);
        setNewName('');
        setNewCode('');
        setNewIcon('FileText');
        setNewColor('text-blue-500');
        setNewApplicableTo('ARTICLE');
        setIsFormOpen(false);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsFormOpen(true);
    };

    const handleOpenEdit = (cat: DocumentCategory) => {
        setEditingId(cat.id);
        setIsSystemEdit(!!cat.isSystem);
        setNewName(cat.name);
        setNewCode(cat.code);
        setNewApplicableTo(cat.applicableTo);
        setNewIcon(cat.icon || 'FileText');
        setNewColor(cat.color || 'text-blue-500');
        setIsFormOpen(true);
    };

    const handleSubmitForm = () => {
        if (!newName.trim() || !newCode.trim()) return;

        // Auto-format code only if we are allowed to change it
        let formattedCode = newCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');

        // Ensure system categories keep their original code if user tries to bypass UI
        if (isSystemEdit) {
            const originalCat = categories.find(c => c.id === editingId);
            if (originalCat) {
                formattedCode = originalCat.code;
            }
        } else {
            // Check for uniqueness if it's a new or changed code
            const existingCat = categories.find(c => c.code === formattedCode);
            if (existingCat && existingCat.id !== editingId) {
                alert('Deze code bestaat al. Kies een unieke code.');
                return;
            }
        }

        if (editingId) {
            // Update existing category
            setCategories(categories.map(c =>
                c.id === editingId ? {
                    ...c,
                    name: newName.trim(),
                    code: formattedCode, // Usually won't change if system
                    icon: newIcon,
                    color: newColor,
                    applicableTo: newApplicableTo
                } : c
            ));
        } else {
            // Create new category
            const newCategory: DocumentCategory = {
                id: generateId(),
                name: newName.trim(),
                code: formattedCode,
                icon: newIcon,
                color: newColor,
                isSystem: false,
                applicableTo: newApplicableTo,
                order: (categories.length + 1) * 10
            };
            setCategories([...categories, newCategory]);
        }

        resetForm();
    };

    const handleRemove = (catId: string, isSystem: boolean) => {
        if (isSystem) {
            alert('Systeemcategorieën kunnen niet worden verwijderd.');
            return;
        }
        if (window.confirm(`Geselecteerde categorie verwijderen?`)) {
            setCategories(categories.filter(c => c.id !== catId));
        }
    };

    const autoGenerateCode = (name: string) => {
        setNewName(name);
        if (!editingId && !newCode) {
            // Only auto-generate code if it's a new creation, not an edit
            setNewCode(name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15));
        }
    };

    const renderIcon = (iconName?: string) => {
        const iconDef = AVAILABLE_ICONS.find(i => i.id === iconName) || AVAILABLE_ICONS[0];
        const IconCmp = iconDef.icon;
        return <IconCmp size={18} />;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex gap-3">
                <HelpCircle className="text-blue-500 shrink-0" size={20} />
                <div>
                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-tight">Document Categorieën</h4>
                    <div className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                        Definieer flexibele document categorieën (bijv. Meetrapport, Certificaat). Je kunt per categorie bepalen of deze beschikbaar is bij Artikelbeheer, CAM/NC Setups, of beide. Systeemcategorieën kunnen aangepast worden qua naam, kleur en icoon, maar de code blijft vaststaan.
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">

                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Beheer Categorieën</h3>
                    {!isFormOpen && (
                        <button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95">
                            <Plus size={16} /> Nieuw Toevoegen
                        </button>
                    )}
                </div>

                {isFormOpen && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 mb-8 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm">
                                {editingId ? 'Categorie Bewerken' : 'Nieuwe Categorie Aanmaken'}
                            </h4>
                            <button onClick={resetForm} className="text-slate-400 hover:text-slate-700 bg-white dark:bg-slate-800 p-1 rounded-full"><X size={16} /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Weergavenaam</label>
                                <input
                                    type="text"
                                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Bijv. Meetrapport"
                                    value={newName}
                                    onChange={e => autoGenerateCode(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
                                    Unieke Code {isSystemEdit && '(Vast voor systeem)'}
                                </label>
                                <input
                                    type="text"
                                    className={`w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono text-sm ${isSystemEdit ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-white dark:bg-slate-800 dark:text-white'}`}
                                    placeholder="Bijv. REPORT"
                                    value={newCode}
                                    disabled={isSystemEdit}
                                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                                    title={isSystemEdit ? 'Systeemcode kan niet gewijzigd worden' : ''}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Beschikbaar Bij</label>
                                <select
                                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newApplicableTo}
                                    onChange={e => setNewApplicableTo(e.target.value as any)}
                                >
                                    <option value="ARTICLE">Alleen Artikelen</option>
                                    <option value="SETUP">Alleen Setups</option>
                                    <option value="BOTH">Beide</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Icoon</label>
                                <div className="flex gap-2 flex-wrap">
                                    {AVAILABLE_ICONS.map(i => (
                                        <button
                                            key={i.id}
                                            onClick={() => setNewIcon(i.id)}
                                            className={`p-3 rounded-xl border transition-all ${newIcon === i.id ? 'bg-blue-100 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700'}`}
                                            title={i.label}
                                        >
                                            <i.icon size={18} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Kleur</label>
                                <div className="flex gap-2 flex-wrap">
                                    {AVAILABLE_COLORS.map(c => (
                                        <button
                                            key={c.class}
                                            onClick={() => setNewColor(c.class)}
                                            className={`w-10 h-10 mb-2 rounded-xl border-2 transition-all flex items-center justify-center ${c.bg} ${c.class} ${newColor === c.class ? 'border-current scale-110 shadow-sm' : 'border-transparent'}`}
                                            title={c.label}
                                        >
                                            <span className="w-4 h-4 rounded-full bg-current"></span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleSubmitForm}
                                disabled={!newName || !newCode}
                                className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-50"
                            >
                                {editingId ? (
                                    <><Save size={18} className="mr-2" /> Wijziging Opslaan</>
                                ) : (
                                    <><Plus size={18} className="mr-2" /> Categorie Toevoegen</>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {categories.map(cat => (
                        <div key={cat.id} className={`flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 ${cat.isSystem ? 'bg-slate-100/50 dark:bg-slate-800/50' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg bg-white dark:bg-slate-800 shadow-sm ${cat.color || 'text-slate-500'}`}>
                                    {renderIcon(cat.icon)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h5 className="font-bold text-slate-900 dark:text-white text-sm">{cat.name}</h5>
                                        {cat.isSystem && <span className="text-[9px] uppercase tracking-widest font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md">Systeem</span>}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                        <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 rounded">{cat.code}</span>
                                        <span>&bull;</span>
                                        <span className="uppercase tracking-widest text-[10px] font-bold">
                                            {cat.applicableTo === 'BOTH' ? 'Overal' : (cat.applicableTo === 'ARTICLE' ? 'Artikelen' : 'Setups')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button onClick={() => handleOpenEdit(cat)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Bewerken">
                                    <Edit size={18} />
                                </button>

                                {!cat.isSystem && (
                                    <button onClick={() => handleRemove(cat.id, !!cat.isSystem)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Verwijderen">
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm font-medium">Geen categorieën geconfigureerd.</div>
                    )}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    className={`px-8 py-3 rounded-xl shadow-lg font-bold flex items-center gap-2 transition-all ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                    {saveStatus === 'saved' ? <CheckCircle size={20} /> : <Save size={20} />}
                    <span>{saveStatus === 'saved' ? 'Configuratie Opslaan' : 'Wijzigingen in DB Opslaan'}</span>
                </button>
            </div>
        </div>
    );
};
