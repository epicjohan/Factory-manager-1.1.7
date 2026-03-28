import { QmsFramework, QmsFolder, QmsAudit } from '../../types';
import { KEYS, loadTable, saveTable, outboxUtils, getNowISO } from './core';

export const qmsService = {
    // ---- FRAMEWORKS ----
    getQmsFrameworks: async (): Promise<QmsFramework[]> => {
        return await loadTable<QmsFramework[]>(KEYS.QMS_FRAMEWORKS, []);
    },
    addQmsFramework: async (fw: QmsFramework) => {
        const items = await qmsService.getQmsFrameworks();
        items.push(fw);
        await saveTable(KEYS.QMS_FRAMEWORKS, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.QMS_FRAMEWORKS}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.QMS_FRAMEWORKS, 'INSERT', fw);
    },
    updateQmsFramework: async (fw: QmsFramework) => {
        fw.updated = getNowISO();
        const items = (await qmsService.getQmsFrameworks()).map(x => x.id === fw.id ? fw : x);
        await saveTable(KEYS.QMS_FRAMEWORKS, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.QMS_FRAMEWORKS}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.QMS_FRAMEWORKS, 'UPDATE', fw);
    },
    deleteQmsFramework: async (id: string) => {
        const items = (await qmsService.getQmsFrameworks()).filter(x => x.id !== id);
        await saveTable(KEYS.QMS_FRAMEWORKS, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.QMS_FRAMEWORKS}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.QMS_FRAMEWORKS, 'DELETE', { id });
    },

    // ---- FOLDERS ----
    getQmsFolders: async (): Promise<QmsFolder[]> => {
        return await loadTable<QmsFolder[]>(KEYS.QMS_FOLDERS, []);
    },
    addQmsFolder: async (folder: QmsFolder) => {
        const items = await qmsService.getQmsFolders();
        items.push(folder);
        await saveTable(KEYS.QMS_FOLDERS, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.QMS_FOLDERS}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.QMS_FOLDERS, 'INSERT', folder);
    },
    updateQmsFolder: async (folder: QmsFolder) => {
        folder.updated = getNowISO();
        const items = (await qmsService.getQmsFolders()).map(x => x.id === folder.id ? folder : x);
        await saveTable(KEYS.QMS_FOLDERS, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.QMS_FOLDERS}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.QMS_FOLDERS, 'UPDATE', folder);
    },
    deleteQmsFolder: async (id: string) => {
        const items = (await qmsService.getQmsFolders()).filter(x => x.id !== id);
        await saveTable(KEYS.QMS_FOLDERS, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.QMS_FOLDERS}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.QMS_FOLDERS, 'DELETE', { id });
    },

    // ---- AUDITS ----
    getQmsAudits: async (): Promise<QmsAudit[]> => {
        return await loadTable<QmsAudit[]>(KEYS.QMS_AUDITS, []);
    },
    addQmsAudit: async (audit: QmsAudit) => {
        const items = await qmsService.getQmsAudits();
        items.push(audit);
        await saveTable(KEYS.QMS_AUDITS, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.QMS_AUDITS}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.QMS_AUDITS, 'INSERT', audit);
    },
    updateQmsAudit: async (audit: QmsAudit) => {
        audit.updated = getNowISO();
        const items = (await qmsService.getQmsAudits()).map(x => x.id === audit.id ? audit : x);
        await saveTable(KEYS.QMS_AUDITS, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.QMS_AUDITS}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.QMS_AUDITS, 'UPDATE', audit);
    },
    deleteQmsAudit: async (id: string) => {
        const items = (await qmsService.getQmsAudits()).filter(x => x.id !== id);
        await saveTable(KEYS.QMS_AUDITS, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.QMS_AUDITS}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.QMS_AUDITS, 'DELETE', { id });
    }
};
