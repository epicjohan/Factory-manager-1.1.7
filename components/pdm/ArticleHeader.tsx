
import React, { useState, useEffect } from 'react';
import { Settings, Save, Lock, ArrowRight, ShieldCheck, CornerUpRight, AlertTriangle, FileUp } from '../../icons';
import { Article, ArticleStatus, User } from '../../types';

interface ArticleHeaderProps {
    article: Article | null;
    isLocked: boolean;
    canEdit: boolean;
    canRelease: boolean;
    onSave: (data: Partial<Article>) => void;
    user: User | null;
    onChangeStatus?: (status: ArticleStatus) => void;
    onRevise?: () => void;
}

export const ArticleHeader: React.FC<ArticleHeaderProps> = ({ article, isLocked, canEdit, canRelease, onSave, onChangeStatus, onRevise }) => {
    const [formCode, setFormCode] = useState('');
    const [formDrawing, setFormDrawing] = useState('');
    const [formDrawingRev, setFormDrawingRev] = useState('');
    const [formRev, setFormRev] = useState('A');
    const [formPos, setFormPos] = useState('');
    const [formName, setFormName] = useState('');
    const [formDesc2, setFormDesc2] = useState('');
    
    // Derived state
    const currentStatus = article?.status || ArticleStatus.DRAFT;
    const isReadOnly = isLocked || !canEdit;

    useEffect(() => {
        if (article) {
            setFormCode(article.articleCode);
            setFormDrawing(article.drawingNumber || '');
            setFormDrawingRev(article.drawingRevision || '');
            setFormRev(article.revision);
            setFormPos(article.posNumber || '');
            setFormName(article.name);
            setFormDesc2(article.description2 || '');
        } else {
            setFormCode('');
            setFormDrawing('');
            setFormDrawingRev('');
            setFormRev('A');
            setFormPos('');
            setFormName('');
            setFormDesc2('');
        }
    }, [article]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            articleCode: formCode,
            drawingNumber: formDrawing,
            drawingRevision: formDrawingRev,
            revision: formRev,
            posNumber: formPos,
            name: formName,
            description2: formDesc2
        });
    };

    const handlePromote = () => {
        if (!onChangeStatus) return;
        if (currentStatus === ArticleStatus.DRAFT) onChangeStatus(ArticleStatus.REVIEW);
        else if (currentStatus === ArticleStatus.REVIEW) onChangeStatus(ArticleStatus.RELEASED);
    };

    const handleDemote = () => {
        if (!onChangeStatus) return;
        if (currentStatus === ArticleStatus.REVIEW) onChangeStatus(ArticleStatus.DRAFT);
        if (currentStatus === ArticleStatus.RELEASED) {
            if(window.confirm("Let op: Een vrijgegeven artikel intrekken naar Draft maakt het bewerkbaar. Weet u het zeker?")) {
                onChangeStatus(ArticleStatus.DRAFT);
            }
        }
    };

    const triggerRevise = () => {
        if (onRevise) onRevise();
    };

    const StatusStep = ({ status, label, current }: { status: ArticleStatus, label: string, current: ArticleStatus }) => {
        const order = [ArticleStatus.DRAFT, ArticleStatus.REVIEW, ArticleStatus.PROTOTYPE, ArticleStatus.RELEASED, ArticleStatus.OBSOLETE];
        const idx = order.indexOf(status);
        const currentIdx = order.indexOf(current);
        
        let colorClass = 'bg-slate-100 text-slate-400 dark:bg-slate-900/50';
        if (current === status) {
            if (status === ArticleStatus.RELEASED) colorClass = 'bg-green-600 text-white shadow-lg shadow-green-500/30';
            else if (status === ArticleStatus.OBSOLETE) colorClass = 'bg-red-600 text-white';
            else colorClass = 'bg-blue-600 text-white shadow-lg shadow-blue-500/30';
        } else if (currentIdx > idx && current !== ArticleStatus.OBSOLETE) {
            colorClass = 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800';
        }

        return (
            <div className={`flex items-center justify-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${colorClass}`}>
                {label}
            </div>
        );
    };

    return (
        <div className="animate-in fade-in duration-300 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-100 dark:border-slate-700 pb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-1">
                        <Settings size={20} className="text-blue-600" /> Stamgegevens
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">MKG Data & Lifecycle Management</p>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-x-auto">
                    <StatusStep status={ArticleStatus.DRAFT} label="Draft" current={currentStatus} />
                    <ArrowRight size={12} className="text-slate-300" />
                    <StatusStep status={ArticleStatus.REVIEW} label="Review" current={currentStatus} />
                    <ArrowRight size={12} className="text-slate-300" />
                    <StatusStep status={ArticleStatus.RELEASED} label="Released" current={currentStatus} />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border dark:border-slate-700 shadow-sm relative overflow-hidden">
                    {isReadOnly && <div className="absolute top-0 right-0 p-4 opacity-10"><Lock size={120} /></div>}
                    
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Artikelcode MKG *</label>
                            <input disabled={isReadOnly} required type="text" className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono font-black text-lg disabled:opacity-60 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase" value={formCode} onChange={e => setFormCode(e.target.value)} />
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-3">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Tekening Nr (PDF) *</label>
                                <input disabled={isReadOnly} required type="text" className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold disabled:opacity-60 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formDrawing} onChange={e => setFormDrawing(e.target.value)} />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Tek. Rev</label>
                                <input disabled={isReadOnly} type="text" className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold text-center disabled:opacity-60 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formDrawingRev} onChange={e => setFormDrawingRev(e.target.value)} placeholder="-" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="flex gap-4 items-start">
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Omschrijving 1 (Naam) *</label>
                                <input disabled={isReadOnly} required type="text" className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold text-lg disabled:opacity-60 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formName} onChange={e => setFormName(e.target.value)} />
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-[2rem] text-center border border-slate-200 dark:border-slate-700 min-w-[70px] shadow-sm">
                                <div className="text-[8px] uppercase font-black text-slate-400 tracking-widest mb-0.5">PLM Rev</div>
                                <div className="text-2xl font-black text-slate-800 dark:text-white">{formRev}</div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Omschrijving 2 (Info)</label>
                                <input disabled={isReadOnly} type="text" className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-medium disabled:opacity-60 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formDesc2} onChange={e => setFormDesc2(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Pos Nr</label>
                                <input disabled={isReadOnly} type="text" className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold text-center disabled:opacity-60 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formPos} onChange={e => setFormPos(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Workflow Actions Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4 border-t dark:border-slate-700">
                    <div className="flex gap-3">
                        {currentStatus === ArticleStatus.REVIEW && canEdit && (
                            <button 
                                type="button" 
                                onClick={handleDemote}
                                className="px-6 py-4 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                            >
                                Afkeuren (Terug naar Draft)
                            </button>
                        )}
                        {currentStatus === ArticleStatus.RELEASED && (
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-[2rem]">
                                <Lock size={14} /> Read-Only Mode
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        {!isReadOnly && (
                            <button type="submit" className="flex-1 md:flex-none px-8 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-black uppercase shadow-sm flex items-center justify-center gap-3 transition-all active:scale-95 text-xs tracking-widest">
                                <Save size={16} /> Opslaan
                            </button>
                        )}

                        {currentStatus === ArticleStatus.DRAFT && canEdit && (
                            <button type="button" onClick={handlePromote} className="flex-1 md:flex-none px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase shadow-lg shadow-blue-500/30 flex items-center justify-center gap-3 transition-all active:scale-95 text-xs tracking-widest">
                                <FileUp size={16} /> Ter Review Aanbieden
                            </button>
                        )}

                        {currentStatus === ArticleStatus.REVIEW && canRelease && (
                            <button type="button" onClick={handlePromote} className="flex-1 md:flex-none px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase shadow-lg shadow-green-500/30 flex items-center justify-center gap-3 transition-all active:scale-95 text-xs tracking-widest">
                                <ShieldCheck size={16} /> Vrijgeven (Release)
                            </button>
                        )}

                        {currentStatus === ArticleStatus.RELEASED && canEdit && (
                            <button type="button" onClick={triggerRevise} className="flex-1 md:flex-none px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase shadow-lg shadow-orange-500/30 flex items-center justify-center gap-3 transition-all active:scale-95 text-xs tracking-widest animate-pulse">
                                <CornerUpRight size={16} /> Nieuwe Revisie
                            </button>
                        )}
                        
                        {currentStatus === ArticleStatus.OBSOLETE && (
                            <div className="px-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 border border-slate-200">
                                <AlertTriangle size={16} /> Gearchiveerd
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};
