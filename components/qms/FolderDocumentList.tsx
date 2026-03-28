import React, { useState, useMemo, useRef } from 'react';
import { Upload, FileText, Trash2, Eye, FileSearch, Link as LinkIcon, Image, FileCode } from '../../icons';
import { QmsFolder, DMSDocument } from '../../types';
import { db } from '../../services/storage';
import { useTable } from '../../hooks/useTable';
import { KEYS } from '../../services/db/core';
import { documentService } from '../../services/db/documentService';
import { DocumentLibraryModal } from '../pdm/modals/DocumentLibraryModal';
import { useConfirm } from '../../contexts/ConfirmContext';

interface FolderDocumentListProps {
    folder: QmsFolder;
}

const getDocIcon = (type: string = '') => {
    if (type.startsWith('image/')) return <Image size={18} className="text-blue-500" />;
    if (type.includes('pdf')) return <FileText size={18} className="text-red-500" />;
    if (type.includes('nc') || type.includes('cam')) return <FileCode size={18} className="text-orange-500" />;
    return <FileText size={18} className="text-blue-600" />;
};

export const FolderDocumentList: React.FC<FolderDocumentListProps> = ({ folder }) => {
    const { data: allDocs } = useTable<DMSDocument>(KEYS.DOCUMENTS);
    const confirm = useConfirm();
    const [isUploading, setIsUploading] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter documents attached to this folder
    const folderDocs = useMemo(() => {
        if (!folder.documents || !Array.isArray(folder.documents)) return [];
        return folder.documents
            .map(docId => allDocs.find(d => d.id === docId))
            .filter(Boolean) as DMSDocument[];
    }, [folder.documents, allDocs]);

    // --- Helpers ---

    const updateFolder = async (newDocIds: string[]) => {
        const updatedFolder: QmsFolder = {
            ...folder,
            documents: newDocIds,
            updated: new Date().toISOString().replace('T', ' ').split('.')[0]
        };
        await db.updateQmsFolder(updatedFolder);
    };

    // --- Handlers ---

    const handleUploadClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const uploadedIds: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const dmsDoc = await new Promise<DMSDocument | null>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = async () => {
                        try {
                            const doc = await documentService.addDocumentFromBase64(
                                file.name, file.type, reader.result as string, file.size
                            );
                            resolve(doc);
                        } catch {
                            resolve(null);
                        }
                    };
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(file);
                });

                if (dmsDoc) uploadedIds.push(dmsDoc.id);
            }

            if (uploadedIds.length > 0) {
                await updateFolder([...(folder.documents || []), ...uploadedIds]);
            }
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleLinkFromLibrary = async (doc: DMSDocument) => {
        setShowLibrary(false);
        if ((folder.documents || []).includes(doc.id)) return; // already linked
        await updateFolder([...(folder.documents || []), doc.id]);
    };

    const handleDelete = async (docId: string) => {
        const ok = await confirm({
            title: 'Document ontkoppelen',
            message: 'Weet je zeker dat je dit document wilt ontkoppelen van deze map? Het document blijft bestaan in de bibliotheek.',
            confirmLabel: 'Ontkoppelen'
        });
        if (ok) {
            const newIds = (folder.documents || []).filter(id => id !== docId);
            await updateFolder(newIds);
        }
    };

    const handlePreview = (doc: DMSDocument) => {
        // doc.url holds Base64 (local) OR a remote URL after sync
        if (!doc.url) return;
        const url = doc.url;

        if (url.startsWith('data:') || url.startsWith('http')) {
            const isImage = (doc.type || '').startsWith('image/');
            const isPdf = (doc.type || '').includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');

            if (isImage) {
                // Open as image in new tab
                const win = window.open('', '_blank');
                if (win) win.document.write(`<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh"><img src="${url}" style="max-width:100%;max-height:100%" /></body></html>`);
            } else if (isPdf) {
                const win = window.open('', '_blank');
                if (win) win.document.write(`<html><body style="margin:0;height:100vh"><iframe src="${url}" style="width:100%;height:100%;border:none"></iframe></body></html>`);
            } else {
                // Generic download-open for other types
                window.open(url, '_blank');
            }
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/50 p-2 rounded-xl">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">
                    {folderDocs.length} Document{folderDocs.length !== 1 ? 'en' : ''}
                </span>

                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowLibrary(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Bestaand document uit DMS koppelen"
                    >
                        <LinkIcon size={14} /> Koppel uit Bibliotheek
                    </button>

                    <button
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
                    >
                        {isUploading ? (
                            <span className="animate-pulse">Uploaden...</span>
                        ) : (
                            <><Upload size={14} /> Uploaden</>
                        )}
                    </button>
                </div>
            </div>

            {/* Document List */}
            {folderDocs.length === 0 ? (
                <div className="py-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <FileSearch className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={32} />
                    <p className="text-sm font-medium text-slate-500">Geen documenten in deze map</p>
                    <p className="text-xs text-slate-400 mt-1">Upload nieuwe bestanden of koppel bestaande vanuit de bibliotheek.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {folderDocs.map(doc => (
                        <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
                        >
                            <button
                                onClick={() => handlePreview(doc)}
                                className="flex items-center gap-3 overflow-hidden flex-1 text-left group/preview"
                                title="Klik om te bekijken"
                            >
                                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg shrink-0 border border-slate-100 dark:border-slate-700 group-hover/preview:bg-blue-50 dark:group-hover/preview:bg-blue-900/30 transition-colors">
                                    {getDocIcon(doc.type)}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate group-hover/preview:text-blue-600 dark:group-hover/preview:text-blue-400 transition-colors">
                                        {doc.name}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 font-mono">
                                        {doc.size ? (doc.size / 1024 / 1024).toFixed(2) : '—'} MB
                                        {doc.documentNumber && (
                                            <span className="ml-2 text-blue-500 font-bold">{doc.documentNumber}</span>
                                        )}
                                    </p>
                                </div>
                            </button>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button
                                    onClick={() => handlePreview(doc)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                    title="Bekijken"
                                >
                                    <Eye size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(doc.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    title="Ontkoppelen"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* DMS Library Modal */}
            {showLibrary && (
                <DocumentLibraryModal
                    onClose={() => setShowLibrary(false)}
                    onSelect={handleLinkFromLibrary}
                />
            )}
        </div>
    );
};
