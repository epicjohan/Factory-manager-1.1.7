import { useState, useEffect, useMemo } from 'react';
import { MaintenanceTicket, SyncEntry } from '../types';
import { db } from '../services/storage';

/**
 * useMaintenance
 * Specialized hook for machine-specific maintenance data.
 * Updated for Async IndexedDB support.
 */
export const useMaintenance = (machineId: string | undefined) => {
    const [dbTickets, setDbTickets] = useState<MaintenanceTicket[]>([]);
    const [outbox, setOutbox] = useState<SyncEntry[]>([]);

    const refresh = async () => {
        if (!machineId) return;
        try {
            // Await the asynchronous database calls
            const ticketsResult = await db.getTickets(machineId);
            const outboxResult = await db.getOutbox();
            
            setDbTickets(ticketsResult || []);
            setOutbox(outboxResult || []);
        } catch (error) {
            console.error("Failed to refresh maintenance data:", error);
        }
    };

    useEffect(() => {
        refresh();
        
        // Listen for updates to refresh local state
        const handleDbUpdate = () => refresh();
        const handleOutboxUpdate = () => refresh();

        window.addEventListener('db-updated', handleDbUpdate);
        window.addEventListener('outbox-changed', handleOutboxUpdate);

        return () => {
            window.removeEventListener('db-updated', handleDbUpdate);
            window.removeEventListener('outbox-changed', handleOutboxUpdate);
        };
    }, [machineId]);

    const tickets = useMemo(() => {
        if (!machineId) return [];

        // 1. Start with existing records from database
        const ticketsMap = new Map<string, MaintenanceTicket & { isPending?: boolean }>();
        dbTickets.forEach(t => ticketsMap.set(t.id, { ...t }));

        // 2. Merge optimistic updates from outbox
        const relevantOutbox = outbox
            .filter(i => i.table === 'fm_table_tickets' && (i.action === 'INSERT' || i.action === 'UPDATE'))
            .filter(i => i.data.machineId === machineId)
            .sort((a, b) => a.timestamp - b.timestamp);

        relevantOutbox.forEach(item => {
            const existing = ticketsMap.get(item.data.id);
            ticketsMap.set(item.data.id, {
                ...existing,
                ...item.data,
                isPending: true
            });
        });

        // 3. Return sorted array
        return Array.from(ticketsMap.values())
            .sort((a, b) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime());
    }, [dbTickets, outbox, machineId]);

    const activeTickets = useMemo(() => tickets.filter(t => t.status === 'OPEN'), [tickets]);

    return { tickets, activeTickets, refresh };
};