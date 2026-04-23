import React, { useState } from 'react';
import { Trash2, Edit2, Eye, RotateCcw, AlertTriangle, ShieldCheck, Wrench } from '../../../icons';
import { ArticleTool, SetupFieldDefinition, ArticleFile, DMSDocument } from '../../../types';
import { SleekDocumentList } from '../ui/SleekDocumentList';
import { ToolFieldsRenderer } from './ToolFieldsRenderer';
import { generateId, KEYS } from '../../../services/db/core';
import { documentService } from '../../../services/db/documentService';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { downloadFile, previewFile } from '../../../utils/fileUtils';

interface ToolBlockProps {
    articleId?: string;
    tool: ArticleTool;
    onUpdate: (updates: Partial<ArticleTool>) => void;
    onDelete: () => void;
    onReplace?: () => void; // Optional handler for replacing a tool in locked state
    disabled?: boolean;
    toolFields?: SetupFieldDefinition[];
    isLegacyMode?: boolean;
}

export const ToolBlock: React.FC<ToolBlockProps> = ({ articleId, tool, onUpdate, onDelete, onReplace, disabled, toolFields = [], isLegacyMode = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { user } = useAuth();
    const confirm = useConfirm();

    const handleDynamicChange = (key: string, value: any) => {
        if (disabled) return;
        const currentData = tool.toolData || {};
        onUpdate({
            toolData: { ...currentData, [key]: value }
        });
    };

    const handleLegacyChange = (field: keyof ArticleTool, value: any) => {
        if (!disabled) {
            onUpdate({ [field]: value });
        }
    };

    const handleUploadFiles = async (newFiles: FileList | File[], role: string) => {
        if (disabled || isReplaced) return;

        const filesArray = Array.from(newFiles);
        const addedFiles: ArticleFile[] = [];

        for (const file of filesArray) {
            const addedFile = await new Promise<ArticleFile>((resolve) => {
                const reader = new FileReader();
                reader.onload = async () => {
                    const content = reader.result as string;
                    try {
                        const doc = await documentService.addDocumentFromBase64(file.name, file.type, content, file.size);
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
                        console.error('File storage failed', e);
                        resolve({} as any);
                    }
                };
                reader.readAsDataURL(file);
            });
            if (addedFile.id) addedFiles.push(addedFile);
        }

        onUpdate({
            files: [...(tool.files || []), ...addedFiles]
        });
    };

    const handleSelectLibraryDoc = async (doc: DMSDocument, role: string) => {
        if (disabled || isReplaced) return;

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

        onUpdate({
            files: [...(tool.files || []), newFile]
        });
    };

    const handleDeleteFile = async (fileId: string) => {
        if (disabled || isReplaced) return;
        const ok = await confirm({ title: 'Bestand verwijderen', message: 'Bestand verwijderen?' });
        if (ok) {
            onUpdate({
                files: (tool.files || []).filter(f => f.id !== fileId)
            });
        }
    };

    const handlePreviewFile = (file: ArticleFile) => previewFile(file);

    const handleDownloadFile = (file: ArticleFile) => downloadFile(file);

    const isReplaced = tool.status === 'REPLACED';

    return (
        <div className={`bg-white dark:bg-slate-800 border-2 rounded-[2rem] overflow-hidden transition-all duration-200 ${isExpanded ? 'shadow-lg border-blue-500 dark:border-blue-500' : 'shadow-sm border-slate-200 dark:border-slate-700 hover:border-blue-300'} ${isReplaced ? 'opacity-60 grayscale-[0.8] border-slate-100 bg-slate-50' : ''}`}>

            {/* COMPACT ROW HEADER */}
            <div className="flex items-center gap-4 p-3 pr-4">
                {/* LEFT: T-Number */}
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${disabled || isReplaced ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : 'bg-blue-600 text-white'}`}>
                    T{tool.order}
                </div>

                {/* MIDDLE: Description & Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <div className={`font-bold text-sm truncate flex items-center gap-2 ${tool.description ? (isReplaced ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-white') : 'text-slate-400 italic'}`}>
                        {tool.description || 'Nieuw Gereedschap'}
                        {tool.replacedToolId && !isReplaced && (
                            <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 uppercase font-black tracking-wider flex items-center gap-1">
                                <ShieldCheck size={10} /> Vervanger
                            </span>
                        )}
                        {isReplaced && (
                            <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                Historie
                            </span>
                        )}
                    </div>
                    {(tool.holder || tool.lifeTime) && (
                        <div className="text-[10px] text-slate-500 truncate flex gap-2">
                            {tool.holder && <span>{tool.holder}</span>}
                            {tool.lifeTime && <span className="text-orange-600 font-bold">• {tool.lifeTime}</span>}
                        </div>
                    )}
                </div>

                {/* RIGHT: Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    {disabled || isReplaced ? (
                        // LOCKED / RELEASED / REPLACED STATE -> VIEW ONLY
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors ${isExpanded ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100'}`}
                        >
                            <Eye size={14} /> Bekijken
                        </button>
                    ) : (
                        // EDIT STATE -> EDIT / DELETE
                        <>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`p-2 rounded-2xl transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700'}`}
                                title="Bewerken"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                                title="Verwijderen"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* EXPANDED DETAILS BODY */}
            {isExpanded && (
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 animate-in slide-in-from-top-2 duration-200">

                    {/* Header Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">T-Nr</label>
                            <input disabled={disabled || isReplaced} type="number" min="1" className="w-full p-3 rounded-[2rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-bold text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:border-transparent dark:text-white transition-all" value={tool.order} onChange={e => handleLegacyChange('order', Math.max(1, parseInt(e.target.value) || 1))} />
                        </div>
                        <div className="space-y-1 md:col-span-6">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Omschrijving / Type</label>
                            <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-[2rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:border-transparent dark:text-white transition-all" value={tool.description} onChange={e => handleLegacyChange('description', e.target.value)} placeholder="Bijv. VHM Frees D10" />
                        </div>
                        <div className="space-y-1 md:col-span-4">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Standtijd (ToolGuard)</label>
                            <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-[2rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-bold text-orange-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:border-transparent disabled:text-slate-600" value={tool.lifeTime} onChange={e => handleLegacyChange('lifeTime', e.target.value)} placeholder="Min. / St." />
                        </div>
                    </div>

                    {/* Dynamic or Legacy Fields — D-09: Geëxtraheerd naar ToolFieldsRenderer */}
                    <ToolFieldsRenderer
                        tool={tool}
                        toolFields={toolFields}
                        isLegacyMode={isLegacyMode}
                        disabled={!!disabled}
                        isReplaced={isReplaced}
                        onDynamicChange={handleDynamicChange}
                        onLegacyChange={handleLegacyChange}
                    />

                    {/* Special Locked Actions Area */}
                    {disabled && !isReplaced && onReplace && (
                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 bg-orange-50/50 dark:bg-orange-900/10 p-4 rounded-[2rem]">
                            <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
                                <AlertTriangle size={20} />
                                <span className="text-xs font-bold">Setup is vrijgegeven (Released). Wijzigingen vereisen een revisie.</span>
                            </div>
                            <button
                                onClick={onReplace}
                                className="px-6 py-2 bg-white dark:bg-slate-800 text-orange-600 border border-orange-200 dark:border-orange-800 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-all flex items-center gap-2 shadow-sm"
                            >
                                <RotateCcw size={14} /> Vervang Gereedschap
                            </button>
                        </div>
                    )}

                    {/* Tooling Documents Area */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <SleekDocumentList
                            title={<><Wrench size={18} /> Gereedschap Documenten</>}
                            subtitle="Slijptekeningen, instelbladen, etc."
                            files={tool.files || []}
                            applicableTo="SETUP"
                            parentRecordId={articleId}
                            tableKey={KEYS.ARTICLES}
                            excludedCategories={['CAM', 'NC']}
                            defaultCategoryCode="OTHER"
                            isLocked={disabled || isReplaced}
                            onUpload={handleUploadFiles}
                            onDelete={handleDeleteFile}
                            onPreview={handlePreviewFile}
                            onDownload={handleDownloadFile}
                            onLinkDocument={handleSelectLibraryDoc}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
