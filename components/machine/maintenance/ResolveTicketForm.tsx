
import React, { useState } from 'react';
import { MaintenanceTicket, Permission } from '../../../types';
import { db } from '../../../services/storage';
import { useAuth } from '../../../contexts/AuthContext';
import { CheckCircle, Euro, Timer, X } from '../../../icons';

interface ResolveTicketFormProps {
    ticket: MaintenanceTicket;
    onClose: () => void;
}

export const ResolveTicketForm: React.FC<ResolveTicketFormProps> = ({ ticket, onClose }) => {
    const { user, hasPermission } = useAuth();
    const [resolveCost, setResolveCost] = useState(0);
    const [resolveTime, setResolveTime] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !hasPermission(Permission.RESOLVE_TICKET)) return;

        const updatedTicket: MaintenanceTicket = { 
            ...ticket, 
            status: 'RESOLVED', 
            resolvedBy: user.name, 
            resolvedDate: new Date().toISOString(), 
            repairCost: (ticket.repairCost || 0) + resolveCost, 
            downtimeMinutes: resolveTime 
        };
        
        db.updateMaintenanceTicket(updatedTicket);
        onClose();
    };

    return (
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border-2 border-green-200 dark:border-green-800 animate-in fade-in zoom-in duration-200 mt-6">
            <div className="flex justify-between items-center mb-6">
                <h5 className="font-black text-green-800 dark:text-green-300 text-xs uppercase tracking-[0.2em]">Afsluitings Rapportage</h5>
                <button type="button" onClick={onClose} className="text-green-800 dark:text-green-400 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] uppercase font-black text-green-700 dark:text-green-400 mb-2 tracking-widest">Arbeid & Externen (€)</label>
                        <div className="relative">
                            <Euro size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400" />
                            <input type="number" step="0.01" className="w-full pl-10 p-3 rounded-xl border border-green-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-lg font-black outline-none focus:border-green-500 shadow-sm" value={resolveCost} onChange={e => setResolveCost(parseFloat(e.target.value))} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-black text-green-700 dark:text-green-400 mb-2 tracking-widest">Totale Stilstand (minuten)</label>
                        <div className="relative">
                            <Timer size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400" />
                            <input type="number" className="w-full pl-10 p-3 rounded-xl border border-green-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-lg font-black outline-none focus:border-green-500 shadow-sm" value={resolveTime} onChange={e => setResolveTime(parseInt(e.target.value))} />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-green-100 dark:border-green-900 flex justify-between items-center text-xs font-black text-slate-500 uppercase tracking-widest shadow-inner">
                    <span>Totaal Investering:</span>
                    <span className="text-xl font-mono text-green-600 font-black italic">€ {(ticket.repairCost || 0 + resolveCost).toFixed(2)}</span>
                </div>
                <button type="submit" className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform">
                    <CheckCircle size={24} /> Melding Afsluiten
                </button>
            </form>
        </div>
    );
};
