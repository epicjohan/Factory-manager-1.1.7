import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  Zap, Calendar, ChevronLeft, ChevronRight, BarChart2, Search, Activity, Plug, TrendingUp, Monitor
} from '../../icons';
import { useTable } from '../../hooks/useTable';
import { KEYS } from '../../services/db/core';
import { Machine, AssetEnergyLog, EnergySettings, AssetEnergyConfig } from '../../types';
import { db } from '../../services/storage';

type ViewMode = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export const AssetEnergyView: React.FC = () => {
    const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('DAY');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [energySettings, setEnergySettings] = useState<EnergySettings>({ kwhPrice: 0, maxPowerLimit: 0 });

    const { data: machines } = useTable<Machine>(KEYS.MACHINES);
    const { data: logs } = useTable<AssetEnergyLog>(KEYS.LOGS_ENERGY_ASSETS);
    const { data: configs } = useTable<AssetEnergyConfig>(KEYS.ASSET_ENERGY_CONFIGS);

    useEffect(() => {
        const load = async () => {
            const s = await db.getEnergySettings();
            setEnergySettings(s);
        };
        load();
    }, []);

    // Filter machines that have energy config or logs
    const monitoredMachines = useMemo(() => {
        const configuredIds = configs.map(c => c.machineId);
        // Also include machines that have logs even if config was deleted
        const loggedIds = Array.from(new Set(logs.map(l => l.machineId)));
        const relevantIds = Array.from(new Set([...configuredIds, ...loggedIds]));
        
        return machines
            .filter(m => relevantIds.includes(m.id))
            .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.machineNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [machines, configs, logs, searchQuery]);

    // Select first machine on load
    useEffect(() => {
        if (!selectedMachineId && monitoredMachines.length > 0) {
            setSelectedMachineId(monitoredMachines[0].id);
        }
    }, [monitoredMachines, selectedMachineId]);

    const chartData = useMemo(() => {
        if (!selectedMachineId) return [];

        const start = new Date(selectedDate);
        start.setHours(0,0,0,0);
        let end = new Date(start);
        
        if (viewMode === 'DAY') {
            end.setHours(23,59,59,999);
        } else if (viewMode === 'WEEK') {
            const day = start.getDay() || 7;
            if (day !== 1) start.setHours(-24 * (day - 1));
            end = new Date(start);
            end.setDate(end.getDate() + 6);
            end.setHours(23,59,59,999);
        } else if (viewMode === 'MONTH') {
            start.setDate(1);
            end = new Date(start);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
            end.setHours(23,59,59,999);
        } else { // YEAR
            start.setMonth(0, 1);
            end = new Date(start);
            end.setFullYear(end.getFullYear() + 1);
            end.setDate(0);
            end.setHours(23,59,59,999);
        }

        const relevantLogs = logs.filter(l => {
            const t = new Date(l.timestamp).getTime();
            return l.machineId === selectedMachineId && t >= start.getTime() && t <= end.getTime();
        });

        const dataPoints = [];
        const unit = viewMode === 'DAY' ? 'W' : 'kWh';

        if (viewMode === 'DAY') {
            for (let i = 0; i < 24; i++) {
                const hourLogs = relevantLogs.filter(l => new Date(l.timestamp).getHours() === i);
                const avgPower = hourLogs.length > 0 
                    ? hourLogs.reduce((acc, l) => acc + l.avgPower, 0) / hourLogs.length 
                    : 0;
                
                dataPoints.push({
                    label: `${i.toString().padStart(2, '0')}:00`,
                    value: Math.round(avgPower),
                    unit,
                    rawDate: new Date(new Date(start).setHours(i))
                });
            }
        } else if (viewMode === 'YEAR') {
            const months = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
            for (let i = 0; i < 12; i++) {
                const monthLogs = relevantLogs.filter(l => new Date(l.timestamp).getMonth() === i);
                const totalKwh = monthLogs.reduce((acc, l) => acc + (l.kwhDelta || 0), 0);
                
                dataPoints.push({
                    label: months[i],
                    value: parseFloat(totalKwh.toFixed(2)),
                    unit: 'kWh',
                    rawDate: new Date(new Date(start).setMonth(i))
                });
            }
        } else {
            // WEEK or MONTH
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            for (let i = 0; i < days; i++) {
                const currentDay = new Date(start);
                currentDay.setDate(start.getDate() + i);
                const dayLogs = relevantLogs.filter(l => new Date(l.timestamp).toDateString() === currentDay.toDateString());
                const totalKwh = dayLogs.reduce((acc, l) => acc + (l.kwhDelta || 0), 0);
                
                dataPoints.push({
                    label: currentDay.getDate().toString(),
                    value: parseFloat(totalKwh.toFixed(2)),
                    unit: 'kWh',
                    rawDate: currentDay
                });
            }
        }

        return dataPoints;
    }, [logs, selectedMachineId, viewMode, selectedDate]);

    const navigateDate = (dir: 'PREV' | 'NEXT') => {
        const newDate = new Date(selectedDate);
        if (viewMode === 'DAY') newDate.setDate(newDate.getDate() + (dir === 'NEXT' ? 1 : -1));
        else if (viewMode === 'WEEK') newDate.setDate(newDate.getDate() + (dir === 'NEXT' ? 7 : -7));
        else if (viewMode === 'MONTH') newDate.setMonth(newDate.getMonth() + (dir === 'NEXT' ? 1 : -1));
        else newDate.setFullYear(newDate.getFullYear() + (dir === 'NEXT' ? 1 : -1));
        setSelectedDate(newDate);
    };

    const handleBarClick = (data: any) => {
        if (viewMode === 'YEAR') {
            setViewMode('MONTH');
            setSelectedDate(data.rawDate);
        } else if (viewMode === 'MONTH') {
            setViewMode('DAY');
            setSelectedDate(data.rawDate);
        }
    };

    const currentTotal = chartData.reduce((acc, d) => acc + d.value, 0);
    const cost = viewMode === 'DAY' 
        ? (currentTotal / 1000) * 24 * energySettings.kwhPrice // Estimate
        : currentTotal * energySettings.kwhPrice;

    return (
        <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500 h-[800px]">
            {/* LEFT COLUMN: Asset Selection */}
            <div className="w-full lg:w-80 flex flex-col bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden shrink-0">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                        <Plug className="text-purple-500" /> Gemeten Assets
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Zoek machine..." 
                            className="w-full pl-10 pr-4 py-2 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-purple-500 transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {monitoredMachines.map(m => (
                        <button
                            key={m.id}
                            onClick={() => setSelectedMachineId(m.id)}
                            className={`w-full text-left p-3 rounded-2xl transition-all border-2 ${selectedMachineId === m.id ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{m.name}</div>
                                {selectedMachineId === m.id && <Activity size={14} className="text-purple-500 animate-pulse" />}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{m.machineNumber}</div>
                        </button>
                    ))}
                    {monitoredMachines.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-xs italic px-4">
                            Geen machines met energiemeters gevonden. Configureer meters in het Admin paneel.
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: Visualization */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
                {/* Header Controls */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 pl-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600 dark:text-purple-400">
                            <BarChart2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                {monitoredMachines.find(m => m.id === selectedMachineId)?.name || 'Selecteer Asset'}
                            </h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {viewMode === 'DAY' ? 'Live Vermogen & Dagverbruik' : 'Historisch Verbruik'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                            {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as const).map(m => (
                                <button 
                                    key={m}
                                    onClick={() => setViewMode(m)}
                                    className={`px-6 py-2 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === m ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    {m === 'DAY' ? 'Dag' : m === 'WEEK' ? 'Week' : m === 'MONTH' ? 'Maand' : 'Jaar'}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <button onClick={() => navigateDate('PREV')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-[2rem] transition-all shadow-sm"><ChevronLeft size={16}/></button>
                            <span className="text-xs font-black text-slate-600 dark:text-slate-300 min-w-[100px] text-center uppercase tracking-wider">
                                {viewMode === 'YEAR' ? selectedDate.getFullYear() : selectedDate.toLocaleDateString()}
                            </span>
                            <button onClick={() => navigateDate('NEXT')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-[2rem] transition-all shadow-sm"><ChevronRight size={16}/></button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Zap size={80} className="text-purple-500"/></div>
                        <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">{viewMode === 'DAY' ? 'Gemiddeld Vermogen' : 'Totaal Verbruik'}</div>
                        <div className="text-4xl font-black text-white font-mono tracking-tighter">
                            {viewMode === 'DAY' ? Math.round(currentTotal / (chartData.length || 1)).toLocaleString() : currentTotal.toFixed(1)} 
                            <span className="text-lg text-slate-500 font-normal ml-2">{viewMode === 'DAY' ? 'W' : 'kWh'}</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Geschatte Kosten</div>
                        <div className="text-4xl font-black text-slate-800 dark:text-white font-mono tracking-tighter">
                            € {cost.toFixed(2)}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Co2 Equivalent</div>
                        <div className="text-4xl font-black text-slate-800 dark:text-white font-mono tracking-tighter">
                            {(currentTotal * (viewMode === 'DAY' ? 0.001 : 1) * 0.45).toFixed(1)} <span className="text-lg text-slate-400 font-normal ml-1">kg</span>
                        </div>
                    </div>
                </div>

                {/* Main Chart */}
                <div className="flex-1 bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm min-h-[400px] relative flex flex-col">
                    <div className="flex-1 w-full min-h-0">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={chartData} 
                                    margin={{top: 20, right: 30, left: 20, bottom: 20}}
                                >
                                    <defs>
                                        <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                        </linearGradient>
                                        <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0.2}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} stroke="#94a3b8" />
                                    <XAxis 
                                        dataKey="label" 
                                        stroke="#94a3b8" 
                                        tick={{fontSize: 10, fontWeight: 900}} 
                                        interval={viewMode === 'DAY' ? 3 : 0} 
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <YAxis 
                                        stroke="#94a3b8" 
                                        tick={{fontSize: 10, fontWeight: 900}} 
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(139, 92, 246, 0.1)'}}
                                        contentStyle={{ 
                                            backgroundColor: '#0f172a', 
                                            border: '1px solid #1e293b', 
                                            borderRadius: '16px', 
                                            color: '#f1f5f9', 
                                            fontSize: '12px',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                        }}
                                        itemStyle={{ fontWeight: 700, color: '#a78bfa' }}
                                        formatter={(value: number, name: string, item: any) => [`${value} ${item.payload.unit}`, viewMode === 'DAY' ? 'Vermogen' : 'Verbruik']}
                                    />
                                    <Bar 
                                        dataKey="value" 
                                        radius={[6, 6, 0, 0]} 
                                        animationDuration={800}
                                        cursor={viewMode !== 'DAY' ? 'pointer' : 'default'}
                                        onClick={handleBarClick}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.value > (viewMode === 'DAY' ? 15000 : 100) ? 'url(#orangeGradient)' : 'url(#purpleGradient)'} 
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl mb-4">
                                    <BarChart2 size={64} className="opacity-20" />
                                </div>
                                <p className="text-xs font-black uppercase tracking-[0.2em]">Geen data voor deze periode</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};