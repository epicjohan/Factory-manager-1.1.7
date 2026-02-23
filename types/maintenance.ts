
import { UploadedDocument } from './common';

export enum TicketImpact {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  CRITICAL = 'CRITICAL'
}

export enum ScheduleType {
  FULL_24_7 = 'FULL_24_7'
}

export interface MaintenanceAction {
  id: string;
  description: string;
  date: string;
  user: string;
}

export interface UsedPart {
  partId: string;
  name: string;
  articleCode: string;
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  source: 'GENERAL_PART' | 'MACHINE_PART';
}

export interface MaintenanceTicket {
  id: string;
  machineId: string;
  title: string;
  description: string;
  status: 'OPEN' | 'RESOLVED';
  impact: TicketImpact;
  reportedBy: string;
  reportedDate: string;
  actions: MaintenanceAction[];
  usedParts?: UsedPart[];
  repairCost?: number;
  downtimeMinutes?: number;
  resolvedBy?: string;
  resolvedDate?: string;
  resolvedCompany?: string;
  invoice?: UploadedDocument;
  updatedAt?: number;
}

export enum MaintenanceInterval {
  MONTHS_6 = '6_MONTHS',
  MONTHS_12 = '12_MONTHS',
  MONTHS_24 = '24_MONTHS',
  CUSTOM = 'CUSTOM'
}

export interface MaintenanceEvent {
  id: string;
  title: string;
  machineId: string;
  assignedTo: string;
  date: string;
  status: 'PLANNED' | 'COMPLETED';
}

export interface DailyShift {
  day: string;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface WorkSchedule {
  id: string;
  name: string;
  shifts: DailyShift[];
}

// --- SUPPORT & LOGISTICS ---

export enum SupportStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  COMPLETED = 'COMPLETED'
}

export enum SupportType {
  SWARF = 'SWARF',
  EMPTY_BIN = 'EMPTY_BIN',
  BIN_EXCHANGE = 'BIN_EXCHANGE',
  COOLANT = 'COOLANT',
  MATERIAL = 'MATERIAL',
  QUESTION = 'QUESTION'
}

export interface SupportRequest {
  id: string;
  machineId: string;
  type: SupportType;
  status: SupportStatus;
  requestDate: string;
  requester: string;
  message?: string;
  urgency?: 'NORMAL' | 'HIGH';
  location?: string;
  desiredTime?: string;
  targetManager?: string;
  answer?: string;
  acceptedBy?: string;
  completedBy?: string;
  completedDate?: string;
  contentMaterial?: string;
}

// --- LOGS ---

export interface MixingLog {
  id: string;
  machineId: string;
  date: string;
  percentage?: number;
  type: 'MEASUREMENT' | 'EXCHANGE' | 'CLEANING' | 'ADDITIVE';
  // CLEAN-02: 'notes' en 'actionTaken' bestaan lokaal maar zijn NIET aanwezig in de PocketBase
  // 'mixing_logs' collectie. Voeg deze velden toe aan PB of verwijder ze als ze niet meer gebruikt worden.
  notes: string;
  performedBy: string;
  actionTaken?: boolean;
}

export enum ChecklistInterval {
  DAGELIJKS = 'DAGELIJKS',
  WEKELIJKS = 'WEKELIJKS',
  MAANDELIJKS = 'MAANDELIJKS',
  AANGEPAST = 'AANGEPAST'
}

export interface ChecklistItem {
  id: string;
  description: string;
  interval: ChecklistInterval;
  customIntervalText?: string;
  customIntervalDays?: number;
}

export interface ChecklistLog {
  id: string;
  machineId: string;
  checklistItemId: string;
  date: string;
  checkedBy: string;
  status: 'OK' | 'NOK';
}

export enum MistCollectorStage {
  STAGE_0 = 'STAGE_0',
  STAGE_1 = 'STAGE_1',
  HEPA = 'HEPA'
}

export interface MistLog {
  id: string;
  machineId: string;
  date: string;
  stage: MistCollectorStage;
  replacedBy: string;
  remark: string;
  partId?: string;
  cost?: number;
}

export interface AppEfficiencyLog {
  id: string;
  machineId: string;
  date: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  operatingMinutes: number;
  cuttingMinutes: number;
  partsProduced: number;
}

export type EfficiencyLog = AppEfficiencyLog;

// --- INVENTORY ---

export interface MachinePart {
  id: string;
  machineId: string;
  description: string;
  articleCode: string;
  supplier: string;
  price: number;
  stock: number;
  minStock?: number;
  location?: string;
}

export interface GeneralPart {
  id: string;
  description: string;
  articleCode: string;
  supplier: string;
  price: number;
  stock: number;
  minStock?: number;
  location?: string;
}