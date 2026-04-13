
import { UserRole, Permission, AssetTab, SyncEntry, SyncAction, SystemAuditLog } from '../../types';

export const KEYS = {
    USERS: 'fm_table_users',
    ROLES: 'fm_table_roles',
    MACHINES: 'fm_table_machines',
    TICKETS: 'fm_table_tickets',
    LOGS_MIXING: 'fm_table_logs_mixing',
    LOGS_MIST: 'fm_table_logs_mist',
    LOGS_CHECKLIST: 'fm_table_logs_checklist',
    LOGS_EFFICIENCY: 'fm_table_logs_efficiency',
    EVENTS: 'fm_table_events',
    PARTS_MACHINE: 'fm_table_parts_machine',
    PARTS_GENERAL: 'fm_table_parts_general',
    REQUESTS: 'fm_table_requests',
    SCHEDULES: 'fm_table_schedules',
    // CLEAN-01: SETTINGS_SYSTEM is superseded door SYSTEM_CONFIG. Wordt alleen bewaard voor backwards-compat,
    // maar settingsService leest altijd uit SYSTEM_CONFIG. In een volgende major-versie kan dit verwijderd worden.
    SETTINGS_SYSTEM: 'fm_table_settings_system',
    SETTINGS_ENERGY: 'fm_table_settings_energy',
    SETTINGS_FEATURES: 'fm_table_settings_features',
    SNAPSHOTS: 'fm_table_snapshots',
    SIMULATION: 'fm_table_simulation',
    METADATA: 'fm_table_metadata',
    OUTBOX: 'fm_table_outbox',
    ENERGY_LIVE: 'fm_table_energy_live',
    LOGS_ENERGY_QUARTERLY: 'fm_table_logs_energy_quarterly',
    SYSTEM_CONFIG: 'fm_table_system_config',
    SYSTEM_STATUS: 'fm_table_system_status',
    SYSTEM_AUDIT_LOGS: 'fm_table_system_audit_logs',
    ASSET_ENERGY_CONFIGS: 'fm_table_asset_energy_configs',
    LOGS_ENERGY_ASSETS: 'fm_table_logs_energy_assets',
    LOGS_ENERGY_HISTORICAL: 'fm_table_logs_energy_historical',
    ARTICLES: 'fm_table_articles',
    MKG_OPERATIONS: 'fm_table_mkg_operations',
    SETUP_TEMPLATES: 'fm_table_setup_templates',
    DOCUMENT_CATEGORIES: 'fm_table_document_categories',
    DOCUMENTS: 'fm_table_documents',
    QMS_FRAMEWORKS: 'fm_table_qms_frameworks',
    QMS_FOLDERS: 'fm_table_qms_folders',
    QMS_AUDITS: 'fm_table_qms_audits',
    TOOL_PREP_REQUESTS: 'fm_table_tool_prep_requests'
};

export const DB_NAME = 'FactoryManagerDB';
export const CURRENT_DB_VERSION = 5;

// BUG B-05 FIX: crypto.getRandomValues() is cryptografisch veilig — onvoorspelbaar en niet repliceerbaar.
// Math.random() is deterministisch en kan worden voorspeld bij kennis van de seed.
export const generateId = (length: number = 15): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
        .map(b => chars[b % chars.length])
        .join('');
};

export const getNowISO = () => {
    return new Date().toISOString().replace('T', ' ').split('.')[0];
};

// D-03 FIX: Gecentraliseerde user-name resolver.
// Was voorheen 7× gedupliceerd in articleService, documentService, inventoryService,
// maintenanceService, energyService, machineService en meer.
export const getCurrentUserName = (): string => {
    const userJson = localStorage.getItem('cnc_active_user_full');
    if (userJson) {
        try { return JSON.parse(userJson).name; } catch { return 'Unknown User'; }
    }
    return 'Unknown User';
};

export const formatDateForPB = (date: string | Date): string => {
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return new Date().toISOString().replace('T', ' ').split('.')[0];
        return d.toISOString().replace('T', ' ').split('.')[0];
    } catch (e) {
        return new Date().toISOString().replace('T', ' ').split('.')[0];
    }
};

export const ensureParsedData = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    const result = Array.isArray(data) ? [...data] : { ...data };

    const jsonFields = [
        'liveStats', 'toolStats', 'checklist', 'permissions',
        'allowedAssetIds', 'allowedModules', 'allowedTabs',
        'activeModules', 'notificationEmails', 'actions',
        'usedParts', 'shifts', 'andonConfig', 'mtConnectConfig',
        'fields', 'toolFields', 'templateData', 'operations', 'bomItems', 'files', 'auditTrail',
        'documents'
    ];

    Object.keys(result).forEach(key => {
        if (jsonFields.includes(key) && typeof result[key] === 'string') {
            try {
                result[key] = JSON.parse(result[key]);
            } catch (e) {
                // B-02 FIX: waarschuw bij ongeldige JSON zodat dataproblemen zichtbaar worden
                console.warn(`[ensureParsedData] Kon veld '${key}' niet parsen als JSON:`, e);
            }
        }
    });

    return result;
};

export const ROLE_PERMISSIONS = {
    [UserRole.ADMIN]: Object.values(Permission),
    [UserRole.MAINTENANCE]: [
        Permission.UPDATE_MACHINE_STATUS,
        Permission.CREATE_TICKET,
        Permission.RESOLVE_TICKET,
        Permission.MANAGE_SCHEDULE,
        Permission.MANAGE_INVENTORY,
        Permission.VIEW_FINANCIALS,
        Permission.USE_TOOLGUARD
    ],
    [UserRole.OPERATOR]: [
        Permission.UPDATE_MACHINE_STATUS,
        Permission.CREATE_TICKET,
        Permission.USE_TOOLGUARD
    ],
    [UserRole.MANAGER]: [
        Permission.VIEW_FINANCIALS,
        Permission.MANAGE_INVENTORY,
        Permission.MANAGE_ARTICLES
    ]
};

export const ROLE_DEFAULT_TABS = {
    [UserRole.ADMIN]: Object.values(AssetTab),
    [UserRole.MANAGER]: Object.values(AssetTab),
    [UserRole.MAINTENANCE]: [AssetTab.OVERVIEW, AssetTab.MAINTENANCE, AssetTab.CHECKLIST, AssetTab.PARTS, AssetTab.DOCS, AssetTab.COOLANT, AssetTab.MIST, AssetTab.CALL],
    [UserRole.OPERATOR]: [AssetTab.OVERVIEW, AssetTab.LIVE, AssetTab.EFFICIENCY, AssetTab.CHECKLIST, AssetTab.CALL, AssetTab.COOLANT, AssetTab.MAINTENANCE]
};

// B-02 FIX: Gecachte IndexedDB connectie — voorkomt een indexedDB.open() bij elke operatie.
// De connectie wordt hergebruikt voor de levensduur van de pagina.
let cachedDB: IDBDatabase | null = null;

const getDB = (): Promise<IDBDatabase> => {
    if (cachedDB) return Promise.resolve(cachedDB);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, CURRENT_DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = (e.target as any).result;
            Object.values(KEYS).forEach(key => {
                if (!db.objectStoreNames.contains(key)) {
                    db.createObjectStore(key);
                }
            });
        };
        request.onsuccess = () => {
            cachedDB = request.result;
            // Bij onverwacht sluiten (browser cleanup) de cache invalideren
            cachedDB.onclose = () => { cachedDB = null; };
            cachedDB.onversionchange = () => { cachedDB?.close(); cachedDB = null; };
            resolve(cachedDB);
        };
        request.onerror = () => reject(request.error);
    });
};

export const closeDB = () => {
    if (cachedDB) {
        cachedDB.close();
        cachedDB = null;
    }
};

export const clearAllTables = async () => {
    try {
        const db = await getDB();
        const storeNames = Array.from(db.objectStoreNames);
        if (storeNames.length === 0) return;
        const tx = db.transaction(storeNames, 'readwrite');
        storeNames.forEach(storeName => {
            tx.objectStore(storeName).clear();
        });
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Failed to clear tables:", e);
    }
};

export const saveTable = async (key: string, data: any) => {
    try {
        const db = await getDB();
        const tx = db.transaction(key, 'readwrite');
        const store = tx.objectStore(key);
        store.put(data, 'data');

        // B-03 FIX: Dubbele metadata-write verwijderd.
        // Voorheen opende elke saveTable() een TWEEDE transactie om lastModified in METADATA
        // bij te werken — zelfs als er tientallen saves parallel liepen. Dit is nu verwijderd.
        // lastModified wordt alleen nog bijgewerkt via expliciete saveMetadata() calls.

        window.dispatchEvent(new CustomEvent(`db:${key}:updated`, { detail: data }));
        window.dispatchEvent(new CustomEvent('db-updated', { detail: { table: key } }));
    } catch (e) {
        console.error(`IndexedDB Error writing to ${key}:`, e);
    }
};

export const loadTable = async <T>(key: string, defaultValue: T): Promise<T> => {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(key, 'readonly');
            const request = tx.objectStore(key).get('data');
            request.onsuccess = () => resolve(request.result === undefined ? defaultValue : request.result);
            request.onerror = () => resolve(defaultValue);
        });
    } catch (e) {
        return defaultValue;
    }
};

let outboxQueue = Promise.resolve();

export const outboxUtils = {
    getOutbox: () => loadTable<SyncEntry[]>(KEYS.OUTBOX, []),
    getMetadata: () => loadTable<any>(KEYS.METADATA, {}),
    saveMetadata: (data: any) => saveTable(KEYS.METADATA, data),

    addToOutbox: (table: string, action: SyncAction, data: any) => {
        outboxQueue = outboxQueue.then(async () => {
            try {
                let outbox = await loadTable<SyncEntry[]>(KEYS.OUTBOX, []);

                if (action === 'UPDATE' && data.id) {
                    // BUG B-01 FIX: UPDATE heeft dedup-logica — samenvoegen met bestaand item indien aanwezig.
                    const existingIdx = outbox.findIndex(item => item && item.table === table && (item.action === 'UPDATE' || item.action === 'INSERT') && item.data && item.data.id === data.id);
                    if (existingIdx !== -1) {
                        outbox[existingIdx] = {
                            ...outbox[existingIdx],
                            data: { ...outbox[existingIdx].data, ...data },
                            timestamp: Date.now(),
                            error: undefined
                        };
                    } else {
                        outbox.push({ id: generateId(), table, action, data, timestamp: Date.now() });
                    }
                } else {
                    // BUG B-01 FIX: INSERT en DELETE worden altijd als nieuw item toegevoegd.
                    // Voorheen vielen deze buiten het if-blok en werden ze nooit naar de server gestuurd.
                    outbox.push({ id: generateId(), table, action, data, timestamp: Date.now() });
                }

                if (outbox.length > 1000) outbox = outbox.slice(-1000);
                await saveTable(KEYS.OUTBOX, outbox);
                window.dispatchEvent(new CustomEvent('outbox-changed'));

                // Activeer direct de achtergrond synchronisatie zodat de gebruiker nier hoeft te wachten
                window.dispatchEvent(new CustomEvent('trigger-sync'));
            } catch (e) {
                console.error("Outbox Queue Error:", e);
            }
        });
        return outboxQueue;
    },

    updateOutboxEntry: (id: string, updates: Partial<SyncEntry>) => {
        outboxQueue = outboxQueue.then(async () => {
            const current = await loadTable<SyncEntry[]>(KEYS.OUTBOX, []);
            const idx = current.findIndex(e => e && e.id === id);
            if (idx !== -1) {
                current[idx] = { ...current[idx], ...updates };
                await saveTable(KEYS.OUTBOX, current);
                window.dispatchEvent(new CustomEvent('outbox-changed'));
            }
        });
        return outboxQueue;
    },

    removeFromOutbox: (ids: string[]) => {
        outboxQueue = outboxQueue.then(async () => {
            const current = await loadTable<SyncEntry[]>(KEYS.OUTBOX, []);
            const filtered = current.filter(item => item && !ids.includes(item.id));
            await saveTable(KEYS.OUTBOX, filtered);
            window.dispatchEvent(new CustomEvent('outbox-changed'));
        });
        return outboxQueue;
    },

    clearPendingUpdates: (table: string, recordId: string) => {
        outboxQueue = outboxQueue.then(async () => {
            const current = await loadTable<SyncEntry[]>(KEYS.OUTBOX, []);
            const filtered = current.filter(item => !(item && item.table === table && item.data?.id === recordId));
            if (filtered.length !== current.length) {
                await saveTable(KEYS.OUTBOX, filtered);
                window.dispatchEvent(new CustomEvent('outbox-changed'));
            }
        });
        return outboxQueue;
    },

    logAudit: async (action: string, userId: string, details: string) => {
        const entry: SystemAuditLog = { id: generateId(), action, userId, details, created: getNowISO() };
        const current = await loadTable<SystemAuditLog[]>(KEYS.SYSTEM_AUDIT_LOGS, []);
        current.unshift(entry);
        await saveTable(KEYS.SYSTEM_AUDIT_LOGS, current.slice(0, 500));

        // B-06 FIX: Voorkom feedback loop — interne SYSTEM audit entries (zoals SYNC_DISCARD
        // en INTEGRITY_CLEANUP) worden NIET naar de outbox gestuurd. Als zo'n sync mislukt,
        // zou logAudit opnieuw aangeroepen worden → nieuwe outbox entry → nieuwe sync-faal → cascade.
        // Alleen gebruiker-geïnitieerde audits worden gesynchroniseerd naar de server.
        const systemActions = ['SYNC_DISCARD', 'INTEGRITY_CLEANUP'];
        if (!systemActions.includes(action)) {
            await outboxUtils.addToOutbox(KEYS.SYSTEM_AUDIT_LOGS, 'INSERT', entry);
        }
    }
};

export const migrateToIndexedDB = async () => {
    const isMigrated = localStorage.getItem('fm_migrated_v2');
    if (isMigrated) return;
    for (const [key, storageKey] of Object.entries(KEYS)) {
        const oldData = localStorage.getItem(storageKey);
        if (oldData) {
            try { await saveTable(storageKey, JSON.parse(oldData)); } catch (e) { }
        }
    }
    localStorage.setItem('fm_migrated_v2', 'true');
};
