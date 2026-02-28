
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/storage';
import { SetupTemplate, AssetType, SetupFieldDefinition, SetupFieldType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTable } from '../hooks/useTable';
import { KEYS, generateId } from '../services/db/core';
import {
    ArrowLeft, LayoutTemplate, Plus, Trash2, Save, Edit,
    ChevronUp, ChevronDown, Check, X, FileText, Hash,
    ToggleLeft, List, AlignLeft, Type, Wrench, Layers, Copy, Box, AlertTriangle, LayoutGrid
} from '../icons';

const FIELD_TYPES: { type: SetupFieldType; label: string; icon: any }[] = [
    { type: 'text', label: 'Tekst (Kort)', icon: Type },
    { type: 'textarea', label: 'Tekst (Lang)', icon: AlignLeft },
    { type: 'number', label: 'Getal', icon: Hash },
    { type: 'boolean', label: 'Ja / Nee', icon: ToggleLeft },
    { type: 'select', label: 'Keuzelijst', icon: List },
    { type: 'header', label: 'Sectie Kop', icon: FileText }
];

const COL_SPANS = [
    { val: 12, label: 'Volledig (100%)' },
    { val: 9, label: 'Driekwart (75%)' },
    { val: 8, label: 'Tweederde (66%)' },
    { val: 6, label: 'Half (50%)' },
    { val: 4, label: 'Derde (33%)' },
    { val: 3, label: 'Kwart (25%)' },
];

export const TemplateManagement: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addNotification } = useNotifications();

    const { data: templates, refresh } = useTable<SetupTemplate>(KEYS.SETUP_TEMPLATES);

    const [selectedTemplate, setSelectedTemplate] = useState<SetupTemplate | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<SetupTemplate>>({});

    // Tab state: FIXTURE (Standard Setup) or TOOLS
    const [activeTab, setActiveTab] = useState<'FIXTURE' | 'TOOLS'>('FIXTURE');

    // Field Editor State
    const [showFieldModal, setShowFieldModal] = useState(false);
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
    const [fieldData, setFieldData] = useState<SetupFieldDefinition>({ key: '', label: '', type: 'text', colSpan: 6 });

    // Enhanced Option Builder State
    const [currentOptions, setCurrentOptions] = useState<string[]>([]);
    const [optionInput, setOptionInput] = useState('');
    const [bulkMode, setBulkMode] = useState(false);

    useEffect(() => {
        if (selectedTemplate) {
            setEditData(JSON.parse(JSON.stringify(selectedTemplate)));
        } else {
            setEditData({});
        }
    }, [selectedTemplate]);

    const isProcessTemplate = editData.assetType === AssetType.PROCESS;

    // Force activeTab to FIXTURE if assetType is PROCESS
    useEffect(() => {
        if (isProcessTemplate) {
            setActiveTab('FIXTURE');
        }
    }, [isProcessTemplate]);

    const handleCreateNew = () => {
        const newTemplate: SetupTemplate = {
            id: generateId(),
            name: 'Nieuw Sjabloon',
            assetType: AssetType.CNC,
            fields: [],
            toolFields: [],
            isDefault: false
        };
        setEditData(newTemplate);
        setSelectedTemplate(null);
        setIsEditing(true);
        setActiveTab('FIXTURE');
    };

    const handleSelectTemplate = (t: SetupTemplate) => {
        setSelectedTemplate(t);
        setIsEditing(true);
        setActiveTab('FIXTURE');
    };

    const handleSaveTemplate = async () => {
        if (!editData.name || !editData.assetType) return;

        const templateToSave = {
            ...editData,
            fields: editData.fields || [],
            toolFields: isProcessTemplate ? [] : (editData.toolFields || [])
        } as SetupTemplate;

        await db.saveTemplate(templateToSave);
        refresh();
        setSelectedTemplate(templateToSave);
        addNotification('SUCCESS', 'Gelukt', 'Sjabloon opgeslagen!');
    };

    const handleDeleteTemplate = async (id: string) => {
        if (window.confirm("Weet u zeker dat u dit sjabloon wilt verwijderen?")) {
            await db.deleteTemplate(id);
            refresh();
            setSelectedTemplate(null);
            setIsEditing(false);
        }
    };

    // --- FIELD MANIPULATION ---

    const getActiveFields = () => {
        if (activeTab === 'FIXTURE') return editData.fields || [];
        return editData.toolFields || [];
    };

    const openFieldEditor = (index: number | null = null) => {
        setEditingFieldIndex(index);
        const currentFields = getActiveFields();

        setOptionInput('');
        setBulkMode(false);

        if (index !== null && currentFields[index]) {
            const field = currentFields[index];
            setFieldData({ ...field });
            setCurrentOptions(field.options || []);
        } else {
            setFieldData({ key: '', label: '', type: 'text', colSpan: 6 });
            setCurrentOptions([]);
        }
        setShowFieldModal(true);
    };

    const saveField = () => {
        if (!fieldData.label) return;

        // Auto-generate key if empty
        const key = fieldData.key || fieldData.label.toLowerCase().replace(/[^a-z0-9]/g, '_');

        const newField: SetupFieldDefinition = {
            ...fieldData,
            key,
            colSpan: fieldData.type === 'header' ? 12 : fieldData.colSpan || 6, // Force headers full width
            options: fieldData.type === 'select' ? currentOptions : undefined
        };

        let fieldsCopy = [...getActiveFields()];

        if (editingFieldIndex !== null) {
            fieldsCopy[editingFieldIndex] = newField;
        } else {
            fieldsCopy.push(newField);
        }

        if (activeTab === 'FIXTURE') {
            setEditData({ ...editData, fields: fieldsCopy });
        } else {
            setEditData({ ...editData, toolFields: fieldsCopy });
        }
        setShowFieldModal(false);
    };

    const deleteField = (index: number) => {
        if (!window.confirm("Veld verwijderen?")) return;
        let fieldsCopy = [...getActiveFields()];
        fieldsCopy.splice(index, 1);
        if (activeTab === 'FIXTURE') {
            setEditData({ ...editData, fields: fieldsCopy });
        } else {
            setEditData({ ...editData, toolFields: fieldsCopy });
        }
    };

    const moveField = (index: number, direction: 'UP' | 'DOWN') => {
        let fieldsCopy = [...getActiveFields()];
        if (direction === 'UP' && index > 0) {
            [fieldsCopy[index], fieldsCopy[index - 1]] = [fieldsCopy[index - 1], fieldsCopy[index]];
        } else if (direction === 'DOWN' && index < fieldsCopy.length - 1) {
            [fieldsCopy[index], fieldsCopy[index + 1]] = [fieldsCopy[index + 1], fieldsCopy[index]];
        }
        if (activeTab === 'FIXTURE') {
            setEditData({ ...editData, fields: fieldsCopy });
        } else {
            setEditData({ ...editData, toolFields: fieldsCopy });
        }
    };

    // --- OPTION BUILDER ---
    const addOption = () => {
        if (!optionInput.trim()) return;
        if (bulkMode) {
            const lines = optionInput.split('\n').map(l => l.trim()).filter(l => l);
            setCurrentOptions(prev => [...prev, ...lines]);
        } else {
            setCurrentOptions(prev => [...prev, optionInput.trim()]);
        }
        setOptionInput('');
        setBulkMode(false);
    };

    const removeOption = (idx: number) => {
        setCurrentOptions(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="max-w-7xl mx-auto pb-20 text-left h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-2 transition-colors">
                        <ArrowLeft size={18} /><span>Terug naar Admin</span>
                    </button>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Setup Templates</h2>
                </div>
            </div>

            <div className="flex gap-8 flex-1 min-h-0">
                {/* LEFT SIDEBAR: LIST */}
                <div className="w-80 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden shrink-0">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                        <button onClick={handleCreateNew} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
                            <Plus size={18} /> Nieuw Sjabloon
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {templates.map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleSelectTemplate(t)}
                                className={`w-full text-left p-4 rounded-2xl transition-all border-2 ${selectedTemplate?.id === t.id || (isEditing && editData.id === t.id) ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400'}`}
                            >
                                <div className="font-bold text-sm">{t.name}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                    {t.assetType} • {t.fields.length + (t.toolFields?.length || 0)} velden
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIGHT SIDE: EDITOR */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col">
                    {isEditing ? (
                        <>
                            <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex-1 max-w-2xl grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sjabloon Naam</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold text-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={editData.name || ''}
                                                onChange={e => setEditData({ ...editData, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Asset Type</label>
                                            <select
                                                className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={editData.assetType || AssetType.CNC}
                                                onChange={e => setEditData({ ...editData, assetType: e.target.value as AssetType })}
                                            >
                                                {Object.values(AssetType).map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {editData.id && !editData.isDefault && (
                                            <button onClick={() => handleDeleteTemplate(editData.id!)} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[2rem] transition-all">
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                        <button onClick={handleSaveTemplate} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-bold flex items-center gap-2 shadow-lg">
                                            <Save size={18} /> Opslaan
                                        </button>
                                    </div>
                                </div>

                                {/* TAB SWITCHER - HIDDEN FOR PROCESS TYPE */}
                                {!isProcessTemplate ? (
                                    <div className="flex gap-1 p-1 bg-slate-200 dark:bg-slate-700 rounded-full w-fit animate-in fade-in duration-200">
                                        <button
                                            onClick={() => setActiveTab('FIXTURE')}
                                            className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'FIXTURE' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Layers size={14} /> Opspanning Velden
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('TOOLS')}
                                            className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'TOOLS' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Wrench size={14} /> Gereedschap Velden
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-6 py-3 bg-blue-600/10 text-blue-600 rounded-[2rem] border border-blue-500/20 w-fit animate-in slide-in-from-top-2 duration-300">
                                        <Box size={16} />
                                        <span className="text-xs font-black uppercase tracking-widest">Proces Setup Configuratie</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-slate-400 uppercase tracking-[0.2em] text-sm">
                                        {isProcessTemplate ? 'Proces Configuratie' : (activeTab === 'FIXTURE' ? 'Opspanning Configuratie' : 'Gereedschap Configuratie')}
                                    </h3>
                                    <button onClick={() => openFieldEditor()} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-2">
                                        <Plus size={14} /> Veld Toevoegen
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {getActiveFields().map((field, idx) => (
                                        <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                                            <div className="flex flex-col gap-1 text-slate-300">
                                                <button onClick={() => moveField(idx, 'UP')} disabled={idx === 0} className="hover:text-indigo-500 disabled:opacity-30"><ChevronUp size={16} /></button>
                                                <button onClick={() => moveField(idx, 'DOWN')} disabled={idx === (getActiveFields().length || 0) - 1} className="hover:text-indigo-500 disabled:opacity-30"><ChevronDown size={16} /></button>
                                            </div>

                                            <div className={`p-3 rounded-2xl ${field.type === 'header' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-600'} dark:bg-slate-700 dark:text-slate-300`}>
                                                {(() => {
                                                    const Icon = FIELD_TYPES.find(t => t.type === field.type)?.icon || Type;
                                                    return <Icon size={20} />;
                                                })()}
                                            </div>

                                            <div className="flex-1">
                                                <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    {field.label}
                                                    {field.required && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase tracking-wider">Verplicht</span>}
                                                    {field.highlightFilled && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wider border border-amber-200 flex items-center gap-1"><AlertTriangle size={10} /> Alert</span>}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5 flex gap-2">
                                                    <span>key: {field.key}</span>
                                                    <span>•</span>
                                                    <span>width: {Math.round((field.colSpan || 6) / 12 * 100)}%</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openFieldEditor(idx)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-colors"><Edit size={16} /></button>
                                                <button onClick={() => deleteField(idx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {getActiveFields().length === 0 && (
                                        <div className="text-center py-12 text-slate-400 italic border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                                            Nog geen velden toegevoegd.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <LayoutTemplate size={64} className="mb-4 opacity-20" />
                            <p className="font-black uppercase tracking-widest text-sm">Selecteer of maak een sjabloon</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Field Editor Modal */}
            {showFieldModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white uppercase tracking-tight">Veld Configureren</h3>
                            <button onClick={() => setShowFieldModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Veld Label</label>
                                <input autoFocus type="text" className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold" value={fieldData.label} onChange={e => setFieldData({ ...fieldData, label: e.target.value })} placeholder="Bijv. Spandruk" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type Invoer</label>
                                    <select className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" value={fieldData.type} onChange={e => setFieldData({ ...fieldData, type: e.target.value as SetupFieldType })}>
                                        {FIELD_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Key (Optioneel)</label>
                                    <input type="text" className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm" value={fieldData.key} onChange={e => setFieldData({ ...fieldData, key: e.target.value })} placeholder="auto_generated" />
                                </div>
                            </div>

                            {/* WIDTH SELECTOR */}
                            {fieldData.type !== 'header' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><LayoutGrid size={14} /> Veld Breedte (Plaatsing)</label>
                                    <select
                                        className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold"
                                        value={fieldData.colSpan || 6}
                                        onChange={e => setFieldData({ ...fieldData, colSpan: parseInt(e.target.value) })}
                                    >
                                        {COL_SPANS.map(opt => (
                                            <option key={opt.val} value={opt.val}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {fieldData.type === 'number' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Eenheid</label>
                                    <input type="text" className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" value={fieldData.unit || ''} onChange={e => setFieldData({ ...fieldData, unit: e.target.value })} placeholder="Bijv. bar, mm, Nm" />
                                </div>
                            )}

                            {fieldData.type === 'select' && (
                                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Opties ({currentOptions.length})</label>
                                        <button onClick={() => setBulkMode(!bulkMode)} className="text-[10px] text-blue-500 font-bold uppercase tracking-widest hover:underline flex items-center gap-1">
                                            {bulkMode ? 'Enkele invoer' : 'Bulk invoer'}
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        {bulkMode ? (
                                            <textarea
                                                className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                                                rows={4}
                                                placeholder="Plak lijst (1 optie per regel)..."
                                                value={optionInput}
                                                onChange={e => setOptionInput(e.target.value)}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                className="flex-1 p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                                                value={optionInput}
                                                onChange={e => setOptionInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && addOption()}
                                                placeholder="Nieuwe optie..."
                                            />
                                        )}
                                        <button onClick={addOption} className="bg-blue-600 text-white p-3 rounded-[2rem] hover:bg-blue-700 transition-colors h-fit">
                                            {bulkMode ? <Copy size={20} /> : <Plus size={20} />}
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                        {currentOptions.map((opt, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full text-xs font-medium group">
                                                {opt}
                                                <button onClick={() => removeOption(idx)} className="text-slate-400 hover:text-red-500 ml-1"><X size={12} /></button>
                                            </span>
                                        ))}
                                        {currentOptions.length === 0 && <span className="text-xs text-slate-400 italic">Nog geen opties toegevoegd.</span>}
                                    </div>
                                </div>
                            )}

                            {fieldData.type !== 'header' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center gap-3 p-3 rounded-[2rem] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer">
                                        <input type="checkbox" checked={fieldData.required || false} onChange={e => setFieldData({ ...fieldData, required: e.target.checked })} className="w-5 h-5 rounded text-indigo-600" />
                                        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide">Verplicht Veld</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 rounded-[2rem] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer">
                                        <input type="checkbox" checked={fieldData.highlightFilled || false} onChange={e => setFieldData({ ...fieldData, highlightFilled: e.target.checked })} className="w-5 h-5 rounded text-orange-600" />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide">Accentueer Invoer</span>
                                            <span className="text-[9px] text-slate-400">Kleurt oranje bij waarde</span>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                            <button onClick={saveField} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-bold shadow-lg">
                                Veld Opslaan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
