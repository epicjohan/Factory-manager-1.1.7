export type QmsFrameworkType = 'ISO_NORM' | 'CUSTOMER_AUDIT' | 'SAFETY_VCA' | 'OTHER';

export interface QmsFramework {
  id: string;
  name: string;
  type: QmsFrameworkType;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  certifier?: string;
  updated?: string;
}

export interface FolderNote {
  id: string;
  text: string;
  createdBy: string;
  createdAt: string;
}

export interface FolderTodo {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  doneBy?: string;
  doneAt?: string;
  comments?: string;
  createdAt: string;
}

export interface QmsFolder {
  id: string;
  frameworkId: string;
  year: number;
  name: string;
  documents: string[]; // JSON array of documentIds
  notes?: FolderNote[];
  todos?: FolderTodo[];
  order?: number;
  updated?: string;
}

export interface QmsAudit {
  id: string;
  frameworkId: string;
  date: string;
  type: 'INTERNAL' | 'EXTERNAL' | 'CUSTOMER';
  auditorName?: string;
  result: 'PLANNED' | 'PASSED' | 'WARNINGS' | 'FAILED';
  notes?: string;
  reportDocumentId?: string;
  updated?: string;
}
