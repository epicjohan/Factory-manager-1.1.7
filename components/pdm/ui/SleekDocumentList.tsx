import React, { useState, useRef, useEffect } from 'react';
import { Upload, Eye, Download, Trash2, FileText, Camera, Hammer, UserCircle, Image, Table, ClipboardList, Ruler, BarChart, FileCode, Terminal, Archive, Box, Star } from '../../../icons';
import { ArticleFile, DocumentCategory, DMSDocument } from '../../../types';
import { db } from '../../../services/storage';
import { useDocumentMap } from '../../../hooks/useDocumentMap';
import { DocumentLibraryModal } from '../modals/DocumentLibraryModal';
import { DocumentRenameModal } from '../modals/DocumentRenameModal';

// --- Sub-component for async rendering ---
const DocumentThumbnail: React.FC<{ file: ArticleFile, getRoleIcon: (code: string) => any, onPreview: (f: ArticleFile) => void, url?: string, loading?: boolean }> = ({ file, getRoleIcon, onPreview, url, loading }) => {
    const isImage = file.type?.startsWith('image/');

    return (
        <div className="p-2.5 rounded-2xl shrink-0 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center relative overflow-hidden h-10 w-10 cursor-zoom-in" onClick={() => onPreview(file)}>
            {isImage ? (
                loading ? (
                    <div className="animate-pulse w-full h-full bg-slate-200 dark:bg-slate-700 rounded" />
                ) : url ? (
                    <img src={url} className="absolute inset-0 w-full h-full object-cover" alt="Preview thumbnail" />
                ) : (
                    getRoleIcon(file.fileRole)
                )
            ) : (
                getRoleIcon(file.fileRole)
            )}
        </div>
    );
};

interface SleekDocumentListProps {
    title: React.ReactNode;
    subtitle: string;
    files: ArticleFile[];
    applicableTo: 'ARTICLE' | 'SETUP' | 'MACHINE' | 'BOTH' | 'ALL';
    excludedCategories?: string[];
    defaultCategoryCode?: string;
    isLocked: boolean;
    onUpload: (files: FileList | File[], role: string) => void | Promise<void>;
    onDelete: (id: string) => void;
    onPreview: (file: ArticleFile) => void;
    onDownload: (file: ArticleFile) => void;
    onLinkDocument?: (doc: DMSDocument, role: string) => void;
    onSetThumbnail?: (fileId: string) => void; // Optional: mark a file as thumbnail
    className?: string;
}

export const SleekDocumentList: React.FC<SleekDocumentListProps> = ({
    title,
    subtitle,
    files,
    applicableTo,
    excludedCategories = [],
    defaultCategoryCode = 'OTHER',
    isLocked,
    onUpload,
    onDelete,
    onPreview,
    onDownload,
    onLinkDocument,
    onSetThumbnail,
    className = ""
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [pendingUploads, setPendingUploads] = useState<{ files: File[], role: string } | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>(defaultCategoryCode);
    const [categories, setCategories] = useState<DocumentCategory[]>([
        { id: '1', name: 'Document', code: 'OTHER', isSystem: true, applicableTo: 'BOTH', icon: 'FileText', color: 'text-slate-500' }
    ]);
    const { urlMap, loadingMap } = useDocumentMap(files);

    useEffect(() => {
        db.getSystemSettings().then(settings => {
            if (settings.documentCategories && settings.documentCategories.length > 0) {
                // Filter available categories based on applicableTo and exclusions
                // BOTH is for Article & Setup, ALL is for everything
                const availableCats = settings.documentCategories.filter(
                    c => {
                        const isMatch = c.applicableTo === applicableTo ||
                            c.applicableTo === 'ALL' ||
                            (c.applicableTo === 'BOTH' && (applicableTo === 'ARTICLE' || applicableTo === 'SETUP'));
                        return isMatch && !excludedCategories.includes(c.code);
                    }
                );

                if (availableCats.length > 0) {
                    setCategories(availableCats);

                    // If the currently selected role is not in the filtered list, pick the first valid one
                    if (!availableCats.find(c => c.code === selectedRole)) {
                        setSelectedRole(availableCats[0].code);
                    }
                }
            }
        });
    }, [applicableTo, excludedCategories, selectedRole]);

    const getCategoryByCode = (code: string) => {
        return categories.find(c => c.code === code) || { name: code, icon: 'File', color: 'text-slate-400' } as any;
    };

    const getRoleIcon = (code: string) => {
        const cat = getCategoryByCode(code);
        switch (cat.icon) {
            case 'Hammer': return <Hammer size={18} className={cat.color} />;
            case 'Camera': return <Camera size={18} className={cat.color} />;
            case 'Image': return <Image size={18} className={cat.color} />;
            case 'Table': return <Table size={18} className={cat.color} />;
            case 'ClipboardList': return <ClipboardList size={18} className={cat.color} />;
            case 'Ruler': return <Ruler size={18} className={cat.color} />;
            case 'BarChart': return <BarChart size={18} className={cat.color} />;
            case 'FileCode': return <FileCode size={18} className={cat.color} />;
            case 'Terminal': return <Terminal size={18} className={cat.color} />;
            case 'Archive': return <Archive size={18} className={cat.color} />;
            case 'Box': return <Box size={18} className={cat.color} />;
            default: return <FileText size={18} className={cat.color} />;
        }
    };

    return (
        <div className={className}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                <div>
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 italic mb-1">
                        {title}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {subtitle}
                    </p>
                </div>
                {!isLocked && (
                    <div className="relative isolate shrink-0 min-w-[200px]">
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full appearance-none pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-bold uppercase tracking-widest rounded-[2rem] shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                        >
                            {categories.sort((a, b) => (a.order || 0) - (b.order || 0)).map(cat => (
                                <option key={cat.code} value={cat.code}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70">
                            {getRoleIcon(selectedRole)}
                        </div>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {!isLocked && (
                    <div
                        className={`w-full rounded-2xl border-2 border-dashed flex items-center justify-between p-4 cursor-pointer transition-all ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-inner' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                setPendingUploads({ files: Array.from(e.dataTransfer.files), role: selectedRole });
                            }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                setPendingUploads({ files: Array.from(e.target.files), role: selectedRole });
                            }
                            e.target.value = ''; // Reset input
                        }} />

                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                <Upload size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-800 dark:text-white">Bestanden toevoegen</h4>
                                <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Sleep bestanden hierheen of klik om te bladeren</p>
                            </div>
                        </div>

                        <div className="flex bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-2xl items-center gap-2">
                            <span className="font-bold text-[10px] uppercase tracking-wider hidden sm:inline">uploaden als</span>
                            <span className="font-black text-[10px] sm:text-xs uppercase tracking-wider px-2 py-1 bg-white dark:bg-slate-800 rounded shadow-sm border border-blue-100 dark:border-blue-800">{getCategoryByCode(selectedRole).name}</span>
                        </div>
                    </div>
                )}

                {onLinkDocument && !isLocked && (
                    <div className="flex justify-end mt-2 mb-4">
                        <button
                            onClick={() => setShowLibraryModal(true)}
                            className="bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 dark:bg-slate-800/50 dark:hover:bg-blue-600/20 dark:text-slate-400 dark:hover:text-blue-400 rounded-[2rem] px-4 py-2 font-black uppercase text-[10px] tracking-widest shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800/50 transition-all flex items-center justify-center gap-2"
                        >
                            <Archive size={14} /> Kies uit Bibliotheek
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    {files.map(file => (
                        <div key={file.id} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all">

                            <div className="flex flex-1 items-center gap-4 overflow-hidden pr-4" onClick={() => onPreview(file)} style={{ cursor: 'zoom-in' }}>
                                {/* Shared icon/thumbnail area */}
                                <DocumentThumbnail
                                    file={file}
                                    getRoleIcon={getRoleIcon}
                                    onPreview={onPreview}
                                    url={urlMap[file.id]}
                                    loading={loadingMap[file.id]}
                                />
                                <div className="truncate min-w-0">
                                    <div className="font-bold text-sm text-slate-800 dark:text-white truncate" title={file.name}>{file.name}</div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                        <span className={`inline-flex items-center ${getCategoryByCode(file.fileRole).color}`}>
                                            <span className="px-1.5 py-0.5 rounded bg-current/[0.1] text-current font-black text-[9px] border border-current/[0.2] truncate max-w-[120px]">
                                                {getCategoryByCode(file.fileRole).name}
                                            </span>
                                        </span>
                                        <span className="opacity-50">•</span>
                                        <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                                        <span className="hidden sm:inline opacity-50">•</span>
                                        <span className="hidden sm:flex items-center gap-1 text-slate-400">
                                            <UserCircle size={12} className="shrink-0" />
                                            <span className="truncate max-w-[100px]">{file.uploadedBy}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Star: always visible, outside the hover-reveal group */}
                            {onSetThumbnail && (
                                <button
                                    onClick={() => onSetThumbnail(file.id)}
                                    title={file.isThumbnail ? 'Is momenteel de thumbnail' : 'Gebruik als thumbnail'}
                                    className={`p-2 rounded-2xl transition-all shrink-0 ${file.isThumbnail
                                        ? 'text-green-500'
                                        : 'text-orange-400 hover:text-green-500'
                                        }`}
                                >
                                    <Star size={20} strokeWidth={2.5} fill="currentColor" />
                                </button>
                            )}

                            <div className="flex items-center gap-1 sm:gap-2 shrink-0 relative z-10">
                                <button onClick={() => onPreview(file)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-2xl transition-colors bg-slate-50 sm:bg-transparent dark:bg-slate-900 sm:dark:bg-transparent" title="Preview">
                                    <Eye size={16} />
                                </button>
                                <button onClick={() => onDownload(file)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-2xl transition-colors bg-slate-50 sm:bg-transparent dark:bg-slate-900 sm:dark:bg-transparent" title="Download">
                                    <Download size={16} />
                                </button>
                                {!isLocked && (
                                    <button onClick={() => onDelete(file.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-2xl transition-colors bg-slate-50 sm:bg-transparent dark:bg-slate-900 sm:dark:bg-transparent" title="Verwijderen">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                    ))}
                    {files.length === 0 && (
                        <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                            Nog geen bestanden geüpload in deze categorieën
                        </div>
                    )}
                </div>
            </div>

            {/* DOCUMENT LIBRARY MODAL */}
            {showLibraryModal && onLinkDocument && (
                <DocumentLibraryModal
                    onClose={() => setShowLibraryModal(false)}
                    onSelect={(doc) => {
                        onLinkDocument(doc, selectedRole);
                        setShowLibraryModal(false);
                    }}
                />
            )}

            {pendingUploads && (
                <DocumentRenameModal
                    files={pendingUploads.files}
                    role={pendingUploads.role}
                    onClose={() => setPendingUploads(null)}
                    onConfirm={(renamedFiles) => {
                        onUpload(renamedFiles, pendingUploads.role);
                        setPendingUploads(null);
                    }}
                />
            )}
        </div>
    );
};
