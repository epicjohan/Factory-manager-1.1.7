
import React, { useState, useMemo } from 'react';
import { X, Send, AlertTriangle, Info, MapPin, Monitor, User } from '../icons';
import { useAuth } from '../contexts/AuthContext';
import { TeamsService, TeamsUrgency } from '../services/teams';
import { db } from '../services/storage';
import { Machine, SupportRequest, SupportStatus, SupportType, UserRole, User as UserType } from '../types';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';

interface TeamsSupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TeamsSupportModal: React.FC<TeamsSupportModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [urgency, setUrgency] = useState<TeamsUrgency>('NORMAL');
    const [location, setLocation] = useState('');
    const [selectedMachineId, setSelectedMachineId] = useState('');
    const [targetManager, setTargetManager] = useState('');
    
    // REACTIVE HOOKS
    const { data: machines } = useTable<Machine>(KEYS.MACHINES);
    const { data: allUsers } = useTable<UserType>(KEYS.USERS);
    
    // Derived State
    const managers = useMemo(() => {
        return allUsers.filter(u => u.role === UserRole.MANAGER || u.role === UserRole.ADMIN);
    }, [allUsers]);
    
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<{success: boolean, msg: string} | null>(null);

    if (!isOpen) return null;

    const subjects = [
        "Technische Vraag",
        "Kwaliteitsissue",
        "Materiaal Tekort",
        "Planning / Order",
        "Veiligheid / HSE",
        "Overig"
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSending(true);
        setStatus(null);

        // Get Machine Name if selected
        let machineInfo = undefined;
        if (selectedMachineId) {
            const m = machines.find(mac => mac.id === selectedMachineId);
            if (m) {
                machineInfo = `${m.name} (${m.machineNumber})`;
            }
        }

        // 1. Send to Teams Webhook (Notification)
        const teamsResult = await TeamsService.sendQuestion(user, subject, message, urgency, location, machineInfo, targetManager);
        
        // 2. Save to Internal Database (For Answer Tracking)
        if (teamsResult.success) {
            const newRequest: SupportRequest = {
                id: Date.now().toString(),
                machineId: selectedMachineId || 'GENERAL', // Use a general ID if no machine selected
                type: SupportType.QUESTION,
                status: SupportStatus.PENDING,
                requestDate: new Date().toISOString(),
                requester: user.name,
                message: `[${subject}] ${message}`,
                urgency: urgency,
                location: location,
                targetManager: targetManager || 'Algemeen'
            };
            db.addSupportRequest(newRequest);
        }

        setIsSending(false);
        setStatus({ success: teamsResult.success, msg: teamsResult.message });

        if (teamsResult.success) {
            setTimeout(() => {
                onClose();
                // Reset form
                setSubject('');
                setMessage('');
                setUrgency('NORMAL');
                setLocation('');
                setSelectedMachineId('');
                setTargetManager('');
                setStatus(null);
            }, 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 backdrop-blur-md">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="bg-[#464EB8] text-white p-1.5 rounded text-xs font-bold">Teams</span>
                        Vraag aan Manager
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Status Feedback */}
                    {status && (
                        <div className={`p-3 rounded-2xl text-sm font-bold flex items-center gap-2 ${status.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {status.success ? <Info size={16} /> : <AlertTriangle size={16} />}
                            {status.msg}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Aan wie stelt u deze vraag?</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-3.5 text-slate-400" />
                            <select 
                                className="w-full pl-9 p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white outline-none focus:border-purple-500"
                                value={targetManager}
                                onChange={e => setTargetManager(e.target.value)}
                            >
                                <option value="">-- Algemeen / Alle Managers --</option>
                                {managers.map(m => (
                                    <option key={m.id} value={m.name}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Onderwerp</label>
                        <select 
                            required
                            className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white outline-none focus:border-purple-500"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                        >
                            <option value="">-- Selecteer onderwerp --</option>
                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Machine (Optioneel)</label>
                        <div className="relative">
                            <Monitor size={16} className="absolute left-3 top-3.5 text-slate-400" />
                            <select 
                                className="w-full pl-9 p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white outline-none focus:border-purple-500"
                                value={selectedMachineId}
                                onChange={e => setSelectedMachineId(e.target.value)}
                            >
                                <option value="">-- Geen Machine --</option>
                                {machines.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.machineNumber})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Uw Vraag / Bericht</label>
                        <textarea 
                            required
                            rows={4}
                            className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white outline-none focus:border-purple-500"
                            placeholder="Typ hier uw bericht..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Specifieke Locatie (Optioneel)</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-3.5 text-slate-400" />
                            <input 
                                type="text"
                                className="w-full pl-9 p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white outline-none focus:border-purple-500"
                                placeholder="Bijv. Hal 3, Stelling A"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Urgentie</label>
                        <div className="flex gap-3">
                            <button
                                type="button" 
                                onClick={() => setUrgency('NORMAL')}
                                className={`flex-1 p-3 rounded-[2rem] border-2 font-bold transition-all ${urgency === 'NORMAL' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200' : 'border-slate-200 dark:border-slate-600 text-slate-500'}`}
                            >
                                <span className="flex justify-center items-center gap-2"><Info size={16} /> Normaal</span>
                            </button>
                            <button
                                type="button" 
                                onClick={() => setUrgency('HIGH')}
                                className={`flex-1 p-3 rounded-[2rem] border-2 font-bold transition-all ${urgency === 'HIGH' ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-blue-200' : 'border-slate-200 dark:border-slate-600 text-slate-500'}`}
                            >
                                <span className="flex justify-center items-center gap-2"><AlertTriangle size={16} /> Spoed</span>
                            </button>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={isSending}
                            className="w-full py-3 bg-[#464EB8] hover:bg-[#3b429c] text-white font-bold rounded-[2rem] shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSending ? 'Verzenden...' : <><Send size={18} /> Verstuur naar Teams & Opslaan</>}
                        </button>
                        <p className="text-[10px] text-slate-400 text-center mt-2">
                            Uw vraag wordt ook opgeslagen in het Support Dashboard.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};
