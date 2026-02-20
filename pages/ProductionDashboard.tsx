import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTable } from '../hooks/useTable';
import { machineService } from '../services/db/machineService';
import { KEYS } from '../services/db/core';
import { Machine, Article, SetupVariant, SupportType, SupportStatus, ArticleFile, ArticleTool, NotificationTrigger, SupportRequest } from '../types';
import { db } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { FilePreviewModal } from '../components/ui/FilePreviewModal';
import { SupportRequestModals } from '../components/machine/SupportRequestModals';
import { 
    ArrowLeft, StopCircle, CheckSquare, 
    Image as ImageIcon, FileText, Maximize, Minimize,
    Wrench, Info, Truck, Box, Expand, Shrink,
    ClipboardList, Hammer, ScanEye, Container, RefreshCw, AlertTriangle, Loader2,
    X, Ruler, Binary, Thermometer, Recycle, Droplet
} from 'lucide-react';

type DashboardTab = 'INSTRUCTION' | 'TOOLS' | 'INFO';

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
    
    // --- DERIVED DATA ---
    const machine = useMemo(() => machines.find(m => m.id === id), [machines, id]);
    
    const activeJobData = useMemo(() => {
        if (!machine?.activeJob) return null;
        const article = articles.find(a => a.id === machine.activeJob!.articleId);
        if (!article) return null;
        
        let foundSetup: SetupVariant | null = null;
        for (const op of article.operations) {
            const s = op.setups.find(s => s.id === machine.activeJob!.setupId);
            if (s) { foundSetup = s; break; }
        }
        return { article, setup: foundSetup };
    }, [machine, articles]);

    const { article, setup } = activeJobData || {};

    // Filter files based on type/category
    const setupTools = useMemo(() => setup?.tools?.sort((a,b) => a.order - b.order) || [], [setup]);
    const setupImages = useMemo(() => setup?.fixture?.images?.filter(f => f.type.startsWith('image/')) || [], [setup]);
    const drawings = useMemo(() => article?.files || [], [article]);
    
    const hasImages = setupImages.length > 0;
    const hasDrawings = drawings.length > 0;

    // Smart File Selection: Prefer 'Tekening' category
    const activeDrawing = useMemo(() => {
        if (!hasDrawings) return null;
        // Priority: 1. Category contains 'tekening', 2. PDF, 3. First available
        return drawings.find(f => (f.category || '').toLowerCase().includes('tekening')) 
            || drawings.find(f => f.type === 'application/pdf') 
            || drawings[0];
    }, [drawings, hasDrawings]);

    // Initial View Logic
    useEffect(() => {
        if (hasDrawings && !hasImages) setViewMode('DRAWING');
        else if (!hasDrawings && hasImages) setViewMode('IMAGE');
        else if (hasDrawings && hasImages) {
            // If we have a dedicated drawing file, show it first
            if (drawings.some(f => (f.category || '').toLowerCase().includes('tekening'))) {
                setViewMode('DRAWING');
            }
        }
    }, [hasDrawings, hasImages]);

    // Force Dark Mode for this view
    useEffect(() => {
        document.documentElement.classList.add('dark');
        
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
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
            // Short delay to allow UI update
            await new Promise(resolve => setTimeout(resolve, 500));
            await machineService.clearJob(machine.id);
            navigate(`/machine/${id}`);
        } catch (e) {
            alert("Fout bij stoppen order.");
            setIsStopping(false);
        }
    };

    const handleFullscreenToggle = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
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
    if (!machine) return <div className="bg-black text-white h-screen flex items-center justify-center">Laden...</div>;
    
    if (!activeJobData || !setup || !article) return (
        <div className="bg-slate-900 text-white h-screen flex flex-col items-center justify-center gap-6">
            <div className="p-6 bg-slate-800 rounded-full"><FileText size={48} className="text-slate-500" /></div>
            <h1 className="text-2xl font-bold">Geen actieve order geladen</h1>
            <p className="text-slate-400 max-w-md text-center">Start een setup vanuit de machine pagina om het operator dashboard te gebruiken.</p>
            <button onClick={() => navigate(`/machine/${id}`)} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-lg transition-all">Terug naar Machine</button>
        </div>
    );

    // Template fields extraction for the Instruction Tab
    const displayFields = setup.frozenFields || [];
    const templateData = setup.templateData || {};

    return (
        // MAIN CONTAINER
        <div className={`flex flex-col bg-[#0b1121] text-slate-200 overflow-hidden font-sans touch-pan-x selection:bg-blue-500/30 ${isFullscreen ? 'fixed inset-0 z-[100] w-screen h-screen' : 'h-screen'}`}>
            
            {/* 1. HEADER */}
            <header className={`flex items-center justify-between px-6 py-4 bg-slate-900/95 border-b border-slate-800 shrink-0 z-20 h-20 transition-all ${focusMode && isFullscreen ? '-mt-20 opacity-0 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate(`/machine/${id}`)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                            <span className="text-blue-500">{machine.machineNumber}</span>
                            <span>•</span>
                            <span>{setup.name}</span>
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none truncate max-w-md">{article.articleCode}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleFullscreenToggle}
                        className={`p-3 rounded-xl transition-all border ${isFullscreen ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                        title={isFullscreen ? "Verlaat Fullscreen" : "Fullscreen Modus"}
                    >
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>

                    {/* LOGISTICS DROPDOWN */}
                    <div className="relative" ref={logisticsContainerRef}>
                        <button 
                            onClick={() => setShowLogisticsMenu(!showLogisticsMenu)} 
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-widest border transition-all active:scale-95 ${showLogisticsMenu ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}
                        >
                            <Truck size={18} /> <span className="hidden lg:inline">Logistiek</span>
                        </button>
                        
                        {showLogisticsMenu && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col animate-in zoom-in-95 duration-200">
                                <button onClick={() => { setActiveSupportType(SupportType.EMPTY_BIN); setShowLogisticsMenu(false); }} className="flex items-center gap-4 p-4 hover:bg-slate-700 transition-colors border-b border-slate-700/50 text-left">
                                    <div className="p-2 bg-teal-500/10 text-teal-500 rounded-lg"><Container size={20}/></div>
                                    <div className="text-left"><span className="block font-bold text-white text-sm">Lege bak</span><span className="text-[10px] text-slate-400 uppercase">Aanvragen</span></div>
                                </button>
                                <button onClick={() => { setActiveSupportType(SupportType.SWARF); setShowLogisticsMenu(false); }} className="flex items-center gap-4 p-4 hover:bg-slate-700 transition-colors border-b border-slate-700/50 text-left">
                                    <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg"><Recycle size={20}/></div>
                                    <div className="text-left"><span className="block font-bold text-white text-sm">Spanenbak vol</span><span className="text-[10px] text-slate-400 uppercase">Afvoeren</span></div>
                                </button>
                                <button onClick={() => { setActiveSupportType(SupportType.COOLANT); setShowLogisticsMenu(false); }} className="flex items-center gap-4 p-4 hover:bg-slate-700 transition-colors border-b border-slate-700/50 text-left">
                                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Droplet size={20}/></div>
                                    <div className="text-left"><span className="block font-bold text-white text-sm">Leibaan olie</span><span className="text-[10px] text-slate-400 uppercase">Bijvullen</span></div>
                                </button>
                                <button onClick={() => { setActiveSupportType(SupportType.MATERIAL); setShowLogisticsMenu(false); }} className="flex items-center gap-4 p-4 hover:bg-slate-700 transition-colors text-left">
                                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><Box size={20}/></div>
                                    <div className="text-left"><span className="block font-bold text-white text-sm">Nieuw materiaal</span><span className="text-[10px] text-slate-400 uppercase">Aanvoer</span></div>
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={handleStopClick} className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-900/20 transition-all active:scale-95 ml-4">
                        <StopCircle size={20} /> Stop Order
                    </button>
                </div>
            </header>

            {/* 2. MAIN SPLIT VIEW */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* LEFT: VISUAL */}
                <div className={`transition-all duration-300 relative flex flex-col bg-black/50 ${focusMode ? 'w-full' : 'w-2/3 border-r border-slate-800'}`}>
                    
                    {/* Visual Controls Overlay - TOP LEFT */}
                    <div className="absolute top-4 left-4 z-30 flex gap-2">
                        <button 
                            onClick={() => setFocusMode(!focusMode)} 
                            className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white backdrop-blur rounded-xl border border-white/10 shadow-lg transition-all"
                            title={focusMode ? "Toon Zijbalk" : "Focus Modus (Verberg Zijbalk)"}
                        >
                            {focusMode ? <Shrink size={24} /> : <Expand size={24} />}
                        </button>

                        {focusMode && (
                            <div className="bg-black/60 backdrop-blur rounded-lg p-1 border border-white/10 flex">
                                {hasDrawings && (
                                    <button onClick={() => setViewMode('DRAWING')} className={`p-3 rounded-lg transition-all ${viewMode === 'DRAWING' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}>
                                        <FileText size={20} />
                                    </button>
                                )}
                                {hasImages && (
                                    <button onClick={() => setViewMode('IMAGE')} className={`p-3 rounded-lg transition-all ${viewMode === 'IMAGE' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}>
                                        <ImageIcon size={20} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* View Switcher - TOP RIGHT */}
                    {!focusMode && (
                        <div className="absolute top-4 right-4 z-30 flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-xl">
                            {hasDrawings && (
                                <button onClick={() => setViewMode('DRAWING')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'DRAWING' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <FileText size={16} /> Tekening
                                </button>
                            )}
                            {hasImages && (
                                <button onClick={() => setViewMode('IMAGE')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'IMAGE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <ImageIcon size={16} /> Foto's
                                </button>
                            )}
                        </div>
                    )}

                    {/* CONTENT VIEWER */}
                    <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#050914]">
                        {viewMode === 'DRAWING' ? (
                            activeDrawing ? (
                                <div className="w-full h-full relative group">
                                    <iframe src={`${activeDrawing.url}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full border-none" title="Drawing" />
                                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
                                    <button 
                                        onClick={() => setPreviewFile(activeDrawing)}
                                        className="absolute bottom-6 right-6 bg-white text-black px-6 py-3 rounded-full text-xs font-black uppercase shadow-xl transition-transform active:scale-95 flex items-center gap-2 opacity-0 group-hover:opacity-100 duration-200"
                                    >
                                        <Maximize size={16} /> Fullscreen PDF
                                    </button>
                                </div>
                            ) : (
                                <div className="text-slate-600 flex flex-col items-center">
                                    <FileText size={64} className="mb-4 opacity-20" />
                                    <p className="font-bold">Geen tekening beschikbaar</p>
                                </div>
                            )
                        ) : (
                            hasImages ? (
                                <div className="w-full h-full p-4 flex items-center justify-center cursor-zoom-in" onClick={() => setPreviewFile(setupImages[0])}>
                                    <img 
                                        src={setupImages[0].url} 
                                        className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" 
                                        alt="Setup" 
                                    />
                                </div>
                            ) : (
                                <div className="text-slate-600 flex flex-col items-center">
                                    <ImageIcon size={64} className="mb-4 opacity-20" />
                                    <p className="font-bold">Geen foto's beschikbaar</p>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* RIGHT: DATA TABS (35%) - Hidden in Focus Mode */}
                <div className={`flex flex-col bg-slate-900 border-l border-slate-800 transition-all duration-300 ${focusMode ? 'w-0 opacity-0 overflow-hidden' : 'w-1/3'}`}>
                    
                    {/* SEGMENTED TABS */}
                    <div className="flex gap-2 p-3 bg-slate-950 border-b border-slate-800">
                        <button onClick={() => setActiveTab('INSTRUCTION')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-lg transition-all shadow-sm ${activeTab === 'INSTRUCTION' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                            <ClipboardList size={16} /> Instructie
                        </button>
                        <button onClick={() => setActiveTab('TOOLS')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-lg transition-all shadow-sm ${activeTab === 'TOOLS' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                            <Wrench size={16} /> Gereedschap
                        </button>
                        <button onClick={() => setActiveTab('INFO')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-lg transition-all shadow-sm ${activeTab === 'INFO' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                            <Info size={16} /> Info
                        </button>
                    </div>

                    {/* TAB CONTENT */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                        
                        {/* TAB 1: INSTRUCTIE */}
                        {activeTab === 'INSTRUCTION' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Opspan Data */}
                                {displayFields.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                            <Hammer size={14} /> Opspan Specificaties
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {displayFields.filter(f => f.type !== 'header').map(field => {
                                                const val = templateData[field.key];
                                                if (!val) return null;
                                                return (
                                                    <div key={field.key} className="bg-slate-800/50 border border-slate-700 p-3 rounded-xl flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-400 uppercase">{field.label}</span>
                                                        <span className="text-sm font-bold text-white">{val.toString()} {field.unit}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Checklist Steps */}
                                <div>
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <CheckSquare size={14} /> Werkstappen
                                    </h3>
                                    <div className="space-y-2">
                                        {setup.steps?.sort((a,b) => a.order - b.order).map((step) => {
                                            const isChecked = checkedSteps[step.id];
                                            return (
                                                <button 
                                                    key={step.id}
                                                    onClick={() => setCheckedSteps(prev => ({...prev, [step.id]: !isChecked}))}
                                                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 active:scale-[0.98] ${isChecked ? 'bg-green-900/10 border-green-900/30 opacity-60' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                                                >
                                                    <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border transition-all mt-0.5 ${isChecked ? 'bg-green-600 border-green-600 text-white' : 'border-slate-600 bg-slate-900'}`}>
                                                        {isChecked && <CheckSquare size={14} />}
                                                    </div>
                                                    <div className={`text-sm font-medium leading-snug whitespace-pre-wrap ${isChecked ? 'text-green-400 line-through' : 'text-slate-200'}`}>
                                                        {step.description}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {(!setup.steps || setup.steps.length === 0) && <div className="text-slate-500 italic text-sm text-center py-4">Geen specifieke stappen.</div>}
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
                                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 p-4 rounded-2xl flex gap-4 items-center cursor-pointer transition-all active:scale-[0.98]"
                                    >
                                        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center font-black text-lg text-blue-500 border border-slate-700 shadow-inner">
                                            {tool.order}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-white text-sm mb-1 truncate">{tool.description}</div>
                                            <div className="flex gap-2">
                                                {tool.holder && (
                                                    <div className="bg-slate-900/50 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-700/50 truncate">
                                                        {tool.holder}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-blue-400 font-bold self-center">Details &rarr;</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {setupTools.length === 0 && <div className="text-slate-500 italic text-sm text-center py-10">Geen gereedschappen gedefinieerd.</div>}
                            </div>
                        )}

                        {/* TAB 3: INFO */}
                        {activeTab === 'INFO' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Artikel Informatie</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between border-b border-slate-700 pb-2">
                                            <span className="text-sm text-slate-400">Naam</span>
                                            <span className="text-sm font-bold text-white text-right">{article.name}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-700 pb-2">
                                            <span className="text-sm text-slate-400">Revisie</span>
                                            <span className="text-sm font-bold text-white text-right">{article.revision}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-700 pb-2">
                                            <span className="text-sm text-slate-400">Tekening Nr</span>
                                            <span className="text-sm font-bold text-white text-right">{article.drawingNumber}</span>
                                        </div>
                                        {article.customer && (
                                            <div className="flex justify-between border-b border-slate-700 pb-2">
                                                <span className="text-sm text-slate-400">Klant</span>
                                                <span className="text-sm font-bold text-white text-right">{article.customer}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Bestanden</h4>
                                    <div className="space-y-2">
                                        {article.files?.map(file => (
                                            <button key={file.id} onClick={() => setPreviewFile(file)} className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors text-left group">
                                                <div className="p-2 bg-slate-900 rounded-lg text-blue-500 group-hover:text-white transition-colors">
                                                    {file.type === 'application/pdf' ? <FileText size={18}/> : <ImageIcon size={18}/>}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-slate-200 truncate">{file.name}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase">{file.category || 'Bijlage'}</div>
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
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border-2 border-red-600/50 w-full max-w-lg rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 bg-red-600/20 w-40 h-40 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                            <div className={`p-5 bg-red-600/20 rounded-full border border-red-500/30`}>
                                {isStopping ? <Loader2 size={40} className="text-red-500 animate-spin" /> : <AlertTriangle size={40} className="text-red-500" />}
                            </div>
                            
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Order Beëindigen?</h3>
                                <p className="text-slate-400 font-medium">Weet u zeker dat u de huidige order <strong>{article.articleCode}</strong> wilt stoppen?</p>
                            </div>

                            <div className="flex gap-4 w-full pt-4">
                                <button 
                                    onClick={() => setShowStopModal(false)}
                                    disabled={isStopping}
                                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold uppercase text-xs tracking-widest transition-colors disabled:opacity-50"
                                >
                                    Annuleren
                                </button>
                                <button 
                                    onClick={confirmStopJob}
                                    disabled={isStopping}
                                    className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-900/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isStopping ? 'Bezig...' : 'Ja, Stop Order'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TOOL DETAIL MODAL */}
            {selectedTool && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 rounded-t-[2.5rem]">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-3xl text-white shadow-lg shadow-blue-900/40">
                                    {selectedTool.order}
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Gereedschap Detail</div>
                                    <h3 className="text-2xl font-black text-white">{selectedTool.description}</h3>
                                </div>
                            </div>
                            <button onClick={() => setSelectedTool(null)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Matrix Code</span>
                                    <span className="text-lg font-mono font-bold text-blue-400">{selectedTool.matrixCode || '-'}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Assembly ID</span>
                                    <span className="text-lg font-mono font-bold text-white">{selectedTool.assemblyCode || '-'}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-1"><Ruler size={10}/> Snijlengte</span>
                                    <span className="text-lg font-bold text-white">{selectedTool.cuttingLength || '-'}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Vrijloop</span>
                                    <span className="text-lg font-bold text-white">{selectedTool.clearance || '-'}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Houder</span>
                                    <span className="text-lg font-bold text-white">{selectedTool.holder || '-'}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-1"><Thermometer size={10}/> Interne Koeling</span>
                                    <span className={`text-lg font-black ${selectedTool.internalCooling ? 'text-green-500' : 'text-slate-500'}`}>
                                        {selectedTool.internalCooling ? 'JA' : 'NEE'}
                                    </span>
                                </div>
                            </div>

                            {selectedTool.toolData && Object.keys(selectedTool.toolData).length > 0 && (
                                <div className="border-t border-slate-800 pt-6">
                                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <Binary size={14} className="text-purple-500"/> Extra Data
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(selectedTool.toolData).map(([key, value]) => (
                                            <div key={key} className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                                                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">{key}</span>
                                                <span className="text-sm font-bold text-slate-300">{String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-950/50 border-t border-slate-800 rounded-b-[2.5rem]">
                            <button onClick={() => setSelectedTool(null)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors">
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