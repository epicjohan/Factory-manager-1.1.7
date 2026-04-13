
import React, { useState, useMemo, useEffect } from 'react';
import {
  Machine,
  UploadedDocument,
  Permission
} from '../../types';
import { db } from '../../services/storage';
import { useAuth } from '../../contexts/AuthContext';
import { SyncService } from '../../services/sync';
import { KEYS } from '../../services/db/core';
import {
  FileText,
  Download,
  Upload,
  Search,
  FileSearch,
  Trash2,
  AlertTriangle,
  FolderOpen
} from '../../icons';
import { SleekDocumentList } from '../pdm/ui/SleekDocumentList';
import { documentService } from '../../services/db/documentService';
import { generateId } from '../../services/db/core';
import { DMSDocument, ArticleFile } from '../../types';

interface DocsSectionProps {
  machine: Machine;
}

export const DocsSection: React.FC<DocsSectionProps> = ({ machine }) => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [serverUrl, setServerUrl] = useState<string | undefined>(undefined);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  } | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const config = await db.getServerSettings();
      setServerUrl(config.url);
    };
    loadSettings();
  }, []);

  const filteredDocs = useMemo(() => {
    const docs = machine.documents || [];
    if (!searchTerm) return docs;
    const lowerSearch = searchTerm.toLowerCase();
    return docs.filter(d => d.name.toLowerCase().includes(lowerSearch) || (d.category || '').toLowerCase().includes(lowerSearch));
  }, [machine.documents, searchTerm]);

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && machine && !machine.isArchived) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newDoc: UploadedDocument = { name: file.name, type: file.type, url: reader.result as string, category: 'Handmatig geüpload' };
        const updatedMachine = { ...machine, documents: [...(machine.documents || []), newDoc] };
        db.updateMachine(updatedMachine);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteDoc = (index: number) => {
    const docToDelete = machine.documents ? machine.documents[index] : null;
    if (!docToDelete) return;

    setConfirmModal({
      isOpen: true,
      title: "Document Verwijderen",
      message: `Weet u zeker dat u "${docToDelete.name}" wilt verwijderen?`,
      action: () => {
        const updatedDocs = (machine.documents || []).filter((_, i) => i !== index);
        const updatedMachine = { ...machine, documents: updatedDocs };
        db.updateMachine(updatedMachine);
      }
    });
  };

  const canManage = hasPermission(Permission.MANAGE_MACHINES);

  // Map existing UploadedDocuments to ArticleFile interface expected by SleekDocumentList
  const mappedFiles: ArticleFile[] = useMemo(() => {
    return (machine.documents || []).map((doc, idx) => ({
      id: `doc-${idx}`, // Temporary ID for list operations
      documentId: doc.documentId || '',
      name: doc.name,
      type: doc.type,
      url: doc.url, // Legacy base64 support
      uploadedBy: 'Gebruiker',
      uploadDate: new Date().toISOString(),
      fileRole: doc.category || 'OTHER',
      version: 1,
    }));
  }, [machine.documents]);

  const handleDocumentUpload = async (files: FileList | File[], role: string) => {
    if (!files || files.length === 0 || !machine || machine.isArchived) return;

    const newDocs: UploadedDocument[] = [...(machine.documents || [])];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      const docPromise = new Promise<UploadedDocument | null>((resolve) => {
        reader.onload = async () => {
          try {
            const result = reader.result as string;
            // Use Relational DMS instead of raw Base64 injection
            const doc = await documentService.addDocumentFromBase64(file.name, file.type, result, file.size);

            resolve({
              name: file.name,
              type: file.type,
              url: '', // Clean architecture
              documentId: doc.id,
              category: role
            });
          } catch (e) {
            console.error('Error processing file:', e);
            resolve(null);
          }
        };
        reader.onerror = () => {
          console.error('Error reading file:', reader.error);
          resolve(null);
        };
        reader.readAsDataURL(file);
      });

      const processedDoc = await docPromise;
      if (processedDoc) {
        newDocs.push(processedDoc);
      }
    }

    db.updateMachine({ ...machine, documents: newDocs });
  };

  const handleDocumentDelete = (fakeId: string) => {
    const idxStr = fakeId.replace('doc-', '');
    const idx = parseInt(idxStr, 10);
    if (isNaN(idx)) return;
    handleDeleteDoc(idx);
  };

  const handleDocumentPreview = (file: ArticleFile) => {
    // SleekDocumentList has built-in thumbnail / we need to handle preview? Wait, actually we can just open it.
    const url = SyncService.resolveFileUrl(machine.id, file.url, KEYS.MACHINES, serverUrl);
    if (url) window.open(url, '_blank');
  };

  const handleDocumentDownload = (file: ArticleFile) => {
    const url = SyncService.resolveFileUrl(machine.id, file.url, KEYS.MACHINES, serverUrl);
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLinkDocument = (doc: DMSDocument, role: string) => {
    if (!machine || machine.isArchived) return;
    const newDocs: UploadedDocument[] = [...(machine.documents || [])];
    newDocs.push({
      name: doc.name,
      type: doc.type,
      url: '',
      documentId: doc.id,
      category: role
    });
    db.updateMachine({ ...machine, documents: newDocs });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <SleekDocumentList
        title={<><FolderOpen size={18} /> Machine Documenten</>}
        subtitle="Handleidingen, Certificaten, Schema's"
        files={mappedFiles}
        applicableTo="MACHINE"
        parentRecordId={machine.id}
        tableKey={KEYS.MACHINES}
        defaultCategoryCode="OTHER"
        isLocked={machine.isArchived || !canManage}
        onUpload={handleDocumentUpload}
        onDelete={handleDocumentDelete}
        onPreview={handleDocumentPreview}
        onDownload={handleDocumentDownload}
        onLinkDocument={handleLinkDocument}
      />

      {/* CONFIRM MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-red-600/50 w-full max-w-lg rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 bg-red-600/20 w-40 h-40 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col items-center text-center space-y-6 relative z-10">
              <div className="p-5 bg-red-600/20 rounded-full border border-red-500/30">
                <AlertTriangle size={40} className="text-red-500" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight mb-2">{confirmModal.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">{confirmModal.message}</p>
              </div>

              <div className="flex gap-4 w-full pt-4">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-2xl font-bold uppercase text-xs tracking-widest transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => { confirmModal.action(); setConfirmModal(null); }}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-900/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
