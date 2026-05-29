
import { CommercialModule, LicenseStatus, NotificationTrigger, SyncEntry } from './common';
import { User, UserRoleDefinition } from './user';
import { Machine } from './machine';
import { WorkSchedule, MaintenanceTicket, MaintenanceEvent, SupportRequest, MixingLog, MistLog, ChecklistLog, EfficiencyLog, MachinePart, GeneralPart, MaterialType, MaterialProfile, RawMaterial, MaterialCategory, StorageLocation } from './maintenance';
import { EnergyLiveData, EnergyHistoricalLog, EnergySettings, AssetEnergyConfig, EnergyQuarterlyLog } from './energy';
import { Article, PredefinedOperation, SetupTemplate, DocumentCategory, DMSDocument, ToolPreparationRequest } from './pdm';
import { QmsFramework, QmsFolder, QmsAudit } from './compliance';

export interface SystemStatus {
  id: string;
  bridge_name: string;
  status: string;
  last_seen: string;
}

export interface SystemAuditLog {
  id: string;
  action: string;
  userId: string;
  details: string;
  created: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  timestamp: string;
  read: boolean;
}

export interface FeatureFlags {
  enableEnergyDashboard: boolean;
  enableAndonBoard: boolean;
  enableTeamsIntegration: boolean;
  enableSystemHealth: boolean;
}

export interface SystemSettings {
  id?: string;
  companyName: string;
  logoUrl?: string;
  licenseStatus?: LicenseStatus;
  activeModules?: CommercialModule[];
  notificationEmails?: string[];
  documentCategories?: DocumentCategory[];
  teamsWebhook?: string;
  systemVersion?: string;
  licenseHolder?: string;
  licenseKey?: string;
  licenseExpiry?: string;
  ncServerPath?: string; // PAD naar de NC server map voor mirroring
  darkModeStyle?: 'OLED' | 'CLASSIC' | 'MIDNIGHT';
  lightModeStyle?: 'CLEAN' | 'SOFT' | 'COOL';
  autoLogoutMinutes?: number; // 0 = uitgeschakeld, standaard 15
  // ─── MKG ERP Integratie (gesynct via system_config → alle devices) ───────
  mkgServerUrl?: string;
  mkgApiKey?: string;
  mkgUsername?: string;
  mkgPassword?: string;
}


// ─── MKG Geplande Capaciteit (tabel: plnc) ────────────────────────────────────
export interface MkgPlncRecord {
  id: string;                   // RowKey uit MKG (hex string, bijv. "0x0000000001d6b1fb")
  admi_num: number;             // Administratie
  rsrc_num: number;             // Resource/Machine ID in MKG
  prdh_num: string;             // Productieorder nummer
  prdr_num: number;             // Halffabricaat/bewerkingsstap
  plnc_datum: string;           // Datum (ISO string, bijv. "2026-05-29")
  plnc_week: number;            // Weeknummer
  plnc_maand: number;           // Maandnummer
  plnc_tijd: number;            // Stel-/insteltijd in seconden (vaak 0)
  plnc_tijd_bemand: number;     // Geplande bemande tijd in SECONDEN (bijv. 25200 = 7 uur)
  plnc_tijd_bemand_min: number; // Berekend: plnc_tijd_bemand / 60 (minuten, voor weergave)
  plnc_forecast: boolean;       // Is forecast-record
  syncedAt: string;             // Tijdstip van laatste sync
}

export interface DataSnapshot {
  id: string;
  timestamp: string;
  name: string;
  type: 'AUTO' | 'MANUAL';
  data: string;
}

export interface SimulationState {
  active: boolean;
  machineId: string;
  toolSequence: number[];
  activeToolIdx: number;
  secondsPerTool: number;
  elapsedInTool: number;
  scenario: 'STABLE' | 'WEAR' | 'BREAKAGE';
  cycleCount: number;
  baseLoad: number;
}

// ROOT STATE
export interface AppState {
  dbVersion: number;
  isDemoMode?: boolean;
  currentUser: User | null;
  users: User[];
  roles?: UserRoleDefinition[];
  machines: Machine[];
  mkgOperations?: PredefinedOperation[];
  setupTemplates?: SetupTemplate[];
  energyLive?: EnergyLiveData;
  energyHistorical?: EnergyHistoricalLog[];
  systemVersion?: string;
  mixingLogs?: MixingLog[];
  maintenanceTickets?: MaintenanceTicket[];
  mistLogs?: MistLog[];
  maintenanceEvents?: MaintenanceEvent[];
  machineParts?: MachinePart[];
  generalParts?: GeneralPart[];
  checklistLogs?: ChecklistLog[];
  supportRequests?: SupportRequest[];
  schedules?: WorkSchedule[];
  efficiencyLogs?: EfficiencyLog[];
  notificationEmails?: string[];
  notificationTriggers?: NotificationTrigger[];
  documentCategories?: DocumentCategory[];
  energySettings?: EnergySettings;
  assetEnergyConfigs?: AssetEnergyConfig[];
  featureFlags?: FeatureFlags;
  systemSettings?: SystemSettings;
  snapshots?: DataSnapshot[];
  systemStatus?: SystemStatus[];
  systemAuditLogs?: SystemAuditLog[];
  energyQuarterlyLogs?: EnergyQuarterlyLog[];
  articles?: Article[];
  documents?: DMSDocument[];
  qmsFrameworks?: QmsFramework[];
  qmsFolders?: QmsFolder[];
  qmsAudits?: QmsAudit[];
  lastModified?: number;
  serverUrl?: string;
  adminEmail?: string;
  // SECURITY S-03: adminPassword en serverApiKey zijn verwijderd uit AppState.
  // Credentials worden uitsluitend intern beheerd door settingsService.
  // Gebruik settingsService.getServerSettings() voor directe toegang buiten de state.
  teamsWebhookUrl?: string;
  simulationState?: SimulationState;
  outbox?: SyncEntry[];
  toolPrepRequests?: ToolPreparationRequest[];
  materialTypes?: MaterialType[];
  materialProfiles?: MaterialProfile[];
  rawMaterials?: RawMaterial[];
  materialCategories?: MaterialCategory[];
  storageLocations?: StorageLocation[];
  mkgPlncRecords?: MkgPlncRecord[];
}
