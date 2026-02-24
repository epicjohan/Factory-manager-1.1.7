
import React, { useState, useEffect, useRef } from 'react';
import { Building2, ImageIcon, HelpCircle, Save, CheckCircle } from '../../icons';
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
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-6 rounded-[2rem] flex gap-4 shadow-sm items-center">
                <HelpCircle className="text-blue-500 shrink-0" size={24} />
                <div>
                    <h4 className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest">Organisatie Personalisatie</h4>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 leading-relaxed">
                        Pas de software aan naar de identiteit van uw bedrijf.
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Bedrijfsnaam</label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-4 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Naam bedrijf"
                                    className="w-full pl-12 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                    value={settings.companyName || ''}
                                    onChange={e => setSettings({ ...settings, companyName: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Dashboard Welkomstbericht</label>
                            <textarea
                                placeholder="Welkom bij..."
                                rows={3}
                                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold transition-all"
                                value={settings.licenseHolder || ''}
                                onChange={e => setSettings({ ...settings, licenseHolder: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Bedrijfslogo</label>
                        <div className="flex items-center gap-6">
                            <div className="w-32 h-32 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
                                {settings.logoUrl ? <img src={settings.logoUrl} className="max-w-full max-h-full p-2 object-contain" alt="Logo" /> : <ImageIcon size={32} className="text-slate-300" />}
                            </div>
                            <div className="space-y-3 flex flex-col">
                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                <button onClick={() => logoInputRef.current?.click()} className="px-8 py-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2">Uploaden</button>
                                <button onClick={() => { setSettings({ ...settings, logoUrl: '' }); if (logoInputRef.current) logoInputRef.current.value = ''; }} className="px-8 py-3 text-[10px] uppercase tracking-widest text-red-500 font-black hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800 flex items-center justify-center gap-2">Verwijderen</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    className={`px-8 py-4 rounded-2xl shadow-lg font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/30'}`}
                >
                    {saveStatus === 'saved' ? <CheckCircle size={18} /> : <Save size={18} />}
                    <span>{saveStatus === 'saved' ? 'Opgeslagen' : 'Configuratie Opslaan'}</span>
                </button>
            </div>
        </div>
    );
};
