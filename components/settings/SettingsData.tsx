import React, { useState, useEffect } from 'react';
// Fix: added CheckCircle to the import list from '../../icons' to resolve missing reference
import { History, Plus, HardDrive, Trash2, AlertTriangle, Smartphone, Download, CheckCircle } from '../../icons';
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
        if (name) {
            await db.createSnapshot(name);
            refresh();
        }
    };

    const handleRestore = async (id: string, name: string) => {
        if (window.confirm(`Herstellen naar ${name}? Dit overschrijft de huidige data.`)) {
            await db.restoreSnapshot(id);
            window.location.reload();
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Snapshot verwijderen?")) {
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
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-10 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Smartphone size={160} />
                </div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Native App Ervaring</h3>
                    <p className="text-blue-100 max-w-md mb-8 font-bold text-sm leading-relaxed">
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
                            className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                            <Download size={20} /> Installeer op dit toestel
                        </button>
                    ) : (
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20 text-xs font-bold opacity-80 uppercase tracking-widest">
                            Gebruik het menu van uw browser (of 'Zet op beginscherm' op iOS) om de app te installeren.
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-sm font-black flex items-center gap-3 text-slate-800 dark:text-white uppercase tracking-widest"><History size={20} className="text-blue-500" /> Herstelpunten</h3>
                        <p className="text-[10px] uppercase font-bold text-slate-500 mt-2 ml-8 tracking-widest">Herstel uw systeem naar een eerder tijdstip.</p>
                    </div>
                    <button onClick={handleCreateSnapshot} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95"><Plus size={16} /> Herstelpunt Maken</button>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {snapshots.length === 0 && <div className="text-center py-10 text-slate-400 italic">Geen snapshots gevonden.</div>}
                    {snapshots.map(snap => (
                        <div key={snap.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600"><HardDrive size={20} /></div>
                                <div>
                                    <div className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-1">{snap.name}</div>
                                    <div className="text-[10px] font-bold text-slate-400 capitalize">{new Date(snap.timestamp).toLocaleString()} • {snap.type}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleRestore(snap.id, snap.name)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all">Terugzetten</button>
                                <button onClick={() => handleDelete(snap.id)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 rounded-[2rem] border-2 border-red-500/20 p-8 shadow-inner">
                <h3 className="text-sm font-black text-red-600 mb-6 flex items-center gap-3 uppercase tracking-widest"><AlertTriangle size={20} /> Gevaarzone</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 bg-white dark:bg-slate-800 rounded-[2rem] border border-red-100 dark:border-red-900/30 shadow-sm flex flex-col justify-between">
                        <div>
                            <h4 className="font-black text-red-700 dark:text-red-400 text-xs uppercase mb-2 tracking-widest">Fabrieksinstellingen</h4>
                            <p className="text-[10px] font-bold text-slate-500 mb-6">Wist ALLE data, mappen en instellingen permanent.</p>
                        </div>
                        <button onClick={() => confirmReset('EMPTY')} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-500/20">Volledige Reset</button>
                    </div>
                    <div className="p-8 bg-white dark:bg-slate-800 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 shadow-sm flex flex-col justify-between">
                        <div>
                            <h4 className="font-black text-blue-700 dark:text-blue-400 text-xs uppercase mb-2 tracking-widest">Demo Gegevens</h4>
                            <p className="text-[10px] font-bold text-slate-500 mb-6">Laad voorbeeld machines en historie voor training.</p>
                        </div>
                        <button onClick={() => confirmReset('DEMO')} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20">Demo Laden</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
