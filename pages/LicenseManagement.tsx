
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Square, Shield, Layers, Lock, Clock, Info } from '../icons';
import { db } from '../services/storage';
import { CommercialModule, SystemSettings } from '../types';
import { COMMERCIAL_MODULES } from '../config/commercialModules';

export const LicenseManagement: React.FC = () => {
    const navigate = useNavigate();
    // --- FIX: db.getSystemSettings() is async, so initialize with defaults and fetch in useEffect ---
    const [settings, setSettings] = useState<SystemSettings>({ companyName: '', licenseStatus: 'TRIAL', activeModules: [CommercialModule.CORE] });
    const [activeModules, setActiveModules] = useState<CommercialModule[]>([CommercialModule.CORE]);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const data = await db.getSystemSettings();
            setSettings(data);
            setActiveModules(data.activeModules || [CommercialModule.CORE]);
        };
        load();
    }, []);

    const handleSaveModules = () => {
        const updatedSettings = { ...settings, activeModules };
        db.setSystemSettings(updatedSettings);
        setSettings(updatedSettings);
        setIsSaved(true);
        window.dispatchEvent(new CustomEvent('settings-changed', { detail: { settings: updatedSettings } }));
        setTimeout(() => setIsSaved(false), 3000);
    };

    return (
        <div className="max-w-4xl mx-auto pb-20 text-left">
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors">
                <ArrowLeft size={18} />
                <span>Terug naar Dashboard</span>
            </button>

            <div className="mb-10">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 mb-3">
                    <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg">
                        <Shield size={32} />
                    </div>
                    Module & Licentie Beheer
                </h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
                    Configureer de commerciële scope van de installatie. Wijzigingen hier hebben direct invloed op de menustructuur en beschikbare functies voor de klant.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Lock size={12}/> Status</div>
                    <div className="text-2xl font-black text-emerald-500 font-mono">{settings.licenseStatus || 'ACTIVE'}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={12}/> Verloopdatum</div>
                    <div className="text-2xl font-black text-slate-700 dark:text-slate-200 font-mono">31-12-2025</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Layers size={12}/> Actieve Modules</div>
                    <div className="text-2xl font-black text-blue-500 font-mono">{activeModules.length}</div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <Layers size={24} className="text-indigo-500" />
                        Software Modules
                    </h2>
                    <button onClick={handleSaveModules} className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isSaved ? 'bg-green-600 scale-95' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {isSaved ? 'Instellingen Opgeslagen' : 'Wijzigingen Bevestigen'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {COMMERCIAL_MODULES.map(mod => (
                        <div 
                            key={mod.id} 
                            onClick={() => {
                                if (mod.id === CommercialModule.CORE) return;
                                setActiveModules(prev => prev.includes(mod.id) ? prev.filter(m => m !== mod.id) : [...prev, mod.id]);
                            }} 
                            className={`group flex items-center justify-between p-6 rounded-2xl border-2 transition-all cursor-pointer ${activeModules.includes(mod.id) ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 shadow-lg shadow-blue-500/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl transition-colors ${activeModules.includes(mod.id) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-slate-200'}`}>
                                    <mod.icon size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-slate-800 dark:text-white">{mod.name}</div>
                                    <div className="text-[10px] text-slate-400 max-w-[180px] leading-tight mt-1">{mod.description}</div>
                                </div>
                            </div>
                            {activeModules.includes(mod.id) ? <CheckCircle size={24} className="text-blue-600" /> : <Square size={24} className="text-slate-300 dark:text-slate-600" />}
                        </div>
                    ))}
                </div>

                <div className="mt-10 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600"><Info size={20} /></div>
                    <div className="text-sm text-slate-500 leading-relaxed">
                        <strong>Let op:</strong> Het in- of uitschakelen van modules heeft direct invloed op de UI navigatie van alle gebruikers. De <strong>CORE</strong> module kan niet worden uitgeschakeld aangezien deze de fundering van het systeem bevat.
                    </div>
                </div>
            </div>
        </div>
    );
};
