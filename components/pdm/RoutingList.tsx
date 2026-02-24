
import React from 'react';
import { Layers, Hash, Plus, ChevronUp, ChevronDown, ArrowRight, Trash2, Lock } from '../../icons';
import { Article, ArticleOperation, PredefinedOperation } from '../../types';
import { MKGCodePicker } from './shared/MKGCodePicker';

interface RoutingListProps {
    article: Article;
    mkgOperations: PredefinedOperation[];
    isLocked: boolean;
    onUpdateOperation: (opId: string, updates: Partial<ArticleOperation>) => void;
    onMoveOperation: (opId: string, direction: 'UP' | 'DOWN') => void;
    onRenormalize: () => void;
    onAddOperation: () => void;
    onDeleteOperation: (opId: string) => void;
    onSelectPredefinedOp: (opId: string, code: string) => void;
    onDetailClick: (opId: string) => void;
}

export const RoutingList: React.FC<RoutingListProps> = ({ 
    article, mkgOperations, isLocked, 
    onUpdateOperation, onMoveOperation, onRenormalize, onAddOperation, onDeleteOperation, onSelectPredefinedOp, onDetailClick 
}) => {
    return (
        <div className="animate-in fade-in duration-300 text-left">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <Layers size={20} className="text-orange-500" /> Routing Bewerkingen
                    </h3>
                    {!isLocked && (
                        <button 
                            onClick={onRenormalize}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm"
                            title="Zet alle order nummers weer op 10, 20, 30..."
                        >
                            <Hash size={12} /> Herschikken
                        </button>
                    )}
                </div>
                {!isLocked ? (
                    <button onClick={onAddOperation} className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-[2rem] font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"><Plus size={18}/> Bewerking Toevoegen</button>
                ) : (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <Lock size={12} /> Routing Vergrendeld
                    </div>
                )}
            </div>
            
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] overflow-visible">
                <table className="w-full text-left border-collapse overflow-visible">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-slate-700">
                        <tr>
                            <th className="px-8 py-5">Order</th>
                            <th className="px-6 py-5">MKG Code</th>
                            <th className="px-6 py-5">Omschrijving</th>
                            <th className="px-6 py-5">Setup</th>
                            <th className="px-8 py-5 text-right">Actie</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 overflow-visible">
                        {article.operations.sort((a,b) => a.order - b.order).map((op, idx, allSorted) => (
                            <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-blue-900/5 transition-colors group overflow-visible">
                                <td className="px-8 py-5 overflow-visible">
                                    <div className="flex items-center gap-3">
                                        <div className="relative group/order">
                                            <input 
                                                disabled={isLocked}
                                                type="number"
                                                className="w-12 h-10 rounded-[2rem] bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-slate-500 text-center border-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-60 disabled:bg-transparent"
                                                value={op.order}
                                                onChange={e => onUpdateOperation(op.id, { order: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        {!isLocked && (
                                            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    disabled={idx === 0}
                                                    onClick={() => onMoveOperation(op.id, 'UP')}
                                                    className="p-1 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-all disabled:opacity-20"
                                                >
                                                    <ChevronUp size={14} />
                                                </button>
                                                <button 
                                                    disabled={idx === allSorted.length - 1}
                                                    onClick={() => onMoveOperation(op.id, 'DOWN')}
                                                    className="p-1 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-all disabled:opacity-20"
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-5 overflow-visible">
                                    <MKGCodePicker 
                                        disabled={isLocked}
                                        value={op.mkgOperationCode || ''}
                                        options={mkgOperations}
                                        onSelect={(code) => onSelectPredefinedOp(op.id, code)}
                                    />
                                </td>
                                <td className="px-6 py-5">
                                    <input 
                                        disabled={isLocked}
                                        type="text" 
                                        className="w-full bg-transparent font-bold text-slate-800 dark:text-white uppercase tracking-tight italic outline-none border-b border-transparent focus:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed"
                                        value={op.description}
                                        onChange={e => onUpdateOperation(op.id, { description: e.target.value })}
                                    />
                                </td>
                                <td className="px-6 py-5">
                                    <button 
                                        onClick={() => onDetailClick(op.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                                    >
                                        Details <ArrowRight size={14} />
                                    </button>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    {!isLocked && (
                                        <button onClick={() => onDeleteOperation(op.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-slate-50 dark:bg-slate-700 rounded-2xl"><Trash2 size={16}/></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {article.operations.length === 0 && (
                            <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic font-medium">Nog geen bewerkingen toegevoegd.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
