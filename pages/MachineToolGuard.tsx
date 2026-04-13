
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/storage';
import { Machine, ToolStatistic, Permission, AssetType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
    ArrowLeft,
    Settings,
    RefreshCw,
    Lock,
    X,
    LayoutGrid,
    ToggleLeft,
    ToggleRight,
    ShieldAlert,
    CheckCircle
} from '../icons';
import { NumpadModal } from '../components/NumpadModal';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';
import { useNotifications } from '../contexts/NotificationContext';

export const MachineToolGuard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const { addNotification } = useNotifications();

    // REACTIVE HOOK: No more polling!
    const { data: machines } = useTable<Machine>(KEYS.MACHINES);

    // Derived State
    const machine = useMemo(() => machines.find(m => m.id === id) || null, [machines, id]);
    const toolStats = useMemo(() => machine?.toolStats || [], [machine]);

    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [selectedToolKey, setSelectedToolKey] = useState<string | null>(null); // Key format: "PROG-TOOL"
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinAction, setPinAction] = useState<() => void>(() => { });
    const [pinInput, setPinInput] = useState('');

    const [numpadConfig, setNumpadConfig] = useState<{ isOpen: boolean; title: string; initial: number; unit: string; onConfirm: (v: number) => void }>({
        isOpen: false, title: '', initial: 0, unit: '', onConfirm: () => { }
    });

    // Validatie bij mount of update
    useEffect(() => {
        if (machines.length > 0 && !machine) {
            // Machine niet gevonden in geladen lijst? Terug naar home.
            navigate('/');
        } else if (machine && machine.type !== AssetType.CNC) {
            navigate('/');
        }
    }, [machine, machines, navigate]);

    // Selected Tool Helper
    const selectedTool = useMemo(() => {
        if (!selectedToolKey) return null;
        const [prog, toolNum] = selectedToolKey.split('-');
        return toolStats.find((t: ToolStatistic) => t.programNumber === prog && t.toolNumber === parseInt(toolNum)) || null;
    }, [selectedToolKey, toolStats]);

    // INTELLIGENT LEARNING LOGIC
    // Dit effect draait alleen als de timestamp van liveStats verandert.
    useEffect(() => {
        if (!machine?.liveStats?.connected) return;
        const stats = machine.liveStats;

        // Alleen verwerken als machine actief draait
        if (stats.executionState !== 'ACTIVE') return;

        const prog = stats.programNumber;
        const tool = stats.currentTool;
        const load = stats.spindleLoad;

        if (!prog || !tool) return;

        const existingIdx = toolStats.findIndex((t: ToolStatistic) => t.programNumber === prog && t.toolNumber === tool);

        if (existingIdx === -1) {
            // Nieuwe tool detectie
            const newTool: ToolStatistic = {
                programNumber: prog, toolNumber: tool, averageLoad: load, maxRecordedLoad: load, sampleCount: 1,
                learningThreshold: 30,
                warningThresholdPercent: 20, status: 'LEARNING', monitoringMode: 'LOAD', maxCycles: 100, currentCycles: 0, enabled: true,
                showLoadAlertOnDashboard: true, showLifeAlertOnDashboard: true
            };
            const updated = [...toolStats, newTool];
            db.updateMachineToolStats(machine.id, updated);
            // Let op: We updaten de lokale state niet handmatig, useTable doet dit via het event.
        } else {
            const t = { ...toolStats[existingIdx] };
            if (!t.enabled) return;

            // Filter ruis (load < 5%)
            if (load > 5) {
                let changed = false;

                // Update averages
                t.averageLoad = parseFloat(((t.averageLoad * t.sampleCount + load) / (t.sampleCount + 1)).toFixed(1));
                t.sampleCount += 1;
                if (load > t.maxRecordedLoad) t.maxRecordedLoad = load;

                // Status Transitions
                const thresh = t.learningThreshold || 30;
                if (t.status === 'LEARNING' && t.sampleCount >= thresh) {
                    t.status = 'OK';
                    changed = true;
                }

                const loadLimit = t.averageLoad * (1 + t.warningThresholdPercent / 100);
                if (load > loadLimit && t.status !== 'LEARNING') {
                    if (t.status !== 'WARNING') { t.status = 'WARNING'; changed = true; }
                } else if (t.status === 'WARNING' && load <= loadLimit) {
                    t.status = 'OK'; changed = true;
                }

                // Cycle counting sync
                if (t.currentCycles >= t.maxCycles && t.status !== 'WARNING') {
                    if (t.status !== 'EXPIRED') { t.status = 'EXPIRED'; changed = true; }
                }

                if (t.currentCycles !== stats.partsCount && stats.partsCount > 0) {
                    t.currentCycles = stats.partsCount;
                    changed = true;
                }

                // Alleen schrijven naar DB als er echt iets veranderd is om events te beperken
                // Omdat 'averageLoad' en 'sampleCount' continu veranderen tijdens snijden, 
                // updaten we bij elke 'tick' als de machine snijdt.
                // Optimalisatie: Je zou hier kunnen throttlen, maar voor nu is direct feedback wenselijk.
                const updated = [...toolStats];
                updated[existingIdx] = t;
                db.updateMachineToolStats(machine.id, updated);
            }
        }
    }, [machine?.liveStats?.lastUpdated]);

    const handleResetTool = (tool: ToolStatistic) => {
        setPinAction(() => () => {
            const newStats = toolStats.map((t: ToolStatistic) => (t.toolNumber === tool.toolNumber && t.programNumber === tool.programNumber) ? { ...t, currentCycles: 0, status: 'LEARNING' as const, sampleCount: 0, averageLoad: 0, maxRecordedLoad: 0 } : t);
            db.updateMachineToolStats(machine!.id, newStats as any);
            setShowPinModal(false); setPinInput(''); setSelectedToolKey(null);
        });
        setShowPinModal(true);
    };

    const handleFinishLearning = (tool: ToolStatistic) => {
        const newStats = toolStats.map((t: ToolStatistic) => (t.toolNumber === tool.toolNumber && t.programNumber === tool.programNumber) ? { ...t, status: 'OK' as const } : t);
        db.updateMachineToolStats(machine!.id, newStats as any);
        // UI update via hook
    };

    const updateToolConfig = (toolNum: number, prog: string, updates: Partial<ToolStatistic>) => {
        const newStats = toolStats.map((t: ToolStatistic) => (t.toolNumber === toolNum && t.programNumber === prog) ? { ...t, ...updates } : t);
        db.updateMachineToolStats(machine!.id, newStats as any);
    };

    const getToolColors = (stat: ToolStatistic) => {
        if (stat.status === 'WARNING') return 'border-red-500 bg-red-500/10 text-red-500';
        if (stat.currentCycles >= stat.maxCycles) return 'border-orange-500 bg-orange-500/10 text-orange-500';
        if (stat.currentCycles >= stat.maxCycles - 2) return 'border-yellow-500 bg-yellow-500/10 text-yellow-500';
        if (stat.status === 'LEARNING') return 'border-blue-500/40 bg-blue-500/5 text-blue-400';
        return 'border-emerald-500/50 bg-emerald-500/5 text-emerald-500';
    };

    const openNumpad = (title: string, initial: number, unit: string, onConfirm: (v: number) => void) => {
        setNumpadConfig({ isOpen: true, title, initial, unit, onConfirm });
    };

    if (!machine) return null;

    const liveLoad = machine.liveStats?.spindleLoad || 0;
    const activeToolNum = machine.liveStats?.currentTool;
    const activeProg = machine.liveStats?.programNumber;
    const activeToolStat = toolStats.find((t: ToolStatistic) => t.toolNumber === activeToolNum && t.programNumber === activeProg);

    const activeAlarms = toolStats.filter((t: ToolStatistic) => t.status === 'WARNING' && t.showLoadAlertOnDashboard);

    return (
        <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col font-sans z-[100] overflow-hidden text-left">
            <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 text-slate-400 transition-all hover:scale-105"><ArrowLeft size={24} /></button>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight">{machine.name}</h1>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{activeProg || 'Geen Programma'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 bg-black/40 px-5 py-2 rounded-[2rem] border border-white/5">
                        <div className="text-center">
                            <div className="text-[8px] font-bold text-slate-500 uppercase">Shift</div>
                            <div className="text-xl font-black font-mono text-emerald-400">{machine.sessionPartsCount || machine.liveStats?.partsCount || 0}</div>
                        </div>
                        <div className="w-px h-6 bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-[8px] font-bold text-slate-500 uppercase">Target</div>
                            <div
                                onClick={() => openNumpad('Dagnorm aanpassen', machine.targetPartsPerHour || 0, 'Stuks', (v) => {
                                    const updated = { ...machine, targetPartsPerHour: v };
                                    db.updateMachine(updated);
                                })}
                                className="text-xl font-black font-mono text-white/30 cursor-pointer hover:text-white transition-colors"
                            >
                                {machine.targetPartsPerHour || 0}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsConfigOpen(true)} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:bg-white/10 transition-all hover:scale-105"><Settings size={24} /></button>
                </div>
            </header>

            {activeAlarms.length > 0 && (
                <div className="bg-red-600 p-2 flex flex-col gap-1 overflow-hidden shrink-0">
                    {activeAlarms.map((a: ToolStatistic) => (
                        <div key={a.toolNumber} className="flex items-center justify-center gap-4 animate-pulse">
                            <ShieldAlert size={18} className="text-white" />
                            <span className="text-sm font-black uppercase italic tracking-tighter">TOOLGUARD ALERT: T{a.toolNumber} BELASTING OVERSCHREDEN!</span>
                        </div>
                    ))}
                </div>
            )}

            <main className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
                <div className="lg:w-1/4 flex flex-col gap-4">
                    <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/10 p-6 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden flex-1">
                        <div className="w-full text-center relative h-full flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-2">Actuele Belasting (Load)</span>

                            <div className="relative w-full max-w-[180px] aspect-square flex items-center justify-center mt-10">
                                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transform -rotate-90 scale-125">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" strokeDasharray="188 63" />
                                    <circle
                                        cx="50" cy="50" r="40"
                                        fill="none"
                                        stroke={activeToolStat?.status === 'WARNING' ? '#ef4444' : '#3b82f6'}
                                        strokeWidth="7"
                                        strokeDasharray={`${(Math.min(100, liveLoad) / 100) * 188}, 251.2`}
                                        strokeLinecap="round"
                                        className="transition-all duration-300"
                                    />
                                </svg>
                                <div className="z-10 flex items-baseline gap-1">
                                    <span className="text-7xl font-black font-mono text-white tracking-tighter leading-none">{liveLoad}</span>
                                    <span className="text-3xl font-black opacity-30 text-white tracking-tighter">%</span>
                                </div>
                            </div>

                            <div className="mt-auto w-full grid grid-cols-2 gap-2">
                                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                    <div className="text-[8px] font-bold text-slate-500 uppercase mb-1 text-left">Referentie</div>
                                    <div className="text-lg font-mono font-black text-blue-400 text-left">{activeToolStat?.averageLoad || 0}%</div>
                                </div>
                                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                    <div className="text-[8px] font-bold text-slate-500 uppercase mb-1 text-left">Alarm Limiet</div>
                                    <div className="text-lg font-mono font-black text-red-500 text-left">{activeToolStat ? Math.round(activeToolStat.averageLoad * (1 + activeToolStat.warningThresholdPercent / 100)) : 0}%</div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full space-y-4 mt-6">
                            <div className={`flex items-center gap-4 p-5 rounded-3xl shadow-xl transition-colors duration-500 ${activeToolStat ? getToolColors(activeToolStat) : 'bg-slate-800 text-slate-500'}`}>
                                <div className="text-4xl font-black italic">T{activeToolNum || '--'}</div>
                                <div className="flex-1 border-l border-current/20 pl-4 text-left">
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Conditie</div>
                                    <div className="text-xs font-black uppercase">{activeToolStat?.status || 'Detectie...'}</div>
                                </div>
                            </div>

                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">
                                    <span>Standtijd</span>
                                    <span className="font-mono text-white">{activeToolStat?.currentCycles || 0} / {activeToolStat?.maxCycles || 0}</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-500 ${(activeToolStat?.currentCycles || 0) >= (activeToolStat?.maxCycles || 0) - 2 ? ((activeToolStat?.currentCycles || 0) >= (activeToolStat?.maxCycles || 0) ? 'bg-orange-50' : 'bg-yellow-500') : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (activeToolStat?.currentCycles || 0) / (activeToolStat?.maxCycles || 1) * 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:w-3/4 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <LayoutGrid size={14} /> Gereedschapsregister
                        </h3>
                        <div className="flex gap-4">
                            {['OK', 'NA BIJ', 'MAX', 'ALARM'].map((lbl, i) => (
                                <div key={lbl} className="flex items-center gap-1.5 text-[9px] font-black text-slate-600 uppercase">
                                    <span className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-yellow-500' : i === 2 ? 'bg-orange-500' : 'bg-red-500'}`}></span> {lbl}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                            {toolStats.length === 0 && <div className="col-span-full py-20 text-center text-slate-700 italic border-2 border-dashed border-white/5 rounded-[3rem]">Start een bewerking om data te verzamelen.</div>}
                            {toolStats.sort((a: ToolStatistic, b: ToolStatistic) => a.toolNumber - b.toolNumber).map((stat: ToolStatistic) => {
                                const isCurrent = stat.toolNumber === activeToolNum && stat.programNumber === activeProg;

                                return (
                                    <button
                                        key={`${stat.programNumber}-${stat.toolNumber}`}
                                        onClick={() => setSelectedToolKey(`${stat.programNumber}-${stat.toolNumber}`)}
                                        className={`p-4 rounded-[2rem] border-2 transition-all text-left relative overflow-hidden group hover:scale-[1.03] active:scale-95 flex flex-col justify-between h-32 ${getToolColors(stat)} ${isCurrent ? 'ring-2 ring-white/20' : 'opacity-80 hover:opacity-100'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className={`w-10 h-10 rounded-[2rem] flex items-center justify-center font-black text-xl ${isCurrent ? 'bg-white text-slate-950 shadow-lg' : 'bg-black/20 text-current'}`}>T{stat.toolNumber}</div>
                                            {stat.status === 'LEARNING' && <RefreshCw size={14} className="animate-spin opacity-50" />}
                                            {stat.status === 'WARNING' && <ShieldAlert size={20} className="text-red-500 animate-bounce" />}
                                        </div>

                                        <div>
                                            <div className="text-[10px] font-black uppercase opacity-60">Avg: {stat.averageLoad}%</div>
                                            <div className="mt-2 space-y-1">
                                                <div className="h-1 bg-black/20 rounded-full overflow-hidden">
                                                    <div className={`h-full transition-all duration-300 ${stat.currentCycles >= stat.maxCycles ? 'bg-orange-500' : 'bg-current opacity-60'}`} style={{ width: `${Math.min(100, (stat.currentCycles / stat.maxCycles) * 100)}%` }}></div>
                                                </div>
                                                <div className="text-[8px] font-black opacity-40 uppercase flex justify-between">
                                                    <span>{stat.currentCycles} / {stat.maxCycles}</span>
                                                    {stat.enabled === false && <span>OFF</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {isCurrent && <div className="absolute top-0 right-0 p-1 bg-white text-[8px] font-black uppercase text-black rounded-bl-lg shadow-sm">LIVE</div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>

            {selectedTool && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-6 animate-in zoom-in duration-300">
                    <div className="bg-slate-900 w-full max-w-xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-4xl font-black italic shadow-lg shadow-blue-500/20">T{selectedTool.toolNumber}</div>
                                <div className="text-left">
                                    <h3 className="text-2xl font-black uppercase italic leading-none mb-1">Tool Guard Setup</h3>
                                    <p className="text-xs font-mono text-slate-500 tracking-tighter">ID: {selectedTool.programNumber}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedToolKey(null)} className="p-4 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={24} /></button>
                        </div>

                        <div className="p-10 space-y-10">
                            <div className="grid grid-cols-2 gap-4">
                                {selectedTool.status === 'LEARNING' ? (
                                    <button onClick={() => handleFinishLearning(selectedTool)} className="p-8 bg-green-600/10 border border-green-500/30 rounded-[2rem] hover:bg-green-600/20 transition-all flex flex-col items-center gap-3 group">
                                        <CheckCircle size={32} className="text-green-500 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-black uppercase tracking-widest text-green-400">Inleren Voltooien</span>
                                    </button>
                                ) : (
                                    <button onClick={() => handleResetTool(selectedTool)} className="p-8 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all flex flex-col items-center gap-3 group">
                                        <RefreshCw size={32} className="text-blue-500 group-hover:rotate-180 transition-transform duration-500" />
                                        <span className="text-xs font-black uppercase tracking-widest">Baseline Reset</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => updateToolConfig(selectedTool.toolNumber, selectedTool.programNumber, { enabled: !selectedTool.enabled })}
                                    className={`p-8 border rounded-[2rem] transition-all flex flex-col items-center gap-3 ${selectedTool.enabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}
                                >
                                    {selectedTool.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                    <span className="text-xs font-black uppercase tracking-widest">Monitor {selectedTool.enabled ? 'AAN' : 'UIT'}</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Max Standtijd</label>
                                    <div
                                        onClick={() => openNumpad('Gereedschap Standtijd', selectedTool.maxCycles, 'Stuks', (v) => updateToolConfig(selectedTool.toolNumber, selectedTool.programNumber, { maxCycles: v }))}
                                        className="bg-black/40 p-6 rounded-3xl border border-white/5 shadow-inner cursor-pointer hover:bg-black/60 transition-all text-center ring-white/10 hover:ring-1"
                                    >
                                        <div className="text-4xl font-black font-mono leading-none">{selectedTool.maxCycles}</div>
                                        <div className="text-[9px] font-bold text-blue-500 uppercase mt-2">Cyclus Limiet</div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Alarm Marge (%)</label>
                                    <div
                                        onClick={() => openNumpad('Belasting Marge', selectedTool.warningThresholdPercent, '%', (v) => updateToolConfig(selectedTool.toolNumber, selectedTool.programNumber, { warningThresholdPercent: v }))}
                                        className="bg-black/40 p-6 rounded-3xl border border-white/5 shadow-inner cursor-pointer hover:bg-black/60 transition-all text-center ring-white/10 hover:ring-1"
                                    >
                                        <div className="text-4xl font-black font-mono leading-none">{selectedTool.warningThresholdPercent}%</div>
                                        <div className="text-[9px] font-bold text-red-500 uppercase mt-2">Boven Baseline</div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Inleer Punten</label>
                                    <div
                                        onClick={() => openNumpad('Inleer drempelwaarde', selectedTool.learningThreshold || 30, 'Pnt', (v) => updateToolConfig(selectedTool.toolNumber, selectedTool.programNumber, { learningThreshold: v }))}
                                        className="bg-black/40 p-6 rounded-3xl border border-white/5 shadow-inner cursor-pointer hover:bg-black/60 transition-all text-center ring-white/10 hover:ring-1"
                                    >
                                        <div className="text-4xl font-black font-mono leading-none">{selectedTool.learningThreshold || 30}</div>
                                        <div className="text-[9px] font-bold text-slate-500 uppercase mt-2">Aantal Samples</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-black/40 flex justify-end">
                            <button onClick={() => setSelectedToolKey(null)} className="px-12 py-4 bg-white/5 hover:bg-white/10 rounded-3xl font-black uppercase text-sm tracking-widest transition-all active:scale-95">Sluiten</button>
                        </div>
                    </div>
                </div>
            )}

            <NumpadModal
                isOpen={numpadConfig.isOpen}
                onClose={() => setNumpadConfig({ ...numpadConfig, isOpen: false })}
                title={numpadConfig.title}
                initialValue={numpadConfig.initial}
                unit={numpadConfig.unit}
                onConfirm={numpadConfig.onConfirm}
            />

            {showPinModal && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-6">
                    <div className="w-full max-w-xs text-center">
                        <Lock size={48} className="mx-auto text-blue-500 mb-6" />
                        <h2 className="text-2xl font-black uppercase mb-10 italic">Beveiligde Actie</h2>
                        <div className="flex justify-center gap-4 mb-12">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pinInput.length >= i ? 'bg-blue-50 border-blue-500 scale-125 shadow-[0_0_15px_#3b82f6]' : 'border-white/20'}`}></div>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button key={num} onClick={() => pinInput.length < 4 && setPinInput(p => p + num.toString())} className="h-20 rounded-2xl bg-white/5 hover:bg-white/10 text-3xl font-black active:scale-90 transition-transform">{num}</button>
                            ))}
                            <button onClick={() => setPinInput('')} className="h-20 rounded-2xl bg-white/5 text-xs font-black uppercase hover:bg-red-500/20 transition-colors">Wis</button>
                            <button onClick={() => pinInput.length < 4 && setPinInput(p => p + '0')} className="h-20 rounded-2xl bg-white/5 text-3xl font-black active:scale-90 transition-transform">0</button>
                            <button onClick={async () => {
                                // --- FIX: getUsers is async and must be awaited ---
                                const usersData = await db.getUsers();
                                const authUser = usersData.find(u => u.pinCode === pinInput);
                                if (authUser && hasPermission(Permission.USE_TOOLGUARD)) { pinAction(); } else { setPinInput(''); addNotification('ERROR', 'Fout', "Ongeldige PIN."); }
                            }} className={`h-20 rounded-2xl font-black transition-all ${pinInput.length === 4 ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40' : 'bg-slate-800 text-slate-600'}`}>OK</button>
                        </div>
                        <button onClick={() => setShowPinModal(false)} className="mt-12 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors">Annuleren</button>
                    </div>
                </div>
            )}
        </div>
    );
};
