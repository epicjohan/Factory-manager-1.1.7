
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { db } from '../services/storage';
import { Machine, MaintenanceTicket, SupportRequest, SupportStatus, Permission } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Maximize, Minimize, AlertTriangle, Activity, CheckCircle, Clock, Zap, Megaphone, Wrench, Package, Timer, ChevronDown, Play, Power, Octagon } from '../icons';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';

export const AndonDashboard: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const dashboardRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [scrollPercentage, setScrollPercentage] = useState(0);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);
    const interactionTimeoutRef = useRef<any>(null);

    // REACTIVE DATA HOOKS
    const { data: allMachines } = useTable<Machine>(KEYS.MACHINES);
    const { data: allTickets } = useTable<MaintenanceTicket>(KEYS.TICKETS);
    const { data: allRequests } = useTable<SupportRequest>(KEYS.REQUESTS);

    // Derived State
    const machines = useMemo(() => allMachines.filter(m => m.showInAndon !== false), [allMachines]);
    const tickets = useMemo(() => allTickets.filter(t => t.status === 'OPEN'), [allTickets]);
    const requests = useMemo(() => allRequests.filter(r => r.status !== SupportStatus.COMPLETED), [allRequests]);

    const canUpdateStatus = hasPermission(Permission.UPDATE_MACHINE_STATUS);

    const triggerInteraction = useCallback(() => {
        setIsInteracting(true);
        if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
        interactionTimeoutRef.current = setTimeout(() => {
            setIsInteracting(false);
        }, 20000); 
    }, []);

    const handleStatusChange = (machine: Machine, newStatus: 'RUNNING' | 'MAINTENANCE' | 'ERROR' | 'OFFLINE') => {
        triggerInteraction();
        if (!canUpdateStatus) return;

        if (window.navigator.vibrate) window.navigator.vibrate(20);
        
        const updatedMachine = { ...machine, status: newStatus };
        db.updateMachine(updatedMachine);
    };

    useEffect(() => {
        let scrollInterval: any;
        
        const checkOverflow = () => {
            if (scrollContainerRef.current) {
                const { scrollHeight, clientHeight } = scrollContainerRef.current;
                setHasOverflow(scrollHeight > clientHeight + 10);
            }
        };

        if (isFullscreen && scrollContainerRef.current && !isInteracting) {
            const container = scrollContainerRef.current;
            let direction = 1;
            let waitCounter = 200; 

            scrollInterval = setInterval(() => {
                const { scrollTop, scrollHeight, clientHeight } = container;
                const totalScrollable = scrollHeight - clientHeight;
                if (totalScrollable > 0) {
                    setScrollPercentage((scrollTop / totalScrollable) * 100);
                }

                if (waitCounter > 0) {
                    waitCounter--;
                    return;
                }

                const isAtBottom = scrollHeight - scrollTop <= clientHeight + 2;
                const isAtTop = scrollTop <= 0;

                if (isAtBottom && direction === 1) {
                    direction = -1;
                    waitCounter = 200; 
                } else if (isAtTop && direction === -1) {
                    direction = 1;
                    waitCounter = 200; 
                }

                container.scrollBy({ top: direction * 0.6, behavior: 'auto' });
            }, 50); 
        }

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => {
            clearInterval(scrollInterval);
            window.removeEventListener('resize', checkOverflow);
        };
    }, [isFullscreen, isInteracting, machines.length]);

    useEffect(() => {
        const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);

        return () => {
            clearInterval(clockInterval);
            document.removeEventListener('fullscreenchange', handleFsChange);
        };
    }, []);

    const toggleFullscreen = () => {
        if (!dashboardRef.current) return;
        if (!document.fullscreenElement) {
            dashboardRef.current.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const formatCycleTime = (sec?: number) => {
        if (!sec) return '00:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'RUNNING': return {
                card: 'bg-emerald-500 text-white border-emerald-400',
                stats: 'bg-emerald-600/50 border-emerald-400/30',
                label: 'bg-emerald-700/50',
                icon: <Activity className="text-white animate-pulse" size={32} />,
                statusText: 'PRODUCEREND'
            };
            case 'ERROR': return {
                card: 'bg-red-600 text-white border-red-500 animate-pulse-fast',
                stats: 'bg-red-700/50 border-red-400/30',
                label: 'bg-red-800/50',
                icon: <AlertTriangle className="text-white animate-bounce" size={32} />,
                statusText: 'STORING / ALARM'
            };
            case 'MAINTENANCE': return {
                card: 'bg-orange-500 text-white border-orange-400',
                stats: 'bg-orange-600/50 border-orange-400/30',
                label: 'bg-orange-700/50',
                icon: <Wrench className="text-white" size={32} />,
                statusText: 'ONDERHOUD'
            };
            default: return {
                card: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
                stats: 'bg-slate-300/50 dark:bg-slate-900/50 border-slate-400/20',
                label: 'bg-slate-400/20',
                icon: <Clock size={32} />,
                statusText: 'OFFLINE'
            };
        }
    };

    const getShiftProgress = () => {
        const now = new Date();
        const totalMin = now.getHours() * 60 + now.getMinutes();
        let start = 360, end = 840;   
        if (totalMin > 840) { start = 840; end = 1320; } 
        if (totalMin > 1320 || totalMin < 360) { start = 1320; end = 1800; } 
        const progress = ((totalMin - start) / (end - start)) * 100;
        return Math.max(0, Math.min(100, progress));
    };

    const runningCount = machines.filter(m => m.status === 'RUNNING').length;
    const errorCount = machines.filter(m => m.status === 'ERROR').length;
    const uptime = machines.length > 0 ? Math.round((runningCount / machines.length) * 100) : 0;

    return (
        <div 
            ref={dashboardRef}
            className="flex flex-col h-screen overflow-hidden bg-[#020617] text-slate-200 transition-colors duration-500 p-3 relative"
            onPointerDown={triggerInteraction}
        >
            <div className="w-full h-1.5 bg-slate-800 mb-2 rounded-full overflow-hidden shrink-0">
                <div className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" style={{ width: `${getShiftProgress()}%` }} />
            </div>

            <header className="flex justify-between items-center mb-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-2xl shrink-0">
                <div className="flex items-center gap-10">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-500 tracking-[0.4em] uppercase">Operations Center</span>
                        <h1 className="text-2xl font-black text-white uppercase italic leading-none mt-1">
                            Factory <span className="text-blue-500">Live</span>
                        </h1>
                    </div>
                    <div className="hidden md:flex gap-12 border-l border-slate-800 pl-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-left">Hal Efficiency</span>
                            <span className="text-3xl font-black text-emerald-500 font-mono leading-none mt-1">{uptime}%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-left">Kritieke Stops</span>
                            <span className={`text-3xl font-black font-mono leading-none mt-1 ${errorCount > 0 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>{errorCount}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    {isInteracting && (
                        <div className="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-full border border-blue-500/30 text-xs font-black uppercase tracking-widest animate-pulse">
                            Interactie Modus: Scroll Gepauzeerd
                        </div>
                    )}
                    <div className="text-right">
                        <div className="text-4xl font-black font-mono text-white leading-none tracking-tighter">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
                        </div>
                    </div>
                    <button onClick={toggleFullscreen} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 transition-all active:scale-90 shrink-0">
                        {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                    </button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-3 min-h-0 relative">
                <div className="lg:col-span-3 relative flex min-h-0">
                    {hasOverflow && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-800/30 rounded-full z-30 mr-1 overflow-hidden">
                            <div className="w-full bg-blue-500/50 transition-all duration-300 rounded-full" style={{ height: '20%', transform: `translateY(${scrollPercentage * 4}%)` }} />
                        </div>
                    )}

                    <div 
                        ref={scrollContainerRef}
                        className="grid grid-cols-1 xl:grid-cols-2 gap-3 overflow-y-auto no-scrollbar content-start pr-4 w-full"
                    >
                        {machines.map(machine => {
                            const styles = getStatusStyles(machine.status);
                            const stats = machine.liveStats;
                            const target = stats?.targetCount || 500;
                            const current = stats?.partsCount || 0;
                            const progress = Math.min(100, (current / target) * 100);
                            
                            return (
                                <div key={machine.id} className={`${styles.card} border-2 rounded-[2rem] p-6 flex flex-col justify-between transition-all duration-300 shadow-2xl relative overflow-hidden h-[340px]`}>
                                    <div className="flex justify-between items-start relative z-10 gap-4">
                                        <div className="flex gap-5 items-center min-w-0">
                                            <div className={`${styles.label} p-4 rounded-2xl shadow-inner shrink-0`}>{styles.icon}</div>
                                            <div className="min-w-0 text-left">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-sm font-mono font-black bg-black/30 px-3 py-0.5 rounded-full border border-white/10 shrink-0 uppercase tracking-widest">{machine.machineNumber}</span>
                                                    <span className="text-xs font-black tracking-[0.2em] uppercase opacity-80 truncate">{styles.statusText}</span>
                                                </div>
                                                <h2 className="text-3xl font-black truncate leading-tight uppercase tracking-tighter" title={machine.name}>{machine.name}</h2>
                                            </div>
                                        </div>
                                        
                                        {canUpdateStatus && (
                                            <div className="flex gap-2 shrink-0">
                                                <button 
                                                    onClick={() => handleStatusChange(machine, 'RUNNING')}
                                                    disabled={machine.status === 'RUNNING'}
                                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg border-2 ${machine.status === 'RUNNING' ? 'bg-white/20 border-white/40 opacity-50' : 'bg-emerald-600 border-emerald-400 hover:bg-emerald-500'}`}
                                                >
                                                    <Play size={24} fill="currentColor" />
                                                </button>
                                                <button 
                                                    onClick={() => handleStatusChange(machine, 'ERROR')}
                                                    disabled={machine.status === 'ERROR'}
                                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg border-2 ${machine.status === 'ERROR' ? 'bg-white/20 border-white/40 opacity-50' : 'bg-red-700 border-red-500 hover:bg-red-600'}`}
                                                >
                                                    <Octagon size={24} fill="currentColor" />
                                                </button>
                                                <button 
                                                    onClick={() => handleStatusChange(machine, 'MAINTENANCE')}
                                                    disabled={machine.status === 'MAINTENANCE'}
                                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg border-2 ${machine.status === 'MAINTENANCE' ? 'bg-white/20 border-white/40 opacity-50' : 'bg-orange-600 border-orange-400 hover:bg-orange-500'}`}
                                                >
                                                    <Wrench size={24} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className={`${styles.stats} rounded-3xl p-4 border flex flex-col justify-center text-left`}>
                                            <span className="text-[10px] opacity-60 font-black uppercase tracking-widest mb-1">Actief Programma</span>
                                            <div className="text-4xl font-black font-mono tracking-tighter overflow-hidden whitespace-nowrap">{stats?.programNumber || 'O----'}</div>
                                            <div className="text-xs font-bold opacity-50 truncate mt-1">{stats?.programComment || 'No Metadata'}</div>
                                        </div>
                                        <div className={`${styles.stats} rounded-3xl p-4 border flex flex-col justify-center text-center`}>
                                            <span className="text-[10px] opacity-60 font-black uppercase mb-1 tracking-widest">Cyclus Tijd</span>
                                            <div className="text-4xl font-black font-mono flex items-center justify-center gap-3"><Timer size={24} className="opacity-40 shrink-0" />{formatCycleTime(stats?.cycleTimeSec)}</div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex justify-between items-end mb-2 px-1">
                                            <div className="flex items-center gap-2 text-left"><Package size={16} className="opacity-60 shrink-0" /><span className="text-xs font-black uppercase tracking-widest opacity-80">Order Voortgang</span></div>
                                            <div className="text-xl font-black font-mono italic">{current} <span className="text-sm opacity-50 font-normal">/ {target}</span></div>
                                        </div>
                                        <div className="h-4 bg-black/20 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                            <div className={`h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.3)] ${machine.status === 'RUNNING' ? 'bg-white' : 'bg-white/40'}`} style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {hasOverflow && scrollPercentage < 95 && !isInteracting && (
                        <div className="absolute bottom-0 left-0 right-4 h-24 bg-gradient-to-t from-[#020617] to-transparent z-20 pointer-events-none flex items-end justify-center pb-2">
                            <ChevronDown className="text-blue-500 animate-bounce" size={32} />
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1 flex flex-col gap-3 overflow-hidden">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-1/2 shadow-2xl">
                        <div className="p-5 bg-red-600/10 border-b border-red-500/20 flex items-center justify-between">
                            <h3 className="text-xs font-black text-red-500 flex items-center gap-3 uppercase tracking-[0.3em]"><Zap size={18} className="animate-pulse shrink-0" /> Meldingen</h3>
                            <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">{tickets.length}</span>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-3 no-scrollbar flex-1 text-left">
                            {tickets.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-700">
                                    <CheckCircle size={48} className="mb-3 opacity-10" />
                                    <p className="text-xs font-black uppercase tracking-widest opacity-40 text-center">Status: OK</p>
                                </div>
                            ) : (
                                tickets.map(ticket => (
                                    <div key={ticket.id} className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 border-l-[6px] border-l-red-500 shadow-lg animate-in slide-in-from-right-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-black text-white text-sm uppercase tracking-wider bg-red-500/20 px-2 py-0.5 rounded-lg border border-red-500/30 truncate mr-2">
                                                {machines.find(m => m.id === ticket.machineId)?.machineNumber || '???'}
                                            </span>
                                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-tighter shrink-0">{new Date(ticket.reportedDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <p className="text-slate-200 text-sm font-black leading-tight uppercase italic whitespace-normal break-words">{ticket.title}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-1/2 shadow-2xl">
                        <div className="p-5 bg-blue-600/10 border-b border-blue-500/20 flex items-center justify-between">
                            <h3 className="text-xs font-black text-blue-500 flex items-center gap-3 uppercase tracking-[0.3em]"><Megaphone size={18} className="shrink-0" /> Logistiek</h3>
                            <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">{requests.length}</span>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-3 no-scrollbar flex-1 text-left">
                            {requests.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-700">
                                    <Package size={48} className="mb-3 opacity-10" />
                                    <p className="text-xs font-black uppercase tracking-widest opacity-40 text-center">Geen Oproepen</p>
                                </div>
                            ) : (
                                requests.map(req => (
                                    <div key={req.id} className={`bg-slate-800/50 p-5 rounded-2xl border border-slate-700 border-l-[6px] ${req.status === 'ACCEPTED' ? 'border-l-blue-500' : 'border-l-yellow-500 animate-pulse-slow'} shadow-lg`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`font-black text-white text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-lg border shrink-0 ${req.status === 'ACCEPTED' ? 'bg-blue-500/20 border-blue-500/30' : 'bg-yellow-500/20 border-yellow-500/30'}`}>
                                                {req.type === 'SWARF' ? 'Spanen' : req.type === 'COOLANT' ? 'Olie' : 'Materiaal'}
                                            </span>
                                            <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0 ml-2">{new Date(req.requestDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <p className="text-slate-200 text-sm font-black truncate uppercase" title={machines.find(m => m.id === req.machineId)?.name}>
                                            {machines.find(m => m.id === req.machineId)?.name || 'Algemeen'}
                                        </p>
                                        <div className="mt-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2 truncate">
                                            {req.status === 'ACCEPTED' ? <><Activity size={10} className="shrink-0" /> <span className="truncate">Behandeld door {req.acceptedBy}</span></> : <><Clock size={10} className="animate-spin shrink-0" /> Wacht op logistiek</>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <footer className="mt-3 flex justify-between items-center px-6 bg-slate-900 py-3 rounded-2xl border border-slate-800 shadow-2xl shrink-0">
                <div className="flex gap-12 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] shrink-0"></div> RUNNING</div>
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444] shrink-0"></div> ALARM</div>
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_12px_#f97316] shrink-0"></div> SERVICE</div>
                </div>
                <div className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em] font-bold truncate ml-4">PRODUCTION OS | v1.0.0 | {currentTime.toLocaleDateString()}</div>
            </footer>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes pulse-fast { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
                .animate-pulse-fast { animation: pulse-fast 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
                .animate-pulse-slow { animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                :fullscreen { padding: 0.75rem; background-color: #020617 !important; width: 100vw; height: 100vh; }
                #root:has(:fullscreen) { overflow: hidden; }
                button:disabled { cursor: not-allowed; opacity: 0.5; }
            `}</style>
        </div>
    );
};
