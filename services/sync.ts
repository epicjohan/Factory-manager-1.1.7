
import { getStore, setStore, db } from './storage';
import { AppState, SyncEntry, SyncAction, UploadedDocument } from '../types';
import { KEYS, loadTable, saveTable, outboxUtils, formatDateForPB, ensureParsedData } from './db/core';

let syncTimer: any = null;
let isSyncBusy = false;
let isBootstrapped = false;
let eventSource: EventSource | null = null;
let failCount = 0;
let lastClientId: string | null = null;
let cachedToken: string | null = null;

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
    [KEYS.LOGS_ENERGY_QUARTERLY]: 'logs_energy_quarterly'
};

const COLLECTION_TO_KEY = Object.fromEntries(
    Object.entries(TABLE_MAP).map(([key, coll]) => [coll, key])
);

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

    // Strip autodate velden voor alle collections omdat PocketBase timestamps server-side beheert
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
    const h: Record<string, string> = {};
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

        const store = await getStore();
        if (!store.isDemoMode) {
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
        const store = await getStore();
        if (store.isDemoMode) {
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
            syncTimer = setTimeout(SyncService.runSyncLoop, 5000);
            return;
        }

        isSyncBusy = true;
        try {
            if (!cachedToken) {
                const authRes = await SyncService.authenticate(serverConfig.url, serverConfig.email, serverConfig.password);
                if (authRes.success) {
                    cachedToken = authRes.token || null;
                } else {
                    updateConnectionStatus('OFFLINE', authRes.message);
                    SyncService.scheduleNextRun(30000);
                    isSyncBusy = false;
                    return;
                }
            }

            if (!isBootstrapped) {
                updateConnectionStatus('SYNCING');
                await SyncService.pullDeltas(serverConfig.url, true);
                isBootstrapped = true;
            }

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
        }
    },

    stop: () => {
        if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
        if (eventSource) { eventSource.close(); eventSource = null; }
    },

    initRealtime: async () => {
        const store = await getStore();
        const serverConfig = await db.getServerSettings();
        const effectiveUrl = serverConfig.url;
        if (store.isDemoMode || !effectiveUrl || !serverConfig.email || eventSource) return;

        try {
            eventSource = new EventSource(`${effectiveUrl}/api/realtime`);

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
                            if (msg.action === 'delete') {
                                await SyncService.removeLocalRecord(tableKey, msg.record.id);
                            } else {
                                await SyncService.updateLocalRecordAfterSync(tableKey, msg.record);
                            }
                        }
                    }
                } catch (err) { }
            };
        } catch (e) { }
    },

    removeLocalRecord: async (tableKey: string, id: string) => {
        const propMap: Record<string, keyof AppState> = {
            [KEYS.USERS]: 'users', [KEYS.MACHINES]: 'machines', [KEYS.TICKETS]: 'maintenanceTickets',
            [KEYS.LOGS_MIXING]: 'mixingLogs', [KEYS.LOGS_MIST]: 'mistLogs', [KEYS.LOGS_CHECKLIST]: 'checklistLogs',
            [KEYS.LOGS_EFFICIENCY]: 'efficiencyLogs', [KEYS.EVENTS]: 'maintenanceEvents',
            [KEYS.PARTS_MACHINE]: 'machineParts', [KEYS.PARTS_GENERAL]: 'generalParts' as any,
            [KEYS.REQUESTS]: 'supportRequests', [KEYS.SCHEDULES]: 'schedules',
            [KEYS.LOGS_ENERGY_HISTORICAL]: 'energyHistorical',
            [KEYS.MKG_OPERATIONS]: 'mkgOperations',
            [KEYS.ARTICLES]: 'articles',
            [KEYS.SETUP_TEMPLATES]: 'setupTemplates',
            [KEYS.ROLES]: 'roles',
            [KEYS.DOCUMENT_CATEGORIES]: 'documentCategories',
            [KEYS.ASSET_ENERGY_CONFIGS]: 'assetEnergyConfigs'
        };

        const stateKey = propMap[tableKey];

        if (stateKey) {
            const store = await getStore();
            const items = (store as any)[stateKey] || [];
            const filtered = items.filter((i: any) => i.id !== id);
            await setStore({ ...store, [stateKey]: filtered });
        }

        const currentTableData = await loadTable<any[]>(tableKey, []);
        const filteredTable = currentTableData.filter(i => i.id !== id);
        await saveTable(tableKey, filteredTable);
        window.dispatchEvent(new CustomEvent(`db:${tableKey}:updated`, { detail: filteredTable }));
        window.dispatchEvent(new CustomEvent('db-updated', { detail: { table: tableKey } }));
    },

    updateLocalRecordAfterSync: async (tableKey: string, remoteData: any) => {
        const propMap: Record<string, keyof AppState> = {
            [KEYS.USERS]: 'users', [KEYS.MACHINES]: 'machines', [KEYS.TICKETS]: 'maintenanceTickets',
            [KEYS.LOGS_MIXING]: 'mixingLogs', [KEYS.LOGS_MIST]: 'mistLogs', [KEYS.LOGS_CHECKLIST]: 'checklistLogs',
            [KEYS.LOGS_EFFICIENCY]: 'efficiencyLogs', [KEYS.EVENTS]: 'maintenanceEvents',
            [KEYS.PARTS_MACHINE]: 'machineParts', [KEYS.PARTS_GENERAL]: 'generalParts' as any,
            [KEYS.REQUESTS]: 'supportRequests', [KEYS.SCHEDULES]: 'schedules',
            [KEYS.SYSTEM_CONFIG]: 'systemSettings' as any, [KEYS.SNAPSHOTS]: 'snapshots',
            [KEYS.SYSTEM_STATUS]: 'systemStatus' as any, [KEYS.SYSTEM_AUDIT_LOGS]: 'systemAuditLogs' as any,
            [KEYS.SETTINGS_ENERGY]: 'energySettings' as any,
            [KEYS.LOGS_ENERGY_HISTORICAL]: 'energyHistorical',
            [KEYS.MKG_OPERATIONS]: 'mkgOperations',
            [KEYS.ARTICLES]: 'articles',
            [KEYS.SETUP_TEMPLATES]: 'setupTemplates',
            [KEYS.ROLES]: 'roles',
            [KEYS.DOCUMENT_CATEGORIES]: 'documentCategories',
            [KEYS.ASSET_ENERGY_CONFIGS]: 'assetEnergyConfigs'
        };

        const stateKey = propMap[tableKey];
        const store = await getStore();
        const parsedData = ensureParsedData(remoteData);

        // Mapping fix voor ARTICLES: 
        // PocketBase 'documents' (File) -> App 'files' (JSON met metadata) 
        // We moeten de metadata (filesMeta) gebruiken, niet de file URLs alleen.
        if (tableKey === KEYS.ARTICLES && parsedData.filesMeta) {
            // Restore legacy 'files' property from 'filesMeta'
            // We ignore the actual 'documents' array from PB because filesMeta contains all we need
            // (the URLs are reconstructed dynamically in resolveFileUrl)
            parsedData.files = parsedData.filesMeta;
            delete parsedData.filesMeta;
        }

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

        if (tableKey === KEYS.SETTINGS_ENERGY) {
            const currentSettings = store.energySettings || await loadTable<any>(KEYS.SETTINGS_ENERGY, {});
            const remoteTS = new Date(parsedData.updated || 0).getTime();
            const localTS = currentSettings.updatedAt || 0;

            if (remoteTS >= localTS) {
                const merged = { ...currentSettings, ...parsedData, lastRemoteUpdate: Date.now() };
                await saveTable(KEYS.SETTINGS_ENERGY, merged);
                await setStore({ ...store, energySettings: merged });
                window.dispatchEvent(new CustomEvent(`db:${tableKey}:updated`, { detail: merged }));
                window.dispatchEvent(new CustomEvent('db-updated', { detail: { table: tableKey } }));
            }
            return;
        }

        const items = stateKey ? ((store as any)[stateKey] || []) : await loadTable<any[]>(tableKey, []);
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
            if (stateKey) {
                await setStore({ ...store, [stateKey]: updatedItems });
            }
            await saveTable(tableKey, updatedItems);
            window.dispatchEvent(new CustomEvent(`db:${tableKey}:updated`, { detail: updatedItems }));
            window.dispatchEvent(new CustomEvent('db-updated', { detail: { table: tableKey } }));
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

            const insertEndpoint = `${url}/api/collections/${collection}/records`;
            const updateEndpoint = `${url}/api/collections/${collection}/records/${entry.data.id}`;
            const endpoint = entry.action === 'INSERT' ? insertEndpoint : updateEndpoint;

            // BUG-06: Geef de collection naam mee zodat sanitizeDataForServer autodate velden kan strippen
            const cleanData = sanitizeDataForServer(entry.data, collection);
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
                let res = await fetchWithTimeout(endpoint, {
                    method: entry.action === 'INSERT' ? 'POST' : entry.action === 'UPDATE' ? 'PATCH' : 'DELETE',
                    headers: currentHeaders,
                    body: entry.action === 'DELETE' ? undefined : body,
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
                await outboxUtils.updateOutboxEntry(entry.id, { error: e.message || "Netwerkfout" });
            }
        }
        return hasProcessedAny;
    },

    pullDeltas: async (url: string, forceFull: boolean = false) => {
        const headers = getHeaders();
        const meta = await db.getMetadata();

        const localMachines = await db.getMachines(true);
        const isDeviceEmpty = localMachines.length === 0;

        const lastSyncISO = meta.serverHighWaterMark || "2000-01-01T00:00:00.000Z";
        const filterTime = (forceFull || isDeviceEmpty) ? "2000-01-01T00:00:00.000Z" : lastSyncISO;

        const pbFilterValue = formatDateForPB(filterTime);
        let newestSeenISO = lastSyncISO;

        for (const [tableKey, collection] of Object.entries(TABLE_MAP)) {
            // Sla energy_live over (aparte stream), en system_audit_logs worden apart gepulled
            if (tableKey === KEYS.ENERGY_LIVE) continue;

            const filterString = `updated >= '${pbFilterValue}'`;
            const params = new URLSearchParams({
                filter: filterString,
                perPage: '500',
                sort: '-updated'
            });

            const fullUrl = `${url}/api/collections/${collection}/records?${params.toString()}`;
            const res = await fetchWithTimeout(fullUrl, { headers, timeout: 25000 });

            if (!res.ok) {
                if (res.status === 401) {
                    cachedToken = null;
                    const meta = await loadTable<any>(KEYS.METADATA, {});
                    await saveTable(KEYS.METADATA, { ...meta, lastAuthToken: null });
                }
                continue;
            }

            const data = await res.json();
            if (data.items && data.items.length > 0) {
                const mostRecent = data.items[0].updated;
                if (mostRecent > newestSeenISO) newestSeenISO = mostRecent;

                if (tableKey === KEYS.SYSTEM_CONFIG || tableKey === KEYS.SETTINGS_ENERGY) {
                    await SyncService.updateLocalRecordAfterSync(tableKey, data.items[0]);
                } else {
                    await SyncService.mergeRemoteRecords(tableKey, data.items);
                }
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
        const propMap: Record<string, keyof AppState> = {
            [KEYS.USERS]: 'users', [KEYS.MACHINES]: 'machines', [KEYS.TICKETS]: 'maintenanceTickets',
            [KEYS.LOGS_MIXING]: 'mixingLogs', [KEYS.LOGS_MIST]: 'mistLogs', [KEYS.LOGS_CHECKLIST]: 'checklistLogs',
            [KEYS.LOGS_EFFICIENCY]: 'efficiencyLogs', [KEYS.EVENTS]: 'maintenanceEvents',
            [KEYS.PARTS_MACHINE]: 'machineParts', [KEYS.PARTS_GENERAL]: 'generalParts' as any,
            [KEYS.REQUESTS]: 'supportRequests', [KEYS.SCHEDULES]: 'schedules',
            [KEYS.SNAPSHOTS]: 'snapshots', [KEYS.SYSTEM_STATUS]: 'systemStatus' as any,
            [KEYS.SETTINGS_ENERGY]: 'energySettings' as any,
            [KEYS.LOGS_ENERGY_HISTORICAL]: 'energyHistorical',
            [KEYS.MKG_OPERATIONS]: 'mkgOperations',
            [KEYS.ARTICLES]: 'articles',
            [KEYS.SETUP_TEMPLATES]: 'setupTemplates',
            [KEYS.ROLES]: 'roles',
            [KEYS.DOCUMENT_CATEGORIES]: 'documentCategories',
            [KEYS.ASSET_ENERGY_CONFIGS]: 'assetEnergyConfigs'
        };

        const stateKey = propMap[tableKey];

        const store = await getStore();
        const outboxRaw = await db.getOutbox();
        const outbox = Array.isArray(outboxRaw) ? outboxRaw : [];
        const localItems = stateKey ? ((store as any)[stateKey] || []) : await loadTable<any[]>(tableKey, []);
        const updatedLocal = [...localItems];
        let hasChanges = false;

        remoteItems.forEach(item => {
            const remote = ensureParsedData(item);

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

        if (hasChanges) {
            if (stateKey) {
                await setStore({ ...store, [stateKey]: updatedLocal });
            }
            await saveTable(tableKey, updatedLocal);
            window.dispatchEvent(new CustomEvent(`db:${tableKey}:updated`, { detail: updatedLocal }));
            window.dispatchEvent(new CustomEvent('db-updated', { detail: { table: tableKey } }));
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
                    const store = await getStore();
                    await setStore({ ...store, systemStatus: data.items });
                }
            }
        } catch (e) { }
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
    }
};
