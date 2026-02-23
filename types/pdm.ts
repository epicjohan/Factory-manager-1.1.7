
import { AssetType, UploadedDocument } from './common';

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PROTOTYPE = 'PROTOTYPE',
  RELEASED = 'RELEASED',
  OBSOLETE = 'OBSOLETE'
}

export enum FileRole {
  DRAWING = 'DRAWING',     // Technische Tekening (PDF) - BRON
  MODEL = 'MODEL',         // 3D Model (STEP) - BRON
  CAM = 'CAM',             // CAM Project / Programma - PRODUCTIE
  NC = 'NC',               // G-Code / NC Bestand - PRODUCTIE
  OTHER = 'OTHER'          // Overig
}

export interface DocumentCategory {
  id: string;
  name: string;
  code: string;        // E.g. "CERTIFICATE", "DRAWING", "SPECIFICATION"
  icon?: string;       // E.g. "FileText", "Receipt", "Certificate"
  color?: string;      // E.g. "blue", "green", "purple"
  isSystem: boolean;   // If true, cannot be deleted (e.g. DRAWING, MODEL, CAM, NC)
  applicableTo: 'ARTICLE' | 'SETUP' | 'BOTH';
  order?: number;
}

export interface ArticleStep {
  id: string;
  order: number;
  description: string;
  required: boolean;
}

export interface ArticleFile extends UploadedDocument {
  id: string;
  uploadedBy: string;
  uploadDate: string;
  fileRole: FileRole | string; // Can be a custom DocumentCategory code
  version: number;
  setupId?: string;        // Koppeling aan specifieke machine-setup
  lockedBy?: string;       // Alleen voor PRODUCTIE bestanden
  lockedAt?: string;
}

export interface ArticleFixture {
  type: string;
  origin: string;
  clampingForce: string;
  overhang: string;
  instructions: string;
  images: ArticleFile[];
}

export type SetupFieldType = 'text' | 'number' | 'boolean' | 'textarea' | 'select' | 'header';

export interface SetupFieldDefinition {
  key: string;
  label: string;
  type: SetupFieldType;
  required?: boolean;
  highlightFilled?: boolean; // Highlight field (Orange) when value is present (Safety/Poka Yoke)
  colSpan?: number; // 1 to 12. Defines width in a grid system. Default 6 (Half).
  options?: string[];
  unit?: string;
  defaultValue?: any;
}

export interface SetupTemplate {
  id: string;
  name: string;
  description?: string;
  assetType: AssetType;
  fields: SetupFieldDefinition[];
  toolFields?: SetupFieldDefinition[];
  isDefault?: boolean;
  updated?: string;
}

export enum SetupStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  RELEASED = 'RELEASED',
  ARCHIVED = 'ARCHIVED'
}

export enum SetupVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED'
}

export interface SetupChangeEntry {
  id: string;
  date: string;
  user: string;
  type: 'NC' | 'CAM' | 'TOOL' | 'PARAM' | 'OTHER' | 'VERSION';
  description: string;
  reason: string;
}

export interface SetupVariant {
  id: string;
  name: string;
  machineId: string;
  setupTemplateId?: string;
  status: SetupStatus;
  isDefault?: boolean; // NEW: Indicates if this is the primary route

  // Proces Revisie Data
  version: number; // 1, 2, 3...

  revision?: number; // Legacy field, keeping for compatibility if needed, but prefer 'version'
  changeLog?: SetupChangeEntry[]; // Audit trail specifiek voor deze setup

  verificationStatus?: SetupVerificationStatus;
  verifiedBy?: string;
  verifiedDate?: string;
  setupTimeMinutes: number;
  cycleTimeMinutes: number;
  steps: ArticleStep[];
  tools: ArticleTool[];
  fixture?: ArticleFixture;
  templateData?: Record<string, any>;
  frozenFields?: SetupFieldDefinition[];
  frozenToolFields?: SetupFieldDefinition[];
}

export interface ArticleOperation {
  id: string;
  order: number;
  description: string;
  mkgOperationCode?: string;
  setups: SetupVariant[];
}

export interface ArticleBOMItem {
  id: string;
  childArticleId: string;
  childArticleName?: string;
  childArticleCode?: string;
  position: string;
  quantity: number;
}

export interface ArticleAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
}

export interface Article {
  id: string;
  articleCode: string;
  drawingNumber: string;
  drawingRevision?: string;
  posNumber?: string;
  revision: string;
  previousRevisionId?: string;
  changeReason?: string;
  isLocked?: boolean;
  name: string;
  description2?: string;
  customer?: string;
  material?: string;
  description?: string;
  status: ArticleStatus;
  operations: ArticleOperation[];
  bomItems: ArticleBOMItem[];
  files: ArticleFile[]; // This holds Metadata + Base64 locally, but only Metadata remotely (in filesMeta field)
  auditTrail?: ArticleAuditEntry[];
  created: string;
  createdBy: string;
  updated: string;
  updatedBy: string;
}

export type OperationType = 'MACHINING' | 'PROCESS';

export interface PredefinedOperation {
  id: string;
  code: string;
  name: string;
  category?: string;
  operationType?: OperationType;
  setupTemplateId?: string;
  defaultMachineId?: string;
  defaultMachineType?: AssetType;
  updated?: string;
  created?: string;
}

export interface ArticleTool {
  id: string;
  order: number;
  description: string;
  matrixCode?: string;
  assemblyCode?: string;
  cuttingLength?: string;
  overhangLength?: string;
  holder?: string;
  clearance?: string;
  internalCooling?: boolean;
  lifeTime: string;
  toolData?: Record<string, any>;
  files?: ArticleFile[]; // Attached documents/images for the tool

  status?: 'ACTIVE' | 'REPLACED'; // NEW: Track lifecycle

  // Tool Swap History
  replacedToolId?: string; // ID van de tool die deze vervangen heeft
  changeReason?: string;   // Waarom is deze tool toegevoegd/gewijzigd?
  dateChanged?: string;
}
