
import React, { useState } from 'react';
import { SiteEnergyView } from '../components/energy/SiteEnergyView';
import { AssetEnergyView } from '../components/energy/AssetEnergyView';
import { Factory, Plug } from '../icons';

export const EnergyDashboard: React.FC = () => {
    const [activeView, setActiveView] = useState<'SITE' | 'ASSETS'>('SITE');

    return (
        <div className="max-w-7xl mx-auto pb-20 text-left">
            <div className="flex justify-center mb-8">
                <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 inline-flex shadow-sm">
                    <button 
                        onClick={() => setActiveView('SITE')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${activeView === 'SITE' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Factory size={18} /> Site Grid (P1)
                    </button>
                    <button 
                        onClick={() => setActiveView('ASSETS')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${activeView === 'ASSETS' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Plug size={18} /> Asset Grid (Micro)
                    </button>
                </div>
            </div>

            {activeView === 'SITE' ? <SiteEnergyView /> : <AssetEnergyView />}
        </div>
    );
};
