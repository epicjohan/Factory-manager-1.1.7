
export enum UserRole {
  ADMIN = 'sysadmin0000000',
  MAINTENANCE = 'sysmaint0000000',
  OPERATOR = 'sysoperator0000',
  MANAGER = 'sysmanager00000'
}

export enum Permission {
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_MACHINES = 'MANAGE_MACHINES',
  UPDATE_MACHINE_STATUS = 'UPDATE_MACHINE_STATUS',
  VIEW_FINANCIALS = 'VIEW_FINANCIALS',
  CREATE_TICKET = 'CREATE_TICKET',
  RESOLVE_TICKET = 'RESOLVE_TICKET',
  MANAGE_SCHEDULE = 'MANAGE_SCHEDULE',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  USE_TOOLGUARD = 'USE_TOOLGUARD',
  // Legacy PDM permission
  MANAGE_ARTICLES = 'MANAGE_ARTICLES',

  // Nieuwe Granulaire PDM Rechten
  PDM_VIEW = 'PDM_VIEW',
  PDM_CREATE = 'PDM_CREATE',
  PDM_EDIT_OWN = 'PDM_EDIT_OWN',
  PDM_EDIT_ALL = 'PDM_EDIT_ALL',
  PDM_RELEASE = 'PDM_RELEASE',
  PDM_MANAGE_LOCK = 'PDM_MANAGE_LOCK',
  PDM_ADD_PROCESS = 'PDM_ADD_PROCESS'
}

export enum AssetType {
  CNC = 'CNC',
  ROBOT = 'ROBOT',
  CMM = 'CMM',
  CLIMATE = 'CLIMATE',
  OTHER = 'OTHER',
  PROCESS = 'PROCESS'
}

export enum AppModule {
  DASHBOARD_MAIN = 'DASHBOARD_MAIN',
  EFFICIENCY = 'EFFICIENCY',
  SUPPORT = 'SUPPORT',
  QUESTIONS = 'QUESTIONS',
  ENERGY = 'ENERGY',
  FINANCE = 'FINANCE',
  MACHINES = 'MACHINES',
  ROBOTS = 'ROBOTS',
  CMM = 'CMM',
  CLIMATE = 'CLIMATE',
  PLANNER = 'PLANNER',
  INVENTORY = 'INVENTORY',
  TOOLGUARD = 'TOOLGUARD',
  ARTICLES = 'ARTICLES',
  TOOL_PREP = 'TOOL_PREP',
  COMPLIANCE = 'COMPLIANCE'
}

export enum AssetTab {
  OVERVIEW = 'OVERVIEW',
  JOB = 'JOB',
  LIVE = 'LIVE',
  EFFICIENCY = 'EFFICIENCY',
  CALL = 'CALL',
  CHECKLIST = 'CHECKLIST',
  MAINTENANCE = 'MAINTENANCE',
  COOLANT = 'COOLANT',
  MIST = 'MIST',
  PARTS = 'PARTS',
  DOCS = 'DOCS',
  TOOLS = 'TOOLS'
}

export enum CommercialModule {
  CORE = 'CORE',
  ENERGY = 'ENERGY',
  PLANNER = 'PLANNER',
  INVENTORY = 'INVENTORY',
  ANDON = 'ANDON',
  CONNECTIVITY = 'CONNECTIVITY',
  TOOLGUARD = 'TOOLGUARD',
  PDM = 'PDM'
}

export enum NotificationTrigger {
  NEW_TICKET = 'NEW_TICKET',
  MAINTENANCE_DUE = 'MAINTENANCE_DUE',
  MACHINE_ERROR = 'MACHINE_ERROR',
  LOW_STOCK = 'LOW_STOCK',
  SUPPORT_DONE = 'SUPPORT_DONE'
}

export type LicenseStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'INVALID';
export type SyncAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SyncEntry {
  id: string;
  table: string;
  action: SyncAction;
  data: any;
  timestamp: number;
  error?: string;
  retryCount?: number;
}

export interface UploadedDocument {
  name: string;
  type: string;
  url: string;
  documentId?: string; // Optioneel voor backwards compatibility, verwijst naar fm_table_documents
  category?: string;
}
