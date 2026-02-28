
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Layers, BookOpen, Plus, Search, Filter, FileText, X, ChevronDown, ChevronUp } from '../../icons';
import { Article, ArticleStatus, ArticleFile, Machine, AssetType } from '../../types';
import { FileRole, DMSDocument } from '../../types/pdm';
import { SyncService } from '../../services/sync';
import { KEYS } from '../../services/db/core';
import { usePdfBlobUrl } from '../../hooks/usePdfBlobUrl';
import { usePdmFilters } from '../../hooks/usePdmFilters';
import { documentService } from '../../services/db/documentService';

interface ArticleListProps {
    articles: Article[];
    machines: Machine[];
    canCreate: boolean;
    canManageCatalog: boolean;
    onCreateNew: () => void;
    onEdit: (article: Article) => void;
    onOpenCatalog: () => void;
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

// ─── Status config ────────────────────────────────────────────────
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

// ─── Drawing Thumbnail Component ──────────────────────────────────
const DrawingThumbnail: React.FC<{ article: Article; serverUrl?: string }> = ({ article, serverUrl }) => {
    const [hovered, setHovered] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [dmsUrl, setDmsUrl] = useState<string | null>(null);

    // Find the primary drawing file — priority: isThumbnail > DRAWING role > first PDF > first image
    const drawing = useMemo(() => {
        const files: ArticleFile[] = (article as any).files || [];
        return files.find(f => f.isThumbnail)
            || files.find(f => f.fileRole === FileRole.DRAWING)
            || files.find(f => f.type === 'application/pdf')
            || files.find(f => f.type?.startsWith('image/'));
    }, [article]);

    // Async resolve DMS URL when documentId is present but url is empty
    useEffect(() => {
        if (!drawing) { setDmsUrl(null); return; }
        // If url is already usable, no need to fetch from DMS
        if (drawing.url && (drawing.url.startsWith('data:') || drawing.url.startsWith('http'))) {
            setDmsUrl(null); // will use drawing.url directly
            return;
        }
        if (drawing.documentId) {
            documentService.getDocumentById(drawing.documentId).then(doc => {
                setDmsUrl(doc?.url || null);
            });
        } else {
            setDmsUrl(null);
        }
    }, [drawing]);

    // Resolve the URL (base64 locally, PocketBase URL when online, or DMS fallback)
    const resolvedUrl = useMemo(() => {
        if (!drawing) return null;
        // Direct URL (legacy base64 or remote http)
        if (drawing.url?.startsWith('data:') || drawing.url?.startsWith('http')) return drawing.url;
        // DMS resolved URL
        if (dmsUrl) return dmsUrl;
        // PocketBase remote fallback
        if (serverUrl && drawing.name) {
            return SyncService.resolveFileUrl(article.id, drawing.name, KEYS.ARTICLES, serverUrl);
        }
        return drawing.url || null;
    }, [drawing, article.id, serverUrl, dmsUrl]);

    const isPdf = drawing?.type === 'application/pdf';
    const isImage = drawing?.type?.startsWith('image/');

    const safePdfUrl = usePdfBlobUrl(isPdf ? resolvedUrl : null);

    if (!drawing) {
        return (
            <div className="w-14 h-14 shrink-0 rounded-[2rem] bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600">
                <FileText size={22} />
            </div>
        );
    }

    return (
        <div
            className="relative w-16 h-20 shrink-0"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Thumbnail */}
            <div className={`w-16 h-20 rounded-lg border overflow-hidden cursor-pointer transition-all duration-200 ${hovered
                ? 'border-blue-400 shadow-lg shadow-blue-500/20 scale-105'
                : 'border-slate-200 dark:border-slate-700'
                } bg-slate-50 dark:bg-slate-800`}>
                {isImage ? (
                    <img
                        src={resolvedUrl || undefined}
                        alt={drawing.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : isPdf && safePdfUrl ? (
                    <div className="w-full h-full relative overflow-hidden pointer-events-none bg-white">
                        <iframe
                            src={`${safePdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                            className="absolute top-0 left-0 w-[250%] h-[250%] origin-top-left scale-[0.40] border-0"
                            tabIndex={-1}
                        />
                    </div>
                ) : (
                    /* Other → show icon with file ext */
                    <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-950/30">
                        <FileText size={20} className="text-blue-500 dark:text-blue-400" />
                        <span className="text-[8px] font-black uppercase text-blue-400 mt-0.5 tracking-widest truncate w-full text-center px-1">
                            {drawing.name?.split('.').pop()?.toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {/* Hover Preview Popover */}
            {hovered && (
                <div
                    ref={tooltipRef}
                    className="absolute left-20 top-1/2 -translate-y-1/2 z-50 w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                    style={{ minHeight: '300px' }}
                >
                    {isImage && resolvedUrl ? (
                        <img
                            src={resolvedUrl}
                            alt={drawing.name}
                            className="w-full h-80 object-contain bg-slate-50 dark:bg-slate-900 p-4"
                        />
                    ) : (
                        safePdfUrl ? (
                            <iframe
                                src={`${safePdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                title={drawing.name}
                                className="w-full h-80 border-0 bg-white"
                            />
                        ) : (
                            <div className="w-full h-80 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-xs py-4 text-center">
                                Laden voorbeeld...
                            </div>
                        )
                    )}
                    <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{drawing.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{drawing.fileRole}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────
export const ArticleList: React.FC<ArticleListProps> = ({
    articles, machines, canCreate, canManageCatalog, onCreateNew, onEdit, onOpenCatalog, serverUrl
}) => {
    const {
        searchTerm, activeStatuses, sortBy, sortDir, activeMachineIds,
        setSearchTerm, toggleStatus, setSortBy, setSortDir, toggleMachine,
        clearFilters, clearAll,
    } = usePdmFilters();
    const [filterOpen, setFilterOpen] = useState(false);
    const [assetExpanded, setAssetExpanded] = useState(false);
    const [page, setPage] = useState(0);
    const filterRef = useRef<HTMLDivElement>(null);

    // Machines grouped by AssetType
    const machinesByType = useMemo(() => {
        const groups: Partial<Record<AssetType, Machine[]>> = {};
        machines.forEach(m => {
            const t = m.type || AssetType.OTHER;
            if (!groups[t]) groups[t] = [];
            groups[t]!.push(m);
        });
        return groups;
    }, [machines]);

    // Close filter panel on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Reset page on search/filter/machine change
    useEffect(() => setPage(0), [searchTerm, activeStatuses, sortBy, sortDir, activeMachineIds]);

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
                return matchesSearch && matchesStatus && matchesMachine;
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
    }, [articles, searchTerm, activeStatuses, sortBy, sortDir, activeMachineIds]);

    const totalPages = Math.ceil(filteredArticles.length / PAGE_SIZE);
    const pageArticles = filteredArticles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const activeFilterCount = activeStatuses.length + activeMachineIds.length + (sortBy !== 'updated' ? 1 : 0);

    const RevBadge: React.FC<{ article: Article }> = ({ article }) => {
        const isLocked = article.status === ArticleStatus.LOCKED;
        return (
            <div className={`w-11 h-11 shrink-0 rounded-[2rem] flex flex-col items-center justify-center font-black text-white ${isLocked ? 'bg-green-600' : 'bg-slate-500'
                }`}>
                <span className="text-[8px] uppercase opacity-70 leading-none">Rev</span>
                <span className="text-sm leading-none mt-0.5">{article.revision}</span>
            </div>
        );
    };

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
                        <button onClick={onCreateNew} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all text-sm">
                            <Plus size={18} /> Nieuw Artikel
                        </button>
                    )}
                </div>
            </div>

            {/* Search + Filter Bar */}
            <div className="relative mb-3" ref={filterRef}>
                <div className="flex gap-3">
                    {/* Search Input */}
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
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filter Toggle Button */}
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

                        {/* Status Multi-Select */}
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Status</p>
                        <div className="space-y-1.5 mb-5">
                            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                                <label key={status} className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={activeStatuses.includes(status as ArticleStatus)}
                                        onChange={() => toggleStatus(status as ArticleStatus)}
                                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                                    />
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${cfg.chip}`}>
                                        {cfg.label}
                                    </span>
                                    <span className="text-xs text-slate-400 ml-auto">
                                        {articles.filter(a => a.status === status).length}
                                    </span>
                                </label>
                            ))}
                        </div>

                        {/* Machine / Asset Filter — Collapsible */}
                        {machines.length > 0 && (
                            <div className="mb-5">
                                <button
                                    type="button"
                                    onClick={() => setAssetExpanded(e => !e)}
                                    className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-2"
                                >
                                    <span>
                                        Machines / Assets
                                        {activeMachineIds.length > 0 && (
                                            <span className="ml-2 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                                {activeMachineIds.length}
                                            </span>
                                        )}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        {activeMachineIds.length > 0 && (
                                            <span
                                                role="button"
                                                onClick={e => { e.stopPropagation(); activeMachineIds.forEach(id => toggleMachine(id)); }}
                                                className="text-[9px] text-blue-500 hover:text-blue-700 font-bold normal-case tracking-normal"
                                            >
                                                Wis
                                            </span>
                                        )}
                                        {assetExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </span>
                                </button>

                                {assetExpanded && (
                                    <div className="border border-slate-100 dark:border-slate-700 rounded-2xl p-3 space-y-4 bg-slate-50 dark:bg-slate-900/40">
                                        {(Object.keys(machinesByType) as AssetType[]).map(type => (
                                            <div key={type}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600 mb-1.5">
                                                    {ASSET_TYPE_LABELS[type] || type}
                                                </p>
                                                <div className="space-y-1.5">
                                                    {machinesByType[type]!.map(m => (
                                                        <label key={m.id} className="flex items-center gap-3 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={activeMachineIds.includes(m.id)}
                                                                onChange={() => toggleMachine(m.id)}
                                                                className="w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
                                                            />
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

                        {/* Sort */}
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Sortering</p>
                        <div className="space-y-1.5 mb-5">
                            {SORT_OPTIONS.map(opt => (
                                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="sort"
                                        checked={sortBy === opt.value}
                                        onChange={() => setSortBy(opt.value)}
                                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-200">{opt.label}</span>
                                </label>
                            ))}
                        </div>

                        {/* Sort Direction */}
                        <div className="flex gap-2 mb-5">
                            {(['asc', 'desc'] as const).map(dir => (
                                <button
                                    key={dir}
                                    onClick={() => setSortDir(dir)}
                                    className={`flex-1 py-1.5 rounded-2xl text-xs font-bold border transition-all ${sortDir === dir
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                                        }`}
                                >
                                    {dir === 'asc' ? '↑ Oplopend' : '↓ Aflopend'}
                                </button>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                            <button
                                onClick={clearAll}
                                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                            >
                                Wis alles
                            </button>
                            <button
                                onClick={() => setFilterOpen(false)}
                                className="px-4 py-1.5 bg-blue-600 text-white rounded-2xl text-xs font-bold hover:bg-blue-700 transition-all"
                            >
                                Sluiten
                            </button>
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
                    <button
                        key={s}
                        onClick={() => toggleStatus(s)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${STATUS_CONFIG[s]?.chip}`}
                    >
                        {STATUS_CONFIG[s]?.label}
                        <X size={10} />
                    </button>
                ))}
                {activeMachineIds.map(id => {
                    const m = machines.find(x => x.id === id);
                    return m ? (
                        <button
                            key={id}
                            onClick={() => toggleMachine(id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                        >
                            {m.name}
                            <X size={10} />
                        </button>
                    ) : null;
                })}
                {(searchTerm || activeStatuses.length > 0 || activeMachineIds.length > 0) && filteredArticles.length < articles.length && (
                    <button onClick={() => { clearAll(); }} className="text-xs text-blue-500 hover:text-blue-700 font-medium ml-1">
                        Wis alles
                    </button>
                )}
            </div>

            {/* Article List */}
            <div className="space-y-2">
                {pageArticles.map(article => (
                    <div
                        key={article.id}
                        onClick={() => onEdit(article)}
                        className="group flex items-center gap-4 bg-white dark:bg-slate-800 px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                        {/* Drawing Thumbnail */}
                        <DrawingThumbnail article={article} serverUrl={serverUrl} />

                        {/* Revision Badge */}
                        <RevBadge article={article} />

                        {/* Article Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 dark:text-white text-base truncate">
                                {article.name}
                            </h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 items-center mt-0.5">
                                <span className="text-sm font-mono text-blue-600 dark:text-blue-400 font-black tracking-tight">{article.articleCode}</span>
                                {article.drawingNumber && (
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <FileText size={11} /> {article.drawingNumber}
                                    </span>
                                )}
                                {(article.material) && (
                                    <span className="text-xs text-slate-400">{article.material}</span>
                                )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-3 mt-1 flex-wrap">
                                <span>{(article.operations || []).length} routing stap{(article.operations || []).length !== 1 ? 'pen' : ''}</span>
                                {article.created && (
                                    <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span> AANGEMAAKT: {new Date(article.created).toLocaleDateString('nl-NL')}</span>
                                )}
                                {article.updated && (
                                    <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span> GEWIJZIGD: {new Date(article.updated).toLocaleDateString('nl-NL')}</span>
                                )}
                            </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-3 py-1 rounded-2xl text-[10px] font-black uppercase tracking-widest shrink-0 ${STATUS_CONFIG[article.status]?.pill || 'bg-slate-400 text-white'}`}>
                            {STATUS_CONFIG[article.status]?.label || article.status}
                        </span>
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
