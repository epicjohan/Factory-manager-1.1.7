
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Bell, 
  Building2, 
  CalendarClock, 
  FileText, 
  Globe, 
  Database 
} from '../icons';
import { useNavigate } from 'react-router-dom';

// Sub Components
import { SettingsGeneral } from '../components/settings/SettingsGeneral';
import { SettingsBranding } from '../components/settings/SettingsBranding';
import { SettingsDocs } from '../components/settings/SettingsDocs';
import { SettingsSchedules } from '../components/settings/SettingsSchedules';
import { SettingsIntegrations } from '../components/settings/SettingsIntegrations';
import { SettingsData } from '../components/settings/SettingsData';

type SettingsTab = 'GENERAL' | 'BRANDING' | 'SCHEDULES' | 'DOCS' | 'INTEGRATIONS' | 'DATA';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('GENERAL');
  
  const tabs = [
      { id: 'GENERAL', label: 'Notificaties', icon: Bell },
      { id: 'BRANDING', label: 'Organisatie', icon: Building2 },
      { id: 'SCHEDULES', label: 'Roosters', icon: CalendarClock },
      { id: 'DOCS', label: 'Documenten', icon: FileText },
      { id: 'INTEGRATIONS', label: 'Connectiviteit', icon: Globe },
      { id: 'DATA', label: 'Systeembeheer', icon: Database },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 text-left">
      <div className="flex justify-between items-center gap-4">
        <div>
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-2 transition-colors">
                <ArrowLeft size={18} /><span>Terug naar Admin</span>
            </button>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Configuratie</h2>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 no-scrollbar">
          {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as SettingsTab)} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  <tab.icon size={18} />{tab.label}
              </button>
          ))}
      </div>

      <div className="min-h-[500px]">
          {activeTab === 'GENERAL' && <SettingsGeneral />}
          {activeTab === 'BRANDING' && <SettingsBranding />}
          {activeTab === 'DOCS' && <SettingsDocs />}
          {activeTab === 'SCHEDULES' && <SettingsSchedules />}
          {activeTab === 'INTEGRATIONS' && <SettingsIntegrations />}
          {activeTab === 'DATA' && <SettingsData />}
      </div>
    </div>
  );
};
