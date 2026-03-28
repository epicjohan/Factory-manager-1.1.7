
import { KEYS, saveTable, loadTable, outboxUtils, getNowISO } from './db/core';
import { db } from './storage';
import { APP_INFO } from './appInfo';

export { APP_INFO };

export const VersionManager = {
    getAppInfo: () => APP_INFO,

    getCurrentVersion: () => APP_INFO.VERSION,

    checkVersionMismatch: async (): Promise<boolean> => {
        const config = await loadTable<any>(KEYS.SYSTEM_CONFIG, null);
        if (!config || !config.systemVersion) return true;
        return config.systemVersion !== APP_INFO.VERSION;
    },

    isClientOutdated: async (): Promise<boolean> => {
        const config = await loadTable<any>(KEYS.SYSTEM_CONFIG, null);
        if (!config || !config.systemVersion) return false;
        
        try {
            const serverVer = config.systemVersion.split('.').map(Number);
            const clientVer = APP_INFO.VERSION.split('.').map(Number);
            for (let i = 0; i < 3; i++) {
                const s = serverVer[i] || 0;
                const c = clientVer[i] || 0;
                if (s > c) return true; 
                if (s < c) return false;
            }
        } catch {
            return false;
        }
        return false;
    },

    confirmDatabaseUpdate: async () => {
        try {
            const serverConfig = await db.getServerSettings();

            const existingLocal = await loadTable<any>(KEYS.SYSTEM_CONFIG, null);
            const now = getNowISO();

            const updatedConfig = {
                ...(existingLocal || {}),
                id: (existingLocal && existingLocal.id) ? existingLocal.id : 'sysconfigroot01',
                systemVersion: APP_INFO.VERSION,
                lastUpdated: now,
                updated: now
            };

            if (!existingLocal) {
                (updatedConfig as any).created = now;
            }

            await saveTable(KEYS.SYSTEM_CONFIG, updatedConfig);
            await outboxUtils.addToOutbox(KEYS.SYSTEM_CONFIG, 'UPDATE', updatedConfig);

            const meta = await loadTable<any>(KEYS.METADATA, {});
            await saveTable(KEYS.METADATA, {
                ...meta,
                systemVersion: APP_INFO.VERSION
            });

            const userJson = localStorage.getItem('cnc_active_user_full');
            const userName = userJson ? JSON.parse(userJson).name : 'Systeem';
            await outboxUtils.logAudit('VERSION_UPGRADE', userName, `Systeem geactiveerd op versie ${APP_INFO.VERSION}`);

            setTimeout(() => {
                window.location.href = '/';
            }, 800);
        } catch (e) {
            console.error("Handshake mislukt:", e);
            window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'ERROR', title: 'Fout', message: 'Activatie mislukt. Controleer de serververbinding.' } }));
        }
    }
};
