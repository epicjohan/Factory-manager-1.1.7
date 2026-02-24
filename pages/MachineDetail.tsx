
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Machine,
    UserRole,
    Permission,
    FocasLiveStats,
    AssetTab,
    WorkSchedule,
    AppModule,
    AssetType,
    ScheduleType
} from '../types';
import { db } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { SyncService } from '../services/sync';
import { KEYS } from '../services/db/core';
import {
    Wrench,
    Droplet,
    Wind,
    FileText,
    Activity,
    PlayCircle,
    AlertTriangle,
    Power,
    Clock,
    QrCode,
    Edit,
    ClipboardList,
    Megaphone,
    Monitor,
    SunMoon,
    ShieldCheck,
    Archive,
    CloudCog,
    ArrowLeft,
    Database,
    Wifi,
    WifiOff,
    ImageIcon,
    Briefcase, // Icon for Job Tab
    CheckCircle
} from '../icons';
import { QRCodeSVG } from 'qrcode.react';
import { FocasPanel } from '../components/FocasPanel';
import { StatusBadge } from '../components/StatusBadge';
import { CoolingSection } from '../components/machine/CoolingSection';
import { ChecklistSection } from '../components/machine/ChecklistSection';
import { MistSection } from '../components/machine/MistSection';
import { CallSection } from '../components/machine/CallSection';
import { MaintenanceSection } from '../components/machine/MaintenanceSection';
import { PartsSection } from '../components/machine/PartsSection';
import { DocsSection } from '../components/machine/DocsSection';
import { JobSection } from '../components/machine/JobSection'; // Import JobSection
import { useMaintenance } from '../hooks/useMaintenance';
import { useTable } from '../hooks/useTable';

const AssetLabelModal: React.FC<{ machine: Machine, onClose: () => void }> = ({ machine, onClose }) => {
    const handlePrint = () => { window.print(); };
    const getSafeOrigin = () => {
        try {
            if (window.location.origin && window.location.origin !== 'null') return window.location.origin;
            const url = window.location.href;
            if (url.startsWith('blob:')) return 'https://factory-manager.app';
            return url.split('#')[0];
        } catch (e) { return 'https://factory-manager.app'; }
    };
    const machineUrl = `${getSafeOrigin()}/#/machine/${machine.id}`;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6 backdrop-blur-md print:bg-white print:p-0 print:block">
            <div className="bg-white p-0 rounded-none shadow-2xl w-full max-w-sm print:shadow-none print:w-full print:max-w-none">
                <div className="p-8 border-4 border-black m-4 print:m-0 print:border-2 print:border-black flex flex-col items-center justify-center text-center">
                    <h2 className="text-3xl font-black uppercase mb-1">{machine.machineNumber}</h2>
                    <h3 className="text-lg font-bold mb-6 text-slate-600 uppercase">{machine.name}</h3>
                    <div className="mb-6 p-2 border-2 border-slate-900 rounded">
                        <QRCodeSVG value={machineUrl} size={200} />
                    </div>
                    <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Scan voor Onderhoud</div>
                    <div className="text-xs font-bold bg-black text-white px-2 py-1">FACTORY MANAGER</div>
                </div>
                <div className="bg-slate-100 p-4 flex gap-4 print:hidden">
                    <button onClick={onClose} className="flex-1 py-3 text-slate-600 hover:bg-slate-200 rounded font-bold">Sluiten</button>
                    <button onClick={handlePrint} className="flex-1 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded font-bold flex items-center justify-center gap-2"> Afdrukken </button>
                </div>
            </div>
            <style>{` @media print { body * { visibility: hidden; } .fixed, .fixed * { visibility: visible; } .fixed { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: white; display: flex; align-items: center; justify-content: center; } .bg-slate-100 { display: none !important; } } `}</style>
        </div>
    );
};

export const MachineDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { hasPermission, canAccessAsset, canAccessModule } = useAuth();
    const { activeTickets } = useMaintenance(id);

    // Gebruik de reactieve hook voor de machine data
    const { data: machines } = useTable<Machine>(KEYS.MACHINES);
    const [activeTab, setActiveTab] = useState<AssetTab>(AssetTab.OVERVIEW);
    const [showQrModal, setShowQrModal] = useState(false);
    const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
    const [serverUrl, setServerUrl] = useState<string | undefined>(undefined);

    // De huidige machine ophalen uit de reactieve lijst
    const machine = useMemo(() => {
        if (!id) return null;
        return machines.find(m => m.id === id) || null;
    }, [machines, id]);

    useEffect(() => {
        const init = async () => {
            const [scheds, srv] = await Promise.all([
                db.getSchedules(),
                db.getServerSettings()
            ]);
            setSchedules(scheds);
            setServerUrl(srv.url);

            if (id && !canAccessAsset(id)) {
                navigate('/');
            }
        };
        init();
    }, [id, navigate, canAccessAsset]);

    const isLiveConnected = () => {
        if (!machine?.liveStats?.lastUpdated) return false;
        const lastUpdate = new Date(machine.liveStats.lastUpdated).getTime();
        const now = Date.now();
        return (now - lastUpdate) < 15000;
    };

    const handleStatusChange = (newStatus: 'RUNNING' | 'MAINTENANCE' | 'ERROR' | 'OFFLINE') => {
        if (!machine || machine.isArchived || !hasPermission(Permission.UPDATE_MACHINE_STATUS)) return;
        const updated = { ...machine, status: newStatus, updatedAt: Date.now() };
        db.updateMachine(updated);
    };

    const handleLiveSimulate = (stats: FocasLiveStats) => {
        if (machine) {
            const updated = { ...machine, liveStats: stats };
            db.setMachineLiveStats(machine.id, stats);
        }
    };

    if (!machine) return <div className="p-8 text-center text-slate-500">Asset niet gevonden of laden...</div>;

    const imageUrl = SyncService.resolveFileUrl(machine.id, machine.image, KEYS.MACHINES, serverUrl);

    const getScheduleLabel = () => {
        const schedId = machine.scheduleId || machine.schedule || ScheduleType.FULL_24_7;
        const sched = schedules.find(s => s.id === schedId);
        return sched ? sched.name : 'Standaard (24/7)';
    };

    // Add JOB tab if PDM module is enabled and machine is CNC
    const showJobTab = machine.type === AssetType.CNC && canAccessModule(AppModule.ARTICLES);

    const availableTabs = [
        { id: AssetTab.OVERVIEW, icon: Activity, label: 'Overzicht' },
        ...(showJobTab ? [{ id: AssetTab.JOB, icon: Briefcase, label: 'Werkorder' }] : []), // New PDM Job Tab
        ...(machine.type === AssetType.CNC ? [{ id: AssetTab.LIVE, icon: Monitor, label: 'Live CNC' }] : []),
        ...(machine.type === AssetType.CNC ? [{ id: AssetTab.CALL, icon: Megaphone, label: 'Oproep' }] : []),
        { id: AssetTab.CHECKLIST, icon: ClipboardList, label: 'Checklist' },
        { id: AssetTab.MAINTENANCE, icon: Wrench, label: 'Storingen' },
        ...(machine.type === AssetType.CNC ? [{ id: AssetTab.COOLANT, icon: Droplet, label: 'Koeling' }] : []),
        ...(machine.type === AssetType.CNC ? [{ id: AssetTab.MIST, icon: Wind, label: 'Mistfilter' }] : []),
        { id: AssetTab.PARTS, icon: Database, label: 'Onderdelen' },
        { id: AssetTab.DOCS, icon: FileText, label: 'Docs' },
    ].filter(tab => {
        // Filter tabs op basis van gebruikersrechten indien van toepassing
        return true;
    });

    const isTabVisible = (tabId: AssetTab) => availableTabs.some(t => t.id === tabId);

    const getStatusButtonClass = (target: 'RUNNING' | 'MAINTENANCE' | 'ERROR' | 'OFFLINE') => {
        const isActive = machine.status === target;
        const base = "p-1.5 rounded-lg border transition-all flex items-center justify-center";
        if (target === 'RUNNING') return isActive ? `${base} bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30 scale-105 z-10` : `${base} bg-transparent text-emerald-500 border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/20`;
        if (target === 'MAINTENANCE') return isActive ? `${base} bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/30 scale-105 z-10` : `${base} bg-transparent text-amber-500 border-amber-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/20`;
        if (target === 'ERROR') return isActive ? `${base} bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/30 scale-105 z-10 animate-pulse` : `${base} bg-transparent text-red-500 border-red-500/20 hover:bg-red-900/20`;
        return isActive ? `${base} bg-slate-600 text-white border-slate-600 shadow-sm shadow-slate-600/30 scale-105 z-10` : `${base} bg-transparent text-slate-500 border-slate-500/20 hover:bg-slate-50 dark:hover:bg-slate-800/50`;
    };

    return (
        <div className="pb-20 max-w-5xl mx-auto text-left animate-in fade-in duration-500">
            {machine.isArchived && (
                <div className="bg-orange-600 text-white p-6 rounded-[2rem] mb-6 flex items-center gap-4 shadow-lg border border-orange-500 animate-in slide-in-from-top-4">
                    <Archive size={36} className="shrink-0" />
                    <div>
                        <h3 className="font-black uppercase text-sm tracking-widest">Gearchiveerde Asset</h3>
                        <p className="text-xs opacity-90 font-bold mt-1 tracking-wide">Deze machine is niet meer operationeel. Gegevens zijn alleen-lezen.</p>
                    </div>
                    <div className="ml-auto">
                        {hasPermission(Permission.MANAGE_MACHINES) && (
                            <Link to={`/admin/edit-machine/${machine.id}`} className="px-5 py-3 bg-white text-orange-600 rounded-2xl text-[10px] uppercase font-black tracking-widest shadow-sm hover:bg-orange-50 transition-colors">Bewerken</Link>
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-4">
                <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-xs uppercase font-black tracking-widest">
                    <ArrowLeft size={16} /> Terug
                </button>
                <div className="flex gap-2">
                    {machine.type === AssetType.CNC && canAccessModule(AppModule.TOOLGUARD) && hasPermission(Permission.USE_TOOLGUARD) && (
                        <Link to={`/machine/${machine.id}/toolguard`} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm shadow-indigo-500/20 text-[10px] font-black tracking-widest transition-all transform hover:scale-105">
                            <ShieldCheck size={16} />
                            <span>TOOLGUARD</span>
                        </Link>
                    )}
                    {hasPermission(Permission.MANAGE_MACHINES) && (
                        <Link to={`/admin/edit-machine/${machine.id}`} className="p-2 bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-500 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-colors">
                            <Edit size={16} />
                        </Link>
                    )}
                    {!machine.isArchived && <button onClick={() => setShowQrModal(true)} className="p-2 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-colors">
                        <QrCode size={16} />
                    </button>}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-8 p-6 relative">
                <div className="flex flex-col md:flex-row h-auto gap-6">
                    <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-[1.5rem] overflow-hidden bg-slate-100 dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-800 shadow-inner">
                        {imageUrl ? (
                            <img src={imageUrl} alt={machine.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-900">
                                <ImageIcon size={48} />
                            </div>
                        )}
                        <div className={`absolute bottom-0 left-0 right-0 h-2 ${machine.status === 'RUNNING' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : machine.status === 'ERROR' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse' : 'bg-slate-500'}`} />
                    </div>
                    <div className="flex-1 flex flex-col justify-center py-2">
                        <div className="flex justify-between items-start gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-[10px] font-mono font-black tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600">{machine.machineNumber}</span>
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest hidden sm:inline-block bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-900/50">{machine.type}</span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white leading-tight truncate tracking-tighter italic uppercase">{machine.name}</h1>
                                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">
                                    {machine.tankCapacity ? (<div className="flex items-center gap-1.5"><Database size={14} className="text-slate-400" /> {machine.tankCapacity}L</div>) : null}
                                    <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400"> <SunMoon size={14} /> {getScheduleLabel()} </div>
                                </div>
                            </div>
                            <div className="shrink-0 scale-110 origin-top-right">
                                <StatusBadge status={machine.status} />
                            </div>
                        </div>
                        <div className="flex items-end justify-between mt-4 md:mt-2">
                            <div className={`flex items-center gap-2 text-xs uppercase font-black tracking-widest px-3 py-1.5 rounded-xl border ${activeTickets.length > 0 ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/50' : 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/50'}`}> <Activity size={14} /> <span>{activeTickets.length} Meldingen</span> </div>
                            {hasPermission(Permission.UPDATE_MACHINE_STATUS) && !machine.isArchived && (
                                <div className="flex gap-2 bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                                    {(['RUNNING', 'MAINTENANCE', 'ERROR', 'OFFLINE'] as const).map(s => (
                                        <button key={s} onClick={() => handleStatusChange(s)} disabled={machine.status === s} className={getStatusButtonClass(s)} title={`Zet status op ${s}`}>
                                            {s === 'RUNNING' && <PlayCircle size={18} />}
                                            {s === 'MAINTENANCE' && <Wrench size={18} />}
                                            {s === 'ERROR' && <AlertTriangle size={18} />}
                                            {s === 'OFFLINE' && <Power size={18} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-3 bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-700 mb-8 no-scrollbar scroll-smooth">
                {availableTabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-fit flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 transform scale-[1.02]' : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:text-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`} > <tab.icon size={16} /> {tab.label} </button>
                ))}
            </div>

            <div className="min-h-[300px]">
                {activeTab === AssetTab.OVERVIEW && isTabVisible(AssetTab.OVERVIEW) && (
                    <div className="grid grid-cols-1 gap-4">

                        {/* Active Job Quick View on Dashboard */}
                        {machine.activeJob && (
                            <div onClick={() => setActiveTab(AssetTab.JOB)} className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] shadow-lg shadow-blue-500/20 border border-blue-500 cursor-pointer hover:scale-[1.01] transition-transform text-white">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 opacity-90"><Briefcase size={16} /> Huidige Order</h3>
                                    <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-mono font-black tracking-widest">{machine.activeJob.startTime.split('T')[1].slice(0, 5)}</span>
                                </div>
                                <div className="text-3xl font-black italic tracking-tighter uppercase">{machine.activeJob.articleCode}</div>
                                <div className="text-sm font-bold opacity-90 mt-1">{machine.activeJob.setupName}</div>
                            </div>
                        )}

                        {!machine.isArchived && machine.type === AssetType.CNC && isTabVisible(AssetTab.LIVE) && (
                            <div onClick={() => setActiveTab(AssetTab.LIVE)} className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] border border-slate-700 cursor-pointer hover:scale-[1.01] transition-transform shadow-lg shadow-black/20">
                                <div className="flex justify-between items-center text-white mb-4">
                                    <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-slate-300"><Monitor size={16} /> Live Monitor</h3>
                                    {isLiveConnected() ? (<span className="text-[10px] bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30 animate-pulse flex items-center gap-1.5 font-black uppercase tracking-widest"> <Wifi size={12} /> ONLINE </span>) : (<span className="text-[10px] bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/30 flex items-center gap-1.5 font-black uppercase tracking-widest"> <WifiOff size={12} /> OFFLINE </span>)}
                                </div>
                                <div className="flex gap-8">
                                    <div> <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Load</div> <div className="text-2xl font-mono font-bold text-white">{machine.liveStats?.spindleLoad || 0}%</div> </div>
                                    <div> <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Prog</div> <div className="text-2xl font-mono font-bold text-blue-400">{machine.liveStats?.programNumber || '-'}</div> </div>
                                </div>
                            </div>
                        )}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-center mb-4"> <h3 className="text-lg font-black uppercase tracking-tighter italic text-slate-800 dark:text-white">Actieve Meldingen</h3> <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300 font-mono font-black tracking-widest">{activeTickets.length} MENU</span> </div>
                            <div className="space-y-3">
                                {activeTickets.length > 0 ? activeTickets.map(t => (
                                    <div key={t.id} className={`p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] relative border-l-4 shadow-sm ${t.impact === 'CRITICAL' ? 'bg-red-50 dark:bg-red-900/10 border-red-500' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-500'}`} onClick={() => setActiveTab(AssetTab.MAINTENANCE)}>
                                        <div className="font-black text-slate-800 dark:text-white text-sm flex items-center gap-2">
                                            {t.title}
                                            {(t as any).isPending && <CloudCog size={14} className="text-orange-500 animate-spin-slow" />}
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium mt-1 truncate">{t.description}</div>
                                    </div>
                                )) : <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest flex flex-col items-center gap-2"><CheckCircle size={32} className="text-green-300 opacity-50" /> Geen actieve storingen.</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Active Job Tab */}
                {activeTab === AssetTab.JOB && isTabVisible(AssetTab.JOB) && <JobSection machine={machine} />}

                {activeTab === AssetTab.LIVE && isTabVisible(AssetTab.LIVE) && <FocasPanel machine={machine} onSimulate={handleLiveSimulate} />}
                {activeTab === AssetTab.CALL && isTabVisible(AssetTab.CALL) && <CallSection machine={machine} />}
                {activeTab === AssetTab.CHECKLIST && isTabVisible(AssetTab.CHECKLIST) && <ChecklistSection machine={machine} />}
                {activeTab === AssetTab.COOLANT && isTabVisible(AssetTab.COOLANT) && <CoolingSection machine={machine} />}
                {activeTab === AssetTab.MAINTENANCE && isTabVisible(AssetTab.MAINTENANCE) && <MaintenanceSection machine={machine} />}
                {activeTab === AssetTab.MIST && isTabVisible(AssetTab.MIST) && <MistSection machine={machine} />}
                {activeTab === AssetTab.PARTS && isTabVisible(AssetTab.PARTS) && <PartsSection machine={machine} />}
                {activeTab === AssetTab.DOCS && isTabVisible(AssetTab.DOCS) && <DocsSection machine={machine} />}
            </div>

            {showQrModal && <AssetLabelModal machine={machine} onClose={() => setShowQrModal(false)} />}
        </div>
    );
};
