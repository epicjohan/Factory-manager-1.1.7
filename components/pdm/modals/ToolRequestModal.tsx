import React, { useState, useEffect } from 'react';
import { X, Wrench, Calendar, FileText, Send, CheckCircle2 } from '../../../icons';
import { Article, SetupVariant, ArticleTool, ToolPreparationRequest, ToolRequestStatus } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { db } from '../../../services/storage';
import { generateId, getNowISO } from '../../../services/db/core';

interface ToolRequestModalProps {
    article: Article;
    setup: SetupVariant;
    tools: ArticleTool[];
    onClose: () => void;
}

export const ToolRequestModal: React.FC<ToolRequestModalProps> = ({ article, setup, tools, onClose }) => {
    const { user } = useAuth();
    const [dueDate, setDueDate] = useState<string>('');
    const [existingToolIds, setExistingToolIds] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addNotification } = useNotifications();

    // Default due date to tomorrow
    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDueDate(tomorrow.toISOString().split('T')[0]);
    }, []);

    const activeTools = tools.filter(t => t.status !== 'REPLACED').sort((a,b) => a.order - b.order);

    const toggleTool = (id: string) => {
        setExistingToolIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (existingToolIds.length === activeTools.length) {
            setExistingToolIds([]); // deselect all
        } else {
            setExistingToolIds(activeTools.map(t => t.id)); // select all
        }
    };

    const submitRequest = async () => {
        if (!dueDate) {
            addNotification('WARNING', 'Let op', 'Vul een datum (gereed) in.');
            return;
        }

        setIsSubmitting(true);
        try {
            const req: ToolPreparationRequest = {
                id: '', // Will be generated
                articleId: article.id,
                articleCode: article.articleCode,
                drawingNumber: article.drawingNumber,
                setupId: setup.id,
                setupName: setup.name,
                machineId: setup.machineId,
                requestedBy: user?.name || 'Unknown',
                requestDate: new Date().toISOString(),
                dueDate: dueDate,
                existingToolIds,
                notes,
                status: ToolRequestStatus.PENDING
            };
            await db.addToolPrepRequest(req);

            // Audit Trail Logger
            const updatedArticle = { ...article };
            if (!updatedArticle.auditTrail) updatedArticle.auditTrail = [];
            updatedArticle.auditTrail.unshift({
                id: generateId(),
                timestamp: getNowISO(),
                user: user?.name || 'Unknown',
                action: `Gereedschapslijst aangevraagd voor setup: ${setup.name}`
            });
            await db.updateArticle(updatedArticle);
            
            addNotification('SUCCESS', 'Oproep Verzonden', `Gereedschapslijst voor setup ${setup.name} is aangevraagd!`);
            onClose();
        } catch (e) {
            addNotification('ERROR', 'Fout', 'Aanvraag kon niet opgeslagen worden.');
            console.error(e);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] shadow-2xl relative border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center border-2 border-indigo-50">
                            <Wrench size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Oproep Tooling</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{article.articleCode} — {setup.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={24} /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {/* Datum & Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2"><Calendar size={12} /> Gewenste Datum Gereed *</label>
                            <input 
                                type="date" 
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2"><FileText size={12} /> Opmerkingen (Optioneel)</label>
                            <textarea 
                                rows={2}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Bijv. T06 zojuist in machine 3 achtergelaten..."
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl px-4 py-2 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Vrijstellen/Aanwezige Gereedschappen */}
                    <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-3xl p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Aanwezige Gereedschappen Vrijstellen</h4>
                                <p className="text-xs text-slate-500 mt-1 mr-4">Vink de gereedschappen aan die al <b>aanwezig</b> zijn en dus <b>NIET</b> gebouwd hoeven te worden door de Tool Manager.</p>
                            </div>
                            <button onClick={toggleAll} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-colors shrink-0">
                                {existingToolIds.length === activeTools.length ? 'Alles Uitvinken' : 'Alles Aanvinken'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {activeTools.map(tool => {
                                const isChecked = existingToolIds.includes(tool.id);
                                return (
                                    <div 
                                        key={tool.id} 
                                        onClick={() => toggleTool(tool.id)}
                                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${isChecked ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20' : 'border-slate-100 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${isChecked ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 bg-white'}`}>
                                            {isChecked && <CheckCircle2 size={14} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                                                T{String(tool.order).padStart(2, '0')} — {tool.description}
                                            </div>
                                            {tool.matrixCode && (
                                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">{tool.matrixCode}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-6 py-3 rounded-[2rem] font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Annuleren</button>
                    <button 
                        onClick={submitRequest} 
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        <Send size={16} /> Aanvraag Verzenden
                    </button>
                </div>
            </div>
        </div>
    );
};
