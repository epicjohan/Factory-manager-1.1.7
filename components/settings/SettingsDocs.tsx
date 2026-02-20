
import React, { useState, useEffect } from 'react';
import { FileText, Plus, X, HelpCircle, Save, CheckCircle } from 'lucide-react';
import { db } from '../../services/storage';

export const SettingsDocs: React.FC = () => {
    const [categories, setCategories] = useState<string[]>([]);
    const [newCat, setNewCat] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'saving'>('idle');

    useEffect(() => {
        const load = async () => {
            const settings = await db.getSystemSettings();
            if (settings.documentCategories) {
                setCategories(settings.documentCategories);
            } else {
                setCategories(['Tekening', 'Handleiding', 'Afbeelding', 'Rapport']);
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

    const handleAdd = () => {
        if (!newCat.trim()) return;
        if (!categories.includes(newCat.trim())) {
            setCategories([...categories, newCat.trim()]);
        }
        setNewCat('');
    };

    const handleRemove = (cat: string) => {
        if(window.confirm(`Categorie '${cat}' verwijderen?`)) {
            setCategories(categories.filter(c => c !== cat));
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex gap-3">
                <HelpCircle className="text-blue-500 shrink-0" size={20} />
                <div>
                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-tight">Document Categorieën</h4>
                    <div className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                        Definieer labels voor geüploade bestanden (bijv. 'Tekening', 'Schema'). De categorie 'Tekening' wordt gebruikt als standaard weergave op het dashboard.
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex gap-4 mb-6">
                    <input 
                        type="text" 
                        className="flex-1 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="Nieuwe categorie..." 
                        value={newCat} 
                        onChange={e => setNewCat(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    />
                    <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center shadow-lg transition-all active:scale-95">
                        <Plus size={20}/>
                    </button>
                </div>
                <div className="flex flex-wrap gap-3">
                    {categories.map(cat => (
                        <div key={cat} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-600 group">
                            {cat}
                            <button onClick={() => handleRemove(cat)} className="text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-800 rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    onClick={handleSave} 
                    className={`px-8 py-3 rounded-xl shadow-lg font-bold flex items-center gap-2 transition-all ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                    {saveStatus === 'saved' ? <CheckCircle size={20} /> : <Save size={20} />}
                    <span>{saveStatus === 'saved' ? 'Opgeslagen' : 'Wijzigingen Opslaan'}</span>
                </button>
            </div>
        </div>
    );
};
