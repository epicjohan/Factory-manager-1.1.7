
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Monitor, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, CheckCircle2, Play, Calendar, Package, Loader2 } from 'lucide-react';
import { KEYS, loadTable } from '../services/db/core';
import { PlanningTvGroup, MkgPlnbRecord } from '../types';
import { Machine } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getCurrentWeek = (): number => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
};

const getWeekDateRange = (): string => {
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
    return `${fmt(monday)} — ${fmt(sunday)}`;
};

type OrderStatus = 'GEREED' | 'ACTIEF' | 'ACHTERSTAND' | 'GEPLAND';

const getStatus = (r: MkgPlnbRecord): OrderStatus => {
    if (r.plnb_gereed) return 'GEREED';
    if (r.plnb_gestart) return 'ACTIEF';
    const today = new Date().toISOString().split('T')[0];
    if (r.plnb_dat_eind && r.plnb_dat_eind < today && !r.plnb_gereed) return 'ACHTERSTAND';
    return 'GEPLAND';
};

const STATUS_CONFIG: Record<OrderStatus, { bg: string; border: string; text: string; label: string; dot: string; glow: string }> = {
    GEREED:      { bg: 'bg-emerald-500/15', border: 'border-emerald-500/20', text: 'text-emerald-400', label: 'GEREED',      dot: 'bg-emerald-400', glow: '' },
    ACTIEF:      { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'ACTIEF',      dot: 'bg-emerald-400', glow: 'shadow-[inset_0_0_30px_rgba(16,185,129,0.15)]' },
    ACHTERSTAND: { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     label: 'ACHTERSTAND', dot: 'bg-red-400',     glow: 'shadow-[inset_0_0_30px_rgba(239,68,68,0.2)]' },
    GEPLAND:     { bg: 'bg-slate-500/10',   border: 'border-slate-600/20',   text: 'text-slate-500',   label: 'GEPLAND',     dot: 'bg-slate-500',   glow: '' },
};

const formatDate = (dateStr: string): string => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' });
    } catch { return dateStr; }
};

const formatMin = (min: number): string => {
    if (min < 60) return `${Math.round(min)}m`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m > 0 ? `${h}u ${m}m` : `${h}u`;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const PlanningTvDashboard: React.FC = () => {
    const { groupId } = useParams<{ groupId: string }>();

    // State
    const [group, setGroup] = useState<PlanningTvGroup | null>(null);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [plnbRecords, setPlnbRecords] = useState<MkgPlnbRecord[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [clock, setClock] = useState(new Date().toLocaleTimeString('nl-NL'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<number>(0);

    const currentWeek = useMemo(() => getCurrentWeek(), []);
    const weekRange = useMemo(() => getWeekDateRange(), []);

    // Load data
    const loadData = useCallback(async () => {
        try {
            const [groups, allMachines, allPlnb] = await Promise.all([
                loadTable<PlanningTvGroup[]>(KEYS.PLANNING_TV_GROUPS, []),
                loadTable<Machine[]>(KEYS.MACHINES, []),
                loadTable<MkgPlnbRecord[]>(KEYS.MKG_PLNB, []),
            ]);

            const found = groups.find(g => g.id === groupId);
            if (!found) { setError('Groep niet gevonden'); setLoading(false); return; }

            setGroup(found);
            const groupMachines = found.machineIds
                .map(id => allMachines.find(m => m.id === id))
                .filter(Boolean) as Machine[];
            setMachines(groupMachines);

            // Filter plnb: huidige week
            const weekRecords = allPlnb.filter(r =>
                r.plnb_wk_start <= currentWeek && r.plnb_wk_eind >= currentWeek
            );
            setPlnbRecords(weekRecords);
            setLoading(false);
        } catch (e) {
            setError('Fout bij laden van data');
            setLoading(false);
        }
    }, [groupId, currentWeek]);

    useEffect(() => { loadData(); }, [loadData]);

    // Auto-refresh every 5 min
    useEffect(() => {
        const iv = setInterval(loadData, 5 * 60 * 1000);
        return () => clearInterval(iv);
    }, [loadData]);

    // Clock
    useEffect(() => {
        const iv = setInterval(() => setClock(new Date().toLocaleTimeString('nl-NL')), 1000);
        return () => clearInterval(iv);
    }, []);

    // Auto-fullscreen
    useEffect(() => {
        if (group?.autoFullscreen && containerRef.current && !document.fullscreenElement) {
            containerRef.current.requestFullscreen?.().catch(() => {});
        }
    }, [group]);

    // Auto-carousel + progress
    useEffect(() => {
        if (!group || machines.length <= 1) return;
        const intervalMs = (group.scrollIntervalSeconds || 15) * 1000;
        const tickMs = 50;
        let elapsed = 0;

        const iv = setInterval(() => {
            elapsed += tickMs;
            setProgress(Math.min((elapsed / intervalMs) * 100, 100));
            if (elapsed >= intervalMs) {
                elapsed = 0;
                setActiveIndex(prev => (prev + 1) % machines.length);
            }
        }, tickMs);

        timerRef.current = iv as any;
        return () => clearInterval(iv);
    }, [group, machines.length]);

    // Reset progress on manual nav
    const goTo = useCallback((idx: number) => {
        setActiveIndex(idx);
        setProgress(0);
        if (timerRef.current) clearInterval(timerRef.current);
        // Restart timer
        if (!group || machines.length <= 1) return;
        const intervalMs = (group.scrollIntervalSeconds || 15) * 1000;
        const tickMs = 50;
        let elapsed = 0;
        const iv = setInterval(() => {
            elapsed += tickMs;
            setProgress(Math.min((elapsed / intervalMs) * 100, 100));
            if (elapsed >= intervalMs) {
                elapsed = 0;
                setActiveIndex(prev => (prev + 1) % machines.length);
            }
        }, tickMs);
        timerRef.current = iv as any;
    }, [group, machines.length]);

    const goPrev = useCallback(() => goTo((activeIndex - 1 + machines.length) % machines.length), [activeIndex, machines.length, goTo]);
    const goNext = useCallback(() => goTo((activeIndex + 1) % machines.length), [activeIndex, machines.length, goTo]);

    // Derive records for active machine
    const activeMachine = machines[activeIndex];
    const machineRecords = useMemo(() => {
        if (!activeMachine) return [];
        const machNr = parseInt(activeMachine.machineNumber);
        return plnbRecords
            .filter(r => r.rsrc_num === machNr && !r.plnb_gereed) // Gereedgemelde orders verbergen
            .sort((a, b) => (a.plnb_volgorde || 0) - (b.plnb_volgorde || 0));
    }, [activeMachine, plnbRecords]);

    const capacityMin = 40 * 60; // 40h per week
    const totalDuurMin = useMemo(() => machineRecords.reduce((s, r) => s + (r.plnb_duur_min || 0), 0), [machineRecords]);
    const capacityPct = Math.min(Math.round((totalDuurMin / capacityMin) * 100), 150);

    const statusCounts = useMemo(() => {
        const counts = { GEREED: 0, ACTIEF: 0, ACHTERSTAND: 0, GEPLAND: 0 };
        machineRecords.forEach(r => counts[getStatus(r)]++);
        return counts;
    }, [machineRecords]);

    // ─── Render ──────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 bg-[#020617] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={48} className="text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-xl font-bold">Planning laden...</p>
                </div>
            </div>
        );
    }

    if (error || !group) {
        return (
            <div className="fixed inset-0 z-50 bg-[#020617] flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
                    <p className="text-white text-2xl font-bold mb-2">{error || 'Groep niet gevonden'}</p>
                    <p className="text-slate-400">Controleer de URL of maak een groep aan in het admin dashboard.</p>
                </div>
            </div>
        );
    }

    if (machines.length === 0) {
        return (
            <div className="fixed inset-0 z-50 bg-[#020617] flex items-center justify-center">
                <div className="text-center">
                    <Monitor size={48} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-white text-2xl font-bold mb-2">Geen machines geconfigureerd</p>
                    <p className="text-slate-400">Voeg machines toe aan groep "{group.name}" in het admin dashboard.</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="fixed inset-0 z-50 bg-[#020617] text-white flex flex-col select-none overflow-hidden">

            {/* ── HEADER ── */}
            <header className="flex items-center justify-between px-8 py-5 border-b border-slate-800/80 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <Calendar size={28} className="text-blue-500" />
                        <div>
                            <h1 className="text-4xl font-black tracking-tight">WEEK {currentWeek}</h1>
                            <p className="text-sm text-slate-500 font-bold tracking-wider uppercase">{weekRange}</p>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-4xl font-black uppercase tracking-[0.2em] text-slate-300">{group.name}</h2>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-4xl font-mono font-black text-slate-200 tabular-nums">{clock}</p>
                        <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">
                            Machine {activeIndex + 1} / {machines.length}
                        </p>
                    </div>
                </div>
            </header>

            {/* ── MACHINE CONTENT ── */}
            <main className="flex-1 flex flex-col px-8 py-6 min-h-0 overflow-hidden">

                {/* Machine header + capacity */}
                <div className="flex items-start justify-between mb-6 shrink-0">
                    <div>
                        <h3 className="text-5xl font-black tracking-tight text-white">
                            {activeMachine.machineNumber} — {activeMachine.name}
                        </h3>
                        <div className="flex items-center gap-4 mt-2">
                            {Object.entries(statusCounts).filter(([, c]) => c > 0).map(([status, count]) => {
                                const cfg = STATUS_CONFIG[status as OrderStatus];
                                return (
                                    <span key={status} className={`flex items-center gap-1.5 text-sm font-bold ${cfg.text}`}>
                                        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                                        {count} {cfg.label}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <div className="text-right shrink-0 min-w-[200px]">
                        <div className="flex items-center justify-end gap-2 mb-1">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Capaciteit</span>
                            <span className={`text-3xl font-black ${capacityPct > 100 ? 'text-red-400' : capacityPct > 80 ? 'text-amber-400' : 'text-blue-400'}`}>
                                {capacityPct}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${capacityPct > 100 ? 'bg-red-500' : capacityPct > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(capacityPct, 100)}%` }}
                            />
                        </div>
                        <p className="text-sm text-slate-500 font-bold mt-1 font-mono">
                            {formatMin(totalDuurMin)} / {formatMin(capacityMin)}
                        </p>
                    </div>
                </div>

                {/* Order table */}
                <div className="flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-900/50">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                            <tr className="border-b border-slate-700/50">
                                {['ORDER NR', 'ARTIKEL', 'TEKENING', 'OMSCHRIJVING', 'BEW.', 'START', 'INSTEL', 'STUKS', 'TIJD/STUK', 'TOTAAL', 'STATUS'].map(h => (
                                    <th key={h} className="px-4 py-3.5 text-left text-[14px] font-black text-slate-500 uppercase tracking-[0.15em]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {machineRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="text-center py-20 text-slate-600">
                                        <Package size={40} className="mx-auto mb-3 opacity-40" />
                                        <p className="text-xl font-bold">Geen orders gepland voor deze week</p>
                                    </td>
                                </tr>
                            ) : (
                                machineRecords.map((r, idx) => {
                                    const status = getStatus(r);
                                    const cfg = STATUS_CONFIG[status];
                                    return (
                                        <tr key={r.id || idx} className={`border-b border-slate-800/50 ${cfg.bg} ${cfg.glow} transition-colors`}>
                                            <td className="px-4 py-4 text-xl font-bold font-mono text-slate-200">{r.prdh_num || '—'}</td>
                                            <td className="px-4 py-4 text-base font-mono text-slate-400">{r.arti_code || '—'}</td>
                                            <td className="px-4 py-4 text-base font-mono text-slate-400">{r.arti_tek_num || '—'}</td>
                                            <td className="px-4 py-4 text-base text-slate-300 max-w-[360px] truncate">{r.arti_oms1 || '—'}</td>
                                            <td className="px-4 py-4 text-base font-mono text-slate-400">{r.bwrk_num || '—'}</td>
                                            <td className="px-4 py-4 text-base font-mono text-slate-400">{formatDate(r.plnb_dat_start)}</td>
                                            <td className="px-4 py-4 text-base font-bold text-slate-300">{r.plnb_instel_min ? `${Math.round(r.plnb_instel_min)}m` : '—'}</td>
                                            <td className="px-4 py-4 text-base font-bold text-slate-200">
                                                {r.plnb_aantal_grd > 0 ? (
                                                    <span><span className="text-emerald-400">{r.plnb_aantal_grd}</span>/{r.plnb_aantal}</span>
                                                ) : (
                                                    <span>{r.plnb_aantal || '—'}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-base font-mono text-slate-400">
                                                {r.plnb_tijd_per_stuk ? `${(r.plnb_tijd_per_stuk / 60).toFixed(1)}m` : '—'}
                                            </td>
                                            <td className="px-4 py-4 text-base font-bold text-slate-200">
                                                {r.plnb_duur_min ? formatMin(r.plnb_duur_min) : '—'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black uppercase tracking-wider ${cfg.bg} ${cfg.border} border ${cfg.text}`}>
                                                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                                    {cfg.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* ── FOOTER ── */}
            <footer className="flex items-center justify-between px-8 py-4 border-t border-slate-800/80 shrink-0">
                {/* Navigation arrows + dots */}
                <div className="flex items-center gap-4">
                    {machines.length > 1 && (
                        <>
                            <button onClick={goPrev} className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors">
                                <ChevronLeft size={20} className="text-slate-400" />
                            </button>
                            <div className="flex items-center gap-2">
                                {machines.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => goTo(i)}
                                        className={`w-3 h-3 rounded-full transition-all duration-300 ${i === activeIndex ? 'bg-blue-500 scale-125' : 'bg-slate-700 hover:bg-slate-600'}`}
                                    />
                                ))}
                            </div>
                            <button onClick={goNext} className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors">
                                <ChevronRight size={20} className="text-slate-400" />
                            </button>
                        </>
                    )}
                </div>

                {/* Progress bar */}
                {machines.length > 1 && (
                    <div className="flex-1 max-w-md mx-8">
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full bg-blue-500/60 rounded-full transition-[width] duration-[50ms] ease-linear"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Timer label */}
                <div className="flex items-center gap-2 text-slate-600">
                    <RefreshCw size={14} />
                    <span className="text-xs font-bold uppercase tracking-widest">
                        Auto-scroll: {group.scrollIntervalSeconds || 15}s
                    </span>
                </div>
            </footer>
        </div>
    );
};
