/**
 * MkgPlanningWidget — Inklapbare weekweergave van MKG plnb bewerkingen per resource.
 * Toont per week: totaaluren (dicht) en tijdlijnbalkjes + ordertabel (open).
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ChevronDown, ChevronRight, AlertTriangle, Clock, Wrench, User, Settings, Package, ExternalLink, Briefcase, PlayCircle, CheckCircle2, Play, Loader2, X } from 'lucide-react';
import { MkgPlnbRecord, Article } from '../../types';
import { mkgCapaciteitService } from '../../services/mkg/mkgCapaciteitService';
import { db } from '../../services/storage';
import { MkgBomImportModal } from './MkgBomImportModal';

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
    rsrcNum: number;
    machineName: string;
    machineId?: string;
    capacityHoursPerWeek?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currentWeekNum = (): number => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    return Math.ceil((diff / (1000 * 60 * 60 * 24 * 7)) + 1);
};

const formatMinutes = (min: number): string => {
    if (min <= 0) return '0:00';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
};

const formatDate = (dateStr: string): string => {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('nl-NL', {
            weekday: 'short', day: '2-digit', month: 'short'
        });
    } catch { return dateStr; }
};

const pct = (a: number, b: number): number => b > 0 ? Math.round((a / b) * 100) : 0;

// ─── Week Data ────────────────────────────────────────────────────────────────

interface WeekGroup {
    week: number;
    label: string;
    records: MkgPlnbRecord[];
    totalDuurMin: number;
    totalInstelMin: number;
    totalBesteedMin: number;
    bemandCount: number;
    onbemandCount: number;
    gestartCount: number;
    isBacklog: boolean;
}

const weekLabel = (week: number): string => `Week ${week}`;

// ─── Component ────────────────────────────────────────────────────────────────

export const MkgPlanningWidget: React.FC<Props> = ({
    rsrcNum,
    machineName,
    machineId,
    capacityHoursPerWeek = 40
}) => {
    const [allRecords, setAllRecords] = useState<MkgPlnbRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncError, setSyncError] = useState('');
    const [lastSync, setLastSync] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // ── Actie modal state ────────────────────────────────────────────────
    const [actionModal, setActionModal] = useState<{
        type: 'start' | 'gereed';
        record: MkgPlnbRecord;
        aantal: number;
        markeerGereed: boolean;
    } | null>(null);
    const [actionError, setActionError] = useState('');

    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

    // ── Import modal state ────────────────────────────────────────────────
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importArtiCode, setImportArtiCode] = useState('');

    // ── Bestaand artikel modal state ──────────────────────────────────────
    const [existingArticle, setExistingArticle] = useState<Article | null>(null);

    const navigate = useNavigate();

    const now = currentWeekNum();
    const capacityMin = capacityHoursPerWeek * 60;

    // ── Data laden ────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        console.log(`[MkgPlanning] Laden plnb voor rsrcNum=${rsrcNum}`);
        const records = await mkgCapaciteitService.getPlnbForResource(rsrcNum);
        console.log(`[MkgPlanning] ${records.length} bewerkingen gevonden`);
        setAllRecords(records);
        setLoading(false);
    }, [rsrcNum]);

    useEffect(() => { load(); }, [load]);

    // ── Sync ──────────────────────────────────────────────────────────────
    const handleSync = async () => {
        setSyncing(true);
        setSyncError('');
        try {
            const srv = await db.getServerSettings();
            const pbUrl = srv.url || window.location.origin;
            console.log(`[MkgPlanning] Sync plnb voor resource ${rsrcNum} naar:`, pbUrl);

            const result = await mkgCapaciteitService.syncPlnbFromMkg(pbUrl, rsrcNum);
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

    // ── Weekgroepen berekenen ──────────────────────────────────────────────
    const weekGroups: WeekGroup[] = useMemo(() => {
        const map = new Map<number, MkgPlnbRecord[]>();
        for (const r of allRecords) {
            const week = r.plnb_wk_start || 0;
            if (week === 0) continue;
            if (!map.has(week)) map.set(week, []);
            map.get(week)!.push(r);
        }

        return Array.from(map.entries())
            .sort(([a], [b]) => a - b)
            .map(([week, records]) => {
                // Sorteer bewerkingen op volgorde, dan datum
                records.sort((a, b) => (a.plnb_volgorde - b.plnb_volgorde) || a.plnb_dat_start.localeCompare(b.plnb_dat_start));

                const totalDuurMin = records.reduce((s, r) => s + r.plnb_duur_min, 0);
                const totalInstelMin = records.reduce((s, r) => s + r.plnb_instel_min, 0);
                const totalBesteedMin = records.reduce((s, r) => s + r.plnb_tijd_besteed_min, 0);

                return {
                    week,
                    label: weekLabel(week),
                    records,
                    totalDuurMin,
                    totalInstelMin,
                    totalBesteedMin,
                    bemandCount: records.filter(r => !r.plnb_onbemand).length,
                    onbemandCount: records.filter(r => r.plnb_onbemand).length,
                    gestartCount: records.filter(r => r.plnb_gestart).length,
                    isBacklog: week < now,
                };
            });
    }, [allRecords, now]);

    // ── KPI's ─────────────────────────────────────────────────────────────
    const kpi = useMemo(() => {
        const totalOpen = allRecords.length;
        const totalDuurMin = allRecords.reduce((s, r) => s + r.plnb_duur_min, 0);
        const achterstand = weekGroups.filter(w => w.isBacklog).reduce((s, w) => s + w.records.length, 0);
        const gestart = allRecords.filter(r => r.plnb_gestart).length;
        return { totalOpen, totalDuurMin, achterstand, gestart };
    }, [allRecords, weekGroups]);

    // ── Toggle week ───────────────────────────────────────────────────────
    const toggleWeek = (week: number) => {
        setExpandedWeeks(prev => {
            const next = new Set(prev);
            if (next.has(week)) next.delete(week);
            else next.add(week);
            return next;
        });
    };

    // ── Artikel klik — check of het bestaat in FM ─────────────────────────
    const handleArticleClick = useCallback(async (artiCode: string) => {
        if (!artiCode) return;
        const articles = await db.getArticles();
        const exists = articles.find(
            a => a.articleCode.toLowerCase() === artiCode.toLowerCase()
        );
        if (exists) {
            // Artikel bestaat al — toon navigatie modal
            setExistingArticle(exists);
        } else {
            // Artikel onbekend — open import modal
            setImportArtiCode(artiCode);
            setImportModalOpen(true);
        }
    }, []);

    // ── Max duur voor bar scaling ──────────────────────────────────────────
    const maxDuurMin = useMemo(() =>
        Math.max(1, ...allRecords.map(r => r.plnb_duur_min)),
    [allRecords]);

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                        MKG Planning — {machineName}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                        Resource {rsrcNum} · {lastSync ? `Laatste sync: ${lastSync}` : 'Nog niet gesynchroniseerd'}
                    </p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-60"
                >
                    <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Sync...' : 'Sync MKG'}
                </button>
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

            {/* ── KPI Balk ── */}
            {allRecords.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiCard icon={<Package size={14} />} label="Openstaand" value={String(kpi.totalOpen)} accent="blue" />
                    <KpiCard icon={<Clock size={14} />} label="Resterend" value={`${formatMinutes(kpi.totalDuurMin)}u`} accent="indigo" />
                    <KpiCard icon={<Wrench size={14} />} label="Gestart" value={String(kpi.gestart)} accent="emerald" />
                    <KpiCard icon={<AlertTriangle size={14} />} label="Achterstand" value={String(kpi.achterstand)} accent={kpi.achterstand > 0 ? 'red' : 'slate'} />
                </div>
            )}

            {/* ── Loading ── */}
            {loading && (
                <div className="text-center py-8 text-slate-400 text-xs">Laden...</div>
            )}

            {/* ── Geen data ── */}
            {!loading && allRecords.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Package size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-bold">Geen bewerkingen gevonden</p>
                    <p className="text-xs mt-1">Klik "Sync MKG" om planning op te halen.</p>
                </div>
            )}

            {/* ── Weekkaarten ── */}
            {weekGroups.map(wg => {
                const isExpanded = expandedWeeks.has(wg.week);
                const bezettingPct = capacityMin > 0 ? pct(wg.totalDuurMin, capacityMin) : 0;

                return (
                    <div key={wg.week} className={`rounded-2xl border transition-all ${
                        wg.isBacklog
                            ? 'border-red-200 dark:border-red-700/50 bg-red-50/50 dark:bg-red-900/10'
                            : wg.week === now
                                ? 'border-blue-300 dark:border-blue-600/50 bg-blue-50/30 dark:bg-blue-900/10 ring-2 ring-blue-400/30'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                    }`}>
                        {/* ── Week header (altijd zichtbaar) ── */}
                        <button
                            onClick={() => toggleWeek(wg.week)}
                            className="w-full flex items-center gap-3 px-5 py-4 text-left group"
                        >
                            {/* Chevron */}
                            <div className="text-slate-400 group-hover:text-blue-500 transition-colors">
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>

                            {/* Week info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-black ${
                                        wg.isBacklog ? 'text-red-600 dark:text-red-400' :
                                        wg.week === now ? 'text-blue-600 dark:text-blue-400' :
                                        'text-slate-800 dark:text-white'
                                    }`}>
                                        {wg.label}
                                    </span>
                                    {wg.isBacklog && (
                                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full text-[9px] font-black uppercase">Achterstand</span>
                                    )}
                                    {wg.week === now && (
                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black uppercase">Huidige week</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {wg.records.length} bewerkingen · 👤 {wg.bemandCount} bemand · ⚙ {wg.onbemandCount} onbemand
                                    {wg.gestartCount > 0 && ` · ▶ ${wg.gestartCount} gestart`}
                                </p>
                            </div>

                            {/* Totaal uren */}
                            <div className="text-right shrink-0">
                                <p className={`text-sm font-black tabular-nums ${
                                    wg.isBacklog ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'
                                }`}>
                                    {formatMinutes(wg.totalDuurMin)}u
                                </p>
                                <p className="text-[10px] text-slate-400 tabular-nums">
                                    {bezettingPct}% bezetting
                                </p>
                            </div>
                        </button>

                        {/* ── Capaciteitsbalk ── */}
                        <div className="px-5 pb-3">
                            <div className="h-2 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        bezettingPct > 100 ? 'bg-red-500' :
                                        bezettingPct > 80 ? 'bg-amber-500' :
                                        wg.isBacklog ? 'bg-red-400' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.min(bezettingPct, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* ── Expanded content ── */}
                        {isExpanded && (
                            <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                                {/* Tijdlijn balkjes */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">Tijdlijn bewerkingen</p>
                                    <div className="space-y-2">
                                        {wg.records.map((r, i) => (
                                            <TimelineBar key={r.id || i} record={r} maxMin={maxDuurMin} now={now} />
                                        ))}
                                    </div>
                                </div>

                                {/* Productieorders tabel */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">Productieorders</p>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                                                    <th className="px-3 py-2 text-left font-black text-[10px] text-slate-500 uppercase">Order</th>
                                                    <th className="px-3 py-2 text-left font-black text-[10px] text-slate-500 uppercase">Artikel</th>
                                                    <th className="px-3 py-2 text-left font-black text-[10px] text-slate-500 uppercase">Tekening</th>
                                                    <th className="px-3 py-2 text-left font-black text-[10px] text-slate-500 uppercase">Omschrijving</th>
                                                    <th className="px-3 py-2 text-left font-black text-[10px] text-slate-500 uppercase">Bewerking</th>
                                                    <th className="px-3 py-2 text-left font-black text-[10px] text-slate-500 uppercase">Start → Eind</th>
                                                    <th className="px-3 py-2 text-right font-black text-[10px] text-slate-500 uppercase">Stuks</th>
                                                    <th className="px-3 py-2 text-right font-black text-[10px] text-slate-500 uppercase">Duur</th>
                                                    <th className="px-3 py-2 text-right font-black text-[10px] text-slate-500 uppercase">Instel</th>
                                                    <th className="px-3 py-2 text-center font-black text-[10px] text-slate-500 uppercase">Type</th>
                                                    <th className="px-3 py-2 text-center font-black text-[10px] text-slate-500 uppercase">Status</th>
                                                    <th className="px-3 py-2 text-center font-black text-[10px] text-slate-500 uppercase">Acties</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {wg.records.map((r, i) => (
                                                    <tr key={r.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="px-3 py-2">
                                                            <span className="font-black text-slate-800 dark:text-white font-mono text-[11px]">
                                                                {r.prdh_num || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {r.arti_code ? (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleArticleClick(r.arti_code); }}
                                                                    className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-800 dark:hover:text-indigo-200 hover:underline transition-colors cursor-pointer"
                                                                    title={`Klik om artikel ${r.arti_code} te openen of importeren`}
                                                                >
                                                                    {r.arti_code}
                                                                </button>
                                                            ) : (
                                                                <span className="font-mono text-[11px] text-slate-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                                                                {r.arti_tek_num || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title={r.arti_oms1}>
                                                            {r.arti_oms1 || '—'}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-[150px] truncate" title={r.plnb_oms}>
                                                            {r.plnb_oms || `Bew. ${r.bwrk_num}`}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-500 text-[10px] whitespace-nowrap">
                                                            {formatDate(r.plnb_dat_start)} → {formatDate(r.plnb_dat_eind)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right tabular-nums">
                                                            <span className="font-bold text-slate-700 dark:text-slate-200">
                                                                {r.plnb_aantal_grd}
                                                            </span>
                                                            <span className="text-slate-400">/{r.plnb_aantal}</span>
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-700 dark:text-slate-200">
                                                            {formatMinutes(r.plnb_duur_min)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                                                            {r.plnb_instel_min > 0 ? formatMinutes(r.plnb_instel_min) : '—'}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            {r.plnb_onbemand ? (
                                                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[9px] font-bold">⚙ Onbemand</span>
                                                            ) : (
                                                                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[9px] font-bold">👤 Bemand</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <StatusBadge record={r} />
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                {!r.plnb_gestart && !r.plnb_gereed && (
                                                                    <button
                                                                        disabled={actionLoading === r.id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActionError('');
                                                                            setActionModal({ type: 'start', record: r, aantal: r.plnb_aantal, markeerGereed: false });
                                                                        }}
                                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-lg text-[9px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                                                        title="Start bewerking in MKG"
                                                                    >
                                                                        {actionLoading === r.id ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                                                                        Start
                                                                    </button>
                                                                )}
                                                                {r.plnb_gestart && !r.plnb_gereed && (
                                                                    <button
                                                                        disabled={actionLoading === r.id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActionError('');
                                                                            setActionModal({ type: 'gereed', record: r, aantal: r.plnb_aantal, markeerGereed: true });
                                                                        }}
                                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg text-[9px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                                                        title="Meld bewerking gereed in MKG"
                                                                    >
                                                                        {actionLoading === r.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                                                                        Gereed
                                                                    </button>
                                                                )}
                                                                {r.plnb_gereed && (
                                                                    <span className="text-[9px] text-slate-400 italic">Afgerond</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-700">
                                                    <td colSpan={7} className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase">
                                                        Totaal {wg.records.length} bewerkingen
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-black text-slate-800 dark:text-white tabular-nums">
                                                        {formatMinutes(wg.totalDuurMin)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-bold text-slate-500 tabular-nums">
                                                        {formatMinutes(wg.totalInstelMin)}
                                                    </td>
                                                    <td colSpan={2}></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* ── Actie Modal (Start / Gereedmeld) ── */}
            {actionModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
                     onClick={() => !actionLoading && setActionModal(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200"
                         onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className={`px-8 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between ${
                            actionModal.type === 'start'
                                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                : 'bg-blue-50 dark:bg-blue-900/20'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${
                                    actionModal.type === 'start'
                                        ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                        : 'bg-blue-100 dark:bg-blue-900/40'
                                }`}>
                                    {actionModal.type === 'start'
                                        ? <Play size={20} className="text-emerald-600 dark:text-emerald-400" />
                                        : <CheckCircle2 size={20} className="text-blue-600 dark:text-blue-400" />
                                    }
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">
                                        {actionModal.type === 'start' ? 'Bewerking Starten' : 'Bewerking Gereedmelden'}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Wordt direct doorgevoerd in MKG
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => !actionLoading && setActionModal(null)}
                                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                disabled={!!actionLoading}
                            >
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-5">
                            {/* Order info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Order nr</p>
                                    <p className="text-lg font-black font-mono text-slate-800 dark:text-white">{actionModal.record.prdh_num}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Artikel</p>
                                    <p className="text-sm font-bold font-mono text-slate-600 dark:text-slate-300">{actionModal.record.arti_code || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bewerking</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{actionModal.record.plnb_oms || `Bew. ${actionModal.record.bwrk_num}`}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Omschrijving</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate" title={actionModal.record.arti_oms1}>{actionModal.record.arti_oms1 || '—'}</p>
                                </div>
                            </div>

                            {/* Aantal invoer (alleen bij gereedmelden) */}
                            {actionModal.type === 'gereed' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">
                                        Aantal gereed
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min={0}
                                            max={actionModal.record.plnb_aantal * 2}
                                            value={actionModal.aantal}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                setActionModal(prev => prev ? {
                                                    ...prev,
                                                    aantal: val,
                                                    markeerGereed: val >= prev.record.plnb_aantal
                                                } : null);
                                            }}
                                            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center"
                                        />
                                        <span className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                            van {actionModal.record.plnb_aantal}
                                        </span>
                                    </div>
                                    {actionModal.record.plnb_aantal_grd > 0 && (
                                        <p className="text-[10px] text-slate-400 mt-1.5">
                                            Reeds gereed gemeld: <span className="font-bold text-emerald-500">{actionModal.record.plnb_aantal_grd}</span>
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Gereed checkbox */}
                            {actionModal.type === 'gereed' && (
                                <div
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                                        actionModal.markeerGereed
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                                            : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700'
                                    }`}
                                    onClick={() => setActionModal(prev => prev ? { ...prev, markeerGereed: !prev.markeerGereed } : null)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={actionModal.markeerGereed}
                                        readOnly
                                        className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold ${
                                            actionModal.markeerGereed
                                                ? 'text-emerald-700 dark:text-emerald-300'
                                                : 'text-amber-700 dark:text-amber-300'
                                        }`}>
                                            Bewerking gereed melden
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            {actionModal.markeerGereed
                                                ? 'De bewerking wordt als afgerond gemarkeerd in MKG.'
                                                : 'Alleen het aantal wordt bijgewerkt — de bewerking blijft open.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Start info */}
                            {actionModal.type === 'start' && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3">
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                        <span className="font-bold">Startdatum:</span> {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                    </p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                        Aantal stuks: <span className="font-bold">{actionModal.record.plnb_aantal}</span>
                                    </p>
                                </div>
                            )}

                            {/* Error */}
                            {actionError && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3">
                                    <p className="text-xs text-red-600 dark:text-red-400 font-bold">{actionError}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setActionModal(null)}
                                disabled={!!actionLoading}
                                className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Annuleren
                            </button>
                            <button
                                disabled={!!actionLoading}
                                onClick={async () => {
                                    const rec = actionModal.record;
                                    setActionLoading(rec.id);
                                    setActionError('');
                                    try {
                                        const srv = await db.getServerSettings();
                                        const pbUrl = srv.url || window.location.origin;
                                        let result;
                                        if (actionModal.type === 'start') {
                                            result = await mkgCapaciteitService.startBewerking(pbUrl, rec);
                                        } else {
                                            result = await mkgCapaciteitService.gereedmeldBewerking(pbUrl, rec, actionModal.aantal, actionModal.markeerGereed);
                                        }
                                        if (result.success) {
                                            setActionModal(null);
                                            load();
                                        } else {
                                            setActionError(result.message);
                                        }
                                    } catch (err) {
                                        setActionError(String(err));
                                    } finally {
                                        setActionLoading(null);
                                    }
                                }}
                                className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white rounded-xl transition-colors shadow-sm ${
                                    actionModal.type === 'start'
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                } disabled:opacity-50`}
                            >
                                {actionLoading ? (
                                    <><Loader2 size={14} className="animate-spin" /> Verwerken...</>
                                ) : actionModal.type === 'start' ? (
                                    <><Play size={14} /> Bewerking Starten</>
                                ) : (
                                    <><CheckCircle2 size={14} /> Gereedmelden</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Import Modal ── */}
            <MkgBomImportModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                artiCode={importArtiCode}
                onImportComplete={() => {
                    setImportModalOpen(false);
                    load(); // Herlaad data
                }}
            />

            {/* ── Bestaand Artikel Modal ── */}
            {existingArticle && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl">
                                    <Package size={24} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">Artikel Bekend</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Dit artikel bestaat al in Factory Manager</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 mb-6 border border-slate-200 dark:border-slate-700">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Artikelcode</p>
                                        <p className="font-mono font-bold text-blue-600 dark:text-blue-400">{existingArticle.articleCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Revisie</p>
                                        <p className="font-bold text-slate-700 dark:text-slate-200">{existingArticle.revision || 'A'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Naam</p>
                                        <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{existingArticle.name || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</p>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                            existingArticle.status === 'LOCKED' 
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                                                : existingArticle.status === 'OBSOLETE'
                                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                        }`}>
                                            {existingArticle.status || 'DRAFT'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bewerkingen</p>
                                        <p className="font-bold text-slate-700 dark:text-slate-200">{existingArticle.operations?.length || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Wat wil je doen met dit artikel?</p>
                                <button
                                    onClick={() => {
                                        const articleId = existingArticle.id;
                                        setExistingArticle(null);
                                        navigate(`/articles?id=${articleId}`);
                                    }}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-500/25 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <Settings size={18} />
                                    Ga naar Setup Module
                                </button>
                                {machineId && (
                                    <button
                                        onClick={() => {
                                            setExistingArticle(null);
                                            navigate(`/production/machine/${machineId}`);
                                        }}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-500/25 transition-all active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <PlayCircle size={18} />
                                        Opstarten in Werkorder Dashboard
                                    </button>
                                )}
                                <button
                                    onClick={() => setExistingArticle(null)}
                                    className="w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 rounded-xl font-bold transition-colors text-sm"
                                >
                                    Sluiten
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Sub-componenten ──────────────────────────────────────────────────────────

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: string; accent: string }> = ({ icon, label, value, accent }) => {
    const colors: Record<string, string> = {
        blue:    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
        indigo:  'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
        red:     'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50',
        slate:   'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    };
    return (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${colors[accent] || colors.slate}`}>
            <div className="opacity-60">{icon}</div>
            <div>
                <p className="text-lg font-black tabular-nums leading-tight">{value}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</p>
            </div>
        </div>
    );
};

const TimelineBar: React.FC<{ record: MkgPlnbRecord; maxMin: number; now: number }> = ({ record, maxMin, now }) => {
    const totalMin = record.plnb_duur_min; // Bevat al instel + productie
    const barWidth = Math.max(5, pct(totalMin, maxMin));
    const voortgang = pct(record.plnb_aantal_grd, record.plnb_aantal);
    const isAchterstand = record.plnb_wk_eind < now && !record.plnb_gereed;

    const barColor = record.plnb_gestart
        ? 'bg-emerald-500'
        : isAchterstand
            ? 'bg-red-500'
            : record.plnb_forecast
                ? 'bg-amber-400'
                : 'bg-blue-500';

    return (
        <div className="flex items-center gap-3 group">
            {/* Order + bewerking label */}
            <div className="w-[180px] shrink-0 truncate">
                <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-200">{record.prdh_num}</span>
                <span className="text-[10px] text-slate-400 ml-1.5 truncate">{record.plnb_oms || `Bew.${record.bwrk_num}`}</span>
            </div>

            {/* Bar */}
            <div className="flex-1 min-w-0">
                <div className="h-5 bg-slate-100 dark:bg-slate-700/40 rounded-lg overflow-hidden relative">
                    {/* Insteltijd (donkerder deel links) */}
                    {record.plnb_instel_min > 0 && (
                        <div
                            className={`absolute left-0 top-0 h-full ${barColor} opacity-50 rounded-l-lg`}
                            style={{ width: `${pct(record.plnb_instel_min, maxMin)}%` }}
                        />
                    )}
                    {/* Duur balk */}
                    <div
                        className={`h-full ${barColor} rounded-lg relative`}
                        style={{ width: `${barWidth}%` }}
                    >
                        {/* Voortgangsindicator */}
                        {voortgang > 0 && voortgang < 100 && (
                            <div
                                className="absolute right-0 top-0 h-full bg-white/30 rounded-r-lg"
                                style={{ width: `${100 - voortgang}%` }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Duur tekst */}
            <div className="w-[60px] text-right shrink-0">
                <span className="font-black text-[11px] tabular-nums text-slate-700 dark:text-slate-200">
                    {formatMinutes(totalMin)}u
                </span>
            </div>

            {/* Status mini-badge */}
            <div className="w-[50px] shrink-0 text-center">
                {voortgang > 0 ? (
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">{voortgang}%</span>
                ) : (
                    <StatusDot record={record} now={now} />
                )}
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ record: MkgPlnbRecord }> = ({ record }) => {
    if (record.plnb_gestart) {
        return <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase">Gestart</span>;
    }
    if (record.plnb_forecast) {
        return <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-[9px] font-black uppercase">Forecast</span>;
    }
    if (record.plnb_uitbesteden) {
        return <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-[9px] font-black uppercase">Uitbesteed</span>;
    }
    return <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-[9px] font-black uppercase">Gepland</span>;
};

const StatusDot: React.FC<{ record: MkgPlnbRecord; now: number }> = ({ record, now }) => {
    const isAchterstand = record.plnb_wk_eind < now && !record.plnb_gereed;
    if (record.plnb_gestart) return <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />;
    if (isAchterstand) return <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />;
    if (record.plnb_forecast) return <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />;
    return <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />;
};
