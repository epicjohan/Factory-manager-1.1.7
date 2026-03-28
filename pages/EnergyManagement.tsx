
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, getStore, setStore } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { useTable } from '../hooks/useTable';
import { KEYS, generateId } from '../services/db/core';
import { EnergyLiveData, Machine, AssetEnergyConfig, EnergySensorType } from '../types';
import { useConfirm } from '../contexts/ConfirmContext';
import { 
  ArrowLeft, 
  Euro, 
  Zap, 
  FlaskConical, 
  Save, 
  CheckCircle, 
  HelpCircle, 
  ToggleLeft, 
  ToggleRight,
  Terminal,
  ShieldCheck,
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Plug,
  Settings,
  Lock,
  Scale
} from '../icons';

export const EnergyManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirm = useConfirm();
  
  // States Global
  const [kwhPrice, setKwhPrice] = useState(0.35);
  const [maxPowerLimit, setMaxPowerLimit] = useState(17000);
  const [consumptionFactor, setConsumptionFactor] = useState(1.0);
  const [productionFactor, setProductionFactor] = useState(1.0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  
  // States Asset Config
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<AssetEnergyConfig>>({});
  const [selectedMachineId, setSelectedMachineId] = useState('');

  // REACTIVE LIVE DATA
  const { data: energyLiveList } = useTable<EnergyLiveData>(KEYS.ENERGY_LIVE);
  const { data: machines } = useTable<Machine>(KEYS.MACHINES);
  const { data: assetConfigs, refresh: refreshConfigs } = useTable<AssetEnergyConfig>(KEYS.ASSET_ENERGY_CONFIGS);

  const latestLive = energyLiveList[0]; 

  // Derived Bridge Status & Safety Interlock
  const { isBridgeActive, secondsAgo, isAnyMachineLive } = useMemo(() => {
      const now = Date.now();
      
      // Check P1 Bridge
      let bridgeActive = false;
      let diff = null;
      if (latestLive && latestLive.updated) {
          const updateTime = new Date(latestLive.updated).getTime();
          diff = Math.floor((now - updateTime) / 1000);
          bridgeActive = diff < 60; // Active if data younger than 60s
      }

      // Check Machines Live Stats
      const anyMachineLive = machines.some(m => {
          if (!m.liveStats?.lastUpdated) return false;
          const mTime = new Date(m.liveStats.lastUpdated).getTime();
          return (now - mTime) < 60000;
      });

      return { isBridgeActive: bridgeActive, secondsAgo: diff, isAnyMachineLive: anyMachineLive };
  }, [latestLive, machines]);

  // SYSTEM INTERLOCK: Als er echte data binnenkomt, MAG demo niet aan.
  const isSystemLive = isBridgeActive || isAnyMachineLive;

  useEffect(() => {
      if (isSystemLive && isDemoMode) {
          toggleDemoMode(true); 
      }
  }, [isSystemLive, isDemoMode]);

  const isGhostAdmin = user?.id === 'super-admin-ghost';

  useEffect(() => {
    const init = async () => {
        const store = await getStore();
        const energy = await db.getEnergySettings();
        setKwhPrice(energy.kwhPrice);
        setMaxPowerLimit(energy.maxPowerLimit);
        setConsumptionFactor(energy.consumptionFactor || 1.0);
        setProductionFactor(energy.productionFactor || 1.0);
        setIsDemoMode(!!store.isDemoMode);
    };
    init();
  }, []);

  const handleSaveGlobal = async () => {
    await db.setEnergySettings({ 
        kwhPrice, 
        maxPowerLimit, 
        consumptionFactor, 
        productionFactor 
    });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const toggleDemoMode = async (forceOff: boolean = false) => {
      const store = await getStore();
      const newVal = forceOff ? false : !store.isDemoMode;
      
      setIsDemoMode(newVal);
      await setStore({ ...store, isDemoMode: newVal });
  };

  const openConfigModal = (machineId: string) => {
      const existing = assetConfigs.find(c => c.machineId === machineId);
      if (existing) {
          setEditingConfig(existing);
      } else {
          setEditingConfig({
              sensorType: EnergySensorType.HOMEWIZARD,
              pollInterval: 10,
              ipAddress: '',
              manualPowerW: 0
          });
      }
      setSelectedMachineId(machineId);
      setIsModalOpen(true);
  };

  const handleSaveAssetConfig = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedMachineId) return;

      const configToSave: AssetEnergyConfig = {
          id: editingConfig.id || generateId(),
          machineId: selectedMachineId,
          sensorType: editingConfig.sensorType || EnergySensorType.HOMEWIZARD,
          ipAddress: editingConfig.ipAddress,
          apiPort: editingConfig.apiPort,
          pollInterval: editingConfig.pollInterval || 10,
          manualPowerW: editingConfig.manualPowerW
      };

      await db.saveConfig(configToSave);
      refreshConfigs();
      setIsModalOpen(false);
  };

  const handleDeleteConfig = async () => {
      if (!editingConfig.id) return;
      const ok = await confirm({ title: 'Meter ontkoppelen', message: 'Weet je zeker dat je deze meter wilt ontkoppelen?' });
      if (ok) {
          await db.deleteConfig(editingConfig.id);
          refreshConfigs();
          setIsModalOpen(false);
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-2 transition-colors">
                <ArrowLeft size={18} /><span>Terug naar Admin</span>
            </button>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Zap className="text-yellow-500" /> Energie Configuratie
            </h2>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => navigate('/energy')}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-[2rem] font-bold text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all flex items-center gap-2"
            >
                <Activity size={18} /> Live Dashboard
            </button>
            <button 
                onClick={handleSaveGlobal} 
                className={`px-8 py-3 rounded-[2rem] shadow-lg font-bold flex items-center gap-2 transition-all ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
                {saveStatus === 'saved' ? <CheckCircle size={20} /> : <Save size={20} />}
                <span>{saveStatus === 'saved' ? 'Opgeslagen' : 'Opslaan'}</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white"><Euro size={20} className="text-emerald-500" /> Tarieven & Limieten</h3>
              <div className="space-y-6">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Stroomprijs per kWh (€)</label>
                      <div className="relative">
                          <Euro className="absolute left-3 top-3 text-slate-400" size={20} />
                          <input 
                            type="number" 
                            step="0.001" 
                            className="w-full pl-11 p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono font-bold text-lg" 
                            value={kwhPrice} 
                            onChange={e => setKwhPrice(parseFloat(e.target.value))} 
                          />
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Max. Vermogen Limiet (Watt)</label>
                      <div className="relative">
                          <Zap className="absolute left-3 top-3 text-slate-400" size={20} />
                          <input 
                            type="number" 
                            className="w-full pl-11 p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono font-bold text-lg" 
                            value={maxPowerLimit} 
                            onChange={e => setMaxPowerLimit(parseInt(e.target.value))} 
                          />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 italic">Capaciteitslijn in de grafieken.</p>
                  </div>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white"><Scale size={20} className="text-blue-500" /> Meetinstellingen (CT-ratio)</h3>
              <div className="space-y-6">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Omrekenfactor Verbruik (P1)</label>
                      <div className="relative">
                          <Scale className="absolute left-3 top-3 text-slate-400" size={20} />
                          <input 
                            type="number" 
                            step="0.1" 
                            className="w-full pl-11 p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono font-bold text-lg" 
                            value={consumptionFactor} 
                            onChange={e => setConsumptionFactor(parseFloat(e.target.value))} 
                          />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">Vermenigvuldigt binnenkomende data (Watt & kWh).</p>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Omrekenfactor Productie (Solar)</label>
                      <div className="relative">
                          <Scale className="absolute left-3 top-3 text-slate-400" size={20} />
                          <input 
                            type="number" 
                            step="0.1" 
                            className="w-full pl-11 p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono font-bold text-lg" 
                            value={productionFactor} 
                            onChange={e => setProductionFactor(parseFloat(e.target.value))} 
                          />
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 p-1 rounded-[2rem] my-8"></div>

      <div className="space-y-6">
          <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <Plug className="text-purple-500" /> Asset Meetpunten
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                  Koppel individuele energiemeters aan machines om verbruik per asset te meten.
              </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {machines.map(machine => {
                  const config = assetConfigs.find(c => c.machineId === machine.id);
                  const hasConfig = !!config;
                  
                  return (
                      <div key={machine.id} className={`p-5 rounded-2xl border-2 transition-all ${hasConfig ? 'bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-900/30' : 'bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-700'}`}>
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <div className="font-bold text-slate-800 dark:text-white">{machine.name}</div>
                                  <div className="text-xs text-slate-500 font-mono">{machine.machineNumber}</div>
                              </div>
                              <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${hasConfig ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>
                                  {hasConfig ? config.sensorType : 'Geen Meter'}
                              </div>
                          </div>
                          
                          {hasConfig && (
                              <div className="mb-4 text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl">
                                  IP: {config.ipAddress || 'N/A'} <br/>
                                  Poll: {config.pollInterval}s
                              </div>
                          )}

                          <button 
                            onClick={() => openConfigModal(machine.id)}
                            className={`w-full py-2.5 rounded-[2rem] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${hasConfig ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200' : 'bg-white border hover:border-purple-400 text-purple-600 shadow-sm'}`}
                          >
                              <Settings size={14} /> {hasConfig ? 'Configureren' : 'Meter Koppelen'}
                          </button>
                      </div>
                  );
              })}
          </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <Settings size={20} className="text-purple-500" /> Sensor Configuratie
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Trash2 className="hidden" /><ArrowLeft className="rotate-180" size={20} /></button>
                  </div>
                  
                  <form onSubmit={handleSaveAssetConfig} className="p-6 space-y-6">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sensor Type</label>
                          <select 
                            className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white font-bold outline-none"
                            value={editingConfig.sensorType}
                            onChange={e => setEditingConfig({ ...editingConfig, sensorType: e.target.value as any })}
                          >
                              <option value="HOMEWIZARD">HomeWizard Energy Socket</option>
                              <option value="SHELLY">Shelly Plug / Pro</option>
                              <option value="MODBUS_TCP">Modbus TCP Meter</option>
                              <option value="MANUAL_CONST">Geen Meter (Vast Verbruik)</option>
                          </select>
                      </div>

                      {editingConfig.sensorType !== 'MANUAL_CONST' && (
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">IP Adres</label>
                                  <input 
                                    type="text" 
                                    className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                                    placeholder="192.168.1.x"
                                    value={editingConfig.ipAddress || ''}
                                    onChange={e => setEditingConfig({ ...editingConfig, ipAddress: e.target.value })}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Poort (Opt.)</label>
                                  <input 
                                    type="number" 
                                    className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                                    placeholder="80"
                                    value={editingConfig.apiPort || ''}
                                    onChange={e => setEditingConfig({ ...editingConfig, apiPort: parseInt(e.target.value) })}
                                  />
                              </div>
                          </div>
                      )}

                      {editingConfig.sensorType === 'MANUAL_CONST' && (
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vast Verbruik bij 'RUNNING' (Watt)</label>
                              <input 
                                type="number" 
                                className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white font-bold"
                                placeholder="Bijv. 15000"
                                value={editingConfig.manualPowerW || ''}
                                onChange={e => setEditingConfig({ ...editingConfig, manualPowerW: parseInt(e.target.value) })}
                              />
                              <p className="text-[10px] text-slate-400 mt-2">Als de machine status 'RUNNING' is, rekent het systeem dit wattage.</p>
                          </div>
                      )}

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Poll Interval (Sec)</label>
                          <input 
                            type="number" 
                            min="2"
                            className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white font-bold"
                            value={editingConfig.pollInterval || 10}
                            onChange={e => setEditingConfig({ ...editingConfig, pollInterval: parseInt(e.target.value) })}
                          />
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                          {editingConfig.id && (
                              <button type="button" onClick={handleDeleteConfig} className="p-3 bg-red-50 text-red-600 rounded-[2rem] hover:bg-red-100 transition-colors">
                                  <Trash2 size={20} />
                              </button>
                          )}
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-[2rem] transition-colors">
                              Annuleren
                          </button>
                          <button type="submit" className="flex-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-[2rem] shadow-lg hover:bg-blue-700 transition-colors">
                              Opslaan
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* DYNAMIC BRIDGE MONITOR */}
      <div className={`mt-12 rounded-3xl p-8 border-2 transition-all duration-500 shadow-xl overflow-hidden relative ${isBridgeActive ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900 border-red-500/30'}`}>
          <div className="absolute top-0 right-0 p-8 opacity-5">
              {isBridgeActive ? <Wifi size={160} className="text-emerald-500" /> : <WifiOff size={160} className="text-red-500" />}
          </div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-6">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center relative ${isBridgeActive ? 'bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]'}`}>
                      {isBridgeActive ? <Wifi size={36} className="animate-pulse" /> : <WifiOff size={36} />}
                      {isBridgeActive && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                          </div>
                      )}
                  </div>
                  <div className="text-left">
                      <h3 className={`text-2xl font-black uppercase tracking-tighter ${isBridgeActive ? 'text-emerald-400' : 'text-red-400'}`}>
                          PYTHON BRIDGE: {isBridgeActive ? 'ACTIEF' : 'OFFLINE'}
                      </h3>
                      <p className="text-slate-300 text-sm font-medium mt-1">
                          {isBridgeActive 
                            ? 'Real-time stream via HomeWizard API actief.' 
                            : 'Geen data ontvangen in de afgelopen minuut.'}
                      </p>
                      <div className="flex items-center gap-3 mt-4">
                          <div className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest ${isBridgeActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                              {secondsAgo !== null ? `Laatste update: ${secondsAgo}s geleden` : 'Nooit verbonden'}
                          </div>
                          {isBridgeActive && <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1"><RefreshCw size={10} className="animate-spin-slow" /> Auto-Syncing</div>}
                      </div>
                  </div>
              </div>

              <div className="flex flex-col gap-2 w-full md:w-auto">
                  {isGhostAdmin ? (
                      /* Technical buttons for Ghost Admin only */
                      !isBridgeActive ? (
                          <button 
                            onClick={() => navigate('/admin/super-help')}
                            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-900/40"
                          >
                              <AlertTriangle size={20} /> Troubleshoot Gids
                          </button>
                      ) : (
                          <button 
                            onClick={() => navigate('/admin/super-help')}
                            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm transition-all border border-white/10 flex items-center justify-center gap-3 backdrop-blur-sm"
                          >
                              <Terminal size={20} className="text-emerald-400" /> Bridge Details
                          </button>
                      )
                  ) : (
                      /* Info message for regular admins when offline */
                      !isBridgeActive && (
                        <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl max-w-sm">
                            <div className="flex items-start gap-3">
                                <ShieldCheck size={20} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-red-300 leading-relaxed">
                                    Hardware configuratie vereist. Neem contact op met IT voor activatie.
                                </p>
                            </div>
                        </div>
                      )
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
