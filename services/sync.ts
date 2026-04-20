
// LAZY-LOADING: getStore/setStore worden niet meer gebruikt in de sync engine.
// Alle data wordt nu direct via loadTable/saveTable geladen/opgeslagen.
import { db } from './storage';
import { AppState, SyncEntry, SyncAction, UploadedDocument } from '../types';
import { KEYS, loadTable, saveTable, outboxUtils, formatDateForPB, ensureParsedData } from './db/core';
import { APP_INFO } from './appInfo';
import { VersionManager } from './versionManager';

let syncTimer: any = null;
let isSyncBusy = false;
let isBootstrapped = false;
let eventSource: EventSource | null = null;
let failCount = 0;
let lastClientId: string | null = null;
let cachedToken: string | null = null;
// FIX #1: Pending sync flag — als een sync-aanvraag binnenkomt terwijl de loop bezig is,
// wordt deze vlag gezet en wordt de sync direct gestart zodra de loop vrij is.
let pendingSyncRequest = false;

// SYNC-IMPROVEMENT: Maximale retry-teller voor outbox entries.
// Na dit aantal mislukte pogingen wordt het item uit de outbox verwijderd en gelogd.
const MAX_OUTBOX_RETRIES = 10;
// SYNC-IMPROVEMENT: Outbox entries ouder dan 7 dagen worden als stale beschouwd.
const STALE_OUTBOX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// BUG B-03 FIX: Multi-tab sync-lock via localStorage.
// Elke tab die de sync loop uitvoert claimt de lock met een timestamp.
// Andere tabs controleren of de lock recent is bijgewerkt (< 60s) en slaan de loop over.
const SYNC_LOCK_KEY = 'fm_sync_lock';
// S-3 FIX: 30s TTL i.p.v. 60s — andere tab wacht minder lang na crash van actieve tab
const SYNC_LOCK_TTL_MS = 30000;

const claimSyncLock = (): boolean => {
    try {
        const now = Date.now();
        const existing = localStorage.getItem(SYNC_LOCK_KEY);
        if (existing) {
            const { ts } = JSON.parse(existing);
            if (now - ts < SYNC_LOCK_TTL_MS) return false; // Andere tab is actief
        }
        localStorage.setItem(SYNC_LOCK_KEY, JSON.stringify({ ts: now }));
        return true;
    } catch { return true; } // Bij fout: doorgaan om data-verlies te voorkomen
};

const renewSyncLock = () => {
    try { localStorage.setItem(SYNC_LOCK_KEY, JSON.stringify({ ts: Date.now() })); } catch { }
};

const releaseSyncLock = () => {
    try { localStorage.removeItem(SYNC_LOCK_KEY); } catch { }
};

// S-3 FIX: Geef de sync lock automatisch vrij bij tab-sluiting of navigatie.
// Zonder dit wacht een andere tab de volledige TTL bij een abrupte tab-close.
if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', releaseSyncLock);
}

const TABLE_MAP: Record<string, string> = {
    [KEYS.USERS]: 'app_users',
    [KEYS.MACHINES]: 'machines',
    [KEYS.TICKETS]: 'tickets',
    [KEYS.LOGS_MIXING]: 'mixing_logs',
    [KEYS.LOGS_MIST]: 'mist_logs',
    [KEYS.LOGS_CHECKLIST]: 'checklist_logs',
    [KEYS.LOGS_EFFICIENCY]: 'efficiency_logs',
    [KEYS.EVENTS]: 'maintenance_events',
    [KEYS.PARTS_MACHINE]: 'machine_parts',
    [KEYS.PARTS_GENERAL]: 'general_parts',
    [KEYS.REQUESTS]: 'support_requests',
    [KEYS.SCHEDULES]: 'schedules',
    [KEYS.ENERGY_LIVE]: 'energy_live',
    [KEYS.LOGS_ENERGY_HISTORICAL]: 'energy_historical',
    [KEYS.SETTINGS_ENERGY]: 'energy_settings',
    [KEYS.SYSTEM_CONFIG]: 'system_config',
    [KEYS.SNAPSHOTS]: 'snapshots',
    [KEYS.SYSTEM_STATUS]: 'system_status',
    [KEYS.SYSTEM_AUDIT_LOGS]: 'system_audit_logs',
    [KEYS.ROLES]: 'user_roles',
    [KEYS.MKG_OPERATIONS]: 'mkg_operations',
    [KEYS.ARTICLES]: 'articles',
    [KEYS.SETUP_TEMPLATES]: 'setup_templates',
    [KEYS.DOCUMENT_CATEGORIES]: 'document_categories',
    [KEYS.DOCUMENTS]: 'documents',
    [KEYS.ASSET_ENERGY_CONFIGS]: 'asset_energy_configs',
    [KEYS.LOGS_ENERGY_QUARTERLY]: 'logs_energy_quarterly',
    [KEYS.QMS_FRAMEWORKS]: 'qms_frameworks',
    [KEYS.QMS_FOLDERS]: 'qms_folders',
    [KEYS.QMS_AUDITS]: 'qms_audits'
};

const COLLECTION_TO_KEY = Object.fromEntries(
    Object.entries(TABLE_MAP).map(([key, coll]) => [coll, key])
);

// S-5 FIX: Centrale mapping van tableKey → AppState property naam.
// Voorheen 3× gedupliceerd in removeLocalRecord, updateLocalRecordAfterSync en mergeRemoteRecords.
// Nieuwe collectie toevoegen? Alleen hier aanpassen.
const STATE_KEY_MAP: Partial<Record<string, keyof AppState>> = {
    [KEYS.USERS]: 'users',
    [KEYS.MACHINES]: 'machines',
    [KEYS.TICKETS]: 'maintenanceTickets',
    [KEYS.LOGS_MIXING]: 'mixingLogs',
    [KEYS.LOGS_MIST]: 'mistLogs',
    [KEYS.LOGS_CHECKLIST]: 'checklistLogs',
    [KEYS.LOGS_EFFICIENCY]: 'efficiencyLogs',
    [KEYS.EVENTS]: 'maintenanceEvents',
    [KEYS.PARTS_MACHINE]: 'machineParts',
    [KEYS.PARTS_GENERAL]: 'generalParts' as keyof AppState,
    [KEYS.REQUESTS]: 'supportRequests',
    [KEYS.SCHEDULES]: 'schedules',
    [KEYS.SNAPSHOTS]: 'snapshots',
    [KEYS.SYSTEM_STATUS]: 'systemStatus' as keyof AppState,
    [KEYS.SYSTEM_AUDIT_LOGS]: 'systemAuditLogs' as keyof AppState,
    [KEYS.SETTINGS_ENERGY]: 'energySettings' as keyof AppState,
    [KEYS.LOGS_ENERGY_HISTORICAL]: 'energyHistorical',
    [KEYS.MKG_OPERATIONS]: 'mkgOperations',
    [KEYS.ARTICLES]: 'articles',
    [KEYS.SETUP_TEMPLATES]: 'setupTemplates',
    [KEYS.ROLES]: 'roles',
    [KEYS.DOCUMENT_CATEGORIES]: 'documentCategories',
    [KEYS.DOCUMENTS]: 'documents' as keyof AppState,
    [KEYS.ASSET_ENERGY_CONFIGS]: 'assetEnergyConfigs',
    [KEYS.LOGS_ENERGY_QUARTERLY]: 'energyQuarterlyLogs',
    [KEYS.SYSTEM_CONFIG]: 'systemSettings' as keyof AppState,
    [KEYS.QMS_FRAMEWORKS]: 'qmsFrameworks',
    [KEYS.QMS_FOLDERS]: 'qmsFolders',
    [KEYS.QMS_AUDITS]: 'qmsAudits'
};

// created/updated meesturen veroorzaakt stille validatiefouten of onjuiste overwrite.
// PocketBase beheert deze timestamps server-side voor ALLE collections.

// Safe fetch met ingebouwde Timeout om hangende TCP sockets (en een forever-busy SyncLoop) te voorkomen
const fetchWithTimeout = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
    const { timeout = 30000, ...fetchOptions } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error(`Time-out opgetreden na ${timeout}ms voor URL: ${url.split('?')[0]}`);
        }
        throw error;
    }
};

const sanitizeDataForServer = (data: any, collection?: string): any => {
    if (typeof data !== 'object' || data === null) return data;
    const clean = Array.isArray(data) ? [...data] : { ...data };

    // Alle collecties gebruiken nu autodate voor created/updated.
    // PocketBase beheert deze timestamps server-side, dus strippen we ze altijd.
    if (collection) {
        delete clean.created;
        delete clean.updated;
    }

    Object.keys(clean).forEach(key => {
        const val = clean[key];
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
            clean[key] = val.replace('T', ' ').split('.')[0];
        } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            clean[key] = sanitizeDataForServer(val);
        }
    });
    return clean;
};

const getHeaders = (token?: string, contentType: string | null = 'application/json') => {
    const h: Record<string, string> = {
        'X-App-Version': APP_INFO.VERSION
    };
    const effectiveToken = token || cachedToken;
    if (effectiveToken && effectiveToken.trim().length > 10) {
        let cleanToken = effectiveToken.trim();
        if (!cleanToken.toLowerCase().startsWith('bearer ')) {
            cleanToken = `Bearer ${cleanToken}`;
        }
        h['Authorization'] = cleanToken;
    }
    if (contentType) {
        h['Content-Type'] = contentType;
    }
    return h;
};

const updateConnectionStatus = (status: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'DEMO' | 'LIVE', lastError?: string) => {
    window.dispatchEvent(new CustomEvent('connection-status-change', {
        detail: { status, lastSync: Date.now(), error: lastError }
    }));
};

const dataURLtoBlob = (dataurl: string) => {
    try {
        const arr = dataurl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.error("Blob conversion error", e);
        return null;
    }
};

export const SyncService = {
    authenticate: async (url: string, email: string, pass: string): Promise<{ success: boolean; token?: string; message: string }> => {
        try {
            const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
            const res = await fetchWithTimeout(`${cleanUrl}/api/collections/_superusers/auth-with-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: email, password: pass }),
                timeout: 15000
            });

            if (res.ok) {
                const data = await res.json();
                const meta = await loadTable<any>(KEYS.METADATA, {});
                await saveTable(KEYS.METADATA, { ...meta, lastAuthToken: data.token });
                cachedToken = data.token;
                return { success: true, token: data.token, message: 'Geverifieerd.' };
            } else {
                const err = await res.json();
                return { success: false, message: err.message || 'Inloggegevens ongeldig.' };
            }
        } catch (e: any) {
            return { success: false, message: `Verbinding mislukt: ${e.message}` };
        }
    },

    resolveFileUrl: (recordId: string, filename: any, tableKey: string, serverUrl?: string) => {
        if (!filename) return '';
        const name = typeof filename === 'object' ? filename.name : filename;
        if (!name || typeof name !== 'string') return '';

        // Base64 direct renderen
        if (name.startsWith('data:') || name.startsWith('http')) return name;
        if (!serverUrl) return '';

        const collection = TABLE_MAP[tableKey];
        if (!collection) return name;
        const base = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

        // PocketBase file URL format: /api/files/COLLECTION_ID_OR_NAME/RECORD_ID/FILENAME
        return `${base}/api/files/${collection}/${recordId}/${name}`;
    },

    start: async () => {
        if (syncTimer) return;

        const meta = await loadTable<any>(KEYS.METADATA, {});
        if (meta.lastAuthToken) {
            cachedToken = meta.lastAuthToken;
        }

        // SYNC-IMPROVEMENT: Integriteitscontrole bij opstarten
        await SyncService.integrityCheck();

        // LAZY-LOADING: Gebruik bestaande meta i.p.v. getStore() voor isDemoMode check
        if (!meta.isDemoMode) {
            const machines = await db.getMachines(true);
            if (machines.length === 0) {
                await SyncService.downloadState().catch(console.error);
                isBootstrapped = true;
            }
        }

        SyncService.initRealtime();
        SyncService.scheduleNextRun(2000);
    },

    scheduleNextRun: (delay: number) => {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(SyncService.runSyncLoop, delay);
    },

    runSyncLoop: async () => {
        // LAZY-LOADING: Lees alleen metadata voor isDemoMode check i.p.v. alle 28 tabellen
        const meta = await loadTable<any>(KEYS.METADATA, {});
        if (meta.isDemoMode) {
            updateConnectionStatus('DEMO');
            SyncService.scheduleNextRun(30000);
            return;
        }

        const serverConfig = await db.getServerSettings();

        if (!serverConfig.url || !serverConfig.email || !serverConfig.password) {
            updateConnectionStatus('OFFLINE', 'Wachten op server URL en Inloggegevens...');
            SyncService.scheduleNextRun(10000);
            return;
        }

        if (isSyncBusy) {
            // FIX #1: Markeer als pending zodat de sync direct hervat na vrijkomen van de lock.
            pendingSyncRequest = true;
            return;
        }

        isSyncBusy = true;
        // B-03 FIX: Claim de sync lock. Andere tabs zien de lock en slaan hun loop over.
        const hasLock = claimSyncLock();
        if (!hasLock) {
            isSyncBusy = false;
            SyncService.scheduleNextRun(15000); // Wacht en probeer opnieuw
            return;
        }
        try {
            // Security/Data-Integrity FIX: Block sync entirely if the client is outdated
            const isOutdated = await VersionManager.isClientOutdated();
            if (isOutdated) {
                updateConnectionStatus('OFFLINE', 'Verouderde App Versie. Ververs de pagina om te updaten.');
                SyncService.scheduleNextRun(60000); // Check slow
                isSyncBusy = false;
                releaseSyncLock();
                return;
            }

            if (!cachedToken) {
                const authRes = await SyncService.authenticate(serverConfig.url, serverConfig.email, serverConfig.password);
                if (authRes.success) {
                    cachedToken = authRes.token || null;
                } else {
                    updateConnectionStatus('OFFLINE', authRes.message);
                    SyncService.scheduleNextRun(30000);
                    isSyncBusy = false;
                    releaseSyncLock();
                    return;
                }
            }

            if (!isBootstrapped) {
                updateConnectionStatus('SYNCING');
                await SyncService.pullDeltas(serverConfig.url, true);
                isBootstrapped = true;
            }

            renewSyncLock(); // Verleng de lock halverwege de sync
            const outboxProcessed = await SyncService.processOutbox(serverConfig.url);
            await SyncService.pullDeltas(serverConfig.url);
            await SyncService.fetchLiveStreams(serverConfig.url);

            failCount = 0;
            updateConnectionStatus(eventSource ? 'LIVE' : 'ONLINE');

            const nextDelay = outboxProcessed ? 2000 : 15000;
            SyncService.scheduleNextRun(nextDelay);
        } catch (e: any) {
            failCount++;
            const errMsg = e.message || 'Netwerkfout';

            if (errMsg.includes('401') || errMsg.includes('Unauthorized')) {
                cachedToken = null;
                const meta = await loadTable<any>(KEYS.METADATA, {});
                await saveTable(KEYS.METADATA, { ...meta, lastAuthToken: null });
            }

            updateConnectionStatus('OFFLINE', errMsg);
            const backoffDelay = Math.min(60000, Math.pow(2, failCount) * 1000);
            SyncService.scheduleNextRun(backoffDelay);
        } finally {
            isSyncBusy = false;
            releaseSyncLock();
            // FIX #1: Pending aanvraag afhandelen — start direct opnieuw als er een schrijfactie
            // binnenkwam tijdens de sync (bijv. monteur die snel meerdere waarden aanpast).
            if (pendingSyncRequest) {
                pendingSyncRequest = false;
                SyncService.scheduleNextRun(500);
            }
        }
    },

    stop: () => {
        if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
        if (eventSource) { eventSource.close(); eventSource = null; }
    },

    initRealtime: async () => {
        // LAZY-LOADING: Lees alleen metadata voor isDemoMode check
        const meta = await loadTable<any>(KEYS.METADATA, {});
        const serverConfig = await db.getServerSettings();
        const effectiveUrl = serverConfig.url;
        if (meta.isDemoMode || !effectiveUrl || !serverConfig.email || eventSource) return;

        try {
            // FIX #2: Token meesturen als URL param — EventSource ondersteunt geen custom headers.
            // PocketBase accepteert ?token= als alternatief voor de Authorization header.
            const realtimeUrl = cachedToken
                ? `${effectiveUrl}/api/realtime?token=${encodeURIComponent(cachedToken)}`
                : `${effectiveUrl}/api/realtime`;
            eventSource = new EventSource(realtimeUrl);

            eventSource.onerror = () => {
                if (eventSource) { eventSource.close(); eventSource = null; }
                lastClientId = null;
                setTimeout(SyncService.initRealtime, 5000);
            };

            eventSource.onmessage = async (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.clientId && msg.clientId !== lastClientId) {
                        lastClientId = msg.clientId;
                        const allCollections = Object.values(TABLE_MAP);
                        await fetch(`${effectiveUrl}/api/realtime`, {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify({ clientId: lastClientId, subscriptions: allCollections })
                        });
                        updateConnectionStatus('LIVE');
                        return;
                    }

                    const tableKey = COLLECTION_TO_KEY[msg.collectionName];
                    if (tableKey && msg.record) {
                        const outboxRaw = await db.getOutbox();
                        const outbox = Array.isArray(outboxRaw) ? outboxRaw : [];
                        const isLocked = outbox.some(entry => entry && entry.table === tableKey && entry.data && entry.data.id === msg.record.id);
                        if (!isLocked) {
                            // B-01 FIX: Alle acties (create/update/delete) gaan via updateLocalRecordAfterSync.
                            // Bij soft deletes stuurt PocketBase een 'update' event met deletedAt veld,
                            // dat wordt automatisch afgevangen door de deletedAt check in updateLocalRecordAfterSync.
                            // Hard deletes (msg.action === 'delete') worden als fallback ook via removeLocalRecord afgehandeld.
                            if (msg.action === 'delete') {
                                await SyncService.removeLocalRecord(tableKey, msg.record.id);
                            } else {
                                await SyncService.updateLocalRecordAfterSync(tableKey, msg.record);
                            }
                        }
                    }
                } catch (err) {
                    // B-02 FIX: log realtime bericht verwerkingsfouten
                    console.warn('[SyncService] Fout bij verwerken realtime bericht:', err);
                }
            };
        } catch (e) {
            // B-02 FIX: log fouten bij initialiseren van de EventSource verbinding
            console.warn('[SyncService] Fout bij initialiseren van realtime verbinding:', e);
        }
    },

    removeLocalRecord: async (tableKey: string, id: string) => {
        // LAZY-LOADING: Direct loadTable/saveTable — geen getStore/setStore meer nodig.
        const currentTableData = await loadTable<any[]>(tableKey, []);
        const filteredTable = currentTableData.filter(i => i.id !== id);
        await saveTable(tableKey, filteredTable);
        // saveTable dispatcht al db:key:updated en db-updated events
    },

    updateLocalRecordAfterSync: async (tableKey: string, remoteData: any) => {
        // LAZY-LOADING: Direct loadTable/saveTable — geen getStore/setStore meer.
        const parsedData = ensureParsedData(remoteData);

        // SYNC-IMPROVEMENT: Soft Delete detectie — als het record op de server
        // als verwijderd is gemarkeerd, verwijder het dan lokaal.
        if (parsedData.deletedAt) {
            await SyncService.removeLocalRecord(tableKey, parsedData.id);
            return;
        }

        // Mapping fix voor ARTICLES: 
        // PocketBase 'documents' (File) -> App 'files' (JSON met metadata) 
        if (tableKey === KEYS.ARTICLES && parsedData.filesMeta) {
            parsedData.files = parsedData.filesMeta;
            delete parsedData.filesMeta;
        }

        // Mapping fix voor DOCUMENTS
        // Omdat de JSON response alleen 'file' (string) heeft, bouwen we .url direct weer op.
        if (tableKey === KEYS.DOCUMENTS && parsedData.file) {
            const currentMeta = await loadTable<any>(KEYS.METADATA, {});
            if (currentMeta && currentMeta.serverUrl) {
                const base = currentMeta.serverUrl.endsWith('/') ? currentMeta.serverUrl.slice(0, -1) : currentMeta.serverUrl;
                parsedData.url = `${base}/api/files/documents/${parsedData.id}/${parsedData.file}`;
            }
        }

        // SYSTEM_CONFIG is een singleton, geen array
        if (tableKey === KEYS.SYSTEM_CONFIG) {
            if (parsedData.id) {
                await outboxUtils.clearPendingUpdates(KEYS.SYSTEM_CONFIG, parsedData.id);
            }
            await saveTable(KEYS.SYSTEM_CONFIG, parsedData);
            const currentMeta = await db.getMetadata();
            await db.saveMetadata({ ...currentMeta, systemVersion: parsedData.systemVersion, notificationEmails: parsedData.notificationEmails });
            window.dispatchEvent(new CustomEvent('settings-changed', { detail: { settings: parsedData } }));
            return;
        }

        // SETTINGS_ENERGY is een singleton, geen array
        if (tableKey === KEYS.SETTINGS_ENERGY) {
            const currentSettings = await loadTable<any>(KEYS.SETTINGS_ENERGY, {});
            const remoteTS = new Date(parsedData.updated || 0).getTime();
            const localTS = currentSettings.updatedAt || 0;

            if (remoteTS >= localTS) {
                const merged = { ...currentSettings, ...parsedData, lastRemoteUpdate: Date.now() };
                await saveTable(KEYS.SETTINGS_ENERGY, merged);
                // saveTable dispatcht al events
            }
            return;
        }

        // Standaard pad: array-gebaseerde tabellen
        const items = await loadTable<any[]>(tableKey, []);
        let hasChanges = false;
        let updatedItems: any[];

        const existingIdx = items.findIndex((i: any) => i.id === parsedData.id);
        const remoteTS = new Date(parsedData.updated || 0).getTime();

        if (existingIdx !== -1) {
            const local = items[existingIdx];
            const localTS = local.updatedAt || 0;
            if (remoteTS >= localTS) {
                updatedItems = [...items];
                updatedItems[existingIdx] = { ...parsedData, lastRemoteUpdate: Date.now() };
                hasChanges = true;
            } else {
                updatedItems = items;
            }
        } else {
            updatedItems = [...items, { ...parsedData, lastRemoteUpdate: Date.now() }];
            hasChanges = true;
        }

        if (hasChanges) {
            await saveTable(tableKey, updatedItems);
            // saveTable dispatcht al db:key:updated en db-updated events
        }
    },

    processOutbox: async (url: string): Promise<boolean> => {
        const outboxRaw = await db.getOutbox();
        const outbox = Array.isArray(outboxRaw) ? outboxRaw : [];
        if (outbox.length === 0) return false;

        updateConnectionStatus('SYNCING');
        let hasProcessedAny = false;

        for (const entry of outbox) {
            const collection = TABLE_MAP[entry.table];
            if (!collection) continue;

            // SYNC-IMPROVEMENT: Retry limiet — na MAX_OUTBOX_RETRIES pogingen wordt het
            // item uit de outbox verwijderd en gelogd als irrecoverable.
            if (entry.retryCount && entry.retryCount >= MAX_OUTBOX_RETRIES) {
                console.error(`[SyncService] Max retries (${MAX_OUTBOX_RETRIES}) bereikt voor outbox entry ${entry.id} (${entry.table}/${entry.action}), wordt verwijderd.`);
                await outboxUtils.logAudit('SYNC_DISCARD', 'SYSTEM',
                    `Record ${entry.data?.id || 'unknown'} na ${MAX_OUTBOX_RETRIES} pogingen uit sync-wachtrij verwijderd (${entry.table}/${entry.action}). Laatste fout: ${entry.error || 'onbekend'}`);
                await db.removeFromOutbox([entry.id]);
                hasProcessedAny = true;
                continue;
            }

            const insertEndpoint = `${url}/api/collections/${collection}/records`;
            const updateEndpoint = `${url}/api/collections/${collection}/records/${entry.data.id}`;

            let effectiveAction = entry.action;
            let endpoint: string;
            if (entry.action === 'DELETE' && entry.data.id) {
                endpoint = updateEndpoint; // Wait, updateEndpoint is the URL with the ID
            } else {
                endpoint = entry.action === 'INSERT' ? insertEndpoint : updateEndpoint;
            }

            // BUG-06: Geef de collection naam mee zodat sanitizeDataForServer autodate velden kan strippen
            let cleanData: any;
            if (entry.action === 'DELETE') {
                cleanData = {}; // No body needed for DELETE
            } else {
                cleanData = sanitizeDataForServer(entry.data, collection);
            }
            delete cleanData.isPending;
            delete cleanData.lastRemoteUpdate;
            delete cleanData.updatedAt;
            delete cleanData.collectionId;
            delete cleanData.collectionName;

            if (entry.action === 'UPDATE') delete cleanData.id;

            // --- FILE API HANDLING ---
            // Detecteer en splits bestanden (Base64) naar FormData
            let body: any;
            const formData = new FormData();
            let hasBinaryContent = false;

            // 1. DOCUMENTS LOGIC (New relational DMS flow)
            if (entry.table === KEYS.DOCUMENTS) {
                // Documents contain their own heavy base64 url
                if (cleanData.url && cleanData.url.startsWith('data:')) {
                    const blob = dataURLtoBlob(cleanData.url);
                    if (blob) {
                        formData.append('file', blob, cleanData.name);
                        hasBinaryContent = true;
                    }
                    delete cleanData.url; // Never send base64 as text
                }
            }

            // 2. ARTICLES LOGIC (Legacy / Partial split metadata vs blobs)
            else if (entry.table === KEYS.ARTICLES) {
                // files -> filesMeta (JSON) + documents (FormData)
                if (cleanData.files && Array.isArray(cleanData.files)) {
                    const filesMeta: any[] = [];

                    cleanData.files.forEach((fileObj: any) => {
                        const metaClone = { ...fileObj };

                        // Check of er nieuwe Base64 data is (url begint met data:)
                        if (metaClone.url && metaClone.url.startsWith('data:')) {
                            // FALLBACK / LEGACY: Only for old-style direct Article uploads.
                            // We shouldn't hit this much with the new documentService, 
                            // but we keep it so the old UI components don't crash before they are fully migrated
                            const blob = dataURLtoBlob(metaClone.url);
                            if (blob) {
                                formData.append('documents', blob, metaClone.name);
                                hasBinaryContent = true;
                                delete metaClone.url; // Prevent sending base64 strings in JSON
                            }
                        } else if (metaClone.url && metaClone.url.startsWith('http')) {
                            // Verwijder url voor externe of bestaande PB urls uit de JSON metadata om string-bloat te voorkomen
                            // Wordt gereconstrueerd in resolveFileUrl()
                            delete metaClone.url;
                        }

                        filesMeta.push(metaClone);
                    });

                    // Sla de schone metadata array als string op in 'filesMeta' text veld!
                    cleanData.filesMeta = JSON.stringify(filesMeta);
                    delete cleanData.files; // Verwijder de originele geneste array
                }
            }// 2. MACHINES & TICKETS LOGIC (Simpler)
            else if (['image', 'invoice'].some(k => cleanData[k])) {
                ['image', 'invoice'].forEach(key => {
                    const val = cleanData[key];
                    if (val && typeof val === 'object' && val.url && val.url.startsWith('data:')) {
                        const blob = dataURLtoBlob(val.url);
                        if (blob) {
                            formData.append(key, blob, val.name || 'upload.jpg');
                            hasBinaryContent = true;
                        }
                        // Clear from JSON payload
                        cleanData[key] = '';
                    } else if (typeof val === 'string' && val.startsWith('data:')) {
                        // Legacy string format
                        const blob = dataURLtoBlob(val);
                        if (blob) {
                            formData.append(key, blob, 'upload.jpg');
                            hasBinaryContent = true;
                        }
                        cleanData[key] = '';
                    }
                });
            }

            // Construct Final Payload
            if (hasBinaryContent) {
                // Append all other JSON fields to formData
                Object.keys(cleanData).forEach(key => {
                    const val = cleanData[key];
                    if (val === undefined || val === null) return;
                    if (typeof val === 'object') {
                        formData.append(key, JSON.stringify(val));
                    } else {
                        formData.append(key, val.toString());
                    }
                });
                body = formData;
            } else {
                // Als er geen nieuwe bestanden zijn, gewoon JSON sturen
                body = JSON.stringify(cleanData);
            }

            const currentHeaders = getHeaders(undefined, hasBinaryContent ? null : 'application/json');

            try {
                // SYNC-IMPROVEMENT: Gebruik effectiveAction voor de HTTP methode.
                // Bij soft delete is de effectiveAction 'UPDATE' (PATCH) i.p.v. 'DELETE'.
                let res = await fetchWithTimeout(endpoint, {
                    method: effectiveAction === 'INSERT' ? 'POST' : (effectiveAction === 'DELETE' ? 'DELETE' : 'PATCH'),
                    headers: currentHeaders,
                    body: effectiveAction === 'DELETE' ? undefined : body,
                    timeout: 45000
                });

                // Fallback: Als UPDATE faalt met 404, probeer INSERT (Self-healing)
                if (!res.ok && res.status === 404 && entry.action === 'UPDATE' && entry.data.id) {
                    // Bij fallback naar INSERT moeten we ID meesturen in body als we JSON gebruiken
                    if (!hasBinaryContent) {
                        cleanData.id = entry.data.id;
                        body = JSON.stringify(cleanData);
                    } else {
                        formData.append('id', entry.data.id);
                    }

                    res = await fetchWithTimeout(insertEndpoint, {
                        method: 'POST',
                        headers: currentHeaders,
                        body: body,
                        timeout: 45000
                    });
                }

                if (res.ok) {
                    if (entry.action !== 'DELETE' && entry.table !== KEYS.SYSTEM_AUDIT_LOGS) {
                        const remoteRecord = await res.json();
                        await SyncService.updateLocalRecordAfterSync(entry.table, remoteRecord);
                    }
                    await db.removeFromOutbox([entry.id]);
                    hasProcessedAny = true;
                } else {
                    const errorJson = await res.json().catch(() => ({}));
                    const errorMsg = errorJson.message || `Server Error ${res.status}`;

                    if (res.status === 400 || res.status === 404) {
                        // Markeer als gefaald en VERWIJDER uit outbox (Irrecoverable Error!)
                        // Als we dit niet doen, blijft de app deze corrupte wijziging oneindig proberen.
                        console.error(`Irrecoverable sync error for ${entry.table}`, errorJson);
                        await db.removeFromOutbox([entry.id]);
                        continue;
                    }

                    if (res.status === 401) {
                        cachedToken = null;
                        const meta = await loadTable<any>(KEYS.METADATA, {});
                        await saveTable(KEYS.METADATA, { ...meta, lastAuthToken: null });
                        throw new Error("Authenticatie verlopen.");
                    }
                    throw new Error(errorMsg);
                }
            } catch (e: any) {
                // SYNC-IMPROVEMENT: Verhoog retryCount bij elke mislukte poging
                await outboxUtils.updateOutboxEntry(entry.id, {
                    error: e.message || "Netwerkfout",
                    retryCount: (entry.retryCount || 0) + 1
                });
            }
        }
        return hasProcessedAny;
    },

    pullDeltas: async (url: string, forceFull: boolean = false) => {
        const headers = getHeaders();
        const meta = await db.getMetadata();

        const localMachines = await db.getMachines(true);
        const isDeviceEmpty = localMachines.length === 0;

        const lastSyncISO = meta.serverHighWaterMark || '2000-01-01T00:00:00.000Z';
        const filterTime = (forceFull || isDeviceEmpty) ? '2000-01-01T00:00:00.000Z' : lastSyncISO;
        const pbFilterValue = formatDateForPB(filterTime);

        // S-7 FIX: Alle tabel-fetches lopen parallel via Promise.allSettled().
        // Eerder was dit sequentieel: 27 tabellen × ~100ms = ~2.7s per sync-cycle.
        // De newestSeenISO wordt pas erna bijgewerkt op de meest recente van alle tabellen.
        const tableEntries = Object.entries(TABLE_MAP).filter(([key]) => key !== KEYS.ENERGY_LIVE);

        // S-1 FIX: fetchAllPages haalt alle pagina's op voor één tabel.
        // Zonder paginering werden records boven de 500-limiet permanent overgeslagen.
        const fetchAllPages = async (tableKey: string, collection: string): Promise<{ tableKey: string; items: any[]; newestISO: string }> => {
            const filterString = `updated >= '${pbFilterValue}'`;
            const allItems: any[] = [];
            let page = 1;
            let totalPages = 1;
            let newestISO = lastSyncISO;

            do {
                const params = new URLSearchParams({
                    filter: filterString,
                    perPage: '500',
                    sort: '-updated',
                    page: String(page)
                });
                const res = await fetchWithTimeout(
                    `${url}/api/collections/${collection}/records?${params}`,
                    { headers, timeout: 25000 }
                );

                if (!res.ok) {
                    if (res.status === 401) {
                        cachedToken = null;
                        const m = await loadTable<any>(KEYS.METADATA, {});
                        await saveTable(KEYS.METADATA, { ...m, lastAuthToken: null });
                    }
                    break;
                }

                const data = await res.json();
                totalPages = data.totalPages || 1;

                if (data.items?.length > 0) {
                    allItems.push(...data.items);
                    // Eerste pagina is gesorteerd op -updated — hoogste timestamp staat vooraan
                    if (page === 1 && data.items[0].updated > newestISO) {
                        newestISO = data.items[0].updated;
                    }
                }
                page++;
            } while (page <= totalPages);

            return { tableKey, items: allItems, newestISO };
        };

        const results = await Promise.allSettled(
            tableEntries.map(([tableKey, collection]) => fetchAllPages(tableKey, collection))
        );

        let newestSeenISO = lastSyncISO;

        for (const result of results) {
            if (result.status === 'rejected') {
                console.error('[pullDeltas] Tabel ophalen mislukt:', result.reason);
                continue;
            }
            const { tableKey, items, newestISO } = result.value;
            if (newestISO > newestSeenISO) newestSeenISO = newestISO;
            if (items.length === 0) continue;

            try {
                if (tableKey === KEYS.SYSTEM_CONFIG || tableKey === KEYS.SETTINGS_ENERGY) {
                    await SyncService.updateLocalRecordAfterSync(tableKey, items[0]);
                } else {
                    await SyncService.mergeRemoteRecords(tableKey, items);
                }
            } catch (mergeError) {
                console.error(`[pullDeltas] Merge mislukt voor ${tableKey}:`, mergeError);
            }
        }

        const updatedMeta = await db.getMetadata();
        await db.saveMetadata({
            ...updatedMeta,
            lastSuccessfulSync: Date.now(),
            serverHighWaterMark: newestSeenISO
        });
    },

    mergeRemoteRecords: async (tableKey: string, remoteItems: any[]) => {
        // LAZY-LOADING: Direct loadTable/saveTable — geen getStore/setStore meer.
        const outboxRaw = await db.getOutbox();
        const outbox = Array.isArray(outboxRaw) ? outboxRaw : [];
        const localItems = await loadTable<any[]>(tableKey, []);
        const updatedLocal = [...localItems];
        let hasChanges = false;
        // SYNC-IMPROVEMENT: Track IDs die via soft delete verwijderd moeten worden
        const softDeletedIds: string[] = [];

        remoteItems.forEach(item => {
            const remote = ensureParsedData(item);

            // SYNC-IMPROVEMENT: Soft Delete detectie bij batch merge
            if (remote.deletedAt) {
                softDeletedIds.push(remote.id);
                return;
            }

            // SPECIFIEKE LOGICA VOOR ARTICLES: filesMeta -> files
            if (tableKey === KEYS.ARTICLES && remote.filesMeta) {
                remote.files = remote.filesMeta;
                delete remote.filesMeta;
            }

            const isLocked = outbox.some(e => e && e.table === tableKey && e.data && e.data.id === remote.id);
            if (isLocked) return;

            const idx = updatedLocal.findIndex(l => l.id === remote.id);
            const remoteTS = new Date(remote.updated).getTime();

            if (idx === -1) {
                updatedLocal.push({ ...remote, lastRemoteUpdate: Date.now() });
                hasChanges = true;
            } else {
                const local = updatedLocal[idx];
                const localTS = local.updatedAt || 0;
                if (remoteTS >= localTS) {
                    updatedLocal[idx] = { ...local, ...remote, lastRemoteUpdate: Date.now() };
                    hasChanges = true;
                }
            }
        });

        // SYNC-IMPROVEMENT: Verwijder lokaal alle soft-deleted records
        if (softDeletedIds.length > 0) {
            const beforeLength = updatedLocal.length;
            const filtered = updatedLocal.filter(item => !softDeletedIds.includes(item.id));
            if (filtered.length !== beforeLength) {
                hasChanges = true;
                updatedLocal.length = 0;
                updatedLocal.push(...filtered);
            }
        }

        if (hasChanges) {
            await saveTable(tableKey, updatedLocal);
            // saveTable dispatcht al db:key:updated en db-updated events
        }
    },

    fetchLiveStreams: async (url: string) => {
        const headers = getHeaders();
        try {
            const [energyRes, machinesRes, statusRes] = await Promise.all([
                fetchWithTimeout(`${url}/api/collections/energy_live/records?sort=-updated&perPage=1`, { headers, timeout: 10000 }),
                fetchWithTimeout(`${url}/api/collections/machines/records?perPage=100&fields=id,liveStats`, { headers, timeout: 10000 }),
                fetchWithTimeout(`${url}/api/collections/system_status/records?perPage=50`, { headers, timeout: 10000 })
            ]);
            if (energyRes.ok) {
                const data = await energyRes.json();
                if (data.items?.length > 0) db.setEnergyLive(data.items[0]);
            }
            if (machinesRes.ok) {
                const data = await machinesRes.json();
                data.items?.forEach((remote: any) => {
                    if (remote.liveStats) {
                        const parsed = typeof remote.liveStats === 'string' ? JSON.parse(remote.liveStats) : remote.liveStats;
                        db.setMachineLiveStats(remote.id, parsed);
                    }
                });
            }
            if (statusRes.ok) {
                const data = await statusRes.json();
                if (data.items) {
                    // LAZY-LOADING: Direct saveTable i.p.v. getStore/setStore
                    await saveTable(KEYS.SYSTEM_STATUS, data.items);
                }
            }
        } catch (e) {
            // S-2 FIX: log fouten zodat stille datalacunes in energy/liveStats zichtbaar worden
            console.warn('[SyncService] fetchLiveStreams fout:', e);
        }
    },

    uploadState: async (force: boolean = false): Promise<{ success: boolean; message: string }> => {
        const serverConfig = await db.getServerSettings();
        if (!serverConfig.url || !serverConfig.email) return { success: false, message: "Geen server." };
        try {
            await SyncService.processOutbox(serverConfig.url);
            return { success: true, message: "Sync klaar." };
        } catch (e: any) {
            return { success: false, message: `Upload mislukt: ${e.message}` };
        }
    },

    downloadState: async (): Promise<{ success: boolean; message: string }> => {
        const serverConfig = await db.getServerSettings();
        if (!serverConfig.url || !serverConfig.email) return { success: false, message: "Geen server." };
        try {
            isBootstrapped = false;
            await SyncService.pullDeltas(serverConfig.url, true);
            isBootstrapped = true;
            return { success: true, message: "Cloud data binnengehaald." };
        } catch (e: any) {
            return { success: false, message: `Download mislukt: ${e.message}` };
        }
    },

    // SYNC-IMPROVEMENT: Integriteitscontrole bij het opstarten van de app.
    // Ruimt verlopen outbox entries op en controleert of IndexedDB tabellen consistent zijn.
    integrityCheck: async () => {
        try {
            const outbox = await db.getOutbox();
            if (!Array.isArray(outbox)) return;

            const now = Date.now();
            const staleEntries = outbox.filter(e => e && (now - e.timestamp) > STALE_OUTBOX_AGE_MS);

            if (staleEntries.length > 0) {
                console.warn(`[SyncService] IntegrityCheck: ${staleEntries.length} verlopen outbox entries (>7 dagen) worden opgeruimd.`);
                await db.removeFromOutbox(staleEntries.map(e => e.id));
                await outboxUtils.logAudit('INTEGRITY_CLEANUP', 'SYSTEM',
                    `${staleEntries.length} verlopen outbox entries ouder dan 7 dagen opgeruimd bij opstarten.`);
            }

            // Controleer of kritieke tabellen bestaan en niet corrupt zijn
            const criticalTables = [
                KEYS.USERS, KEYS.MACHINES, KEYS.ARTICLES, KEYS.DOCUMENTS,
                KEYS.QMS_FRAMEWORKS, KEYS.QMS_FOLDERS, KEYS.QMS_AUDITS
            ];
            for (const key of criticalTables) {
                const data = await loadTable<any>(key, null);
                if (data !== null && !Array.isArray(data)) {
                    console.warn(`[SyncService] IntegrityCheck: Tabel ${key} bevat geen array, wordt gereset naar [].`);
                    await saveTable(key, []);
                }
            }
        } catch (e) {
            console.error('[SyncService] IntegrityCheck fout:', e);
        }
    }
};
