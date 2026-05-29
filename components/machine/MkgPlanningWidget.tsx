import React, { useEffect, useState } from 'react';
import { RefreshCw, Calendar, Clock, TrendingUp, Package } from '../../icons';
import { MkgPlncRecord } from '../../types';
import { mkgCapaciteitService } from '../../services/mkg/mkgCapaciteitService';
import { db } from '../../services/storage';

interface WeekRow {
    week: number;
    datum: string;
    geplande_minuten: number;
    bezettingsgraad: number;
    orders: MkgPlncRecord[];
}

export const MkgPlanningWidget: React.FC<{ rsrcNum: number; machineName: string }> = ({ rsrcNum, machineName }) => {
    const [weekRows, setWeekRows] = useState<WeekRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
    const [lastSync, setLastSync] = useState<string>('');

    const load = async () => {
        setLoading(true);
        const rows = await mkgCapaciteitService.getBezettingPerWeek(rsrcNum);
        // Toon huidige week + 7 weken vooruit
        const currentWeek = getCurrentWeek();
        const filtered = rows.filter(r => r.week >= currentWeek && r.week <= currentWeek + 7);
        setWeekRows(filtered);
        setLoading(false);
    };

    useEffect(() => { load(); }, [rsrcNum]);

    const handleSync = async () => {
        setSyncing(true);
        const srv = await db.getServerSettings();
        const result = await mkgCapaciteitService.syncFromMkg(srv.url || window.location.origin);
        if (result.success) {
            setLastSync(new Date().toLocaleTimeString('nl-NL'));
            await load();
        }
        setSyncing(false);
    };

    const getBezettingColor = (pct: number) => {
        if (pct >= 90) return 'bg-red-500';
        if (pct >= 75) return 'bg-orange-400';
        if (pct >= 50) return 'bg-emerald-500';
        return 'bg-blue-400';
    };

    const formatMinutes = (min: number) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return m > 0 ? `${h}u ${m}m` : `${h}u`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                <RefreshCw size={18} className="animate-spin" />
                <span className="text-sm font-bold">MKG planning laden...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={16} className="text-blue-500" />
                        MKG Planning — {machineName}
                    </h4>
                    {lastSync && (
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Laatste sync: {lastSync}</p>
                    )}
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-60"
                >
                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Synchroniseren...' : 'Sync MKG'}
                </button>
            </div>

            {/* Weekoverzicht */}
            {weekRows.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <Calendar size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-bold">Geen planningsdata beschikbaar.</p>
                    <p className="text-xs mt-1">Klik op "Sync MKG" om data op te halen.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {weekRows.map(row => (
                        <div key={row.week} className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {/* Week header — klikbaar voor drill-down */}
                            <button
                                onClick={() => setExpandedWeek(expandedWeek === row.week ? null : row.week)}
                                className="w-full flex items-center gap-4 p-4 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all text-left"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center shrink-0 shadow-md">
                                    <span className="text-[9px] font-black uppercase">Wk</span>
                                    <span className="text-lg font-black leading-none">{row.week}</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                            {row.orders.length} order{row.orders.length !== 1 ? 's' : ''}
                                        </span>
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                            {row.bezettingsgraad}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${getBezettingColor(row.bezettingsgraad)}`}
                                            style={{ width: `${Math.min(row.bezettingsgraad, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                            <Clock size={10} /> {formatMinutes(row.geplande_minuten)}
                                        </span>
                                        {row.datum && (
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {new Date(row.datum).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>

                            {/* Drill-down: orders */}
                            {expandedWeek === row.week && (
                                <div className="border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {row.orders.map((order, idx) => (
                                        <div key={idx} className="flex items-center gap-3 px-4 py-3">
                                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg shrink-0">
                                                <Package size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate font-mono">
                                                    {order.prdh_num || '—'}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    Regel {order.prdr_num} · {order.plnc_forecast ? 'Forecast' : 'Gepland'} · {order.plnc_datum}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                {order.plnc_tijd_bemand_min > 0 && (
                                                    <p className="text-[10px] text-slate-400">
                                                        {formatMinutes(order.plnc_tijd_bemand_min)} bemand
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

function getCurrentWeek(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}
