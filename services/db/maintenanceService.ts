
import { MaintenanceTicket, MixingLog, MistLog, ChecklistLog, EfficiencyLog, SupportRequest, MaintenanceEvent, Machine } from '../../types';
import { KEYS, loadTable, saveTable, outboxUtils, getNowISO, getCurrentUserName } from './core';

const getMachineName = async (id: string) => {
    const machines = await loadTable<Machine[]>(KEYS.MACHINES, []);
    return machines.find(m => m.id === id)?.name || id;
};

export const maintenanceService = {
    getAllTickets: () => loadTable<MaintenanceTicket[]>(KEYS.TICKETS, []),
    getTickets: async (id: string) => (await maintenanceService.getAllTickets()).filter(t => t.machineId === id),
    addMaintenanceTicket: async (t: MaintenanceTicket) => { 
        const now = getNowISO();
        t.updatedAt = Date.now();
        (t as any).updated = now;
        (t as any).created = now;
        const items = await maintenanceService.getAllTickets();
        items.push(t);
        await saveTable(KEYS.TICKETS, items);
        await outboxUtils.addToOutbox(KEYS.TICKETS, 'INSERT', t);
        
        const mName = await getMachineName(t.machineId);
        await outboxUtils.logAudit('NEW_TICKET', t.reportedBy, `Nieuw ticket gemeld voor ${mName}: ${t.title}`);
    },
    updateMaintenanceTicket: async (t: MaintenanceTicket) => { 
        const now = getNowISO();
        t.updatedAt = Date.now();
        (t as any).updated = now;
        
        const oldTickets = await maintenanceService.getAllTickets();
        const oldTicket = oldTickets.find(x => x.id === t.id);
        const items = oldTickets.map(x => x.id === t.id ? t : x);
        await saveTable(KEYS.TICKETS, items);
        await outboxUtils.addToOutbox(KEYS.TICKETS, 'UPDATE', t);

        if (oldTicket && oldTicket.status !== t.status && t.status === 'RESOLVED') {
            const mName = await getMachineName(t.machineId);
            await outboxUtils.logAudit('RESOLVE_TICKET', t.resolvedBy || getCurrentUserName(), `Storing bij ${mName} opgelost. Kosten: €${t.repairCost || 0}`);
        }
    },
    deleteMaintenanceTicket: async (id: string) => {
        const items = (await maintenanceService.getAllTickets()).filter(t => t.id !== id);
        await saveTable(KEYS.TICKETS, items);
        await outboxUtils.addToOutbox(KEYS.TICKETS, 'DELETE', { id });
        await outboxUtils.logAudit('DELETE_TICKET', getCurrentUserName(), `Ticket ${id} verwijderd uit historie.`);
    },
    getMixingLogs: async (id: string) => (await loadTable<MixingLog[]>(KEYS.LOGS_MIXING, [])).filter(l => l.machineId === id),
    addMixingLog: async (l: MixingLog) => { 
        const now = getNowISO();
        (l as any).updated = now;
        (l as any).created = now;
        const items = await loadTable<MixingLog[]>(KEYS.LOGS_MIXING, []); 
        items.push(l); 
        await saveTable(KEYS.LOGS_MIXING, items); 
        await outboxUtils.addToOutbox(KEYS.LOGS_MIXING, 'INSERT', l);
        
        const mName = await getMachineName(l.machineId);
        await outboxUtils.logAudit('COOLING_LOG', l.performedBy, `Koeling registratie bij ${mName}: ${l.type} ${l.percentage ? '(' + l.percentage + '%)' : ''}`);
    },
    deleteMixingLog: async (id: string) => { 
        const items = (await loadTable<MixingLog[]>(KEYS.LOGS_MIXING, [])).filter(l => l.id !== id); 
        await saveTable(KEYS.LOGS_MIXING, items); 
        await outboxUtils.addToOutbox(KEYS.LOGS_MIXING, 'DELETE', { id });
    },
    getMistLogs: async (id: string) => (await loadTable<MistLog[]>(KEYS.LOGS_MIST, [])).filter(l => l.machineId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    addMistLog: async (l: MistLog) => { 
        const now = getNowISO();
        (l as any).updated = now;
        (l as any).created = now;
        const items = await loadTable<MistLog[]>(KEYS.LOGS_MIST, []); 
        items.unshift(l); 
        await saveTable(KEYS.LOGS_MIST, items); 
        await outboxUtils.addToOutbox(KEYS.LOGS_MIST, 'INSERT', l);
        
        const mName = await getMachineName(l.machineId);
        await outboxUtils.logAudit('MIST_FILTER', l.replacedBy, `Mistfilter wissel (${l.stage}) bij ${mName}`);
    },
    deleteMistLog: async (id: string) => {
        const items = (await loadTable<MistLog[]>(KEYS.LOGS_MIST, [])).filter(l => l.id !== id);
        await saveTable(KEYS.LOGS_MIST, items);
        await outboxUtils.addToOutbox(KEYS.LOGS_MIST, 'DELETE', { id });
    },
    getChecklistLogs: async (id: string) => (await loadTable<ChecklistLog[]>(KEYS.LOGS_CHECKLIST, [])).filter(l => l.machineId === id),
    addChecklistLog: async (l: ChecklistLog) => { 
        const now = getNowISO();
        (l as any).updated = now;
        (l as any).created = now;
        const items = await loadTable<ChecklistLog[]>(KEYS.LOGS_CHECKLIST, []); 
        items.push(l); 
        await saveTable(KEYS.LOGS_CHECKLIST, items); 
        await outboxUtils.addToOutbox(KEYS.LOGS_CHECKLIST, 'INSERT', l);
        
        const mName = await getMachineName(l.machineId);
        await outboxUtils.logAudit('CHECKLIST_OK', l.checkedBy, `Checklist item afgevinkt voor ${mName}`);
    },
    getEfficiencyLogs: async (machineId?: string) => {
        const all = await loadTable<EfficiencyLog[]>(KEYS.LOGS_EFFICIENCY, []);
        if (machineId) return all.filter(l => l.machineId === machineId);
        return all;
    },
    addEfficiencyLog: async (log: EfficiencyLog) => {
        const now = getNowISO();
        (log as any).updated = now;
        (log as any).created = now;
        const items = await loadTable<EfficiencyLog[]>(KEYS.LOGS_EFFICIENCY, []);
        items.push(log);
        await saveTable(KEYS.LOGS_EFFICIENCY, items);
        await outboxUtils.addToOutbox(KEYS.LOGS_EFFICIENCY, 'INSERT', log);
    },
    getSupportRequests: () => loadTable<SupportRequest[]>(KEYS.REQUESTS, []),
    addSupportRequest: async (r: SupportRequest) => { 
        const now = getNowISO();
        (r as any).updated = now;
        (r as any).created = now;
        const items = await maintenanceService.getSupportRequests(); 
        items.push(r); 
        await saveTable(KEYS.REQUESTS, items); 
        await outboxUtils.addToOutbox(KEYS.REQUESTS, 'INSERT', r);
    },
    updateSupportRequest: async (r: SupportRequest) => { 
        const now = getNowISO();
        (r as any).updated = now;
        const oldRequests = await maintenanceService.getSupportRequests();
        const items = oldRequests.map(x => x.id === r.id ? r : x); 
        await saveTable(KEYS.REQUESTS, items); 
        await outboxUtils.addToOutbox(KEYS.REQUESTS, 'UPDATE', r);

        if (r.status === 'COMPLETED') {
             await outboxUtils.logAudit('SUPPORT_DONE', getCurrentUserName(), `Logistiek verzoek afgerond: ${r.type}`);
        }
    },
    getMaintenanceEvents: () => loadTable<MaintenanceEvent[]>(KEYS.EVENTS, []),
    addMaintenanceEvent: async (e: MaintenanceEvent) => { 
        const now = getNowISO();
        (e as any).updated = now;
        (e as any).created = now;
        const items = await maintenanceService.getMaintenanceEvents(); 
        items.push(e); 
        await saveTable(KEYS.EVENTS, items); 
        await outboxUtils.addToOutbox(KEYS.EVENTS, 'INSERT', e);
        await outboxUtils.logAudit('PLAN_MAINTENANCE', getCurrentUserName(), `Onderhoud gepland voor ${e.date}: ${e.title}`);
    },
    updateMaintenanceEvent: async (e: MaintenanceEvent) => { 
        const now = getNowISO();
        (e as any).updated = now;
        const items = (await maintenanceService.getMaintenanceEvents()).map(x => x.id === e.id ? e : x); 
        await saveTable(KEYS.EVENTS, items); 
        await outboxUtils.addToOutbox(KEYS.EVENTS, 'UPDATE', e);
    },
    deleteMaintenanceEvent: async (id: string) => { 
        const items = (await maintenanceService.getMaintenanceEvents()).filter(e => e.id !== id); 
        await saveTable(KEYS.EVENTS, items); 
        await outboxUtils.addToOutbox(KEYS.EVENTS, 'DELETE', { id });
    }
};
