
import React, { useState, useEffect, useRef } from 'react';
import { Building2, ImageIcon, HelpCircle, Save, CheckCircle } from 'lucide-react';
import { db } from '../../services/storage';
import { SystemSettings } from '../../types';

export const SettingsBranding: React.FC = () => {
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [settings, setSettings] = useState<SystemSettings>({ companyName: '', logoUrl: '' });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'saving'>('idle');

    useEffect(() => {
        const load = async () => {
            const current = await db.getSystemSettings();
            setSettings(current);
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaveStatus('saving');
        // Fetch fresh to avoid overwriting other fields
        const current = await db.getSystemSettings();
        await db.setSystemSettings({ ...current, companyName: settings.companyName, licenseHolder: settings.licenseHolder, logoUrl: settings.logoUrl });
        
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
        window.dispatchEvent(new CustomEvent('settings-changed', { detail: { settings } }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex gap-3">
                <HelpCircle className="text-blue-500 shrink-0" size={20} />
                <div>
                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-tight">Organisatie Personalisatie</h4>
                    <div className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                        Pas de software aan naar de identiteit van uw bedrijf.
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Bedrijfsnaam</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3 text-slate-400" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Naam bedrijf" 
                                    className="w-full pl-11 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" 
                                    value={settings.companyName || ''} 
                                    onChange={e => setSettings({...settings, companyName: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Dashboard Welkomstbericht</label>
                            <textarea 
                                placeholder="Welkom bij..." 
                                rows={3} 
                                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                                value={settings.licenseHolder || ''} 
                                onChange={e => setSettings({...settings, licenseHolder: e.target.value})} 
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Bedrijfslogo</label>
                        <div className="flex items-center gap-6">
                            <div className="w-32 h-32 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                                {settings.logoUrl ? <img src={settings.logoUrl} className="max-w-full max-h-full p-2 object-contain" alt="Logo" /> : <ImageIcon size={32} className="text-slate-300" />}
                            </div>
                            <div className="space-y-2 flex flex-col">
                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                <button onClick={() => logoInputRef.current?.click()} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-700 transition-colors">Uploaden</button>
                                <button onClick={() => { setSettings({...settings, logoUrl: ''}); if(logoInputRef.current) logoInputRef.current.value = ''; }} className="px-6 py-2 text-xs text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors">Verwijderen</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    onClick={handleSave} 
                    className={`px-8 py-3 rounded-xl shadow-lg font-bold flex items-center gap-2 transition-all ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                    {saveStatus === 'saved' ? <CheckCircle size={20} /> : <Save size={20} />}
                    <span>{saveStatus === 'saved' ? 'Opgeslagen' : 'Opslaan'}</span>
                </button>
            </div>
        </div>
    );
};
