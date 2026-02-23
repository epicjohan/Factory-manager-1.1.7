
import React, { useState, useMemo } from 'react';
import { Wrench, Plus, Info, RotateCcw, AlertTriangle, X, History, Clock } from '../../../icons';
import { ArticleTool, SetupTemplate, SetupChangeEntry, SetupVariant } from '../../../types';
import { ToolBlock } from '../shared/ToolBlock';
import { generateId } from '../../../services/db/core';
import { useAuth } from '../../../contexts/AuthContext';

interface SetupToolsTabProps {
    tools: ArticleTool[];
    isLocked: boolean;
    template: SetupTemplate | null;
    changeLog: SetupChangeEntry[]; 
    onUpdateTool: (toolId: string, updates: Partial<ArticleTool>) => void;
    onAddTool: () => void;
    onDeleteTool: (toolId: string) => void;
    onUpdateSetup?: (updates: Partial<SetupVariant>) => void;
}

export const SetupToolsTab: React.FC<SetupToolsTabProps> = ({ 
    tools, isLocked, template, changeLog, onUpdateTool, onAddTool, onDeleteTool, onUpdateSetup 
}) => {
    const { user } = useAuth();
    
    // State
    const [showHistory, setShowHistory] = useState(false);
    
    // Replace Modal State
    const [replaceModal, setReplaceModal] = useState<{ isOpen: boolean; toolId: string | null }>({ isOpen: false, toolId: null });
    const [replaceReason, setReplaceReason] = useState('');
    const [newDescription, setNewDescription] = useState('');

    // Filtered & Sorted Tools
    const visibleTools = useMemo(() => {
        return (tools || [])
            .filter(t => showHistory || t.status !== 'REPLACED')
            .sort((a, b) => {
                // 1. Sort by T-Number (Order)
                if (a.order !== b.order) return a.order - b.order;
                // 2. Active tools first
                const aIsActive = a.status !== 'REPLACED';
                const bIsActive = b.status !== 'REPLACED';
                if (aIsActive && !bIsActive) return -1;
                if (!aIsActive && bIsActive) return 1;
                // 3. Newest first (for history items of same T-number)
                return new Date(b.dateChanged || 0).getTime() - new Date(a.dateChanged || 0).getTime();
            });
    }, [tools, showHistory]);

    const openReplaceModal = (toolId: string) => {
        const tool = tools.find(t => t.id === toolId);
        if (tool) {
            setNewDescription(tool.description);
            setReplaceReason('');
            setReplaceModal({ isOpen: true, toolId });
        }
    };

    const confirmReplace = () => {
        if (!replaceModal.toolId || !replaceReason.trim() || !onUpdateSetup) return;
        
        const oldTool = tools.find(t => t.id === replaceModal.toolId);
        if (!oldTool) return;

        const now = new Date().toISOString();

        // 1. Mark old tool as REPLACED (Soft Delete)
        const archivedTool: ArticleTool = {
            ...oldTool,
            status: 'REPLACED',
            changeReason: replaceReason, // Reason for being archived
            dateChanged: now
        };

        // 2. Create NEW active tool
        const newTool: ArticleTool = {
            ...oldTool,
            id: generateId(),
            description: newDescription,
            status: 'ACTIVE',
            replacedToolId: oldTool.id, // Link to history
            lifeTime: '', // Reset lifetime on replacement
            dateChanged: now,
            changeReason: undefined // Clear, or keep? Keeping clean for now.
        };

        // 3. Construct new array: replace old object reference + push new object
        const newToolsList = tools.map(t => t.id === oldTool.id ? archivedTool : t);
        newToolsList.push(newTool);

        // 4. Update Change Log
        const changeEntry: SetupChangeEntry = {
            id: generateId(),
            date: now,
            user: user?.name || 'Unknown',
            type: 'TOOL',
            description: `Tool T${oldTool.order} vervangen: ${oldTool.description} -> ${newDescription}`,
            reason: replaceReason
        };

        // 5. Commit all changes
        onUpdateSetup({
            tools: newToolsList,
            changeLog: [changeEntry, ...changeLog] 
        });
        
        setReplaceModal({ isOpen: false, toolId: null });
        setShowHistory(false); // Hide history to show the clean active list
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {template && template.toolFields && template.toolFields.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900 mb-4 flex items-center gap-3">
                    <Info className="text-blue-500 shrink-0" size={18} />
                    <div>
                        <h4 className="font-bold text-blue-800 dark:text-blue-300 text-xs">Tools geconfigureerd via sjabloon: {template.name}</h4>
                    </div>
                </div>
            )}
            
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-4">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 italic"><Wrench size={14} className="text-blue-500" /> Gereedschapslijst</h4>
                    
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${showHistory ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        <History size={12} /> {showHistory ? 'Verberg Historie' : 'Toon Historie'}
                    </button>
                </div>
                {!isLocked && (
                    <button onClick={onAddTool} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[11px] uppercase shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"><Plus size={16}/> Tool Toevoegen</button>
                )}
            </div>
            
            <div className="flex flex-col gap-3 pb-10">
                {visibleTools.map(tool => (
                    <div key={tool.id}>
                        <ToolBlock 
                            tool={tool} 
                            disabled={isLocked || tool.status === 'REPLACED'} 
                            onUpdate={(updates) => onUpdateTool(tool.id, updates)} 
                            onDelete={() => onDeleteTool(tool.id)}
                            onReplace={() => openReplaceModal(tool.id)}
                            template={template}
                        />
                        
                        {/* History Info Banner for Active Tools that replaced something */}
                        {tool.status === 'ACTIVE' && tool.replacedToolId && (
                            <div className="ml-14 mt-1 flex items-center gap-2 text-[10px] text-blue-600/70 font-bold uppercase tracking-wide">
                                <RotateCcw size={10} /> Vervangt vorig item
                            </div>
                        )}
                        
                        {/* History Banner for Archived Tools */}
                        {tool.status === 'REPLACED' && (
                            <div className="ml-14 mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                <Clock size={10} /> Vervangen op {new Date(tool.dateChanged || '').toLocaleDateString()} {tool.changeReason ? `(${tool.changeReason})` : ''}
                            </div>
                        )}
                    </div>
                ))}
                
                {visibleTools.length === 0 && (
                    <div className="py-20 text-center text-slate-400 italic border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem] flex flex-col items-center bg-white dark:bg-slate-800/50 shadow-inner">
                        <Wrench size={40} className="mb-4 opacity-10" />
                        <p className="text-xs font-bold uppercase tracking-widest">Nog geen gereedschappen gedefinieerd</p>
                    </div>
                )}
            </div>

            {/* REPLACE MODAL */}
            {replaceModal.isOpen && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative border-2 border-orange-500">
                        <button onClick={() => setReplaceModal({isOpen: false, toolId: null})} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20}/></button>
                        
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-orange-50">
                                <RotateCcw size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Tool Vervangen</h3>
                            <p className="text-xs font-bold text-slate-500 mt-2">
                                Dit archiveert de huidige tool en maakt een nieuwe actieve versie aan.
                            </p>
                        </div>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Nieuwe Omschrijving / Type</label>
                                <input 
                                    autoFocus
                                    type="text"
                                    className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none focus:border-orange-500 transition-all text-sm"
                                    value={newDescription}
                                    onChange={e => setNewDescription(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Reden van wijziging *</label>
                                <textarea 
                                    rows={3}
                                    className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium outline-none focus:border-orange-500 transition-all text-sm"
                                    placeholder="Bijv. Niet leverbaar, alternatief merk, breuk..."
                                    value={replaceReason}
                                    onChange={e => setReplaceReason(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setReplaceModal({isOpen: false, toolId: null})} className="flex-1 py-3 text-slate-500 font-bold uppercase text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Annuleren</button>
                            <button onClick={confirmReplace} disabled={!replaceReason.trim()} className="flex-2 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg disabled:opacity-50 transition-all">Vervangen & Loggen</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
