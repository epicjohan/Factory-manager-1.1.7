import React, { useRef, useState, useEffect } from 'react';
import {
    FileCode, Download, Upload, CheckCircle2, Lock, FileText, Trash2, File, Box, Terminal,
    X, AlertTriangle, UserCircle, Cpu, ShieldAlert, History as ClockCounterClockwise, Eye, CornerUpRight,
    Archive, Image, Camera, Hammer, Table, ClipboardList, Ruler, BarChart
} from '../../../icons';
import { ArticleFile, FileRole, SetupVariant, SetupChangeEntry, SetupStatus, DocumentCategory, DMSDocument } from '../../../types';
import { generateId } from '../../../services/db/core';
import { ImageProcessor } from '../../../services/db/imageProcessor';
import { db } from '../../../services/storage';
import { documentService } from '../../../services/db/documentService';
import { SleekDocumentList } from '../ui/SleekDocumentList';
import { DocumentLibraryModal } from '../modals/DocumentLibraryModal';
import { DocumentRenameModal } from '../modals/DocumentRenameModal';
import { DocumentVersionSequenceModal } from '../modals/DocumentVersionSequenceModal';

interface SetupProgTabProps {
    setup: SetupVariant;
    allFiles: ArticleFile[];
    isLocked: boolean;
    user: any;
    onUpdateFiles: (files: ArticleFile[]) => void;
    onPreview: (file: ArticleFile) => void;
    onUpdateSetup?: (updates: Partial<SetupVariant>) => void; // Made optional for TS safety, but should be passed
}

export const SetupProgTab: React.FC<SetupProgTabProps> = ({
    setup, allFiles, isLocked, user, onUpdateFiles, onPreview, onUpdateSetup
}) => {
    const camInputRef = useRef<HTMLInputElement>(null);
    const ncInputRef = useRef<HTMLInputElement>(null);

    // Reason Modal State
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [changeReason, setChangeReason] = useState('');
    const [pendingFile, setPendingFile] = useState<{ file: File, role: FileRole } | null>(null);

    // Cancel Confirm Modal State
    const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

    // Version Control Modal State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyFile, setHistoryFile] = useState<ArticleFile | null>(null);
    const [historyDocs, setHistoryDocs] = useState<DMSDocument[]>([]);

    // Document Library Modal State
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [libraryTargetRole, setLibraryTargetRole] = useState<FileRole | string | null>(null);

    // Document Rename Modal State
    const [pendingRenameFile, setPendingRenameFile] = useState<{ file: File, role: FileRole, reason?: string } | null>(null);

    // Default categories for CAM and NC if missing from global state
    const [categories, setCategories] = useState<DocumentCategory[]>([
        { id: '3', name: 'CAM Programma', code: 'CAM', icon: 'FileCode', color: 'text-orange-500', isSystem: true, applicableTo: 'SETUP', order: 30 },
        { id: '4', name: 'NC Code', code: 'NC', icon: 'Terminal', color: 'text-green-500', isSystem: true, applicableTo: 'SETUP', order: 40 },
        { id: '5', name: 'Overig', code: 'OTHER', icon: 'FileText', color: 'text-slate-500', isSystem: false, applicableTo: 'BOTH', order: 90 }
    ]);

    useEffect(() => {
        const loadCategories = async () => {
            const settings = await db.getSystemSettings();
            if (settings.documentCategories && settings.documentCategories.length > 0) {
                // Filter categories specific to SETUP or BOTH
                const setupCategories = settings.documentCategories.filter(
                    c => c.applicableTo === 'SETUP' || c.applicableTo === 'BOTH'
                );
                if (setupCategories.length > 0) {
                    setCategories(setupCategories);
                }
            }
        };
        loadCategories();
    }, []);

    // Filter bestanden voor deze specifieke setup
    const setupFiles = allFiles.filter(f => f.setupId === setup.id);
    const camFile = setupFiles.find(f => f.fileRole === 'CAM');
    const ncFile = setupFiles.find(f => f.fileRole === 'NC');
    const docFiles = setupFiles.filter(f => f.fileRole !== 'CAM' && f.fileRole !== 'NC');

    // Lock Status Checks
    const isArchived = setup.status === SetupStatus.ARCHIVED;
    const isReleased = setup.status === SetupStatus.RELEASED;
    // `isLocked` passed prop usually reflects Article Locked OR Setup Released. 
    // We use granular checks for the "Update Flow" vs "Hard Lock".

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

                        // Save the physical file in the Relational DMS
                        const doc = await documentService.addDocumentFromBase64(file.name, file.type, result, file.size);

                        resolve({
                            id: generateId(),
                            documentId: doc.id,
                            setupId: setup.id,
                            name: file.name,
                            type: file.type,
                            url: '', // Local reference only
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
                reader.onerror = () => {
                    resolve(null);
                };
                reader.readAsDataURL(file);
            });

            const processedFile = await filePromise;
            if (processedFile) newFilesList.push(processedFile);
        }

        onUpdateFiles(newFilesList);
    };

    const handleDeleteDoc = (fileId: string) => {
        if (isLocked) return;
        if (window.confirm('Bestand definitief verwijderen?')) {
            onUpdateFiles(allFiles.filter(f => f.id !== fileId));
        }
    };

    const getCategoryByCode = (code: string | FileRole) => {
        return categories.find(c => c.code === code) || {
            name: code as string,
            icon: 'File',
            color: 'text-slate-400'
        } as any;
    };

    const getRoleIcon = (code: string | FileRole) => {
        const cat = getCategoryByCode(code);
        switch (cat.icon) {
            case 'Hammer': return <Hammer size={18} className={cat.color} />;
            case 'Camera': return <Camera size={18} className={cat.color} />;
            case 'Image': return <Image size={18} className={cat.color} />;
            case 'Table': return <Table size={18} className={cat.color} />;
            case 'ClipboardList': return <ClipboardList size={18} className={cat.color} />;
            case 'Ruler': return <Ruler size={18} className={cat.color} />;
            case 'BarChart': return <BarChart size={18} className={cat.color} />;
            case 'FileCode': return <FileCode size={18} className={cat.color} />;
            case 'Terminal': return <Terminal size={18} className={cat.color} />;
            case 'Archive': return <Archive size={18} className={cat.color} />;
            case 'Box': return <Box size={18} className={cat.color} />;
            default: return <File size={18} className={cat.color} />;
        }
    };

    const processUpload = async (file: File, role: FileRole, reason?: string) => {
        const reader = new FileReader();
        reader.onload = async () => {
            const content = reader.result as string;

            try {
                // Sla fysiek bestand op in het Relational DMS
                const doc = await documentService.addDocumentFromBase64(file.name, file.type, content, file.size);

                const existingIdx = allFiles.findIndex(f => f.setupId === setup.id && f.fileRole === role);
                const existingFile = existingIdx !== -1 ? allFiles[existingIdx] : null;

                const newFile: ArticleFile = {
                    id: existingFile ? existingFile.id : generateId(),
                    documentId: doc.id, // Koppel via (nieuwe) LATEST ID
                    previousVersions: [
                        ...(existingFile?.previousVersions || []), // Behoud al bekende historie
                        ...(existingFile?.documentId ? [existingFile.documentId] : []) // Stop de huidig actieve in de historie
                    ],
                    setupId: setup.id,
                    name: file.name,
                    type: file.type,
                    url: '',            // VERWIJDER zware Base64 uit de Artikel state
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
                onUpdateFiles(updatedList);

                // LOG THE CHANGE IF REASON PROVIDED
                if (reason && onUpdateSetup) {
                    const changeEntry: SetupChangeEntry = {
                        id: generateId(),
                        date: new Date().toISOString(),
                        user: user?.name || 'Unknown',
                        type: role === FileRole.NC ? 'NC' : 'CAM',
                        description: `Nieuwe versie upload: ${file.name}`,
                        reason: reason
                    };

                    // Increment setup revision
                    const newRev = (setup.revision || 0) + 1;
                    onUpdateSetup({
                        changeLog: [changeEntry, ...(setup.changeLog || [])],
                        revision: newRev
                    });
                }
            } catch (err) {
                console.error("Fout bij opslaan document", err);
                alert("Er ging iets mis bij het opslaan van het document.");
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, role: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input value to allow re-uploading same file if needed
        e.target.value = '';

        if (isReleased && role === 'NC') {
            // PROCES WIJZIGING FLOW (Only if Released, not Archived)
            setPendingFile({ file, role: role as FileRole });
            setChangeReason('');
            setShowReasonModal(true);
        } else {
            // Normale flow (Draft of CAM file die altijd mag worden geupdate als locked by me)
            if (isLocked && role === 'CAM' && !camFile?.lockedBy) return; // Cant update if locked and not checked out
            setPendingRenameFile({ file, role: role as FileRole });
        }
    };

    const confirmReason = () => {
        if (!pendingFile || !changeReason.trim()) return;
        setPendingRenameFile({ file: pendingFile.file, role: pendingFile.role, reason: changeReason });
        setShowReasonModal(false);
        setPendingFile(null);
    };

    const handleSelectLibraryDoc = async (doc: DMSDocument) => {
        if (!libraryTargetRole) return;
        try {
            const existingIdx = allFiles.findIndex(f => f.setupId === setup.id && f.fileRole === libraryTargetRole);
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
                url: '',            // Local reference only
                uploadedBy: user?.name || 'Onbekend',
                uploadDate: new Date().toISOString(),
                fileRole: libraryTargetRole,
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
            onUpdateFiles(updatedList);

            // LOG
            if (onUpdateSetup) {
                const changeEntry: SetupChangeEntry = {
                    id: generateId(),
                    date: new Date().toISOString(),
                    user: user?.name || 'Unknown',
                    type: libraryTargetRole === 'NC' ? 'NC' : 'CAM',
                    description: `Bibliotheek document gekoppeld: ${doc.name}`,
                    reason: '' // Fixed missing property for TS
                };
                onUpdateSetup({
                    changeLog: [changeEntry, ...(setup.changeLog || [])],
                    revision: (setup.revision || 0) + 1
                });
            }
            setShowLibraryModal(false);
            setLibraryTargetRole(null);
        } catch (e) {
            console.error("Error linking library document to setup", e);
        }
    };

    const handleCheckOut = () => {
        if (!camFile || isLocked || camFile.lockedBy) return;

        // 1. Lock op CAM bestand zetten
        const updatedFiles = allFiles.map(f => f.id === camFile.id ? {
            ...f,
            lockedBy: user?.name || 'Onbekend',
            lockedAt: new Date().toISOString()
        } : f);
        onUpdateFiles(updatedFiles);

        // 2. Download kopie
        // Voor Legacy bestanden hebben we camFile.url, voor relationele DMS moeten we eigenlijk resolveFileUrl() gebruiken
        const link = document.createElement('a');
        link.href = camFile.url || '';
        link.download = camFile.name || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCancelLock = () => {
        if (!camFile) return;
        setShowCancelConfirmModal(true);
    };

    const confirmCancelLock = () => {
        if (!camFile) return;
        // Reset lock fields
        onUpdateFiles(allFiles.map(f => f.id === camFile.id ? { ...f, lockedBy: undefined, lockedAt: undefined } : f));
        setShowCancelConfirmModal(false);
    };

    const openHistory = async (file: ArticleFile) => {
        setHistoryFile(file);
        if (file.previousVersions && file.previousVersions.length > 0) {
            const docs = await documentService.getDocumentsByIds(file.previousVersions);
            // Sorteer nieuw -> oud voor weergave
            setHistoryDocs(docs.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()));
        } else {
            setHistoryDocs([]);
        }
        setShowHistoryModal(true);
    };

    const isCheckoutByMe = camFile?.lockedBy === user?.name;
    const isLockedByOthers = camFile?.lockedBy && camFile?.lockedBy !== user?.name;

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

                {/* 1. CAM PROJECT SECTIE */}
                <div className={`p-8 rounded-[2.5rem] border-2 transition-all shadow-sm flex flex-col h-full ${camFile?.lockedBy ? 'bg-orange-50 border-orange-500 dark:bg-orange-900/10' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                    <div className="flex justify-between items-start mb-8 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-2xl shadow-inner ${camFile?.lockedBy ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>
                                <FileCode size={32} />
                            </div>
                            <div>
                                <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">CAM Project</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bronbestand (Check-in/Out)</p>
                            </div>
                        </div>
                        {camFile && (
                            <div className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-2xl">V{camFile.version}</div>
                        )}
                    </div>

                    <div className="flex-1 mb-8 flex flex-col justify-center">
                        {camFile ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-current/10">
                                    <div className="font-bold text-sm truncate uppercase tracking-tight">{camFile.name}</div>
                                    <div className="flex justify-between items-center mt-4 text-[10px]">
                                        <div className="font-bold text-slate-400 uppercase tracking-widest flex gap-3">
                                            <span>{new Date(camFile.uploadDate).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1"><UserCircle size={12} /> {camFile.uploadedBy}</span>
                                        </div>
                                        {camFile.previousVersions && camFile.previousVersions.length > 0 && (
                                            <button
                                                onClick={() => setHistoryFile(camFile)}
                                                className="text-[10px] font-black uppercase flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors"
                                            >
                                                <ClockCounterClockwise size={12} /> {camFile.previousVersions.length} Oude Versie{camFile.previousVersions.length !== 1 ? 's' : ''}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {camFile.lockedBy && (
                                    <div className="bg-orange-500 text-white p-3 rounded-[2rem] flex items-center gap-3 animate-pulse">
                                        <ShieldAlert size={18} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Gereserveerd door {camFile.lockedBy}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                                <FileCode size={64} className="opacity-10 mb-6" />
                                <p className="text-xs mb-6 font-bold uppercase tracking-widest">Nog geen CAM project geüpload</p>
                                {!isLocked && !isArchived && (
                                    <div className="flex gap-4">
                                        <button onClick={() => camInputRef.current?.click()} className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3">
                                            <Upload size={18} /> Upload Nieuw
                                        </button>
                                        <button onClick={() => { setLibraryTargetRole('CAM'); setShowLibraryModal(true); }} className="px-6 py-4 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 dark:bg-slate-800/50 dark:hover:bg-blue-600/20 dark:text-slate-400 dark:hover:text-blue-400 rounded-2xl font-black uppercase text-xs tracking-widest shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800/50 transition-all active:scale-95 flex items-center justify-center gap-3">
                                            <Archive size={18} /> Bibliotheek
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 mt-auto shrink-0">
                        {camFile && (
                            isCheckoutByMe ? (
                                <>
                                    <button onClick={() => camInputRef.current?.click()} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95">
                                        <CheckCircle2 size={18} /> Check-In Nieuwe Versie
                                    </button>
                                    <button onClick={handleCancelLock} className="w-full py-3 text-red-500 font-bold uppercase text-[10px] tracking-widest hover:bg-red-50 rounded-[2rem] transition-all">Bewerking Annuleren</button>
                                </>
                            ) : isLockedByOthers ? (
                                <div className="text-center">
                                    <button disabled className="w-full py-4 bg-slate-200 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 cursor-not-allowed">
                                        <Lock size={18} /> In gebruik door {camFile.lockedBy}
                                    </button>
                                    <button onClick={() => handleDownload(camFile)} className="mt-3 text-blue-600 text-[10px] font-black uppercase hover:underline">Download Kopie (Read-Only)</button>
                                </div>
                            ) : (
                                !isLocked && !isArchived ? (
                                    <button onClick={handleCheckOut} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform">
                                        <Download size={18} /> Check-out & Bewerk
                                    </button>
                                ) : (
                                    <button onClick={() => handleDownload(camFile)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Download (Read Only)</button>
                                )
                            )
                        )}
                    </div>
                </div>

                {/* 2. NC PROGRAMMA SECTIE */}
                <div className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full">
                    <div className="flex justify-between items-start mb-8 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-slate-900 rounded-2xl text-emerald-500 shadow-xl">
                                <Cpu size={32} />
                            </div>
                            <div>
                                <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">NC Programma</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Machine G-Code (ISO)</p>
                            </div>
                        </div>
                        {ncFile && (
                            <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-2xl shadow-sm">V{ncFile.version}</div>
                        )}
                    </div>

                    <div className="flex-1 mb-8 flex flex-col justify-center">
                        {ncFile ? (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                <div className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400 truncate">{ncFile.name}</div>
                                <div className="flex justify-between items-center mt-4 text-[10px]">
                                    <div className="font-bold text-slate-400 uppercase tracking-widest flex gap-3">
                                        <span>{new Date(ncFile.uploadDate).toLocaleDateString()}</span>
                                        <span>{ncFile.uploadedBy}</span>
                                    </div>
                                    {ncFile.previousVersions && ncFile.previousVersions.length > 0 && (
                                        <button
                                            onClick={() => setHistoryFile(ncFile)}
                                            className="text-[10px] font-black uppercase flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors"
                                        >
                                            <ClockCounterClockwise size={12} /> {ncFile.previousVersions.length} Oude Versie{ncFile.previousVersions.length !== 1 ? 's' : ''}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                                <Cpu size={64} className="opacity-10 mb-6" />
                                <p className="text-xs mb-6 font-bold uppercase tracking-widest">Nog geen G-code geüpload</p>
                                {!isArchived && (
                                    <div className="flex gap-4">
                                        <button onClick={() => ncInputRef.current?.click()} className="px-6 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                            <Upload size={18} /> Upload Nieuw
                                        </button>
                                        <button onClick={() => { setLibraryTargetRole('NC'); setShowLibraryModal(true); }} className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800/50 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-sm border border-slate-200 dark:border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-3">
                                            <Archive size={18} /> Bibliotheek
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 mt-auto shrink-0">
                        {/* UPDATE BUTTON ONLY VISIBLE IF FILE EXISTS */}
                        {ncFile && !isArchived && (
                            <button onClick={() => ncInputRef.current?.click()} className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                <Upload size={18} /> {isLocked ? 'Proces Wijziging (Update)' : 'Nieuwe NC Versie'}
                            </button>
                        )}
                        {ncFile && (
                            <div className="flex gap-2">
                                <button onClick={() => onPreview(ncFile)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-[2rem] font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-colors">
                                    <Eye size={14} /> Inzien
                                </button>
                                <button onClick={() => handleDownload(ncFile)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-[2rem] font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-colors">
                                    <Download size={14} /> Download
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <SleekDocumentList
                    title={<><FileText size={20} className="text-blue-600" /> Overige Setup Documentatie</>}
                    subtitle="Opspanschetsen, meetrapporten, etc."
                    files={docFiles}
                    applicableTo="SETUP"
                    excludedCategories={['CAM', 'NC']}
                    defaultCategoryCode="OTHER"
                    isLocked={isLocked || isArchived}
                    onUpload={handleDocFiles}
                    onDelete={handleDeleteDoc}
                    onPreview={onPreview}
                    onDownload={handleDownload}
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

            {/* REASON MODAL */}
            {showReasonModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative border-2 border-orange-500">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-orange-50">
                                <CornerUpRight size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Proces Wijziging</h3>
                            <p className="text-xs font-bold text-slate-500 mt-2">Dit artikel is vrijgegeven. Geef een reden op voor deze wijziging.</p>
                        </div>

                        <textarea
                            autoFocus
                            rows={3}
                            className="w-full p-4 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium outline-none focus:border-orange-500 transition-all text-sm mb-6"
                            placeholder="Bijv. Optimalisatie voeding, aanpassing ijlgang..."
                            value={changeReason}
                            onChange={e => setChangeReason(e.target.value)}
                        />

                        <div className="flex gap-3">
                            <button onClick={() => { setShowReasonModal(false); setPendingFile(null); }} className="flex-1 py-3 text-slate-500 font-bold uppercase text-xs rounded-[2rem] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Annuleren</button>
                            <button onClick={confirmReason} disabled={!changeReason.trim()} className="flex-2 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-lg disabled:opacity-50 transition-all">Wijziging Doorvoeren</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CANCEL CONFIRM MODAL */}
            {showCancelConfirmModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative border-2 border-red-500">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Check-out Ongedaan Maken?</h3>
                            <p className="text-xs font-bold text-slate-500 mt-2">
                                Hiermee geeft u het bestand vrij. Eventuele lokale wijzigingen die nog niet zijn geüpload, gaan verloren.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowCancelConfirmModal(false)} className="flex-1 py-3 text-slate-500 font-bold uppercase text-xs rounded-[2rem] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                Terug
                            </button>
                            <button onClick={confirmCancelLock} className="flex-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-lg transition-all">
                                Bevestig Annulering
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VERSION HISTORY MODAL */}
            {showHistoryModal && historyFile && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl relative border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <button onClick={() => setShowHistoryModal(false)} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors">
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-800 shadow-sm shrink-0">
                                <ClockCounterClockwise size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Versie Historie</h3>
                                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-2">
                                    <span>{historyFile.name}</span>
                                    <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300">ACTUEEL: V{historyFile.version || 1}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-3 custom-scrollbar">
                            {historyDocs.length > 0 ? historyDocs.map((doc, idx) => {
                                // De array is gesorteerd van nieuw -> oud.
                                // Als actueel V4 is, dan is de eerste entry in history V3, de tweede V2 etc.
                                const histVersion = (historyFile.version || 1) - 1 - idx;

                                return (
                                    <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm font-black text-xs">
                                                V{Math.max(1, histVersion)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                                    {doc.name}
                                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black border border-slate-200 px-1.5 py-0.5 rounded">Overschreven</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                    <UserCircle size={12} /> {doc.uploadedBy}
                                                    <span className="opacity-50">•</span>
                                                    {new Date(doc.uploadDate).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = doc.url || '';
                                                link.download = doc.name;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }}
                                            className="bg-white hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-colors shadow-sm"
                                        >
                                            <Download size={14} /> Download
                                        </button>
                                    </div>
                                )
                            }) : (
                                <div className="py-12 text-center text-slate-400 text-sm font-bold uppercase tracking-widest italic border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                    Geen historische versies gevonden.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* DOCUMENT LIBRARY MODAL */}
            {showLibraryModal && (
                <DocumentLibraryModal
                    onClose={() => setShowLibraryModal(false)}
                    onSelect={handleSelectLibraryDoc}
                />
            )}

            {pendingRenameFile && (
                <DocumentRenameModal
                    files={[pendingRenameFile.file]}
                    role={pendingRenameFile.role}
                    onClose={() => setPendingRenameFile(null)}
                    onConfirm={(renamedFiles) => {
                        processUpload(renamedFiles[0], pendingRenameFile.role, pendingRenameFile.reason);
                        setPendingRenameFile(null);
                    }}
                />
            )}

            {historyFile && (
                <DocumentVersionSequenceModal
                    file={historyFile}
                    isOpen={!!historyFile}
                    onClose={() => setHistoryFile(null)}
                    parentRecordId={setup.id}
                />
            )}
        </div>
    );
};

const handleDownload = (file: ArticleFile) => {
    const link = document.createElement('a');
    link.href = file.url || '';
    link.download = file.name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
