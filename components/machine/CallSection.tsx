import React, { useState, useMemo } from 'react';
import {
    Machine,
    SupportRequest,
    SupportStatus,
    SupportType
} from '../../types';
import { db } from '../../services/storage';
import { KEYS, generateId } from '../../services/db/core';
import { useAuth } from '../../contexts/AuthContext';
import { useTable } from '../../hooks/useTable';
import {
    Recycle,
    Container,
    Droplet,
    Box,
    CloudCog,
    Clock,
    Megaphone,
    Activity,
    CheckCircle,
    History
} from '../../icons';
import { SupportRequestModals } from './SupportRequestModals';

interface CallSectionProps {
    machine: Machine;
}

export const CallSection: React.FC<CallSectionProps> = ({ machine }) => {
    const { user } = useAuth();

    const [view, setView] = useState<'EXECUTE' | 'HISTORY'>('EXECUTE');
    const [activeSupportModal, setActiveSupportModal] = useState<SupportType | null>(null);

    const { data: allRequests } = useTable<SupportRequest>(KEYS.REQUESTS);

    const supportRequests = useMemo(() => {
        return allRequests
            .filter(r => r.machineId === machine.id && r.type !== SupportType.QUESTION)
            .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    }, [allRequests, machine.id]);

    const handleCreateRequest = (type: SupportType, extraData: any = {}) => {
        if (machine.isArchived || !user) return;

        const req: SupportRequest = {
            id: generateId(),
            machineId: machine.id,
            type: type,
            status: SupportStatus.PENDING,
            requestDate: new Date().toISOString(),
            requester: user.name,
            ...extraData
        };

        db.addSupportRequest(req);
        setActiveSupportModal(null);
    };

    const activeRequests = supportRequests.filter(r => r.status !== SupportStatus.COMPLETED);
    const historyRequests = supportRequests.filter(r => r.status === SupportStatus.COMPLETED);

    const ActionButton: React.FC<{ type: SupportType, icon: any, label: string, colorClass: string }> = ({ type, icon: Icon, label, colorClass }) => (
        <button
            onClick={() => !machine.isArchived && setActiveSupportModal(type)}
            disabled={machine.isArchived}
            className={`flex flex-col items-center justify-center p-5 rounded-[2rem] border-2 transition-all hover:scale-105 active:scale-95 shadow-sm group ${machine.isArchived ? 'opacity-40 cursor-not-allowed grayscale' : `bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-${colorClass}-500 dark:hover:border-${colorClass}-500`}`}
        >
            <div className={`p-4 rounded-3xl mb-3 transition-colors flex items-center justify-center ${machine.isArchived ? 'bg-slate-100 dark:bg-slate-700 text-slate-400' : `bg-${colorClass}-50 dark:bg-${colorClass}-900/20 text-${colorClass}-500 group-hover:bg-${colorClass}-600 group-hover:text-white shadow-inner`}`}>
                <Icon size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 text-center leading-tight">{label}</span>
        </button>
    );

    const RequestItem: React.FC<{ req: any }> = ({ req }) => (
        <div className="p-4 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl shadow-inner ${req.status === SupportStatus.COMPLETED ? 'bg-slate-100 dark:bg-slate-700 text-slate-400' : req.status === SupportStatus.PENDING ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'}`}>
                    {req.type === SupportType.SWARF && <Recycle size={20} />}
                    {req.type === SupportType.EMPTY_BIN && <Container size={20} />}
                    {req.type === SupportType.COOLANT && <Droplet size={20} />}
                    {req.type === SupportType.MATERIAL && <Box size={20} />}
                </div>
                <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2 uppercase tracking-tight italic">
                        {req.type === SupportType.SWARF ? (req.contentMaterial || 'Spanenbak Vol') : req.type === SupportType.EMPTY_BIN ? 'Extra Lege Bak' : req.type === SupportType.COOLANT ? 'Leibaan olie' : 'Materiaal Aanvraag'}
                        {req.isPending && <CloudCog size={14} className="text-orange-500 animate-spin-slow" />}
                        {req.urgency === 'HIGH' && <span className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black animate-pulse shadow-sm">SPOED</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-3 mt-0.5 font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Clock size={10} /> {new Date(req.requestDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span className={`flex items-center gap-1 ${req.status === SupportStatus.ACCEPTED ? 'text-blue-500' : req.status === SupportStatus.COMPLETED ? 'text-green-500' : 'text-slate-400'}`}>
                            {req.status === SupportStatus.ACCEPTED ? 'Chauffeur onderweg' : req.status === SupportStatus.COMPLETED ? `Gereed door ${req.completedBy}` : 'Wacht op logistiek'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {req.status === SupportStatus.ACCEPTED && (
                    <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Chauffeur</span>
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 italic">{req.acceptedBy}</span>
                    </div>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${req.status === SupportStatus.ACCEPTED ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : req.status === SupportStatus.COMPLETED ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-slate-700 border-transparent text-slate-400'}`}>
                    {req.status === SupportStatus.ACCEPTED ? <Activity size={18} className="animate-pulse" /> : req.status === SupportStatus.COMPLETED ? <CheckCircle size={18} /> : <Clock size={18} />}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex bg-slate-100 dark:bg-slate-900 rounded-[2rem] p-1.5 border border-slate-200 dark:border-slate-700 w-fit">
                    <button
                        onClick={() => setView('EXECUTE')}
                        className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'EXECUTE' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Megaphone size={16} /> Oproep
                    </button>
                    <button
                        onClick={() => setView('HISTORY')}
                        className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'HISTORY' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <History size={16} /> Historie
                    </button>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest shadow-inner">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    Andon Link Active
                </div>
            </div>

            {view === 'EXECUTE' ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <ActionButton type={SupportType.SWARF} icon={Recycle} label="Spanenbak Vol" colorClass="orange" />
                        <ActionButton type={SupportType.MATERIAL} icon={Box} label="Nieuw Materiaal" colorClass="purple" />
                        <ActionButton type={SupportType.COOLANT} icon={Droplet} label="Leibaan Olie" colorClass="blue" />
                        <ActionButton type={SupportType.EMPTY_BIN} icon={Container} label="Extra Lege Bak" colorClass="teal" />
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                <Activity size={14} className="text-blue-500" /> Lopende verzoeken
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${activeRequests.length > 0 ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                {activeRequests.length}
                            </span>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {activeRequests.length > 0 ? (
                                activeRequests.map(req => <RequestItem key={req.id} req={req} />)
                            ) : (
                                <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800 shadow-inner">
                                        <CheckCircle size={32} className="opacity-10 text-green-500" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest italic opacity-60">Geen actieve oproepen</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-in slide-in-from-right-2 duration-300">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                            <History size={14} className="text-slate-400" /> Afgeronde support
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto no-scrollbar">
                        {historyRequests.length > 0 ? (
                            historyRequests.map(req => <RequestItem key={req.id} req={req} />)
                        ) : (
                            <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400 italic">
                                <History size={40} className="mb-4 opacity-10" />
                                <p className="text-xs uppercase font-bold tracking-widest">Nog geen historie beschikbaar</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <SupportRequestModals activeType={activeSupportModal} onClose={() => setActiveSupportModal(null)} onSubmit={handleCreateRequest} />

            <div className="flex items-start gap-5 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-800 shadow-inner">
                <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg shrink-0 flex items-center justify-center">
                    <Megaphone size={20} />
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-[0.2em] mb-2">Informatie</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-bold leading-relaxed">
                        Deze oproepen verschijnen direct op het Andon-bord van de logistiek medewerker. Zodra zij de oproep accepteren, zie je hier wie er onderweg is naar deze machine.
                    </p>
                </div>
            </div>
        </div>
    );
};