
import React, { useState, useEffect, useMemo } from 'react';
import { Machine, MaintenanceTicket, MachinePart, GeneralPart, Permission, UserRole } from '../../types';
import { db } from '../../services/storage';
import { useAuth } from '../../contexts/AuthContext';
import { useMaintenance } from '../../hooks/useMaintenance';
import { useTable } from '../../hooks/useTable';
import { KEYS } from '../../services/db/core';
import { Plus, Search } from '../../icons';

import { CreateTicketForm } from './maintenance/CreateTicketForm';
import { TicketRow } from './maintenance/TicketRow';

interface MaintenanceSectionProps {
    machine: Machine;
}

export const MaintenanceSection: React.FC<MaintenanceSectionProps> = ({ machine }) => {
    const { user, hasPermission } = useAuth();
    const { tickets, refresh } = useMaintenance(machine.id);
    const { data: allMachineParts } = useTable<MachinePart>(KEYS.PARTS_MACHINE);
    const { data: generalParts } = useTable<GeneralPart>(KEYS.PARTS_GENERAL);

    const [serverUrl, setServerUrl] = useState<string | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [showTicketForm, setShowTicketForm] = useState(false);
    const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

    // Combine Parts for Dropdowns
    const machineParts = useMemo(() => allMachineParts.filter(p => p.machineId === machine.id), [allMachineParts, machine.id]);
    const allParts = useMemo(() => [...generalParts, ...machineParts], [generalParts, machineParts]);

    useEffect(() => {
        db.getServerSettings().then(cfg => setServerUrl(cfg.url));
    }, []);

    const filteredTickets = tickets.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reportedBy.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeleteTicket = async (ticketId: string) => {
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket && ticket.usedParts && ticket.usedParts.length > 0) {
            // Restore inventory
            for (const p of ticket.usedParts) {
                await db.releasePart(p.partId, p.quantity);
            }
        }
        await db.deleteMaintenanceTicket(ticketId);
        if (expandedTicketId === ticketId) setExpandedTicketId(null);
        refresh();
    };

    return (
        <div className="space-y-6 text-left">
            {!showTicketForm ? (
                !machine.isArchived && hasPermission(Permission.CREATE_TICKET) && (
                    <button
                        onClick={() => setShowTicketForm(true)}
                        className="w-full py-4 border-[3px] border-dashed border-slate-300 dark:border-slate-600 rounded-[2rem] text-slate-500 hover:text-blue-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors flex items-center justify-center gap-3 font-black uppercase tracking-widest text-sm"
                    >
                        <Plus size={24} className="shrink-0" /> Nieuwe Melding Maken
                    </button>
                )
            ) : (
                <CreateTicketForm
                    machineId={machine.id}
                    onClose={() => setShowTicketForm(false)}
                />
            )}

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" size={18} />
                <input
                    type="text"
                    placeholder="Zoek op titel, melder of inhoud..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-3">
                {filteredTickets.map(ticket => (
                    <TicketRow
                        key={ticket.id}
                        ticket={ticket}
                        machine={machine}
                        isExpanded={expandedTicketId === ticket.id}
                        onToggle={() => setExpandedTicketId(expandedTicketId === ticket.id ? null : ticket.id)}
                        onDelete={() => handleDeleteTicket(ticket.id)}
                        parts={allParts}
                        serverUrl={serverUrl}
                    />
                ))}
                {filteredTickets.length === 0 && (
                    <div className="text-center py-20 text-slate-400 italic font-bold uppercase tracking-widest text-xs bg-white dark:bg-slate-800 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                        Geen meldingen gevonden.
                    </div>
                )}
            </div>
        </div>
    );
};
