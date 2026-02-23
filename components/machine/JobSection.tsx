
import React, { useState, useMemo } from 'react';
import { Machine, Article, ActiveJob, ArticleStatus, SetupStatus, AssetType, SetupVariant } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTable } from '../../hooks/useTable';
import { KEYS } from '../../services/db/core';
import { machineService } from '../../services/db/machineService';
import { 
    Briefcase, Search, ArrowRight, PlayCircle, StopCircle, 
    Monitor, ExternalLink
} from '../../icons';
import { useNavigate } from 'react-router-dom';

interface JobSectionProps {
    machine: Machine;
}

export const JobSection: React.FC<JobSectionProps> = ({ machine }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { data: articles } = useTable<Article>(KEYS.ARTICLES);
    const [searchTerm, setSearchTerm] = useState('');

    // --- MODE 1: SELECT JOB ---
    const availableJobs = useMemo(() => {
        if (!articles) return [];
        const term = searchTerm.toLowerCase();
        
        const options: { article: Article, setup: SetupVariant, opDesc: string }[] = [];

        articles.forEach(art => {
            if (art.status !== ArticleStatus.RELEASED) return;
            if (term && !art.articleCode.toLowerCase().includes(term) && !art.name.toLowerCase().includes(term)) return;

            art.operations.forEach(op => {
                op.setups.forEach(setup => {
                    const isDirectMatch = setup.machineId === machine.id;
                    if (isDirectMatch) {
                        options.push({ article: art, setup, opDesc: op.description });
                    }
                });
            });
        });

        return options;
    }, [articles, searchTerm, machine.id]);

    const handleStartJob = async (option: { article: Article, setup: SetupVariant }) => {
        if (!user) return;
        const job: ActiveJob = {
            articleId: option.article.id,
            articleName: option.article.name,
            articleCode: option.article.articleCode,
            setupId: option.setup.id,
            setupName: option.setup.name,
            startTime: new Date().toISOString(),
            operator: user.name
        };
        await machineService.assignJob(machine.id, job);
        // Direct doorsturen naar Dashboard
        navigate(`/production/machine/${machine.id}`);
    };

    const handleStopJob = async () => {
        if (window.confirm("Weet je zeker dat je deze setup wilt beëindigen?")) {
            await machineService.clearJob(machine.id);
        }
    };

    if (!machine.activeJob) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Briefcase size={40} className="text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic mb-2">Geen Actieve Werkorder</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">Selecteer een vrijgegeven artikel om de setup te laden en productie te starten.</p>
                    
                    <div className="relative max-w-lg mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Zoek op artikelnummer of omschrijving..." 
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 font-bold outline-none focus:border-blue-500 transition-all shadow-inner"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableJobs.map((opt, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group cursor-pointer shadow-sm" onClick={() => handleStartJob(opt)}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{opt.article.articleCode}</div>
                                    <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase italic">{opt.article.name}</h4>
                                </div>
                                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-black px-2 py-1 rounded border border-green-200 dark:border-green-800 uppercase">Rev {opt.article.revision}</span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400 mb-6">
                                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{opt.opDesc}</span>
                                <ArrowRight size={12} />
                                <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">{opt.setup.name}</span>
                            </div>

                            <button className="w-full py-3 bg-blue-600 group-hover:bg-blue-500 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all">
                                <PlayCircle size={16} /> Start Setup
                            </button>
                        </div>
                    ))}
                    {availableJobs.length === 0 && (
                        <div className="col-span-full text-center py-10 text-slate-400 italic text-sm">
                            Geen setups gevonden voor deze machine. (Alleen RELEASED artikelen worden getoond)
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in duration-300">
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-2xl text-center max-w-2xl w-full relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                    <Monitor size={200} />
                </div>
                
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 text-[10px] font-black uppercase tracking-widest mb-6 animate-pulse">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span> Actieve Productie
                    </div>
                    
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">
                        {machine.activeJob.articleCode}
                    </h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 font-bold mb-8">
                        {machine.activeJob.articleName}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <span className="block text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Setup</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-white">{machine.activeJob.setupName}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <span className="block text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Operator</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-white">{machine.activeJob.operator}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => navigate(`/production/machine/${machine.id}`)}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all hover:scale-105"
                        >
                            <ExternalLink size={24} /> Open Operator Dashboard
                        </button>
                        
                        <button 
                            onClick={handleStopJob} 
                            className="w-full py-4 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
                        >
                            <StopCircle size={16} /> Productie Stoppen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
