
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
  Briefcase // Icon for Job Tab
} from 'lucide-react';
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
          <div className="bg-orange-600 text-white p-4 rounded-xl mb-4 flex items-center gap-4 shadow-lg border border-orange-500 animate-in slide-in-from-top-4">
              <Archive size={32} className="shrink-0" />
              <div>
                  <h3 className="font-black uppercase text-sm tracking-widest">Gearchiveerde Asset</h3>
                  <p className="text-xs opacity-90">Deze machine is niet meer operationeel. Gegevens zijn alleen-lezen.</p>
              </div>
              <div className="ml-auto">
                  {hasPermission(Permission.MANAGE_MACHINES) && (
                      <Link to={`/admin/edit-machine/${machine.id}`} className="px-4 py-2 bg-white text-orange-600 rounded-lg text-xs font-bold shadow-sm">Bewerken</Link>
                  )}
              </div>
          </div>
      )}

      <div className="flex justify-between items-center mb-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> Terug
        </button>
        <div className="flex gap-2">
           {machine.type === AssetType.CNC && canAccessModule(AppModule.TOOLGUARD) && hasPermission(Permission.USE_TOOLGUARD) && (
               <Link to={`/machine/${machine.id}/toolguard`} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm text-xs font-bold transition-all transform hover:scale-105">
                   <ShieldCheck size={16} />
                   <span>TOOLGUARD</span>
               </Link>
           )}
           {hasPermission(Permission.MANAGE_MACHINES) && (
               <Link to={`/admin/edit-machine/${machine.id}`} className="p-1.5 bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-500 border border-slate-200 dark:border-slate-700 rounded shadow-sm">
                   <Edit size={16} />
               </Link>
           )}
           {!machine.isArchived && <button onClick={() => setShowQrModal(true)} className="p-1.5 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded shadow-sm">
               <QrCode size={16} />
           </button>}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
          <div className="flex flex-row h-auto p-3 gap-4">
              <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                  {imageUrl ? (
                    <img src={imageUrl} alt={machine.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-900">
                        <ImageIcon size={48} />
                    </div>
                  )}
                  <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${machine.status === 'RUNNING' ? 'bg-green-500' : machine.status === 'ERROR' ? 'bg-red-500' : 'bg-slate-500'}`} />
              </div>
              <div className="flex-1 flex flex-col justify-between py-0.5">
                  <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{machine.machineNumber}</span>
                              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide hidden sm:inline-block">{machine.type}</span>
                          </div>
                          <h1 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white leading-tight truncate">{machine.name}</h1>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                               {machine.tankCapacity ? ( <div className="flex items-center gap-1"><Database size={10} /> {machine.tankCapacity}L</div> ) : null}
                               <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium"> <SunMoon size={10} /> {getScheduleLabel()} </div>
                          </div>
                      </div>
                      <div className="shrink-0">
                          <StatusBadge status={machine.status} />
                      </div>
                  </div>
                  <div className="flex items-end justify-between mt-2 md:mt-0">
                      <div className={`flex items-center gap-1 text-xs font-bold ${activeTickets.length > 0 ? 'text-red-500' : 'text-green-500'}`}> <Activity size={14} /> <span>{activeTickets.length} Meldingen</span> </div>
                       {hasPermission(Permission.UPDATE_MACHINE_STATUS) && !machine.isArchived && (
                          <div className="flex gap-1.5 bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                              {(['RUNNING', 'MAINTENANCE', 'ERROR', 'OFFLINE'] as const).map(s => (
                                  <button key={s} onClick={() => handleStatusChange(s)} disabled={machine.status === s} className={getStatusButtonClass(s)} title={`Zet status op ${s}`}>
                                      {s === 'RUNNING' && <PlayCircle size={16} />}
                                      {s === 'MAINTENANCE' && <Wrench size={16} />}
                                      {s === 'ERROR' && <AlertTriangle size={16} />}
                                      {s === 'OFFLINE' && <Power size={16} />}
                                  </button>
                              ))}
                          </div>
                       )}
                  </div>
              </div>
          </div>
      </div>

      <div className="flex overflow-x-auto gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 no-scrollbar">
        {availableTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5'}`} > <tab.icon size={16} /> {tab.label} </button>
        ))}
      </div>

      <div className="min-h-[300px]">
          {activeTab === AssetTab.OVERVIEW && isTabVisible(AssetTab.OVERVIEW) && (
              <div className="grid grid-cols-1 gap-4">
                  
                  {/* Active Job Quick View on Dashboard */}
                  {machine.activeJob && (
                      <div onClick={() => setActiveTab(AssetTab.JOB)} className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-xl shadow-lg cursor-pointer hover:scale-[1.01] transition-transform text-white">
                          <div className="flex justify-between items-center mb-1">
                              <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2"><Briefcase size={16} /> Huidige Order</h3>
                              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono font-black">{machine.activeJob.startTime.split('T')[1].slice(0,5)}</span>
                          </div>
                          <div className="text-2xl font-black italic">{machine.activeJob.articleCode}</div>
                          <div className="text-xs opacity-90">{machine.activeJob.setupName}</div>
                      </div>
                  )}

                  {!machine.isArchived && machine.type === AssetType.CNC && isTabVisible(AssetTab.LIVE) && (
                      <div onClick={() => setActiveTab(AssetTab.LIVE)} className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-xl border border-slate-700 cursor-pointer hover:scale-[1.01] transition-transform">
                          <div className="flex justify-between items-center text-white mb-2">
                              <h3 className="font-bold flex items-center gap-2"><Monitor size={16} /> Live Monitor</h3>
                              {isLiveConnected() ? ( <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 animate-pulse flex items-center gap-1"> <Wifi size={10} /> ONLINE </span> ) : ( <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 flex items-center gap-1"> <WifiOff size={10} /> OFFLINE </span> )}
                          </div>
                          <div className="flex gap-4">
                              <div> <div className="text-[10px] text-slate-400 uppercase">Load</div> <div className="font-mono font-bold text-white">{machine.liveStats?.spindleLoad || 0}%</div> </div>
                              <div> <div className="text-[10px] text-slate-400 uppercase">Prog</div> <div className="font-mono font-bold text-white">{machine.liveStats?.programNumber || '-'}</div> </div>
                          </div>
                      </div>
                  )}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex justify-between items-center mb-3"> <h3 className="text-sm font-bold text-slate-800 dark:text-white">Actieve Meldingen</h3> <span className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-mono">{activeTickets.length}</span> </div>
                      <div className="space-y-2">
                          {activeTickets.length > 0 ? activeTickets.map(t => ( 
                              <div key={t.id} className={`p-2.5 rounded-lg cursor-pointer transition-colors relative ${t.impact === 'CRITICAL' ? 'bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30' : 'bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30'}`} onClick={() => setActiveTab(AssetTab.MAINTENANCE)}> 
                                <div className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-2">
                                    {t.title}
                                    {(t as any).isPending && <CloudCog size={12} className="text-orange-500 animate-spin-slow" />}
                                </div> 
                                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{t.description}</div> 
                              </div> 
                          )) : <div className="text-center py-6 text-slate-400 text-xs italic">Geen actieve storingen.</div> }
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
