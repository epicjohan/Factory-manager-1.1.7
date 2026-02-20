
import React, { useState, useMemo } from 'react';
import { Layers, BookOpen, Plus, Search, FileText, Filter } from 'lucide-react';
import { Article, ArticleStatus, UserRole } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';

interface ArticleListProps {
    articles: Article[];
    canCreate: boolean;
    canManageCatalog: boolean;
    onCreateNew: () => void;
    onEdit: (article: Article) => void;
    onOpenCatalog: () => void;
}

export const ArticleList: React.FC<ArticleListProps> = ({ 
    articles, canCreate, canManageCatalog, onCreateNew, onEdit, onOpenCatalog 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ArticleStatus | 'ALL'>('ALL');

    // Calculate live counts for the filter bar
    const statusCounts = useMemo(() => {
        const counts = {
            ALL: articles.length,
            [ArticleStatus.DRAFT]: 0,
            [ArticleStatus.REVIEW]: 0,
            [ArticleStatus.PROTOTYPE]: 0,
            [ArticleStatus.RELEASED]: 0,
            [ArticleStatus.OBSOLETE]: 0,
        };
        articles.forEach(a => {
            if (counts[a.status] !== undefined) {
                counts[a.status]++;
            }
        });
        return counts;
    }, [articles]);

    const filteredArticles = useMemo(() => {
        return articles.filter(a => {
            const matchesSearch = 
                a.articleCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
                a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.drawingNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a,b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
    }, [articles, searchTerm, statusFilter]);

    // Lokaal StatusBadge component
    const LocalStatusBadge: React.FC<{ status: ArticleStatus }> = ({ status }) => {
        const colors: Record<string, string> = {
            [ArticleStatus.DRAFT]: 'bg-slate-200 text-slate-600 border-slate-300',
            [ArticleStatus.REVIEW]: 'bg-orange-100 text-orange-700 border-orange-200',
            [ArticleStatus.PROTOTYPE]: 'bg-purple-100 text-purple-700 border-purple-200',
            [ArticleStatus.RELEASED]: 'bg-green-100 text-green-700 border-green-200 shadow-sm shadow-green-500/20',
            [ArticleStatus.OBSOLETE]: 'bg-slate-100 text-slate-400 border-slate-200 line-through decoration-slate-400',
        };
        return <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border tracking-wider ${colors[status as string] || 'bg-slate-100'}`}>{status}</span>;
    };

    const FilterChip = ({ status, label, activeClass }: { status: ArticleStatus | 'ALL', label: string, activeClass: string }) => {
        const isActive = statusFilter === status;
        const count = statusCounts[status];
        
        return (
            <button 
                onClick={() => setStatusFilter(status)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all whitespace-nowrap ${isActive ? activeClass : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'}`}
            >
                {label}
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] min-w-[20px] text-center ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                    {count}
                </span>
            </button>
        );
    };

    return (
        <div className="max-w-7xl mx-auto pb-20 text-left animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Layers className="text-blue-600" /> Artikelen (PDM)
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gekoppeld aan MKG Stamgegevens.</p>
                </div>
                <div className="flex gap-3">
                    {canManageCatalog && (
                        <button onClick={onOpenCatalog} className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 transition-all">
                            <BookOpen size={20} /> Bewerkingen Catalogus
                        </button>
                    )}
                    {canCreate && (
                        <button onClick={onCreateNew} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all">
                            <Plus size={20} /> Nieuw Artikel
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                <FilterChip status="ALL" label="Alles" activeClass="bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30" />
                <FilterChip status={ArticleStatus.DRAFT} label="Draft" activeClass="bg-slate-600 border-slate-600 text-white shadow-lg" />
                <FilterChip status={ArticleStatus.REVIEW} label="Review" activeClass="bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30" />
                <FilterChip status={ArticleStatus.PROTOTYPE} label="Prototype" activeClass="bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/30" />
                <FilterChip status={ArticleStatus.RELEASED} label="Released" activeClass="bg-green-600 border-green-600 text-white shadow-lg shadow-green-500/30" />
                <FilterChip status={ArticleStatus.OBSOLETE} label="Obsolete" activeClass="bg-red-600 border-red-600 text-white shadow-lg" />
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Zoek op code, omschrijving of tekening..." 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {filteredArticles.map(article => (
                    <div key={article.id} onClick={() => onEdit(article)} className="group bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer shadow-sm hover:shadow-md">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black ${article.status === ArticleStatus.RELEASED ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                                    <span className="text-[10px] uppercase opacity-60">Rev</span>
                                    <span className="text-xl">{article.revision}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">{article.name}</h3>
                                    <div className="flex gap-4 items-center">
                                        <div className="text-sm font-mono text-blue-600 dark:text-blue-400 font-black tracking-tight">{article.articleCode}</div>
                                        <div className="text-xs text-slate-400 flex items-center gap-1"><FileText size={12}/> {article.drawingNumber}</div>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{(article.operations || []).length} Routing stappen</div>
                                </div>
                            </div>
                            <LocalStatusBadge status={article.status} />
                        </div>
                    </div>
                ))}
                {filteredArticles.length === 0 && <div className="text-center py-20 text-slate-400 italic">Geen artikelen gevonden.</div>}
            </div>
        </div>
    );
};
