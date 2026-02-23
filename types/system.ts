
import { CommercialModule, LicenseStatus, NotificationTrigger, SyncEntry } from './common';
import { User, UserRoleDefinition } from './user';
import { Machine } from './machine';
import { WorkSchedule, MaintenanceTicket, MaintenanceEvent, SupportRequest, MixingLog, MistLog, ChecklistLog, EfficiencyLog, MachinePart, GeneralPart } from './maintenance';
import { EnergyLiveData, EnergyHistoricalLog, EnergySettings, AssetEnergyConfig, EnergyQuarterlyLog } from './energy';
import { Article, PredefinedOperation, SetupTemplate, DocumentCategory } from './pdm';

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
  lastModified?: number;
  serverUrl?: string;
  adminEmail?: string;
  adminPassword?: string;
  serverApiKey?: string;
  teamsWebhookUrl?: string;
  simulationState?: SimulationState;
  outbox?: SyncEntry[];
}
