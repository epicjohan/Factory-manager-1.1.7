
import React, { useMemo } from 'react';
import { Machine, MaintenanceTicket, GeneralPart, TicketImpact } from '../types';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, Package, Euro, Activity, ArrowRight, Info, Zap, CheckCircle } from '../icons';
import { Link } from 'react-router-dom';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';

export const ManagerDashboard: React.FC = () => {
    // REACTIVE HOOKS
    const { data: machines } = useTable<Machine>(KEYS.MACHINES);
    const { data: tickets } = useTable<MaintenanceTicket>(KEYS.TICKETS);
    const { data: generalParts } = useTable<GeneralPart>(KEYS.PARTS_GENERAL);

    // Derived State (Calculated automatically when data changes)
    const inventoryValue = useMemo(() => {
        return generalParts.reduce((acc, p) => acc + (p.price * p.stock), 0);
    }, [generalParts]);

    // KPIs
    const totalAssets = machines.length;
    const activeTickets = tickets.filter(t => t.status === 'OPEN');

    // Split tickets
    const criticalTickets = activeTickets.filter(t => t.impact === TicketImpact.CRITICAL);
    const otherTickets = activeTickets.filter(t => t.impact !== TicketImpact.CRITICAL);

    // Calculate Costs YTD
    const currentYear = new Date().getFullYear();
    const ytdTickets = tickets.filter(t => t.status === 'RESOLVED' && t.resolvedDate && new Date(t.resolvedDate).getFullYear() === currentYear);
    const totalCostYTD = ytdTickets.reduce((acc, t) => acc + (t.repairCost || 0), 0);

    // Machine Status Distribution
    const statusCounts = machines.reduce((acc, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const pieData = [
        { name: 'Running', value: statusCounts['RUNNING'] || 0, color: '#10b981' },
        { name: 'Maintenance', value: statusCounts['MAINTENANCE'] || 0, color: '#f97316' },
        { name: 'Error', value: statusCounts['ERROR'] || 0, color: '#ef4444' },
        { name: 'Offline', value: statusCounts['OFFLINE'] || 0, color: '#64748b' }
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 uppercase italic tracking-tighter">
                    <Activity className="text-purple-600" />
                    Manager Dashboard
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 tracking-wide">High-level overzicht van de technische dienst.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Total Assets</span>
                    </div>
                    <div className="text-4xl font-black text-slate-800 dark:text-white">{totalAssets}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                            <AlertTriangle size={24} />
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Open Storingen</span>
                    </div>
                    <div className="text-4xl font-black text-slate-800 dark:text-white">
                        {activeTickets.length} <span className="text-sm font-bold text-slate-400 tracking-widest uppercase">({criticalTickets.length} kritiek)</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <Euro size={24} />
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Kosten YTD</span>
                    </div>
                    <div className="text-4xl font-black text-slate-800 dark:text-white">€ {totalCostYTD.toFixed(0)}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                            <Package size={24} />
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Voorraadwaarde</span>
                    </div>
                    <div className="text-4xl font-black text-slate-800 dark:text-white">€ {inventoryValue.toFixed(0)}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Status Pie (Links) */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-xl font-black mb-6 text-slate-800 dark:text-white uppercase tracking-tight italic">Machine Status Verdeling</h3>
                    <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2 flex-wrap">
                        {pieData.map(p => (
                            <div key={p.name} className="flex items-center gap-2 text-xs">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></span>
                                <span className="text-slate-600 dark:text-slate-400">{p.name} ({p.value})</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Urgent Issues (Rechts) */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-red-200 dark:border-red-900/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <AlertTriangle size={120} className="text-red-500" />
                    </div>
                    <h3 className="text-xl font-black mb-6 text-red-700 dark:text-red-400 flex items-center gap-3 uppercase tracking-tight italic">
                        <Zap size={24} />
                        Urgente Actiepunten
                    </h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {criticalTickets.length > 0 ? (
                            criticalTickets.map(t => (
                                <Link
                                    to={`/machine/${t.machineId}`}
                                    key={t.id}
                                    className="block group p-5 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                                <AlertTriangle className="text-red-600" size={18} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">
                                                    {t.title}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {machines.find(m => m.id === t.machineId)?.name}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    Gemeld: {new Date(t.reportedDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg text-green-700 dark:text-green-300">
                                <CheckCircle size={20} />
                                <span>Geen kritieke storingen momenteel.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Other Issues (Onder) */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-xl font-black mb-6 text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-tight italic">
                    <Info size={24} className="text-blue-500" />
                    Overige Meldingen
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {otherTickets.length > 0 ? (
                        otherTickets.map(t => (
                            <Link
                                to={`/machine/${t.machineId}`}
                                key={t.id}
                                className="block group p-5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/30 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-blue-500 transition-colors">
                                            {t.title}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {machines.find(m => m.id === t.machineId)?.name}
                                        </div>
                                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                            {t.impact === TicketImpact.LOW ? 'Toekomst' : 'Normaal'}
                                        </div>
                                    </div>
                                    <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full py-8 text-center text-slate-400 italic">
                            Geen overige meldingen.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
