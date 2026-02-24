import React, { useEffect, useState } from 'react';
import { History, X, Download, FileCode, Clock } from '../../../icons';
import { ArticleFile, DMSDocument } from '../../../types';
import { documentService } from '../../../services/db/documentService';
import { SyncService } from '../../../services/sync';
import { KEYS } from '../../../services/db/core';

interface DocumentVersionModalProps {
    file: ArticleFile;
    isOpen: boolean;
    onClose: () => void;
    serverUrl?: string;
    parentRecordId: string; // The Article or Setup ID for resolving the proxy URL
}

export const DocumentVersionSequenceModal: React.FC<DocumentVersionModalProps> = ({ file, isOpen, onClose, serverUrl, parentRecordId }) => {
    const [historicalDocs, setHistoricalDocs] = useState<DMSDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !file.previousVersions || file.previousVersions.length === 0) return;

        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                // Fetch all documents from the previousVersions array
                const docs = await documentService.getDocumentsByIds(file.previousVersions!);

                // Keep them in the order they were in the array (assuming chronological)
                // The newest previous version is at the end of the array, so we might want to reverse it to show newest-first
                setHistoricalDocs(docs.reverse());
            } catch (err) {
                console.error("Failed to load historical documents:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [isOpen, file.previousVersions]);

    if (!isOpen) return null;

    const handleDownload = (doc: DMSDocument, idx: number) => {
        // Construct a temporary ArticleFile-like structure just for the URL resolver
        const tempFile = {
            url: '', // We don't have a direct URL, but the resolver knows how to handle documentIds
            documentId: doc.id
        };
        // Resolve URL using SyncService directly against the DOCUMENTS table
        const url = SyncService.resolveFileUrl(doc.id, doc.name, KEYS.DOCUMENTS, serverUrl);

        if (!url) return;

        const link = document.createElement('a');
        link.href = url;
        // Prefix with version number to distinguish
        // If there are 3 previous versions, reversing them means index 0 is V3, index 1 is V2, index 2 is V1
        // We know the current file is V4.
        const histVersion = (file.previousVersions?.length || 0) - idx;
        link.download = `V${histVersion}_${doc.name}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl relative border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">

                <button onClick={onClose} className="absolute right-6 top-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors active:scale-95">
                    <X size={20} />
                </button>

                <div className="flex items-center gap-4 mb-8 shrink-0">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-800/50">
                        <History size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Bestandshistorie</h3>
                        <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mt-1">Eerdere versies van {file.name}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-3">
                    {/* CURRENT VERSION HEADER */}
                    <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-[2rem] border border-emerald-200 dark:border-emerald-800/50">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <FileCode size={20} className="text-emerald-600 shrink-0" />
                            <div className="truncate">
                                <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest block">Huidige Versie (V{file.version})</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                            </div>
                        </div>
                        <div className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest text-right shrink-0">
                            Actief
                        </div>
                    </div>

                    <div className="py-2 flex items-center gap-2 px-2 opacity-50">
                        <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1"></div>
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Oudere Versies</span>
                        <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1"></div>
                    </div>

                    {/* HISTORICAL VERSIONS */}
                    {isLoading ? (
                        <div className="py-8 flex justify-center">
                            <div className="w-8 h-8 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 animate-spin"></div>
                        </div>
                    ) : historicalDocs.length > 0 ? (
                        historicalDocs.map((doc, idx) => {
                            const historicalVersionNum = (file.previousVersions?.length || 0) - idx;
                            return (
                                <div key={doc.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-colors group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center justify-center shrink-0 font-black text-xs border border-slate-200 dark:border-slate-700">
                                            V{historicalVersionNum}
                                        </div>
                                        <div className="truncate">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate block">{doc.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type: {doc.type || 'Onbekend'}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDownload(doc, idx)}
                                        className="p-3 bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 rounded-[2rem] transition-all border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
                                        title="Download oude versie"
                                    >
                                        <Download size={18} />
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
                            <History size={48} className="mb-4 opacity-20" />
                            <p className="text-xs font-black uppercase tracking-widest">Geen eerdere versies gevonden</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
