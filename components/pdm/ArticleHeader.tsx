
import React, { useState, useEffect } from 'react';
import { Settings, Save, Lock, LockOpen, ArrowRight, CornerUpRight, AlertTriangle, Archive } from '../../icons';
import { Article, ArticleStatus, User } from '../../types';

interface ArticleHeaderProps {
    article: Article | null;
    isLocked: boolean;
    canEdit: boolean;
    canRelease: boolean;
    canManageLock?: boolean;
    onSave: (data: Partial<Article>) => void;
    user: User | null;
    onChangeStatus?: (status: ArticleStatus) => void;
    onRevise?: () => void;
    onObsolete?: () => void;
}

export const ArticleHeader: React.FC<ArticleHeaderProps> = ({ article, isLocked, canEdit, canRelease, canManageLock = false, onSave, onChangeStatus, onRevise, onObsolete }) => {
    const [formCode, setFormCode] = useState('');
    const [formDrawing, setFormDrawing] = useState('');
    const [formDrawingRev, setFormDrawingRev] = useState('');
    const [formRev, setFormRev] = useState('A');
    const [formPos, setFormPos] = useState('');
    const [formName, setFormName] = useState('');
    const [formDesc2, setFormDesc2] = useState('');

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
        // NOTE: `revision` is intentionally omitted — PLM revisie mag NOOIT
        // direct worden opgeslagen via de stamgegevens-form. Uitsluitend via
        // articleService.createNewRevision() (knop "Nieuwe Revisie").
        onSave({
            articleCode: formCode,
            drawingNumber: formDrawing,
            drawingRevision: formDrawingRev,
            posNumber: formPos,
            name: formName,
            description2: formDesc2
        });
    };

    const handleLock = () => {
        if (!onChangeStatus) return;
        onChangeStatus(ArticleStatus.LOCKED);
    };

    const handleUnlock = () => {
        if (!onChangeStatus) return;
        if (window.confirm('Artikel ontgrendelen? Bron-documentatie wordt dan opnieuw bewerkbaar.')) {
            onChangeStatus(ArticleStatus.DRAFT);
        }
    };

    // Status indicator
    const statusConfig: Record<ArticleStatus, { label: string; color: string; dot: string }> = {
        [ArticleStatus.DRAFT]: {
            label: 'Draft',
            color: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30',
            dot: 'bg-blue-400'
        },
        [ArticleStatus.LOCKED]: {
            label: 'Vergrendeld',
            color: 'bg-green-600 text-white shadow-lg shadow-green-500/30',
            dot: 'bg-green-400'
        },
        [ArticleStatus.OBSOLETE]: {
            label: 'Gearchiveerd',
            color: 'bg-red-600 text-white',
            dot: 'bg-red-400'
        }
    };

    const cfg = statusConfig[currentStatus] ?? statusConfig[ArticleStatus.DRAFT];

    return (
        <div className="animate-in fade-in duration-300 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-100 dark:border-slate-700 pb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-1">
                        <Settings size={20} className="text-blue-600" /> Stamgegevens
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">MKG Data & Lifecycle Management</p>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>
                        <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
                        {cfg.label}
                    </div>
                    {currentStatus === ArticleStatus.DRAFT && (
                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <ArrowRight size={12} />
                            Vergrendelen om bron-docs te beveiligen
                        </div>
                    )}
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
                <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t dark:border-slate-700">
                    <div className="flex gap-2 flex-wrap">
                        {currentStatus === ArticleStatus.LOCKED && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-2xl">
                                <Lock size={12} /> Bron-docs vergrendeld
                            </div>
                        )}
                        {currentStatus === ArticleStatus.OBSOLETE && (
                            <div className="px-3 py-2 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5 border border-slate-200">
                                <AlertTriangle size={13} /> Gearchiveerd
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {/* Save — only in DRAFT */}
                        {!isReadOnly && (
                            <button type="submit" className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-black uppercase shadow-sm flex items-center gap-2 transition-all active:scale-95 text-[10px] tracking-widest">
                                <Save size={14} /> Opslaan
                            </button>
                        )}

                        {/* Lock: DRAFT → LOCKED */}
                        {currentStatus === ArticleStatus.DRAFT && canManageLock && (
                            <button type="button" onClick={handleLock} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase shadow-lg shadow-green-500/30 flex items-center gap-2 transition-all active:scale-95 text-[10px] tracking-widest">
                                <Lock size={14} /> Vergrendelen
                            </button>
                        )}

                        {/* Unlock: LOCKED → DRAFT */}
                        {currentStatus === ArticleStatus.LOCKED && canManageLock && (
                            <button type="button" onClick={handleUnlock} className="px-4 py-2 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 dark:bg-slate-800 dark:hover:bg-blue-900/20 dark:text-slate-400 dark:hover:text-blue-400 dark:border-slate-700 dark:hover:border-blue-800 rounded-2xl font-black uppercase flex items-center gap-2 transition-all active:scale-95 text-[10px] tracking-widest">
                                <LockOpen size={14} /> Ontgrendelen
                            </button>
                        )}

                        {/* Archiveren + Revisie — alleen vanuit LOCKED */}
                        {currentStatus === ArticleStatus.LOCKED && canEdit && (
                            <>
                                <button type="button" onClick={() => onObsolete && onObsolete()} className="px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 dark:bg-slate-800 dark:hover:bg-red-900/20 dark:text-slate-400 dark:hover:text-red-400 dark:border-slate-700 dark:hover:border-red-800 rounded-2xl font-black uppercase flex items-center gap-2 transition-all active:scale-95 text-[10px] tracking-widest">
                                    <Archive size={14} /> Archiveren
                                </button>
                                <button type="button" onClick={() => onRevise && onRevise()} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase shadow-lg shadow-orange-500/30 flex items-center gap-2 transition-all active:scale-95 text-[10px] tracking-widest">
                                    <CornerUpRight size={14} /> Nieuwe Revisie
                                </button>
                            </>
                        )}
                    </div>
                </div>

            </form>
        </div>
    );
};
