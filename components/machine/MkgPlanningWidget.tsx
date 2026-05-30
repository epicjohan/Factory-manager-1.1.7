/**
 * MkgPlanningWidget — Capaciteitsoverzicht per machine (resource) vanuit MKG.
 *
 * Toont:
 *  - Staafdiagram per week: rood gearceerd = achterstand, blauw = toekomst
 *  - Capaciteitslijn (horizontale streep op beschikbare uren per week)
 *  - Filteropties: aantal weken achteruit + vooruit
 *  - Detail-tabel bij klik op een week: alle orders van die week
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ReferenceLine, ResponsiveContainer, Cell
} from 'recharts';
import { RefreshCw, Calendar, Clock, TrendingUp, AlertTriangle } from '../../icons';
import { MkgPlncRecord } from '../../types';
import { mkgCapaciteitService } from '../../services/mkg/mkgCapaciteitService';
import { db } from '../../services/storage';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function currentWeekNum(): number { return getISOWeek(new Date()); }

function minutesToHours(min: number): number { return Math.round((min / 60) * 10) / 10; }

function formatHours(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${h}:00`;
}

function weekLabel(week: number): string { return `Wk ${week}`; }

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeekData {
    week: number;
    label: string;
    totalMin: number;
    totalH: number;
    bemandMin: number;
    bemandH: number;
    onbemandMin: number;
    onbemandH: number;
    isBacklog: boolean;
    orders: MkgPlncRecord[];
}

interface Props {
    rsrcNum: number;
    machineName: string;
    /** Beschikbare uren per week (default 40) */
    capacityHoursPerWeek?: number;
}

// ─── Custom Bar met arcering voor achterstand ─────────────────────────────────

const BacklogBar = (props: any) => {
    const { x, y, width, height, fill } = props;
    if (!height || height <= 0) return null;
    const id = `hatch-${x}`;
    return (
        <g>
            <defs>
                <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="8" stroke={fill} strokeWidth="4" opacity="0.7" />
                </pattern>
            </defs>
            <rect x={x} y={y} width={width} height={height} fill={`url(#${id})`} rx={3} />
            <rect x={x} y={y} width={width} height={height} fill="none" stroke={fill} strokeWidth="1.5" rx={3} />
        </g>
    );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, capacityMin }: any) => {
    if (!active || !payload?.length) return null;
    const data: WeekData = payload[0]?.payload;
    const pct = capacityMin > 0 ? Math.round((data.totalMin / capacityMin) * 100) : 0;
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl p-3 min-w-[180px]">
            <p className="text-xs font-black text-slate-800 dark:text-white mb-1">{label}</p>
            <p className="text-sm font-black" style={{ color: data.isBacklog ? '#ef4444' : '#3b82f6' }}>
                {formatHours(data.totalMin)}u totaal
            </p>
            <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                <p>👤 Bemand: {formatHours(data.bemandMin)}u</p>
                <p>⚙ Onbemand: {formatHours(data.onbemandMin)}u</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{data.orders.length} orders · {pct}% bezetting</p>
            {data.isBacklog && (
                <p className="text-[10px] text-red-400 font-bold mt-1">⚠ Achterstand</p>
            )}
        </div>
    );
};

// ─── Hoofd component ──────────────────────────────────────────────────────────

export const MkgPlanningWidget: React.FC<Props> = ({
    rsrcNum,
    machineName,
    capacityHoursPerWeek = 40,
}) => {
    const [allRecords, setAllRecords] = useState<MkgPlncRecord[]>([]);
    const [loading, setLoading]       = useState(true);
    const [syncing, setSyncing]       = useState(false);
    const [lastSync, setLastSync]     = useState('');
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

    // Filterinstellingen
    const [weeksBack, setWeeksBack]   = useState(2);
    const [weeksAhead, setWeeksAhead] = useState(8);

    const capacityMin = capacityHoursPerWeek * 60;
    const now = currentWeekNum();

    // ── Data laden ────────────────────────────────────────────────────────────
    const load = async () => {
        setLoading(true);
        const records = await mkgCapaciteitService.getRecordsForResource(rsrcNum);
        setAllRecords(records);
        setLoading(false);
    };

    useEffect(() => { load(); }, [rsrcNum]);

    // ── Data aggregeren per week ──────────────────────────────────────────────
    const weekData = useMemo((): WeekData[] => {
        const fromWeek = now - weeksBack;
        const toWeek   = now + weeksAhead;
        const map = new Map<number, MkgPlncRecord[]>();

        // Initialiseer alle weken (ook lege)
        for (let w = fromWeek; w <= toWeek; w++) map.set(w, []);

        // Vul met records
        for (const r of allRecords) {
            if (r.plnc_week >= fromWeek && r.plnc_week <= toWeek) {
                map.get(r.plnc_week)!.push(r);
            }
        }

        return Array.from(map.entries())
            .sort(([a], [b]) => a - b)
            .map(([week, orders]) => {
                const bemandMin = orders.reduce((s, r) => s + (r.plnc_tijd_bemand_min ?? 0), 0);
                const onbemandMin = orders.reduce((s, r) => s + (r.plnc_tijd_min ?? 0), 0);
                const totalMin = bemandMin + onbemandMin;
                return {
                    week,
                    label: weekLabel(week),
                    totalMin,
                    totalH: minutesToHours(totalMin),
                    bemandMin,
                    bemandH: minutesToHours(bemandMin),
                    onbemandMin,
                    onbemandH: minutesToHours(onbemandMin),
                    isBacklog: week < now,
                    orders,
                };
            });
    }, [allRecords, now, weeksBack, weeksAhead]);

    // Geselecteerde week data
    const selectedData = useMemo(
        () => weekData.find(w => w.week === selectedWeek) ?? null,
        [weekData, selectedWeek]
    );

    // Statistieken
    const backlogMin = useMemo(
        () => weekData.filter(w => w.isBacklog).reduce((s, w) => s + w.totalMin, 0),
        [weekData]
    );
    const maxH = useMemo(
        () => Math.max(...weekData.map(w => w.totalH), capacityHoursPerWeek * 1.2),
        [weekData, capacityHoursPerWeek]
    );

    // ── Sync ─────────────────────────────────────────────────────────────────
    const [syncError, setSyncError] = useState('');

    const handleSync = async () => {
        setSyncing(true);
        setSyncError('');
        try {
            const srv = await db.getServerSettings();
            const pbUrl = srv.url || window.location.origin;
            console.log('[MkgPlanning] Sync naar PocketBase:', pbUrl);

            const result = await mkgCapaciteitService.syncFromMkg(pbUrl);
            console.log('[MkgPlanning] Sync resultaat:', result);

            if (result.success) {
                setLastSync(new Date().toLocaleTimeString('nl-NL'));
                setSyncError('');
                await load();
            } else {
                setSyncError(result.message || 'Sync mislukt');
            }
        } catch (err) {
            console.error('[MkgPlanning] Sync fout:', err);
            setSyncError(String(err));
        } finally {
            setSyncing(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
                <RefreshCw size={18} className="animate-spin" />
                <span className="text-sm font-bold">MKG planning laden...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-500" />
                        Resource — {machineName} ({rsrcNum})
                    </h4>
                    {lastSync && (
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Laatste sync: {lastSync}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Filter: weken terug */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Terug</span>
                        {[1, 2, 4].map(n => (
                            <button key={n}
                                onClick={() => setWeeksBack(n)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all
                                    ${weeksBack === n
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >{n}w</button>
                        ))}
                    </div>
                    {/* Filter: weken vooruit */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Vooruit</span>
                        {[4, 8, 12, 16].map(n => (
                            <button key={n}
                                onClick={() => setWeeksAhead(n)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all
                                    ${weeksAhead === n
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >{n}w</button>
                        ))}
                    </div>
                    {/* Sync knop */}
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-60"
                    >
                        <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Sync...' : 'Sync MKG'}
                    </button>
                </div>
            </div>

            {/* ── Sync foutmelding ── */}
            {syncError && (
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-2xl px-4 py-3">
                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-red-700 dark:text-red-400">Sync fout</p>
                        <p className="text-[10px] text-red-500/70 mt-0.5 break-all">{syncError}</p>
                    </div>
                    <button onClick={() => setSyncError('')} className="text-red-400 hover:text-red-600 text-lg font-bold shrink-0">×</button>
                </div>
            )}
            {/* ── KPI-balk ── */}
            {backlogMin > 0 && (
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-2xl px-4 py-3">
                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                    <div>
                        <p className="text-xs font-black text-red-700 dark:text-red-400">
                            Achterstand: {formatHours(backlogMin)}u over {weekData.filter(w => w.isBacklog && w.totalMin > 0).length} weken
                        </p>
                        <p className="text-[10px] text-red-500/70 mt-0.5">Klik op een rode week voor detail</p>
                    </div>
                </div>
            )}

            {/* ── Staafdiagram ── */}
            {weekData.length === 0 ? (
                <div className="text-center py-14 text-slate-400">
                    <Calendar size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-bold">Geen planningsdata beschikbaar.</p>
                    <p className="text-xs mt-1">Klik op "Sync MKG" om data op te halen.</p>
                </div>
            ) : (
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                            data={weekData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            onClick={(e) => {
                                if (e?.activePayload?.[0]) {
                                    const w = (e.activePayload[0].payload as WeekData).week;
                                    setSelectedWeek(prev => prev === w ? null : w);
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={v => `${v}u`}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                domain={[0, Math.ceil(maxH)]}
                            />
                            <Tooltip
                                content={<CustomTooltip capacityMin={capacityMin} />}
                                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                            />
                            {/* Capaciteitslijn */}
                            <ReferenceLine
                                y={capacityHoursPerWeek}
                                stroke="#94a3b8"
                                strokeDasharray="6 3"
                                strokeWidth={1.5}
                                label={{ value: `${capacityHoursPerWeek}u`, position: 'right', fontSize: 9, fill: '#94a3b8' }}
                            />
                            {/* Huidige week indicator */}
                            <ReferenceLine
                                x={weekLabel(now)}
                                stroke="#3b82f6"
                                strokeDasharray="4 3"
                                strokeWidth={1}
                            />
                            <Bar
                                dataKey="totalH"
                                maxBarSize={48}
                                radius={[4, 4, 0, 0]}
                                cursor="pointer"
                            >
                                {weekData.map((entry) => {
                                    const isSelected = selectedWeek === entry.week;
                                    if (entry.isBacklog) {
                                        return (
                                            <Cell
                                                key={entry.week}
                                                fill="#ef4444"
                                                opacity={isSelected ? 1 : 0.85}
                                                stroke={isSelected ? '#b91c1c' : 'none'}
                                                strokeWidth={isSelected ? 2 : 0}
                                            />
                                        );
                                    }
                                    return (
                                        <Cell
                                            key={entry.week}
                                            fill={isSelected ? '#1d4ed8' : '#3b82f6'}
                                            opacity={isSelected ? 1 : 0.85}
                                        />
                                    );
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Legenda */}
                    <div className="flex items-center gap-4 justify-center mt-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-red-500 opacity-80" />
                            <span className="text-[10px] font-bold text-slate-400">Achterstand</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-blue-500 opacity-80" />
                            <span className="text-[10px] font-bold text-slate-400">Gepland</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-6 border-t border-dashed border-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400">Capaciteit ({capacityHoursPerWeek}u)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Detail tabel geselecteerde week ── */}
            {selectedData && (
                <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Tabel header */}
                    <div className={`px-5 py-3 flex items-center justify-between
                        ${selectedData.isBacklog
                            ? 'bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-700/50'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700/50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex flex-col items-center justify-center text-white shrink-0
                                ${selectedData.isBacklog ? 'bg-red-500' : 'bg-blue-600'}`}>
                                <span className="text-[7px] font-black uppercase leading-none">Wk</span>
                                <span className="text-sm font-black leading-none">{selectedData.week}</span>
                            </div>
                            <div>
                                <p className={`text-xs font-black ${selectedData.isBacklog ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>
                                    {selectedData.isBacklog ? '⚠ Achterstand' : 'Planning'} — Week {selectedData.week}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                    {selectedData.orders.length} orders · 👤 {formatHours(selectedData.bemandMin)}u bemand · ⚙ {formatHours(selectedData.onbemandMin)}u onbemand
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedWeek(null)}
                            className="text-slate-400 hover:text-slate-600 text-lg leading-none font-bold"
                        >×</button>
                    </div>

                    {/* Tabel */}
                    {selectedData.orders.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-8 font-bold">Geen orders in deze week</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-4 py-2.5 text-left font-black text-[10px] text-slate-500 uppercase tracking-wider">Productieorder</th>
                                        <th className="px-4 py-2.5 text-left font-black text-[10px] text-slate-500 uppercase tracking-wider">Startdatum</th>
                                        <th className="px-4 py-2.5 text-left font-black text-[10px] text-slate-500 uppercase tracking-wider">Regel</th>
                                        <th className="px-4 py-2.5 text-right font-black text-[10px] text-slate-500 uppercase tracking-wider">👤 Bemand</th>
                                        <th className="px-4 py-2.5 text-right font-black text-[10px] text-slate-500 uppercase tracking-wider">⚙ Onbemand</th>
                                        <th className="px-4 py-2.5 text-center font-black text-[10px] text-slate-500 uppercase tracking-wider">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {selectedData.orders
                                        .sort((a, b) => a.plnc_datum.localeCompare(b.plnc_datum))
                                        .map((order, i) => (
                                        <tr key={order.id ?? i}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <td className="px-4 py-2.5">
                                                <span className="font-black text-slate-800 dark:text-white font-mono">
                                                    {order.prdh_num || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-500 font-bold">
                                                {order.plnc_datum
                                                    ? new Date(order.plnc_datum).toLocaleDateString('nl-NL', {
                                                        weekday: 'short', day: '2-digit', month: 'short'
                                                    })
                                                    : '—'
                                                }
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-500">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-lg font-bold">
                                                    #{order.prdr_num}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <span className={`font-black tabular-nums
                                                    ${order.plnc_tijd_bemand_min > 0
                                                        ? 'text-slate-800 dark:text-white'
                                                        : 'text-slate-300'}`}
                                                >
                                                    {order.plnc_tijd_bemand_min > 0
                                                        ? formatHours(order.plnc_tijd_bemand_min)
                                                        : '—'
                                                    }
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <span className={`font-black tabular-nums
                                                    ${(order.plnc_tijd_min ?? 0) > 0
                                                        ? 'text-slate-600 dark:text-slate-300'
                                                        : 'text-slate-300'}`}
                                                >
                                                    {(order.plnc_tijd_min ?? 0) > 0
                                                        ? formatHours(order.plnc_tijd_min ?? 0)
                                                        : '—'
                                                    }
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                {order.plnc_forecast ? (
                                                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-[9px] font-black uppercase">Forecast</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase">Gepland</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {/* Totaalregel */}
                                <tfoot>
                                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-700">
                                        <td colSpan={3} className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase">
                                            Totaal {selectedData.orders.length} orders
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-black text-slate-800 dark:text-white tabular-nums">
                                            {formatHours(selectedData.bemandMin)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-black text-slate-600 dark:text-slate-300 tabular-nums">
                                            {formatHours(selectedData.onbemandMin)}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500">
                                            {capacityMin > 0 ? `${Math.round((selectedData.totalMin / capacityMin) * 100)}%` : ''}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
