
import React, { useState } from 'react';
import { SetupVariant, Machine, PredefinedOperation, SetupTemplate, Article, ArticleFile, SetupStatus, UserRole } from '../../types';
import { ChevronDown, ChevronRight, LayoutTemplate, Wrench, Hammer, ClipboardList, FileCode, CheckCircle2, AlertTriangle, Trash2, Box, Monitor, Copy, Star, GitBranch, ShieldCheck, History, Lock } from '../../icons';
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

    // --- Shared Logic from SetupEditor ---
    const activeMachine = machines.find(m => m.id === setup.machineId);
    const mkgOp = mkgOperations.find(o => o.id === article.operations.find(op => op.id === activeOpId)?.mkgOperationCode);
    const isForceProcess = mkgOp?.operationType === 'PROCESS';
    const isProcessSetup = isForceProcess || (setup.setupTemplateId && !setup.machineId);

    const liveTemplate = setup.setupTemplateId
        ? templates.find(t => t.id === setup.setupTemplateId)
        : activeMachine?.setupTemplateId
            ? templates.find(t => t.id === activeMachine.setupTemplateId)
            : null;

    const effectiveFields = setup.frozenFields !== undefined ? setup.frozenFields : (liveTemplate?.fields || []);
    const effectiveToolFields = setup.frozenToolFields !== undefined ? setup.frozenToolFields : (liveTemplate?.toolFields || []);

    // Legacy mode is when we have NO captured frozen state AND no live template attached
    const isLegacyMode = setup.frozenFields === undefined && setup.frozenToolFields === undefined && !liveTemplate;

    // Status Logic
    const currentStatus = setup.status || SetupStatus.DRAFT;
    const isArchived = currentStatus === SetupStatus.ARCHIVED;
    const isReleased = currentStatus === SetupStatus.RELEASED;
    const isReview = currentStatus === SetupStatus.REVIEW;
    const isDraft = currentStatus === SetupStatus.DRAFT;

    // Setup Lock: Alleen geblokkeerd als artikel OBSOLETE is, of als de setup zelf niet in DRAFT staat.
    // Artikel LOCKED heeft GEEN invloed — operators moeten setups kunnen blijven bewerken.
    const isSetupLocked = isArticleObsolete || !isDraft;

    const canManage = user?.role === UserRole.MANAGER || user?.role === UserRole.ADMIN;

    // Bevestigingsmodal voor vrijgeven
    const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);

    // Update handlers wrappers
    const handleUpdateSetupWrapper = (updates: Partial<SetupVariant>, customLog?: string) => onUpdateSetup(activeOpId, setup.id, updates, customLog);

    const handleUpdateTool = (toolId: string, updates: any) => {
        const newTools = (setup.tools || []).map(t => t.id === toolId ? { ...t, ...updates } : t);
        const toolNum = setup.tools?.find(t => t.id === toolId)?.order || '?';
        handleUpdateSetupWrapper({ tools: newTools }, `Gereedschap T${toolNum} gewijzigd in Setup '${setup.name}'.`);
    };
    const handleAddTool = () => {
        const newOrder = (setup.tools?.length || 0) + 1;
        const id = Math.random().toString(36).substr(2, 9);
        const newTool = { id, order: newOrder, description: '', lifeTime: '', status: 'ACTIVE' as const };
        handleUpdateSetupWrapper({ tools: [...(setup.tools || []), newTool] }, `Nieuw gereedschap (T${newOrder}) toegevoegd aan Setup '${setup.name}'.`);
    };
    const handleDeleteTool = (id: string) => {
        const toolNum = setup.tools?.find(t => t.id === id)?.order || '?';
        handleUpdateSetupWrapper({ tools: (setup.tools || []).filter(t => t.id !== id) }, `Gereedschap T${toolNum} verwijderd uit Setup '${setup.name}'.`);
    };

    // Workflow Actions
    const changeStatus = (newStatus: SetupStatus) => {
        handleUpdateSetupWrapper({ status: newStatus }, `Vrijgavestatus van Setup '${setup.name}' gewijzigd naar ${newStatus}.`);
    };

    return (
        <div className="h-full flex flex-col">
            {/* DOCUMENT HEADER */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{setup.name}</h1>
                        {setup.isDefault && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                <CheckCircle2 size={12} /> Standaard
                            </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                            v{setup.version || 1}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-500">
                        {isProcessSetup ? <Box size={14} /> : <Monitor size={14} />}
                        {isProcessSetup ? 'Proces Instructie' : activeMachine ? `${activeMachine.name} (${activeMachine.machineNumber})` : 'Geen machine geselecteerd'}
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isArticleObsolete && !isArchived && (
                        <>
                            {!setup.isDefault && (
                                <button
                                    onClick={() => onSetDefault(activeOpId, setup.id)}
                                    className="px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 hover:border-emerald-500 rounded-2xl transition-all flex items-center gap-2 shadow-sm mr-2"
                                    title="Stel in als standaard route"
                                >
                                    <Star size={14} /> <span className="hidden sm:inline">Gebruik als Standaard</span>
                                </button>
                            )}
                            <button
                                onClick={() => onDuplicateSetup(activeOpId, setup)}
                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-colors"
                                title="Setup Dupliceren"
                            >
                                <Copy size={20} />
                            </button>
                            <button
                                onClick={() => onDeleteSetup(activeOpId, setup.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                                title="Setup Verwijderen"
                            >
                                <Trash2 size={20} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* STATUS WORKFLOW BAR */}
            <div className={`px-6 py-3 flex items-center justify-between border-b ${isDraft ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900' :
                isReview ? 'bg-yellow-50/50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900' :
                    isReleased ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900' :
                        'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-2xl ${isDraft ? 'bg-orange-100 text-orange-600' :
                        isReview ? 'bg-yellow-100 text-yellow-600' :
                            isReleased ? 'bg-green-100 text-green-600' :
                                'bg-slate-200 text-slate-500'
                        }`}>
                        {isReleased ? <ShieldCheck size={16} /> : isArchived ? <History size={16} /> : <AlertTriangle size={16} />}
                    </div>
                    <div>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${isDraft ? 'text-orange-600' : isReview ? 'text-yellow-600' : isReleased ? 'text-green-600' : 'text-slate-500'
                            }`}>
                            STATUS: {setup.status || 'DRAFT'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                            {isDraft ? 'Gereed voor bewerking' : isReview ? 'Wacht op goedkeuring' : isReleased ? 'Vrijgegeven voor productie' : 'Gearchiveerde versie'}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* DRAFT -> REVIEW */}
                    {/* NOTE: artikel-lock heeft géén invloed op setup-statuswijzigingen */}
                    {isDraft && (
                        <button
                            onClick={() => changeStatus(SetupStatus.REVIEW)}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm transition-all active:scale-95"
                        >
                            Ter Review Aanbieden
                        </button>
                    )}

                    {/* REVIEW -> RELEASE / DRAFT */}
                    {isReview && canManage && (
                        <>
                            <button
                                onClick={() => changeStatus(SetupStatus.DRAFT)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                Afkeuren
                            </button>
                            <button
                                onClick={() => setShowReleaseConfirm(true)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm transition-all active:scale-95"
                            >
                                Goedkeuren &amp; Vrijgeven
                            </button>
                        </>
                    )}

                    {/* RELEASED -> NEW VERSION */}
                    {isReleased && (
                        <button
                            onClick={() => onRevision(activeOpId, setup)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-2 transition-all active:scale-95"
                        >
                            <GitBranch size={14} /> Nieuwe Versie
                        </button>
                    )}

                    {/* ARCHIVED INFO */}
                    {isArchived && (
                        <span className="px-3 py-1.5 bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                            Alleen Lezen
                        </span>
                    )}
                </div>
            </div>

            {/* SCROLLABLE DOCUMENT CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* 1. GENERAL INFO - OPEN BY DEFAULT */}
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

                {/* 2. FIXTURE / OPSPANNING (Only for Machining) - CLOSED BY DEFAULT */}
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

                                                // Use Relational DMS instead of raw Base64 injection
                                                const doc = await documentService.addDocumentFromBase64(file.name, file.type, result, file.size);

                                                resolve({
                                                    id: generateId(),
                                                    documentId: doc.id,
                                                    setupId: setup.id,
                                                    name: file.name,
                                                    type: file.type,
                                                    url: '', // Clean architecture
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

                {/* 3. TOOLS - CLOSED BY DEFAULT */}
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
                            setup={setup}
                            machines={machines}
                        />
                    </CollapsibleSection>
                )}

                {/* 4. INSTRUCTIONS - CLOSED BY DEFAULT */}
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
                            const newStep = { id: Math.random().toString(36), order: (setup.steps?.length || 0) + 1, description: '', required: false };
                            handleUpdateSetupWrapper({ steps: [...(setup.steps || []), newStep] }, `Nieuwe werkinstructie toegevoegd aan Setup '${setup.name}'.`);
                        }}
                    />
                </CollapsibleSection>

                {/* 5. NC & CAM - CLOSED BY DEFAULT */}
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
            {/* VRIJGAVE BEVESTIGINGSMODAL */}
            {showReleaseConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in duration-200 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 bg-green-50 dark:bg-green-900/20">
                            <div className="p-3 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-xl">
                                <Lock size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Setup Vrijgeven</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Deze actie kan niet ongedaan worden gemaakt</p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Je staat op het punt <span className="text-green-600 dark:text-green-400 font-black">{setup.name}</span> vrij te geven voor productie.
                            </p>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
                                {/* Waarschuwing header */}
                                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200 dark:border-amber-800 bg-amber-100/60 dark:bg-amber-900/40">
                                    <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Wat betekent vrijgeven?</span>
                                </div>

                                {/* Punten */}
                                <div className="divide-y divide-amber-100 dark:divide-amber-900/50">
                                    <div className="flex items-start gap-3 px-4 py-3">
                                        <Lock size={15} className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-black text-amber-800 dark:text-amber-300">Setup wordt vergrendeld</p>
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Alle velden zijn na vrijgave niet meer aanpasbaar.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 px-4 py-3">
                                        <GitBranch size={15} className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-black text-amber-800 dark:text-amber-300">Wijzigingen via nieuwe versie</p>
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Gebruik "Nieuwe Versie" om aanpassingen te maken na vrijgave.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 px-4 py-3">
                                        <ShieldCheck size={15} className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-black text-amber-800 dark:text-amber-300">Zichtbaar op de productievloer</p>
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">De vrijgegeven versie is direct beschikbaar voor operators.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                            <button
                                onClick={() => setShowReleaseConfirm(false)}
                                className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-all"
                            >
                                Annuleren
                            </button>
                            <button
                                onClick={() => { changeStatus(SetupStatus.RELEASED); setShowReleaseConfirm(false); }}
                                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-sm shadow-lg shadow-green-500/30 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <ShieldCheck size={16} /> Bevestigen &amp; Vrijgeven
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
