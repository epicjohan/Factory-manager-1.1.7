/**
 * D-10: Gecentraliseerde hook voor alle artikel-acties.
 * Extraheert ~350 regels business-logica uit ArticleManagement.tsx.
 * 
 * Bevat: updateCurrentArticle, handleSaveHeader, handleUpdateFiles,
 * handleUpdateSetup, revisies, duplicatie, archivering, etc.
 */

import { useState } from 'react';
import { db } from '../services/storage';
import { generateId, getNowISO } from '../services/db/core';
import { articleService, logArticleChange } from '../services/db/articleService';
import { useNotifications } from '../contexts/NotificationContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useAuth } from '../contexts/AuthContext';
import {
    Article, ArticleStatus, ArticleFile, ArticleOperation, Permission,
    SetupVariant, SetupStatus, SetupVerificationStatus, SetupChangeEntry,
    Machine, PredefinedOperation, SetupTemplate, OperationNote, FileRole
} from '../types';

interface UseArticleActionsProps {
    articles: Article[];
    machines: Machine[];
    mkgOperations: PredefinedOperation[];
    templates: SetupTemplate[];
    refreshArticles: () => void;
}

export const useArticleActions = ({
    articles, machines, mkgOperations, templates, refreshArticles
}: UseArticleActionsProps) => {
    const { user, hasPermission } = useAuth();
    const { addNotification } = useNotifications();
    const confirm = useConfirm();

    // State
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);

    // Permissions
    const canCreate = hasPermission(Permission.PDM_CREATE) || hasPermission(Permission.MANAGE_ARTICLES);
    const canEditAll = hasPermission(Permission.PDM_EDIT_ALL) || hasPermission(Permission.MANAGE_ARTICLES);
    const canEditOwn = hasPermission(Permission.PDM_EDIT_OWN);
    const canRelease = hasPermission(Permission.PDM_RELEASE) || hasPermission(Permission.MANAGE_ARTICLES);
    const canManageLock = hasPermission(Permission.PDM_MANAGE_LOCK) || hasPermission(Permission.MANAGE_ARTICLES);
    const canAddProcessStep = hasPermission(Permission.PDM_ADD_PROCESS) || hasPermission(Permission.MANAGE_ARTICLES);
    const canManageCatalog = canEditAll;

    const isOwner = editingArticle?.createdBy === user?.name;
    const hasEditRights = canEditAll || (canEditOwn && isOwner) || (!editingArticle && canCreate);
    const isLockedStatus = editingArticle?.status === ArticleStatus.LOCKED;
    const isObsolete = editingArticle?.status === ArticleStatus.OBSOLETE;
    const isLocked = !(!isLockedStatus && !isObsolete && hasEditRights);
    const canAddOperation = !isLocked || canAddProcessStep;

    // --- CORE UPDATE ---

    const updateCurrentArticle = async (transform: (art: Article) => Article, logMessage?: string) => {
        if (!editingArticle) return;
        let updated = transform(editingArticle);
        if (logMessage && user) {
            updated = logArticleChange(updated, logMessage);
        }
        await db.updateArticle(updated);
        setEditingArticle(updated);
    };

    // --- HEADER ---

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
            try {
                await db.addArticle(newArticle);
                setEditingArticle(newArticle);
            } catch (e) {
                addNotification('ERROR', 'Fout', (e as Error).message);
                return;
            }
        }
        refreshArticles();
    };

    // --- FILES ---

    const handleUpdateFiles = (newFiles: ArticleFile[], customLogMessage?: string) => {
        updateCurrentArticle(art => ({ ...art, files: newFiles }), customLogMessage || `Bestanden bijgewerkt.`);
    };

    // --- SETUP ---

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

    const handleSetDefaultSetup = (opId: string, setupId: string) => {
        updateCurrentArticle(art => ({
            ...art,
            operations: art.operations.map(op => {
                if (op.id !== opId) return op;
                const newSetups = op.setups.map(s => ({ ...s, isDefault: s.id === setupId }));
                const newDefaultSetup = newSetups.find(s => s.id === setupId);
                return { ...op, setups: newSetups, description: newDefaultSetup?.name || op.description };
            })
        }), "Standaard setup gewijzigd.");
    };

    const handleDeleteSetup = async (opId: string, setupId: string) => {
        const ok = await confirm({ title: 'Setup verwijderen', message: 'Weet je zeker dat je deze setup wilt verwijderen?' });
        if (ok) {
            const setupName = editingArticle?.operations.find(o => o.id === opId)?.setups.find(s => s.id === setupId)?.name || 'Setup';
            updateCurrentArticle(art => ({
                ...art, operations: art.operations.map(o => {
                    if (o.id !== opId) return o;
                    return { ...o, setups: o.setups.filter(s => s.id !== setupId) };
                })
            }), `Setup '${setupName}' verwijderd.`);
        }
        return true; // Signal for navigation reset
    };

    // --- OPERATIONS ---

    const confirmAddOperation = (type: 'MACHINE' | 'PROCESS', id: string) => {
        if (!editingArticle) return;

        let opName = 'Nieuwe Bewerking';
        let setupName = 'Nieuwe Setup';
        let mkgOperationCode = '';
        let machineId = '';
        let frozenFields = undefined;
        let frozenToolFields = undefined;
        let setupTemplateId = undefined;

        if (type === 'MACHINE') {
            const targetMachine = machines.find(m => m.id === id);
            machineId = id;
            opName = targetMachine ? `${targetMachine.name} (${targetMachine.machineNumber})` : 'Machine';
            setupName = targetMachine ? targetMachine.name : 'Standaard Setup';
            if (targetMachine?.setupTemplateId) {
                const tpl = templates.find(t => t.id === targetMachine.setupTemplateId);
                if (tpl) { 
                    frozenFields = tpl.fields; 
                    frozenToolFields = tpl.toolFields; 
                    setupTemplateId = targetMachine.setupTemplateId;
                }
            }
        } else {
            const catalogOp = mkgOperations.find(op => op.id === id);
            if (catalogOp) {
                opName = catalogOp.name;
                setupName = catalogOp.name;
                mkgOperationCode = catalogOp.id;
                if (catalogOp.setupTemplateId) {
                    setupTemplateId = catalogOp.setupTemplateId;
                    const tpl = templates.find(t => t.id === catalogOp.setupTemplateId);
                    if (tpl) { frozenFields = tpl.fields; frozenToolFields = tpl.toolFields; }
                }
            } else { opName = 'Proces'; setupName = 'Proces'; }
        }

        const newOrder = (editingArticle.operations.length + 1) * 10;
        const newSetupId = generateId();
        const newOpId = generateId();

        const newOp: ArticleOperation = {
            id: newOpId, order: newOrder, description: opName,
            mkgOperationCode,
            setups: [{
                id: newSetupId, name: setupName, machineId, setupTemplateId,
                status: SetupStatus.DRAFT, version: 1, isDefault: true,
                setupTimeMinutes: type === 'PROCESS' ? 0 : 30,
                cycleTimeMinutes: type === 'PROCESS' ? 10 : 2,
                steps: [], tools: [], frozenFields, frozenToolFields
            }]
        };

        updateCurrentArticle(art => ({ ...art, operations: [...art.operations, newOp] }),
            `Bewerking ${newOrder} toegevoegd (${type}: ${setupName}).`);

        return { opId: newOpId, setupId: newSetupId };
    };

    // --- REVISIONS ---

    const handleArticleRevision = async (reason: string) => {
        if (!editingArticle) return;
        try {
            const newId = await articleService.createNewRevision(editingArticle.id, reason);
            await refreshArticles();
            const allArticles = await articleService.getArticles();
            const newArticle = allArticles.find(a => a.id === newId);
            if (newArticle) {
                setEditingArticle(newArticle);
                return newArticle;
            }
        } catch (e) {
            addNotification('ERROR', 'Fout', 'Fout bij aanmaken revisie: ' + (e as Error).message);
        }
        return null;
    };

    const handleCreateSetupRevision = (opId: string, setup: SetupVariant, reason: string) => {
        if (!editingArticle) return null;

        const newVersion = (setup.version || 1) + 1;
        const newSetupId = generateId();
        const now = getNowISO();

        const logEntry: SetupChangeEntry = {
            id: generateId(), date: now, user: user?.name || 'Unknown',
            type: 'VERSION', description: `Nieuwe revisie v${newVersion} aangemaakt`, reason
        };

        const archivedSetup: SetupVariant = { ...setup, status: SetupStatus.ARCHIVED };
        const newSetup: SetupVariant = {
            ...setup, id: newSetupId, status: SetupStatus.DRAFT, version: newVersion,
            changeLog: [logEntry, ...(setup.changeLog || [])],
            verificationStatus: SetupVerificationStatus.UNVERIFIED,
            verifiedBy: undefined, verifiedDate: undefined,
            steps: [], tools: [], templateData: {}, fixture: undefined,
        };

        const associatedFiles = editingArticle.files.filter(f => f.setupId === setup.id);
        const newFiles = associatedFiles.map(f => ({
            ...f, id: generateId(), setupId: newSetupId,
            version: f.version, uploadDate: now,
            lockedBy: undefined, lockedAt: undefined
        }));

        updateCurrentArticle(art => {
            const updatedOps = art.operations.map(op => {
                if (op.id !== opId) return op;
                const newSetupsList = op.setups.map(s => s.id === setup.id ? archivedSetup : s);
                newSetupsList.unshift(newSetup);
                return { ...op, setups: newSetupsList };
            });
            return { ...art, operations: updatedOps, files: [...art.files, ...newFiles] };
        }, `Revisie v${newVersion} gemaakt voor setup: ${setup.name}`);

        return newSetupId;
    };

    // --- DUPLICATE ---

    const confirmDuplicateSetup = (opId: string, sourceSetup: SetupVariant, targetMachineId: string, mode: 'CLONE' | 'TEMPLATE') => {
        if (!editingArticle) return null;

        const targetMachine = machines.find(m => m.id === targetMachineId);
        const newMachineName = targetMachine ? targetMachine.name : 'Nieuwe Setup';
        const newSetupId = generateId();

        const newSetup: SetupVariant = {
            id: newSetupId, name: newMachineName, machineId: targetMachineId,
            status: SetupStatus.DRAFT, version: 1, isDefault: false,
            verificationStatus: SetupVerificationStatus.UNVERIFIED,
            setupTimeMinutes: sourceSetup.setupTimeMinutes,
            cycleTimeMinutes: sourceSetup.cycleTimeMinutes,
            steps: [], tools: [],
            setupTemplateId: targetMachine?.setupTemplateId,
        };

        if (targetMachine?.setupTemplateId) {
            const tpl = templates.find(t => t.id === targetMachine.setupTemplateId);
            if (tpl) { 
                newSetup.frozenFields = tpl.fields; 
                newSetup.frozenToolFields = tpl.toolFields; 
                newSetup.frozenSheetConfig = tpl.sheetConfig;
            }
        } else if (mode === 'CLONE') {
            newSetup.frozenFields = sourceSetup.frozenFields;
            newSetup.frozenToolFields = sourceSetup.frozenToolFields;
            newSetup.frozenSheetConfig = sourceSetup.frozenSheetConfig;
        }

        const newFiles: ArticleFile[] = [];

        if (mode === 'CLONE') {
            newSetup.steps = (sourceSetup.steps || []).map(s => ({ ...s, id: generateId() }));
            newSetup.tools = (sourceSetup.tools || []).map(t => ({ ...t, id: generateId() }));
            newSetup.templateData = { ...sourceSetup.templateData };
            const sourceFiles = editingArticle.files.filter(f => f.setupId === sourceSetup.id);
            sourceFiles.forEach(f => {
                newFiles.push({ ...f, id: generateId(), setupId: newSetupId, uploadDate: new Date().toISOString(), uploadedBy: user?.name || 'System' });
            });
        }

        updateCurrentArticle(art => {
            const updatedOps = art.operations.map(op => {
                if (op.id !== opId) return op;
                return { ...op, setups: [...op.setups, newSetup] };
            });
            return { ...art, operations: updatedOps, files: [...art.files, ...newFiles] };
        }, `Setup ${sourceSetup.name} gedupliceerd naar ${newMachineName} (${mode}).`);

        return newSetupId;
    };

    // --- ARCHIVE ---

    const handleArchiveArticle = async () => {
        if (!editingArticle) return;
        const ok = await confirm({ title: 'Artikel archiveren', message: 'Weet je zeker dat je dit artikel wilt archiveren? Het artikel wordt volledig alleen-lezen.' });
        if (ok) {
            const upd = await articleService.updateArticleStatus(editingArticle.id, ArticleStatus.OBSOLETE);
            if (upd) setEditingArticle(upd);
        }
    };

    // --- NOTES ---

    const handleAddNote = async (opId: string, note: OperationNote) => {
        if (!editingArticle) return;
        const updatedOps = editingArticle.operations.map(op =>
            op.id === opId ? { ...op, notes: [note, ...(op.notes || [])] } : op
        );
        const updated = { ...editingArticle, operations: updatedOps };
        setEditingArticle(updated);
        await articleService.updateArticle(updated);
    };

    const handleUpdateNote = async (opId: string, noteId: string, updates: Partial<OperationNote>) => {
        if (!editingArticle) return;
        const updatedOps = editingArticle.operations.map(op => {
            if (op.id !== opId) return op;
            return {
                ...op,
                notes: (op.notes || []).map(n => n.id === noteId ? { ...n, ...updates } : n)
            };
        });
        const updated = { ...editingArticle, operations: updatedOps };
        setEditingArticle(updated);
        await articleService.updateArticle(updated);
    };

    // --- STATUS ---

    const handleChangeStatus = async (status: ArticleStatus) => {
        if (!editingArticle) return;
        const upd = await articleService.updateArticleStatus(editingArticle.id, status);
        if (upd) setEditingArticle(upd);
    };

    return {
        // State
        editingArticle, setEditingArticle,

        // Permissions
        canCreate, canEditAll, canRelease, canManageLock, canManageCatalog,
        hasEditRights, isLocked, isObsolete, canAddOperation,

        // Actions
        updateCurrentArticle,
        handleSaveHeader,
        handleUpdateFiles,
        handleUpdateSetup,
        handleSetDefaultSetup,
        handleDeleteSetup,
        confirmAddOperation,
        handleArticleRevision,
        handleCreateSetupRevision,
        confirmDuplicateSetup,
        handleArchiveArticle,
        handleAddNote,
        handleUpdateNote,
        handleChangeStatus,

        // Utils
        user,
    };
};
