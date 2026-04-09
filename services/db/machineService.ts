
import { Machine, ToolStatistic, FocasLiveStats, SimulationState, ActiveJob } from '../../types';
import { KEYS, loadTable, saveTable, outboxUtils, getNowISO, getCurrentUserName } from './core';

const deleteRelatedRecords = async (tableKey: string, machineId: string) => {
    try {
        const records = await loadTable<any[]>(tableKey, []);
        const toDelete = records.filter(r => r.machineId === machineId);
        const toKeep = records.filter(r => r.machineId !== machineId);

        if (toDelete.length > 0) {
            console.log(`Cascade Delete: Removing ${toDelete.length} items from ${tableKey} for machine ${machineId}`);
            await saveTable(tableKey, toKeep);
            for (const item of toDelete) {
                await outboxUtils.addToOutbox(tableKey, 'DELETE', { id: item.id });
            }
        }
    } catch (e) {
        console.error(`Error in cascade delete for table ${tableKey}:`, e);
    }
};

export const machineService = {
    getMachines: async (includeArchived: boolean = false) => {
        const all = await loadTable<Machine[]>(KEYS.MACHINES, []);
        return includeArchived ? all : all.filter(m => !m.isArchived);
    },
    
    addMachine: async (m: Machine) => { 
        const now = getNowISO();
        m.updatedAt = Date.now(); 
        (m as any).updated = now;
        (m as any).created = now;
        const items = await loadTable<Machine[]>(KEYS.MACHINES, []);
        items.push(m);
        await saveTable(KEYS.MACHINES, items);
        await outboxUtils.addToOutbox(KEYS.MACHINES, 'INSERT', m);
        
        await outboxUtils.logAudit('ADD_MACHINE', getCurrentUserName(), `Nieuwe machine geregistreerd: ${m.name} (${m.machineNumber})`);
    },
    
    updateMachine: async (m: Machine) => { 
        const now = getNowISO();
        m.updatedAt = Date.now();
        (m as any).updated = now;
        
        const oldMachines = await loadTable<Machine[]>(KEYS.MACHINES, []);
        const oldMachine = oldMachines.find(x => x.id === m.id);
        
        const items = oldMachines.map(x => x.id === m.id ? m : x);
        await saveTable(KEYS.MACHINES, items);
        await outboxUtils.addToOutbox(KEYS.MACHINES, 'UPDATE', m);

        if (oldMachine && oldMachine.status !== m.status) {
            await outboxUtils.logAudit('STATUS_CHANGE', getCurrentUserName(), `${m.name} status gewijzigd van ${oldMachine.status} naar ${m.status}`);
        } else {
            await outboxUtils.logAudit('UPDATE_MACHINE', getCurrentUserName(), `Gegevens van ${m.name} bijgewerkt.`);
        }
    },
    
    updateMachineToolStats: async (id: string, stats: ToolStatistic[]) => {
        const items = await loadTable<Machine[]>(KEYS.MACHINES, []);
        const m = items.find(x => x.id === id);
        if (m) {
            const now = getNowISO();
            m.toolStats = stats;
            m.updatedAt = Date.now();
            (m as any).updated = now;
            await saveTable(KEYS.MACHINES, items);
            await outboxUtils.addToOutbox(KEYS.MACHINES, 'UPDATE', m);
        }
    },
    
    deleteMachine: async (id: string) => { 
        const machines = await loadTable<Machine[]>(KEYS.MACHINES, []);
        const m = machines.find(x => x.id === id);
        
        const items = machines.filter(x => x.id !== id);
        await saveTable(KEYS.MACHINES, items);
        await outboxUtils.addToOutbox(KEYS.MACHINES, 'DELETE', { id });

        await Promise.all([
            deleteRelatedRecords(KEYS.TICKETS, id),
            deleteRelatedRecords(KEYS.LOGS_MIXING, id),
            deleteRelatedRecords(KEYS.LOGS_MIST, id),
            deleteRelatedRecords(KEYS.LOGS_CHECKLIST, id),
            deleteRelatedRecords(KEYS.LOGS_EFFICIENCY, id),
            deleteRelatedRecords(KEYS.EVENTS, id),
            deleteRelatedRecords(KEYS.PARTS_MACHINE, id),
            deleteRelatedRecords(KEYS.REQUESTS, id)
        ]);

        await outboxUtils.logAudit('DELETE_MACHINE', getCurrentUserName(), `Machine ${m?.name || id} en alle gerelateerde data permanent verwijderd.`);
    },
    
    setMachineLiveStats: async (id: string, st: FocasLiveStats) => { 
        const items = await loadTable<Machine[]>(KEYS.MACHINES, []);
        const m = items.find(x => x.id === id); 
        if (m) { 
            m.liveStats = st; 
            await saveTable(KEYS.MACHINES, items);
        } 
    },
    
    getSimulationState: (): Promise<SimulationState | undefined> => loadTable(KEYS.SIMULATION, undefined),
    setSimulationState: (st: SimulationState) => saveTable(KEYS.SIMULATION, st),

    // --- JOB MANAGEMENT ---
    assignJob: async (machineId: string, job: ActiveJob) => {
        const items = await loadTable<Machine[]>(KEYS.MACHINES, []);
        const m = items.find(x => x.id === machineId);
        if (m) {
            const now = getNowISO();
            m.activeJob = job;
            m.updatedAt = Date.now();
            (m as any).updated = now;
            await saveTable(KEYS.MACHINES, items);
            await outboxUtils.addToOutbox(KEYS.MACHINES, 'UPDATE', m);
            await outboxUtils.logAudit('JOB_START', job.operator, `Setup geladen op ${m.name}: ${job.articleCode} - ${job.setupName}`);
        }
    },

    clearJob: async (machineId: string) => {
        const items = await loadTable<Machine[]>(KEYS.MACHINES, []);
        const m = items.find(x => x.id === machineId);
        if (m && m.activeJob) {
            const job = m.activeJob;
            const now = getNowISO();
            // EXPLICIT NULL is required for the sync engine to send it to PocketBase
            // undefined fields are stripped by JSON.stringify
            m.activeJob = null; 
            m.updatedAt = Date.now();
            (m as any).updated = now;
            await saveTable(KEYS.MACHINES, items);
            await outboxUtils.addToOutbox(KEYS.MACHINES, 'UPDATE', m);
            await outboxUtils.logAudit('JOB_END', getCurrentUserName(), `Setup gestopt op ${m.name}: ${job.articleCode}`);
        }
    }
};
