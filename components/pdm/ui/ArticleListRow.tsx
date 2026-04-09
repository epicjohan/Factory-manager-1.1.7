/**
 * D-13: Geëxtraheerd uit ArticleList.tsx
 * Afzonderlijke rij-component voor elk artikel in de lijst.
 */

import React from 'react';
import { FileText } from '../../../icons';
import { Article, ArticleStatus } from '../../../types';
import { DrawingThumbnail } from './DrawingThumbnail';

const STATUS_CONFIG: Record<string, { label: string; pill: string }> = {
    [ArticleStatus.DRAFT]: { label: 'Draft', pill: 'bg-slate-600 text-white' },
    [ArticleStatus.LOCKED]: { label: 'Vergrendeld', pill: 'bg-green-600 text-white shadow-sm shadow-green-500/30' },
    [ArticleStatus.OBSOLETE]: { label: 'Obsolete', pill: 'bg-red-700 text-white' },
};

interface ArticleListRowProps {
    article: Article;
    serverUrl?: string;
    onEdit: (article: Article) => void;
}

const RevBadge: React.FC<{ article: Article }> = ({ article }) => {
    const isLocked = article.status === ArticleStatus.LOCKED;
    return (
        <div className={`w-11 h-11 shrink-0 rounded-[2rem] flex flex-col items-center justify-center font-black text-white ${isLocked ? 'bg-green-600' : 'bg-slate-500'}`}>
            <span className="text-[8px] uppercase opacity-70 leading-none">Rev</span>
            <span className="text-sm leading-none mt-0.5">{article.revision}</span>
        </div>
    );
};

export const ArticleListRow: React.FC<ArticleListRowProps> = ({ article, serverUrl, onEdit }) => {
    return (
        <div
            onClick={() => onEdit(article)}
            className="group flex items-center gap-4 bg-white dark:bg-slate-800 px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
        >
            <DrawingThumbnail article={article} serverUrl={serverUrl} />
            <RevBadge article={article} />

            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 dark:text-white text-base truncate">{article.name}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 items-center mt-0.5">
                    <span className="text-sm font-mono text-blue-600 dark:text-blue-400 font-black tracking-tight">{article.articleCode}</span>
                    {article.drawingNumber && (
                        <span className="text-xs text-slate-400 flex items-center gap-1"><FileText size={11} /> {article.drawingNumber}</span>
                    )}
                    {article.material && <span className="text-xs text-slate-400">{article.material}</span>}
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-3 mt-1 flex-wrap">
                    <span>{(article.operations || []).length} routing stap{(article.operations || []).length !== 1 ? 'pen' : ''}</span>
                    {article.created && (
                        <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span> AANGEMAAKT: {new Date(article.created).toLocaleDateString('nl-NL')}</span>
                    )}
                    {article.updated && (
                        <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span> GEWIJZIGD: {new Date(article.updated).toLocaleDateString('nl-NL')}</span>
                    )}
                </div>
            </div>

            <span className={`px-3 py-1 rounded-2xl text-[10px] font-black uppercase tracking-widest shrink-0 ${STATUS_CONFIG[article.status]?.pill || 'bg-slate-400 text-white'}`}>
                {STATUS_CONFIG[article.status]?.label || article.status}
            </span>
        </div>
    );
};
