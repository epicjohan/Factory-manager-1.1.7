
import React, { useState, useMemo } from 'react';
import { db } from '../services/storage';
import { SupportRequest, SupportStatus, SupportType, Machine, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
    MessageSquare, 
    CheckCircle, 
    Clock, 
    User, 
    MapPin, 
    Monitor, 
    CloudCog, 
    Send,
    MessageCircle,
    History
} from '../icons';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';

export const QuestionsDashboard: React.FC = () => {
    const { user } = useAuth();
    
    // REACTIVE HOOKS
    // useTable handles fetching, event listening, AND outbox merging internally.
    const { data: allRequests } = useTable<SupportRequest>(KEYS.REQUESTS);
    const { data: machines } = useTable<Machine>(KEYS.MACHINES);
    
    const [viewMode, setViewMode] = useState<'PENDING' | 'HISTORY'>('PENDING');
    
    // Reply State
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    const isManagement = user?.role === UserRole.MANAGER || user?.role === UserRole.ADMIN;

    const mergedRequests = useMemo(() => {
        // Filter only Questions
        const questions = allRequests.filter(r => r.type === SupportType.QUESTION);
        
        // Filter based on role: Managers see all, Operators see their own
        const visible = isManagement 
            ? questions 
            : questions.filter(r => r.requester === user?.name);

        return visible.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    }, [allRequests, isManagement, user?.name]);

    const handleSendReply = (req: SupportRequest) => {
        if (!replyText.trim()) return;
        
        const updated: SupportRequest = {
            ...req,
            answer: replyText,
            status: SupportStatus.COMPLETED,
            completedDate: new Date().toISOString(),
            completedBy: user?.name
        };

        db.updateSupportRequest(updated);
        // UI updates automatically via useTable hook
        setReplyingToId(null);
        setReplyText('');
    };

    const getMachineInfo = (id: string) => {
        if (id === 'GENERAL') return 'Algemene Vraag';
        const m = machines.find(mac => mac.id === id);
        return m ? `${m.name} (${m.machineNumber})` : 'Onbekend';
    };

    const pendingRequests = mergedRequests.filter(r => r.status !== SupportStatus.COMPLETED);
    const historyRequests = mergedRequests.filter(r => r.status === SupportStatus.COMPLETED);
    const displayList = viewMode === 'PENDING' ? pendingRequests : historyRequests;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 text-left animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 uppercase italic tracking-tighter">
                        <div className="p-3 bg-violet-600 text-white rounded-2xl shadow-xl shadow-violet-500/20">
                            <MessageSquare size={32} />
                        </div>
                        Vragen <span className="text-violet-600">&</span> Berichten
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Communicatie tussen de werkvloer en management.
                    </p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={() => setViewMode('PENDING')}
                        className={`px-8 py-3 rounded-xl text-[11px] font-black flex items-center gap-2 uppercase tracking-widest transition-all ${viewMode === 'PENDING' ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Clock size={16} /> OPENSTAAND ({pendingRequests.length})
                    </button>
                    <button 
                        onClick={() => setViewMode('HISTORY')}
                        className={`px-8 py-3 rounded-xl text-[11px] font-black flex items-center gap-2 uppercase tracking-widest transition-all ${viewMode === 'HISTORY' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <History size={16} /> ARCHIEF
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {displayList.map(req => (
                    <div key={req.id} className={`p-6 rounded-[2rem] border-2 transition-all shadow-sm bg-white dark:bg-slate-800 ${req.status === SupportStatus.PENDING ? 'border-violet-200 dark:border-violet-900/50' : 'border-slate-100 dark:border-slate-800 opacity-90'}`}>
                        <div className="flex flex-col lg:flex-row gap-8">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${req.urgency === 'HIGH' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-blue-100 text-blue-600 border border-blue-200'}`}>
                                        {req.urgency === 'HIGH' ? '🛑 SPOED' : 'ℹ️ Normaal'}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Gevraagd op {new Date(req.requestDate).toLocaleString()}
                                    </span>
                                    {(req as any).isPending && <CloudCog size={14} className="text-orange-500 animate-spin-slow" />}
                                </div>

                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl shrink-0">
                                        <User size={24} className="text-slate-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-slate-400 uppercase mb-1">{req.requester} vraagt:</div>
                                        <p className="text-lg font-bold text-slate-800 dark:text-white leading-snug whitespace-normal break-words">
                                            {req.message}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">
                                        <Monitor size={14} className="text-blue-500" /> {getMachineInfo(req.machineId)}
                                    </div>
                                    {req.location && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">
                                            <MapPin size={14} className="text-purple-500" /> {req.location}
                                        </div>
                                    )}
                                </div>

                                {/* ANSWER SECTION */}
                                {req.answer && (
                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-4">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 shrink-0">
                                                <CheckCircle size={24} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-black text-emerald-600 uppercase mb-1">Antwoord van {req.completedBy}:</div>
                                                <p className="text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed italic">
                                                    "{req.answer}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ACTION COLUMN */}
                            <div className="lg:w-64 flex flex-col justify-center gap-3">
                                {viewMode === 'PENDING' && isManagement && !req.answer && replyingToId !== req.id && (
                                    <button 
                                        onClick={() => setReplyingToId(req.id)}
                                        className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black shadow-xl shadow-violet-500/30 flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest text-sm"
                                    >
                                        Beantwoorden <Send size={20} />
                                    </button>
                                )}

                                {replyingToId === req.id && (
                                    <div className="space-y-3 animate-in zoom-in duration-200">
                                        <textarea 
                                            autoFocus
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-violet-200 dark:border-violet-900 rounded-2xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                                            placeholder="Typ uw antwoord..."
                                            rows={3}
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={() => setReplyingToId(null)} className="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Annuleren</button>
                                            <button 
                                                onClick={() => handleSendReply(req)}
                                                className="flex-2 py-3 px-6 bg-emerald-600 text-white rounded-xl font-black shadow-lg uppercase text-xs"
                                            >
                                                Verzenden
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {req.status === SupportStatus.COMPLETED && (
                                    <div className="flex flex-col items-center gap-1 opacity-50">
                                        <CheckCircle size={32} className="text-emerald-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest italic">Afgehandeld</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {displayList.length === 0 && (
                    <div className="py-32 text-center bg-white dark:bg-slate-800/20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm border border-slate-100 dark:border-slate-700 opacity-20">
                            <MessageCircle size={48} className="text-slate-400" />
                        </div>
                        <p className="font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Geen berichten</p>
                        <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest italic">
                            {viewMode === 'PENDING' ? 'Er zijn op dit moment geen openstaande vragen.' : 'Het archief is leeg.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
