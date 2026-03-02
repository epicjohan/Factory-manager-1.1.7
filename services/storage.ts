
import { AppState, NotificationTrigger, CommercialModule, LicenseStatus, SystemStatus, SystemAuditLog, EnergyQuarterlyLog, AssetEnergyConfig, EnergyHistoricalLog, Article, PredefinedOperation, SetupTemplate, UserRoleDefinition, DocumentCategory } from '../types';
import { KEYS, loadTable, saveTable, outboxUtils, ROLE_PERMISSIONS, ROLE_DEFAULT_TABS, migrateToIndexedDB, generateId, getNowISO } from './db/core';
import { userService } from './db/userService';
import { machineService } from './db/machineService';
import { maintenanceService } from './db/maintenanceService';
import { inventoryService } from './db/inventoryService';
import { settingsService } from './db/settingsService';
import { energyService } from './db/energyService';
import { articleService } from './db/articleService';
import { templateService } from './db/templateService';

migrateToIndexedDB();

export { ROLE_PERMISSIONS, ROLE_DEFAULT_TABS };

export const getStore = async (): Promise<AppState> => {
    const meta = await loadTable(KEYS.METADATA, {
        lastModified: Date.now(),
        dbVersion: 2,
        isDemoMode: false,
        systemVersion: '1.0.0',
        serverUrl: '',
        adminEmail: '',
        adminPassword: '',
        notificationEmails: ['beheer@fabriek.nl', 'onderhoud@fabriek.nl'],
        notificationTriggers: [NotificationTrigger.NEW_TICKET, NotificationTrigger.MAINTENANCE_DUE]
    });

    return {
        dbVersion: meta.dbVersion,
        systemVersion: meta.systemVersion,
        isDemoMode: meta.isDemoMode,
        currentUser: null,
        users: await userService.getUsers(),
        roles: await loadTable<UserRoleDefinition[]>(KEYS.ROLES, []),
        machines: await machineService.getMachines(true),
        mkgOperations: await loadTable<PredefinedOperation[]>(KEYS.MKG_OPERATIONS, []),
        setupTemplates: await templateService.getTemplates(),
        mixingLogs: await loadTable(KEYS.LOGS_MIXING, []),
        maintenanceTickets: await maintenanceService.getAllTickets(),
        mistLogs: await loadTable(KEYS.LOGS_MIST, []),
        maintenanceEvents: await maintenanceService.getMaintenanceEvents(),
        machineParts: await loadTable(KEYS.PARTS_MACHINE, []),
        generalParts: await inventoryService.getGeneralParts(),
        checklistLogs: await loadTable(KEYS.LOGS_CHECKLIST, []),
        supportRequests: await maintenanceService.getSupportRequests(),
        schedules: await settingsService.getSchedules(),
        efficiencyLogs: await maintenanceService.getEfficiencyLogs(),
        notificationEmails: meta.notificationEmails || [],
        notificationTriggers: meta.notificationTriggers || [],
        documentCategories: await loadTable<DocumentCategory[]>(KEYS.DOCUMENT_CATEGORIES, [
            { id: generateId(), name: 'Tekening (PDF)', code: 'DRAWING', icon: 'FileText', color: 'text-blue-500', isSystem: true, applicableTo: 'BOTH', order: 10 },
            { id: generateId(), name: '3D Model (STEP)', code: 'MODEL', icon: 'Box', color: 'text-purple-500', isSystem: true, applicableTo: 'BOTH', order: 20 },
            { id: generateId(), name: 'CAM Programma', code: 'CAM', icon: 'FileCode', color: 'text-orange-500', isSystem: true, applicableTo: 'SETUP', order: 30 },
            { id: generateId(), name: 'NC Code', code: 'NC', icon: 'Terminal', color: 'text-green-500', isSystem: true, applicableTo: 'SETUP', order: 40 },
            { id: generateId(), name: 'Overig', code: 'OTHER', icon: 'File', color: 'text-slate-500', isSystem: true, applicableTo: 'BOTH', order: 999 }
        ]),
        energySettings: await settingsService.getEnergySettings(),
        assetEnergyConfigs: await energyService.getAllConfigs(),
        featureFlags: await settingsService.getFeatureFlags(),
        systemSettings: await settingsService.getSystemSettings(),
        snapshots: await settingsService.getSnapshots(),
        systemStatus: await loadTable<SystemStatus[]>(KEYS.SYSTEM_STATUS, []),
        systemAuditLogs: await loadTable<SystemAuditLog[]>(KEYS.SYSTEM_AUDIT_LOGS, []),
        energyQuarterlyLogs: await loadTable<EnergyQuarterlyLog[]>(KEYS.LOGS_ENERGY_QUARTERLY, []),
        energyHistorical: await loadTable<EnergyHistoricalLog[]>(KEYS.LOGS_ENERGY_HISTORICAL, []),
        articles: await articleService.getArticles(),
        lastModified: meta.lastModified,
        serverUrl: meta.serverUrl,
        adminEmail: meta.adminEmail,
        adminPassword: meta.adminPassword,
        serverApiKey: (meta as any).serverApiKey || '',
        simulationState: await machineService.getSimulationState(),
        outbox: await outboxUtils.getOutbox()
    };
};

export const setStore = async (state: AppState) => {
    if (!state) return;
    await Promise.all([
        saveTable(KEYS.USERS, state.users),
        saveTable(KEYS.ROLES, state.roles),
        saveTable(KEYS.MACHINES, state.machines),
        saveTable(KEYS.MKG_OPERATIONS, state.mkgOperations),
        saveTable(KEYS.SETUP_TEMPLATES, state.setupTemplates),
        saveTable(KEYS.TICKETS, state.maintenanceTickets),
        saveTable(KEYS.LOGS_MIXING, state.mixingLogs),
        saveTable(KEYS.LOGS_MIST, state.mistLogs),
        saveTable(KEYS.LOGS_CHECKLIST, state.checklistLogs),
        saveTable(KEYS.LOGS_EFFICIENCY, state.efficiencyLogs),
        saveTable(KEYS.EVENTS, state.maintenanceEvents),
        saveTable(KEYS.PARTS_MACHINE, state.machineParts),
        saveTable(KEYS.PARTS_GENERAL, state.generalParts),
        saveTable(KEYS.REQUESTS, state.supportRequests),
        saveTable(KEYS.SCHEDULES, state.schedules),
        saveTable(KEYS.SETTINGS_ENERGY, state.energySettings),
        saveTable(KEYS.SETTINGS_FEATURES, state.featureFlags),
        saveTable(KEYS.ASSET_ENERGY_CONFIGS, state.assetEnergyConfigs),
        saveTable(KEYS.SNAPSHOTS, state.snapshots),
        saveTable(KEYS.SYSTEM_STATUS, state.systemStatus),
        saveTable(KEYS.SYSTEM_AUDIT_LOGS, state.systemAuditLogs),
        saveTable(KEYS.LOGS_ENERGY_QUARTERLY, state.energyQuarterlyLogs),
        saveTable(KEYS.ARTICLES, state.articles),
        saveTable(KEYS.DOCUMENT_CATEGORIES, state.documentCategories),
        state.energyHistorical ? saveTable(KEYS.LOGS_ENERGY_HISTORICAL, state.energyHistorical) : Promise.resolve(),
        saveTable(KEYS.SIMULATION, state.simulationState),
        state.outbox ? saveTable(KEYS.OUTBOX, state.outbox) : Promise.resolve()
    ]);

    await saveTable(KEYS.METADATA, {
        lastModified: Date.now(),
        dbVersion: state.dbVersion || 2,
        isDemoMode: !!state.isDemoMode,
        systemVersion: state.systemVersion,
        serverUrl: state.serverUrl,
        adminEmail: state.adminEmail,
        adminPassword: state.adminPassword,          // BUG-01: nooit overwrite met serverApiKey
        serverApiKey: state.serverApiKey || '',       // BUG-01: aparte sleutel, nooit alias voor password
        notificationEmails: state.notificationEmails,
        notificationTriggers: state.notificationTriggers
    });

    window.dispatchEvent(new CustomEvent('db-updated'));
};

export const db = {
    ...outboxUtils,
    ...userService,
    ...machineService,
    ...maintenanceService,
    ...inventoryService,
    ...settingsService,
    ...energyService,
    ...articleService,
    ...templateService,

    getMkgOperations: () => loadTable<PredefinedOperation[]>(KEYS.MKG_OPERATIONS, []),
    addMkgOperation: async (op: PredefinedOperation) => {
        const now = getNowISO();
        op.created = now;
        op.updated = now;
        const items = await db.getMkgOperations();
        items.push(op);
        await saveTable(KEYS.MKG_OPERATIONS, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.MKG_OPERATIONS}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.MKG_OPERATIONS, 'INSERT', op);
    },
    getDocumentCategories: () => loadTable<DocumentCategory[]>(KEYS.DOCUMENT_CATEGORIES, []),
    addDocumentCategory: async (category: DocumentCategory) => {
        const items = await db.getDocumentCategories();
        items.push(category);
        await saveTable(KEYS.DOCUMENT_CATEGORIES, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.DOCUMENT_CATEGORIES}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.DOCUMENT_CATEGORIES, 'INSERT', category);
    },
    updateDocumentCategory: async (category: DocumentCategory) => {
        const items = await db.getDocumentCategories();
        const updated = items.map(c => c.id === category.id ? category : c);
        await saveTable(KEYS.DOCUMENT_CATEGORIES, updated);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.DOCUMENT_CATEGORIES}:updated`, { detail: updated }));
        await outboxUtils.addToOutbox(KEYS.DOCUMENT_CATEGORIES, 'UPDATE', category);
    },
    deleteDocumentCategory: async (id: string) => {
        const items = await db.getDocumentCategories();
        const filtered = items.filter(c => c.id !== id);
        await saveTable(KEYS.DOCUMENT_CATEGORIES, filtered);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.DOCUMENT_CATEGORIES}:updated`, { detail: filtered }));
        await outboxUtils.addToOutbox(KEYS.DOCUMENT_CATEGORIES, 'DELETE', { id });
    },
    updateMkgOperation: async (op: PredefinedOperation) => {
        const now = getNowISO();
        op.updated = now;
        const items = (await db.getMkgOperations()).map(x => x.id === op.id ? op : x);
        await saveTable(KEYS.MKG_OPERATIONS, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.MKG_OPERATIONS}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.MKG_OPERATIONS, 'UPDATE', op);
    },
    deleteMkgOperation: async (id: string) => {
        const items = (await db.getMkgOperations()).filter(x => x.id !== id);
        await saveTable(KEYS.MKG_OPERATIONS, items);
        window.dispatchEvent(new CustomEvent(`db:${KEYS.MKG_OPERATIONS}:updated`, { detail: items }));
        await outboxUtils.addToOutbox(KEYS.MKG_OPERATIONS, 'DELETE', { id });
    },

    createSnapshot: async (name: string, type: 'AUTO' | 'MANUAL' = 'MANUAL') => {
        const fullState = await getStore();
        const newSnapshot = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            name, type, data: JSON.stringify({ ...fullState, snapshots: [] })
        };
        const current = await settingsService.getSnapshots();
        current.unshift(newSnapshot);
        await saveTable(KEYS.SNAPSHOTS, current.slice(0, 15));
        await outboxUtils.addToOutbox(KEYS.SNAPSHOTS, 'INSERT', newSnapshot);
    },
    restoreSnapshot: async (id: string) => {
        const snaps = await settingsService.getSnapshots();
        const snap = snaps.find(x => x.id === id);
        if (snap) {
            try {
                const restored = JSON.parse(snap.data);
                await setStore(restored);
            } catch (e) {
                throw new Error("Snapshot herstel mislukt: " + (e instanceof Error ? e.message : String(e)));
            }
        }
    }
};
