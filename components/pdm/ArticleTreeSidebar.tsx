
import React, { useState } from 'react';
import { Article, ArticleStatus, SetupStatus } from '../../types';
import { 
    ChevronRight, ChevronDown, Layers, FileText, Monitor, Box, 
    Plus, MoreHorizontal, ShieldCheck, AlertTriangle 
} from '../../icons';

interface ArticleTreeSidebarProps {
    article: Article;
    selectedId: string | null; // ID of Article, Operation or Setup
    onSelect: (type: 'ARTICLE' | 'OPERATION' | 'SETUP', id: string, parentId?: string) => void;
    onAddOperation: () => void;
    isLocked: boolean;
}

export const ArticleTreeSidebar: React.FC<ArticleTreeSidebarProps> = ({ 
    article, selectedId, onSelect, onAddOperation, isLocked 
}) => {
    const [expandedIds, setExpandedIds] = useState<string[]>([article.id]);

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedIds(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const isExpanded = (id: string) => expandedIds.includes(id);
    const isSelected = (id: string) => selectedId === id;

    const StatusDot = ({ status }: { status?: string }) => {
        let color = 'bg-slate-300';
        if (status === SetupStatus.RELEASED) color = 'bg-green-500';
        if (status === SetupStatus.DRAFT) color = 'bg-orange-400';
        if (status === SetupStatus.REVIEW) color = 'bg-yellow-400';
        if (status === SetupStatus.ARCHIVED) color = 'bg-blue-400';
        return <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />;
    };

    return (
        <div className="flex flex-col h-full">
            {/* HEADER */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Explorer</h3>
                <div className="font-bold text-slate-800 dark:text-white truncate" title={article.name}>{article.articleCode}</div>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${article.status === ArticleStatus.RELEASED ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                        {article.status}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">Rev {article.revision}</span>
                </div>
            </div>

            {/* TREE */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                
                {/* ROOT: ARTICLE */}
                <div 
                    onClick={() => onSelect('ARTICLE', article.id)}
                    className={`flex items-center gap-2 p-2 rounded-[2rem] cursor-pointer transition-all border ${isSelected(article.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                    <button onClick={(e) => toggleExpand(article.id, e)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                        {isExpanded(article.id) ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                    </button>
                    <FileText size={16} className="text-blue-500" />
                    <span className={`text-sm font-bold truncate ${isSelected(article.id) ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>Stamgegevens</span>
                </div>

                {/* CHILDREN: OPERATIONS */}
                {isExpanded(article.id) && (
                    <div className="ml-4 pl-2 border-l border-slate-200 dark:border-slate-700 space-y-1 mt-1">
                        {article.operations.sort((a,b) => a.order - b.order).map(op => (
                            <div key={op.id}>
                                <div 
                                    onClick={() => onSelect('OPERATION', op.id)}
                                    className={`flex items-center gap-2 p-2 rounded-[2rem] cursor-pointer transition-all border group ${isSelected(op.id) ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                >
                                    <button onClick={(e) => toggleExpand(op.id, e)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                                        {isExpanded(op.id) ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                    </button>
                                    <div className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500">
                                        {op.order}
                                    </div>
                                    <span className={`text-xs font-bold truncate flex-1 ${isSelected(op.id) ? 'text-orange-700 dark:text-orange-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {op.description || 'Bewerking'}
                                    </span>
                                </div>

                                {/* GRANDCHILDREN: SETUPS */}
                                {isExpanded(op.id) && (
                                    <div className="ml-4 pl-2 border-l border-slate-200 dark:border-slate-700 space-y-1 mt-1 mb-2">
                                        {(() => {
                                            const activeSetups = op.setups.filter(s => s.status !== SetupStatus.ARCHIVED).sort((a,b) => (b.version || 1) - (a.version || 1));
                                            const archivedSetups = op.setups.filter(s => s.status === SetupStatus.ARCHIVED).sort((a,b) => (b.version || 1) - (a.version || 1));
                                            const archivedGroupId = `ARCHIVED_GROUP_${op.id}`;

                                            return (
                                                <>
                                                    {activeSetups.map(setup => (
                                                        <div 
                                                            key={setup.id}
                                                            onClick={() => onSelect('SETUP', setup.id, op.id)}
                                                            className={`flex items-center gap-2 p-2 rounded-[2rem] cursor-pointer transition-all border ${isSelected(setup.id) ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                                        >
                                                            <div className="w-4 flex justify-center"><StatusDot status={setup.status} /></div>
                                                            {setup.machineId ? <Monitor size={14} className="text-slate-400" /> : <Box size={14} className="text-slate-400" />}
                                                            <span className={`text-xs font-medium truncate flex-1 ${isSelected(setup.id) ? 'text-purple-700 dark:text-purple-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                {setup.name} {setup.version && setup.version > 1 && `(v${setup.version})`}
                                                            </span>
                                                        </div>
                                                    ))}

                                                    {archivedSetups.length > 0 && (
                                                        <div className="mt-1 pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
                                                            <button 
                                                                onClick={(e) => toggleExpand(archivedGroupId, e)}
                                                                className="flex items-center gap-2 w-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors group"
                                                            >
                                                                {isExpanded(archivedGroupId) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                                <span className="text-[10px] font-black uppercase tracking-widest flex-1 text-left group-hover:text-blue-500 transition-colors">Archived ({archivedSetups.length})</span>
                                                            </button>
                                                            
                                                            {isExpanded(archivedGroupId) && (
                                                                <div className="ml-2 pl-2 border-l border-slate-200 dark:border-slate-700 space-y-1 mt-1">
                                                                    {archivedSetups.map(setup => (
                                                                        <div 
                                                                            key={setup.id}
                                                                            onClick={() => onSelect('SETUP', setup.id, op.id)}
                                                                            className={`flex items-center gap-2 p-2 rounded-[2rem] cursor-pointer transition-all border opacity-60 hover:opacity-100 ${isSelected(setup.id) ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                                                        >
                                                                            <div className="w-4 flex justify-center"><StatusDot status={setup.status} /></div>
                                                                            <span className={`text-xs font-medium truncate flex-1 ${isSelected(setup.id) ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-500'}`}>
                                                                                {setup.name} {setup.version && `(v${setup.version})`}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* ADD OPERATION BUTTON */}
                        {!isLocked && (
                            <button 
                                onClick={onAddOperation}
                                className="flex items-center gap-2 p-2 rounded-[2rem] text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-xs font-bold w-full"
                            >
                                <div className="w-5 h-5 flex items-center justify-center rounded border border-dashed border-slate-300"><Plus size={12}/></div>
                                <span>Bewerking Toevoegen</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
