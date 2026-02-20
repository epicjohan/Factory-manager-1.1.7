import React, { useEffect, useState, useMemo } from 'react';
import { Machine, MixingLog, UserRole } from '../../types';
import { db } from '../../services/storage';
import { KEYS, generateId } from '../../services/db/core';
import { useAuth } from '../../contexts/AuthContext';
import { useTable } from '../../hooks/useTable';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
/* Added missing CheckCircle and Clock imports from lucide-react */
import { 
  FlaskConical, Plus, Sparkles, Activity, Trash2, CloudCog, Droplet, MessageSquare, AlertCircle, RefreshCw, PlusCircle, Factory, History, ClipboardList, CheckCircle, Clock
} from 'lucide-react';
import { NumpadModal } from '../NumpadModal';

interface CoolingSectionProps {
    machine: Machine;
}

type CoolingSubTab = 'REGISTRATION' | 'HISTORY' | 'TREND';

export const CoolingSection: React.FC<CoolingSectionProps> = ({ machine }) => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<CoolingSubTab>('REGISTRATION');
  
  // Registration State
  const [newVal, setNewVal] = useState<number | string>(0);
  const [advice, setAdvice] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'MEASUREMENT' | 'EXCHANGE' | 'CLEANING' | 'ADDITIVE'>('MEASUREMENT');
  const [notes, setNotes] = useState('');
  const [exchangeReason, setExchangeReason] = useState('');
  const [cleaningCompany, setCleaningCompany] = useState('');
  const [tempTankCapacity, setTempTankCapacity] = useState<number>(machine.tankCapacity || 0);
  
  // History State
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MEASUREMENT' | 'EXCHANGE' | 'CLEANING' | 'ADDITIVE'>('ALL');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [actionConfirm, setActionConfirm] = useState(false);
  const [showNumpad, setShowNumpad] = useState(false);
  const [showTankNumpad, setShowTankNumpad] = useState(false);
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);

  const { data: allLogs, refresh } = useTable<MixingLog>(KEYS.LOGS_MIXING);

  const isAdmin = user?.role === UserRole.ADMIN || user?.id === 'super-admin-ghost';

  const augmentedLogs = useMemo(() => {
      return allLogs
          .filter(l => l.machineId === machine.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allLogs, machine.id]);

  useEffect(() => {
      setActionConfirm(false);
      if (actionType !== 'MEASUREMENT') { setAdvice(null); return; }
      const val = typeof newVal === 'string' ? parseFloat(newVal) : newVal;
      
      if (isNaN(val) || val <= 0 || !machine.tankCapacity || !machine.coolantTarget) { 
          setAdvice(null); 
          return; 
      }

      const target = machine.coolantTarget;
      const capacity = machine.tankCapacity;
      
      if (val < (machine.coolantMinLimit || 7.0)) {
          const oilNeeded = (capacity * (target - val)) / 100;
          setAdvice(`⚠️ Concentratie te LAAG. Voeg ca. ${oilNeeded.toFixed(1)} liter pure olie toe.`);
      } else if (val > (machine.coolantMaxLimit || 9.0)) {
          const waterNeeded = (capacity * (val - target)) / target;
          setAdvice(`⚠️ Concentratie te HOOG. Voeg ca. ${waterNeeded.toFixed(0)} liter water toe.`);
      } else { 
          setAdvice(null); 
      }
  }, [newVal, machine, actionType]);

  const handleAddLog = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (machine.isArchived) return;
    
    const finalVal = typeof newVal === 'string' ? parseFloat(newVal) : newVal;
    let finalNotes = notes;

    if (actionType === 'EXCHANGE') {
        finalNotes = `Reden wissel: ${exchangeReason}. ${notes}`.trim();
    } else if (actionType === 'CLEANING') {
        const cs8 = (tempTankCapacity * 0.01).toFixed(2);
        const acticide = (tempTankCapacity * 0.004).toFixed(2);
        finalNotes = `Bedrijf: ${cleaningCompany}. Gecalc. op ${tempTankCapacity}L (CS8: ${cs8}L, Acticide: ${acticide}L). ${notes}`.trim();
    }
    
    const log: MixingLog = { 
        id: generateId(), 
        machineId: machine.id, 
        date: new Date().toISOString(), 
        percentage: actionType === 'MEASUREMENT' ? (!isNaN(finalVal) ? finalVal : undefined) : undefined, 
        type: actionType, 
        notes: finalNotes, 
        performedBy: user?.name || 'System', 
        actionTaken: advice ? actionConfirm : undefined 
    };
    
    db.addMixingLog(log);
    
    // Reset fields
    setNewVal(0); 
    setNotes(''); 
    setExchangeReason('');
    setCleaningCompany('');
    setAdvice(null); 
    setActionConfirm(false);
    setActiveSubTab('HISTORY');
  };

  const handleDeleteLog = async (id: string) => {
    if (!isAdmin) return;
    if (confirmDeleteLogId !== id) {
        setConfirmDeleteLogId(id);
        return;
    }
    
    await db.deleteMixingLog(id);
    setConfirmDeleteLogId(null);
    refresh();
  };

  const filteredHistory = useMemo(() => {
    return augmentedLogs.filter(l => activeFilter === 'ALL' || l.type === activeFilter);
  }, [augmentedLogs, activeFilter]);

  const chartData = useMemo(() => {
      return augmentedLogs
          .filter(l => { 
              const logDate = l.date.split('T')[0]; 
              return logDate >= startDate && logDate <= endDate && l.percentage !== undefined; 
          })
          .map(l => ({ 
              date: new Date(l.date).toLocaleDateString(), 
              percentage: l.percentage, 
              type: l.type 
          }))
          .reverse();
  }, [augmentedLogs, startDate, endDate]);

  const getActionIcon = (type: string) => {
      switch(type) {
          case 'MEASUREMENT': return <FlaskConical size={18} className="text-blue-500" />;
          case 'ADDITIVE': return <PlusCircle size={18} className="text-indigo-500" />;
          case 'EXCHANGE': return <RefreshCw size={18} className="text-emerald-500" />;
          case 'CLEANING': return <Sparkles size={18} className="text-purple-500" />;
          default: return <Droplet size={18} className="text-slate-400" />;
      }
  };

  const getActionLabel = (type: string) => {
      switch(type) {
          case 'MEASUREMENT': return 'Meting';
          case 'ADDITIVE': return 'Toevoeging';
          case 'EXCHANGE': return 'Wissel';
          case 'CLEANING': return 'Reiniging';
          default: return type;
      }
  };

  return (
    <div className="space-y-6">
       {/* Sub-navigatie */}
       <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
          <button onClick={() => setActiveSubTab('REGISTRATION')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeSubTab === 'REGISTRATION' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'}`}>
              <PlusCircle size={14} /> Registratie
          </button>
          <button onClick={() => setActiveSubTab('HISTORY')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeSubTab === 'HISTORY' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'}`}>
              <History size={14} /> Historie
          </button>
          <button onClick={() => setActiveSubTab('TREND')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeSubTab === 'TREND' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'}`}>
              <Activity size={14} /> Trend
          </button>
       </div>

       {activeSubTab === 'REGISTRATION' && !machine.isArchived && (
           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in duration-300">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tighter italic flex items-center gap-3"> 
                <FlaskConical size={24} className="text-blue-600" /> Nieuwe Koeling Actie
              </h3>
              
              <form onSubmit={handleAddLog} className="space-y-8">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['MEASUREMENT', 'ADDITIVE', 'EXCHANGE', 'CLEANING'] as const).map((type) => (
                        <button 
                            key={type} 
                            type="button" 
                            onClick={() => setActionType(type)} 
                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${actionType === type ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20' : 'bg-slate-50 border-slate-100 dark:bg-slate-900 dark:border-slate-800 opacity-60'}`}
                        >
                            {getActionIcon(type)}
                            <span className="text-[10px] font-black uppercase tracking-widest">{getActionLabel(type)}</span>
                        </button>
                    ))}
                 </div>

                 <div className="space-y-6">
                    {/* Meting specifiek */}
                    {actionType === 'MEASUREMENT' && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="cursor-pointer group" onClick={() => setShowNumpad(true)}>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 text-left">Gemeten Brix (%)</label>
                                <div className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono font-black text-3xl flex justify-between items-center group-hover:border-blue-500 transition-colors">
                                    <span>{newVal} %</span>
                                    <PlusCircle size={24} className="text-blue-500" />
                                </div>
                            </div>
                            <div className="flex flex-col justify-end">
                                {advice ? (
                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl animate-in zoom-in">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="text-orange-600 shrink-0 mt-0.5" size={20} />
                                            <div>
                                                <p className="font-bold text-orange-800 dark:text-orange-200 text-sm leading-tight">{advice}</p>
                                                <label className="flex items-center gap-3 mt-3 p-2 bg-white dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-orange-50 transition-colors border border-orange-100 dark:border-orange-900">
                                                    <input type="checkbox" checked={actionConfirm} onChange={e => setActionConfirm(e.target.checked)} className="w-5 h-5 text-orange-600 rounded"/>
                                                    <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400"> Correctie uitgevoerd</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-3">
                                        <CheckCircle className="text-emerald-500" size={24} />
                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Concentratie is binnen de marges. Geen actie nodig.</span>
                                    </div>
                                )}
                            </div>
                         </div>
                    )}

                    {/* Wissel specifiek */}
                    {actionType === 'EXCHANGE' && (
                        <div className="animate-in slide-in-from-top-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 text-left">Reden van wissel *</label>
                            <input 
                                required
                                type="text" 
                                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:border-emerald-500" 
                                placeholder="Bijv: Jaarlijkse wissel, vervuiling, geur..." 
                                value={exchangeReason} 
                                onChange={e => setExchangeReason(e.target.value)} 
                            />
                        </div>
                    )}

                    {/* Reiniging specifiek */}
                    {actionType === 'CLEANING' && (
                        <div className="space-y-6 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 text-left">Uitgevoerd door bedrijf *</label>
                                    <div className="relative">
                                        <Factory className="absolute left-3 top-4 text-slate-400" size={18} />
                                        <input 
                                            required
                                            type="text" 
                                            className="w-full pl-10 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:border-purple-500" 
                                            placeholder="Naam bedrijf..." 
                                            value={cleaningCompany} 
                                            onChange={e => setCleaningCompany(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div className="cursor-pointer" onClick={() => setShowTankNumpad(true)}>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 text-left">Te reinigen liters (L)</label>
                                    <div className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono font-black text-xl flex justify-between items-center">
                                        <span>{tempTankCapacity} L</span>
                                        <RefreshCw size={18} className="text-purple-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 p-6 rounded-[2rem] shadow-sm">
                                <h4 className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Sparkles size={14} /> Systeemreiniging Calculator
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-purple-100 dark:border-purple-900 shadow-inner text-center">
                                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">CS8 Basic (1%)</div>
                                        <div className="text-2xl font-black text-purple-600">{(tempTankCapacity * 0.01).toFixed(2)} <span className="text-xs">L</span></div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-purple-100 dark:border-purple-900 shadow-inner text-center">
                                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Acticide MV (0,4%)</div>
                                        <div className="text-2xl font-black text-purple-600">{(tempTankCapacity * 0.004).toFixed(2)} <span className="text-xs">L</span></div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-purple-500 dark:text-purple-400 mt-4 italic text-center font-medium">Berekening op basis van ingevoerde tankinhoud.</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1 text-left">Aanvullende Opmerkingen</label>
                        <textarea 
                            rows={2}
                            className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-blue-500 text-sm font-medium" 
                            placeholder="Typ hier eventuele extra details..." 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                        />
                    </div>
                 </div>

                 <button type="submit" className="w-full py-5 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-widest"> 
                    Registreren 
                 </button>
              </form>
           </div>
       )}

       {activeSubTab === 'HISTORY' && (
           <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
               {/* Snelfilters */}
               <div className="flex flex-wrap gap-2 mb-2">
                   {[
                       { id: 'ALL', label: 'Alles', icon: ClipboardList, color: 'slate' },
                       { id: 'MEASUREMENT', label: 'Metingen', icon: FlaskConical, color: 'blue' },
                       { id: 'ADDITIVE', label: 'Toevoegingen', icon: PlusCircle, color: 'indigo' },
                       { id: 'EXCHANGE', label: 'Wissels', icon: RefreshCw, color: 'emerald' },
                       { id: 'CLEANING', label: 'Reiniging', icon: Sparkles, color: 'purple' }
                   ].map(btn => (
                       <button 
                        key={btn.id}
                        onClick={() => setActiveFilter(btn.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${activeFilter === btn.id ? `bg-${btn.color}-600 border-${btn.color}-500 text-white shadow-lg` : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:text-slate-600'}`}
                       >
                           <btn.icon size={14} /> {btn.label}
                       </button>
                   ))}
               </div>

               <div className="space-y-3">
                  {filteredHistory.map(log => (
                      <div key={log.id} className={`p-5 rounded-[2rem] border transition-all shadow-sm flex flex-col gap-4 ${(log as any).isPending ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-5">
                                  <div className={`p-4 rounded-2xl shrink-0 shadow-inner ${
                                      log.type === 'MEASUREMENT' ? 'bg-blue-50 text-blue-600' : 
                                      log.type === 'EXCHANGE' ? 'bg-emerald-50 text-emerald-600' :
                                      log.type === 'CLEANING' ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600'
                                  }`}>
                                      {getActionIcon(log.type)}
                                  </div>
                                  <div className="min-w-0 text-left">
                                      <div className="flex items-center gap-3 mb-1">
                                          <div className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight italic">
                                              {getActionLabel(log.type)} {log.percentage !== undefined && <span className="text-blue-600 ml-1">({log.percentage}%)</span>}
                                          </div>
                                          {(log as any).isPending && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full inline-flex items-center gap-1 uppercase font-black"><CloudCog size={10} /> Syncing</span>}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                          <Clock size={12} /> {new Date(log.date).toLocaleString()} • Door: {log.performedBy}
                                      </div>
                                  </div>
                              </div>
                              {isAdmin && (
                                  <button 
                                      onClick={() => handleDeleteLog(log.id)}
                                      className={`p-2 transition-all rounded-xl flex items-center gap-2 ${confirmDeleteLogId === log.id ? 'bg-red-600 text-white px-4' : 'bg-slate-50 dark:bg-slate-900 text-slate-300 hover:text-red-500'}`}
                                      title="Verwijder log"
                                  >
                                      {confirmDeleteLogId === log.id ? (
                                          <><AlertCircle size={14} /><span className="text-[10px] font-black uppercase tracking-widest">WISSEN?</span></>
                                      ) : <Trash2 size={18} />}
                                  </button>
                              )}
                          </div>
                          
                          {log.notes && (
                              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl flex items-start gap-3 shadow-inner">
                                  <MessageSquare size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-normal break-words">
                                      {log.notes}
                                  </p>
                              </div>
                          )}
                      </div>
                  ))}
                  {filteredHistory.length === 0 && (
                    <div className="py-24 text-center bg-white dark:bg-slate-800/20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6 opacity-20">
                            <ClipboardList size={48} className="text-slate-400" />
                        </div>
                        <p className="font-black uppercase tracking-[0.2em] text-slate-500">Geen historie gevonden</p>
                        <p className="text-xs mt-2 text-slate-400 italic">Er zijn nog geen registraties in deze categorie.</p>
                    </div>
                  )}
               </div>
           </div>
       )}

       {activeSubTab === 'TREND' && (
           <div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex flex-wrap items-end justify-between gap-4 mb-8 border-b border-slate-100 dark:border-slate-700 pb-6">
                      <div className="flex items-center gap-4"> 
                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shrink-0"> <Activity size={24} /> </div> 
                        <div className="text-left">
                            <h3 className="text-xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white">Brix Trendanalyse</h3> 
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Concentratie verloop over tijd</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="flex flex-col"> <label className="text-[10px] uppercase font-black text-slate-400 mb-1 ml-1">Periode Van</label> <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs dark:text-white font-bold outline-none focus:border-blue-500 shadow-inner" /> </div>
                          <div className="flex flex-col"> <label className="text-[10px] uppercase font-black text-slate-400 mb-1 ml-1">Tot</label> <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs dark:text-white font-bold outline-none focus:border-blue-500 shadow-inner" /> </div>
                      </div>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} />
                        <YAxis domain={[0, 15]} stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '16px', color: '#f1f5f9', fontSize: 12, fontWeight: 'bold' }} />
                        {machine.coolantMinLimit && <ReferenceLine y={machine.coolantMinLimit} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'MIN', fill: '#ef4444', fontSize: 10, fontWeight: 'black', position: 'insideBottomLeft' }} />}
                        {machine.coolantMaxLimit && <ReferenceLine y={machine.coolantMaxLimit} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'MAX', fill: '#ef4444', fontSize: 10, fontWeight: 'black', position: 'insideTopLeft' }} />}
                        {machine.coolantTarget && <ReferenceLine y={machine.coolantTarget} stroke="#10b981" strokeWidth={2} label={{ value: 'TARGET', fill: '#10b981', fontSize: 10, fontWeight: 'black', position: 'insideTopRight' }} />}
                        <Line type="monotone" dataKey="percentage" stroke="#3b82f6" strokeWidth={5} dot={{r:6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 10, strokeWidth: 4}} />
                        </LineChart>
                    </ResponsiveContainer>
                  </div>
               </div>
           </div>
       )}

       <NumpadModal 
            isOpen={showNumpad} 
            onClose={() => setShowNumpad(false)} 
            onConfirm={(v) => { setNewVal(v); setShowNumpad(false); }} 
            title="Brix Meting Invoeren" 
            initialValue={newVal} 
            unit="%"
        />

        <NumpadModal 
            isOpen={showTankNumpad} 
            onClose={() => setShowTankNumpad(false)} 
            onConfirm={(v) => { setTempTankCapacity(v); setShowTankNumpad(false); }} 
            title="Actuele Tankinhoud (L)" 
            initialValue={tempTankCapacity} 
            unit="L"
            decimal={false}
        />
    </div>
  );
};
