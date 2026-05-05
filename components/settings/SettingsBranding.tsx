
import React, { useState, useEffect, useRef } from 'react';
import { Building2, ImageIcon, HelpCircle, Save, CheckCircle, Timer, Lock } from '../../icons';
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
        await db.setSystemSettings({ ...current, companyName: settings.companyName, licenseHolder: settings.licenseHolder, logoUrl: settings.logoUrl, darkModeStyle: settings.darkModeStyle, lightModeStyle: settings.lightModeStyle, autoLogoutMinutes: settings.autoLogoutMinutes });

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
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Achtergrond Contrast (Donkere Modus)</label>
                            <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={() => setSettings({ ...settings, darkModeStyle: 'OLED' })}
                                    className={`flex-1 py-3 px-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${!settings.darkModeStyle || settings.darkModeStyle === 'OLED' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                >
                                    OLED (Zwart)
                                </button>
                                <button
                                    onClick={() => setSettings({ ...settings, darkModeStyle: 'CLASSIC' })}
                                    className={`flex-1 py-3 px-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${settings.darkModeStyle === 'CLASSIC' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                >
                                    Classic (Grijs)
                                </button>
                                <button
                                    onClick={() => setSettings({ ...settings, darkModeStyle: 'MIDNIGHT' })}
                                    className={`flex-1 py-3 px-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${settings.darkModeStyle === 'MIDNIGHT' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                >
                                    Midnight
                                </button>
                            </div>
                            <p className="mt-2 text-[10px] font-medium text-slate-400 ml-1">Kies tussen modern diep zwart, klassiek zachter donkergrijs of de nieuwe Midnight mockup voor applicatie achtergronden.</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Achtergrond Contrast (Lichte Modus)</label>
                            <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={() => setSettings({ ...settings, lightModeStyle: 'CLEAN' })}
                                    className={`flex-1 py-3 px-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${!settings.lightModeStyle || settings.lightModeStyle === 'CLEAN' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                >
                                    Clean (Wit)
                                </button>
                                <button
                                    onClick={() => setSettings({ ...settings, lightModeStyle: 'SOFT' })}
                                    className={`flex-1 py-3 px-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${settings.lightModeStyle === 'SOFT' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                >
                                    Soft Sand
                                </button>
                                <button
                                    onClick={() => setSettings({ ...settings, lightModeStyle: 'COOL' })}
                                    className={`flex-1 py-3 px-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${settings.lightModeStyle === 'COOL' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                >
                                    Cool Frost
                                </button>
                            </div>
                            <p className="mt-2 text-[10px] font-medium text-slate-400 ml-1">Kies tussen super strak wit, zacht beige of een koele blauwe gloed voor in lichte modus.</p>
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

            {/* BEVEILIGING */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Lock size={14} className="text-slate-400" />
                    Beveiliging
                </h4>
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Auto-Logout na Inactiviteit</label>
                    <div className="relative">
                        <Timer className="absolute left-4 top-4 text-slate-400" size={20} />
                        <select
                            className="w-full pl-12 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                            value={settings.autoLogoutMinutes ?? 15}
                            onChange={e => setSettings({ ...settings, autoLogoutMinutes: parseInt(e.target.value) })}
                        >
                            <option value={0}>Uitgeschakeld</option>
                            <option value={5}>5 minuten</option>
                            <option value={10}>10 minuten</option>
                            <option value={15}>15 minuten (standaard)</option>
                            <option value={30}>30 minuten</option>
                            <option value={60}>60 minuten</option>
                        </select>
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 ml-1 mt-2">
                        Gebruikers worden automatisch uitgelogd na de ingestelde tijd zonder activiteit. Ghost Admin is hiervan uitgesloten.
                    </p>
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
