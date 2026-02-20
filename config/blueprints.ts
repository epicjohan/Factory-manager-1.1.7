
import { 
    Monitor, Network, Database, BatteryCharging, ShieldCheck, 
    User, Clock, CheckCircle, AlertTriangle, Droplet, Wind, 
    Box, Megaphone, Package, TrendingUp, Calendar, Activity, 
    Zap, ShieldAlert, History, Folder, FileCode, Terminal, Cpu, Settings, Shield, 
    Layers, ClipboardList, ListChecks, Users, Wrench, Container, Recycle
} from 'lucide-react';

export interface HardwareSpec {
    icon: any;
    title: string;
    spec: string;
    detail: string;
    critical?: boolean;
}

export const HARDWARE_SPECS: HardwareSpec[] = [
    { icon: Monitor, title: "Chassis", spec: "Fanless Industrial PC", detail: "Voorkom aanzuiging van olie en stof via passieve koeling.", critical: true },
    { icon: Network, title: "Netwerk", spec: "Dual NIC (RJ45)", detail: "Gescheiden LAN voor machines en kantoor.", critical: true },
    { icon: Database, title: "Opslag", spec: "Industrial pSLC SSD", detail: "Hoge TBW waarde voor constant loggen zonder falen." },
    { icon: BatteryCharging, title: "Voeding", spec: "24V DC + UPS", detail: "DIN-rail UPS voorkomt corruptie bij spanningsuitval." },
    { icon: ShieldCheck, title: "OS", spec: "Windows LTSC", detail: "Geen ongewenste feature-updates of reboots." }
];

export interface FileSystemNode {
    name: string;
    type: "folder" | "file" | "exe" | "py" | "dll" | "cmd";
    level: number;
    comment?: string;
}

export const FILESYSTEM_BLUEPRINT: FileSystemNode[] = [
    { name: "C:/ (of D:/Data)", type: "folder", level: 0, comment: "Installatie-station" },
    { name: "FactoryManager", type: "folder", level: 1, comment: "Hoofdmap Applicatie" },
    { name: "pocketbase.exe", type: "exe", level: 2, comment: "De Database Engine & API Server" },
    { name: "START.bat", type: "cmd", level: 2, comment: "Launcher voor Server & Dashboard" },
    
    { name: "pb_data", type: "folder", level: 2, comment: "SQLite Database & File Storage (Kritiek!)" },
    { name: "data.db", type: "file", level: 3, comment: "De feitelijke database met alle historie" },
    { name: "storage", type: "folder", level: 3, comment: "Opslag voor PDF-tekeningen en foto's" },

    { name: "pb_public", type: "folder", level: 2, comment: "Frontend Bestanden (React Build)" },
    { name: "index.html", type: "file", level: 3, comment: "Entry point van de web-interface" },
    { name: "assets", type: "folder", level: 3, comment: "Gecompileerde JS en CSS bundles" },

    { name: "services", type: "folder", level: 2, comment: "Achtergrondprocessen (Python)" },
    { name: "bridge_cnc", type: "folder", level: 3, comment: "Machine Telemetrie Service" },
    { name: "factory_bridge.py", type: "py", level: 4, comment: "Script voor Fanuc/FOCAS polling" },
    { name: "fwlib32.dll", type: "dll", level: 4, comment: "Fanuc Driver (32-bit Required)" },
    
    { name: "bridge_energy", type: "folder", level: 3, comment: "Energie Monitoring Service" },
    { name: "energy_bridge.py", type: "py", level: 4, comment: "P1 Meter & Solar API Connector" },
    { name: "requirements.txt", type: "file", level: 4, comment: "Python dependencies (requests, etc)" },

    { name: "pb_migrations", type: "folder", level: 2, comment: "Database Schema Versiebeheer" },
    { name: "1715000_init.js", type: "file", level: 3, comment: "Automatische tabel-creatie script" },
    
    { name: "backups", type: "folder", level: 2, comment: "Nachtelijke Database Exports (ZIP)" },
    { name: "logs", type: "folder", level: 2, comment: "Foutrapportages van bridges" },
];

export interface CollectionField {
    name: string;
    type: 'Text' | 'Number' | 'JSON' | 'Bool' | 'Date' | 'Relation' | 'File';
    desc: string;
    required?: boolean;
}

export interface CollectionItem {
    name: string;
    desc: string;
    icon: any;
    color: string;
    fields: CollectionField[];
}

export interface CollectionGroup {
    group: string;
    items: CollectionItem[];
}

export const COLLECTIONS_BLUEPRINT: CollectionGroup[] = [
    {
        group: "Groep A: Core Production Data",
        items: [
            { name: 'machines', desc: 'CNC & Asset Register', icon: Monitor, color: 'bg-blue-600', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'machineNumber', type: 'Text', desc: 'Uniek ID (bijv. CNC-01)', required: true },
                { name: 'name', type: 'Text', desc: 'Displaynaam', required: true },
                { name: 'type', type: 'Text', desc: 'CNC/ROBOT/CMM/ETC' },
                { name: 'status', type: 'Text', desc: 'RUNNING/ERROR/MAINTENANCE/OFFLINE' },
                { name: 'focasIp', type: 'Text', desc: 'IP adres voor bridge' },
                { name: 'liveStats', type: 'JSON', desc: 'Real-time telemetry blob' },
                { name: 'toolStats', type: 'JSON', desc: 'ToolGuard monitoring data' },
                { name: 'checklist', type: 'JSON', desc: 'Gedefinieerde check-punten' },
                { name: 'image', type: 'File', desc: 'Machine foto' },
                { name: 'documents', type: 'File', desc: 'Handleidingen & Schema\'s' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'app_users', desc: 'Operator Accounts', icon: Users, color: 'bg-purple-600', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'name', type: 'Text', desc: 'Volledige naam', required: true },
                { name: 'pinCode', type: 'Text', desc: '4-8 cijferige login', required: true },
                { name: 'role', type: 'Text', desc: 'ADMIN/TD/OPERATOR' },
                { name: 'permissions', type: 'JSON', desc: 'Fijnmazige rechten' },
                { name: 'allowedAssetIds', type: 'JSON', desc: 'Zichtbare machines' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]}
        ]
    },
    {
        group: "Groep B: Operational Workflow",
        items: [
            { name: 'tickets', desc: 'Maintenance & Repairs', icon: Wrench, color: 'bg-red-600', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'machineId', type: 'Text', desc: 'Gekoppelde asset', required: true },
                { name: 'title', type: 'Text', desc: 'Storing titel', required: true },
                { name: 'description', type: 'Text', desc: 'Probleem omschrijving' },
                { name: 'status', type: 'Text', desc: 'OPEN/RESOLVED' },
                { name: 'impact', type: 'Text', desc: 'CRITICAL/NORMAL' },
                { name: 'actions', type: 'JSON', desc: 'Log van reparatie stappen' },
                { name: 'usedParts', type: 'JSON', desc: 'Verbruikte materialen' },
                { name: 'repairCost', type: 'Number', desc: 'Totale kosten post' },
                { name: 'invoice', type: 'File', desc: 'PDF/JPG van factuur' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'support_requests', desc: 'Logistics Oproepen', icon: Megaphone, color: 'bg-orange-500', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'type', type: 'Text', desc: 'SWARF/OIL/MATERIAL/QUESTION', required: true },
                { name: 'status', type: 'Text', desc: 'PENDING/ACCEPTED/COMPLETED', required: true },
                { name: 'machineId', type: 'Text', desc: 'Locatie oproep' },
                { name: 'message', type: 'Text', desc: 'Extra info' },
                { name: 'urgency', type: 'Text', desc: 'NORMAL/HIGH' },
                { name: 'acceptedBy', type: 'Text', desc: 'Chauffeur naam' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'maintenance_events', desc: 'Periodic Planner', icon: Calendar, color: 'bg-indigo-500', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'machineId', type: 'Text', desc: 'Gekoppelde machine', required: true },
                { name: 'title', type: 'Text', desc: 'Taaknaam', required: true },
                { name: 'date', type: 'Date', desc: 'Geplande datum', required: true },
                { name: 'status', type: 'Text', desc: 'PLANNED/COMPLETED' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'checklist_logs', desc: 'Compliance Logs', icon: ClipboardList, color: 'bg-emerald-600', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'machineId', type: 'Text', desc: 'Machine ID', required: true },
                { name: 'checklistItemId', type: 'Text', desc: 'Item ref', required: true },
                { name: 'status', type: 'Text', desc: 'OK/NOK', required: true },
                { name: 'checkedBy', type: 'Text', desc: 'Operator' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'mixing_logs', desc: 'Coolant Records', icon: Droplet, color: 'bg-cyan-500', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'machineId', type: 'Text', desc: 'Machine', required: true },
                { name: 'percentage', type: 'Number', desc: 'Brix waarde' },
                { name: 'type', type: 'Text', desc: 'MEASUREMENT/EXCHANGE/ETC' },
                { name: 'actionTaken', type: 'Bool', desc: 'Correctie uitgevoerd' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'mist_logs', desc: 'Mist Filter Register', icon: Wind, color: 'bg-slate-400', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'machineId', type: 'Text', desc: 'Machine', required: true },
                { name: 'stage', type: 'Text', desc: '0/1/HEPA', required: true },
                { name: 'replacedBy', type: 'Text', desc: 'Monteur' },
                { name: 'cost', type: 'Number', desc: 'Filter prijs' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'efficiency_logs', desc: 'Historical OEE Snapshots', icon: TrendingUp, color: 'bg-blue-800', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'machineId', type: 'Text', desc: 'Machine', required: true },
                { name: 'date', type: 'Date', desc: 'Dagsnapshot', required: true },
                { name: 'oee', type: 'Number', desc: 'Calculated OEE %' },
                { name: 'availability', type: 'Number', desc: 'Uptime %' },
                { name: 'performance', type: 'Number', desc: 'Prestatie %' },
                { name: 'quality', type: 'Number', desc: 'Quality %' },
                { name: 'operatingMinutes', type: 'Number', desc: 'Spindeluren' },
                { name: 'cuttingMinutes', type: 'Number', desc: 'Spindeluren' },
                { name: 'partsProduced', type: 'Number', desc: 'Parts Produced' },
                { name: 'status_snapshot', type: 'Text', desc: 'Machine status log' },
                { name: 'program_snapshot', type: 'Text', desc: 'Programma log' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]}
        ]
    },
    {
        group: "Groep C: Logistics & Resources",
        items: [
            { name: 'machine_parts', desc: 'Spare Parts (Specific)', icon: Package, color: 'bg-amber-600', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'machineId', type: 'Text', desc: 'Koppelmachine', required: true },
                { name: 'description', type: 'Text', desc: 'Benaming', required: true },
                { name: 'articleCode', type: 'Text', desc: 'SKU' },
                { name: 'stock', type: 'Number', desc: 'Huidig aantal' },
                { name: 'minStock', type: 'Number', desc: 'Alert drempel' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'general_parts', desc: 'Central Warehouse Items', icon: Box, color: 'bg-amber-800', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'description', type: 'Text', desc: 'Benaming', required: true },
                { name: 'articleCode', type: 'Text', desc: 'SKU' },
                { name: 'stock', type: 'Number', desc: 'Huidig aantal' },
                { name: 'location', type: 'Text', desc: 'Vak ID' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'schedules', desc: 'Work Shifts', icon: Clock, color: 'bg-indigo-700', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'name', type: 'Text', desc: 'Rooster naam', required: true },
                { name: 'shifts', type: 'JSON', desc: 'Dag/Tijd configuratie' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]}
        ]
    },
    {
        group: "Groep D: System & Telemetry",
        items: [
            { name: 'system_config', desc: 'Centralized Global Settings', icon: Shield, color: 'bg-indigo-800', fields: [
                { name: 'id', type: 'Text', desc: 'Vast ID: sysconfigroot01', required: true },
                { name: 'systemVersion', type: 'Text', desc: 'Versiecode (bijv. 1.0.0)' },
                { name: 'companyName', type: 'Text', desc: 'Bedrijfsnaam display' },
                { name: 'activeModules', type: 'JSON', desc: 'Lijst met ingeschakelde modules' },
                { name: 'teamsWebhook', type: 'Text', desc: 'Centrale Teams URL' },
                { name: 'notificationEmails', type: 'JSON', desc: 'Mail ontvangers' },
                { name: 'maintenanceMode', type: 'Bool', desc: 'Systeem lock' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'system_status', desc: 'Bridge Health', icon: Activity, color: 'bg-emerald-600', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'bridge_name', type: 'Text', desc: 'CNC / P1' },
                { name: 'status', type: 'Text', desc: 'ONLINE/OFFLINE' },
                { name: 'last_seen', type: 'Date', desc: 'Laatste heartbeat' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'energy_live', desc: 'P1 Live Stream', icon: Zap, color: 'bg-yellow-500', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'active_power_w', type: 'Number', desc: 'Huidig vermogen' },
                { name: 'total_kwh', type: 'Number', desc: 'Meterstand' },
                { name: 'l1_amp', type: 'Number', desc: 'Fase 1' },
                { name: 'l2_amp', type: 'Number', desc: 'Fase 2' },
                { name: 'l3_amp', type: 'Number', desc: 'Fase 3' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'asset_energy_configs', desc: 'Sensor Config', icon: Settings, color: 'bg-blue-500', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'machineId', type: 'Text', desc: 'Koppelmachine', required: true },
                { name: 'sensorType', type: 'Text', desc: 'HOMEWIZARD/SHELLY/ETC' },
                { name: 'ipAddress', type: 'Text', desc: 'Sensor IP' },
                { name: 'apiPort', type: 'Number', desc: 'Poort' },
                { name: 'pollInterval', type: 'Number', desc: 'Polling frequentie' },
                { name: 'manualPowerW', type: 'Number', desc: 'Vast wattage' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'logs_energy_assets', desc: 'Asset Energy Log', icon: TrendingUp, color: 'bg-cyan-600', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'machineId', type: 'Text', desc: 'Machine ID', required: true },
                { name: 'avgPower', type: 'Number', desc: 'Gemiddeld Wattage' },
                { name: 'kwhDelta', type: 'Number', desc: 'Verbruik in interval' },
                { name: 'timestamp', type: 'Date', desc: 'Meetmoment', required: true },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'snapshots', desc: 'DB Backups', icon: History, color: 'bg-slate-900', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'name', type: 'Text', desc: 'Naam snapshot' },
                { name: 'timestamp', type: 'Date', desc: 'Moment' },
                { name: 'data', type: 'Text', desc: 'Volledige JSON blob' },
                { name: 'type', type: 'Text', desc: 'AUTO/MANUAL' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]},
            { name: 'system_audit_logs', desc: 'Security Audit', icon: Shield, color: 'bg-red-900', fields: [
                { name: 'id', type: 'Text', desc: 'Systeem ID (15 tekens)', required: true },
                { name: 'action', type: 'Text', desc: 'Handeling' },
                { name: 'userId', type: 'Text', desc: 'Gebruiker ID' },
                { name: 'details', type: 'Text', desc: 'Systeem trace' },
                { name: 'created', type: 'Date', desc: 'Aanmaakdatum' },
                { name: 'updated', type: 'Date', desc: 'Laatste wijziging' }
            ]}
        ]
    }
];
