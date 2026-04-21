import React, { useState } from 'react';
import { X, Calendar, Clock, CheckCircle, Printer, CheckSquare } from '../../../icons';
import { Article, SetupVariant, Machine, ToolPreparationRequest } from '../../../types';
import { buildColumns, cellValue } from '../SetupSheet';

interface ToolRequestDetailModalProps {
    request: ToolPreparationRequest;
    article: Article;
    setup: SetupVariant;
    machine: Machine | null;
    companyName: string;
    onClose: () => void;
    onToggleTool: (toolId: string, isPrepared: boolean) => Promise<void>;
    onPrint: () => void;
}

export const ToolRequestDetailModal: React.FC<ToolRequestDetailModalProps> = ({
    request, article, setup, machine, companyName, onClose, onToggleTool, onPrint
}) => {
    // Generate identical columns to what the printed sheet would have
    const columns = buildColumns(setup).filter(c => c.key !== '_remark'); // filter out landscape remark for digital view
    const tools = (setup.tools || []).filter(t => t.status !== 'REPLACED').sort((a, b) => a.order - b.order);

    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const handleToggle = async (toolId: string) => {
        setIsUpdating(toolId);
        const currentlyPrepared = request.preparedToolIds?.includes(toolId) || false;
        try {
            await onToggleTool(toolId, !currentlyPrepared);
        } finally {
            setIsUpdating(null);
        }
    };

    const dateStr = new Date(request.requestDate).toLocaleString('nl-NL');
    const dueStr = new Date(request.dueDate).toLocaleDateString('nl-NL');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-[98vw] max-w-[1600px] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600">
                                {article.articleCode} {article.drawingNumber ? ` (Tek: ${article.drawingNumber})` : ''}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                            {setup.name} {machine ? ` [${machine.name}]` : ''}
                        </h2>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <Calendar size={14} className="text-indigo-400" /> 
                                Deadline: <span className="text-slate-800 dark:text-slate-200">{dueStr}</span>
                            </div>
                            <span className="flex items-center gap-1.5"><Clock size={14} className="text-orange-400" /> Oproep: {dateStr}</span>
                            <span className="flex items-center gap-1.5">Door: {request.requestedBy}</span>
                        </div>

                        {request.notes && (
                            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-xl text-sm font-medium border border-yellow-200 dark:border-yellow-900/50">
                                <strong>Opmerking van operator:</strong><br/>
                                {request.notes}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                        <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 rounded-full transition-colors">
                            <X size={24} />
                        </button>

                        <button 
                            onClick={onPrint}
                            className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all hover:-translate-y-0.5"
                        >
                            <Printer size={16} />
                            Print A4 Sheet
                        </button>
                    </div>
                </div>

                {/* Content / Checklist */}
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
                    <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Gereedschappen ({tools.length})</h3>
                    
                    <div className="border-2 border-slate-200 dark:border-slate-700 rounded-[2rem] overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest w-[80px] text-center border-r border-slate-200 dark:border-slate-700">Gereed</th>
                                        {columns.map(col => (
                                            <th key={col.key} className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap" style={{ textAlign: col.align }}>
                                                {col.label} {(col as any).unit ? `[${(col as any).unit}]` : ''}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tools.length === 0 ? (
                                        <tr>
                                            <td colSpan={columns.length + 1} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                                                Geen tools in deze setup.
                                            </td>
                                        </tr>
                                    ) : (
                                        tools.map(tool => {
                                            const isExisting = request.existingToolIds?.includes(tool.id) || false;
                                            const isPrepared = request.preparedToolIds?.includes(tool.id) || false;
                                            const isDisabled = isExisting || isUpdating === tool.id;
                                            
                                            return (
                                                <tr key={tool.id} className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${isExisting ? 'bg-slate-50/50 dark:bg-slate-800/20 opacity-70' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'} ${isPrepared ? 'bg-green-50/30 dark:bg-green-900/10' : ''}`}>
                                                    <td className="p-4 text-center border-r border-slate-100 dark:border-slate-800">
                                                        {isExisting ? (
                                                            <div className="inline-flex items-center justify-center w-full">
                                                                <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[9px] font-black tracking-widest uppercase rounded">
                                                                    Aanwezig
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleToggle(tool.id)}
                                                                disabled={isDisabled}
                                                                className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center transition-all ${isPrepared ? 'bg-green-500 text-white shadow-md shadow-green-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                                            >
                                                                {isPrepared ? <CheckSquare size={18} /> : <div className="w-4 h-4 rounded-md border-2 border-slate-300 dark:border-slate-600" />}
                                                            </button>
                                                        )}
                                                    </td>
                                                    {columns.map(col => {
                                                        const val = cellValue(tool, col.key);
                                                        return (
                                                            <td key={col.key} className={`p-4 text-sm font-bold ${isExisting ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}`} style={{ textAlign: col.align }}>
                                                                <span className={isExisting && col.key === '_description' ? 'line-through text-slate-400' : ''}>
                                                                    {val}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>Totaal: {tools.length}</span>
                        <span>Voortgang: {request.existingToolIds.length + (request.preparedToolIds?.length || 0)} / {tools.length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
