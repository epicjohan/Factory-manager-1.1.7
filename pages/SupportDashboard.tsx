
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../services/storage';
import { SupportRequest, SupportStatus, SupportType, Machine } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Megaphone, CheckCircle, ArrowRight, Droplet, Box, Recycle, Container, MapPin, Layers, History, Activity, Monitor, Clock, MessageSquare } from '../icons';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';

export const SupportDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const { data: allRequests } = useTable<SupportRequest>(KEYS.REQUESTS);
    const { data: allMachines } = useTable<Machine>(KEYS.MACHINES);

    const [viewMode, setViewMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
    const [statusFilter, setStatusFilter] = useState<SupportStatus | 'ALL'>('ALL'); 

    const requests = useMemo(() => {
        return allRequests.filter(r => r.type !== SupportType.QUESTION);
    }, [allRequests]);

    const getMachineName = (id: string) => {
        if(id === 'GENERAL') return 'Algemene Oproep';
        const m = allMachines.find(mac => mac.id === id);
        return m ? `${m.name} (${m.machineNumber})` : 'Onbekende Machine';
    };

    const handleStatusUpdate = (req: SupportRequest, newStatus: SupportStatus) => {
        if (!user) return;
        const updated: SupportRequest = {
            ...req,
            status: newStatus
        };

        if (newStatus === SupportStatus.ACCEPTED) {
            updated.acceptedBy = user.name;
        } else if (newStatus === SupportStatus.COMPLETED) {
            updated.completedBy = user.name;
            updated.completedDate = new Date().toISOString();
        }

        db.updateSupportRequest(updated);
    };

    const getIcon = (type: SupportType) => {
        switch(type) {
            case SupportType.SWARF: return <Recycle size={28} className="text-orange-500" />;
            case SupportType.EMPTY_BIN: return <Container size={28} className="text-teal-500" />;
            case SupportType.COOLANT: return <Droplet size={28} className="text-blue-500" />;
            case SupportType.MATERIAL: return <Box size={28} className="text-purple-500" />;
            default: return <Megaphone size={28} className="text-slate-500" />;
        }
    };

    const getTypeLabel = (type: SupportType) => {
        switch(type) {
            case SupportType.SWARF: return 'Spanenbak Vol';
            case SupportType.EMPTY_BIN: return 'Extra Lege Bak';
            case SupportType.COOLANT: return 'Olie bijvullen';
            case SupportType.MATERIAL: return 'Materiaal Aanvoer';
            default: return 'Support Oproep';
        }
    };

    const activeRequests = requests.filter(r => r.status !== SupportStatus.COMPLETED);
    const historyRequests = requests.filter(r => r.status === SupportStatus.COMPLETED);

    const visibleActiveRequests = activeRequests
        .filter(r => statusFilter === 'ALL' || r.status === statusFilter)
        .sort((a,b) => {
            if (a.urgency === 'HIGH' && b.urgency !== 'HIGH') return -1;
            if (a.urgency !== 'HIGH' && b.urgency === 'HIGH') return 1;
            return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
        });

    const displayRequests = viewMode === 'ACTIVE' ? visibleActiveRequests : historyRequests;
    const pendingCount = activeRequests.filter(r => r.status === SupportStatus.PENDING).length;
    const acceptedCount = activeRequests.filter(r => r.status === SupportStatus.ACCEPTED).length;

    const RequestCard: React.FC<{ req: SupportRequest }> = ({ req }) => (
        <div className={`p-6 rounded-[2rem] border-2 transition-all shadow-sm ${req.status === SupportStatus.PENDING ? 'bg-white dark:bg-slate-800 border-red-500 glow-red' : req.status === SupportStatus.ACCEPTED ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-500 dark:border-blue-900' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-80'}`}>
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex items-start gap-5 flex-1 min-w-0">
                    <div className={`p-4 rounded-2xl shadow-inner shrink-0 ${req.status === SupportStatus.PENDING ? 'bg-red-50 dark:bg-red-900/40' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        {getIcon(req.type)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">{getTypeLabel(req.type)}</h4>
                            {req.urgency === 'HIGH' && (
                                <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase animate-pulse shadow-lg tracking-[0.2em] shrink-0">🛑 Spoed</span>
                            )}
                        </div>
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <MapPin size={14} className="shrink-0" />
                            <span className="truncate">{getMachineName(req.machineId)}</span>
                        </div>
                        
                        <div className="space-y-3">
                            {req.message && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 text-slate-800 dark:text-slate-200 p-4 rounded-2xl border-l-4 border-amber-400 shadow-sm">
                                    <div className="flex items-center gap-2 mb-1 text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest">
                                        <MessageSquare size={12} className="shrink-0" /> Bericht van Operator
                                    </div>
                                    <div className="text-sm font-medium leading-relaxed whitespace-normal break-words">{req.message}</div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                                {req.contentMaterial && req.type === SupportType.SWARF && (
                                    <div className="flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-full font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter">
                                        <Layers size={14} className="text-orange-500 shrink-0" />
                                        Inhoud: {req.contentMaterial}
                                    </div>
                                )}
                                {req.location && (
                                    <div className="flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-full font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter">
                                        <MapPin size={14} className="text-purple-500 shrink-0" />
                                        Vak: {req.location}
                                    </div>
                                )}
                                {req.desiredTime && (
                                    <div className="flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-full font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter">
                                        <Clock size={14} className="text-purple-500 shrink-0" />
                                        TIJD: {req.desiredTime}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100 dark:border-slate-700/50 pt-3">
                            <span className="flex items-center gap-1.5 shrink-0">
                                <Clock size={14} className="shrink-0" />
                                {new Date(req.requestDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <span className="opacity-30">•</span>
                            <span className="truncate">Door: {req.requester}</span>
                            {req.acceptedBy && (
                                <>
                                    <span className="opacity-30">•</span>
                                    <span className="text-blue-500 font-black">Behandelaar: {req.acceptedBy}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col justify-center items-stretch lg:items-end gap-3 shrink-0 lg:min-w-[180px]">
                    {viewMode === 'ACTIVE' && req.status === SupportStatus.PENDING && (
                        <button 
                            onClick={() => handleStatusUpdate(req, SupportStatus.ACCEPTED)}
                            className="h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-xl shadow-blue-500/30 flex items-center justify-center gap-4 transition-all active:scale-95 uppercase tracking-widest text-sm"
                        >
                            Oppakken <ArrowRight size={20} />
                        </button>
                    )}
                    {viewMode === 'ACTIVE' && req.status === SupportStatus.ACCEPTED && (
                        <button 
                            onClick={() => handleStatusUpdate(req, SupportStatus.COMPLETED)}
                            className="h-14 px-8 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black shadow-xl shadow-green-500/30 flex items-center justify-center gap-4 transition-all active:scale-95 uppercase tracking-widest text-sm shadow-[inset_0_-4px_0_rgba(0,0,0,0.25)]"
                        >
                            Gereed <CheckCircle size={20} />
                        </button>
                    )}
                    {req.status === SupportStatus.COMPLETED && (
                        <div className="flex flex-col items-center lg:items-end text-slate-400 gap-1 pr-6">
                            <CheckCircle size={32} className="text-green-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Voltooid</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-8 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Megaphone size={160} />
                </div>
                <div className="relative z-10 min-w-0">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 uppercase italic tracking-tighter">
                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20">
                            <Megaphone size={32} />
                        </div>
                        Support & Logistics
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-xl">
                        Beheer de logistieke workflow en beantwoord verzoeken van de werkvloer in real-time.
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-3 w-full md:w-auto relative z-10">
                    <button 
                        onClick={() => navigate('/logistics-andon')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-slate-950 text-white hover:bg-black rounded-2xl font-black text-sm shadow-2xl shadow-blue-500/10 border border-slate-800 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest"
                    >
                        <Monitor size={20} className="text-blue-500 shrink-0" />
                        FULLSCREEN
                    </button>
                    
                    <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 flex-1 md:flex-none">
                        <button 
                            onClick={() => setViewMode('ACTIVE')}
                            className={`flex-1 md:flex-none px-8 py-3 rounded-[2rem] text-[11px] font-black flex items-center justify-center gap-2 uppercase tracking-widest transition-all ${viewMode === 'ACTIVE' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Activity size={16} /> ACTUEEL
                        </button>
                        <button 
                            onClick={() => setViewMode('HISTORY')}
                            className={`flex-1 md:flex-none px-8 py-3 rounded-[2rem] text-[11px] font-black flex items-center justify-center gap-2 uppercase tracking-widest transition-all ${viewMode === 'HISTORY' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <History size={16} /> HISTORIE
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'ACTIVE' && (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit ml-auto">
                    <button onClick={() => setStatusFilter('ALL')} className={`px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all ${statusFilter === 'ALL' ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-md' : 'text-slate-400'}`}>Alles</button>
                    <button onClick={() => setStatusFilter(SupportStatus.PENDING)} className={`px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all ${statusFilter === SupportStatus.PENDING ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'text-slate-400'}`}>Open ({pendingCount})</button>
                    <button onClick={() => setStatusFilter(SupportStatus.ACCEPTED)} className={`px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all ${statusFilter === SupportStatus.ACCEPTED ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400'}`}>Onderweg ({acceptedCount})</button>
                </div>
            )}

            <div className="space-y-4">
                {displayRequests.length > 0 ? (
                    displayRequests.map(req => <RequestCard key={req.id} req={req} />)
                ) : (
                    <div className="py-32 text-center bg-white dark:bg-slate-800/20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm border border-slate-100 dark:border-slate-700">
                            <CheckCircle size={48} className="text-slate-200 dark:text-slate-700" />
                        </div>
                        <p className="font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{viewMode === 'ACTIVE' ? 'Schoon Board' : 'Geen Historie'}</p>
                    </div>
                )}
            </div>
            
            <style>{`
                .glow-red { box-shadow: 0 0 25px rgba(239, 68, 68, 0.05); }
            `}</style>
        </div>
    );
};
