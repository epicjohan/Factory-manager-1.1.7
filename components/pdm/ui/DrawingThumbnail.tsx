/**
 * D-13: Geëxtraheerd uit ArticleList.tsx
 * Standalone component voor het tonen van tekening-thumbnails in de artikellijst.
 * Ondersteunt PDF preview (via iframe), afbeeldingen, en hover-popover.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileText } from '../../../icons';
import { Article, ArticleFile } from '../../../types';
import { FileRole } from '../../../types/pdm';
import { SyncService } from '../../../services/sync';
import { KEYS } from '../../../services/db/core';
import { usePdfBlobUrl } from '../../../hooks/usePdfBlobUrl';
import { resolveFileUrl } from '../../../utils/fileUtils';

interface DrawingThumbnailProps {
    article: Article;
    serverUrl?: string;
}

export const DrawingThumbnail: React.FC<DrawingThumbnailProps> = ({ article, serverUrl }) => {
    const [hovered, setHovered] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [dmsUrl, setDmsUrl] = useState<string | null>(null);

    const drawing = useMemo(() => {
        let rawFiles: any = (article as any).files || [];
        if (typeof rawFiles === 'string') {
            try { rawFiles = JSON.parse(rawFiles); } catch(e) { rawFiles = []; }
        }
        if (!Array.isArray(rawFiles)) rawFiles = [];
        
        const files: ArticleFile[] = rawFiles;
        return files.find(f => f.isThumbnail)
            || files.find(f => f.fileRole === FileRole.DRAWING)
            || files.find(f => f.type === 'application/pdf')
            || files.find(f => typeof f.type === 'string' && f.type.startsWith('image/'));
    }, [article]);

    useEffect(() => {
        if (!drawing) { setDmsUrl(null); return; }
        resolveFileUrl(drawing).then(url => setDmsUrl(url));
    }, [drawing]);

    const resolvedUrl = useMemo(() => {
        if (!drawing) return null;
        if (dmsUrl) return dmsUrl;
        if (serverUrl && drawing.name) {
            return SyncService.resolveFileUrl(article.id, drawing.name, KEYS.ARTICLES, serverUrl);
        }
        return null;
    }, [drawing, article.id, serverUrl, dmsUrl]);

    const isPdf = drawing?.type === 'application/pdf';
    const isImage = drawing?.type?.startsWith('image/');
    const safePdfUrl = usePdfBlobUrl(isPdf ? resolvedUrl : null);

    if (!drawing) {
        return (
            <div className="w-14 h-14 shrink-0 rounded-[2rem] bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600">
                <FileText size={22} />
            </div>
        );
    }

    return (
        <div
            className="relative w-16 h-20 shrink-0"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className={`w-16 h-20 rounded-lg border overflow-hidden cursor-pointer transition-all duration-200 ${hovered
                ? 'border-blue-400 shadow-lg shadow-blue-500/20 scale-105'
                : 'border-slate-200 dark:border-slate-700'
                } bg-slate-50 dark:bg-slate-800`}>
                {isImage ? (
                    <img src={resolvedUrl || undefined} alt={drawing.name} className="w-full h-full object-cover" loading="lazy" />
                ) : isPdf && safePdfUrl ? (
                    <div className="w-full h-full relative overflow-hidden pointer-events-none bg-white">
                        <iframe
                            src={`${safePdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                            className="absolute top-0 left-0 w-[250%] h-[250%] origin-top-left scale-[0.40] border-0"
                            tabIndex={-1}
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-950/30">
                        <FileText size={20} className="text-blue-500 dark:text-blue-400" />
                        <span className="text-[8px] font-black uppercase text-blue-400 mt-0.5 tracking-widest truncate w-full text-center px-1">
                            {drawing.name?.split('.').pop()?.toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {hovered && (
                <div
                    ref={tooltipRef}
                    className="absolute left-20 top-1/2 -translate-y-1/2 z-50 w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                    style={{ minHeight: '300px' }}
                >
                    {isImage && resolvedUrl ? (
                        <img src={resolvedUrl} alt={drawing.name} className="w-full h-80 object-contain bg-slate-50 dark:bg-slate-900 p-4" />
                    ) : (
                        safePdfUrl ? (
                            <iframe src={`${safePdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} title={drawing.name} className="w-full h-80 border-0 bg-white" />
                        ) : (
                            <div className="w-full h-80 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-xs py-4 text-center">
                                Laden voorbeeld...
                            </div>
                        )
                    )}
                    <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{drawing.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{drawing.fileRole}</p>
                    </div>
                </div>
            )}
        </div>
    );
};
