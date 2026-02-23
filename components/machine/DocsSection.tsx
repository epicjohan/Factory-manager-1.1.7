
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
  X,
  FileSearch,
  Trash2,
  AlertTriangle
} from '../../icons';

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" size={18} />
          <input type="text" placeholder="Zoek in documenten..." className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && ( <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"> <X size={16} /> </button> )}
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full whitespace-nowrap">
          {filteredDocs.length} {filteredDocs.length === 1 ? 'bestand' : 'bestanden'}
        </div>
      </div>

      {!machine.isArchived && canManage && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group shadow-inner">
          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleDocUpload} accept=".pdf,.doc,.docx,.jpg,.png" />
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-500 mb-4 group-hover:scale-110 transition-transform shadow-sm"> <Upload size={32} /> </div>
          <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Nieuw document toevoegen</span>
          <span className="text-xs text-slate-400 mt-1 font-medium italic">Sleep bestand hierheen of klik om te bladeren</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc, idx) => {
          const fileUrl = SyncService.resolveFileUrl(machine.id, doc.url, KEYS.MACHINES, serverUrl);
          // Ophalen van de originele index in de bron-array voor veilige verwijdering
          const originalIndex = (machine.documents || []).indexOf(doc);
          
          return (
            <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:shadow-lg hover:border-blue-500 transition-all overflow-hidden h-[84px]">
              <div className="flex items-center gap-4 overflow-hidden flex-1 min-w-0 pr-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400 group-hover:text-blue-50 transition-colors shrink-0"> <FileText size={24} /> </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight" title={doc.name}> {doc.name} </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1"> {doc.category || 'Handleiding / Docs'} </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {fileUrl && (
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all border border-slate-100 dark:border-slate-700 shadow-sm" title="Bestand downloaden" onClick={(e) => e.stopPropagation()} > <Download size={20} /> </a>
                )}
                {!machine.isArchived && canManage && originalIndex !== -1 && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteDoc(originalIndex);
                    }}
                    className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all border border-slate-100 dark:border-slate-700 shadow-sm"
                    title="Document verwijderen"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredDocs.length === 0 && (
          <div className="col-span-full py-24 text-center flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
            <FileSearch size={64} className="mb-6 opacity-10" />
            <p className="font-black uppercase tracking-widest">Geen documenten gevonden</p>
          </div>
        )}
      </div>

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
