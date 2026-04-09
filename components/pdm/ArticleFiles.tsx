
import React, { useState } from 'react';
import { FileText, AlertTriangle } from '../../icons';
import { ArticleFile, DMSDocument } from '../../types';
import { generateId, KEYS } from '../../services/db/core';
import { ImageProcessor } from '../../services/db/imageProcessor';
import { documentService } from '../../services/db/documentService';
import { SleekDocumentList } from './ui/SleekDocumentList';
import { downloadFile } from '../../utils/fileUtils';

interface ArticleFilesProps {
    articleId?: string;
    files: ArticleFile[];
    isLocked: boolean;
    onUpdate: (files: ArticleFile[], customLogMessage?: string) => void;
    onPreview: (file: ArticleFile) => void;
    user: any;
}

/**
 * Beheert alleen de BRON bestanden op Artikel niveau (PDF, STEP).
 * Geen lock-systeem nodig, aangezien dit vaste klantdata is.
 */
export const ArticleFiles: React.FC<ArticleFilesProps> = ({ articleId, files, isLocked, onUpdate, onPreview, user }) => {
    const [fileToDelete, setFileToDelete] = useState<ArticleFile | null>(null);

    // Filter alleen de bronbestanden (zonder setupId)
    const sourceFiles = files.filter(f => !f.setupId);

    const handleFiles = async (fileList: FileList | File[], role: string) => {
        if (!fileList || isLocked) return;

        const newFilesList: ArticleFile[] = [...files];

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

                        // Sla daadwerkelijke data op in Documents store
                        const doc = await documentService.addDocumentFromBase64(file.name, file.type, result, file.size);

                        resolve({
                            id: generateId(),
                            documentId: doc.id,
                            name: file.name,
                            type: file.type,
                            uploadedBy: user?.name || 'Onbekend',
                            uploadDate: new Date().toISOString(),
                            fileRole: role,
                            version: 1
                        });
                    } catch (e) {
                        console.error('Error processing file', e);
                        resolve(null);
                    }
                };
                reader.onerror = () => {
                    resolve(null);
                }
                reader.readAsDataURL(file);
            });

            const processedFile = await filePromise;
            if (processedFile) newFilesList.push(processedFile);
        }

        onUpdate(newFilesList, `${fileList.length} bronbestand(en) toegevoegd.`);
    };

    const handleSelectLibraryDoc = async (doc: DMSDocument, role: string) => {
        if (isLocked) return;

        const newFile: ArticleFile = {
            id: generateId(),
            documentId: doc.id,
            name: doc.name,
            type: doc.type,
            uploadedBy: user?.name || 'Onbekend',
            uploadDate: new Date().toISOString(),
            fileRole: role,
            version: 1
        };

        const newFilesList = [...files, newFile];
        onUpdate(newFilesList, `Bibliotheek document '${doc.name}' (${role}) gekoppeld.`);
    };

    const handleDeleteClick = (id: string) => {
        if (isLocked) return;
        const file = sourceFiles.find(f => f.id === id);
        if (file) setFileToDelete(file);
    };

    const confirmDelete = () => {
        if (!fileToDelete) return;
        onUpdate(files.filter(f => f.id !== fileToDelete.id), `Bestand '${fileToDelete.name}' ontkoppeld/verwijderd.`);
        setFileToDelete(null);
    };

    const handleDownload = (file: ArticleFile) => downloadFile(file);

    const handleSetThumbnail = (fileId: string) => {
        // Toggle: if clicking the current thumbnail, deselect it; otherwise set new one
        const updated = files.map(f => ({
            ...f,
            isThumbnail: f.id === fileId ? !f.isThumbnail : false
        }));
        onUpdate(updated, `Thumbnail ingesteld.`);
    };

    return (
        <div className="animate-in fade-in duration-300 text-left">
            <SleekDocumentList
                title={<><FileText size={20} className="text-blue-600" /> Bron-Documentatie</>}
                subtitle="Klantbestanden & Specificaties (Read-Only Copy)"
                files={sourceFiles}
                applicableTo="ARTICLE"
                defaultCategoryCode="DRAWING"
                parentRecordId={articleId}
                tableKey={KEYS.ARTICLES}
                isLocked={isLocked}
                onUpload={handleFiles}
                onDelete={handleDeleteClick}
                onPreview={onPreview}
                onDownload={downloadFile}
                onLinkDocument={handleSelectLibraryDoc}
                onSetThumbnail={handleSetThumbnail}
            />

            {sourceFiles.length === 0 && isLocked && (
                <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
                    <FileText size={40} className="text-slate-300 dark:text-slate-700 mb-4" />
                    <p className="text-slate-500 font-black text-xs uppercase tracking-[0.2em]">Geen bronbestanden geüpload</p>
                </div>
            )}

            {/* DELETE CONFIRM MODAL */}
            {fileToDelete && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative border-2 border-red-500">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Bestand Verwijderen?</h3>
                            <p className="text-xs font-bold text-slate-500 mt-2">
                                Weet u zeker dat u <strong className="text-slate-800 dark:text-white">{fileToDelete.name}</strong> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setFileToDelete(null)} className="flex-1 py-3 text-slate-500 font-bold uppercase text-xs rounded-[2rem] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                Annuleren
                            </button>
                            <button onClick={confirmDelete} className="flex-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-lg transition-all">
                                Verwijderen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
