/**
 * D-09: Geëxtraheerd uit ToolBlock.tsx
 * Rendert de dynamische template-velden (gebaseerd op SetupFieldDefinition[])
 * of de legacy hardcoded velden als er geen template is.
 */

import React from 'react';
import { ArticleTool, SetupFieldDefinition } from '../../../types';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { AlertTriangle } from '../../../icons';

interface ToolFieldsRendererProps {
    tool: ArticleTool;
    toolFields: SetupFieldDefinition[];
    isLegacyMode: boolean;
    disabled: boolean;
    isReplaced: boolean;
    onDynamicChange: (key: string, value: any) => void;
    onLegacyChange: (field: keyof ArticleTool, value: any) => void;
}

export const ToolFieldsRenderer: React.FC<ToolFieldsRendererProps> = ({
    tool, toolFields, isLegacyMode, disabled, isReplaced,
    onDynamicChange, onLegacyChange
}) => {
    if (!isLegacyMode) {
        // Dynamic template fields
        return (
            <div className="grid grid-cols-12 gap-6 pt-2">
                {toolFields.map(field => {
                    const val = tool.toolData?.[field.key] ?? field.defaultValue ?? '';
                    const isFilled = val !== '' && val !== null && val !== undefined && val !== false;
                    const isHighlightActive = field.highlightFilled && isFilled;

                    const spanClass = `col-span-12 md:col-span-${field.colSpan || 6}`;

                    const labelClass = `text-[9px] font-black uppercase tracking-widest ml-1 ${isHighlightActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`;
                    const requiredBadge = field.required ? <span className="text-red-500 ml-0.5">*</span> : null;

                    // Border-only highlight: thicker orange border when highlighted
                    const inputBorderClass = isHighlightActive
                        ? 'border-[3px] border-amber-400 dark:border-amber-500'
                        : 'border-2 border-slate-200 dark:border-slate-600';

                    const inputBaseClass = `w-full h-[46px] px-4 rounded-[2rem] ${inputBorderClass} bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-bold outline-none focus:border-blue-500 transition-all disabled:opacity-60 disabled:border-transparent`;

                    if (field.type === 'header') {
                        return <div key={field.key} className="col-span-12 font-black text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 pb-1 mt-2">{field.label}</div>;
                    }

                    if (field.type === 'boolean') {
                        return (
                            <div key={field.key} className={`${spanClass} space-y-1`}>
                                <label className={labelClass}>{field.label}{requiredBadge}</label>
                                <button
                                    disabled={disabled || isReplaced}
                                    onClick={() => onDynamicChange(field.key, !val)}
                                    className={`w-full h-[46px] rounded-[2rem] font-black text-[10px] uppercase transition-all ${
                                        isHighlightActive && val ? 'border-[3px] border-amber-400 dark:border-amber-500 bg-blue-50 text-blue-600' :
                                        val ? 'border-2 border-blue-500 bg-blue-50 text-blue-600 shadow-inner' : 'border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-400'
                                    } disabled:opacity-60`}
                                >
                                    {val ? 'Ja' : 'Nee'}
                                </button>
                            </div>
                        );
                    }

                    if (field.type === 'select') {
                        return (
                            <div key={field.key} className={`${spanClass} space-y-1`}>
                                <label className={labelClass}>{field.label}{requiredBadge}</label>
                                <SearchableSelect
                                    value={val}
                                    options={field.options || []}
                                    onSelect={(v) => onDynamicChange(field.key, v)}
                                    disabled={disabled || isReplaced}
                                    placeholder="Selecteer..."
                                    className="w-full"
                                />
                            </div>
                        );
                    }

                    return (
                        <div key={field.key} className={field.type === 'textarea' ? 'col-span-12 space-y-1' : `${spanClass} space-y-1`}>
                            <div className="flex justify-between">
                                <label className={labelClass}>
                                    {field.label}{requiredBadge}
                                </label>
                                {isHighlightActive && <AlertTriangle size={12} className="text-amber-500 animate-pulse" />}
                            </div>
                            <div className="relative">
                                {field.type === 'textarea' ? (
                                    <textarea disabled={disabled || isReplaced} rows={2} className={`w-full p-3 rounded-[2rem] ${inputBorderClass} bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-bold outline-none focus:border-blue-500 transition-all disabled:opacity-60 disabled:border-transparent`} value={val} onChange={e => onDynamicChange(field.key, e.target.value)} />
                                ) : (
                                    <input
                                        disabled={disabled || isReplaced}
                                        type={field.type === 'number' ? 'number' : 'text'}
                                        className={`${inputBaseClass} ${field.unit ? 'pr-20' : ''}`}
                                        value={val}
                                        onChange={e => onDynamicChange(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                    />
                                )}
                                {field.unit && field.type !== 'textarea' && <span className={`absolute right-10 top-1/2 -translate-y-1/2 text-sm font-bold ${isHighlightActive ? 'text-amber-500' : 'text-slate-400'}`}>{field.unit}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Legacy hardcoded fields
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Snijlengte</label>
                <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-60 disabled:border-transparent dark:text-white" value={tool.cuttingLength || ''} onChange={e => onLegacyChange('cuttingLength', e.target.value)} />
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vrijloop</label>
                <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-60 disabled:border-transparent dark:text-white" value={tool.clearance || ''} onChange={e => onLegacyChange('clearance', e.target.value)} />
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Interne Koeling</label>
                <button disabled={disabled || isReplaced} type="button" onClick={() => onLegacyChange('internalCooling', !tool.internalCooling)} className={`w-full p-3 rounded-[2rem] border-2 font-black text-[10px] uppercase transition-all ${tool.internalCooling ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-inner' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-400'} disabled:opacity-60`}>
                    {tool.internalCooling ? 'Ja' : 'Nee'}
                </button>
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Matrix Code</label>
                <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm font-mono font-bold text-blue-600 outline-none focus:border-blue-500 disabled:opacity-60 disabled:border-transparent disabled:text-slate-500" value={tool.matrixCode || ''} onChange={e => onLegacyChange('matrixCode', e.target.value)} />
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Uitsteek Lengte</label>
                <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-60 disabled:border-transparent dark:text-white" value={tool.overhangLength || ''} onChange={e => onLegacyChange('overhangLength', e.target.value)} />
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Houder</label>
                <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-60 disabled:border-transparent dark:text-white" value={tool.holder || ''} onChange={e => onLegacyChange('holder', e.target.value)} />
            </div>
        </div>
    );
};
