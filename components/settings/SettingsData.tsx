import React, { useState, useEffect } from 'react';
// Fix: added CheckCircle to the import list from 'lucide-react' to resolve missing reference
import { History, Plus, HardDrive, Trash2, AlertTriangle, Smartphone, Download, CheckCircle } from 'lucide-react';
import { db } from '../../services/storage';
import { useTable } from '../../hooks/useTable';
import { KEYS } from '../../services/db/core';
import { DataSnapshot } from '../../types';

export const SettingsData: React.FC = () => {
    const { data: snapshots, refresh } = useTable<DataSnapshot>(KEYS.SNAPSHOTS);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    useEffect(() => {
        // Check if app is already in standalone mode
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsAppInstalled(true);
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsAppInstalled(true);
        }
    };

    const handleCreateSnapshot = async () => {
        const name = window.prompt("Naam herstelpunt:");
        if(name) { 
            await db.createSnapshot(name);
            refresh();
        }
    };

    const handleRestore = async (id: string, name: string) => {
        if(window.confirm(`Herstellen naar ${name}? Dit overschrijft de huidige data.`)) {
            await db.restoreSnapshot(id);
            window.location.reload();
        }
    };

    const handleDelete = async (id: string) => {
        if(window.confirm("Snapshot verwijderen?")) {
            await db.deleteSnapshot(id);
            refresh();
        }
    };

    const confirmReset = (mode: 'EMPTY' | 'DEMO') => {
        const msg = mode === 'DEMO' 
          ? "Dit wist alle huidige gegevens en laadt de demonstratie-fabriek. Doorgaan?" 
          : "Dit wist ALLE gegevens uit de database. Het systeem wordt teruggezet naar de basisinstellingen. Weet u dit heel zeker?";
        if (window.confirm(msg)) {
            db.resetData(mode);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* PWA INSTALLATION CARD */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Smartphone size={160} />
                </div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Native App Ervaring</h3>
                    <p className="text-blue-100 max-w-md mb-6 leading-relaxed">
                        Installeer Factory Manager op dit toestel voor snellere toegang, fullscreen weergave en betere prestaties in de fabriekshal.
                    </p>
                    
                    {isAppInstalled ? (
                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 w-fit">
                            <CheckCircle size={20} className="text-emerald-400" />
                            <span className="font-bold text-sm uppercase tracking-widest">Applicatie is geïnstalleerd</span>
                        </div>
                    ) : deferredPrompt ? (
                        <button 
                            onClick={handleInstallClick}
                            className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                            <Download size={20} /> Installeer op dit toestel
                        </button>
                    ) : (
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20 text-xs italic opacity-80">
                            Gebruik het menu van uw browser (of 'Zet op beginscherm' op iOS) om de app te installeren.
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white"><History size={24} className="text-blue-500" />Herstelpunten</h3>
                        <p className="text-sm text-slate-500">Herstel uw systeem naar een eerder tijdstip.</p>
                    </div>
                    <button onClick={handleCreateSnapshot} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all"><Plus size={18} /> Herstelpunt Maken</button>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {snapshots.length === 0 && <div className="text-center py-10 text-slate-400 italic">Geen snapshots gevonden.</div>}
                    {snapshots.map(snap => (
                        <div key={snap.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600"><HardDrive size={20} /></div>
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white">{snap.name}</div>
                                    <div className="text-[10px] text-slate-400">{new Date(snap.timestamp).toLocaleString()} • {snap.type}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleRestore(snap.id, snap.name)} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">Terugzetten</button>
                                <button onClick={() => handleDelete(snap.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border-2 border-red-200 dark:border-red-900/50 p-8">
                <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2"><AlertTriangle size={24} /> Gevaarzone</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm">
                        <h4 className="font-black text-red-700 dark:text-red-400 text-xs uppercase mb-1">Fabrieksinstellingen</h4>
                        <p className="text-[10px] text-slate-500 mb-4">Wist ALLE data, mappen en instellingen permanent.</p>
                        <button onClick={() => confirmReset('EMPTY')} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">Volledige Reset</button>
                    </div>
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
                        <h4 className="font-black text-blue-700 dark:text-blue-400 text-xs uppercase mb-1">Demo Gegevens</h4>
                        <p className="text-[10px] text-slate-500 mb-4">Laad voorbeeld machines en historie voor training.</p>
                        <button onClick={() => confirmReset('DEMO')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">Demo Laden</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
