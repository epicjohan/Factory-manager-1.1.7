
import React, { useState } from 'react';
import { MaintenanceTicket, TicketImpact, Permission } from '../../../types';
import { db } from '../../../services/storage';
import { generateId } from '../../../services/db/core';
import { useAuth } from '../../../contexts/AuthContext';

interface CreateTicketFormProps {
    machineId: string;
    onClose: () => void;
}

export const CreateTicketForm: React.FC<CreateTicketFormProps> = ({ machineId, onClose }) => {
    const { user, hasPermission } = useAuth();
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [impact, setImpact] = useState<TicketImpact>(TicketImpact.NORMAL);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !title.trim()) return;

        const newTicket: MaintenanceTicket = { 
            id: generateId(), 
            machineId, 
            title, 
            description: desc, 
            reportedBy: user.name, 
            reportedDate: new Date().toISOString(), 
            status: 'OPEN', 
            impact, 
            actions: [] 
        };

        db.addMaintenanceTicket(newTicket);
        
        // Auto-update machine status on critical impact
        if (impact === TicketImpact.CRITICAL && hasPermission(Permission.UPDATE_MACHINE_STATUS)) {
             db.getMachines().then(machines => {
                 const m = machines.find(x => x.id === machineId);
                 if (m) db.updateMachine({ ...m, status: 'ERROR' });
             });
        }

        onClose();
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 mb-6"> 
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-widest text-sm">Nieuwe Melding Registreren</h3> 
            <form onSubmit={handleSubmit} className="space-y-4"> 
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 text-left tracking-widest">Titel van de storing</label>
                    <input required type="text" className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white outline-none focus:border-blue-500 font-bold" value={title} onChange={e => setTitle(e.target.value)} placeholder="Bijv: Lekkage bij spindel..." />
                </div> 
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 text-left tracking-widest">Gedetailleerde Omschrijving</label>
                    <textarea className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white outline-none focus:border-blue-500 text-sm" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Omschrijf de situatie zo nauwkeurig mogelijk..." rows={4} />
                </div> 
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 text-left tracking-widest">Impact</label>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setImpact(TicketImpact.NORMAL)} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${impact === TicketImpact.NORMAL ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-500'}`}>Normaal</button>
                        <button type="button" onClick={() => setImpact(TicketImpact.CRITICAL)} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${impact === TicketImpact.CRITICAL ? 'bg-red-600 border-red-500 text-white shadow-lg animate-pulse' : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-500'}`}>Kritiek</button>
                    </div>
                </div> 
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Annuleren</button>
                    <button type="submit" className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 px-8">Melding Opslaan</button>
                </div> 
            </form> 
        </div>
    );
};
