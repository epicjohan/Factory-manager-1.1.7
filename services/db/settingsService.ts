
import { WorkSchedule, ScheduleType, NotificationTrigger, EnergySettings, FeatureFlags, SystemSettings, CommercialModule, LicenseStatus, EnergyLiveData, DataSnapshot } from '../../types';
import { KEYS, loadTable, saveTable, CURRENT_DB_VERSION, migrateToIndexedDB, DB_NAME, outboxUtils } from './core';
import { APP_INFO } from '../appInfo';

const INITIAL_SETTINGS = {
    notificationEmails: ['beheer@fabriek.nl', 'onderhoud@fabriek.nl'],
    notificationTriggers: [NotificationTrigger.NEW_TICKET, NotificationTrigger.MAINTENANCE_DUE, NotificationTrigger.MACHINE_ERROR, NotificationTrigger.LOW_STOCK],
    documentCategories: ['Handleiding', 'Schema', 'Rapportage', 'Certificaat', 'Onderhoud', 'Overig'],
    energySettings: { kwhPrice: 0.35, maxPowerLimit: 17000, consumptionFactor: 1.0, productionFactor: 1.0 },
    featureFlags: { enableEnergyDashboard: true, enableAndonBoard: true, enableTeamsIntegration: true, enableSystemHealth: true },
    systemSettings: {
        companyName: 'Factory Manager',
        licenseStatus: 'TRIAL' as LicenseStatus,
        activeModules: [CommercialModule.CORE],
        notificationEmails: ['beheer@fabriek.nl', 'onderhoud@fabriek.nl'],
        teamsWebhook: '',
        systemVersion: APP_INFO.VERSION
    }
};

export const settingsService = {
    init: async () => {
        await migrateToIndexedDB();
    },
    getSchedules: () => loadTable<WorkSchedule[]>(KEYS.SCHEDULES, []),
    addSchedule: async (sc: WorkSchedule) => {
        const items = await settingsService.getSchedules();
        items.push(sc);
        await saveTable(KEYS.SCHEDULES, items);
        await outboxUtils.addToOutbox(KEYS.SCHEDULES, 'INSERT', sc);
    },
    updateSchedule: async (sc: WorkSchedule) => {
        const items = (await settingsService.getSchedules()).map(x => x.id === sc.id ? sc : x);
        await saveTable(KEYS.SCHEDULES, items);
        await outboxUtils.addToOutbox(KEYS.SCHEDULES, 'UPDATE', sc);
    },
    deleteSchedule: async (id: string) => {
        const items = (await settingsService.getSchedules()).filter(x => x.id !== id);
        await saveTable(KEYS.SCHEDULES, items);
        await outboxUtils.addToOutbox(KEYS.SCHEDULES, 'DELETE', { id });
    },
    getNotificationEmails: async () => (await settingsService.getSystemSettings()).notificationEmails || INITIAL_SETTINGS.notificationEmails,
    setNotificationEmails: async (notificationEmails: string[]) => {
        const current = await settingsService.getSystemSettings();
        await settingsService.setSystemSettings({ ...current, notificationEmails });
    },
    getNotificationTriggers: async () => (await loadTable(KEYS.METADATA, { notificationTriggers: INITIAL_SETTINGS.notificationTriggers })).notificationTriggers || INITIAL_SETTINGS.notificationTriggers,
    setNotificationTriggers: async (notificationTriggers: NotificationTrigger[]) => {
        const meta = await loadTable(KEYS.METADATA, {});
        await saveTable(KEYS.METADATA, { ...meta, notificationTriggers, lastModified: Date.now() });
    },
    getEnergySettings: () => loadTable<EnergySettings>(KEYS.SETTINGS_ENERGY, INITIAL_SETTINGS.energySettings),
    setEnergySettings: async (es: EnergySettings) => {
        const existing = await settingsService.getEnergySettings();
        const dataToSave = { ...es, id: 'ensettings00001' };

        const isIdentical = JSON.stringify(existing) === JSON.stringify(dataToSave);

        await saveTable(KEYS.SETTINGS_ENERGY, dataToSave);
        if (!isIdentical) {
            await outboxUtils.addToOutbox(KEYS.SETTINGS_ENERGY, 'UPDATE', dataToSave);
        }
    },
    getFeatureFlags: () => loadTable<FeatureFlags>(KEYS.SETTINGS_FEATURES, INITIAL_SETTINGS.featureFlags),
    setFeatureFlags: (f: FeatureFlags) => saveTable(KEYS.SETTINGS_FEATURES, f),
    getSystemSettings: () => loadTable<SystemSettings>(KEYS.SYSTEM_CONFIG, INITIAL_SETTINGS.systemSettings),
    setSystemSettings: async (ss: SystemSettings) => {
        const existing = await loadTable<any>(KEYS.SYSTEM_CONFIG, null);

        // Adopt server-side ID if it exists, otherwise use fallback
        const dataToSave = {
            ...ss,
            id: (existing && existing.id) ? existing.id : 'sysconfigroot01',
            systemVersion: ss.systemVersion || APP_INFO.VERSION
        };

        const isIdentical = JSON.stringify(existing) === JSON.stringify(dataToSave);

        await saveTable(KEYS.SYSTEM_CONFIG, dataToSave);

        if (!isIdentical) {
            await outboxUtils.addToOutbox(KEYS.SYSTEM_CONFIG, 'UPDATE', dataToSave);
        }

        const meta = await loadTable<any>(KEYS.METADATA, {});
        await saveTable(KEYS.METADATA, {
            ...meta,
            notificationEmails: ss.notificationEmails,
            systemVersion: dataToSave.systemVersion
        });
    },
    getServerSettings: async () => {
        const meta = await loadTable<any>(KEYS.METADATA, { serverUrl: '', adminEmail: '', adminPassword: '' });

        let url = meta.serverUrl;
        if (!url && window.location.hostname) {
            const port = window.location.port || '8090';
            url = `${window.location.protocol}//${window.location.hostname}:${port}`;
        }

        return {
            url: url,
            email: meta.adminEmail || '',
            password: meta.adminPassword || ''
        };
    },
    setServerSettings: async (url: string, email: string, password: string) => {
        const meta = await loadTable<any>(KEYS.METADATA, {});
        const urlChanged = meta.serverUrl !== url;

        const newMeta: any = {
            ...meta,
            serverUrl: url,
            adminEmail: email,
            adminPassword: password,
            lastModified: Date.now()
        };

        if (urlChanged) {
            newMeta.lastAuthToken = null;
            newMeta.serverHighWaterMark = null;
            newMeta.lastSuccessfulSync = 0;
            console.log("Self-healing: Server URL changed, resetting sync markers.");
        }

        await saveTable(KEYS.METADATA, newMeta);
    },
    getTeamsWebhookUrl: async () => {
        const config = await settingsService.getSystemSettings();
        return config.teamsWebhook;
    },
    setTeamsWebhookUrl: async (url: string) => {
        const current = await settingsService.getSystemSettings();
        await settingsService.setSystemSettings({ ...current, teamsWebhook: url });
    },
    getEnergyLive: () => loadTable<EnergyLiveData[] | undefined>(KEYS.ENERGY_LIVE, undefined),
    setEnergyLive: (d: EnergyLiveData) => saveTable(KEYS.ENERGY_LIVE, [d]),
    getSnapshots: () => loadTable<DataSnapshot[]>(KEYS.SNAPSHOTS, []),
    deleteSnapshot: async (id: string) => {
        const items = (await loadTable<DataSnapshot[]>(KEYS.SNAPSHOTS, [])).filter(x => x.id !== id);
        await saveTable(KEYS.SNAPSHOTS, items);
    },
    resetData: async (mode?: 'EMPTY' | 'DEMO') => {
        await new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(DB_NAME);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve(); // doorgaan ook bij fout
            req.onblocked = () => resolve(); // doorgaan als geblokkeerd
        });
        localStorage.clear();
        if (mode === 'DEMO') {
            localStorage.setItem(KEYS.METADATA, JSON.stringify({
                isDemoMode: true,
                lastModified: Date.now(),
                dbVersion: CURRENT_DB_VERSION
            }));
        }
        window.location.reload();
    }
};
