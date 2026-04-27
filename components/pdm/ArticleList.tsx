
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Layers, BookOpen, Plus, Search, Filter, FileText, X, ChevronDown, ChevronUp, FileUp, Trash2, CheckSquare, Square, Lock, Clock } from '../../icons';
import { Article, ArticleStatus, Machine, AssetType, SetupStatus } from '../../types';
import { usePdmFilters } from '../../hooks/usePdmFilters';
import { ArticleListRow } from './ui/ArticleListRow';
import { articleService } from '../../services/db/articleService';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface ArticleListProps {
    articles: Article[];
    machines: Machine[];
    canCreate: boolean;
    canManageCatalog: boolean;
    onCreateNew: () => void;
    onEdit: (article: Article) => void;
    onOpenCatalog: () => void;
    onImportExcel: () => void;
    onBulkDelete?: (ids: string[]) => void;
    onRefresh?: () => void;
    serverUrl?: string;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
    [AssetType.CNC]: 'CNC',
    [AssetType.ROBOT]: 'Robot',
    [AssetType.CMM]: 'CMM',
    [AssetType.CLIMATE]: 'Klimaat',
    [AssetType.PROCESS]: 'Proces',
    [AssetType.OTHER]: 'Overig',
};

const STATUS_CONFIG: Record<string, { label: string; pill: string; chip: string }> = {
    [ArticleStatus.DRAFT]: { label: 'Draft', pill: 'bg-slate-600 text-white', chip: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600' },
    [ArticleStatus.LOCKED]: { label: 'Vergrendeld', pill: 'bg-green-600 text-white shadow-sm shadow-green-500/30', chip: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' },
    [ArticleStatus.OBSOLETE]: { label: 'Obsolete', pill: 'bg-red-700 text-white', chip: 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800' },
};

const SORT_OPTIONS = [
    { value: 'created', label: 'Laatst aangemaakt' },
    { value: 'updated', label: 'Laatste wijziging' },
    { value: 'name', label: 'Naam A–Z' },
    { value: 'code', label: 'Artikelcode' },
    { value: 'revision', label: 'Revisie' },
] as const;

const PAGE_SIZE = 50;

export const ArticleList: React.FC<ArticleListProps> = ({
    articles, machines, canCreate, canManageCatalog, onCreateNew, onEdit, onOpenCatalog, onImportExcel, onBulkDelete, onRefresh, serverUrl
}) => {
    const {
        searchTerm, activeStatuses, sortBy, sortDir, activeMachineIds,
        setSearchTerm, toggleStatus, setSortBy, setSortDir, toggleMachine,
        clearFilters, clearAll,
    } = usePdmFilters();
    const [filterOpen, setFilterOpen] = useState(false);
    const [reviewFilter, setReviewFilter] = useState(false);
    const [assetExpanded, setAssetExpanded] = useState(false);
    const [page, setPage] = useState(0);
    const filterRef = useRef<HTMLDivElement>(null);
    const confirm = useConfirm();
    const { addNotification } = useNotifications();

    // D-11: Bulk selection state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const machinesByType = useMemo(() => {
        const groups: Partial<Record<AssetType, Machine[]>> = {};
        machines.forEach(m => {
            const t = m.type || AssetType.OTHER;
            if (!groups[t]) groups[t] = [];
            groups[t]!.push(m);
        });
        return groups;
    }, [machines]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => setPage(0), [searchTerm, activeStatuses, sortBy, sortDir, activeMachineIds]);

    // Clear selection when exiting selection mode
    useEffect(() => {
        if (!selectionMode) setSelectedIds(new Set());
    }, [selectionMode]);

    // Count articles with setups awaiting review
    const reviewCount = useMemo(() => articles.filter(a =>
        (a.operations || []).some(op =>
            (op.setups || []).some(s => s.status === SetupStatus.REVIEW)
        )
    ).length, [articles]);

    const filteredArticles = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();
        return articles
            .filter(a => {
                const matchesSearch = !q ||
                    a.articleCode?.toLowerCase().includes(q) ||
                    a.name?.toLowerCase().includes(q) ||
                    (a.drawingNumber || '').toLowerCase().includes(q) ||
                    (a.material || '').toLowerCase().includes(q) ||
                    (a.createdBy || '').toLowerCase().includes(q) ||
                    (a.operations || []).some(op => op.description?.toLowerCase().includes(q));
                const matchesStatus = activeStatuses.length === 0 || activeStatuses.includes(a.status);
                const matchesMachine = activeMachineIds.length === 0 ||
                    (a.operations || []).some(op =>
                        (op.setups || []).some(s => activeMachineIds.includes(s.machineId || ''))
                    );
                const matchesReview = !reviewFilter ||
                    (a.operations || []).some(op =>
                        (op.setups || []).some(s => s.status === SetupStatus.REVIEW)
                    );
                return matchesSearch && matchesStatus && matchesMachine && matchesReview;
            })
            .sort((a, b) => {
                let cmp = 0;
                if (sortBy === 'updated') cmp = new Date(b.updated || 0).getTime() - new Date(a.updated || 0).getTime();
                else if (sortBy === 'created') cmp = new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime();
                else if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '');
                else if (sortBy === 'code') cmp = (a.articleCode || '').localeCompare(b.articleCode || '');
                else if (sortBy === 'revision') cmp = (a.revision || '').localeCompare(b.revision || '');
                return sortDir === 'desc' ? -cmp : cmp;
            });
    }, [articles, searchTerm, activeStatuses, sortBy, sortDir, activeMachineIds, reviewFilter]);

    const totalPages = Math.ceil(filteredArticles.length / PAGE_SIZE);
    const pageArticles = filteredArticles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const activeFilterCount = activeStatuses.length + activeMachineIds.length + (sortBy !== 'updated' ? 1 : 0) + (reviewFilter ? 1 : 0);

    // D-11: Bulk selection handlers
    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const selectAll = useCallback(() => {
        setSelectedIds(new Set(filteredArticles.map(a => a.id)));
    }, [filteredArticles]);

    const deselectAll = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const handleBulkDelete = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const draftOnly = Array.from(selectedIds).every(id => {
            const art = articles.find(a => a.id === id);
            return art?.status === ArticleStatus.DRAFT;
        });
        if (!draftOnly) {
            addNotification('WARNING', 'Niet toegestaan', 'Alleen artikelen met status DRAFT kunnen verwijderd worden.');
            return;
        }
        const ok = await confirm({
            title: `${selectedIds.size} artikel(en) verwijderen`,
            message: `Weet je zeker dat je ${selectedIds.size} artikel(en) permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`
        });
        if (ok) {
            for (const id of selectedIds) {
                await articleService.deleteArticle(id);
            }
            setSelectedIds(new Set());
            setSelectionMode(false);
            if (onRefresh) onRefresh();
            addNotification('SUCCESS', 'Verwijderd', `${selectedIds.size} artikel(en) succesvol verwijderd.`);
        }
    }, [selectedIds, articles, confirm, addNotification, onRefresh]);

    // F-05: Bulk DRAFT → LOCKED
    const handleBulkLock = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const draftIds = Array.from(selectedIds).filter(id => {
            const art = articles.find(a => a.id === id);
            return art?.status === ArticleStatus.DRAFT;
        });
        if (draftIds.length === 0) {
            addNotification('WARNING', 'Niet mogelijk', 'Geen DRAFT artikelen in de selectie.');
            return;
        }
        const ok = await confirm({
            title: `${draftIds.length} artikel(en) vergrendelen`,
            message: `Weet je zeker dat je ${draftIds.length} artikel(en) wilt vergrendelen? Vergrendelde artikelen kunnen alleen via een nieuwe revisie gewijzigd worden.`
        });
        if (ok) {
            for (const id of draftIds) {
                await articleService.updateArticleStatus(id, ArticleStatus.LOCKED);
            }
            setSelectedIds(new Set());
            setSelectionMode(false);
            if (onRefresh) onRefresh();
            addNotification('SUCCESS', 'Vergrendeld', `${draftIds.length} artikel(en) succesvol vergrendeld.`);
        }
    }, [selectedIds, articles, confirm, addNotification, onRefresh]);

    return (
        <div className="max-w-7xl mx-auto pb-20 text-left animate-in fade-in duration-300">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Layers className="text-blue-600" /> Artikelen (PDM)
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gekoppeld aan MKG Stamgegevens.</p>
                </div>
                <div className="flex gap-3">
                    {canManageCatalog && (
                        <button onClick={onOpenCatalog} className="px-5 py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-[2rem] font-bold flex items-center gap-2 hover:bg-slate-700 dark:hover:bg-slate-600 transition-all text-sm">
                            <BookOpen size={18} /> Bewerkingen Catalogus
                        </button>
                    )}
                    {canCreate && (
                        <div className="flex gap-2">
                            <button onClick={onImportExcel} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2rem] font-bold shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all text-sm">
                                <FileUp size={18} /> Excel Import
                            </button>
                            <button onClick={onCreateNew} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all text-sm">
                                <Plus size={18} /> Nieuw Artikel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Search + Filter Bar */}
            <div className="relative mb-3" ref={filterRef}>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Zoek op code, naam, tekening, materiaal, maker, bewerking..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Review filter quick-button */}
                    {reviewCount > 0 && (
                        <button
                            onClick={() => setReviewFilter(f => !f)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl border font-bold text-sm transition-all shadow-sm whitespace-nowrap ${reviewFilter
                                ? 'bg-yellow-500 border-yellow-500 text-white shadow-yellow-500/20'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-yellow-400'
                                }`}
                            title="Toon alleen artikelen met setups die wachten op goedkeuring"
                        >
                            <Clock size={16} />
                            Review
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${reviewFilter ? 'bg-white/25 text-white' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                                {reviewCount}
                            </span>
                        </button>
                    )}

                    {/* D-11: Selectie mode toggle */}
                    {canCreate && (
                        <button
                            onClick={() => setSelectionMode(s => !s)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl border font-bold text-sm transition-all shadow-sm whitespace-nowrap ${selectionMode
                                ? 'bg-orange-600 border-orange-600 text-white shadow-orange-500/20'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                                }`}
                            title="Selectie modus"
                        >
                            <CheckSquare size={16} />
                            {selectionMode ? 'Annuleer' : 'Selecteer'}
                        </button>
                    )}

                    <button
                        onClick={() => setFilterOpen(o => !o)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl border font-bold text-sm transition-all shadow-sm whitespace-nowrap ${filterOpen || activeFilterCount > 0
                            ? 'bg-blue-600 border-blue-600 text-white shadow-blue-500/20'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                            }`}
                    >
                        <Filter size={16} />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="bg-white/25 text-white text-[10px] font-black px-1.5 py-0.5 rounded-[2rem] min-w-[20px] text-center">
                                {activeFilterCount}
                            </span>
                        )}
                        {filterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>

                {/* Filter Dropdown Panel */}
                {filterOpen && (
                    <div className="absolute top-full mt-2 right-0 w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-40 p-5 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto">

                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Status</p>
                        <div className="space-y-1.5 mb-5">
                            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                                <label key={status} className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={activeStatuses.includes(status as ArticleStatus)} onChange={() => toggleStatus(status as ArticleStatus)} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${cfg.chip}`}>{cfg.label}</span>
                                    <span className="text-xs text-slate-400 ml-auto">{articles.filter(a => a.status === status).length}</span>
                                </label>
                            ))}
                        </div>

                        {machines.length > 0 && (
                            <div className="mb-5">
                                <button type="button" onClick={() => setAssetExpanded(e => !e)} className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-2">
                                    <span>
                                        Machines / Assets
                                        {activeMachineIds.length > 0 && (
                                            <span className="ml-2 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{activeMachineIds.length}</span>
                                        )}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        {activeMachineIds.length > 0 && (
                                            <span role="button" onClick={e => { e.stopPropagation(); activeMachineIds.forEach(id => toggleMachine(id)); }} className="text-[9px] text-blue-500 hover:text-blue-700 font-bold normal-case tracking-normal">Wis</span>
                                        )}
                                        {assetExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </span>
                                </button>

                                {assetExpanded && (
                                    <div className="border border-slate-100 dark:border-slate-700 rounded-2xl p-3 space-y-4 bg-slate-50 dark:bg-slate-900/40">
                                        {(Object.keys(machinesByType) as AssetType[]).map(type => (
                                            <div key={type}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600 mb-1.5">{ASSET_TYPE_LABELS[type] || type}</p>
                                                <div className="space-y-1.5">
                                                    {machinesByType[type]!.map(m => (
                                                        <label key={m.id} className="flex items-center gap-3 cursor-pointer group">
                                                            <input type="checkbox" checked={activeMachineIds.includes(m.id)} onChange={() => toggleMachine(m.id)} className="w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0" />
                                                            <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{m.name}</span>
                                                            <span className="text-[10px] text-slate-400 ml-auto shrink-0 font-mono">{m.machineNumber}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Sortering</p>
                        <div className="space-y-1.5 mb-5">
                            {SORT_OPTIONS.map(opt => (
                                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                                    <input type="radio" name="sort" checked={sortBy === opt.value} onChange={() => setSortBy(opt.value)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                                    <span className="text-sm text-slate-700 dark:text-slate-200">{opt.label}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-2 mb-5">
                            {(['asc', 'desc'] as const).map(dir => (
                                <button key={dir} onClick={() => setSortDir(dir)} className={`flex-1 py-1.5 rounded-2xl text-xs font-bold border transition-all ${sortDir === dir ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'}`}>
                                    {dir === 'asc' ? '↑ Oplopend' : '↓ Aflopend'}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                            <button onClick={clearAll} className="text-xs text-slate-400 hover:text-slate-600 font-medium">Wis alles</button>
                            <button onClick={() => setFilterOpen(false)} className="px-4 py-1.5 bg-blue-600 text-white rounded-2xl text-xs font-bold hover:bg-blue-700 transition-all">Sluiten</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Meta row: result count + active filter pills */}
            <div className="flex flex-wrap items-center gap-2 mb-5 min-h-[28px]">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                    {filteredArticles.length === articles.length
                        ? `${articles.length} artikelen`
                        : `${filteredArticles.length} van ${articles.length} artikelen`}
                </span>
                {activeStatuses.map(s => (
                    <button key={s} onClick={() => toggleStatus(s)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${STATUS_CONFIG[s]?.chip}`}>
                        {STATUS_CONFIG[s]?.label} <X size={10} />
                    </button>
                ))}
                {activeMachineIds.map(id => {
                    const m = machines.find(x => x.id === id);
                    return m ? (
                        <button key={id} onClick={() => toggleMachine(id)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                            {m.name} <X size={10} />
                        </button>
                    ) : null;
                })}
                {reviewFilter && (
                    <button onClick={() => setReviewFilter(false)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                        Wacht op Review <X size={10} />
                    </button>
                )}
                {(searchTerm || activeStatuses.length > 0 || activeMachineIds.length > 0 || reviewFilter) && filteredArticles.length < articles.length && (
                    <button onClick={() => { clearAll(); setReviewFilter(false); }} className="text-xs text-blue-500 hover:text-blue-700 font-medium ml-1">Wis alles</button>
                )}
            </div>

            {/* D-11: Bulk Actions Bar */}
            {selectionMode && (
                <div className="mb-4 flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                    <button onClick={selectedIds.size === filteredArticles.length ? deselectAll : selectAll} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-blue-400 transition-all">
                        {selectedIds.size === filteredArticles.length ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
                        {selectedIds.size === filteredArticles.length ? 'Deselecteer alles' : 'Selecteer alles'}
                    </button>

                    <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                        {selectedIds.size} geselecteerd
                    </span>

                    <div className="flex-1" />

                    {/* F-05: Bulk Lock knop */}
                    <button
                        onClick={handleBulkLock}
                        disabled={selectedIds.size === 0}
                        className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                        <Lock size={14} /> Vergrendel ({Array.from(selectedIds).filter(id => articles.find(a => a.id === id)?.status === ArticleStatus.DRAFT).length})
                    </button>

                    <button
                        onClick={handleBulkDelete}
                        disabled={selectedIds.size === 0}
                        className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                        <Trash2 size={14} /> Verwijder ({selectedIds.size})
                    </button>
                </div>
            )}

            {/* Article List */}
            <div className="space-y-2">
                {pageArticles.map(article => (
                    <div key={article.id} className="relative">
                        {/* D-11: Checkbox overlay in selection mode */}
                        {selectionMode && (
                            <div
                                className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-3 cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); toggleSelection(article.id); }}
                            >
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.has(article.id)
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/30'
                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-blue-400'
                                    }`}>
                                    {selectedIds.has(article.id) && (
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className={selectionMode ? 'pl-10' : ''}>
                            <ArticleListRow
                                article={article}
                                serverUrl={serverUrl}
                                onEdit={selectionMode ? () => toggleSelection(article.id) : onEdit}
                            />
                        </div>
                    </div>
                ))}

                {filteredArticles.length === 0 && (
                    <div className="text-center py-20 text-slate-400 italic">
                        Geen artikelen gevonden.
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="ml-2 text-blue-500 not-italic font-medium hover:underline">
                                Zoekopdracht wissen
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-8">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="w-9 h-9 flex items-center justify-center rounded-[2rem] border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        ‹
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                        const pageNum = totalPages <= 7 ? i : (
                            page < 4 ? i :
                                page >= totalPages - 4 ? totalPages - 7 + i :
                                    page - 3 + i
                        );
                        return (
                            <button
                                key={pageNum}
                                onClick={() => setPage(pageNum)}
                                className={`w-9 h-9 flex items-center justify-center rounded-[2rem] text-sm font-bold transition-all ${pageNum === page
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-600'
                                    : 'border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-400 hover:text-blue-500'
                                    }`}
                            >
                                {pageNum + 1}
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="w-9 h-9 flex items-center justify-center rounded-[2rem] border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        ›
                    </button>
                </div>
            )}
        </div>
    );
};
