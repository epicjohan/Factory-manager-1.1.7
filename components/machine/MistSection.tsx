import React, { useState, useMemo } from 'react';
import { Machine, MistLog, MistCollectorStage, MachinePart, GeneralPart, UserRole } from '../../types';
import { db } from '../../services/storage';
import { KEYS, generateId } from '../../services/db/core';
import { useAuth } from '../../contexts/AuthContext';
import { useTable } from '../../hooks/useTable';
import { 
  Wind, Grid, Shield, Plus, Activity, CloudCog, MessageSquare, Trash2, AlertCircle 
} from '../../icons';

interface MistSectionProps {
    machine: Machine;
}

export const MistSection: React.FC<MistSectionProps> = ({ machine }) => {
  const { user } = useAuth();
  
  const { data: allMistLogs, refresh } = useTable<MistLog>(KEYS.LOGS_MIST);
  const { data: allMachineParts } = useTable<MachinePart>(KEYS.PARTS_MACHINE);
  const { data: allGeneralParts } = useTable<GeneralPart>(KEYS.PARTS_GENERAL);
  
  const [mistStage, setMistStage] = useState<MistCollectorStage>(MistCollectorStage.STAGE_0);
  const [mistRemark, setMistRemark] = useState('');
  const [mistPartId, setMistPartId] = useState('');
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);

  const isAdmin = user?.role === UserRole.ADMIN || user?.id === 'super-admin-ghost';

  const augmentedLogs = useMemo(() => {
      return allMistLogs
          .filter(l => l.machineId === machine.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allMistLogs, machine.id]);

  const relevantParts = useMemo(() => {
      const machineSpecific = allMachineParts.filter(p => p.machineId === machine.id);
      return [...machineSpecific, ...allGeneralParts];
  }, [allMachineParts, allGeneralParts, machine.id]);

  const handleAddMistLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (machine.isArchived || !user) return;
    
    const selectedPart = relevantParts.find(p => p.id === mistPartId);
    
    const log: MistLog = { 
        id: generateId(), 
        machineId: machine.id, 
        date: new Date().toISOString(), 
        stage: mistStage, 
        replacedBy: user.name, 
        remark: mistRemark, 
        partId: mistPartId || undefined, 
        cost: selectedPart ? selectedPart.price : undefined 
    };
    
    db.addMistLog(log);
    
    if (mistPartId) {
        db.consumePart(mistPartId, 1);
    }
    
    setMistRemark(''); 
    setMistPartId('');
  };

  const handleDeleteMistLog = async (id: string) => {
      if (!isAdmin) return;
      if (confirmDeleteLogId !== id) {
          setConfirmDeleteLogId(id);
          return;
      }

      const log = augmentedLogs.find(l => l.id === id);
      if (log?.partId) {
          await db.releasePart(log.partId, 1);
      }

      await db.deleteMistLog(id);
      setConfirmDeleteLogId(null);
      refresh();
  };

  const getLastLogForStage = (stage: MistCollectorStage) => {
      return augmentedLogs.find(l => l.stage === stage);
  };

  const FilterStageCard = ({ stage, title, desc, icon: Icon, color }: any) => {
      const lastLog = getLastLogForStage(stage);
      const lastDate = lastLog ? new Date(lastLog.date) : null;
      const isOld = lastDate ? (Date.now() - lastDate.getTime()) > (90 * 24 * 60 * 60 * 1000) : true;
      const isPending = (lastLog as any)?.isPending;
      
      return (
          <div className={`relative p-4 rounded-xl border-2 transition-all group ${isOld ? 'border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-900/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}>
              <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-lg ${color} text-white shadow-sm`}> 
                        <Icon size={20} /> 
                      </div>
                      <div> 
                        <div className="flex items-center gap-2">
                           <h4 className="font-bold text-slate-800 dark:text-white text-sm">{title}</h4>
                           {isPending && <CloudCog size={12} className="text-orange-500 animate-spin-slow" />}
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{desc}</p> 
                      </div>
                  </div>
                  {lastDate && ( 
                    <div className="text-right"> 
                        <div className="text-[10px] text-slate-400">Laatste wissel:</div> 
                        <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300"> 
                            {lastDate.toLocaleDateString()} 
                        </div> 
                    </div> 
                  )}
              </div>
              <div className="mt-4 flex justify-between items-center">
                  <div className={`text-xs font-bold flex items-center gap-1 ${isOld ? 'text-orange-500' : 'text-green-500'}`}> 
                    <Activity size={12} /> {isOld ? 'Check Vereist' : 'In Orde'} 
                  </div>
                  {!machine.isArchived && (
                    <button 
                        onClick={() => { 
                            setMistStage(stage); 
                            setMistRemark(''); 
                            setMistPartId(''); 
                            document.getElementById('mist-form')?.scrollIntoView({ behavior: 'smooth' }); 
                        }} 
                        className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg font-bold text-slate-600 dark:text-slate-300 transition-colors"
                    > 
                        Vervangen 
                    </button>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2"> 
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative"> 
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 -z-10 -translate-y-1/2 rounded-full"></div> 
            <FilterStageCard stage={MistCollectorStage.STAGE_0} title="Voorfilter (stage 0)" desc="Grofvuil & Spanen" icon={Grid} color="bg-slate-500" /> 
            <FilterStageCard stage={MistCollectorStage.STAGE_1} title="Hoofdfilter (stage 1)" desc="Synthetische Nevel" icon={Wind} color="bg-blue-500" /> 
            <FilterStageCard stage={MistCollectorStage.HEPA} title="HEPA Filter" desc="Fijnstof & Rook (99.9%)" icon={Shield} color="bg-teal-500" /> 
        </div> 
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8"> 
            {!machine.isArchived && (
                <div id="mist-form" className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit"> 
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Wind size={20} className="text-teal-500" /> Filter Wissel Registreren
                    </h3> 
                    <form onSubmit={handleAddMistLog} className="space-y-4"> 
                        <div> 
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filter Fase</label> 
                            <select 
                                className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-sm" 
                                value={mistStage} 
                                onChange={e => setMistStage(e.target.value as MistCollectorStage)}
                            >
                                {Object.values(MistCollectorStage).map(s => <option key={s} value={s}>{s}</option>)}
                            </select> 
                        </div> 
                        <div> 
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gebruikt Onderdeel (Optioneel)</label> 
                            <select 
                                className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-sm font-bold" 
                                value={mistPartId} 
                                onChange={e => setMistPartId(e.target.value)}
                            >
                                <option value="">-- Geen --</option>
                                {relevantParts.map(p => <option key={p.id} value={p.id}>{p.description} (Stock: {p.stock})</option>)}
                            </select> 
                        </div> 
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opmerking</label>
                            <input 
                                type="text" 
                                className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white text-sm font-medium" 
                                value={mistRemark} 
                                onChange={e => setMistRemark(e.target.value)} 
                                placeholder="Reden van wissel..."
                            />
                        </div> 
                        <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-sm shadow-lg shadow-teal-500/20 transition-all active:scale-95 uppercase tracking-widest"> Registreren </button> 
                    </form> 
                </div>
            )} 
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit text-left"> 
                <h4 className="font-bold text-slate-800 dark:text-white mb-4 text-sm uppercase flex items-center justify-between tracking-widest">
                    <span>Recente Wissels</span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-mono font-black">{augmentedLogs.length}</span>
                </h4> 
                <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                    {augmentedLogs.map(log => (
                        <div key={log.id} className={`p-4 rounded-xl border transition-all ${ (log as any).isPending ? 'bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-800' : 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-700'}`}>
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{new Date(log.date).toLocaleDateString()} • {log.replacedBy}</div>
                                    <div className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                                        {log.stage}
                                        {(log as any).isPending && <CloudCog size={14} className="text-orange-500 animate-spin-slow shrink-0" />}
                                    </div>
                                    {log.remark && (
                                        <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-2 mt-3 shadow-inner">
                                            <MessageSquare size={12} className="text-blue-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic break-words whitespace-normal">
                                                {log.remark}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    {log.cost && <div className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800">€{log.cost.toFixed(2)}</div>}
                                    {isAdmin && (
                                        <button 
                                            onClick={() => handleDeleteMistLog(log.id)}
                                            className={`p-1.5 transition-all rounded-lg flex items-center gap-2 ${confirmDeleteLogId === log.id ? 'bg-red-600 text-white px-3' : 'text-slate-300 hover:text-red-500'}`}
                                            title="Verwijder wissel"
                                        >
                                            {confirmDeleteLogId === log.id ? (
                                                <><AlertCircle size={12} /><span className="text-[9px] font-black uppercase">WISSEN?</span></>
                                            ) : <Trash2 size={14} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {augmentedLogs.length === 0 && <div className="text-center py-10 text-slate-400 text-xs italic">Nog geen filters vervangen.</div>}
                </div> 
            </div> 
        </div> 
    </div>
  );
};