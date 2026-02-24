
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { db } from '../services/storage';
import { generateId, KEYS } from '../services/db/core';
import { Machine, AssetType, MaintenanceInterval, ScheduleType, WorkSchedule, MachineProtocol, UserRole, FanucControlType, SetupTemplate, AppModule } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTable } from '../hooks/useTable';
import { ImageProcessor } from '../services/db/imageProcessor';
import { 
  Upload, Save, ArrowLeft, Calendar, Clock, Droplet, Wifi, Server, 
  Hash, BarChart3, SunMoon, Activity, FileText, Globe, Code, 
  ShieldCheck, Trash2, Archive, ArchiveX, Info, Monitor, 
  ToggleLeft, ToggleRight, LayoutDashboard, Tv, ImageIcon, AlertTriangle,
  CheckCircle, FileJson
} from '../icons';

export const CreateMachine: React.FC = () => {
  const navigate = useNavigate();
  const { user, canAccessModule } = useAuth();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  if (!user || user.role !== UserRole.ADMIN) {
    return <Navigate to="/" replace />;
  }

  // REACTIVE HOOKS
  const { data: schedules } = useTable<WorkSchedule>(KEYS.SCHEDULES);
  const { data: allMachines } = useTable<Machine>(KEYS.MACHINES);
  const { data: templates } = useTable<SetupTemplate>(KEYS.SETUP_TEMPLATES);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<Partial<Machine>>({
    name: '',
    machineNumber: '',
    type: AssetType.CNC,
    tankCapacity: 0,
    status: 'RUNNING',
    isArchived: false,
    image: '',
    maintenanceInterval: null,
    customMaintenanceInterval: 0,
    lastMaintenanceDate: '',
    coolantTarget: 8.0,
    coolantMinLimit: 7.0,
    coolantMaxLimit: 9.0,
    protocol: MachineProtocol.FOCAS,
    fanucType: FanucControlType.I_SERIES,
    focasIp: '',
    focasPort: 8193, 
    mtConnectUrl: '',
    mtConnectConfig: {
        tagExecution: 'Execution',
        tagMode: 'ControllerMode',
        tagProgram: 'Program',
        tagLoad: 'Load',
        tagFeed: 'PathFeedrateOverride',
        tagPartCount: 'PartCount',
        tagAlarm: 'Condition',
        tagTool: 'ToolNumber'
    },
    showInDashboard: true,
    showInAndon: true,
    andonConfig: { showSpindleLoad: true, showFeedOverride: true, showProgram: true, showPartsCount: false },
    scheduleId: ScheduleType.FULL_24_7,
    setupTemplateId: ''
  });

  useEffect(() => {
    if (id && allMachines.length > 0) {
        const existing = allMachines.find(m => m.id === id);
        if (existing) {
            setFormData({
                ...existing,
                protocol: existing.protocol || MachineProtocol.FOCAS,
                fanucType: existing.fanucType || FanucControlType.I_SERIES,
                andonConfig: existing.andonConfig || { showSpindleLoad: true, showFeedOverride: true, showProgram: true, showPartsCount: false }
            });
        }
    }
  }, [id, allMachines]);

  const validate = async () => {
      const newErrors: Record<string, string> = {};
      if (!formData.name?.trim()) newErrors.name = "Naam is verplicht";
      if (!formData.machineNumber?.trim()) newErrors.machineNumber = "Nummer/ID is verplicht";
      
      if (formData.machineNumber) {
          const duplicate = allMachines.find(m => 
              m.machineNumber.toLowerCase() === formData.machineNumber?.toLowerCase() && 
              m.id !== id
          );
          if (duplicate) {
              newErrors.machineNumber = "Dit nummer is al in gebruik.";
          }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        setIsProcessing(true);
        try {
            const compressed = await ImageProcessor.compress(reader.result as string);
            setFormData(prev => ({ ...prev, image: compressed }));
        } catch (err) {
            setFormData(prev => ({ ...prev, image: reader.result as string }));
        } finally {
            setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm(`Weet u zeker dat u "${formData.name}" permanent wilt VERWIJDEREN?`)) {
        await db.deleteMachine(id);
        navigate('/admin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    if (!(await validate())) return;

    const machineToSave = {
        ...formData,
        id: isEditing && id ? id : generateId(),
        image: formData.image || '',
    } as Machine;

    if (isEditing) {
        await db.updateMachine(machineToSave);
    } else {
        await db.addMachine(machineToSave);
    }

    navigate(isEditing ? `/machine/${id}` : '/admin');
  };

  const filteredTemplates = templates.filter(t => t.assetType === formData.type);

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 transition-colors">
            <ArrowLeft size={20} />
            <span>Terug</span>
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-2xl text-xs font-bold border border-purple-200">
              <ShieldCheck size={14} />
              Geautoriseerd als Administrator
          </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Asset Bewerken' : 'Nieuwe Asset Registreren'}
            </h2>
          </div>
          
          {isEditing && (
              <button 
                type="button"
                onClick={() => setFormData({...formData, isArchived: !formData.isArchived})}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${formData.isArchived ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200'}`}
              >
                  {formData.isArchived ? <ArchiveX size={16} /> : <Archive size={16} />}
                  <span>{formData.isArchived ? 'Gearchiveerd' : 'Archiveer Asset'}</span>
              </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-10">
          
          {/* SECTIE 1: ALGEMENE INFO */}
          <div className="space-y-6 text-left">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center gap-2">
                <FileText size={18} className="text-blue-500" /> Algemene Informatie
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Naam *</label>
                    <input 
                        type="text" 
                        placeholder="Bijv. Mazak Variaxis"
                        className={`w-full px-4 py-2 rounded-2xl border bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none ${errors.name ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nummer / ID *</label>
                    <input 
                        type="text" 
                        placeholder="Bijv. CNC-005"
                        className={`w-full px-4 py-2 rounded-2xl border bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none ${errors.machineNumber ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                        value={formData.machineNumber}
                        onChange={e => setFormData({...formData, machineNumber: e.target.value})}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type Asset</label>
                    <select
                        className="w-full px-4 py-2 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white outline-none"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as AssetType, setupTemplateId: ''})}
                    >
                        <option value="CNC">CNC Machine</option>
                        <option value="ROBOT">Robot</option>
                        <option value="CMM">CMM (Meetkamer)</option>
                        <option value="CLIMATE">Klimaatbeheersing</option>
                        <option value="OTHER">Overig / Materieel</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Dienstrooster</label>
                    <select
                        className="w-full px-4 py-2 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white outline-none"
                        value={formData.scheduleId}
                        onChange={e => setFormData({...formData, scheduleId: e.target.value})}
                    >
                        {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        <option value={ScheduleType.FULL_24_7}>Standaard (24/7)</option>
                    </select>
                </div>
              </div>

              {/* SETUP TEMPLATE SELECTOR - ONLY IF PDM IS ACTIVE */}
              {canAccessModule(AppModule.ARTICLES) && (
                <div className="space-y-2 border-t border-dashed border-slate-200 dark:border-slate-700 pt-4">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <FileJson size={16} /> Setup Sjabloon (Voor Artikelen)
                    </label>
                    <select
                        className="w-full px-4 py-2 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white outline-none"
                        value={formData.setupTemplateId || ''}
                        onChange={e => setFormData({...formData, setupTemplateId: e.target.value})}
                    >
                        <option value="">-- Standaard / Geen --</option>
                        {filteredTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500">Bepaalt welke velden zichtbaar zijn in de 'Opspanning' tab van het artikelbeheer (bijv. Draaibank vs Freesbank velden).</p>
                </div>
              )}

              {/* AFBEELDING UPLOAD */}
              <div className="pt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Machine Foto</label>
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="w-32 h-32 rounded-[2rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                          {formData.image ? (
                              <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                              <ImageIcon size={40} className="text-slate-300" />
                          )}
                      </div>
                      <div className="flex-1 space-y-3">
                          <p className="text-xs text-slate-500 leading-relaxed font-medium">Upload een duidelijke foto van de machine voor snelle herkenning op de werkvloer.</p>
                          <div className="flex flex-wrap gap-2">
                              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
                                  <Upload size={14} /> 
                                  <span>{formData.image ? 'Wijzig Foto' : 'Foto Selecteren'}</span>
                                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                              </label>
                              {formData.image && (
                                  <button type="button" onClick={() => setFormData({...formData, image: ''})} className="px-5 py-2 bg-slate-100 dark:bg-slate-700 text-red-500 rounded-2xl text-xs font-bold">Verwijderen</button>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* SECTIE 2: CONNECTIVITEIT (Alleen voor CNC) */}
          {formData.type === AssetType.CNC && (
            <div className="space-y-6 text-left animate-in fade-in duration-300">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center gap-2">
                    <Wifi size={18} className="text-teal-500" /> Connectiviteit (Smart Factory)
                </h3>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-[2rem] border border-blue-200 dark:border-blue-800">
                    <div className="flex gap-4">
                        <Info className="text-blue-500 shrink-0" size={20} />
                        <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                            <p className="font-bold mb-1 uppercase tracking-widest">Keuzehulp Fanuc Sturing:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li><strong>i-Series:</strong> Moderne sturingen (30i, 31i, 0i-D/F). Hebben ingebouwde Ethernet.</li>
                                <li><strong>Legacy:</strong> Klassieke sturingen (16i, 18i, 21i, 0i-B/C). Gebruiken vaak losse Ethernet kaarten of PCMCIA.</li>
                                <li><strong>Series 15:</strong> Zeer oude generatie met afwijkende FOCAS datastructuur.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex gap-4">
                        {Object.values(MachineProtocol).map(p => (
                            <button key={p} type="button" onClick={() => setFormData({...formData, protocol: p})} className={`flex-1 p-4 rounded-[2rem] border-2 transition-all text-left ${formData.protocol === p ? 'bg-teal-50 border-teal-500 dark:bg-teal-900/20 shadow-md' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700 opacity-60'}`}>
                                <div className="font-bold text-sm mb-1">{p} Protocol</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest">{p === MachineProtocol.FOCAS ? 'Fanuc / FOCAS API' : 'MTConnect Stream'}</div>
                            </button>
                        ))}
                    </div>

                    {formData.protocol === MachineProtocol.FOCAS && (
                        <div className="space-y-6 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Sturing Generatie</label>
                                    <select 
                                        className="w-full p-2.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white outline-none font-bold"
                                        value={formData.fanucType}
                                        onChange={e => setFormData({...formData, fanucType: e.target.value as FanucControlType})}
                                    >
                                        <option value={FanucControlType.I_SERIES}>i-Series (Modern)</option>
                                        <option value={FanucControlType.LEGACY}>Legacy (Classic)</option>
                                        <option value={FanucControlType.SERIES_15}>Series 15 / Hele Oude Sturing</option>
                                    </select>
                                </div>
                                <div className="space-y-2 md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">IP Adres</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input type="text" placeholder="192.168.1.10" className="w-full pl-10 p-2 rounded-2xl border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white font-mono font-bold" value={formData.focasIp || ''} onChange={e => setFormData({...formData, focasIp: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Poort</label>
                                    <input type="number" className="w-full p-2 rounded-2xl border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white font-mono font-bold" value={formData.focasPort || 8193} onChange={e => setFormData({...formData, focasPort: parseInt(e.target.value)})} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          )}

          {/* SECTIE 3: KOELING & PARAMETERS */}
          <div className="space-y-6 text-left">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center gap-2">
                <Droplet size={18} className="text-blue-400" /> Koelvloeistof Beheer
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Tankinhoud (L)</label>
                    <input type="number" className="w-full p-2 rounded-2xl border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white font-bold" value={formData.tankCapacity || 0} onChange={e => setFormData({...formData, tankCapacity: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Brix Doel (%)</label>
                    <input type="number" step="0.1" className="w-full p-2 rounded-2xl border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white font-bold" value={formData.coolantTarget || 8.0} onChange={e => setFormData({...formData, coolantTarget: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Min. Limiet (%)</label>
                    <input type="number" step="0.1" className="w-full p-2 rounded-2xl border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white font-bold border-red-200" value={formData.coolantMinLimit || 7.0} onChange={e => setFormData({...formData, coolantMinLimit: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Max. Limiet (%)</label>
                    <input type="number" step="0.1" className="w-full p-2 rounded-2xl border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white font-bold border-red-200" value={formData.coolantMaxLimit || 9.0} onChange={e => setFormData({...formData, coolantMaxLimit: parseFloat(e.target.value)})} />
                </div>
              </div>
          </div>

          {/* SECTIE 4: DASHBOARD & ANDON OPMAAK */}
          <div className="space-y-6 text-left">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center gap-2">
                <LayoutDashboard size={18} className="text-orange-500" /> Visueel Management
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, showInDashboard: !formData.showInDashboard})}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${formData.showInDashboard ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 shadow-md' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700 opacity-60'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-2xl ${formData.showInDashboard ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-500'}`}><LayoutDashboard size={20} /></div>
                        <span className="text-sm font-black uppercase tracking-widest">Toon in Dashboard</span>
                    </div>
                    {formData.showInDashboard ? <ToggleRight size={32} className="text-blue-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
                </button>

                <button 
                  type="button"
                  onClick={() => setFormData({...formData, showInAndon: !formData.showInAndon})}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${formData.showInAndon ? 'bg-teal-50 border-teal-500 dark:bg-teal-900/20 shadow-md' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700 opacity-60'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-2xl ${formData.showInAndon ? 'bg-teal-600 text-white' : 'bg-slate-300 text-slate-500'}`}><Tv size={20} /></div>
                        <span className="text-sm font-black uppercase tracking-widest">Toon op TV / Andon</span>
                    </div>
                    {formData.showInAndon ? <ToggleRight size={32} className="text-teal-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
                </button>
              </div>

              {formData.showInAndon && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in slide-in-from-top-2">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Andon Board Data Velden</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { key: 'showSpindleLoad', label: 'Load' },
                            { key: 'showFeedOverride', label: 'Feed' },
                            { key: 'showProgram', label: 'Program' },
                            { key: 'showPartsCount', label: 'Parts' }
                          ].map(opt => (
                              <button 
                                key={opt.key}
                                type="button"
                                onClick={() => setFormData({
                                    ...formData, 
                                    andonConfig: { ...formData.andonConfig!, [opt.key]: !(formData.andonConfig as any)[opt.key] }
                                })}
                                className={`flex items-center justify-center gap-2 p-3 rounded-[2rem] border-2 transition-all ${ (formData.andonConfig as any)[opt.key] ? 'bg-white dark:bg-slate-800 border-blue-500 text-blue-600 shadow-sm' : 'bg-transparent border-slate-200 text-slate-400' }`}
                              >
                                  {(formData.andonConfig as any)[opt.key] ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5" />}
                                  <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                              </button>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          {/* ACTIE KNOPPEN */}
          <div className="flex justify-between items-center pt-8 border-t border-slate-200 dark:border-slate-700">
            {isEditing ? (
                <button type="button" onClick={handleDelete} className="flex items-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-bold border border-red-200 hover:bg-red-100 transition-colors">
                    <Trash2 size={18} />
                    <span>Verwijderen</span>
                </button>
            ) : <div />}
            
            <button type="submit" disabled={isProcessing} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-[2rem] font-black shadow-xl shadow-blue-500/30 disabled:opacity-50 transition-all uppercase tracking-widest text-sm">
              <Save size={20} />
              <span>{isEditing ? 'Asset Bijwerken' : 'Asset Opslaan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
