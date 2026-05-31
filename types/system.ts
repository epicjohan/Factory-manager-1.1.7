
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
  plnc_tijd: number;            // Onbemande machinetijd in SECONDEN
  plnc_tijd_min: number;        // Berekend: plnc_tijd / 60 (onbemand, minuten)
  plnc_tijd_bemand: number;     // Bemande tijd in SECONDEN (bijv. 25200 = 7 uur)
  plnc_tijd_bemand_min: number; // Berekend: plnc_tijd_bemand / 60 (bemand, minuten)
  plnc_forecast: boolean;       // Is forecast-record
  syncedAt: string;             // Tijdstip van laatste sync
}

export interface MkgPlnbRecord {
  id: string;                      // RowKey uit MKG
  admi_num: number;                // Administratie
  rsrc_num: number;                // Resource/Machine ID
  prdh_num: string;                // Productieorder nummer
  prdr_num: number;                // Halffabricaat
  bwrk_num: number;                // Bewerkingsnummer
  plnb_num: number;                // Bewerking planning nummer
  plnb_oms: string;                // Omschrijving bewerking

  // Planning datums & tijden
  plnb_dat_start: string;          // Startdatum (bijv. "2026-06-02")
  plnb_dat_eind: string;           // Einddatum
  plnb_wk_start: number;           // Week start
  plnb_wk_eind: number;            // Week eind
  plnb_tijd_start: number;         // Starttijd (seconden vanaf middernacht)
  plnb_tijd_eind: number;          // Eindtijd

  // Duur
  plnb_duur: number;               // Duur in seconden
  plnb_duur_min: number;           // Berekend: duur in minuten
  plnb_instel_tijd: number;        // Insteltijd seconden
  plnb_instel_min: number;         // Berekend: insteltijd minuten

  // Tijd per stuk
  plnb_tijd_per_stuk: number;      // Actuele tijd per stuk (sec)
  plnb_plan_tijd_per_stuk: number; // Geplande tijd per stuk (sec)

  // Aantallen & voortgang
  plnb_aantal: number;             // Te produceren aantal
  plnb_aantal_grd: number;         // Aantal gereed
  plnb_start_aantal: number;       // Start aantal
  plnb_gestart: boolean;           // Is gestart?
  plnb_gereed: boolean;            // Is gereed?
  plnb_forecast: boolean;          // Is forecast?

  // Type bewerking
  plnb_onbemand: boolean;          // Onbemande bewerking?
  plnb_vast: boolean;              // Vastgezette planning?
  plnb_uitbesteden: boolean;       // Uitbesteed?
  cred_num: string;                // Crediteur (bij uitbesteding)

  // Extra info
  plnb_tijd_besteed: number;       // Reeds bestede tijd (sec)
  plnb_tijd_besteed_min: number;   // Berekend: bestede tijd minuten
  plnb_prod_fase: number;          // Productie fase
  plnb_memo: string;               // Memo/notities
  plnb_volgorde: number;           // Volgorde

  // Artikelgegevens (berekende velden uit MKG)
  arti_code: string;               // Artikelcode
  arti_oms1: string;               // Omschrijving 1
  arti_tek_num: string;            // Tekening nummer

  // Meta
  syncedAt: string;                // Laatste sync tijdstip
}

// ── MKG Stuklijst (BOM) types ──────────────────────────────────────────

/** Stuklijst regel (halffabricaat) */
export interface MkgStlrRecord {
  stlh_num: string;              // Stuklijst header nummer
  stlr_num: number;              // Halffabricaat nummer (1 = eindproduct)
  arti_code: string;             // Artikelcode
  stlr_oms_1: string;            // Omschrijving 1
  stlr_oms_2: string;            // Omschrijving 2
  stlr_oms_3: string;            // Omschrijving 3
  stlr_parent: number;           // Parent regel (0 = root)
  stlr_pos: string;              // Positie
  stlr_aantal: number;           // Aantal
  stlr_tekening: string;         // Tekening
  stlr_revisie: string;          // Revisie
  stlr_volgorde: number;         // Volgorde
  eenh_code: string;             // Eenheid
  // Sub-collecties (gevuld door proxy)
  bewerkingen?: MkgStlbRecord[];
  materialen?: MkgStlmRecord[];
}

/** Stuklijst bewerking */
export interface MkgStlbRecord {
  stlb_num: number;              // Bewerkingsnummer
  stlb_oms: string;              // Omschrijving bewerking
  stlb_volgorde: number;         // Volgorde
  rsrc_num: number;              // Resource/Machine ID
  bwrk_num: number;              // Bewerkingscode
  stlb_instel_tijd: number;      // Insteltijd (seconden)
  stlb_tijd_per_stuk: number;    // Bewerkingstijd per stuk (seconden)
  stlb_tijd_mach: number;        // Machinetijd (seconden)
  stlb_tijd_man: number;         // Mantijd (seconden)
  stlb_uitbesteden: boolean;     // Uitbesteden?
  stlb_onbemand: boolean;        // Onbemand?
  stlb_man_per_machine: number;  // Man per machine
}

/** Stuklijst materiaal */
export interface MkgStlmRecord {
  stlm_num: number;              // Materiaalnummer
  arti_code: string;             // Artikelcode materiaal
  stlm_oms_1: string;            // Omschrijving 1
  stlm_oms_2: string;            // Omschrijving 2
  stlm_aantal: number;           // Aantal
  stlm_eenh: string;             // Eenheid
}

/** Gecombineerde BOM data (proxy response) */
export interface MkgBomData {
  article: {
    arti_code: string;
    arti_oms_1: string;
    arti_oms_2: string;
    arti_tekening: string;
    arti_stlh_num: string;
  };
  stlrData: MkgStlrRecord[];
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
