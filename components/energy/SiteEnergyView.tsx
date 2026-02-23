import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../services/storage';
import { KEYS } from '../../services/db/core';
import { 
  Zap, Sun, Factory, TrendingUp, ArrowLeft, ArrowRight, 
  ChevronRight, Download, History, BarChart2,
  // Removed non-existent ArrowDownZap import to fix build error
  Layout, FlaskConical, Activity, Gauge, ShieldAlert, AlertTriangle
} from '../../icons';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useTable } from '../../hooks/useTable';
import { EnergyHistoricalLog, EnergyLiveData, EnergySettings } from '../../types';

type DrillLevel = 'YEAR' | 'MONTH' | 'DAY';
type ViewTab = 'COMBINED' | 'CONSUMPTION' | 'PRODUCTION';

export const SiteEnergyView: React.FC = () => {
    const [level, setLevel] = useState<DrillLevel>('DAY');
    const [viewTab, setViewTab] = useState<ViewTab>('COMBINED');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [energySettings, setEnergySettings] = useState<EnergySettings>({ kwhPrice: 0.35, maxPowerLimit: 17000 });
    
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [demoTick, setDemoTick] = useState(0);

    const { data: energyLiveList } = useTable<EnergyLiveData>(KEYS.ENERGY_LIVE);
    const { data: history } = useTable<EnergyHistoricalLog>(KEYS.LOGS_ENERGY_HISTORICAL);
    
    useEffect(() => {
        const init = async () => {
            const meta = await db.getMetadata();
            setIsDemoMode(!!meta.isDemoMode);
            const settings = await db.getEnergySettings();
            setEnergySettings(settings);
        };
        init();

        const handleSettingsUpdate = (e: any) => {
             if (e.detail) setEnergySettings(e.detail);
        };

        window.addEventListener('db-updated', init);
        window.addEventListener(`db:${KEYS.SETTINGS_ENERGY}:updated`, handleSettingsUpdate);
        
        return () => {
            window.removeEventListener('db-updated', init);
            window.removeEventListener(`db:${KEYS.SETTINGS_ENERGY}:updated`, handleSettingsUpdate);
        };
    }, []);

    useEffect(() => {
        if (!isDemoMode) return;
        const interval = setInterval(() => setDemoTick(t => t + 1), 2000);
        return () => clearInterval(interval);
    }, [isDemoMode]);

    const live = useMemo(() => {
        if (isDemoMode) {
            const now = new Date();
            const hour = now.getHours();
            const isWorking = hour >= 7 && hour < 18;
            const baseCons = isWorking ? 45000 : 5000;
            const active_power_w = Math.max(2000, baseCons + (Math.random() - 0.5) * 8000);
            let production_w = 0;
            if (hour >= 6 && hour <= 20) {
                const peak = 65000;
                const timeFactor = Math.sin(((hour - 6) / 14) * Math.PI);
                production_w = peak * timeFactor * (0.8 + Math.random() * 0.4);
            }
            return {
                active_power_w: Math.round(active_power_w),
                production_w: Math.round(production_w),
                net_power_w: Math.round(active_power_w - production_w),
                total_kwh: 125000 + (demoTick * 0.5), 
                total_production_kwh: 45000 + (demoTick * 0.2),
                updated: new Date().toISOString()
            } as EnergyLiveData;
        }
        return energyLiveList[0] || { 
            active_power_w: 0, production_w: 0, net_power_w: 0, 
            total_kwh: 0, total_production_kwh: 0
        };
    }, [energyLiveList, isDemoMode, demoTick]);

    // --- GEAVANCEERDE PIEK BEREKENING (NETTO VS BRUTO) ---
    const peakStats = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLogs = history.filter(log => {
            return new Date(log.timestamp).toISOString().split('T')[0] === todayStr;
        });
        
        // Bruto piek uit historie (max van individuele kwartierpieken)
        const historicalGrossMax = todayLogs.length > 0 ? Math.max(...todayLogs.map(l => l.peak_w)) : 0;
        
        // Netto piek proxy (max van gem_verbruik - gem_productie)
        const historicalNetMax = todayLogs.length > 0 
            ? Math.max(...todayLogs.map(l => l.avg_consumption_w - l.avg_production_w)) 
            : 0;

        return {
            gross: Math.max(historicalGrossMax, live.active_power_w),
            net: Math.max(historicalNetMax, live.net_power_w)
        };
    }, [history, live]);

    const chartData = useMemo(() => {
        if (isDemoMode) {
            const data = [];
            const baseTime = new Date(selectedDate);
            if (level === 'DAY') {
                for (let i = 0; i < 96; i++) {
                    const hour = Math.floor(i / 4);
                    const isWorking = hour >= 7 && hour < 17;
                    let cons = isWorking ? 40000 : 4000;
                    cons += Math.random() * 15000;
                    let prod = (hour >= 6 && hour <= 20) ? 60000 * Math.sin(((hour - 6) / 14) * Math.PI) * (0.7 + Math.random() * 0.3) : 0;
                    data.push({
                        label: `${hour.toString().padStart(2, '0')}:${((i%4)*15).toString().padStart(2, '0')}`,
                        consumption: Math.round(cons),
                        production: Math.round(prod),
                        rawDate: new Date(baseTime.setHours(hour, (i%4)*15))
                    });
                }
            } else {
                const count = level === 'MONTH' ? 30 : 12;
                for (let i = 1; i <= count; i++) {
                    data.push({
                        label: level === 'MONTH' ? `${i}` : `M${i}`,
                        consumption: 800 + Math.random() * 400,
                        production: 400 + Math.random() * 300,
                        rawDate: new Date()
                    });
                }
            }
            return data;
        }

        const filtered = history.filter(log => {
            const logDate = new Date(log.timestamp);
            if (level === 'YEAR') return logDate.getFullYear() === selectedDate.getFullYear();
            if (level === 'MONTH') return logDate.getFullYear() === selectedDate.getFullYear() && logDate.getMonth() === selectedDate.getMonth();
            if (level === 'DAY') return logDate.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0];
            return false;
        });

        const groups: Record<string, any> = {};
        filtered.forEach(log => {
            const date = new Date(log.timestamp);
            const key = level === 'DAY' ? log.timestamp : (level === 'MONTH' ? date.getDate().toString() : date.getMonth().toString());
            if (!groups[key]) groups[key] = { label: '', consumption: 0, production: 0, rawDate: date };
            
            const factor = level === 'DAY' ? 1 : 1000;
            groups[key].consumption += log.consumption_wh / factor;
            groups[key].production += log.production_wh / factor;
            groups[key].label = level === 'DAY' ? date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : 
                               (level === 'MONTH' ? date.getDate().toString() : date.toLocaleString('nl-NL', { month: 'short' }));
        });
        return Object.values(groups).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    }, [history, level, selectedDate, isDemoMode]);

    const handleDrillDown = (data: any) => {
        if (!data || !data.rawDate) return;
        if (level === 'YEAR') { setLevel('MONTH'); setSelectedDate(data.rawDate); }
        else if (level === 'MONTH') { setLevel('DAY'); setSelectedDate(data.rawDate); }
    };

    const navigateDate = (direction: 'PREV' | 'NEXT') => {
        const newDate = new Date(selectedDate);
        if (level === 'YEAR') newDate.setFullYear(newDate.getFullYear() + (direction === 'NEXT' ? 1 : -1));
        else if (level === 'MONTH') newDate.setMonth(newDate.getMonth() + (direction === 'NEXT' ? 1 : -1));
        else newDate.setDate(newDate.getDate() + (direction === 'NEXT' ? 1 : -1));
        setSelectedDate(newDate);
    };

    const peakWarning = peakStats.net > energySettings.maxPowerLimit;
    const peakApproaching = peakStats.net > energySettings.maxPowerLimit * 0.8;

    return (
        <div className="w-full space-y-8 text-left animate-in fade-in duration-1000">
            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* NETTO GRID BALANS */}
                <div className="bg-slate-900 border-2 border-blue-500/20 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all">
                        <Zap size={120} className="text-blue-500" />
                    </div>
                    <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] mb-4 block italic">Actuele Netto Afname</span>
                    <div className="flex items-baseline gap-3">
                        <span className={`text-6xl font-black font-mono italic tracking-tighter transition-colors ${live.net_power_w < 0 ? 'text-emerald-500' : 'text-white'}`}>
                            {Math.abs(live.net_power_w).toLocaleString()}
                        </span>
                        <span className="text-sm font-black text-slate-500 uppercase tracking-widest">{live.net_power_w < 0 ? 'INVOEDING' : 'WATT'}</span>
                    </div>
                </div>

                {/* DYNAMISCHE DAGPIEK KAART */}
                <div className={`border-2 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all duration-500 ${
                    peakWarning ? 'bg-red-600 border-red-400 text-white animate-pulse' : 
                    peakApproaching ? 'bg-orange-500 border-orange-400 text-white' : 
                    'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800'
                }`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        {/* Fix: Replaced non-existent ArrowDownZap with Zap as background decoration icon */}
                        <Zap size={100} />
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`p-3 rounded-2xl shadow-inner ${peakApproaching ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-500'}`}>
                            <Activity size={28} />
                        </div>
                        <span className={`text-xs font-black uppercase tracking-[0.2em] ${peakApproaching ? 'text-white' : 'text-slate-500'}`}>Dagpiek (Netto)</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-black font-mono italic tracking-tighter ${peakApproaching ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {Math.round(peakStats.net).toLocaleString()}
                        </span>
                        <span className={`text-sm font-black uppercase tracking-widest ${peakApproaching ? 'text-white/50' : 'text-slate-400'}`}>W</span>
                    </div>
                    
                    {/* TECHNISCHE BRUTO REFERENTIE */}
                    <div className={`mt-6 pt-4 border-t ${peakApproaching ? 'border-white/20' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className={peakApproaching ? 'text-white/60' : 'text-slate-400'}>Bruto Machine Belasting:</span>
                            <span className={peakApproaching ? 'text-white' : 'text-slate-700 dark:text-slate-300'}>{Math.round(peakStats.gross).toLocaleString()} W</span>
                        </div>
                        <div className={`mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${peakWarning ? 'text-white' : 'text-slate-400'}`}>
                            {peakWarning ? <ShieldAlert size={14} /> : <AlertTriangle size={14} />}
                            Limiet: {(energySettings.maxPowerLimit / 1000).toFixed(1)} kW
                        </div>
                    </div>
                </div>

                {/* SOLAR PRODUCTIE */}
                <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 shadow-inner"><Sun size={28} /></div>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Solar Productie</span>
                    </div>
                    <div className="text-5xl font-black text-slate-900 dark:text-white font-mono italic tracking-tighter">
                        {(live.production_w / 1000).toFixed(1)} <span className="text-lg font-normal text-slate-400">kW</span>
                    </div>
                </div>

                {/* PEAK SHAVING EFFECT */}
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><Activity size={80} className="text-emerald-500" /></div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 shadow-inner"><TrendingUp size={28} /></div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Peak Shaving Impact</span>
                    </div>
                    <div className="text-5xl font-black text-white font-mono italic tracking-tighter">
                        {peakStats.gross > 0 ? Math.round(((peakStats.gross - peakStats.net) / peakStats.gross) * 100) : 0}%
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">Drukverlaging op het net dankzij zon</p>
                </div>
            </div>

            {/* CHART SECTION */}
            <div className="bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden">
                <div className="bg-slate-950/50 p-2 flex justify-center border-b border-slate-800">
                    <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
                        <button onClick={() => setViewTab('COMBINED')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewTab === 'COMBINED' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Netto Balans</button>
                        <button onClick={() => setViewTab('CONSUMPTION')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewTab === 'CONSUMPTION' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Verbruik</button>
                        <button onClick={() => setViewTab('PRODUCTION')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewTab === 'PRODUCTION' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Zon</button>
                    </div>
                </div>

                <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <button onClick={() => navigateDate('PREV')} className="p-2 bg-slate-800 hover:bg-blue-600 rounded-lg text-white transition-all"><ArrowLeft size={20} /></button>
                            <button onClick={() => navigateDate('NEXT')} className="p-2 bg-slate-800 hover:bg-blue-600 rounded-lg text-white transition-all"><ArrowRight size={20} /></button>
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest border-l border-slate-700 pl-6">
                            {selectedDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </h3>
                    </div>
                    <div className="flex bg-slate-950 p-1 rounded-xl">
                        {(['YEAR', 'MONTH', 'DAY'] as DrillLevel[]).map(l => (
                            <button key={l} onClick={() => setLevel(l)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${level === l ? 'bg-slate-800 text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}>{l}</button>
                        ))}
                    </div>
                </div>

                <div className="p-8 h-[550px] w-full bg-slate-950/20">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.3} />
                                <XAxis dataKey="label" stroke="#475569" tick={{fontSize: 10, fontWeight: '900'}} axisLine={false} tickLine={false} dy={10} />
                                <YAxis stroke="#475569" tick={{fontSize: 10, fontFamily: 'monospace'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}${level === 'DAY' ? 'Wh' : 'kWh'}`} />
                                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px' }} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                                
                                {level === 'DAY' && energySettings.maxPowerLimit > 0 && (
                                    <ReferenceLine 
                                        y={energySettings.maxPowerLimit / 4} 
                                        stroke="#ef4444" 
                                        strokeWidth={2}
                                        strokeDasharray="5 5" 
                                        label={{ value: `LIMIET: ${(energySettings.maxPowerLimit/1000).toFixed(1)}kW`, position: 'insideTopRight', fill: '#ef4444', fontSize: 10, fontWeight: '900' }} 
                                    />
                                )}
                                
                                {viewTab !== 'PRODUCTION' && (
                                    <Bar dataKey="consumption" fill="#3b82f6" name="Machine Verbruik" radius={[2, 2, 0, 0]} onClick={handleDrillDown} cursor="pointer" />
                                )}
                                {viewTab !== 'CONSUMPTION' && (
                                    <Bar dataKey="production" fill="#10b981" name="Solar" radius={[2, 2, 0, 0]} onClick={handleDrillDown} cursor="pointer" />
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                            <History size={64} className="opacity-20 animate-pulse" />
                            <p className="font-black uppercase tracking-widest text-xs italic">Geen historische data gevonden voor deze periode</p>
                        </div>
                    )}
                </div>

                <div className="bg-slate-950 p-8 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-800">
                    <div className="flex gap-10">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Machineverbruik (Bruto)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zon Opbrengst</span>
                        </div>
                    </div>
                    <button onClick={() => {}} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl">
                        <Download size={14} className="inline mr-2" /> PDF Rapport
                    </button>
                </div>
            </div>
        </div>
    );
};
