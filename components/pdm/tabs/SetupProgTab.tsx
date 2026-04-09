import React, { useRef, useState, useEffect } from 'react';
import { FileText, Archive, ShieldAlert } from '../../../icons';
import { ArticleFile, FileRole, SetupVariant, SetupChangeEntry, SetupStatus, DMSDocument } from '../../../types';
import { generateId } from '../../../services/db/core';
import { ImageProcessor } from '../../../services/db/imageProcessor';
import { documentService } from '../../../services/db/documentService';
import { SleekDocumentList } from '../ui/SleekDocumentList';
import { KEYS } from '../../../services/db/core';
import { DocumentLibraryModal } from '../modals/DocumentLibraryModal';
import { DocumentRenameModal } from '../modals/DocumentRenameModal';
import { DocumentVersionSequenceModal } from '../modals/DocumentVersionSequenceModal';
import { useNotifications } from '../../../contexts/NotificationContext';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { downloadFile } from '../../../utils/fileUtils';
import { useDocumentCategories } from '../../../hooks/useDocumentCategories';
import { useProgModals } from '../../../hooks/useProgModals';

// Sub-components
import { CAMProjectCard } from './CAMProjectCard';
import { NCProgramCard } from './NCProgramCard';
import { ReasonModal, CancelConfirmModal, VersionHistoryModal } from './SetupProgModals';

interface SetupProgTabProps {
    articleId?: string;
    setup: SetupVariant;
    allFiles: ArticleFile[];
    isLocked: boolean;
    user: any;
    onUpdateFiles: (files: ArticleFile[], customLogMessage?: string) => void;
    onPreview: (file: ArticleFile) => void;
    onUpdateSetup?: (updates: Partial<SetupVariant>) => void;
}

export const SetupProgTab: React.FC<SetupProgTabProps> = ({
    articleId, setup, allFiles, isLocked, user, onUpdateFiles, onPreview, onUpdateSetup
}) => {
    const { addNotification } = useNotifications();
    const confirm = useConfirm();
    const camInputRef = useRef<HTMLInputElement>(null);
    const ncInputRef = useRef<HTMLInputElement>(null);

    // F-03: Alle modal-state gecentraliseerd in hook
    const modals = useProgModals();

    // D-05 FIX: Gecentraliseerde hook vervangt lokale categories state + useEffect
    const { categories } = useDocumentCategories({ applicableTo: 'SETUP' });

    // --- DERIVED STATE ---
    const setupFiles = allFiles.filter(f => f.setupId === setup.id);
    const camFile = setupFiles.find(f => f.fileRole === 'CAM');
    const ncFile = setupFiles.find(f => f.fileRole === 'NC');
    const docFiles = setupFiles.filter(f => f.fileRole !== 'CAM' && f.fileRole !== 'NC');

    const isArchived = setup.status === SetupStatus.ARCHIVED;
    const isReleased = setup.status === SetupStatus.RELEASED;
    const isCheckoutByMe = camFile?.lockedBy === user?.name;
    const isLockedByOthers = !!camFile?.lockedBy && camFile?.lockedBy !== user?.name;

    // --- BUSINESS LOGIC ---

    const handleDocFiles = async (fileList: FileList | File[], role: string) => {
        if (!fileList || isLocked) return;

        const newFilesList: ArticleFile[] = [...allFiles];

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const reader = new FileReader();

            const filePromise = new Promise<ArticleFile | null>((resolve) => {
                reader.onload = async () => {
                    try {
                        let result = reader.result as string;

                        if (file.type.startsWith('image/')) {
                            try {
                                result = await ImageProcessor.compress(result);
                            } catch (e) { console.warn('Compression failed', e); }
                        }

                        const doc = await documentService.addDocumentFromBase64(file.name, file.type, result, file.size);

                        resolve({
                            id: generateId(),
                            documentId: doc.id,
                            setupId: setup.id,
                            name: file.name,
                            type: file.type,
                            uploadedBy: user?.name || 'Onbekend',
                            uploadDate: new Date().toISOString(),
                            fileRole: role,
                            version: 1
                        });
                    } catch (e) {
                        console.error('Error processing doc file', e);
                        resolve(null);
                    }
                };
                reader.onerror = () => { resolve(null); };
                reader.readAsDataURL(file);
            });

            const processedFile = await filePromise;
            if (processedFile) newFilesList.push(processedFile);
        }

        onUpdateFiles(newFilesList, `${fileList.length} Setup document(en) toegevoegd aan Setup '${setup.name}'.`);
    };

    const handleDeleteDoc = async (fileId: string) => {
        if (isLocked) return;
        const ok = await confirm({ title: 'Bestand verwijderen', message: 'Bestand definitief verwijderen?' });
        if (ok) {
            onUpdateFiles(allFiles.filter(f => f.id !== fileId), `Setup document verwijderd uit Setup '${setup.name}'.`);
        }
    };

    const processUpload = async (file: File, role: FileRole, reason?: string) => {
        const reader = new FileReader();
        reader.onload = async () => {
            const content = reader.result as string;

            try {
                const doc = await documentService.addDocumentFromBase64(file.name, file.type, content, file.size);

                const existingIdx = allFiles.findIndex(f => f.setupId === setup.id && f.fileRole === role);
                const existingFile = existingIdx !== -1 ? allFiles[existingIdx] : null;

                const newFile: ArticleFile = {
                    id: existingFile ? existingFile.id : generateId(),
                    documentId: doc.id,
                    previousVersions: [
                        ...(existingFile?.previousVersions || []),
                        ...(existingFile?.documentId ? [existingFile.documentId] : [])
                    ],
                    setupId: setup.id,
                    name: file.name,
                    type: file.type,
                    uploadedBy: user?.name || 'Onbekend',
                    uploadDate: new Date().toISOString(),
                    fileRole: role,
                    version: existingFile ? (existingFile.version || 1) + 1 : 1,
                    lockedBy: undefined,
                    lockedAt: undefined
                };

                let updatedList;
                if (existingIdx !== -1) {
                    updatedList = [...allFiles];
                    updatedList[existingIdx] = newFile;
                } else {
                    updatedList = [...allFiles, newFile];
                }
                onUpdateFiles(updatedList, `Nieuwe versie van ${role} toegevoegd aan Setup '${setup.name}'.`);

                if (reason && onUpdateSetup) {
                    const changeEntry: SetupChangeEntry = {
                        id: generateId(),
                        date: new Date().toISOString(),
                        user: user?.name || 'Unknown',
                        type: role === FileRole.NC ? 'NC' : 'CAM',
                        description: `Nieuwe versie upload: ${file.name}`,
                        reason: reason
                    };

                    const newRev = (setup.revision || 0) + 1;
                    onUpdateSetup({
                        changeLog: [changeEntry, ...(setup.changeLog || [])],
                        revision: newRev
                    });
                }
            } catch (err) {
                console.error("Fout bij opslaan document", err);
                addNotification('ERROR', 'Fout', "Er ging iets mis bij het opslaan van het document.");
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, role: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        if (isReleased && role === 'NC') {
            modals.openReasonModal(file, role as FileRole);
        } else {
            if (isLocked && role === 'CAM' && !camFile?.lockedBy) return;
            modals.openRename(file, role as FileRole);
        }
    };

    const confirmReason = () => {
        if (!modals.pendingFile || !modals.changeReason.trim()) return;
        modals.openRename(modals.pendingFile.file, modals.pendingFile.role, modals.changeReason);
        modals.closeReasonModal();
    };

    const handleSelectLibraryDoc = async (doc: DMSDocument) => {
        if (!modals.libraryTargetRole) return;
        try {
            const existingIdx = allFiles.findIndex(f => f.setupId === setup.id && f.fileRole === modals.libraryTargetRole);
            const existingFile = existingIdx !== -1 ? allFiles[existingIdx] : null;

            const newFile: ArticleFile = {
                id: existingFile ? existingFile.id : generateId(),
                documentId: doc.id,
                previousVersions: [
                    ...(existingFile?.previousVersions || []),
                    ...(existingFile?.documentId ? [existingFile.documentId] : [])
                ],
                setupId: setup.id,
                name: doc.name,
                type: doc.type,
                uploadedBy: user?.name || 'Onbekend',
                uploadDate: new Date().toISOString(),
                fileRole: modals.libraryTargetRole,
                version: existingFile ? (existingFile.version || 1) + 1 : 1,
                lockedBy: undefined,
                lockedAt: undefined
            };

            let updatedList;
            if (existingIdx !== -1) {
                updatedList = [...allFiles];
                updatedList[existingIdx] = newFile;
            } else {
                updatedList = [...allFiles, newFile];
            }
            onUpdateFiles(updatedList, `Bibliotheek document '${doc.name}' (${modals.libraryTargetRole}) gekoppeld aan Setup '${setup.name}'.`);

            if (onUpdateSetup) {
                const changeEntry: SetupChangeEntry = {
                    id: generateId(),
                    date: new Date().toISOString(),
                    user: user?.name || 'Unknown',
                    type: modals.libraryTargetRole === 'NC' ? 'NC' : 'CAM',
                    description: `Bibliotheek document gekoppeld: ${doc.name}`,
                    reason: ''
                };
                onUpdateSetup({
                    changeLog: [changeEntry, ...(setup.changeLog || [])],
                    revision: (setup.revision || 0) + 1
                });
            }
            modals.closeLibrary();
        } catch (e) {
            console.error("Error linking library document to setup", e);
        }
    };

    const handleCheckOut = async () => {
        if (!camFile || isLocked || camFile.lockedBy) return;
        const updatedFiles = allFiles.map(f => f.id === camFile.id ? {
            ...f,
            lockedBy: user?.name || 'Onbekend',
            lockedAt: new Date().toISOString()
        } : f);
        onUpdateFiles(updatedFiles, `Bestand bewerking (Check-Out) gestart voor Setup '${setup.name}'.`);
        await downloadFile(camFile);
    };

    const confirmCancelLock = () => {
        if (!camFile) return;
        onUpdateFiles(allFiles.map(f => f.id === camFile.id ? { ...f, lockedBy: undefined, lockedAt: undefined } : f), `Bewerking geannuleerd (Check-In) voor Setup '${setup.name}'.`);
        modals.setShowCancelConfirmModal(false);
    };

    const openHistory = async (file: ArticleFile) => {
        await modals.openVersionHistory(file);
    };

    // --- RENDER ---

    return (
        <div className="space-y-8 animate-in fade-in duration-300 text-left">
            {isArchived && (
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <Archive className="text-slate-400" size={24} />
                    <div className="text-sm text-slate-500 font-bold">
                        Gearchiveerde bestanden. Alleen lezen modus.
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <CAMProjectCard
                    camFile={camFile}
                    isLocked={isLocked}
                    isArchived={isArchived}
                    isCheckoutByMe={isCheckoutByMe}
                    isLockedByOthers={isLockedByOthers}
                    onUploadClick={() => camInputRef.current?.click()}
                    onLibraryClick={() => modals.openLibrary('CAM')}
                    onCheckOut={handleCheckOut}
                    onCancelLock={() => modals.setShowCancelConfirmModal(true)}
                    onCheckIn={() => camInputRef.current?.click()}
                    onViewHistory={openHistory}
                    onDownload={downloadFile}
                />

                <NCProgramCard
                    ncFile={ncFile}
                    isLocked={isLocked}
                    isArchived={isArchived}
                    onUploadClick={() => ncInputRef.current?.click()}
                    onLibraryClick={() => modals.openLibrary('NC')}
                    onPreview={onPreview}
                    onViewHistory={openHistory}
                    onDownload={downloadFile}
                />
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <SleekDocumentList
                    title={<><FileText size={20} className="text-blue-600" /> Overige Setup Documentatie</>}
                    subtitle="Opspanschetsen, meetrapporten, etc."
                    files={docFiles}
                    applicableTo="SETUP"
                    parentRecordId={articleId}
                    tableKey={KEYS.ARTICLES}
                    excludedCategories={['CAM', 'NC']}
                    defaultCategoryCode="OTHER"
                    isLocked={isLocked || isArchived}
                    onUpload={handleDocFiles}
                    onDelete={handleDeleteDoc}
                    onPreview={onPreview}
                    onDownload={downloadFile}
                    onLinkDocument={handleSelectLibraryDoc}
                />
            </div>

            {isReleased && (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-900/50 flex items-start gap-4 shadow-inner">
                    <ShieldAlert className="text-blue-500 shrink-0 mt-1" size={24} />
                    <div className="text-sm">
                        <h5 className="font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest mb-1">Productie Veiligheid</h5>
                        <p className="text-blue-700 dark:text-blue-400 leading-relaxed font-medium">
                            Wijzigingen aan NC programma's op <strong>Vrijgegeven (RELEASED)</strong> artikelen worden geregistreerd als Proces Revisie. Dit verhoogt de setup-versie zonder de engineering revisie van het artikel aan te passen.
                        </p>
                    </div>
                </div>
            )}

            {/* Hidden Inputs */}
            <input type="file" ref={camInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'CAM')} />
            <input type="file" ref={ncInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'NC')} />

            {/* Modals */}
            <ReasonModal
                isOpen={modals.showReasonModal}
                reason={modals.changeReason}
                onReasonChange={modals.setChangeReason}
                onConfirm={confirmReason}
                onCancel={modals.closeReasonModal}
            />

            <CancelConfirmModal
                isOpen={modals.showCancelConfirmModal}
                onConfirm={confirmCancelLock}
                onCancel={() => modals.setShowCancelConfirmModal(false)}
            />

            <VersionHistoryModal
                isOpen={modals.showHistoryModal}
                file={modals.historyFile}
                docs={modals.historyDocs}
                onClose={modals.closeVersionHistory}
            />

            {modals.showLibraryModal && (
                <DocumentLibraryModal
                    onClose={modals.closeLibrary}
                    onSelect={handleSelectLibraryDoc}
                />
            )}

            {modals.pendingRenameFile && (
                <DocumentRenameModal
                    files={[modals.pendingRenameFile.file]}
                    role={modals.pendingRenameFile.role}
                    onClose={modals.closeRename}
                    onConfirm={(renamedFiles) => {
                        processUpload(renamedFiles[0], modals.pendingRenameFile!.role, modals.pendingRenameFile!.reason);
                        modals.closeRename();
                    }}
                />
            )}

            {modals.historyFile && (
                <DocumentVersionSequenceModal
                    file={modals.historyFile}
                    isOpen={!!modals.historyFile}
                    onClose={() => modals.closeVersionHistory()}
                    parentRecordId={setup.id}
                />
            )}
        </div>
    );
};

