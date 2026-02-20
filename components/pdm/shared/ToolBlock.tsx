
import React, { useState } from 'react';
import { Trash2, Edit2, Eye, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ArticleTool, SetupTemplate } from '../../../types';
import { SearchableSelect } from '../../ui/SearchableSelect';

interface ToolBlockProps {
    tool: ArticleTool;
    onUpdate: (updates: Partial<ArticleTool>) => void;
    onDelete: () => void;
    onReplace?: () => void; // Optional handler for replacing a tool in locked state
    disabled?: boolean;
    template?: SetupTemplate | null;
}

export const ToolBlock: React.FC<ToolBlockProps> = ({ tool, onUpdate, onDelete, onReplace, disabled, template }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
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

    const hasDynamicFields = template && template.toolFields && template.toolFields.length > 0;
    const isReplaced = tool.status === 'REPLACED';

    return (
        <div className={`bg-white dark:bg-slate-800 border-2 rounded-xl overflow-hidden transition-all duration-200 ${isExpanded ? 'shadow-lg border-blue-500 dark:border-blue-500' : 'shadow-sm border-slate-200 dark:border-slate-700 hover:border-blue-300'} ${isReplaced ? 'opacity-60 grayscale-[0.8] border-slate-100 bg-slate-50' : ''}`}>
            
            {/* COMPACT ROW HEADER */}
            <div className="flex items-center gap-4 p-3 pr-4">
                {/* LEFT: T-Number */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${disabled || isReplaced ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : 'bg-blue-600 text-white'}`}>
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
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${isExpanded ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100'}`}
                        >
                            <Eye size={14} /> Bekijken
                        </button>
                    ) : (
                        // EDIT STATE -> EDIT / DELETE
                        <>
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)} 
                                className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700'}`}
                                title="Bewerken"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Omschrijving / Type</label>
                            <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:border-transparent dark:text-white transition-all" value={tool.description} onChange={e => handleLegacyChange('description', e.target.value)} placeholder="Bijv. VHM Frees D10" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Standtijd (ToolGuard)</label>
                            <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-bold text-orange-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:border-transparent disabled:text-slate-600" value={tool.lifeTime} onChange={e => handleLegacyChange('lifeTime', e.target.value)} placeholder="Min. / St." />
                        </div>
                    </div>

                    {/* Dynamic or Legacy Fields */}
                    {hasDynamicFields ? (
                        <div className="grid grid-cols-12 gap-6 pt-2">
                            {template.toolFields!.map(field => {
                                const val = tool.toolData?.[field.key] ?? field.defaultValue ?? '';
                                const isFilled = val !== '' && val !== null && val !== undefined;
                                const isHighlightActive = field.highlightFilled && isFilled;
                                
                                const spanClass = `col-span-12 md:col-span-${field.colSpan || 6}`;

                                const inputBaseClass = "w-full p-3 rounded-xl border outline-none transition-all disabled:opacity-60 disabled:border-transparent";
                                const highlightClass = isHighlightActive 
                                    ? "bg-amber-50 dark:bg-amber-900/30 border-amber-500 text-amber-900 dark:text-amber-100 font-black"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white font-bold focus:border-blue-500";

                                if (field.type === 'header') {
                                    return <div key={field.key} className="col-span-12 font-black text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 pb-1 mt-2">{field.label}</div>;
                                }

                                if (field.type === 'boolean') {
                                    return (
                                        <div key={field.key} className={spanClass + " space-y-1"}>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                                            <button 
                                                disabled={disabled || isReplaced}
                                                onClick={() => handleDynamicChange(field.key, !val)}
                                                className={`w-full p-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${val ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-inner' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400'} disabled:opacity-60`}
                                            >
                                                {val ? 'JA' : 'NEE'}
                                            </button>
                                        </div>
                                    );
                                }

                                if (field.type === 'select') {
                                    return (
                                        <div key={field.key} className={spanClass + " space-y-1"}>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                                            <SearchableSelect
                                                value={val}
                                                options={field.options || []}
                                                onSelect={(v) => handleDynamicChange(field.key, v)}
                                                disabled={disabled || isReplaced}
                                                placeholder="Selecteer..."
                                                className="w-full"
                                            />
                                        </div>
                                    );
                                }

                                return (
                                    <div key={field.key} className={field.type === 'textarea' ? 'col-span-12 space-y-1' : spanClass + ' space-y-1'}>
                                        <div className="flex justify-between">
                                            <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${isHighlightActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                                                {field.label}
                                            </label>
                                            {isHighlightActive && <AlertTriangle size={12} className="text-amber-500 animate-pulse" />}
                                        </div>
                                        <div className="relative">
                                            {field.type === 'textarea' ? (
                                                <textarea disabled={disabled || isReplaced} rows={2} className={`${inputBaseClass} ${highlightClass}`} value={val} onChange={e => handleDynamicChange(field.key, e.target.value)} />
                                            ) : (
                                                <input 
                                                    disabled={disabled || isReplaced}
                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                    className={`${inputBaseClass} ${highlightClass}`}
                                                    value={val}
                                                    onChange={e => handleDynamicChange(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                                />
                                            )}
                                            {field.unit && field.type !== 'textarea' && <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold ${isHighlightActive ? 'text-amber-700/60 dark:text-amber-200/60' : 'text-slate-400'}`}>{field.unit}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Snijlengte</label>
                                <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-60 disabled:border-transparent dark:text-white" value={tool.cuttingLength || ''} onChange={e => handleLegacyChange('cuttingLength', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vrijloop</label>
                                <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-60 disabled:border-transparent dark:text-white" value={tool.clearance || ''} onChange={e => handleLegacyChange('clearance', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Interne Koeling</label>
                                <button disabled={disabled || isReplaced} type="button" onClick={() => handleLegacyChange('internalCooling', !tool.internalCooling)} className={`w-full p-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${tool.internalCooling ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-inner' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400'} disabled:opacity-60`}>
                                    {tool.internalCooling ? 'Ja (AAN)' : 'Nee (UIT)'}
                                </button>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Matrix Code</label>
                                <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-mono font-bold text-blue-600 outline-none focus:border-blue-500 disabled:opacity-60 disabled:border-transparent disabled:text-slate-500" value={tool.matrixCode || ''} onChange={e => handleLegacyChange('matrixCode', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Uitsteek Lengte</label>
                                <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-60 disabled:border-transparent dark:text-white" value={tool.overhangLength || ''} onChange={e => handleLegacyChange('overhangLength', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Houder</label>
                                <input disabled={disabled || isReplaced} type="text" className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-60 disabled:border-transparent dark:text-white" value={tool.holder || ''} onChange={e => handleLegacyChange('holder', e.target.value)} />
                            </div>
                        </div>
                    )}
                    
                    {/* Special Locked Actions Area */}
                    {disabled && !isReplaced && onReplace && (
                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 bg-orange-50/50 dark:bg-orange-900/10 p-4 rounded-xl">
                            <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
                                <AlertTriangle size={20} />
                                <span className="text-xs font-bold">Setup is vrijgegeven (Released). Wijzigingen vereisen een revisie.</span>
                            </div>
                            <button 
                                onClick={onReplace} 
                                className="px-6 py-2 bg-white dark:bg-slate-800 text-orange-600 border border-orange-200 dark:border-orange-800 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-all flex items-center gap-2 shadow-sm"
                            >
                                <RotateCcw size={14} /> Vervang Gereedschap
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
