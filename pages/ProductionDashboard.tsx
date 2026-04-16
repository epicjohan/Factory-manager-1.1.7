import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTable } from '../hooks/useTable';
import { machineService } from '../services/db/machineService';
import { KEYS } from '../services/db/core';
import { Machine, Article, SetupVariant, SupportType, SupportStatus, ArticleFile, ArticleTool, NotificationTrigger, SupportRequest } from '../types';
import { db } from '../services/storage';
import { documentService } from '../services/db/documentService';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { usePdfBlobUrl } from '../hooks/usePdfBlobUrl';
import { FilePreviewModal } from '../components/ui/FilePreviewModal';
import { SupportRequestModals } from '../components/machine/SupportRequestModals';
import {
    ArrowLeft, StopCircle, CheckSquare,
    Image as ImageIcon, FileText, Maximize, Minimize,
    Wrench, Info, Truck, Box, Expand, Shrink,
    ClipboardList, Hammer, ScanEye, Container, RefreshCw, AlertTriangle, Loader2,
    X, Ruler, Binary, Thermometer, Recycle, Droplet, Search, Briefcase, PlayCircle, ArrowRight
} from '../icons';

type DashboardTab = 'INFO' | 'FIXTURE' | 'TOOLS' | 'INSTRUCTION';

export const ProductionDashboard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addNotification } = useNotifications();

    // --- DATA ---
    const { data: machines } = useTable<Machine>(KEYS.MACHINES);
    const { data: articles } = useTable<Article>(KEYS.ARTICLES);

    // --- STATE ---
    const [activeTab, setActiveTab] = useState<DashboardTab>('INSTRUCTION');
    const [viewMode, setViewMode] = useState<'IMAGE' | 'DRAWING'>('DRAWING');
    const [focusMode, setFocusMode] = useState(false); // UI Focus (Hide Sidebars)
    const [isFullscreen, setIsFullscreen] = useState(false); // Browser Fullscreen
    const [previewFile, setPreviewFile] = useState<ArticleFile | null>(null);
    const [selectedTool, setSelectedTool] = useState<ArticleTool | null>(null);

    // Logistics Menu State
    const [showLogisticsMenu, setShowLogisticsMenu] = useState(false);
    const [activeSupportType, setActiveSupportType] = useState<SupportType | null>(null);
    const logisticsContainerRef = useRef<HTMLDivElement>(null);

    // Stop Modal State
    const [showStopModal, setShowStopModal] = useState(false);
    const [isStopping, setIsStopping] = useState(false);

    const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

    const dashboardRef = useRef<HTMLDivElement>(null);

    // --- DERIVED DATA ---
    const machine = useMemo(() => machines.find(m => m.id === id), [machines, id]);

    const activeJobData = useMemo(() => {
        if (!machine?.activeJob) return null;
        const article = articles.find(a => a.id === machine.activeJob!.articleId);
        if (!article) return null;

        let foundSetup: SetupVariant | null = null;
        let foundOpDesc = '';
        for (const op of article.operations) {
            const s = op.setups.find((s: SetupVariant) => s.id === machine.activeJob!.setupId);
            if (s) { foundSetup = s; foundOpDesc = op.description; break; }
        }
        return { article, setup: foundSetup, opDesc: foundOpDesc };
    }, [machine, articles]);

    const { article, setup, opDesc } = activeJobData || {};

    const [searchTerm, setSearchTerm] = useState('');

    const availableJobs = useMemo(() => {
        if (!articles || !machine) return [];
        const term = searchTerm.toLowerCase();
        
        const options: { article: Article, setup: SetupVariant, opDesc: string }[] = [];

        articles.forEach(art => {
            // Note: Users requested ALL statuses to be selectable on the machine
            if (term && !art.articleCode.toLowerCase().includes(term) && !art.name.toLowerCase().includes(term)) return;

            art.operations.forEach((op: typeof art.operations[0]) => {
                op.setups.forEach((setup: SetupVariant) => {
                    if (setup.machineId === machine.id) {
                        options.push({ article: art, setup, opDesc: op.description });
                    }
                });
            });
        });

        return options;
    }, [articles, searchTerm, machine?.id]);

    const handleStartJob = (e: React.MouseEvent, option: { article: Article, setup: SetupVariant }) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user || !machine) return;

        // Auto-Fullscreen strictly synchronous for strict browsers (Safari/Mac)
        const docEl = dashboardRef.current as any || document.documentElement as any;
        if (!document.fullscreenElement) {
            if (docEl.requestFullscreen) docEl.requestFullscreen();
            else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
            else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen();
        }

        const job = {
            articleId: option.article.id,
            articleName: option.article.name,
            articleCode: option.article.articleCode,
            setupId: option.setup.id,
            setupName: option.setup.name,
            startTime: new Date().toISOString(),
            operator: user.name
        };
        // Background assign
        machineService.assignJob(machine.id, job).catch(console.error);
    };

    // Filter files based on type/category
    const setupTools = useMemo(() => setup?.tools?.sort((a, b) => a.order - b.order) || [], [setup]);
    const setupImages = useMemo(() => setup?.fixture?.images || [], [setup]);
    const drawings = useMemo(() => article?.files || [], [article]);

    const hasImages = setupImages.length > 0;
    const hasDrawings = drawings.length > 0;

    // Smart File Selection: Prefer 'Tekening' category
    const activeDrawing = useMemo(() => {
        if (!hasDrawings) return null;
        return drawings.find((f: ArticleFile) => (f.fileRole?.toString() || '').toLowerCase().includes('tekening'))
            || drawings.find((f: ArticleFile) => f.type === 'application/pdf')
            || drawings[0];
    }, [drawings, hasDrawings]);

    // --- RESOLVE FILE URLS FROM DMS ---
    // ArticleFile.url can be empty; the actual content is in DMSDocument via documentId
    const [resolvedDrawingUrl, setResolvedDrawingUrl] = useState<string | null>(null);
    const [resolvedFixtureUrls, setResolvedFixtureUrls] = useState<Record<string, string>>({});
    const lastResolvedDrawingRef = useRef<string | null>(null);

    // Resolve the active drawing URL — only when the actual file changes
    const drawingId = activeDrawing?.id || null;
    const drawingDocId = activeDrawing?.documentId || null;
    const drawingDirectUrl = activeDrawing?.url || null;

    useEffect(() => {
        const key = `${drawingId}:${drawingDocId}`;

        // If drawing changed, always reset first
        if (lastResolvedDrawingRef.current !== key) {
            setResolvedDrawingUrl(null);
        }

        // Skip if we already resolved this exact drawing
        if (lastResolvedDrawingRef.current === key && resolvedDrawingUrl) return;

        if (!drawingId) {
            lastResolvedDrawingRef.current = null;
            return;
        }

        // If there's already a direct URL, use it
        if (drawingDirectUrl) {
            lastResolvedDrawingRef.current = key;
            setResolvedDrawingUrl(drawingDirectUrl);
            return;
        }

        // Otherwise resolve from DMS
        if (drawingDocId) {
            documentService.getDocumentById(drawingDocId)
                .then(doc => {
                    if (doc?.url) {
                        lastResolvedDrawingRef.current = key;
                        setResolvedDrawingUrl(doc.url);
                    }
                })
                .catch(err => console.warn('Could not resolve drawing URL:', err));
        }
    }, [drawingId, drawingDocId, drawingDirectUrl]);

    // Resolve fixture image URLs
    useEffect(() => {
        if (!setupImages.length) { setResolvedFixtureUrls({}); return; }

        const resolve = async () => {
            const resolved: Record<string, string> = {};
            for (const img of setupImages) {
                if (img.url) {
                    resolved[img.id] = img.url;
                } else if (img.documentId) {
                    try {
                        const doc = await documentService.getDocumentById(img.documentId);
                        if (doc?.url) resolved[img.id] = doc.url;
                    } catch (_) {}
                }
            }
            setResolvedFixtureUrls(resolved);
        };
        resolve();
    }, [setupImages]);

    // Initial View Logic
    useEffect(() => {
        if (hasDrawings && !hasImages) setViewMode('DRAWING');
        else if (!hasDrawings && hasImages) setViewMode('IMAGE');
        else if (hasDrawings && hasImages) {
            if (drawings.some((f: ArticleFile) => (f.fileRole?.toString() || '').toLowerCase().includes('tekening'))) {
                setViewMode('DRAWING');
            }
        }
    }, [hasDrawings, hasImages]);

    // Safe PDF BLOB URL for inline viewing
    const isDrawingPdf = activeDrawing?.type === 'application/pdf';
    const safePdfUrl = usePdfBlobUrl(isDrawingPdf ? resolvedDrawingUrl : null);

    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        document.addEventListener('webkitfullscreenchange', handleFsChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange);
            document.removeEventListener('webkitfullscreenchange', handleFsChange);
        };
    }, []);

    // Close logistics menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (logisticsContainerRef.current && !logisticsContainerRef.current.contains(event.target as Node)) {
                setShowLogisticsMenu(false);
            }
        };
        if (showLogisticsMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showLogisticsMenu]);

    // --- HANDLERS ---

    const handleStopClick = () => {
        setShowStopModal(true);
    };

    const confirmStopJob = async () => {
        if (!machine) return;
        setIsStopping(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            await machineService.clearJob(machine.id);
            setShowStopModal(false);
            setIsStopping(false);
            addNotification('SUCCESS', 'Order gestopt', 'U kunt nu een nieuwe order selecteren.');
        } catch (e) {
            addNotification('ERROR', 'Oeps', 'Fout bij stoppen order.');
            setIsStopping(false);
        }
    };

    const handleFullscreenToggle = () => {
        const docEl = dashboardRef.current as any || document.documentElement as any;
        const _document = document as any;

        if (!document.fullscreenElement && !_document.webkitFullscreenElement) {
            if (docEl.requestFullscreen) docEl.requestFullscreen();
            else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
            else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (_document.webkitExitFullscreen) _document.webkitExitFullscreen();
            else if (_document.msExitFullscreen) _document.msExitFullscreen();
        }
    };

    const handleSupportRequest = (type: SupportType, extraData: any) => {
        if (!machine) return;

        const requesterName = machine.activeJob?.operator || user?.name || 'Onbekende Operator';

        const req: SupportRequest = {
            id: Date.now().toString(),
            machineId: machine.id,
            type,
            status: SupportStatus.PENDING,
            requestDate: new Date().toISOString(),
            requester: requesterName,
            ...extraData
        };

        db.addSupportRequest(req);
        setActiveSupportModal(null); // Close modal

        addNotification('SUCCESS', 'Oproep verstuurd', `Support aanvraag: ${type}`, NotificationTrigger.NEW_TICKET);
    };

    // Helper to open modal based on type
    const setActiveSupportModal = (type: SupportType | null) => {
        setActiveSupportType(type);
    };

    // --- RENDERING ---
    if (!machine) return <div className="bg-white text-slate-800 h-screen flex items-center justify-center">Laden...</div>;

    const noJobView = !activeJobData || !setup || !article;
    
    // Template fields extraction for the Instruction Tab (Safely checked)
    const displayFields = setup?.frozenFields || [];
    const templateData = setup?.templateData || {};

    return (
        <div ref={dashboardRef} className={`bg-slate-50 text-slate-800 flex flex-col font-sans touch-pan-x selection:bg-blue-500/30 overflow-hidden ${noJobView ? 'w-full h-full relative' : 'fixed inset-0 z-[100]'}`}>
            {noJobView ? (
            <div className="w-full h-full p-8 flex flex-col items-center custom-scrollbar overflow-y-auto">
                {/* Header for No Job State */}
                <div className="w-full max-w-5xl flex justify-between items-center mb-10">
                    <button onClick={() => navigate(`/machine/${id}`)} className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 transition-colors flex items-center gap-2 shadow-sm">
                        <ArrowLeft size={20} /> <span className="font-bold text-sm tracking-widest uppercase text-slate-600">Machine Overzicht</span>
                    </button>
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Actieve Machine</div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">{machine?.machineNumber} - {machine?.name}</h1>
                    </div>
                </div>

                <div className="w-full max-w-5xl bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl mb-8 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                        <Briefcase size={40} className="text-blue-500" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tight italic mb-2">Setup Selecteren</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">Zoek en selecteer een setup om de productie-omgeving voor deze machine te starten.</p>
                    
                    <div className="relative w-full max-w-2xl mx-auto z-10">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Zoek op artikelnummer of omschrijving..." 
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-slate-800 border-2 border-slate-200 font-bold outline-none focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                    {availableJobs.map((opt, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-200 hover:border-blue-500 transition-all group shadow-sm flex flex-col cursor-pointer hover:shadow-md" onClick={(e) => handleStartJob(e, opt)}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{opt.article.articleCode}</div>
                                    <h4 className="text-lg font-black text-slate-800 uppercase italic truncate pr-2">{opt.article.name}</h4>
                                </div>
                                <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded border border-green-200 uppercase shrink-0">Rev {opt.article.revision}</span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500 mb-6 mt-auto">
                                <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 truncate max-w-[120px]">{opt.opDesc}</span>
                                <ArrowRight size={10} className="shrink-0 text-slate-400" />
                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 truncate max-w-[120px]">{opt.setup.name}</span>
                            </div>

                            <button className="w-full py-3 bg-slate-100 group-hover:bg-blue-600 text-slate-600 group-hover:text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all">
                                <PlayCircle size={16} /> Start Setup
                            </button>
                        </div>
                    ))}
                    {availableJobs.length === 0 && (
                        <div className="col-span-full text-center py-12 text-slate-400 font-bold text-sm tracking-widest uppercase">
                            Geen gekoppelde setups gevonden.
                        </div>
                    )}
                </div>
            </div>
            ) : (
            <div className="w-full h-full flex flex-col overflow-hidden bg-slate-50">
            {/* 1. HEADER */}
            <header className={`flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0 z-40 h-20 transition-all shadow-sm ${focusMode && isFullscreen ? '-mt-20 opacity-0 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-6 flex-1 min-w-0">
                    <button onClick={() => navigate(`/machine/${id}`)} className="p-3 shrink-0 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-baseline gap-4 truncate">
                        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter shrink-0">{machine.machineNumber} - {machine.name}</h1>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 hidden md:block"></div>
                        <div className="text-xl font-bold text-slate-600 truncate hidden md:block">
                            {article.drawingNumber || 'Geen Tekening Nr'} / REV {article.revision || '-'} / {article.name}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={handleFullscreenToggle}
                        className={`p-3 rounded-full transition-all border shadow-sm ${isFullscreen ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-100'}`}
                        title={isFullscreen ? "Verlaat Fullscreen" : "Fullscreen Modus"}
                    >
                        {isFullscreen ? <X size={20} /> : <Maximize size={20} />}
                    </button>

                    {/* LOGISTICS DROPDOWN */}
                    <div className="relative" ref={logisticsContainerRef}>
                        <button
                            onClick={() => setShowLogisticsMenu(!showLogisticsMenu)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold uppercase text-xs tracking-widest border transition-all active:scale-95 ${showLogisticsMenu ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm'}`}
                        >
                            <Truck size={18} /> <span className="hidden lg:inline">Logistiek</span>
                        </button>

                        {showLogisticsMenu && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden z-50 flex flex-col animate-in zoom-in-95 duration-200">
                                <button onClick={() => { setActiveSupportType(SupportType.EMPTY_BIN); setShowLogisticsMenu(false); }} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left">
                                    <div className="p-2 bg-teal-50 text-teal-600 border border-teal-100 rounded-2xl"><Container size={20} /></div>
                                    <div className="text-left"><span className="block font-bold text-slate-800 text-sm">Lege bak</span><span className="text-[10px] text-slate-500 uppercase">Aanvragen</span></div>
                                </button>
                                <button onClick={() => { setActiveSupportType(SupportType.SWARF); setShowLogisticsMenu(false); }} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left">
                                    <div className="p-2 bg-orange-50 text-orange-600 border border-orange-100 rounded-2xl"><Recycle size={20} /></div>
                                    <div className="text-left"><span className="block font-bold text-slate-800 text-sm">Spanenbak vol</span><span className="text-[10px] text-slate-500 uppercase">Afvoeren</span></div>
                                </button>
                                <button onClick={() => { setActiveSupportType(SupportType.COOLANT); setShowLogisticsMenu(false); }} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left">
                                    <div className="p-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl"><Droplet size={20} /></div>
                                    <div className="text-left"><span className="block font-bold text-slate-800 text-sm">Leibaan olie</span><span className="text-[10px] text-slate-500 uppercase">Bijvullen</span></div>
                                </button>
                                <button onClick={() => { setActiveSupportType(SupportType.MATERIAL); setShowLogisticsMenu(false); }} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left">
                                    <div className="p-2 bg-purple-50 text-purple-600 border border-purple-100 rounded-2xl"><Box size={20} /></div>
                                    <div className="text-left"><span className="block font-bold text-slate-800 text-sm">Nieuw materiaal</span><span className="text-[10px] text-slate-500 uppercase">Aanvoer</span></div>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* WISSEL ORDER */}
                    <button
                        onClick={handleStopClick}
                        className="flex items-center gap-2 px-5 py-3 rounded-full font-bold uppercase text-xs tracking-widest border transition-all active:scale-95 bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm"
                        title="Zet huidig werk stop en selecteer een nieuwe order"
                    >
                        <RefreshCw size={18} /> <span className="hidden lg:inline">Wissel Order</span>
                    </button>

                    <button onClick={handleStopClick} className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-black uppercase text-xs tracking-widest shadow-lg shadow-red-500/30 transition-all active:scale-95 ml-4">
                        <StopCircle size={20} /> <span className="hidden lg:inline">Order Beëindigen</span>
                    </button>
                </div>
            </header>

            {/* 2. MAIN SPLIT VIEW */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT: VISUAL */}
                <div className={`relative flex flex-col bg-slate-100 ${focusMode ? 'w-full' : 'w-2/3 border-r border-slate-200'}`}>

                    {/* Visual Controls Overlay - TOP LEFT */}
                    <div className="absolute top-4 left-4 z-30 flex gap-2">
                        <button
                            onClick={() => setFocusMode(!focusMode)}
                            className="p-3 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl border border-slate-200 shadow-sm transition-all"
                            title={focusMode ? "Toon Zijbalk" : "Focus Modus (Verberg Zijbalk)"}
                        >
                            {focusMode ? <Shrink size={24} /> : <Expand size={24} />}
                        </button>

                        {focusMode && (
                            <div className="bg-white rounded-2xl p-1 border border-slate-200 flex shadow-sm">
                                {hasDrawings && (
                                    <button onClick={() => setViewMode('DRAWING')} className={`p-3 rounded-[2rem] transition-all ${viewMode === 'DRAWING' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-800'}`}>
                                        <FileText size={20} />
                                    </button>
                                )}
                                {hasImages && (
                                    <button onClick={() => setViewMode('IMAGE')} className={`p-3 rounded-[2rem] transition-all ${viewMode === 'IMAGE' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-800'}`}>
                                        <ImageIcon size={20} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* View Switcher - TOP RIGHT */}
                    {!focusMode && (
                        <div className="absolute top-4 right-4 z-30 flex bg-white p-1 rounded-full border border-slate-200 shadow-sm">
                            {hasDrawings && (
                                <button onClick={() => setViewMode('DRAWING')} className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'DRAWING' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <FileText size={16} /> Tekening
                                </button>
                            )}
                            {hasImages && (
                                <button onClick={() => setViewMode('IMAGE')} className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'IMAGE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <ImageIcon size={16} /> Foto's
                                </button>
                            )}
                        </div>
                    )}

                    {/* CONTENT VIEWER */}
                    <div className="flex-1 relative overflow-hidden bg-transparent">
                        {viewMode === 'DRAWING' ? (
                            activeDrawing ? (
                                safePdfUrl ? (
                                    <div key={drawingId} className="absolute inset-0">
                                        <iframe src={`${safePdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="w-full h-full border-none" title="Drawing" />
                                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/90 to-transparent pointer-events-none"></div>
                                        <button
                                            onClick={() => setPreviewFile(activeDrawing)}
                                            className="absolute bottom-6 flex justify-center w-full z-40"
                                        >
                                            <div className="bg-white border border-slate-200 text-slate-800 px-8 py-4 rounded-full text-sm font-black uppercase shadow-xl transition-transform active:scale-95 flex items-center gap-3 hover:bg-slate-50">
                                                <Maximize size={20} className="text-blue-500" /> Tekening Fullscreen
                                            </div>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-slate-400 flex flex-col items-center gap-4 animate-pulse">
                                            <Loader2 size={48} className="animate-spin" />
                                            <p className="font-bold text-sm uppercase tracking-widest">Tekening laden...</p>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-slate-600 flex flex-col items-center">
                                        <FileText size={64} className="mb-4 opacity-20" />
                                        <p className="font-bold">Geen tekening beschikbaar</p>
                                    </div>
                                </div>
                            )
                        ) : (
                            hasImages ? (
                                <div className="absolute inset-0 p-4 flex items-center justify-center cursor-zoom-in" onClick={() => setPreviewFile(setupImages[0])}>
                                    {resolvedFixtureUrls[setupImages[0]?.id] ? (
                                        <img
                                            src={resolvedFixtureUrls[setupImages[0].id]}
                                            className="max-w-full max-h-full object-contain shadow-2xl rounded-2xl"
                                            alt="Setup"
                                        />
                                    ) : (
                                        <div className="text-slate-400 flex flex-col items-center gap-4 animate-pulse">
                                            <Loader2 size={48} className="animate-spin" />
                                            <p className="font-bold text-sm uppercase tracking-widest">Afbeelding laden...</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-slate-600 flex flex-col items-center">
                                        <ImageIcon size={64} className="mb-4 opacity-20" />
                                        <p className="font-bold">Geen foto's beschikbaar</p>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* RIGHT: DATA TABS (35%) - Hidden in Focus Mode */}
                <div className={`flex flex-col bg-white border-l border-slate-200 ${focusMode ? 'w-0 opacity-0 overflow-hidden' : 'w-1/3'}`}>

                    {/* SEGMENTED TABS */}
                    <div className="flex gap-2 p-3 bg-slate-50 border-b border-slate-200">
                        <button onClick={() => setActiveTab('INFO')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-[2rem] transition-all shadow-sm border ${activeTab === 'INFO' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800'}`}>
                            <Info size={16} /> Info
                        </button>
                        <button onClick={() => setActiveTab('FIXTURE')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-[2rem] transition-all shadow-sm border ${activeTab === 'FIXTURE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800'}`}>
                            <Hammer size={16} /> Opspannen
                        </button>
                        <button onClick={() => setActiveTab('TOOLS')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-[2rem] transition-all shadow-sm border ${activeTab === 'TOOLS' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800'}`}>
                            <Wrench size={16} /> Gereedschap
                        </button>
                        <button onClick={() => setActiveTab('INSTRUCTION')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-[2rem] transition-all shadow-sm border ${activeTab === 'INSTRUCTION' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800'}`}>
                            <ClipboardList size={16} /> Instructie
                        </button>
                    </div>

                    {/* TAB CONTENT */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                        {/* TAB: FIXTURE (Opspannen) */}
                        {activeTab === 'FIXTURE' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Opspan Data */}
                                {displayFields.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                            <Hammer size={14} /> Opspan Specificaties
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {displayFields.filter(f => f.type !== 'header').map(field => {
                                                const val = templateData[field.key];
                                                if (!val) return null;
                                                return (
                                                    <div key={field.key} className="bg-slate-50 border border-slate-200 p-3 rounded-[2rem] flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-500 uppercase">{field.label}</span>
                                                        <span className="text-sm font-bold text-slate-800 max-w-[50%] text-right whitespace-normal break-words">{val.toString()} {field.unit}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Opspan Documenten (afbeeldingen + PDF's) */}
                                {hasImages && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                            <ImageIcon size={14} /> Opspan Documenten
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {setupImages.map((img: ArticleFile) => {
                                                const imgUrl = resolvedFixtureUrls[img.id];
                                                const isImgType = img.type?.startsWith('image/');
                                                return (
                                                    <div
                                                        key={img.id}
                                                        onClick={() => setPreviewFile(img)}
                                                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
                                                    >
                                                        {imgUrl && isImgType ? (
                                                            <img src={imgUrl} alt={img.name || 'Opspanning'} className="w-full h-32 object-cover" />
                                                        ) : imgUrl && img.type === 'application/pdf' ? (
                                                            <div className="w-full h-32 bg-slate-50 flex flex-col items-center justify-center gap-2">
                                                                <FileText size={32} className="text-red-500" />
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">PDF</span>
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-32 bg-slate-50 flex items-center justify-center">
                                                                <Loader2 size={24} className="animate-spin text-slate-300" />
                                                            </div>
                                                        )}
                                                        <div className="p-3">
                                                            <p className="text-xs font-bold text-slate-700 truncate">{img.name || 'Document'}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase">{img.type || 'Onbekend'}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {!hasImages && displayFields.length === 0 && (
                                    <div className="text-slate-400 italic text-sm text-center py-10">Geen opspanspecificaties of documenten beschikbaar voor deze setup.</div>
                                )}
                            </div>
                        )}

                        {/* TAB: INSTRUCTIE */}
                        {activeTab === 'INSTRUCTION' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

                                {/* Checklist Steps */}
                                <div>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <CheckSquare size={14} /> Werkstappen
                                    </h3>
                                    <div className="space-y-2">
                                        {setup.steps?.sort((a, b) => a.order - b.order).map((step) => {
                                            const isChecked = checkedSteps[step.id];
                                            return (
                                                <button
                                                    key={step.id}
                                                    onClick={() => setCheckedSteps(prev => ({ ...prev, [step.id]: !isChecked }))}
                                                    className={`w-full text-left p-4 rounded-[2rem] border transition-all flex items-start gap-4 active:scale-[0.98] ${isChecked ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-[2rem] flex items-center justify-center shrink-0 border transition-all mt-0.5 ${isChecked ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 bg-slate-50 text-slate-300'}`}>
                                                        {isChecked && <CheckSquare size={14} />}
                                                    </div>
                                                    <div className={`text-sm font-medium leading-snug whitespace-pre-wrap ${isChecked ? 'text-green-600 line-through opacity-70' : 'text-slate-700'}`}>
                                                        {step.description}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {(!setup.steps || setup.steps.length === 0) && <div className="text-slate-400 italic text-sm text-center py-4">Geen specifieke stappen.</div>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: TOOLS (INTERACTIVE LIST) */}
                        {activeTab === 'TOOLS' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                {setupTools.map((tool) => (
                                    <div
                                        key={tool.id}
                                        onClick={() => setSelectedTool(tool)}
                                        className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 p-4 rounded-[2rem] flex gap-4 items-center cursor-pointer transition-all active:scale-[0.98] shadow-sm"
                                    >
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-lg text-blue-600 border border-slate-200 shadow-inner">
                                            {tool.order}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800 text-sm mb-1 truncate">{tool.description}</div>
                                            <div className="flex gap-2">
                                                {tool.holder && (
                                                    <div className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 border border-slate-200 truncate">
                                                        {tool.holder}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-blue-500 font-bold self-center">Details &rarr;</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {setupTools.length === 0 && <div className="text-slate-400 italic text-sm text-center py-10">Geen gereedschappen gedefinieerd.</div>}
                            </div>
                        )}

                        {/* TAB 3: INFO */}
                        {activeTab === 'INFO' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Artikel Informatie</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between border-b border-slate-100 pb-2">
                                            <span className="text-sm text-slate-500">Naam</span>
                                            <span className="text-sm font-bold text-slate-800 text-right">{article.name}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-100 pb-2">
                                            <span className="text-sm text-slate-500">Revisie</span>
                                            <span className="text-sm font-bold text-slate-800 text-right">{article.revision}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-100 pb-2">
                                            <span className="text-sm text-slate-500">Tekening Nr</span>
                                            <span className="text-sm font-bold text-slate-800 text-right">{article.drawingNumber}</span>
                                        </div>
                                        {article.customer && (
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-sm text-slate-500">Klant</span>
                                                <span className="text-sm font-bold text-slate-800 text-right">{article.customer}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Bestanden</h4>
                                    <div className="space-y-2">
                                        {article.files?.map((file: ArticleFile) => (
                                            <button key={file.id} onClick={() => setPreviewFile(file)} className="w-full flex items-center gap-3 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-colors text-left group shadow-sm">
                                                <div className="p-2 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600 transition-colors">
                                                    {file.type === 'application/pdf' ? <FileText size={18} /> : <ImageIcon size={18} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-slate-800 truncate">{file.name}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase">{file.fileRole?.toString() || 'Bijlage'}</div>
                                                </div>
                                                <ScanEye size={16} className="ml-auto text-slate-500 group-hover:text-blue-400" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* CUSTOM STOP MODAL */}
            {showStopModal && (
                <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white border-2 border-red-200 w-full max-w-lg rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 bg-red-100 w-40 h-40 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                            <div className={`p-5 bg-red-50 rounded-full border border-red-200`}>
                                {isStopping ? <Loader2 size={40} className="text-red-500 animate-spin" /> : <AlertTriangle size={40} className="text-red-500" />}
                            </div>

                            <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight mb-2">Order Beëindigen?</h3>
                                <p className="text-slate-500 font-medium">Weet u zeker dat u de huidige order <strong>{article.articleCode}</strong> wilt stoppen?</p>
                            </div>

                            <div className="flex gap-4 w-full pt-4">
                                <button
                                    onClick={() => setShowStopModal(false)}
                                    disabled={isStopping}
                                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold uppercase text-xs tracking-widest transition-colors disabled:opacity-50"
                                >
                                    Annuleren
                                </button>
                                <button
                                    onClick={confirmStopJob}
                                    disabled={isStopping}
                                    className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isStopping ? 'Bezig...' : 'Ja, Stop Order'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
            )}

            {/* TOOL DETAIL MODAL */}
            {selectedTool && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
                    <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem]">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-3xl text-white shadow-lg shadow-blue-200">
                                    {selectedTool.order}
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Gereedschap Detail</div>
                                    <h3 className="text-2xl font-black text-slate-800">{selectedTool.description}</h3>
                                </div>
                            </div>
                            <button onClick={() => setSelectedTool(null)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Matrix Code</span>
                                    <span className="text-lg font-mono font-bold text-blue-600">{selectedTool.matrixCode || '-'}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Assembly ID</span>
                                    <span className="text-lg font-mono font-bold text-slate-800">{selectedTool.assemblyCode || '-'}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1"><Ruler size={10} /> Snijlengte</span>
                                    <span className="text-lg font-bold text-slate-800">{selectedTool.cuttingLength || '-'}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vrijloop</span>
                                    <span className="text-lg font-bold text-slate-800">{selectedTool.clearance || '-'}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Houder</span>
                                    <span className="text-lg font-bold text-slate-800">{selectedTool.holder || '-'}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1"><Thermometer size={10} /> Interne Koeling</span>
                                    <span className={`text-lg font-black ${selectedTool.internalCooling ? 'text-green-600' : 'text-slate-400'}`}>
                                        {selectedTool.internalCooling ? 'JA' : 'NEE'}
                                    </span>
                                </div>
                            </div>

                            {selectedTool.toolData && Object.keys(selectedTool.toolData).length > 0 && (
                                <div className="border-t border-slate-200 pt-6">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <Binary size={14} className="text-purple-500" /> Extra Data
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(selectedTool.toolData).map(([key, value]) => (
                                            <div key={key} className="bg-slate-50 p-3 rounded-[2rem] border border-slate-200">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">{key}</span>
                                                <span className="text-sm font-bold text-slate-700">{String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-[2.5rem]">
                            <button onClick={() => setSelectedTool(null)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase text-xs tracking-widest transition-colors">
                                Sluiten
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SupportRequestModals activeType={activeSupportType} onClose={() => setActiveSupportModal(null)} onSubmit={handleSupportRequest} />
            <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
        </div>
    );
};