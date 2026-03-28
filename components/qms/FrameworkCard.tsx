import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileText, Factory, ArrowRight, CheckCircle2 } from '../../icons';
import { QmsFramework } from '../../types';

interface FrameworkCardProps {
    framework: QmsFramework;
    folderCount?: number;
}

export const FrameworkCard: React.FC<FrameworkCardProps> = ({ framework, folderCount = 0 }) => {
    const navigate = useNavigate();

    const isEco = framework.type === 'ISO_NORM';

    return (
        <div 
            onClick={() => navigate(`/compliance/${framework.id}`)}
            className={`group bg-white dark:bg-slate-800 p-6 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 relative overflow-hidden min-h-[180px]
            ${isEco ? 'border-blue-100 hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-600' : 'border-emerald-100 hover:border-emerald-300 dark:border-slate-700 dark:hover:border-emerald-600'}`}
        >
            <div className={`absolute top-0 right-0 p-8 opacity-[0.03] transition-transform duration-500 group-hover:scale-125
                ${isEco ? 'text-blue-600' : 'text-emerald-600'}`}
            >
                {isEco ? <ShieldCheck size={160} /> : <Factory size={160} />}
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl shadow-inner
                        ${isEco ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'}`}
                    >
                        {isEco ? <FileText size={24} /> : <Factory size={24} />}
                    </div>

                    {framework.status === 'ACTIVE' && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-200 dark:border-green-800/50">
                            <CheckCircle2 size={12} /> Actief
                        </div>
                    )}
                </div>

                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2 pr-4">{framework.name}</h3>
                
                {framework.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-2">{framework.description}</p>
                )}
            </div>

            <div className="relative z-10 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
                <div className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <span>{folderCount} Dossiers (Jaren)</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-colors">
                    <ArrowRight size={16} />
                </div>
            </div>
        </div>
    );
};
