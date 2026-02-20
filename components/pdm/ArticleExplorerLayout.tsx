
import React from 'react';

interface ArticleExplorerLayoutProps {
    sidebar: React.ReactNode;
    main: React.ReactNode;
    panel: React.ReactNode;
    showPanel: boolean;
}

export const ArticleExplorerLayout: React.FC<ArticleExplorerLayoutProps> = ({ 
    sidebar, main, panel, showPanel 
}) => {
    return (
        <div className="flex h-[calc(100vh-120px)] gap-4 overflow-hidden animate-in fade-in duration-300">
            {/* ZONE A: SIDEBAR (Tree) */}
            <div className="w-80 shrink-0 flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {sidebar}
            </div>

            {/* ZONE B: MAIN EDITOR (Document) */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden relative">
                {main}
            </div>

            {/* ZONE C: CONTEXT PANEL (PDF/Drawing) */}
            {showPanel && (
                <div className="w-[35%] shrink-0 flex flex-col bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden transition-all duration-300">
                    {panel}
                </div>
            )}
        </div>
    );
};
