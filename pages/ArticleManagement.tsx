
import React, { useState, useEffect } from 'react';
import { KEYS, loadTable } from '../services/db/core';
import {
    Article, ArticleFile, Machine, PredefinedOperation, SetupTemplate,
    SetupVariant, SetupStatus, Permission
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTable } from '../hooks/useTable';
import { useNotifications } from '../contexts/NotificationContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useArticleActions } from '../hooks/useArticleActions';
import { FilePreviewModal } from '../components/ui/FilePreviewModal';
import { ArrowLeft, BookOpen, Plus, LayoutPanelLeft, ShieldAlert } from '../icons';
import { articleService } from '../services/db/articleService';
import { db } from '../services/storage';
import { FileRole } from '../types/pdm';

// NEW LAYOUT COMPONENTS
import { ArticleExplorerLayout } from '../components/pdm/ArticleExplorerLayout';
import { ArticleTreeSidebar } from '../components/pdm/ArticleTreeSidebar';
import { SetupDocumentView } from '../components/pdm/SetupDocumentView';
import { PDFContextPanel } from '../components/pdm/PDFContextPanel';
import { DuplicateSetupModal } from '../components/pdm/modals/DuplicateSetupModal';
import { AddOperationModal } from '../components/pdm/modals/AddOperationModal';
import { RevisionWizardModal } from '../components/pdm/modals/RevisionWizardModal';
import { OperationNotesModal } from '../components/pdm/modals/OperationNotesModal';
import { ImportExcelModal } from '../components/pdm/modals/ImportExcelModal';

// Existing Components
import { ArticleList } from '../components/pdm/ArticleList';
import { CatalogManager } from '../components/pdm/CatalogManager';
import { ArticleHeader } from '../components/pdm/ArticleHeader';
import { ArticleBOM } from '../components/pdm/ArticleBOM';
import { ArticleFiles } from '../components/pdm/ArticleFiles';
import { ArticleAuditTimeline } from '../components/pdm/ArticleAuditTimeline';

export const ArticleManagement: React.FC = () => {
    const { hasPermission } = useAuth();
    const { addNotification } = useNotifications();
    const confirm = useConfirm();

    // Data hooks
    const { data: articles, refresh: refreshArticles } = useTable<Article>(KEYS.ARTICLES);
    const { data: machines } = useTable<Machine>(KEYS.MACHINES);
    const { data: mkgOperations, refresh: refreshCatalog } = useTable<PredefinedOperation>(KEYS.MKG_OPERATIONS);
    const { data: templates } = useTable<SetupTemplate>(KEYS.SETUP_TEMPLATES);
    const [serverUrl, setServerUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        loadTable<any>(KEYS.METADATA, {}).then(meta => {
            if (meta.serverUrl) setServerUrl(meta.serverUrl);
        });
    }, []);

    // D-10: Alle artikel-logica in de hook
    const actions = useArticleActions({
        articles, machines, mkgOperations, templates, refreshArticles
    });

    // Navigation State
    const [view, setView] = useState<'LIST' | 'EXPLORER' | 'CATALOG'>('LIST');
    const [selectedType, setSelectedType] = useState<'ARTICLE' | 'OPERATION' | 'SETUP'>('ARTICLE');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeOpId, setActiveOpId] = useState<string | null>(null);

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
    const [articleRevisionModal, setArticleRevisionModal] = useState(false);
    const [notesModal, setNotesModal] = useState<{ isOpen: boolean; opId: string | null }>({
        isOpen: false, opId: null
    });
    const [importModalOpen, setImportModalOpen] = useState(false);

    const canViewPdm = hasPermission(Permission.PDM_VIEW) || hasPermission(Permission.MANAGE_ARTICLES);

    // Auto-select drawing when article loads
    useEffect(() => {
        if (actions.editingArticle && Array.isArray(actions.editingArticle.files)) {
            const drawing = actions.editingArticle.files.find(f => f.fileRole === FileRole.DRAWING)
                || actions.editingArticle.files.find(f => f.type === 'application/pdf');
            if (drawing) setActiveFile(drawing);
        }
    }, [actions.editingArticle]);

    // --- NAVIGATION HANDLERS ---

    const handleCreateArticle = () => {
        actions.setEditingArticle(null);
        setView('EXPLORER');
        setSelectedType('ARTICLE');
        setSelectedId(null);
    };

    const handleEditArticle = (article: Article) => {
        actions.setEditingArticle(article);
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

    // --- PERMISSIONS CHECK ---

    if (!canViewPdm) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <ShieldAlert size={80} className="text-red-500/20 mb-6" />
                <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter mb-4">Toegang Geweigerd</h2>
                <p className="text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
                    Je bezit niet de vereiste PDM-rechten (<span className="text-blue-500">PDM_VIEW</span>) om de Artikel database in te zien.
                </p>
                <button onClick={() => window.history.back()} className="mt-8 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] font-bold text-xs uppercase text-slate-600 dark:text-slate-300 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                    Terug naar Dashboard
                </button>
            </div>
        );
    }

    // File update wrapper that also resets active file
    const handleUpdateFiles = (newFiles: ArticleFile[], customLogMessage?: string) => {
        actions.handleUpdateFiles(newFiles, customLogMessage);
        if (activeFile && !newFiles.find(f => f.id === activeFile.id)) setActiveFile(null);
    };

    // --- RENDER CONTENT ---

    const renderMainContent = () => {
        if (!actions.editingArticle) {
            return (
                <div className="p-8 h-full overflow-y-auto">
                    <ArticleHeader article={null} isLocked={false} canEdit={actions.canCreate} canRelease={actions.canRelease} canManageLock={actions.canManageLock} onSave={actions.handleSaveHeader} user={actions.user} />
                </div>
            );
        }

        // 1. ARTICLE ROOT VIEW
        if (selectedType === 'ARTICLE' || !selectedId) {
            return (
                <div className="p-8 h-full overflow-y-auto custom-scrollbar space-y-10">
                    <ArticleHeader
                        article={actions.editingArticle}
                        isLocked={actions.isLocked}
                        canEdit={actions.hasEditRights}
                        canRelease={actions.canRelease}
                        canManageLock={actions.canManageLock}
                        onSave={actions.handleSaveHeader}
                        user={actions.user}
                        onChangeStatus={actions.handleChangeStatus}
                        onRevise={() => setArticleRevisionModal(true)}
                        onObsolete={actions.handleArchiveArticle}
                    />
                    <div className={`grid grid-cols-1 gap-8 ${showContextPanel ? '' : 'xl:grid-cols-2'}`}>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                            <ArticleBOM
                                items={actions.editingArticle.bomItems || []}
                                allArticles={articles}
                                currentArticleId={actions.editingArticle.id}
                                isLocked={actions.isLocked}
                                onUpdate={(items) => actions.updateCurrentArticle(a => ({ ...a, bomItems: items }))}
                            />
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                            <ArticleFiles
                                articleId={actions.editingArticle.id}
                                files={actions.editingArticle.files || []}
                                isLocked={actions.isLocked}
                                onUpdate={handleUpdateFiles}
                                onPreview={setActiveFile}
                                user={actions.user}
                            />
                        </div>
                    </div>
                    <div className="mt-8">
                        <ArticleAuditTimeline auditTrail={actions.editingArticle.auditTrail} />
                    </div>
                </div>
            );
        }

        // 2. SETUP DOCUMENT VIEW
        if (selectedType === 'SETUP' && selectedId && activeOpId) {
            const op = actions.editingArticle.operations.find(o => o.id === activeOpId);
            const setup = op?.setups.find(s => s.id === selectedId);

            if (setup) {
                return (
                    <SetupDocumentView
                        article={actions.editingArticle}
                        setup={setup}
                        activeOpId={activeOpId}
                        machines={machines}
                        mkgOperations={mkgOperations}
                        templates={templates}
                        isArticleObsolete={actions.isObsolete}
                        user={actions.user}
                        onUpdateSetup={actions.handleUpdateSetup}
                        onDuplicateSetup={(opId, setup) => { if (!actions.isObsolete) setDuplicateModal({ isOpen: true, opId, sourceSetup: setup }); }}
                        onDeleteSetup={async (opId, setupId) => {
                            await actions.handleDeleteSetup(opId, setupId);
                            setSelectedType('OPERATION');
                            setSelectedId(opId);
                        }}
                        onSetDefault={actions.handleSetDefaultSetup}
                        onPreviewFile={setActiveFile}
                        onUpdateFiles={handleUpdateFiles}
                        onRevision={(opId, setup) => setRevisionModal({ isOpen: true, opId, setup })}
                    />
                );
            }
        }

        // 3. OPERATION VIEW (Fallback)
        if (selectedType === 'OPERATION' && selectedId) {
            const op = actions.editingArticle.operations.find(o => o.id === selectedId);
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
        return (
            <>
                <ArticleList
                    articles={articles}
                    machines={machines}
                    canCreate={actions.canCreate}
                    canManageCatalog={actions.canManageCatalog}
                    onCreateNew={handleCreateArticle}
                    onEdit={handleEditArticle}
                    onOpenCatalog={() => setView('CATALOG')}
                    onImportExcel={() => setImportModalOpen(true)}
                    serverUrl={serverUrl}
                />
                <ImportExcelModal
                    isOpen={importModalOpen}
                    onClose={() => setImportModalOpen(false)}
                    onImportSuccess={() => {
                        setImportModalOpen(false);
                        refreshArticles();
                        addNotification('SUCCESS', 'Import Voltooid', 'De MKG artikelen zijn succesvol ingeladen.');
                    }}
                />
            </>
        );
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
                    onDelete={async (id) => { const ok = await confirm({ title: 'Operatie wissen', message: 'Wil je deze operatie verwijderen uit de catalogus?' }); if (ok) { await db.deleteMkgOperation(id); refreshCatalog(); } }}
                />
            </div>
        );
    }

    const separator = '\u00A0\u00A0\u00A0\u00A0\u00A0/\u00A0\u00A0\u00A0\u00A0\u00A0';
    const headerParts = [
        actions.editingArticle?.drawingNumber,
        actions.editingArticle?.drawingRevision ? `Rev.${actions.editingArticle.drawingRevision}` : '',
        actions.editingArticle?.name,
        actions.editingArticle?.articleCode ? `(${actions.editingArticle.articleCode})` : ''
    ].filter(Boolean).join(separator);

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 fixed inset-0 z-[50]">
            {/* TOP BAR */}
            <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('LIST')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl text-slate-500"><ArrowLeft size={20} /></button>
                    <h1 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white whitespace-pre-wrap">
                        {actions.editingArticle ? headerParts : 'Nieuw Artikel'}
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
                        actions.editingArticle ? (
                            <ArticleTreeSidebar
                                article={actions.editingArticle}
                                selectedId={selectedId}
                                onSelect={handleTreeSelect}
                                onAddOperation={() => { if (actions.canAddOperation) setShowAddOpModal(true); }}
                                onOpenNotes={(opId) => setNotesModal({ isOpen: true, opId })}
                                isLocked={actions.isLocked}
                                canAddOperation={actions.canAddOperation}
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

            {/* MODALS */}
            <FilePreviewModal file={fullScreenPreview} onClose={() => setFullScreenPreview(null)} />

            <DuplicateSetupModal
                isOpen={duplicateModal.isOpen}
                onClose={() => setDuplicateModal({ isOpen: false, opId: null, sourceSetup: null })}
                onConfirm={(targetMachineId, mode) => {
                    if (!duplicateModal.opId || !duplicateModal.sourceSetup) return;
                    const newId = actions.confirmDuplicateSetup(duplicateModal.opId, duplicateModal.sourceSetup, targetMachineId, mode);
                    setDuplicateModal({ isOpen: false, opId: null, sourceSetup: null });
                    if (newId) { setSelectedType('SETUP'); setSelectedId(newId); }
                }}
                sourceSetup={duplicateModal.sourceSetup}
                machines={machines}
            />

            <AddOperationModal
                isOpen={showAddOpModal}
                onClose={() => setShowAddOpModal(false)}
                onConfirm={(type, id) => {
                    const result = actions.confirmAddOperation(type, id);
                    if (result) {
                        setSelectedType('SETUP');
                        setActiveOpId(result.opId);
                        setSelectedId(result.setupId);
                    }
                    setShowAddOpModal(false);
                }}
                machines={machines}
                templates={templates}
                mkgOperations={mkgOperations}
            />

            <RevisionWizardModal
                isOpen={revisionModal.isOpen}
                onClose={() => setRevisionModal({ isOpen: false, opId: null, setup: null })}
                onConfirm={(reason) => {
                    if (revisionModal.opId && revisionModal.setup) {
                        const newId = actions.handleCreateSetupRevision(revisionModal.opId, revisionModal.setup, reason);
                        setRevisionModal({ isOpen: false, opId: null, setup: null });
                        if (newId) setSelectedId(newId);
                    }
                }}
                currentVersion={revisionModal.setup?.version || 1}
            />

            <RevisionWizardModal
                isOpen={articleRevisionModal}
                onClose={() => setArticleRevisionModal(false)}
                onConfirm={async (reason) => {
                    const newArticle = await actions.handleArticleRevision(reason);
                    setArticleRevisionModal(false);
                    if (newArticle) { setSelectedId(newArticle.id); setSelectedType('ARTICLE'); }
                }}
                currentVersion={0}
                title="Nieuwe Artikel Revisie"
                subtitle={`Artikel wordt gekopieerd naar revisie ${actions.editingArticle?.revision ? String.fromCharCode(actions.editingArticle.revision.charCodeAt(actions.editingArticle.revision.length - 1) + 1) : '?'}. Het huidige artikel wordt gearchiveerd.`}
            />

            {notesModal.isOpen && notesModal.opId && actions.editingArticle && (() => {
                const op = actions.editingArticle.operations.find(o => o.id === notesModal.opId);
                return op ? (
                    <OperationNotesModal
                        operation={op}
                        currentUser={actions.user?.name || 'Onbekend'}
                        onClose={() => setNotesModal({ isOpen: false, opId: null })}
                        onAddNote={actions.handleAddNote}
                        onUpdateNote={actions.handleUpdateNote}
                    />
                ) : null;
            })()}
        </div>
    );
};
