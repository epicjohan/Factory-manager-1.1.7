
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/storage';
import { KEYS, generateId, getNowISO, loadTable } from '../services/db/core';
import {
    Article, ArticleStatus, Permission, ArticleFile, ArticleOperation, Machine,
    PredefinedOperation, SetupTemplate, ArticleBOMItem, SetupStatus, ArticleAuditEntry,
    SetupVariant, FileRole, SetupVerificationStatus, AssetType, SetupChangeEntry
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTable } from '../hooks/useTable';
import { FilePreviewModal } from '../components/ui/FilePreviewModal';
import { ArrowLeft, BookOpen, Plus, LayoutPanelLeft, ShieldAlert } from '../icons';
import { articleService } from '../services/db/articleService';

// NEW LAYOUT COMPONENTS
import { ArticleExplorerLayout } from '../components/pdm/ArticleExplorerLayout';
import { ArticleTreeSidebar } from '../components/pdm/ArticleTreeSidebar';
import { SetupDocumentView } from '../components/pdm/SetupDocumentView';
import { PDFContextPanel } from '../components/pdm/PDFContextPanel';
import { DuplicateSetupModal } from '../components/pdm/modals/DuplicateSetupModal';
import { AddOperationModal } from '../components/pdm/modals/AddOperationModal';
import { RevisionWizardModal } from '../components/pdm/modals/RevisionWizardModal';

// Existing Components (Reused for logic/modals)
import { ArticleList } from '../components/pdm/ArticleList';
import { CatalogManager } from '../components/pdm/CatalogManager';
import { ArticleHeader } from '../components/pdm/ArticleHeader';
import { ArticleBOM } from '../components/pdm/ArticleBOM';
import { ArticleFiles } from '../components/pdm/ArticleFiles';
import { ArticleAuditTimeline } from '../components/pdm/ArticleAuditTimeline';
import { logArticleChange } from '../services/db/articleService';

export const ArticleManagement: React.FC = () => {
    const { user, hasPermission } = useAuth();

    // Hooks
    const { data: articles, refresh: refreshArticles } = useTable<Article>(KEYS.ARTICLES);
    const { data: machines } = useTable<Machine>(KEYS.MACHINES);
    const { data: mkgOperations, refresh: refreshCatalog } = useTable<PredefinedOperation>(KEYS.MKG_OPERATIONS);
    const { data: templates } = useTable<SetupTemplate>(KEYS.SETUP_TEMPLATES);
    const [serverUrl, setServerUrl] = useState<string | undefined>(undefined);

    // Load serverUrl for thumbnail URL resolution
    useEffect(() => {
        loadTable<any>(KEYS.METADATA, {}).then(meta => {
            if (meta.serverUrl) setServerUrl(meta.serverUrl);
        });
    }, []);

    // Navigation State
    const [view, setView] = useState<'LIST' | 'EXPLORER' | 'CATALOG'>('LIST');

    // Selection State (Explorer)
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);
    const [selectedType, setSelectedType] = useState<'ARTICLE' | 'OPERATION' | 'SETUP'>('ARTICLE');
    const [selectedId, setSelectedId] = useState<string | null>(null); // Active node ID
    const [activeOpId, setActiveOpId] = useState<string | null>(null); // For context when setup is selected

    // Context Panel State
    const [activeFile, setActiveFile] = useState<ArticleFile | null>(null);
    const [showContextPanel, setShowContextPanel] = useState(true);
    const [fullScreenPreview, setFullScreenPreview] = useState<ArticleFile | null>(null);

    // Modals State
    const [duplicateModal, setDuplicateModal] = useState<{ isOpen: boolean; opId: string | null; sourceSetup: SetupVariant | null }>({
        isOpen: false, opId: null, sourceSetup: null
    });
    const [showAddOpModal, setShowAddOpModal] = useState(false);

    const [revisionModal, setRevisionModal] = useState<{ isOpen: boolean; opId: string | null; setup: SetupVariant | null }>({
        isOpen: false, opId: null, setup: null
    });

    // Permissions
    const canViewPdm = hasPermission(Permission.PDM_VIEW) || hasPermission(Permission.MANAGE_ARTICLES);
    const canCreate = hasPermission(Permission.PDM_CREATE) || hasPermission(Permission.MANAGE_ARTICLES);
    const canEditAll = hasPermission(Permission.PDM_EDIT_ALL) || hasPermission(Permission.MANAGE_ARTICLES);
    const canEditOwn = hasPermission(Permission.PDM_EDIT_OWN);
    const canRelease = hasPermission(Permission.PDM_RELEASE) || hasPermission(Permission.MANAGE_ARTICLES);

    const canManageCatalog = canEditAll;
    const isOwner = editingArticle?.createdBy === user?.name;
    const hasEditRights = canEditAll || (canEditOwn && isOwner) || (!editingArticle && canCreate);
    const isReleased = editingArticle?.status === ArticleStatus.RELEASED;
    const isObsolete = editingArticle?.status === ArticleStatus.OBSOLETE;
    const isLocked = !(!isReleased && !isObsolete && hasEditRights);

    // --- EFFECT: Auto-select drawing when article loads ---
    useEffect(() => {
        if (editingArticle && editingArticle.files) {
            const drawing = editingArticle.files.find(f => f.fileRole === FileRole.DRAWING)
                || editingArticle.files.find(f => f.type === 'application/pdf');
            if (drawing) setActiveFile(drawing);
        }
    }, [editingArticle]);

    // --- ACTIONS ---

    if (!canViewPdm) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <ShieldAlert size={80} className="text-red-500/20 mb-6" />
                <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter mb-4">Toegang Geweigerd</h2>
                <p className="text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
                    Je bezit niet de vereiste PDM-rechten (<span className="text-blue-500">PDM_VIEW</span>) om de Artikel database in te zien. Neem contact op met je applicatiebeheerder.
                </p>
                <button onClick={() => window.history.back()} className="mt-8 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] font-bold text-xs uppercase text-slate-600 dark:text-slate-300 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                    Terug naar Dashboard
                </button>
            </div>
        );
    }

    const updateCurrentArticle = async (transform: (art: Article) => Article, logMessage?: string) => {
        if (!editingArticle) return;
        let updated = transform(editingArticle);
        if (logMessage && user) {
            updated = logArticleChange(updated, logMessage);
        }
        await db.updateArticle(updated);
        setEditingArticle(updated);
    };

    const handleCreateArticle = () => {
        setEditingArticle(null); // Triggers empty form in header
        setView('EXPLORER');
        setSelectedType('ARTICLE');
        setSelectedId(null);
    };

    const handleEditArticle = (article: Article) => {
        setEditingArticle(article);
        setView('EXPLORER');
        setSelectedType('ARTICLE');
        setSelectedId(article.id);
    };

    const handleTreeSelect = (type: 'ARTICLE' | 'OPERATION' | 'SETUP', id: string, parentId?: string) => {
        setSelectedType(type);
        setSelectedId(id);
        if (type === 'SETUP' && parentId) setActiveOpId(parentId);
        if (type === 'OPERATION') setActiveOpId(id);
    };

    const handleAddOperationClick = () => {
        if (!editingArticle || isLocked) return;
        setShowAddOpModal(true);
    };

    const confirmAddOperation = (type: 'MACHINE' | 'PROCESS', id: string) => {
        if (!editingArticle) return;

        let opName = 'Nieuwe Bewerking';
        let setupName = 'Nieuwe Setup';
        let mkgOperationCode = '';
        let machineId = '';
        let setupTemplateId = undefined;
        let frozenFields = undefined;
        let frozenToolFields = undefined;

        if (type === 'MACHINE') {
            const targetMachine = machines.find(m => m.id === id);
            machineId = id;
            opName = targetMachine ? `${targetMachine.name} (${targetMachine.machineNumber})` : 'Machine';
            setupName = targetMachine ? targetMachine.name : 'Standaard Setup';

            // Load Default Template if machine has one
            if (targetMachine?.setupTemplateId) {
                const tpl = templates.find(t => t.id === targetMachine.setupTemplateId);
                if (tpl) {
                    frozenFields = tpl.fields;
                    frozenToolFields = tpl.toolFields;
                }
            }
        } else {
            // PROCESS - id is now the PredefinedOperation ID from catalog
            const catalogOp = mkgOperations.find(op => op.id === id);
            if (catalogOp) {
                opName = catalogOp.name;
                setupName = catalogOp.name;
                mkgOperationCode = catalogOp.id; // Store link to catalog item

                // If the catalog item has a template linked, use it
                if (catalogOp.setupTemplateId) {
                    setupTemplateId = catalogOp.setupTemplateId;
                    const tpl = templates.find(t => t.id === catalogOp.setupTemplateId);
                    if (tpl) {
                        frozenFields = tpl.fields;
                        frozenToolFields = tpl.toolFields;
                    }
                }
            } else {
                opName = 'Proces';
                setupName = 'Proces';
            }
        }

        const newOrder = (editingArticle.operations.length + 1) * 10;
        const newSetupId = generateId();
        const newOpId = generateId();

        const newOp: ArticleOperation = {
            id: newOpId,
            order: newOrder,
            description: opName,
            mkgOperationCode: mkgOperationCode, // Store catalog link
            setups: [{
                id: newSetupId,
                name: setupName,
                machineId: machineId, // Empty string if Process
                setupTemplateId: setupTemplateId,
                status: SetupStatus.DRAFT,
                version: 1, // Start at version 1
                isDefault: true, // First setup is always default
                setupTimeMinutes: type === 'PROCESS' ? 0 : 30,
                cycleTimeMinutes: type === 'PROCESS' ? 10 : 2,
                steps: [],
                tools: [],
                frozenFields,
                frozenToolFields
            }]
        };

        updateCurrentArticle(art => ({ ...art, operations: [...art.operations, newOp] }), `Bewerking ${newOrder} toegevoegd (${type}: ${setupName}).`);

        // Auto-select the new operation
        setSelectedType('SETUP');
        setActiveOpId(newOpId);
        setSelectedId(newSetupId);
    };

    // Generic Update Wrappers for Sub-Components
    const handleSaveHeader = async (data: Partial<Article>) => {
        if (!user || isLocked) return;
        const baseData = { ...data, updatedBy: user.name };
        if (editingArticle) {
            const changedKeys = Object.keys(data).filter(k => (data as any)[k] !== (editingArticle as any)[k]);
            const logMsg = changedKeys.length > 0
                ? `Stamgegevens bijgewerkt (${changedKeys.join(', ')}).`
                : 'Stamgegevens bijgewerkt.';
            updateCurrentArticle(art => ({ ...art, ...baseData } as Article), logMsg);
        } else {
            const auditEntry = { id: generateId(), timestamp: new Date().toISOString(), user: user.name, action: 'Artikel aangemaakt.' };
            const newArticle = {
                id: generateId(), articleCode: data.articleCode || '', revision: 'A', name: data.name || '',
                status: ArticleStatus.DRAFT, operations: [], bomItems: [], files: [],
                auditTrail: [auditEntry], createdBy: user.name, created: new Date().toISOString(), updated: new Date().toISOString(), ...baseData
            } as Article;
            await db.addArticle(newArticle);
            setEditingArticle(newArticle);
            setSelectedId(newArticle.id);
        }
        refreshArticles();
    };

    const handleUpdateFiles = (newFiles: ArticleFile[], customLogMessage?: string) => {
        updateCurrentArticle(art => ({ ...art, files: newFiles }), customLogMessage || `Bestanden bijgewerkt.`);
        // Update active file if it was removed or changed
        if (activeFile && !newFiles.find(f => f.id === activeFile.id)) setActiveFile(null);
    };

    const handleUpdateSetup = (opId: string, setupId: string, updates: Partial<SetupVariant>, customLogMessage?: string) => {
        const setupName = editingArticle?.operations.find(o => o.id === opId)?.setups.find(s => s.id === setupId)?.name || 'Setup';
        const logMsg = customLogMessage || `Setup '${setupName}' bijgewerkt.`;

        updateCurrentArticle(art => ({
            ...art, operations: art.operations.map(op => {
                if (op.id !== opId) return op;
                return { ...op, setups: op.setups.map(s => s.id === setupId ? { ...s, ...updates } : s) };
            })
        }), logMsg);
    };

    // New Function to handle setting a setup as default
    const handleSetDefaultSetup = (opId: string, setupId: string) => {
        updateCurrentArticle(art => ({
            ...art,
            operations: art.operations.map(op => {
                if (op.id !== opId) return op;

                // 1. Update all setups in this operation
                const newSetups = op.setups.map(s => ({
                    ...s,
                    isDefault: s.id === setupId
                }));

                // 2. Find the name of the new default setup
                const newDefaultSetup = newSetups.find(s => s.id === setupId);
                const newOpDescription = newDefaultSetup ? newDefaultSetup.name : op.description;

                return {
                    ...op,
                    setups: newSetups,
                    description: newOpDescription // Update operation name to match default setup
                };
            })
        }), "Standaard setup gewijzigd.");
    };

    const handleDeleteSetup = (opId: string, setupId: string) => {
        if (window.confirm("Setup verwijderen?")) {
            const setupName = editingArticle?.operations.find(o => o.id === opId)?.setups.find(s => s.id === setupId)?.name || 'Setup';
            updateCurrentArticle(art => ({
                ...art, operations: art.operations.map(o => {
                    if (o.id !== opId) return o;
                    return { ...o, setups: o.setups.filter(s => s.id !== setupId) };
                })
            }), `Setup '${setupName}' verwijderd.`);
            setSelectedType('OPERATION');
            setSelectedId(opId);
        }
    };

    // --- REVISION LOGIC START ---

    const handleOpenRevisionModal = (opId: string, setup: SetupVariant) => {
        setRevisionModal({ isOpen: true, opId, setup });
    };

    const handleCreateRevision = (reason: string) => {
        const { opId, setup } = revisionModal;
        if (!editingArticle || !opId || !setup) return;

        const newVersion = (setup.version || 1) + 1;
        const newSetupId = generateId();
        const now = getNowISO();

        // 1. Create Change Log Entry
        const logEntry: SetupChangeEntry = {
            id: generateId(),
            date: now,
            user: user?.name || 'Unknown',
            type: 'VERSION',
            description: `Nieuwe revisie v${newVersion} aangemaakt`,
            reason: reason
        };

        // 2. Archive Current Setup
        const archivedSetup: SetupVariant = {
            ...setup,
            status: SetupStatus.ARCHIVED,
        };

        // 3. Create New Draft Setup (Clone)
        const newSetup: SetupVariant = {
            ...setup,
            id: newSetupId,
            status: SetupStatus.DRAFT,
            version: newVersion,
            changeLog: [logEntry, ...(setup.changeLog || [])],
            // Reset verification
            verificationStatus: SetupVerificationStatus.UNVERIFIED,
            verifiedBy: undefined,
            verifiedDate: undefined,
            // Ensure deep copy of arrays if needed
            steps: JSON.parse(JSON.stringify(setup.steps || [])),
            tools: JSON.parse(JSON.stringify(setup.tools || [])),
            templateData: JSON.parse(JSON.stringify(setup.templateData || {}))
        };

        // 4. Clone Files associated with this setup (Fork & Freeze)
        const associatedFiles = editingArticle.files.filter(f => f.setupId === setup.id);
        const newFiles = associatedFiles.map(f => ({
            ...f,
            id: generateId(), // New file ID
            setupId: newSetupId, // Link to new setup
            version: f.version, // Keep version continuity (e.g. still v3, ready to become v4 on edit)
            uploadDate: now,
            lockedBy: undefined, // Clear locks
            lockedAt: undefined
        }));

        updateCurrentArticle(art => {
            // Update operations: Replace old setup with archived one AND add new setup
            const updatedOps = art.operations.map(op => {
                if (op.id !== opId) return op;
                const newSetupsList = op.setups.map(s => s.id === setup.id ? archivedSetup : s);
                newSetupsList.unshift(newSetup); // Add new one to top
                return { ...op, setups: newSetupsList };
            });

            return {
                ...art,
                operations: updatedOps,
                files: [...art.files, ...newFiles] // Append copied files
            };
        }, `Revisie v${newVersion} gemaakt voor setup: ${setup.name}`);

        setRevisionModal({ isOpen: false, opId: null, setup: null });
        setSelectedId(newSetupId); // Select the new draft
    };

    // --- REVISION LOGIC END ---

    const handleDuplicateSetup = (opId: string, sourceSetup: SetupVariant) => {
        if (!editingArticle || isLocked) return;
        setDuplicateModal({ isOpen: true, opId, sourceSetup });
    };

    const confirmDuplicateSetup = (targetMachineId: string, mode: 'CLONE' | 'TEMPLATE') => {
        const { opId, sourceSetup } = duplicateModal;
        if (!editingArticle || !opId || !sourceSetup) return;

        const targetMachine = machines.find(m => m.id === targetMachineId);
        const newMachineName = targetMachine ? targetMachine.name : 'Nieuwe Setup';
        const newSetupId = generateId();

        // Base new setup structure
        let newSetup: SetupVariant = {
            id: newSetupId,
            name: newMachineName,
            machineId: targetMachineId,
            status: SetupStatus.DRAFT,
            version: 1,
            isDefault: false, // Copy is never default initially
            verificationStatus: SetupVerificationStatus.UNVERIFIED,
            verifiedBy: undefined,
            verifiedDate: undefined,
            setupTimeMinutes: sourceSetup.setupTimeMinutes,
            cycleTimeMinutes: sourceSetup.cycleTimeMinutes,
            steps: [],
            tools: [],
            // Template loading
            setupTemplateId: targetMachine?.setupTemplateId,
        };

        // Load fields from machine template if available
        if (targetMachine?.setupTemplateId) {
            const tpl = templates.find(t => t.id === targetMachine.setupTemplateId);
            if (tpl) {
                newSetup.frozenFields = tpl.fields;
                newSetup.frozenToolFields = tpl.toolFields;
            }
        } else if (mode === 'CLONE') {
            // If cloning and no target template, try to keep source structure
            newSetup.frozenFields = sourceSetup.frozenFields;
            newSetup.frozenToolFields = sourceSetup.frozenToolFields;
        }

        let newFiles: ArticleFile[] = [];

        if (mode === 'CLONE') {
            // CLONE MODE: Deep copy content
            newSetup.steps = (sourceSetup.steps || []).map(s => ({ ...s, id: generateId() }));
            newSetup.tools = (sourceSetup.tools || []).map(t => ({ ...t, id: generateId() }));
            newSetup.templateData = { ...sourceSetup.templateData };

            // Files logic (Create new references)
            const sourceFiles = editingArticle.files.filter(f => f.setupId === sourceSetup.id);
            sourceFiles.forEach(f => {
                newFiles.push({
                    ...f,
                    id: generateId(),
                    setupId: newSetupId,
                    uploadDate: new Date().toISOString(),
                    uploadedBy: user?.name || 'System'
                });
            });
        }
        // TEMPLATE MODE: Kept clean (steps/tools empty), fields are reset.

        updateCurrentArticle(art => {
            const updatedOps = art.operations.map(op => {
                if (op.id !== opId) return op;
                return { ...op, setups: [...op.setups, newSetup] };
            });
            return {
                ...art,
                operations: updatedOps,
                files: [...art.files, ...newFiles]
            };
        }, `Setup ${sourceSetup.name} gedupliceerd naar ${newMachineName} (${mode}).`);

        setDuplicateModal({ isOpen: false, opId: null, sourceSetup: null });

        // Auto-select
        setSelectedType('SETUP');
        setSelectedId(newSetupId);
    };

    // --- RENDER CONTENT ---

    const renderMainContent = () => {
        if (!editingArticle) {
            return (
                <div className="p-8 h-full overflow-y-auto">
                    <ArticleHeader article={null} isLocked={false} canEdit={canCreate} canRelease={canRelease} onSave={handleSaveHeader} user={user} />
                </div>
            );
        }

        // 1. ARTICLE ROOT VIEW
        if (selectedType === 'ARTICLE' || !selectedId) {
            return (
                <div className="p-8 h-full overflow-y-auto custom-scrollbar space-y-10">
                    <ArticleHeader
                        article={editingArticle}
                        isLocked={isLocked}
                        canEdit={hasEditRights}
                        canRelease={canRelease}
                        onSave={handleSaveHeader}
                        user={user}
                        onChangeStatus={async (s) => { const upd = await articleService.updateArticleStatus(editingArticle.id, s); if (upd) setEditingArticle(upd); }}
                        onRevise={async () => { /* Revision Logic reuse */ }}
                    />
                    <div className={`grid grid-cols-1 gap-8 ${showContextPanel ? '' : 'xl:grid-cols-2'}`}>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                            <ArticleBOM
                                items={editingArticle.bomItems || []}
                                allArticles={articles}
                                currentArticleId={editingArticle.id}
                                isLocked={isLocked}
                                onUpdate={(items) => updateCurrentArticle(a => ({ ...a, bomItems: items }))}
                            />
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                            <ArticleFiles
                                files={editingArticle.files || []}
                                isLocked={isLocked}
                                onUpdate={handleUpdateFiles}
                                onPreview={setActiveFile}
                                user={user}
                            />
                        </div>
                    </div>
                    {/* AUDIT TIMELINE ROW */}
                    <div className="mt-8">
                        <ArticleAuditTimeline auditTrail={editingArticle.auditTrail} />
                    </div>
                </div>
            );
        }

        // 2. SETUP DOCUMENT VIEW
        if (selectedType === 'SETUP' && selectedId && activeOpId) {
            const op = editingArticle.operations.find(o => o.id === activeOpId);
            const setup = op?.setups.find(s => s.id === selectedId);

            if (setup) {
                return (
                    <SetupDocumentView
                        article={editingArticle}
                        setup={setup}
                        activeOpId={activeOpId}
                        machines={machines}
                        mkgOperations={mkgOperations}
                        templates={templates}
                        isLocked={isLocked} // Article level lock
                        user={user}
                        onUpdateSetup={handleUpdateSetup}
                        onDuplicateSetup={handleDuplicateSetup}
                        onDeleteSetup={handleDeleteSetup}
                        onSetDefault={handleSetDefaultSetup}
                        onPreviewFile={setActiveFile}
                        onUpdateFiles={handleUpdateFiles}
                        onRevision={handleOpenRevisionModal}
                    />
                );
            }
        }

        // 3. OPERATION VIEW (Fallback/Summary)
        if (selectedType === 'OPERATION' && selectedId) {
            const op = editingArticle.operations.find(o => o.id === selectedId);
            return (
                <div className="p-10 flex flex-col items-center justify-center h-full text-slate-400">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase mb-2">{op?.description}</h2>
                    <p>Selecteer een setup in het menu links om de details te bewerken.</p>
                </div>
            );
        }

        return <div>Selecteer een item.</div>;
    };

    // --- MAIN RENDER ---

    if (view === 'LIST') {
        return <ArticleList
            articles={articles}
            canCreate={canCreate}
            canManageCatalog={canManageCatalog}
            onCreateNew={handleCreateArticle}
            onEdit={handleEditArticle}
            onOpenCatalog={() => setView('CATALOG')}
            serverUrl={serverUrl}
        />;
    }

    if (view === 'CATALOG') {
        return (
            <div className="max-w-7xl mx-auto pb-20">
                <button onClick={() => setView('LIST')} className="flex items-center gap-2 mb-6 text-slate-500 hover:text-slate-800 dark:text-slate-400"><ArrowLeft size={18} /> Terug</button>
                <CatalogManager
                    mkgOperations={mkgOperations}
                    machines={machines}
                    templates={templates}
                    onSave={async (op) => { if (mkgOperations.find(o => o.id === op.id)) await db.updateMkgOperation(op); else await db.addMkgOperation(op); refreshCatalog(); }}
                    onDelete={async (id) => { if (window.confirm("Wissen?")) { await db.deleteMkgOperation(id); refreshCatalog(); } }}
                />
            </div>
        );
    }

    // Header string with specific spacing (5 non-breaking spaces around slash)
    // using unicode non-breaking space \u00A0
    const separator = '\u00A0\u00A0\u00A0\u00A0\u00A0/\u00A0\u00A0\u00A0\u00A0\u00A0';
    const headerParts = [
        editingArticle?.drawingNumber,
        editingArticle?.revision ? `Rev.${editingArticle.revision}` : '',
        editingArticle?.name,
        editingArticle?.articleCode ? `(${editingArticle.articleCode})` : ''
    ].filter(Boolean).join(separator);

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 fixed inset-0 z-[50]">
            {/* TOP BAR */}
            <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('LIST')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl text-slate-500"><ArrowLeft size={20} /></button>
                    <h1 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white whitespace-pre-wrap">
                        {editingArticle ? headerParts : 'Nieuw Artikel'}
                    </h1>
                </div>
                <button
                    onClick={() => setShowContextPanel(!showContextPanel)}
                    className={`p-2 rounded-2xl transition-colors ${showContextPanel ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Toon/Verberg Tekening"
                >
                    <LayoutPanelLeft size={20} className="rotate-180" />
                </button>
            </div>

            {/* EXPLORER LAYOUT */}
            <div className="flex-1 p-4 overflow-hidden">
                <ArticleExplorerLayout
                    showPanel={showContextPanel}
                    sidebar={
                        editingArticle ? (
                            <ArticleTreeSidebar
                                article={editingArticle}
                                selectedId={selectedId}
                                onSelect={handleTreeSelect}
                                onAddOperation={handleAddOperationClick}
                                isLocked={isLocked}
                            />
                        ) : <div className="p-4 text-xs text-slate-400">Nog niet opgeslagen...</div>
                    }
                    main={renderMainContent()}
                    panel={
                        <PDFContextPanel
                            file={activeFile}
                            onClose={() => setShowContextPanel(false)}
                            onMaximize={() => setFullScreenPreview(activeFile)}
                        />
                    }
                />
            </div>

            {/* FULLSCREEN PREVIEW MODAL */}
            <FilePreviewModal file={fullScreenPreview} onClose={() => setFullScreenPreview(null)} />

            {/* DUPLICATE MODAL */}
            <DuplicateSetupModal
                isOpen={duplicateModal.isOpen}
                onClose={() => setDuplicateModal({ isOpen: false, opId: null, sourceSetup: null })}
                onConfirm={confirmDuplicateSetup}
                sourceSetup={duplicateModal.sourceSetup}
                machines={machines}
            />

            {/* ADD OPERATION MODAL */}
            <AddOperationModal
                isOpen={showAddOpModal}
                onClose={() => setShowAddOpModal(false)}
                onConfirm={confirmAddOperation}
                machines={machines}
                templates={templates}
                mkgOperations={mkgOperations}
            />

            {/* REVISION WIZARD MODAL */}
            <RevisionWizardModal
                isOpen={revisionModal.isOpen}
                onClose={() => setRevisionModal({ isOpen: false, opId: null, setup: null })}
                onConfirm={handleCreateRevision}
                currentVersion={revisionModal.setup?.version || 1}
            />
        </div>
    );
};
