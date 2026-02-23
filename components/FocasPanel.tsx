
import React, { useState, useEffect } from 'react';
import { FocasLiveStats, Machine } from '../types';
import { Activity, Monitor, Play, Clock, Zap, Wifi, WifiOff, AlertTriangle, Settings, Wrench, FileText, Timer, FlaskConical } from '../icons';
import { db } from '../services/storage';
import { KEYS } from '../services/db/core';

interface FocasPanelProps {
    machine: Machine;
    onSimulate?: (stats: FocasLiveStats) => void;
}

export const FocasPanel: React.FC<FocasPanelProps> = ({ machine, onSimulate }) => {
    const [stats, setStats] = useState<FocasLiveStats | undefined>(machine.liveStats);
    const [simulating, setSimulating] = useState(false);
    const [isHeartbeatAlive, setIsHeartbeatAlive] = useState(false);
    const [secondsSinceLastUpdate, setSecondsSinceLastUpdate] = useState(0);

    // EVENT-DRIVEN DATA REFRESH
    useEffect(() => {
        if (simulating) return;

        const handleUpdate = (e: any) => {
            const machines = e.detail as Machine[];
            const current = machines.find(m => m.id === machine.id);
            if (current && current.liveStats) {
                setStats(current.liveStats);
            }
        };

        window.addEventListener(`db:${KEYS.MACHINES}:updated`, handleUpdate);
        return () => window.removeEventListener(`db:${KEYS.MACHINES}:updated`, handleUpdate);
    }, [machine.id, simulating]);

    // Heartbeat Checker (Alleen UI timer, geen DB fetch)
    useEffect(() => {
        const checkHeartbeat = () => {
            if (!stats || !stats.lastUpdated) {
                setIsHeartbeatAlive(false);
                setSecondsSinceLastUpdate(999);
                return;
            }
            const lastUpdate = new Date(stats.lastUpdated).getTime();
            const now = Date.now();
            const diffSeconds = Math.floor((now - lastUpdate) / 1000);
            setSecondsSinceLastUpdate(diffSeconds);
            setIsHeartbeatAlive(diffSeconds < 15);
        };
        checkHeartbeat();
        const interval = setInterval(checkHeartbeat, 1000);
        return () => clearInterval(interval);
    }, [stats]); 

    // Simulation Loop
    useEffect(() => {
        let interval: any;
        if (simulating && onSimulate) {
            interval = setInterval(() => {
                setStats(prev => {
                    const prevStats = prev || { partsCount: 0, totalPowerOnTime: 0, totalCuttingTime: 0, totalOperatingTime: 0 } as FocasLiveStats;
                    const isRunning = Math.random() > 0.1; 
                    const newStats: FocasLiveStats = {
                        connected: true,
                        lastUpdated: new Date().toISOString(),
                        runMode: 'MEM',
                        programNumber: 'O' + Math.floor(Math.random() * 9000 + 1000),
                        programComment: 'SIMULATIE BEWERKING',
                        executionState: isRunning ? 'ACTIVE' : 'READY',
                        spindleLoad: isRunning ? Math.floor(Math.random() * 80) + 10 : 0,
                        spindleSpeed: isRunning ? Math.floor(Math.random() * 2000) + 10000 : 0,
                        feedOverride: 100,
                        partsCount: (prevStats.partsCount || 100) + (Math.random() > 0.95 ? 1 : 0),
                        targetCount: 500,
                        cycleTimeSec: 120,
                        totalPowerOnTime: (prevStats.totalPowerOnTime || 0) + 1,
                        totalOperatingTime: (prevStats.totalOperatingTime || 0) + (isRunning ? 1 : 0),
                        totalCuttingTime: (prevStats.totalCuttingTime || 0) + (isRunning ? 0.8 : 0)
                    };
                    onSimulate(newStats); 
                    return newStats;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [simulating, onSimulate]);

    const toggleSimulation = () => setSimulating(!simulating);

    if (!stats || !stats.connected) {
        return (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                <Monitor size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600 shrink-0" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-widest">Geen Live Verbinding</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto font-medium">
                    De "Factory Bridge" kan de machine niet uitlezen op dit moment. 
                </p>
                <div className="inline-flex flex-col items-center gap-2 bg-slate-50 dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-8 shadow-inner">
                    <div className="font-mono text-slate-700 dark:text-slate-300 text-base font-black">
                        {machine.focasIp || 'GEEN IP'} <span className="opacity-30 mx-2">|</span> {machine.focasPort || 8193}
                    </div>
                </div>
                <div>
                    <button onClick={toggleSimulation} className="text-xs text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest flex items-center gap-2 mx-auto border-2 border-blue-100 dark:border-blue-900/50 px-6 py-2.5 rounded-xl hover:bg-blue-50 transition-all shadow-sm">
                        <Play size={14} fill="currentColor" /> Start Preview Modus
                    </button>
                </div>
            </div>
        );
    }

    const formatHours = (mins: number) => {
        if (!mins) return '0u';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}u ${m}m`;
    };

    return (
        <div className="space-y-4 animate-in fade-in zoom-in duration-300 text-left">
            {(stats.executionState === 'OFFLINE' || stats.executionState === 'UNAVAILABLE') && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 p-5 rounded-2xl flex items-center gap-5 shadow-lg">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm"><WifiOff className="text-orange-500 shrink-0" size={32} /></div>
                    <div>
                        <h4 className="font-black text-orange-700 dark:text-orange-400 text-sm uppercase tracking-widest">Protocol Offline</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-1">Controleer de machine power en ethernet status.</p>
                    </div>
                </div>
            )}

            {stats.alarmMessage && (
                <div className="bg-red-600 text-white p-5 rounded-2xl flex items-center gap-6 shadow-xl border-b-4 border-red-800">
                    <div className="p-3 bg-white/20 rounded-2xl shrink-0"><AlertTriangle size={36} className="text-white" /></div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-1">Actief Machine Alarm</div>
                        <div className="text-2xl font-black font-mono tracking-tight uppercase leading-none">{stats.alarmCode ? `#${stats.alarmCode} ` : ''}{stats.alarmMessage}</div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-2 h-full ${isHeartbeatAlive ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-2 transition-all ${isHeartbeatAlive ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                            {isHeartbeatAlive ? ( <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></div><span>LIVE STREAM</span></>) : (<><WifiOff size={14} className="shrink-0" /><span>LAG DETECTIE ({secondsSinceLastUpdate}s)</span></>)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono font-black uppercase tracking-widest">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${stats.executionState === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-yellow-500'}`}></span>
                            {stats.runMode || '----'} MODE
                        </div>
                    </div>
                    <div className="flex items-start gap-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 shrink-0"><FileText size={32} /></div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mb-2">Actief Programma</div>
                            <h2 className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter leading-none italic uppercase">{stats.programNumber || 'O----'}</h2>
                            <div className="text-xl text-blue-600 dark:text-blue-400 font-bold leading-snug mt-1 truncate">{stats.programComment || 'Geen metadata'}</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900 text-white px-8 py-6 rounded-[2rem] border border-white/5 shadow-2xl text-center shrink-0">
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">Cyclus Tijd</div>
                    <div className="text-4xl font-black font-mono italic flex items-center justify-center gap-3 tabular-nums">
                        <Timer size={24} className="text-blue-500 shrink-0" />
                        {stats.cycleTimeSec ? (stats.cycleTimeSec / 60).toFixed(1) : '0.0'}<span className="text-xl opacity-40 font-normal">m</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 shrink-0"><Zap size={24}/></div>
                    <div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Power On Time</div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white font-mono tracking-tight">{formatHours(stats.totalPowerOnTime)}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-600 shrink-0"><Settings size={24}/></div>
                    <div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Operating Time</div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white font-mono tracking-tight">{formatHours(stats.totalOperatingTime)}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border-2 border-emerald-100 dark:border-emerald-900/50 shadow-md flex items-center gap-5 relative overflow-hidden group">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 shrink-0"><Wrench size={24}/></div>
                    <div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Cutting Time</div>
                        <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight">{formatHours(stats.totalCuttingTime)}</div>
                    </div>
                </div>
            </div>

            <div className={`transition-all duration-700 ${isHeartbeatAlive ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden relative">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 flex items-center gap-3 uppercase tracking-[0.2em]"><Activity size={18} className="text-blue-500" /> Feedrate Override</h3>
                        <div className="text-right">
                             <span className={`text-4xl font-black font-mono italic tracking-tighter ${stats.feedOverride < 100 ? 'text-orange-500' : 'text-blue-600 dark:text-blue-400'}`}>{stats.feedOverride}%</span>
                        </div>
                    </div>
                    <div className="flex items-end gap-1.5 h-20">
                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map((val) => (
                            <div key={val} className={`flex-1 rounded-t-lg transition-all duration-500 ${stats.feedOverride >= val ? (val === 100 ? 'bg-blue-500 shadow-[0_0_15px_#3b82f6]' : 'bg-blue-200 dark:bg-blue-900') : 'bg-slate-50 dark:bg-slate-700 opacity-50'}`} style={{ height: `${(val / 150) * 100}%` }}></div>
                        ))}
                    </div>
                </div>
            </div>

            {simulating && (
                <div className="bg-blue-600 p-4 rounded-2xl text-center text-xs font-black text-white shadow-xl animate-pulse flex items-center justify-center gap-3 uppercase tracking-[0.3em] italic">
                    <FlaskConical size={18} /> SIMULATIE MODUS ACTIEF
                </div>
            )}
        </div>
    );
};
