
import React, { useState } from 'react';
import { SetupVariant, Machine, PredefinedOperation, SetupTemplate, Article, ArticleFile, SetupStatus, UserRole } from '../../types';
import { ChevronDown, ChevronRight, LayoutTemplate, Wrench, Hammer, ClipboardList, FileCode } from '../../icons';
import { SetupGeneralTab } from './tabs/SetupGeneralTab';
import { SetupFixtureTab } from './tabs/SetupFixtureTab';
import { SetupToolsTab } from './tabs/SetupToolsTab';
import { SetupInstructionsTab } from './tabs/SetupInstructionsTab';
import { SetupProgTab } from './tabs/SetupProgTab';
import { ImageProcessor } from '../../services/db/imageProcessor';
import { generateId } from '../../services/db/core';
import { documentService } from '../../services/db/documentService';
import { DMSDocument } from '../../types';
import { useConfirm } from '../../contexts/ConfirmContext';

// F-02: Geëxtraheerde sub-componenten
import { SetupHeaderBar } from './shared/SetupHeaderBar';
import { SetupStatusBar } from './shared/SetupStatusBar';

interface SetupDocumentViewProps {
    article: Article;
    setup: SetupVariant;
    activeOpId: string;
    machines: Machine[];
    mkgOperations: PredefinedOperation[];
    templates: SetupTemplate[];
    isArticleObsolete: boolean; // Setups worden ALLEEN geblokkeerd als artikel OBSOLETE is, niet bij LOCKED
    user: any;
    onUpdateSetup: (opId: string, setupId: string, updates: Partial<SetupVariant>, customLogMessage?: string) => void;
    onDuplicateSetup: (opId: string, setup: SetupVariant) => void;
    onDeleteSetup: (opId: string, setupId: string) => void;
    onSetDefault: (opId: string, setupId: string) => void;
    onPreviewFile: (file: ArticleFile) => void;
    onUpdateFiles: (files: ArticleFile[]) => void;
    onRevision: (opId: string, setup: SetupVariant) => void; // Trigger the modal in parent
}

const CollapsibleSection = ({
    title, icon: Icon, children, defaultOpen = true, badge
}: {
    title: string, icon: any, children?: React.ReactNode, defaultOpen?: boolean, badge?: React.ReactNode
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-slate-100 dark:border-slate-700 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-4 px-6 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-2xl ${isOpen ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                        <Icon size={18} />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-xs">{title}</span>
                    {badge}
                </div>
                <div className="text-slate-400 group-hover:text-blue-500 transition-colors">
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
            </button>
            {isOpen && (
                <div className="px-6 pb-8 pt-2 animate-in slide-in-from-top-2 duration-300">
                    {children}
                </div>
            )}
        </div>
    );
};

export const SetupDocumentView: React.FC<SetupDocumentViewProps> = ({
    article, setup, activeOpId, machines, mkgOperations, templates, isArticleObsolete, user,
    onUpdateSetup, onDuplicateSetup, onDeleteSetup, onSetDefault, onPreviewFile, onUpdateFiles, onRevision
}) => {
    const confirm = useConfirm();

    // --- Shared Logic ---
    const activeMachine = machines.find(m => m.id === setup.machineId);
    const mkgOp = mkgOperations.find(o => o.id === article.operations.find(op => op.id === activeOpId)?.mkgOperationCode);
    const isForceProcess = mkgOp?.operationType === 'PROCESS';
    const isProcessSetup = isForceProcess || (setup.setupTemplateId && !setup.machineId);

    const liveTemplate = setup.setupTemplateId
        ? templates.find(t => t.id === setup.setupTemplateId)
        : activeMachine?.setupTemplateId
            ? templates.find(t => t.id === activeMachine.setupTemplateId)
            : null;

    // Status Logic
    const currentStatus = setup.status || SetupStatus.DRAFT;
    const isArchived = currentStatus === SetupStatus.ARCHIVED;
    const isDraft = currentStatus === SetupStatus.DRAFT;
    const isSetupLocked = isArticleObsolete || !isDraft;
    const canManage = user?.role === UserRole.MANAGER || user?.role === UserRole.ADMIN;

    const effectiveFields = (isDraft && liveTemplate) ? (liveTemplate.fields || []) : (setup.frozenFields !== undefined ? setup.frozenFields : (liveTemplate?.fields || []));
    const effectiveToolFields = (isDraft && liveTemplate) ? (liveTemplate.toolFields || []) : (setup.frozenToolFields !== undefined ? setup.frozenToolFields : (liveTemplate?.toolFields || []));
    const effectiveSheetConfig = (isDraft && liveTemplate) ? liveTemplate.sheetConfig : setup.frozenSheetConfig;
    const isLegacyMode = setup.frozenFields === undefined && setup.frozenToolFields === undefined && !liveTemplate;

    // Update handler
    const handleUpdateSetupWrapper = (updates: Partial<SetupVariant>, customLog?: string) => onUpdateSetup(activeOpId, setup.id, updates, customLog);

    const [showNewToolModal, setShowNewToolModal] = useState(false);
    const [newToolOrderInput, setNewToolOrderInput] = useState('');

    const handleUpdateTool = (toolId: string, updates: any) => {
        const newTools = (setup.tools || []).map(t => t.id === toolId ? { ...t, ...updates } : t);
        const toolNum = setup.tools?.find(t => t.id === toolId)?.order || '?';
        handleUpdateSetupWrapper({ tools: newTools }, `Gereedschap T${toolNum} gewijzigd in Setup '${setup.name}'.`);
    };
    
    const handleAddTool = () => {
        setNewToolOrderInput(String((setup.tools?.length || 0) + 1));
        setShowNewToolModal(true);
    };

    const confirmAddTool = () => {
        const newOrder = parseInt(newToolOrderInput, 10);
        if (isNaN(newOrder) || newOrder < 1) {
            alert('Ongeldig gereedschapnummer. Vul een getal in groter dan 0.');
            return;
        }
        const id = generateId();
        const newTool = { id, order: newOrder, description: '', lifeTime: '', status: 'ACTIVE' as const };
        handleUpdateSetupWrapper({ tools: [...(setup.tools || []), newTool] }, `Nieuw gereedschap (T${newOrder}) toegevoegd aan Setup '${setup.name}'.`);
        setShowNewToolModal(false);
    };
    const handleDeleteTool = (id: string) => {
        const toolNum = setup.tools?.find(t => t.id === id)?.order || '?';
        handleUpdateSetupWrapper({ tools: (setup.tools || []).filter(t => t.id !== id) }, `Gereedschap T${toolNum} verwijderd uit Setup '${setup.name}'.`);
    };

    const changeStatus = (newStatus: SetupStatus) => {
        handleUpdateSetupWrapper({ status: newStatus }, `Vrijgavestatus van Setup '${setup.name}' gewijzigd naar ${newStatus}.`);
    };

    return (
        <div className="h-full flex flex-col">
            {/* F-02: Geëxtraheerde Header */}
            <SetupHeaderBar
                setup={setup}
                isProcessSetup={!!isProcessSetup}
                machineName={activeMachine?.name}
                machineNumber={activeMachine?.machineNumber}
                isArticleObsolete={isArticleObsolete}
                isArchived={isArchived}
                onSetDefault={() => onSetDefault(activeOpId, setup.id)}
                onDuplicate={() => onDuplicateSetup(activeOpId, setup)}
                onDelete={() => onDeleteSetup(activeOpId, setup.id)}
            />

            {/* F-02: Geëxtraheerde Status Bar (incl. vrijgave-modal) */}
            <SetupStatusBar
                setup={setup}
                canManage={canManage}
                fields={effectiveFields}
                templateData={setup.templateData || {}}
                toolFields={effectiveToolFields}
                onChangeStatus={changeStatus}
                onRevision={() => onRevision(activeOpId, setup)}
            />

            {/* SCROLLABLE DOCUMENT CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* 1. GENERAL INFO */}
                <CollapsibleSection title="Algemene Instellingen" icon={LayoutTemplate} defaultOpen={true}>
                    <SetupGeneralTab
                        setup={setup}
                        isLocked={isSetupLocked}
                        machines={machines}
                        templates={templates}
                        isForceProcess={isForceProcess}
                        onUpdate={handleUpdateSetupWrapper}
                    />
                </CollapsibleSection>

                {/* 2. FIXTURE / OPSPANNING */}
                {!isProcessSetup && (
                    <CollapsibleSection
                        title="Opspanning & Foto's"
                        icon={Hammer}
                        defaultOpen={false}
                        badge={setup.fixture?.images?.length ? <span className="text-[9px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded-full text-slate-500">{setup.fixture.images.length}</span> : null}
                    >
                        <SetupFixtureTab
                            articleId={article.id}
                            fields={effectiveFields}
                            templateName={liveTemplate?.name || 'Vastgelegd'}
                            updateStatus={'NONE'}
                            templateData={setup.templateData || {}}
                            images={setup.fixture?.images || []}
                            isLocked={isSetupLocked}
                            isProcessSetup={!!isProcessSetup}
                            hasMachine={!!setup.machineId}
                            onUpdateTemplateData={(k, v) => handleUpdateSetupWrapper({ templateData: { ...setup.templateData, [k]: v } }, `Opspanveld '${k}' gewijzigd in Setup '${setup.name}'.`)}
                            onUploadImage={async (files: FileList | File[], role: string) => {
                                if (!files || files.length === 0) return;

                                const newImages: ArticleFile[] = [...(setup.fixture?.images || [])];

                                for (let i = 0; i < files.length; i++) {
                                    const file = files[i];
                                    const reader = new FileReader();

                                    const filePromise = new Promise<ArticleFile | null>((resolve) => {
                                        reader.onload = async () => {
                                            try {
                                                let result = reader.result as string;
                                                if (file.type.startsWith('image/')) {
                                                    try {
                                                        result = await ImageProcessor.compress(result);
                                                    } catch (err) { console.warn('Compression failed', err); }
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
                                                    version: 1,
                                                    fileRole: role
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
                                    const processedFile = await filePromise;
                                    if (processedFile) {
                                        newImages.push(processedFile);
                                    }
                                }

                                handleUpdateSetupWrapper({
                                    fixture: {
                                        type: setup.fixture?.type || '',
                                        origin: setup.fixture?.origin || '',
                                        clampingForce: setup.fixture?.clampingForce || '',
                                        overhang: setup.fixture?.overhang || '',
                                        instructions: setup.fixture?.instructions || '',
                                        images: newImages
                                    }
                                }, `Nieuwe opspanfoto toegevoegd aan Setup '${setup.name}'.`);
                            }}
                            onDeleteImage={async (id) => {
                                const ok = await confirm({ title: 'Foto verwijderen', message: 'Verwijderen?' });
                                if (ok) {
                                    handleUpdateSetupWrapper({
                                        fixture: {
                                            type: setup.fixture?.type || '',
                                            origin: setup.fixture?.origin || '',
                                            clampingForce: setup.fixture?.clampingForce || '',
                                            overhang: setup.fixture?.overhang || '',
                                            instructions: setup.fixture?.instructions || '',
                                            images: (setup.fixture?.images || []).filter(img => img.id !== id)
                                        }
                                    }, `Opspanfoto verwijderd uit Setup '${setup.name}'.`);
                                }
                            }}
                            onPreviewImage={onPreviewFile}
                        />
                    </CollapsibleSection>
                )}

                {/* 3. TOOLS */}
                {!isProcessSetup && (
                    <CollapsibleSection
                        title="Gereedschappen"
                        icon={Wrench}
                        defaultOpen={false}
                        badge={<span className="text-[9px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded-full text-slate-500">{setup.tools?.filter(t => t.status !== 'REPLACED').length || 0}</span>}
                    >
                        <SetupToolsTab
                            tools={setup.tools || []}
                            isLocked={isSetupLocked}
                            toolFields={effectiveToolFields}
                            isLegacyMode={isLegacyMode}
                            templateName={liveTemplate?.name}
                            changeLog={setup.changeLog || []}
                            onUpdateTool={handleUpdateTool}
                            onAddTool={handleAddTool}
                            onDeleteTool={handleDeleteTool}
                            onUpdateSetup={handleUpdateSetupWrapper}
                            article={article}
                            setup={{ 
                                ...setup, 
                                frozenToolFields: effectiveToolFields, 
                                frozenSheetConfig: effectiveSheetConfig 
                            }}
                            machines={machines}
                        />
                    </CollapsibleSection>
                )}

                {/* 4. INSTRUCTIONS */}
                <CollapsibleSection
                    title="Werkinstructies"
                    icon={ClipboardList}
                    defaultOpen={false}
                    badge={<span className="text-[9px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded-full text-slate-500">{setup.steps?.length || 0}</span>}
                >
                    <SetupInstructionsTab
                        steps={setup.steps || []}
                        isLocked={isSetupLocked}
                        onUpdateSteps={(steps) => handleUpdateSetupWrapper({ steps }, `Werkinstructies bijgewerkt in Setup '${setup.name}'.`)}
                        onDeleteStep={(id) => handleUpdateSetupWrapper({ steps: setup.steps.filter(s => s.id !== id) }, `Werkinstructie verwijderd uit Setup '${setup.name}'.`)}
                        onAddStep={() => {
                            const newStep = { id: generateId(), order: (setup.steps?.length || 0) + 1, description: '', required: false };
                            handleUpdateSetupWrapper({ steps: [...(setup.steps || []), newStep] }, `Nieuwe werkinstructie toegevoegd aan Setup '${setup.name}'.`);
                        }}
                    />
                </CollapsibleSection>

                {/* 5. NC & CAM */}
                {!isProcessSetup && (
                    <CollapsibleSection title="NC Programma & CAM" icon={FileCode} defaultOpen={false}>
                        <SetupProgTab
                            articleId={article.id}
                            setup={setup}
                            allFiles={article.files || []}
                            isLocked={isSetupLocked}
                            user={user}
                            onUpdateFiles={onUpdateFiles}
                            onPreview={onPreviewFile}
                            onUpdateSetup={handleUpdateSetupWrapper}
                        />
                    </CollapsibleSection>
                )}
            </div>

            {/* New Tool Modal */}
            {showNewToolModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Nieuw Gereedschap (T-Nr)</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Voer het gereedschapnummer (T-nummer) in voor dit nieuwe gereedschap. Dit nummer kan later nog steeds worden gewijzigd.</p>
                            <input
                                type="number"
                                min="1"
                                autoFocus
                                value={newToolOrderInput}
                                onChange={e => setNewToolOrderInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && confirmAddTool()}
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-lg font-black text-slate-800 dark:text-white mb-6 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowNewToolModal(false)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-colors"
                                >
                                    Annuleren
                                </button>
                                <button
                                    onClick={confirmAddTool}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black transition-colors"
                                >
                                    Aanmaken
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
