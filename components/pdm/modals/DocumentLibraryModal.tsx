import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, FileText, Camera, Hammer, Image, FileCode, CheckCircle2, UserCircle, Archive, Box, LayoutTemplate } from '../../../icons';
import { documentService } from '../../../services/db/documentService';
import { DMSDocument } from '../../../types';

interface DocumentLibraryModalProps {
    onClose: () => void;
    onSelect: (doc: DMSDocument) => void;
}

export type LibraryFilterType = 'ALL' | 'IMAGE' | 'PDF' | 'CODE' | 'OTHER';

export const DocumentLibraryModal: React.FC<DocumentLibraryModalProps> = ({ onClose, onSelect }) => {
    const [documents, setDocuments] = useState<DMSDocument[]>([]);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<LibraryFilterType>('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchDocs = async () => {
            try {
                // D-04: Gebruik searchDocuments i.p.v. getDocuments + lokale filter
                const docs = await documentService.searchDocuments(search);
                if (isMounted) {
                    setDocuments(docs.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()));
                    setLoading(false);
                }
            } catch (e) {
                console.error("Fout bij laden bibliotheek", e);
                if (isMounted) setLoading(false);
            }
        };
        fetchDocs();
        return () => { isMounted = false; };
    }, [search]);

    const filteredDocs = useMemo(() => {
        // D-04: Text search is nu al afgehandeld door searchDocuments in de service
        // Hier alleen nog het type-filter toepassen
        return documents.filter(d => {
            if (typeFilter === 'ALL') return true;

            const t = (d.type || '').toLowerCase();
            const n = d.name.toLowerCase();

            const isImage = t.startsWith('image/');
            const isPdf = t.includes('pdf') || n.endsWith('.pdf');
            const isCode = t.includes('nc') || t.includes('cam') || n.endsWith('.nc') || n.endsWith('.txt') || n.endsWith('.cam');

            switch (typeFilter) {
                case 'IMAGE': return isImage;
                case 'PDF': return isPdf;
                case 'CODE': return isCode;
                case 'OTHER': return !isImage && !isPdf && !isCode;
                default: return true;
            }
        });
    }, [documents, typeFilter]);

    const getIcon = (type: string) => {
        if (type.startsWith('image/')) return <Image size={24} className="text-blue-500" />;
        if (type.includes('pdf')) return <FileText size={24} className="text-red-500" />;
        if (type.includes('nc') || type.includes('cam')) return <FileCode size={24} className="text-orange-500" />;
        return <FileText size={24} className="text-slate-500" />;
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2rem] p-8 shadow-2xl relative border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors z-10">
                    <X size={20} />
                </button>

                <div className="mb-8 pr-12">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Kies uit Bibliotheek</h3>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Koppel een bestaand bestand uit de centrale database</p>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Zoek op bestandsnaam of documentnummer (DOC-2026-...)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                    />
                </div>

                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {(['ALL', 'IMAGE', 'PDF', 'CODE', 'OTHER'] as LibraryFilterType[]).map(filter => {
                        const isActive = typeFilter === filter;
                        let icon = null;
                        let label = '';
                        switch (filter) {
                            case 'ALL': label = 'Alle'; icon = <Archive size={14} />; break;
                            case 'IMAGE': label = "Foto's"; icon = <Image size={14} />; break;
                            case 'PDF': label = "PDF's"; icon = <FileText size={14} />; break;
                            case 'CODE': label = 'NC / CAM'; icon = <FileCode size={14} />; break;
                            case 'OTHER': label = 'Overige'; icon = <Box size={14} />; break;
                        }

                        return (
                            <button
                                key={filter}
                                onClick={() => setTypeFilter(filter)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${isActive
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600'
                                    }`}
                            >
                                {icon} {label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="py-12 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                            Bibliotheek laden...
                        </div>
                    ) : filteredDocs.length > 0 ? (
                        filteredDocs.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-md group">
                                <div className="flex items-center gap-4 min-w-0 pr-4">
                                    <div className="w-12 h-12 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700">
                                        {getIcon(doc.type || '')}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-sm text-slate-800 dark:text-white truncate" title={doc.name}>{doc.name}</div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            {doc.documentNumber && (
                                                <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-black tracking-widest border border-blue-100 dark:border-blue-800">
                                                    {doc.documentNumber}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                                <UserCircle size={12} /> {doc.uploadedBy}
                                            </span>
                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                {new Date(doc.uploadDate).toLocaleDateString()}
                                            </span>
                                            {doc.size && (
                                                <>
                                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                                    <span className="text-[10px] text-slate-400 font-bold tracking-widest">{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onSelect(doc)}
                                    className="shrink-0 bg-slate-50 hover:bg-blue-600 text-slate-600 hover:text-white dark:bg-slate-700 dark:hover:bg-blue-600 dark:text-slate-300 rounded-[2rem] px-4 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-slate-200 dark:border-slate-600 hover:border-blue-600 hover:shadow-lg active:scale-95"
                                >
                                    <CheckCircle2 size={16} /> <span className="hidden sm:inline">Koppel</span>
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-slate-400 text-sm font-bold uppercase tracking-widest italic border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-800/20">
                            Geen documenten gevonden in de bibliotheek.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
