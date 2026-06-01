
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Machine, Article, ActiveJob, ArticleStatus, SetupStatus, AssetType, SetupVariant, MkgPlnbRecord } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTable } from '../../hooks/useTable';
import { KEYS } from '../../services/db/core';
import { machineService } from '../../services/db/machineService';
import { mkgCapaciteitService } from '../../services/mkg/mkgCapaciteitService';
import { db } from '../../services/storage';
import { 
    Briefcase, Search, ArrowRight, PlayCircle, StopCircle, 
    Monitor, ExternalLink, ClipboardList, CheckCircle2, RefreshCw, X, Calendar, Package, Loader2
} from '../../icons';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../contexts/ConfirmContext';
import { MkgActionModal } from './MkgActionModal';

interface JobSectionProps {
    machine: Machine;
}

export const JobSection: React.FC<JobSectionProps> = ({ machine }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const { data: articles } = useTable<Article>(KEYS.ARTICLES);
    const [searchTerm, setSearchTerm] = useState('');

    // ── MKG Order selectie modal ──────────────────────────────────────────
    const [showMkgOrderModal, setShowMkgOrderModal] = useState(false);
    const [mkgOrders, setMkgOrders] = useState<MkgPlnbRecord[]>([]);
    const [mkgOrderSearch, setMkgOrderSearch] = useState('');
    const [mkgSyncing, setMkgSyncing] = useState(false);

    // ── MKG Actie modal (start / gereedmeld) ──────────────────────────────
    const [actionModal, setActionModal] = useState<{
        type: 'start' | 'gereed';
        record: MkgPlnbRecord;
    } | null>(null);

    // ── MKG orders laden ──────────────────────────────────────────────────
    const loadMkgOrders = useCallback(async () => {
        if (!machine.mkgResourceCode) return;
        const records = await mkgCapaciteitService.getPlnbForResource(machine.mkgResourceCode);
        const forMachine = records.filter((r: MkgPlnbRecord) => !r.plnb_gereed);
        // Sorteer op geplande startdatum
        forMachine.sort((a: MkgPlnbRecord, b: MkgPlnbRecord) => (a.plnb_dat_start || '').localeCompare(b.plnb_dat_start || ''));
        setMkgOrders(forMachine);
    }, [machine.mkgResourceCode]);

    useEffect(() => {
        loadMkgOrders();
    }, [loadMkgOrders]);

    const syncMkgOrders = async () => {
        if (!machine.mkgResourceCode) return;
        setMkgSyncing(true);
        try {
            const srv = await db.getServerSettings();
            const pbUrl = srv.url || window.location.origin;
            await mkgCapaciteitService.syncPlnbFromMkg(pbUrl, machine.mkgResourceCode);
            await loadMkgOrders();
        } catch (err) {
            console.error('[JobSection] MKG sync fout:', err);
        } finally {
            setMkgSyncing(false);
        }
    };

    // ── Gefilterde MKG orders ─────────────────────────────────────────────
    const filteredMkgOrders = useMemo(() => {
        if (!mkgOrderSearch) return mkgOrders;
        const term = mkgOrderSearch.toLowerCase();
        return mkgOrders.filter(r =>
            r.prdh_num.toLowerCase().includes(term) ||
            (r.arti_code || '').toLowerCase().includes(term) ||
            (r.arti_oms1 || '').toLowerCase().includes(term) ||
            (r.plnb_oms || '').toLowerCase().includes(term)
        );
    }, [mkgOrders, mkgOrderSearch]);

    // --- Bestaande lokale artikel selectie ---
    const availableJobs = useMemo(() => {
        if (!articles) return [];
        const term = searchTerm.toLowerCase();
        
        const options: { article: Article, setup: SetupVariant, opDesc: string }[] = [];

        articles.forEach(art => {
            if (art.status !== ArticleStatus.LOCKED) return;
            if (term && !art.articleCode.toLowerCase().includes(term) && !art.name.toLowerCase().includes(term)) return;

            art.operations.forEach((op: typeof art.operations[0]) => {
                op.setups.forEach((setup: SetupVariant) => {
                    const isDirectMatch = setup.machineId === machine.id;
                    if (isDirectMatch) {
                        options.push({ article: art, setup, opDesc: op.description });
                    }
                });
            });
        });

        return options;
    }, [articles, searchTerm, machine.id]);

    const handleStartJob = async (option: { article: Article, setup: SetupVariant }) => {
        if (!user) return;
        const job: ActiveJob = {
            articleId: option.article.id,
            articleName: option.article.name,
            articleCode: option.article.articleCode,
            setupId: option.setup.id,
            setupName: option.setup.name,
            startTime: new Date().toISOString(),
            operator: user.name
        };
        await machineService.assignJob(machine.id, job);
        navigate(`/production/machine/${machine.id}`);
    };

    // ── MKG order selectie → Start als actieve job ────────────────────────
    const handleMkgOrderSelect = (record: MkgPlnbRecord) => {
        setShowMkgOrderModal(false);
        setActionModal({ type: 'start', record });
    };

    const handleMkgStartSuccess = async () => {
        if (!actionModal || actionModal.type !== 'start') return;
        const rec = actionModal.record;
        const operatorName = localStorage.getItem('fm_operator_naam') || user?.name || 'Onbekend';
        
        // Maak de actieve job met MKG koppeling
        const job: ActiveJob = {
            articleId: '',
            articleName: rec.arti_oms1 || rec.plnb_oms || 'MKG Order',
            articleCode: rec.arti_code || rec.prdh_num,
            setupId: '',
            setupName: rec.plnb_oms || `Bew. ${rec.bwrk_num}`,
            startTime: new Date().toISOString(),
            operator: operatorName,
            mkgPlnbRecordId: rec.id,
            mkgPrdhNum: rec.prdh_num,
            mkgBwrkNum: rec.bwrk_num,
            mkgAantal: rec.plnb_aantal,
        };
        await machineService.assignJob(machine.id, job);
        setActionModal(null);
        await loadMkgOrders();
    };

    const handleMkgGereedSuccess = async () => {
        setActionModal(null);
        // Na gereedmelden: job stoppen als markeerGereed was aangevinkt
        await machineService.clearJob(machine.id);
        await loadMkgOrders();
    };

    const handleStopJob = async () => {
        const ok = await confirm({ title: 'Setup beëindigen', message: 'Weet je zeker dat je deze setup wilt beëindigen?' });
        if (ok) await machineService.clearJob(machine.id);
    };

    // ── Gereedmeld knop: zoek het MKG record op ──────────────────────────
    const handleGereedmelden = () => {
        if (!machine.activeJob?.mkgPlnbRecordId) return;
        // Zoek het record uit de cache
        const rec = mkgOrders.find(r => r.id === machine.activeJob!.mkgPlnbRecordId);
        if (rec) {
            setActionModal({ type: 'gereed', record: rec });
        }
    };

    // ════════════════════════════════════════════════════════════════════════
    // RENDER: Geen actieve job
    // ════════════════════════════════════════════════════════════════════════
    if (!machine.activeJob) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Briefcase size={40} className="text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic mb-2">Geen Actieve Werkorder</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">Selecteer een vrijgegeven artikel of kies een order uit de MKG planning.</p>
                    
                    {/* MKG Order knop */}
                    {machine.mkgResourceCode && (
                        <button
                            onClick={() => { setShowMkgOrderModal(true); loadMkgOrders(); }}
                            className="w-full max-w-lg mx-auto mb-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
                        >
                            <ClipboardList size={22} /> Order Selecteren uit MKG Planning
                        </button>
                    )}

                    <div className="relative max-w-lg mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Zoek op artikelnummer of omschrijving..." 
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 font-bold outline-none focus:border-blue-500 transition-all shadow-inner"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableJobs.map((opt, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group cursor-pointer shadow-sm flex flex-col" onClick={() => handleStartJob(opt)}>
                            <div className="flex flex-col gap-2 mb-6 pointer-events-none w-full">
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">Artikelcode</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-white text-right truncate pl-4">{opt.article.articleCode}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">Tekening nr</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-white text-right truncate pl-4">{opt.article.drawingNumber || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">Tekening revisie</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-white text-right truncate pl-4">{opt.article.drawingRevision || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">Omschrijving</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-white text-right truncate pl-4" title={opt.article.name}>{opt.article.name}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">Asset naam</span>
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 text-right truncate pl-4">{machine.name}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 mt-auto">
                                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded truncate max-w-[120px]">{opt.opDesc}</span>
                                <ArrowRight size={12} className="shrink-0" />
                                <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded truncate max-w-[120px]">{opt.setup.name}</span>
                            </div>

                            <button className="w-full py-3 mt-auto bg-blue-600 group-hover:bg-blue-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shrink-0">
                                <PlayCircle size={16} /> Start Setup
                            </button>
                        </div>
                    ))}
                    {availableJobs.length === 0 && (
                        <div className="col-span-full text-center py-10 text-slate-400 italic text-sm">
                            Geen setups gevonden voor deze machine. (Alleen RELEASED artikelen worden getoond)
                        </div>
                    )}
                </div>

                {/* ── MKG Order Selectie Modal ── */}
                {showMkgOrderModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
                         onClick={() => setShowMkgOrderModal(false)}>
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 flex flex-col"
                             onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div className="px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                                        <ClipboardList size={20} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white">MKG Planning Orders</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {machine.name} — {mkgOrders.length} bewerkingen gepland
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); syncMkgOrders(); }}
                                        disabled={mkgSyncing}
                                        className="p-2.5 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                        title="Synchroniseer met MKG"
                                    >
                                        <RefreshCw size={16} className={`text-blue-600 dark:text-blue-400 ${mkgSyncing ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => setShowMkgOrderModal(false)}
                                        className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <X size={18} className="text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Zoekbalk */}
                            <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Zoek op ordernr, artikelcode, omschrijving..."
                                        value={mkgOrderSearch}
                                        onChange={e => setMkgOrderSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Orderlijst */}
                            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
                                {filteredMkgOrders.length === 0 ? (
                                    <div className="text-center py-16 text-slate-400">
                                        <Package size={48} className="mx-auto mb-4 opacity-30" />
                                        <p className="text-sm font-bold">Geen orders gevonden</p>
                                        <p className="text-xs mt-1">Controleer de MKG sync of pas je zoekopdracht aan.</p>
                                    </div>
                                ) : (
                                    filteredMkgOrders.map(r => {
                                        const isGestart = r.plnb_gestart;
                                        return (
                                            <button
                                                key={r.id}
                                                onClick={() => handleMkgOrderSelect(r)}
                                                className="w-full text-left bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 rounded-2xl p-5 transition-all group"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-lg font-black font-mono text-slate-800 dark:text-white">{r.prdh_num}</span>
                                                            {isGestart && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Gestart
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 truncate">
                                                            {r.arti_code && <span className="font-mono mr-2">{r.arti_code}</span>}
                                                            {r.arti_oms1 || r.plnb_oms || '—'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Stuks</p>
                                                        <p className="text-lg font-black font-mono text-blue-600 dark:text-blue-400">{r.plnb_aantal}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {r.plnb_dat_start ? new Date(r.plnb_dat_start).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' }) : '—'}
                                                    </span>
                                                    <span>Bew. {r.bwrk_num}</span>
                                                    <span>{r.plnb_oms || '—'}</span>
                                                    <ArrowRight size={14} className="ml-auto text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MKG Actie Modal ── */}
                {actionModal && (
                    <MkgActionModal
                        isOpen={true}
                        type={actionModal.type}
                        record={actionModal.record}
                        onClose={() => setActionModal(null)}
                        onSuccess={actionModal.type === 'start' ? handleMkgStartSuccess : handleMkgGereedSuccess}
                    />
                )}
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    // RENDER: Actieve job
    // ════════════════════════════════════════════════════════════════════════
    return (
        <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in duration-300">
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-2xl text-center max-w-2xl w-full relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                    <Monitor size={200} />
                </div>
                
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 text-[10px] font-black uppercase tracking-widest mb-6 animate-pulse">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span> Actieve Productie
                    </div>
                    
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">
                        {machine.activeJob.articleCode}
                    </h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 font-bold mb-2">
                        {machine.activeJob.articleName}
                    </p>

                    {/* MKG order info (als aanwezig) */}
                    {machine.activeJob.mkgPrdhNum && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[10px] font-bold uppercase tracking-widest mb-6">
                            <ClipboardList size={12} /> MKG Order {machine.activeJob.mkgPrdhNum} — Bew. {machine.activeJob.mkgBwrkNum}
                            {machine.activeJob.mkgAantal && <span className="ml-1">({machine.activeJob.mkgAantal} stuks)</span>}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <span className="block text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Setup</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-white">{machine.activeJob.setupName}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <span className="block text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Operator</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-white">{machine.activeJob.operator}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => navigate(`/production/machine/${machine.id}`)}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all hover:scale-105"
                        >
                            <ExternalLink size={24} /> Open Operator Dashboard
                        </button>

                        {/* Gereedmeld knop (alleen bij MKG orders) */}
                        {machine.activeJob.mkgPlnbRecordId && (
                            <button 
                                onClick={handleGereedmelden}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                            >
                                <CheckCircle2 size={18} /> Bewerking Gereedmelden
                            </button>
                        )}
                        
                        <button 
                            onClick={handleStopJob} 
                            className="w-full py-4 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
                        >
                            <StopCircle size={16} /> Productie Stoppen
                        </button>
                    </div>
                </div>
            </div>

            {/* ── MKG Actie Modal (voor gereedmelden vanuit actieve job) ── */}
            {actionModal && (
                <MkgActionModal
                    isOpen={true}
                    type={actionModal.type}
                    record={actionModal.record}
                    onClose={() => setActionModal(null)}
                    onSuccess={handleMkgGereedSuccess}
                />
            )}
        </div>
    );
};
