/**
 * F-03: Geëxtraheerde modal-state uit SetupProgTab.
 * Centraliseert open/close logica voor 5 modals zodat SetupProgTab schoner wordt.
 */

import { useState, useCallback } from 'react';
import { ArticleFile, FileRole, DMSDocument } from '../types';
import { documentService } from '../services/db/documentService';

export const useProgModals = () => {
    // Reason Modal
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [changeReason, setChangeReason] = useState('');
    const [pendingFile, setPendingFile] = useState<{ file: File, role: FileRole } | null>(null);

    // Cancel Confirm Modal
    const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

    // Version History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyFile, setHistoryFile] = useState<ArticleFile | null>(null);
    const [historyDocs, setHistoryDocs] = useState<DMSDocument[]>([]);

    // Document Library Modal
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [libraryTargetRole, setLibraryTargetRole] = useState<FileRole | string | null>(null);

    // Document Rename Modal
    const [pendingRenameFile, setPendingRenameFile] = useState<{ file: File, role: FileRole, reason?: string } | null>(null);

    // --- Convenience Handlers ---

    const openReasonModal = useCallback((file: File, role: FileRole) => {
        setPendingFile({ file, role });
        setChangeReason('');
        setShowReasonModal(true);
    }, []);

    const closeReasonModal = useCallback(() => {
        setShowReasonModal(false);
        setPendingFile(null);
        setChangeReason('');
    }, []);

    const openVersionHistory = useCallback(async (file: ArticleFile) => {
        setHistoryFile(file);
        // Fetch previous versions docs
        const previousIds = file.previousVersions || [];
        if (previousIds.length > 0) {
            const docs = await documentService.getDocumentsByIds(previousIds);
            setHistoryDocs(docs);
        } else {
            setHistoryDocs([]);
        }
        setShowHistoryModal(true);
    }, []);

    const closeVersionHistory = useCallback(() => {
        setShowHistoryModal(false);
        setHistoryFile(null);
        setHistoryDocs([]);
    }, []);

    const openLibrary = useCallback((role: FileRole | string) => {
        setLibraryTargetRole(role);
        setShowLibraryModal(true);
    }, []);

    const closeLibrary = useCallback(() => {
        setShowLibraryModal(false);
        setLibraryTargetRole(null);
    }, []);

    const openRename = useCallback((file: File, role: FileRole, reason?: string) => {
        setPendingRenameFile({ file, role, reason });
    }, []);

    const closeRename = useCallback(() => {
        setPendingRenameFile(null);
    }, []);

    return {
        // Reason Modal
        showReasonModal, changeReason, pendingFile,
        setChangeReason, openReasonModal, closeReasonModal,

        // Cancel Confirm
        showCancelConfirmModal, setShowCancelConfirmModal,

        // Version History
        showHistoryModal, historyFile, historyDocs,
        openVersionHistory, closeVersionHistory,

        // Library
        showLibraryModal, libraryTargetRole,
        openLibrary, closeLibrary,

        // Rename
        pendingRenameFile,
        openRename, closeRename,
    };
};
