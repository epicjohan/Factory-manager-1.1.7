
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../services/storage';
import { Machine, ScheduleType, WorkSchedule, EfficiencyLog } from '../types';
import { TrendingUp, BarChart2, Calendar, Clock, Activity, AlertCircle, Filter, Monitor, SunMoon, Zap, ShieldCheck, Gauge } from '../icons';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell, 
    LineChart,
    Line,
    Legend,
    AreaChart,
    Area
} from 'recharts';

type TimeRange = 'TODAY' | 'WEEK' | 'MONTH';

interface MachineStats {
    id: string;
    name: string;
    availability: number;
    performance: number;
    quality: number;
    oee: number;
    operatingHours: number;
    cuttingHours: number;
    partsProduced: number;
    waitingForData: boolean;
}

interface TimelinePoint {
    label: string;
    oee: number;
    availability: number;
    performance: number;
}

export const EfficiencyDashboard: React.FC = () => {
    const [range, setRange] = useState<TimeRange>('TODAY');
    const [selectedAssetId, setSelectedAssetId] = useState<string>('ALL');
    const [scheduleFilter, setScheduleFilter] = useState<string>('ALL'); 
    
    const [machines, setMachines] = useState<Machine[]>([]);
    const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
    const [efficiencyLogs, setEfficiencyLogs] = useState<EfficiencyLog[]>([]);
    const [stats, setStats] = useState<MachineStats[]>([]);
    const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);

    useEffect(() => {
        // --- FIX: refresh is now async to handle db promises ---
        const refresh = async () => {
            const allMachinesData = await db.getMachines();
            const allMachines = allMachinesData.filter(m => m.showInDashboard);
            setMachines(allMachines);
            setSchedules(await db.getSchedules());
            setEfficiencyLogs(await db.getEfficiencyLogs());
        };
        refresh();
        const interval = setInterval(refresh, 10000);
        return () => clearInterval(interval);
    }, []);

    // Helper uren berekening
    const getShiftMinutesToday = (sched: WorkSchedule): number => {
        const dayKeys = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayKey = dayKeys[new Date().getDay()];
        const shift = sched.shifts.find(s => s.day === currentDayKey);
        
        if (!shift || !shift.enabled) return 0;
        
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const [hStart, mStart] = shift.startTime.split(':').map(Number);
        const [hEnd, mEnd] = shift.endTime.split(':').map(Number);
        const startMins = hStart * 60 + mStart;
        const endMins = hEnd * 60 + mEnd;

        if (currentMins < startMins) return 0;
        return Math.min(currentMins, endMins) - startMins;
    };

    useEffect(() => {
        const filteredMachines = machines.filter(m => {
            const assetMatch = selectedAssetId === 'ALL' || m.id === selectedAssetId;
            const schedId = m.scheduleId || m.schedule || ScheduleType.FULL_24_7;
            const schedMatch = scheduleFilter === 'ALL' || schedId === scheduleFilter;
            return assetMatch && schedMatch;
        });

        const newStats: MachineStats[] = filteredMachines.map(m => {
            const live = m.liveStats;
            const sched = schedules.find(s => s.id === (m.scheduleId || m.schedule)) || schedules[0];
            
            // Ophalen laatste snapshot voor nulpunt vandaag
            const logs = efficiencyLogs.filter(l => l.machineId === m.id).sort((a,b) => b.date.localeCompare(a.date));
            const lastLog = logs[0]; // Laatste opgeslagen dag-snapshot

            // Voor TODAY berekenen we het verschil tussen live teller en laatste snapshot
            if (range === 'TODAY') {
                if (!live || !live.connected) {
                    return { id: m.id, name: m.name, availability: 0, performance: 0, quality: 0, oee: 0, operatingHours: 0, cuttingHours: 0, partsProduced: 0, waitingForData: true, scheduleName: sched?.name };
                }

                const shiftMins = sched ? getShiftMinutesToday(sched) : 0;
                // Als er geen logs zijn, kunnen we geen delta berekenen voor vandaag. 
                // We tonen dan 0 of "wachten op data".
                if (!lastLog) {
                    return { id: m.id, name: m.name, availability: 0, performance: 0, quality: 0, oee: 0, operatingHours: 0, cuttingHours: 0, partsProduced: 0, waitingForData: true };
                }

                // Delta berekening: Live stand MINUS stand van gisterenavond
                const opDelta = Math.max(0, live.totalOperatingTime - lastLog.operatingMinutes);
                const cutDelta = Math.max(0, live.totalCuttingTime - lastLog.cuttingMinutes);
                const partsDelta = Math.max(0, live.partsCount - lastLog.partsProduced);

                const avail = shiftMins > 0 ? Math.min(100, (opDelta / shiftMins) * 100) : 0;
                const perf = opDelta > 0 ? Math.min(100, (cutDelta / opDelta) * 100) : 0;
                const qual = live.targetCount > 0 ? Math.min(100, (partsDelta / (live.targetCount / 8 * (shiftMins/60))) * 100) : 100; // Simpele kwaliteits-proxy op basis van target

                return {
                    id: m.id,
                    name: m.name,
                    availability: avail,
                    performance: perf,
                    quality: Math.min(100, qual || 0),
                    oee: (avail * perf * (qual/100)) / 100,
                    operatingHours: opDelta / 60,
                    cuttingHours: cutDelta / 60,
                    partsProduced: partsDelta,
                    waitingForData: false
                };
            } else {
                // WEEK / MONTH weergave op basis van logs
                const days = range === 'WEEK' ? 7 : 30;
                const periodLogs = logs.slice(0, days);
                
                if (periodLogs.length === 0) {
                    return { id: m.id, name: m.name, availability: 0, performance: 0, quality: 0, oee: 0, operatingHours: 0, cuttingHours: 0, partsProduced: 0, waitingForData: true };
                }

                const avgAvail = periodLogs.reduce((acc, l) => acc + (l.availability || 0), 0) / periodLogs.length;
                const avgPerf = periodLogs.reduce((acc, l) => acc + (l.performance || 0), 0) / periodLogs.length;
                const avgQual = periodLogs.reduce((acc, l) => acc + (l.quality || 0), 0) / periodLogs.length;
                const totalOp = periodLogs.reduce((acc, l) => acc + l.operatingMinutes, 0) / 60;
                const totalCut = periodLogs.reduce((acc, l) => acc + l.cuttingMinutes, 0) / 60;
                const totalParts = periodLogs.reduce((acc, l) => acc + l.partsProduced, 0);

                return {
                    id: m.id,
                    name: m.name,
                    availability: avgAvail,
                    performance: avgPerf,
                    quality: avgQual,
                    oee: (avgAvail * avgPerf * (avgQual/100)) / 100,
                    operatingHours: totalOp,
                    cuttingHours: totalCut,
                    partsProduced: totalParts,
                    waitingForData: false
                };
            }
        }) as MachineStats[];

        setStats(newStats);

        // Timeline Genereren op basis van historische logs
        const timeline: TimelinePoint[] = [];
        if (range === 'WEEK') {
            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
            });

            last7Days.forEach(dateStr => {
                const dayLogs = efficiencyLogs.filter(l => l.date === dateStr);
                if (dayLogs.length > 0) {
                    const avgOee = dayLogs.reduce((acc, l) => acc + (l.oee || 0), 0) / dayLogs.length;
                    const avgAvail = dayLogs.reduce((acc, l) => acc + (l.availability || 0), 0) / dayLogs.length;
                    const avgPerf = dayLogs.reduce((acc, l) => acc + (l.performance || 0), 0) / dayLogs.length;
                    timeline.push({ label: dateStr.split('-').slice(1).reverse().join('/'), oee: avgOee, availability: avgAvail, performance: avgPerf });
                }
            });
        }
        setTimelineData(timeline);

    }, [range, selectedAssetId, scheduleFilter, machines, efficiencyLogs, schedules]);

    const overallOEE = stats.length > 0 ? stats.reduce((acc, s) => acc + s.oee, 0) / stats.length : 0;
    const totalProduction = stats.reduce((acc, s) => acc + s.partsProduced, 0);

    const StatIndicator = ({ label, value, icon: Icon, color }: any) => (
        <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity ${color}`}> <Icon size={64} /> </div>
            <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={color} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
                {typeof value === 'number' ? `${value.toFixed(1)}%` : value}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-10 text-left">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
                            <TrendingUp size={28} />
                        </div>
                        OEE Efficiency Dashboard
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Data-driven prestatie analyse op basis van FOCAS telemetrie.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        {['TODAY', 'WEEK', 'MONTH'].map(r => (
                            <button key={r} onClick={() => setRange(r as any)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${range === r ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {r === 'TODAY' ? 'Vandaag' : r === 'WEEK' ? 'Laatste 7 d.' : 'Laatste 30 d.'}
                            </button>
                        ))}
                    </div>
                    <select 
                        value={selectedAssetId} 
                        onChange={e => setSelectedAssetId(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">Alle Assets</option>
                        {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl border border-slate-800 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent"></div>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 relative z-10">Gemiddelde OEE</span>
                    <div className="text-5xl font-black text-white mb-2 relative z-10">{overallOEE.toFixed(1)}<span className="text-xl opacity-40">%</span></div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative z-10">
                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${overallOEE}%` }}></div>
                    </div>
                </div>
                <StatIndicator label="Productie Output" value={totalProduction.toLocaleString() + ' st.'} icon={ShieldCheck} color="text-emerald-500" />
                <StatIndicator label="Spindeluren" value={stats.reduce((acc, s) => acc + s.cuttingHours, 0).toFixed(1) + ' u'} icon={Gauge} color="text-blue-500" />
                <StatIndicator label="Bezetting" value={stats.reduce((acc, s) => acc + s.operatingHours, 0).toFixed(1) + ' u'} icon={Activity} color="text-orange-500" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Asset List with real data components */}
                <div className="xl:col-span-2 space-y-4">
                    {stats.map(s => (
                        <div key={s.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${s.oee > 70 ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                        <Monitor size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white">{s.name}</h3>
                                        <div className="flex gap-3 mt-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Clock size={10}/> {s.cuttingHours.toFixed(1)}u verspaand</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Zap size={10}/> {s.partsProduced} parts</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-slate-800 dark:text-white">{s.oee.toFixed(1)}%</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency</div>
                                </div>
                            </div>

                            {s.waitingForData ? (
                                <div className="py-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                                    <p className="text-xs text-slate-400 italic">Wachten op historische dag-afsluiting data...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase"><span>Availability</span><span>{s.availability.toFixed(0)}%</span></div>
                                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${s.availability}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase"><span>Performance</span><span>{s.performance.toFixed(0)}%</span></div>
                                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${s.performance}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase"><span>Quality</span><span>{s.quality.toFixed(0)}%</span></div>
                                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-500" style={{ width: `${s.quality}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {stats.length === 0 && (
                        <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center">
                            <Monitor size={48} className="text-slate-300 mb-4" />
                            <p className="font-bold text-slate-500">Geen actieve data geselecteerd.</p>
                            <p className="text-xs text-slate-400 mt-1">Vink "Toon in Efficiency Dashboard" aan bij machine-instellingen.</p>
                        </div>
                    )}
                </div>

                {/* Historical Chart */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm h-full flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Activity size={18} className="text-blue-500" /> Trendanalyse
                            </h3>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Afgelopen {range === 'WEEK' ? '7' : '30'} dagen</span>
                        </div>
                        <div className="flex-1 min-h-[300px]">
                            {timelineData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={timelineData}>
                                        <defs>
                                            <linearGradient id="colorOee" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                        <XAxis dataKey="label" stroke="#94a3b8" tick={{fontSize: 10}} />
                                        <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{fontSize: 10}} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9', borderRadius: '12px' }} />
                                        <Area type="monotone" dataKey="oee" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOee)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 opacity-50">
                                    <BarChart2 size={48} className="mb-4" />
                                    <p className="text-sm italic">Geen historische logs<br/>beschikbaar in deze periode.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
