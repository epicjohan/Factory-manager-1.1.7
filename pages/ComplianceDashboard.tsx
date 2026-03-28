import React, { useState } from 'react';
import { ShieldCheck, Plus } from '../icons';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';
import { QmsFramework, QmsFolder } from '../types';
import { FrameworkCard } from '../components/qms/FrameworkCard';
import { NewFrameworkModal } from '../components/qms/NewFrameworkModal';

export const ComplianceDashboard: React.FC = () => {
    const { data: frameworks } = useTable<QmsFramework>(KEYS.QMS_FRAMEWORKS);
    const { data: folders } = useTable<QmsFolder>(KEYS.QMS_FOLDERS);
    const [showModal, setShowModal] = useState(false);

    const isoFrameworks = frameworks.filter(f => f.type === 'ISO_NORM');
    const customerFrameworks = frameworks.filter(f => f.type === 'CUSTOMER_AUDIT');

    const getFolderCount = (fwId: string) => folders.filter(f => f.frameworkId === fwId).length;

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-8 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <ShieldCheck size={160} />
                </div>
                <div className="relative z-10 min-w-0">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 uppercase italic tracking-tighter">
                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20">
                            <ShieldCheck size={32} />
                        </div>
                        Kwaliteit & Audits
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-xl">
                        Beheer ISO Normeringen, Klantaudits en bijbehorende documentatie.
                    </p>
                </div>
                
                <div className="relative z-10">
                    <button 
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/30 transition-transform active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={20} /> Nieuw Dossier
                    </button>
                </div>
            </div>
            
            <div className="space-y-12">
                <section>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic mb-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                        <span className="text-blue-500">ISO</span> Normeringen
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isoFrameworks.map(fw => (
                            <FrameworkCard key={fw.id} framework={fw} folderCount={getFolderCount(fw.id)} />
                        ))}
                        {isoFrameworks.length === 0 && (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] bg-slate-50 dark:bg-slate-800/30">
                                <p className="text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase">Geen Normeringen</p>
                            </div>
                        )}
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic mb-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                        <span className="text-emerald-500">Klant</span> Audits
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {customerFrameworks.map(fw => (
                            <FrameworkCard key={fw.id} framework={fw} folderCount={getFolderCount(fw.id)} />
                        ))}
                        {customerFrameworks.length === 0 && (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] bg-slate-50 dark:bg-slate-800/30">
                                <p className="text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase">Geen Klantaudits</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {showModal && (
                <NewFrameworkModal onClose={() => setShowModal(false)} onAdd={() => setShowModal(false)} />
            )}
        </div>
    );
};
