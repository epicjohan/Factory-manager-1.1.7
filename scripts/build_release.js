import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as fs_std from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_NAME = 'FactoryManager';
const VERSION = '1.1.1';
const BUILD_CMD = 'npm run build';
const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'release');
const ZIP_FILE = path.join(ROOT_DIR, `${APP_NAME}_v${VERSION}_Dist.zip`);

const APP_PORT = '8090'; 

console.log(`🚀 Industrial Release Builder v5.0 - PB v0.35 Schema Sync`);

if (fs_std.existsSync(OUTPUT_DIR)) {
    fs_std.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
if (fs_std.existsSync(ZIP_FILE)) {
    fs_std.unlinkSync(ZIP_FILE);
}
fs_std.mkdirSync(OUTPUT_DIR);

console.log('🛠️  Stap 1: Frontend compileren...');
try {
    execSync(BUILD_CMD, { stdio: 'inherit' });
} catch (e) {
    console.error('❌ Build mislukt!');
    process.exit(1);
}

const PB_PUBLIC = path.join(OUTPUT_DIR, 'pb_public');
const PB_MIGRATIONS = path.join(OUTPUT_DIR, 'pb_migrations');
const PB_HOOKS = path.join(OUTPUT_DIR, 'pb_hooks');
const BRIDGES = path.join(OUTPUT_DIR, 'bridges');

fs_std.mkdirSync(PB_PUBLIC);
fs_std.mkdirSync(PB_MIGRATIONS);
fs_std.mkdirSync(PB_HOOKS);
fs_std.mkdirSync(BRIDGES);

if (fs_std.existsSync(path.join(ROOT_DIR, 'dist'))) {
    fs_std.cpSync(path.join(ROOT_DIR, 'dist'), PB_PUBLIC, { recursive: true });
}

if (fs_std.existsSync(path.join(ROOT_DIR, 'pb_hooks'))) {
    fs_std.cpSync(path.join(ROOT_DIR, 'pb_hooks'), PB_HOOKS, { recursive: true });
}

if (fs_std.existsSync(path.join(ROOT_DIR, 'pocketbase.exe'))) {
    fs_std.copyFileSync(path.join(ROOT_DIR, 'pocketbase.exe'), path.join(OUTPUT_DIR, 'pocketbase.exe'));
}

const MIGRATION_CONTENT = `
migrate((db) => {
  const collections = [
    { 
      name: "system_config", 
      type: "base", 
      fields: [
        { name: "systemVersion", type: "text" }, 
        { name: "companyName", type: "text" }, 
        { name: "activeModules", type: "json" }, 
        { name: "teamsWebhook", type: "text" }, 
        { name: "notificationEmails", type: "json" }, 
        { name: "maintenanceMode", type: "bool" }, 
        { name: "lastUpdated", type: "date" }
      ] 
    },
    { 
      name: "mkg_operations", 
      type: "base", 
      fields: [
        { name: "code", type: "text", required: true }, 
        { name: "name", type: "text", required: true }, 
        { name: "category", type: "text" },
        { name: "default_machine_id", type: "text" },
        { name: "default_machine_type", type: "text" }
      ] 
    },
    { 
      name: "energy_settings", 
      type: "base", 
      fields: [
        { name: "kwhPrice", type: "number" }, 
        { name: "maxPowerLimit", type: "number" }, 
        { name: "co2Factor", type: "number" }
      ] 
    },
    { 
      name: "energy_historical", 
      type: "base", 
      fields: [
        { name: "timestamp", type: "date" }, 
        { name: "consumption_wh", type: "number" }, 
        { name: "production_wh", type: "number" }, 
        { name: "avg_consumption_w", type: "number" }, 
        { name: "avg_production_w", type: "number" }, 
        { name: "peak_w", type: "number" }
      ] 
    },
    { 
      name: "energy_live", 
      type: "base", 
      fields: [
        { name: "active_power_w", type: "number" }, 
        { name: "production_w", type: "number" },
        { name: "net_power_w", type: "number" },
        { name: "total_kwh", type: "number" }, 
        { name: "total_production_kwh", type: "number" },
        { name: "l1_amp", type: "number" }, 
        { name: "l2_amp", type: "number" }, 
        { name: "l3_amp", type: "number" }, 
        { name: "updated", type: "date" }
      ] 
    },
    { 
      name: "machines", 
      type: "base", 
      fields: [
        { name: "machineNumber", type: "text", required: true }, 
        { name: "name", type: "text", required: true }, 
        { name: "type", type: "text" }, 
        { name: "status", type: "text" }, 
        { name: "image", type: "file", options: { maxSelect: 1 } }, 
        { name: "focasIp", type: "text" }, 
        { name: "focasPort", type: "number" },
        { name: "protocol", type: "text" },
        { name: "mtConnectUrl", type: "text" },
        { name: "liveStats", type: "json" }, 
        { name: "toolStats", type: "json" }, 
        { name: "tankCapacity", type: "number" },
        { name: "coolantTarget", type: "number" },
        { name: "showInDashboard", type: "bool" },
        { name: "showInAndon", type: "bool" },
        { name: "andonConfig", type: "json" },
        { name: "scheduleId", type: "text" },
        { name: "documents", type: "file", options: { maxSelect: 99 } },
        { name: "isArchived", type: "bool" }
      ] 
    },
    { 
      name: "app_users", 
      type: "base", 
      fields: [
        { name: "name", type: "text", required: true }, 
        { name: "pinCode", type: "text", required: true }, 
        { name: "role", type: "text", required: true }, 
        { name: "permissions", type: "json" }, 
        { name: "allowedTabs", type: "json" }, 
        { name: "allowedModules", type: "json" },
        { name: "allowedAssetIds", type: "json" },
        { name: "restrictedAccess", type: "bool" }, 
        { name: "defaultPath", type: "text" }
      ] 
    },
    { 
      name: "tickets", 
      type: "base", 
      fields: [
        { name: "machineId", type: "text", required: true }, 
        { name: "title", type: "text", required: true }, 
        { name: "description", type: "text" }, 
        { name: "status", type: "text" }, 
        { name: "impact", type: "text" }, 
        { name: "reportedBy", type: "text" }, 
        { name: "reportedDate", type: "date" }, 
        { name: "actions", type: "json" }, 
        { name: "usedParts", type: "json" }, 
        { name: "repairCost", type: "number" }, 
        { name: "downtimeMinutes", type: "number" }, 
        { name: "resolvedBy", type: "text" }, 
        { name: "resolvedDate", type: "date" },
        { name: "resolvedCompany", type: "text" },
        { name: "invoice", type: "file", options: { maxSelect: 1 } }
      ] 
    },
    { 
      name: "support_requests", 
      type: "base", 
      fields: [
        { name: "type", type: "text", required: true }, 
        { name: "status", type: "text", required: true }, 
        { name: "machineId", type: "text" }, 
        { name: "message", type: "text" }, 
        { name: "urgency", type: "text" }, 
        { name: "requestDate", type: "date" }, 
        { name: "requester", type: "text" }, 
        { name: "acceptedBy", type: "text" }, 
        { name: "completedBy", type: "text" }, 
        { name: "completedDate", type: "date" },
        { name: "location", type: "text" }, 
        { name: "desiredTime", type: "text" },
        { name: "targetManager", type: "text" },
        { name: "answer", type: "text" }
      ] 
    },
    { 
      name: "snapshots", 
      type: "base", 
      fields: [
        { name: "name", type: "text", required: true },
        { name: "timestamp", type: "date" },
        { name: "data", type: "text" },
        { name: "type", type: "text" }
      ] 
    },
    { name: "machine_parts", type: "base", fields: [{ name: "machineId", type: "text", required: true }, { name: "description", type: "text", required: true }, { name: "articleCode", type: "text" }, { name: "stock", type: "number" }, { name: "minStock", type: "number" }, { name: "price", type: "number" }, { name: "location", type: "text" }, { name: "supplier", type: "text" }] },
    { name: "general_parts", type: "base", fields: [{ name: "description", type: "text", required: true }, { name: "articleCode", type: "text" }, { name: "stock", type: "number" }, { name: "minStock", type: "number" }, { name: "price", type: "number" }, { name: "location", type: "text" }, { name: "supplier", type: "text" }] },
    { name: "schedules", type: "base", fields: [{ name: "name", type: "text", required: true }, { name: "shifts", type: "json" }] },
    { name: "checklist_logs", type: "base", fields: [{ name: "machineId", type: "text", required: true }, { name: "checklistItemId", type: "text", required: true }, { name: "status", type: "text", required: true }, { name: "checkedBy", type: "text" }, { name: "date", type: "date", required: true }] },
    { name: "mixing_logs", type: "base", fields: [{ name: "machineId", type: "text", required: true }, { name: "percentage", type: "number" }, { name: "type", type: "text" }, { name: "performedBy", type: "text" }, { name: "actionTaken", type: "bool" }, { name: "notes", type: "text" }, { name: "date", type: "date", required: true }] },
    { name: "mist_logs", type: "base", fields: [{ name: "machineId", type: "text", required: true }, { name: "stage", type: "text" }, { name: "replacedBy", type: "text" }, { name: "remark", type: "text" }, { name: "partId", type: "text" }, { name: "cost", type: "number" }, { name: "date", type: "date", required: true }] },
    { name: "efficiency_logs", type: "base", fields: [{ name: "machineId", type: "text", required: true }, { name: "date", type: "date", required: true }, { name: "oee", type: "number" }, { name: "availability", type: "number" }, { name: "performance", type: "number" }, { name: "quality", type: "number" }, { name: "operatingMinutes", type: "number" }, { name: "cuttingMinutes", type: "number" }, { name: "partsProduced", type: "number" }] },
    { name: "maintenance_events", type: "base", fields: [{ name: "machineId", type: "text", required: true }, { name: "title", type: "text", required: true }, { name: "date", type: "date", required: true }, { name: "status", type: "text" }, { name: "assignedTo", type: "text" }] },
    { name: "system_status", type: "base", fields: [{ name: "bridge_name", type: "text", required: true }, { name: "status", type: "text" }, { name: "last_seen", type: "date" }] },
    { name: "system_audit_logs", type: "base", fields: [{ name: "action", type: "text", required: true }, { name: "userId", type: "text" }, { name: "details", type: "text" }, { name: "created", type: "date" }] },
    { 
      name: "articles", 
      type: "base", 
      fields: [
        { name: "articleCode", type: "text" }, 
        { name: "revision", type: "text" }, 
        { name: "name", type: "text" }, 
        { name: "description2", type: "text" }, 
        { name: "drawingNumber", type: "text" }, 
        { name: "drawingRevision", type: "text" }, 
        { name: "posNumber", type: "text" }, 
        { name: "status", type: "text" }, 
        { name: "isLocked", type: "bool" }, 
        { name: "operations", type: "json" }, 
        { name: "bomItems", type: "json" }, 
        { name: "files", type: "json" }, 
        { name: "auditTrail", type: "json" }, 
        { name: "changeReason", type: "text" }, 
        { name: "previousRevisionId", type: "text" }, 
        { name: "updatedBy", type: "text" }
      ] 
    },
    {
      name: "setup_templates",
      type: "base",
      fields: [
        { name: "name", type: "text" },
        { name: "assetType", type: "text" },
        { name: "description", type: "text" },
        { name: "fields", type: "json" },
        { name: "toolFields", type: "json" },
        { name: "isDefault", type: "bool" }
      ]
    },
    {
      name: "documents",
      type: "base",
      fields: [
        { name: "documentNumber", type: "text" },
        { name: "name", type: "text" },
        { name: "filename", type: "text" },
        { name: "categoryId", type: "text" },
        { name: "tags", type: "json" },
        { name: "fileData", type: "json" },
        { name: "description", type: "text" },
        { name: "size", type: "number" },
        { name: "type", type: "text" },
        { name: "uploadedBy", type: "text" },
        { name: "version", type: "number" },
        { name: "status", type: "text" },
        { name: "file", type: "file", options: { maxSelect: 1 } },
        { name: "uploadDate", type: "text" }
      ]
    }
  ];

  collections.forEach((c) => {
    try {
      const collection = new Collection(c);
      collection.listRule = "";
      collection.viewRule = "";
      collection.createRule = "";
      collection.updateRule = "";
      collection.deleteRule = "";
      db.saveCollection(collection);
    } catch (e) {}
  });
}, (db) => {})
`;
fs_std.writeFileSync(path.join(PB_MIGRATIONS, '1715000000_init_schema.js'), MIGRATION_CONTENT);

const START_BAT = `@echo off
title Factory Manager Engine
pushd "%~dp0"
cls
echo ======================================================
echo   FACTORY MANAGER ENGINE - DATABASE SERVER (PB v0.35)
echo ======================================================
echo.
set APP_PORT=${APP_PORT}

echo [1/2] Poort %APP_PORT% vrijmaken...
taskkill /IM pocketbase.exe /F >nul 2>&1
timeout /t 1 /nobreak > nul

echo [2/2] Database opstarten op poort %APP_PORT%...
echo Dashboard: http://localhost:%APP_PORT%
echo.
pocketbase.exe serve --http="0.0.0.0:%APP_PORT%" --dir="./pb_data" --publicDir="./pb_public"

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo FOUT: De server kon niet starten. Controleer of pocketbase.exe aanwezig is.
    pause
)
popd
`;

fs_std.writeFileSync(path.join(OUTPUT_DIR, 'START.bat'), START_BAT);

console.log('🗜️  Stap 3: ZIP archief maken...');
try {
    if (process.platform === 'win32') {
        execSync(`powershell -Command "Compress-Archive -Path '${OUTPUT_DIR}\\\\' -DestinationPath '${ZIP_FILE}' -Force"`);
    } else {
        execSync(`cd "${OUTPUT_DIR}" && zip -r "${ZIP_FILE}" .`);
    }
    console.log(`\n✅ RELEASE KLAAR: ${path.basename(ZIP_FILE)}`);
} catch (e) {
    console.log(`\n⚠️ ZIP mislukt, map /release is wel klaar.`);
}