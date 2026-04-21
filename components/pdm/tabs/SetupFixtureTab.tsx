import React from 'react';
import { AlertTriangle, Info, RefreshCcw, Link, Camera, Plus, X, Upload, FileText, FolderOpen, Hammer, UserCircle, Trash2 } from '../../../icons';
import { SetupFieldDefinition, ArticleFile, DocumentCategory, DMSDocument } from '../../../types';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { SleekDocumentList } from '../ui/SleekDocumentList';
import { KEYS } from '../../../services/db/core';
import { downloadFile } from '../../../utils/fileUtils';

interface SetupFixtureTabProps {
    articleId?: string;
    fields: SetupFieldDefinition[];
    templateName: string;
    updateStatus: 'NONE' | 'UPDATE_AVAILABLE' | 'LEGACY_INIT';
    templateData: Record<string, any>;
    images: ArticleFile[];
    isLocked: boolean;
    isProcessSetup: boolean;
    hasMachine: boolean;
    onUpdateTemplateData: (key: string, value: any) => void;
    onUploadImage: (files: FileList | File[], role: string) => void;
    onDeleteImage: (id: string) => void;
    onPreviewImage: (file: ArticleFile) => void;
    onLinkImage?: (doc: DMSDocument, role: string) => void;
    onSyncTemplate?: () => void;
}

export const SetupFixtureTab: React.FC<SetupFixtureTabProps> = ({
    articleId, fields, templateName, updateStatus, templateData, images, isLocked, isProcessSetup, hasMachine,
    onUpdateTemplateData, onUploadImage, onDeleteImage, onPreviewImage, onLinkImage, onSyncTemplate
}) => {

    const renderFields = () => {
        if (fields.length === 0) {
            return (
                <>
                    {!hasMachine && !isProcessSetup && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-[2rem] border border-orange-200 dark:border-orange-800 flex items-center gap-3 animate-pulse">
                            <AlertTriangle className="text-orange-500 shrink-0" size={20} />
                            <p className="text-xs text-orange-800 dark:text-orange-200 font-bold">
                                Selecteer eerst een machine in het tabblad 'Machine Info' om de specifieke setup-velden te laden.
                            </p>
                        </div>
                    )}
                    {hasMachine && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-[2rem] border border-blue-200 dark:border-blue-800 flex items-center gap-3">
                            <Info className="text-blue-500 shrink-0" size={20} />
                            <div>
                                <p className="text-xs text-blue-800 dark:text-blue-200 font-bold">Geen velden gedefinieerd</p>
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                                    Er is geen specifiek sjabloon gekoppeld. Pas dit aan in Admin {'>'} Templates.
                                </p>
                            </div>
                        </div>
                    )}
                </>
            );
        }

        return (
            <div className="space-y-6">
                <div className={`p-4 rounded-[2rem] border mb-6 flex items-center justify-between gap-3 ${updateStatus !== 'NONE' ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' : 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900'}`}>
                    <div className="flex items-center gap-3">
                        {updateStatus !== 'NONE' ? <AlertTriangle className="text-orange-500 shrink-0" size={20} /> : <Info className="text-blue-500 shrink-0" size={20} />}
                        <div>
                            <h4 className={`font-bold text-sm ${updateStatus !== 'NONE' ? 'text-orange-800 dark:text-orange-300' : 'text-blue-800 dark:text-blue-300'}`}>
                                Actief Sjabloon: {templateName}
                            </h4>
                            <p className={`text-xs ${updateStatus !== 'NONE' ? 'text-orange-700 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                {updateStatus === 'LEGACY_INIT' ? 'Oude versie gedetecteerd. Koppel sjabloon opnieuw.' : 'Versie vastgelegd in setup.'}
                            </p>
                        </div>
                    </div>
                    {updateStatus !== 'NONE' && !isLocked && (
                        <button
                            onClick={onSyncTemplate}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm transition-colors animate-pulse"
                        >
                            {updateStatus === 'LEGACY_INIT' ? <Link size={14} /> : <RefreshCcw size={14} />}
                            {updateStatus === 'LEGACY_INIT' ? 'Vastleggen' : 'Update Laden'}
                        </button>
                    )}
                </div>

                {/* GRID SYSTEM: 12 Columns. Mobile forces col-span-12. Desktop respects config */}
                <div className="grid grid-cols-12 gap-6">
                    {fields.map(field => {
                        const val = templateData?.[field.key] ?? field.defaultValue ?? '';
                        const spanClass = `col-span-12 md:col-span-${field.colSpan || 6}`;

                        if (field.type === 'header') return <h4 key={field.key} className="col-span-12 font-black text-slate-400 uppercase tracking-widest text-xs border-b border-slate-100 dark:border-slate-700 pb-2 mt-4">{field.label}</h4>;

                        if (field.type === 'textarea') return (
                            <div key={field.key} className={spanClass + " space-y-2"}>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{field.label}</label>
                                <textarea disabled={isLocked} rows={4} className="w-full p-4 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-blue-500 transition-all disabled:opacity-60 disabled:border-transparent dark:text-white" value={val} onChange={e => onUpdateTemplateData(field.key, e.target.value)} />
                            </div>
                        );

                        if (field.type === 'boolean') return (
                            <div key={field.key} className={spanClass + " space-y-2"}>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{field.label}</label>
                                <button disabled={isLocked} type="button" onClick={() => onUpdateTemplateData(field.key, !val)} className={`w-full p-3 rounded-[2rem] border-2 font-bold text-sm transition-all ${val ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'} disabled:opacity-60`}>{val ? 'JA / AAN' : 'NEE / UIT'}</button>
                            </div>
                        );

                        if (field.type === 'select') return (
                            <div key={field.key} className={spanClass + " space-y-2"}>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{field.label}</label>
                                <SearchableSelect
                                    value={val}
                                    options={field.options || []}
                                    onSelect={(v) => onUpdateTemplateData(field.key, v)}
                                    disabled={isLocked}
                                    placeholder="Selecteer..."
                                    className="w-full"
                                />
                            </div>
                        );

                        return (
                            <div key={field.key} className={spanClass + " space-y-2"}>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{field.label}</label>
                                <div className="relative">
                                    <input disabled={isLocked} type={field.type === 'number' ? 'number' : 'text'} className={`w-full p-3.5 ${field.unit ? 'pr-20' : ''} rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold outline-none focus:border-blue-500 transition-all disabled:opacity-60 disabled:border-transparent dark:text-white`} value={val} onChange={e => onUpdateTemplateData(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)} />
                                    {field.unit && <span className="absolute right-10 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{field.unit}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in text-left">
            {renderFields()}

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <SleekDocumentList
                    title={<><Camera size={18} /> Foto's & Bijlagen</>}
                    subtitle="Opspanschetsen, meetrapporten, etc."
                    files={images || []}
                    applicableTo="SETUP"
                    parentRecordId={articleId}
                    tableKey={KEYS.ARTICLES}
                    excludedCategories={['CAM', 'NC']}
                    defaultCategoryCode="FIXTURE"
                    isLocked={isLocked}
                    onUpload={onUploadImage}
                    onDelete={onDeleteImage}
                    onPreview={onPreviewImage}
                    onDownload={downloadFile}
                    onLinkDocument={onLinkImage}
                />
            </div>
        </div>
    );
};
