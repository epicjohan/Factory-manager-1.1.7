
import { MachinePart, GeneralPart, NotificationTrigger } from '../../types';
import { KEYS, loadTable, saveTable, outboxUtils, getNowISO, getCurrentUserName } from './core';

export const inventoryService = {
    getMachineParts: async (id: string) => (await loadTable<MachinePart[]>(KEYS.PARTS_MACHINE, [])).filter(p => p.machineId === id),
    addMachinePart: async (p: MachinePart) => { 
        const now = getNowISO();
        (p as any).updated = now;
        (p as any).created = now;
        const items = await loadTable<MachinePart[]>(KEYS.PARTS_MACHINE, []); 
        items.push(p); 
        await saveTable(KEYS.PARTS_MACHINE, items); 
        await outboxUtils.addToOutbox(KEYS.PARTS_MACHINE, 'INSERT', p);
        await outboxUtils.logAudit('ADD_PART', getCurrentUserName(), `Nieuw machine-onderdeel geregistreerd: ${p.description}`);
    },
    updateMachinePart: async (p: MachinePart) => {
        const now = getNowISO();
        (p as any).updated = now;
        const oldParts = await loadTable<MachinePart[]>(KEYS.PARTS_MACHINE, []);
        const old = oldParts.find(x => x.id === p.id);
        const items = oldParts.map(x => x.id === p.id ? p : x);
        await saveTable(KEYS.PARTS_MACHINE, items);
        await outboxUtils.addToOutbox(KEYS.PARTS_MACHINE, 'UPDATE', p);
        
        if (old && old.stock !== p.stock) {
            await outboxUtils.logAudit('STOCK_ADJUST', getCurrentUserName(), `Voorraad ${p.description} aangepast van ${old.stock} naar ${p.stock}`);
        }
    },
    deleteMachinePart: async (id: string) => { 
        const items = (await loadTable<MachinePart[]>(KEYS.PARTS_MACHINE, [])).filter(p => p.id !== id); 
        await saveTable(KEYS.PARTS_MACHINE, items); 
        await outboxUtils.addToOutbox(KEYS.PARTS_MACHINE, 'DELETE', { id });
    },
    getGeneralParts: () => loadTable<GeneralPart[]>(KEYS.PARTS_GENERAL, []),
    addGeneralPart: async (p: GeneralPart) => { 
        const now = getNowISO();
        (p as any).updated = now;
        (p as any).created = now;
        const items = await inventoryService.getGeneralParts(); 
        items.push(p); 
        await saveTable(KEYS.PARTS_GENERAL, items); 
        await outboxUtils.addToOutbox(KEYS.PARTS_GENERAL, 'INSERT', p);
        await outboxUtils.logAudit('ADD_GENERAL_PART', getCurrentUserName(), `Nieuw magazijnartikel toegevoegd: ${p.description}`);
    },
    updateGeneralPart: async (p: GeneralPart) => { 
        const now = getNowISO();
        (p as any).updated = now;
        const oldParts = await inventoryService.getGeneralParts();
        const old = oldParts.find(x => x.id === p.id);
        const items = oldParts.map(x => x.id === p.id ? p : x); 
        await saveTable(KEYS.PARTS_GENERAL, items); 
        await outboxUtils.addToOutbox(KEYS.PARTS_GENERAL, 'UPDATE', p);

        if (old && old.stock !== p.stock) {
            await outboxUtils.logAudit('STOCK_ADJUST', getCurrentUserName(), `Magazijnartikel ${p.description} aangepast van ${old.stock} naar ${p.stock}`);
        }
    },
    deleteGeneralPart: async (id: string) => { 
        const items = (await inventoryService.getGeneralParts()).filter(x => x.id !== id); 
        await saveTable(KEYS.PARTS_GENERAL, items); 
        await outboxUtils.addToOutbox(KEYS.PARTS_GENERAL, 'DELETE', { id });
    },
    consumePart: async (partId: string, quantity: number) => {
        const now = getNowISO();
        const mParts = await loadTable<MachinePart[]>(KEYS.PARTS_MACHINE, []);
        const mIdx = mParts.findIndex(p => p.id === partId);
        if (mIdx !== -1) {
            const part = { ...mParts[mIdx] };
            part.stock -= quantity;
            (part as any).updated = now;
            mParts[mIdx] = part;
            await saveTable(KEYS.PARTS_MACHINE, mParts);
            await outboxUtils.addToOutbox(KEYS.PARTS_MACHINE, 'UPDATE', part);
            
            if (part.minStock !== undefined && part.stock <= part.minStock) {
                window.dispatchEvent(new CustomEvent('app-notification', {
                    detail: {
                        type: 'WARNING',
                        title: 'Lage Voorraad',
                        message: `De voorraad van "${part.description}" is kritiek: ${part.stock} stuks over.`,
                        trigger: NotificationTrigger.LOW_STOCK
                    }
                }));
            }
            return;
        }

        const gParts = await loadTable<GeneralPart[]>(KEYS.PARTS_GENERAL, []);
        const gIdx = gParts.findIndex(p => p.id === partId);
        if (gIdx !== -1) {
            const part = { ...gParts[gIdx] };
            part.stock -= quantity;
            (part as any).updated = now;
            gParts[gIdx] = part;
            await saveTable(KEYS.PARTS_GENERAL, gParts);
            await outboxUtils.addToOutbox(KEYS.PARTS_GENERAL, 'UPDATE', part);

            if (part.minStock !== undefined && part.stock <= part.minStock) {
                window.dispatchEvent(new CustomEvent('app-notification', {
                    detail: {
                        type: 'WARNING',
                        title: 'Lage Voorraad',
                        message: `Algemene voorraad van "${part.description}" is laag: ${part.stock} over.`,
                        trigger: NotificationTrigger.LOW_STOCK
                    }
                }));
            }
            return;
        }
    },
    releasePart: async (partId: string, quantity: number) => {
        const now = getNowISO();
        const mParts = await loadTable<MachinePart[]>(KEYS.PARTS_MACHINE, []);
        const mIdx = mParts.findIndex(p => p.id === partId);
        if (mIdx !== -1) {
            const part = { ...mParts[mIdx] };
            part.stock += quantity;
            (part as any).updated = now;
            mParts[mIdx] = part;
            await saveTable(KEYS.PARTS_MACHINE, mParts);
            await outboxUtils.addToOutbox(KEYS.PARTS_MACHINE, 'UPDATE', part);
            return;
        }

        const gParts = await loadTable<GeneralPart[]>(KEYS.PARTS_GENERAL, []);
        const gIdx = gParts.findIndex(p => p.id === partId);
        if (gIdx !== -1) {
            const part = { ...gParts[gIdx] };
            part.stock += quantity;
            (part as any).updated = now;
            gParts[gIdx] = part;
            await saveTable(KEYS.PARTS_GENERAL, gParts);
            await outboxUtils.addToOutbox(KEYS.PARTS_GENERAL, 'UPDATE', part);
        }
    }
};
