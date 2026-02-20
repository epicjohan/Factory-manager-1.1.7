
import { AssetType, UploadedDocument } from './common';
import { ChecklistItem, MaintenanceInterval } from './maintenance';

export enum MachineProtocol {
  FOCAS = 'FOCAS',
  MTCONNECT = 'MTCONNECT'
}

export enum FanucControlType {
  I_SERIES = 'I_SERIES',
  LEGACY = 'LEGACY',
  SERIES_15 = 'SERIES_15'
}

export interface FocasLiveStats {
  connected: boolean;
  lastUpdated: string;
  runMode?: string;
  programNumber?: string;
  programComment?: string;
  executionState?: 'ACTIVE' | 'READY' | 'ALARM' | 'OFFLINE' | 'UNAVAILABLE';
  spindleLoad: number;
  spindleSpeed?: number;
  feedOverride: number;
  currentTool?: number;
  partsCount: number;
  targetCount: number;
  cycleTimeSec?: number;
  totalPowerOnTime: number;
  totalOperatingTime: number;
  totalCuttingTime: number;
  alarmCode?: number;
  alarmMessage?: string;
  activePower?: number;
}

export interface ToolStatistic {
  programNumber: string;
  toolNumber: number;
  averageLoad: number;
  maxRecordedLoad: number;
  sampleCount: number;
  learningThreshold?: number;
  warningThresholdPercent: number;
  status: 'LEARNING' | 'OK' | 'WARNING' | 'EXPIRED';
  monitoringMode: 'LOAD';
  maxCycles: number;
  currentCycles: number;
  enabled: boolean;
  showLoadAlertOnDashboard: boolean;
  showLifeAlertOnDashboard: boolean;
}

export interface ActiveJob {
    articleId: string;
    articleName: string;
    articleCode: string;
    setupId: string;
    setupName: string;
    startTime: string;
    operator: string;
}

export interface Machine {
  id: string;
  name: string;
  machineNumber: string;
  type: AssetType;
  tankCapacity?: number;
  image: any;
  status: 'RUNNING' | 'MAINTENANCE' | 'ERROR' | 'OFFLINE';
  liveStats?: FocasLiveStats;
  updatedAt?: number;
  isArchived?: boolean;
  lastRemoteUpdate?: number;
  scheduleId?: string;
  schedule?: string;
  maintenanceInterval?: MaintenanceInterval | null;
  customMaintenanceInterval?: number;
  lastMaintenanceDate?: string;
  coolantTarget?: number;
  coolantMinLimit?: number;
  coolantMaxLimit?: number;
  protocol?: MachineProtocol;
  fanucType?: FanucControlType;
  focasIp?: string;
  focasPort?: number;
  mtConnectUrl?: string;
  mtConnectConfig?: any;
  showInDashboard?: boolean;
  showInAndon?: boolean;
  andonConfig?: any;
  toolStats?: ToolStatistic[];
  documents?: UploadedDocument[];
  targetPartsPerHour?: number;
  sessionPartsCount?: number;
  checklist?: ChecklistItem[];
  setupTemplateId?: string;
  activeJob?: ActiveJob | null;
}