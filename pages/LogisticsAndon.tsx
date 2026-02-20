
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/storage';
import { SupportRequest, SupportStatus, SupportType, Machine } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';
import { 
    Maximize, 
    Minimize, 
    Recycle, 
    Box, 
    Droplet, 
    Container, 
    Clock, 
    User, 
    CheckCircle, 
    Volume2, 
    VolumeX,
    Truck,
    MapPin,
    Zap,
    Info,
    X,
    CalendarClock
} from 'lucide-react';

export const LogisticsAndon: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const andonRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const audioCtxRef = useRef<AudioContext | null>(null);
    
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isInteracting, setIsInteracting] = useState(false);
    const [isAudioInitialized, setIsAudioInitialized] = useState(false);
    const interactionTimer = useRef<any>(null);

    const { data: allRequests } = useTable<SupportRequest>(KEYS.REQUESTS);
    const { data: allMachines } = useTable<Machine>(KEYS.MACHINES);

    const requests = useMemo(() => {
        return allRequests.filter(r => r.status !== SupportStatus.COMPLETED && r.type !== SupportType.QUESTION);
    }, [allRequests]);

    const prevPendingCountRef = useRef(0);

    useEffect(() => {
        return () => {
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
                audioCtxRef.current = null;
            }
        };
    }, []);

    const playChime = useCallback(() => {
        if (!soundEnabled || !isAudioInitialized) return;
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const context = audioCtxRef.current;
            if (context.state === 'suspended') context.resume();
            
            const playTone = (freq: number, startTime: number, duration: number) => {
                const osc = context.createOscillator();
                const gain = context.createGain();
                osc.connect(gain);
                gain.connect(context.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            playTone(660, context.currentTime, 0.8);
            playTone(440, context.currentTime + 0.4, 1.2);
        } catch (e) { console.warn("Audio blocked", e); }
    }, [soundEnabled, isAudioInitialized]);

    useEffect(() => {
        const currentPending = requests.filter(r => r.status === SupportStatus.PENDING).length;
        if (currentPending > prevPendingCountRef.current) {
            playChime();
        }
        prevPendingCountRef.current = currentPending;
    }, [requests, playChime]);

    useEffect(() => {
        const clock = setInterval(() => setCurrentTime(new Date()), 1000);
        const fsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', fsChange);
        return () => {
            clearInterval(clock);
            document.removeEventListener('fullscreenchange', fsChange);
        };
    }, []);

    useEffect(() => {
        let scrollInterval: any;
        if (isFullscreen && scrollRef.current && !isInteracting) {
            const container = scrollRef.current;
            let direction = 1;
            let wait = 200;
            scrollInterval = setInterval(() => {
                if (wait > 0) { wait--; return; }
                const { scrollTop, scrollHeight, clientHeight } = container;
                if (scrollHeight <= clientHeight) return;
                if (scrollTop + clientHeight >= scrollHeight - 5) { direction = -1; wait = 200; }
                else if (scrollTop <= 5) { direction = 1; wait = 200; }
                container.scrollBy({ top: direction * 0.8, behavior: 'auto' });
            }, 50);
        }
        return () => clearInterval(scrollInterval);
    }, [isFullscreen, isInteracting, requests.length]);

    const handleInteraction = () => {
        setIsInteracting(true);
        if (!isAudioInitialized) setIsAudioInitialized(true);
        if (interactionTimer.current) clearTimeout(interactionTimer.current);
        interactionTimer.current = setTimeout(() => setIsInteracting(false), 20000);
    };

    const toggleFs = () => {
        if (!isAudioInitialized) setIsAudioInitialized(true);
        if (!andonRef.current) return;
        if (!document.fullscreenElement) andonRef.current.requestFullscreen();
        else document.exitFullscreen();
    };

    const handleAccept = (req: SupportRequest) => {
        if (!user) return;
        db.updateSupportRequest({ ...req, status: SupportStatus.ACCEPTED, acceptedBy: user.name });
        handleInteraction();
    };

    const handleComplete = (req: SupportRequest) => {
        if (!user) return;
        db.updateSupportRequest({ ...req, status: SupportStatus.COMPLETED, completedBy: user.name, completedDate: new Date().toISOString() });
        handleInteraction();
    };

    const getMachine = (id: string) => allMachines.find(m => m.id === id);

    const sortedRequests = [...requests].sort((a,b) => {
        if (a.urgency === 'HIGH' && b.urgency !== 'HIGH') return -1;
        if (a.urgency !== 'HIGH' && b.urgency === 'HIGH') return 1;
        if (a.status === SupportStatus.PENDING && b.status === SupportStatus.ACCEPTED) return -1;
        return new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime();
    });

    return (
        <div 
            ref={andonRef}
            className="fixed inset-0 bg-[#020617] text-slate-100 flex flex-col overflow-hidden font-sans select-none z-[100]"
            onPointerDown={handleInteraction}
        >
            {!isAudioInitialized && (
                <div className="absolute inset-0 z-[200] bg-[#020617]/90 backdrop-blur-xl flex items-center justify-center p-6 text-center">
                    <div className="max-w-md">
                        <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl animate-pulse"><Volume2 size={48} className="text-white" /></div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">Monitor Activeren</h2>
                        <button onClick={() => { setIsAudioInitialized(true); toggleFs(); }} className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black text-2xl shadow-2xl uppercase tracking-widest">START TERMINAL</button>
                    </div>
                </div>
            )}

            <header className="p-5 bg-slate-900/80 border-b border-white/5 flex justify-between items-center shadow-2xl shrink-0">
                <div className="flex items-center gap-10">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] mb-1">Logistics Control Center</span>
                        <h1 className="text-3xl font-black italic flex items-center gap-4 leading-none"><Truck className="text-blue-500 shrink-0" size={32} /> LOGISTICS <span className="text-blue-500">ANDON</span></h1>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right mr-4 shrink-0">
                        <div className="text-4xl font-black font-mono text-white leading-none tracking-tighter">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">{currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-4 rounded-2xl border-2 ${soundEnabled ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>{soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}</button>
                        <button onClick={toggleFs} className="p-4 bg-slate-800 border-2 border-slate-700 rounded-2xl text-slate-400">{isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}</button>
                        <button onClick={() => navigate('/support')} className="p-4 bg-slate-800 border-2 border-slate-700 hover:bg-red-600 hover:border-red-500 hover:text-white rounded-2xl text-slate-400 transition-all"><X size={24} /></button>
                    </div>
                </div>
            </header>

            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 content-start no-scrollbar pb-32"
            >
                {sortedRequests.map(req => {
                    const machine = getMachine(req.machineId);
                    const isHigh = req.urgency === 'HIGH';
                    const isAccepted = req.status === SupportStatus.ACCEPTED;

                    return (
                        <div 
                            key={req.id}
                            className={`rounded-[3rem] border-4 p-8 flex flex-col justify-between min-h-[480px] transition-all duration-500 shadow-2xl relative overflow-hidden ${isHigh && !isAccepted ? 'border-red-600 bg-red-600/10 glow-red' : isAccepted ? 'border-blue-600 bg-blue-600/10 glow-blue' : 'border-slate-800 bg-slate-900/80'}`}
                        >
                            {isHigh && !isAccepted && (
                                <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-center py-2 text-[11px] font-black uppercase tracking-[0.3em] z-10">🛑 SPOED</div>
                            )}

                            <div className="flex-1">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl shrink-0 ${isHigh ? 'bg-red-600 text-white' : isAccepted ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                        {req.type === SupportType.SWARF ? <Recycle size={42} /> : req.type === SupportType.MATERIAL ? <Box size={42} /> : req.type === SupportType.COOLANT ? <Droplet size={42} /> : <Container size={42} />}
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <h2 className={`text-3xl font-black tracking-tighter uppercase leading-tight truncate ${isHigh ? 'text-red-500' : 'text-white'}`}>
                                            {req.type === SupportType.SWARF ? (req.contentMaterial || 'Spanen') : req.type === SupportType.MATERIAL ? 'Materiaal' : req.type === SupportType.COOLANT ? 'Leibaan olie' : 'Lege Bak'}
                                        </h2>
                                        <div className="text-xl font-mono text-slate-500 mt-1">{new Date(req.requestDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                    </div>
                                </div>

                                <div className="bg-black/50 rounded-[2.5rem] p-6 border border-white/5 mb-6">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-left">Bestemming</div>
                                    <div className="text-2xl font-black truncate uppercase tracking-tighter text-blue-500 text-left">{machine?.name || 'ALGEMENE OPROEP'}</div>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {req.location && <div className="flex items-center gap-2 text-white font-bold text-[12px] bg-blue-600/30 px-3 py-1 rounded-full uppercase border border-blue-500/20"><MapPin size={12} className="text-blue-500" /> {req.location}</div>}
                                        {req.desiredTime && <div className="flex items-center gap-2 text-black font-black text-[12px] bg-yellow-400 px-3 py-1 rounded-full uppercase"><CalendarClock size={12} /> {req.desiredTime}</div>}
                                    </div>
                                </div>

                                {req.message && (
                                    <div className="bg-yellow-400/10 border border-yellow-400/20 p-4 rounded-2xl text-yellow-500 text-sm font-bold flex items-start gap-3 text-left">
                                        <Info size={20} className="shrink-0" />
                                        <span className="leading-tight uppercase tracking-tight break-words">{req.message}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 shrink-0">
                                {isAccepted ? (
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-4 bg-blue-600/20 p-4 rounded-[2rem] border border-blue-500/30">
                                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white"><User size={20} /></div>
                                            <div className="text-left"><div className="text-[9px] font-black text-blue-500 uppercase">Onderweg</div><div className="text-lg font-black text-white italic">{req.acceptedBy}</div></div>
                                        </div>
                                        <button onClick={() => handleComplete(req)} className="w-full h-20 bg-green-600 hover:bg-green-500 text-white rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 transition-all shadow-[inset_0_-8px_0_rgba(0,0,0,0.2)] uppercase tracking-widest">
                                            <CheckCircle size={28} /> AFGEROND
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => handleAccept(req)} className={`w-full h-24 rounded-[2.5rem] font-black text-3xl shadow-2xl flex items-center justify-center gap-6 transition-all ring-8 ring-white/5 uppercase tracking-widest shadow-[inset_0_-8px_0_rgba(0,0,0,0.2)] ${isHigh ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                        <Zap size={32} fill="currentColor" /> ACCEPTEREN
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
