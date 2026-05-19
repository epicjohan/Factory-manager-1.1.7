
import { MachinePart, GeneralPart, NotificationTrigger, MaterialType, MaterialProfile, RawMaterial, MaterialCategory, StorageLocation } from '../../types';
import { KEYS, loadTable, saveTable, outboxUtils, getNowISO, getCurrentUserName, generateId } from './core';

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
    },

    // --- MATERIAL TYPES ---
    getMaterialTypes: () => loadTable<MaterialType[]>(KEYS.MATERIAL_TYPES, []),
    addMaterialType: async (item: MaterialType) => {
        const now = getNowISO();
        (item as any).updated = now;
        (item as any).created = now;
        const items = await loadTable<MaterialType[]>(KEYS.MATERIAL_TYPES, []);
        items.push(item);
        await saveTable(KEYS.MATERIAL_TYPES, items);
        await outboxUtils.addToOutbox(KEYS.MATERIAL_TYPES, 'INSERT', item);
        await outboxUtils.logAudit('ADD_MATERIAL_TYPE', getCurrentUserName(), `Materiaalsoort toegevoegd: ${item.name}`);
    },
    updateMaterialType: async (item: MaterialType) => {
        const now = getNowISO();
        (item as any).updated = now;
        const items = (await loadTable<MaterialType[]>(KEYS.MATERIAL_TYPES, [])).map(x => x.id === item.id ? item : x);
        await saveTable(KEYS.MATERIAL_TYPES, items);
        await outboxUtils.addToOutbox(KEYS.MATERIAL_TYPES, 'UPDATE', item);
    },
    deleteMaterialType: async (id: string) => {
        const items = (await loadTable<MaterialType[]>(KEYS.MATERIAL_TYPES, [])).filter(x => x.id !== id);
        await saveTable(KEYS.MATERIAL_TYPES, items);
        await outboxUtils.addToOutbox(KEYS.MATERIAL_TYPES, 'DELETE', { id });
    },

    // --- MATERIAL PROFILES ---
    getMaterialProfiles: () => loadTable<MaterialProfile[]>(KEYS.MATERIAL_PROFILES, []),
    addMaterialProfile: async (item: MaterialProfile) => {
        const now = getNowISO();
        (item as any).updated = now;
        (item as any).created = now;
        const items = await loadTable<MaterialProfile[]>(KEYS.MATERIAL_PROFILES, []);
        items.push(item);
        await saveTable(KEYS.MATERIAL_PROFILES, items);
        await outboxUtils.addToOutbox(KEYS.MATERIAL_PROFILES, 'INSERT', item);
        await outboxUtils.logAudit('ADD_MATERIAL_PROFILE', getCurrentUserName(), `Profielvorm toegevoegd: ${item.name}`);
    },
    updateMaterialProfile: async (item: MaterialProfile) => {
        const now = getNowISO();
        (item as any).updated = now;
        const items = (await loadTable<MaterialProfile[]>(KEYS.MATERIAL_PROFILES, [])).map(x => x.id === item.id ? item : x);
        await saveTable(KEYS.MATERIAL_PROFILES, items);
        await outboxUtils.addToOutbox(KEYS.MATERIAL_PROFILES, 'UPDATE', item);
    },
    deleteMaterialProfile: async (id: string) => {
        const items = (await loadTable<MaterialProfile[]>(KEYS.MATERIAL_PROFILES, [])).filter(x => x.id !== id);
        await saveTable(KEYS.MATERIAL_PROFILES, items);
        await outboxUtils.addToOutbox(KEYS.MATERIAL_PROFILES, 'DELETE', { id });
    },

    // --- RAW MATERIALS ---
    getRawMaterials: () => loadTable<RawMaterial[]>(KEYS.RAW_MATERIALS, []),
    addRawMaterial: async (item: RawMaterial) => {
        const now = getNowISO();
        (item as any).updated = now;
        (item as any).created = now;
        const items = await loadTable<RawMaterial[]>(KEYS.RAW_MATERIALS, []);
        items.push(item);
        await saveTable(KEYS.RAW_MATERIALS, items);
        await outboxUtils.addToOutbox(KEYS.RAW_MATERIALS, 'INSERT', item);
        await outboxUtils.logAudit('ADD_RAW_MATERIAL', getCurrentUserName(), `Ruwdeel toegevoegd: ${item.description}`);
    },
    updateRawMaterial: async (item: RawMaterial) => {
        const now = getNowISO();
        (item as any).updated = now;
        const items = (await loadTable<RawMaterial[]>(KEYS.RAW_MATERIALS, [])).map(x => x.id === item.id ? item : x);
        await saveTable(KEYS.RAW_MATERIALS, items);
        await outboxUtils.addToOutbox(KEYS.RAW_MATERIALS, 'UPDATE', item);
    },
    deleteRawMaterial: async (id: string) => {
        const items = (await loadTable<RawMaterial[]>(KEYS.RAW_MATERIALS, [])).filter(x => x.id !== id);
        await saveTable(KEYS.RAW_MATERIALS, items);
        await outboxUtils.addToOutbox(KEYS.RAW_MATERIALS, 'DELETE', { id });
    },

    // --- MATERIAL CATEGORIES ---
    getMaterialCategories: () => loadTable<MaterialCategory[]>(KEYS.MATERIAL_CATEGORIES, []),
    addMaterialCategory: async (item: MaterialCategory) => {
        const now = getNowISO();
        (item as any).updated = now;
        (item as any).created = now;
        const items = await loadTable<MaterialCategory[]>(KEYS.MATERIAL_CATEGORIES, []);
        items.push(item);
        await saveTable(KEYS.MATERIAL_CATEGORIES, items);
        await outboxUtils.addToOutbox(KEYS.MATERIAL_CATEGORIES, 'INSERT', item);
    },
    updateMaterialCategory: async (item: MaterialCategory) => {
        const now = getNowISO();
        (item as any).updated = now;
        const items = (await loadTable<MaterialCategory[]>(KEYS.MATERIAL_CATEGORIES, [])).map(x => x.id === item.id ? item : x);
        await saveTable(KEYS.MATERIAL_CATEGORIES, items);
        await outboxUtils.addToOutbox(KEYS.MATERIAL_CATEGORIES, 'UPDATE', item);
    },
    deleteMaterialCategory: async (id: string) => {
        const items = (await loadTable<MaterialCategory[]>(KEYS.MATERIAL_CATEGORIES, [])).filter(x => x.id !== id);
        await saveTable(KEYS.MATERIAL_CATEGORIES, items);
        await outboxUtils.addToOutbox(KEYS.MATERIAL_CATEGORIES, 'DELETE', { id });
    },

    // --- STORAGE LOCATIONS ---
    getStorageLocations: () => loadTable<StorageLocation[]>(KEYS.STORAGE_LOCATIONS, []),
    addStorageLocation: async (item: StorageLocation) => {
        const now = getNowISO(); (item as any).updated = now; (item as any).created = now;
        const items = await loadTable<StorageLocation[]>(KEYS.STORAGE_LOCATIONS, []); items.push(item);
        await saveTable(KEYS.STORAGE_LOCATIONS, items);
        await outboxUtils.addToOutbox(KEYS.STORAGE_LOCATIONS, 'INSERT', item);
    },
    updateStorageLocation: async (item: StorageLocation) => {
        const now = getNowISO(); (item as any).updated = now;
        const items = (await loadTable<StorageLocation[]>(KEYS.STORAGE_LOCATIONS, [])).map(x => x.id === item.id ? item : x);
        await saveTable(KEYS.STORAGE_LOCATIONS, items);
        await outboxUtils.addToOutbox(KEYS.STORAGE_LOCATIONS, 'UPDATE', item);
    },
    deleteStorageLocation: async (id: string) => {
        const items = (await loadTable<StorageLocation[]>(KEYS.STORAGE_LOCATIONS, [])).filter(x => x.id !== id);
        await saveTable(KEYS.STORAGE_LOCATIONS, items);
        await outboxUtils.addToOutbox(KEYS.STORAGE_LOCATIONS, 'DELETE', { id });
    }
};
