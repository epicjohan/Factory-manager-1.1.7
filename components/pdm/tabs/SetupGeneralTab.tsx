
import React, { useState, useMemo } from 'react';
import { Monitor, Box, Clock, RefreshCw, ChevronRight, Search, History, X, FileCode, Wrench, Settings, Info, User, Calendar } from '../../../icons';
import { SetupVariant, Machine, SetupTemplate, SetupChangeEntry } from '../../../types';

interface SetupGeneralTabProps {
    setup: SetupVariant;
    isLocked: boolean;
    machines: Machine[];
    templates: SetupTemplate[];
    isForceProcess?: boolean;
    onUpdate: (updates: Partial<SetupVariant>) => void;
}

export const SetupGeneralTab: React.FC<SetupGeneralTabProps> = ({ setup, isLocked, machines, templates, isForceProcess, onUpdate }) => {
    const [showMachinePicker, setShowMachinePicker] = useState(false);
    const [machineSearchTerm, setMachineSearchTerm] = useState('');
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const isProcessSetup = (setup.setupTemplateId !== undefined && !setup.machineId) || isForceProcess;

    const filteredMachines = useMemo(() => {
        if (!machineSearchTerm) return machines;
        const term = machineSearchTerm.toLowerCase();
        return machines.filter(m => m.name.toLowerCase().includes(term) || m.machineNumber.toLowerCase().includes(term));
    }, [machines, machineSearchTerm]);

    const getMachineLabel = (id?: string) => {
        if (!id) return 'Geen Machine';
        const m = machines.find(mac => mac.id === id);
        return m ? `${m.name} (${m.machineNumber})` : 'Onbekende Machine';
    };

    const handleMachineSelect = (mId: string) => {
        const machine = machines.find(m => m.id === mId);
        const updates: Partial<SetupVariant> = { 
            machineId: mId,
            name: machine ? machine.name : setup.name // Auto-update name to asset name
        };
        
        // Auto-link template if machine has default
        if (machine?.setupTemplateId) {
            const tpl = templates.find(t => t.id === machine.setupTemplateId);
            if (tpl) {
                updates.frozenFields = tpl.fields;
                updates.frozenToolFields = tpl.toolFields;
            }
        }
        onUpdate(updates);
        setShowMachinePicker(false);
    };

    const getChangeIcon = (type: string) => {
        switch (type) {
            case 'NC':
            case 'CAM': return <FileCode size={16} className="text-emerald-500" />;
            case 'TOOL': return <Wrench size={16} className="text-orange-500" />;
            case 'PARAM': return <Settings size={16} className="text-blue-500" />;
            default: return <Info size={16} className="text-slate-500" />;
        }
    };

    const getChangeLabel = (type: string) => {
        switch (type) {
            case 'NC': return 'NC Programma';
            case 'CAM': return 'CAM Project';
            case 'TOOL': return 'Gereedschap';
            case 'PARAM': return 'Parameter';
            default: return 'Algemeen';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in overflow-visible">
            {/* SETUP REVISION DISPLAY - INTERACTIVE */}
            {setup.revision && setup.revision > 0 && (
                <div 
                    onClick={() => setShowHistoryModal(true)}
                    className="group bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-[2rem] flex items-center justify-between shadow-sm mb-4 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-200 dark:bg-blue-800 p-2 rounded-2xl text-blue-700 dark:text-blue-300">
                            <History size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest">
                                Proces Revisie: v{setup.revision}
                            </div>
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                                Laatste wijziging: {setup.changeLog && setup.changeLog.length > 0 ? new Date(setup.changeLog[0].date).toLocaleDateString() : 'Onbekend'}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 group-hover:translate-x-1 transition-transform">
                        <span>Bekijk {setup.changeLog?.length || 0} wijzigingen</span>
                        <ChevronRight size={14} />
                    </div>
                </div>
            )}

            {/* MAIN CONFIG GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* LEFT: TYPE */}
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Type Aansturing</label>
                    <div className="w-full p-4 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed flex items-center gap-3">
                        {isProcessSetup ? <Box size={18} /> : <Monitor size={18} />}
                        {isProcessSetup ? 'Proces Instructie' : 'Machine Bewerking'}
                    </div>
                </div>

                {/* RIGHT: CONTEXT (MACHINE OR TEMPLATE) */}
                <div className="relative">
                    {!isProcessSetup ? (
                        <>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Toegewezen Machine</label>
                            <div 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(!isLocked) setShowMachinePicker(!showMachinePicker); 
                                }} 
                                className={`w-full p-4 rounded-[2rem] border-2 bg-white dark:bg-slate-800 flex items-center justify-between cursor-pointer transition-all ${isLocked ? 'opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 hover:border-blue-500 shadow-sm'}`}
                            >
                                <div className="flex items-center gap-3 font-bold text-slate-800 dark:text-white truncate">
                                    <Monitor size={18} className="text-blue-500" /> 
                                    <span className="truncate">{getMachineLabel(setup.machineId)}</span>
                                </div>
                                {!isLocked && <ChevronRight size={16} className={`text-slate-400 transition-transform ${showMachinePicker ? 'rotate-90' : ''}`} />}
                            </div>
                            
                            {/* MACHINE PICKER DROPDOWN */}
                            {showMachinePicker && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[150] p-4 animate-in zoom-in-95 duration-200 ring-4 ring-black/5">
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input autoFocus type="text" placeholder="Zoek machine..." className="w-full pl-10 pr-4 py-2.5 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border-none outline-none font-bold text-sm" value={machineSearchTerm} onChange={e => setMachineSearchTerm(e.target.value)} />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                                        {filteredMachines.map(m => (
                                            <div 
                                                key={m.id} 
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleMachineSelect(m.id);
                                                }} 
                                                className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-[2rem] cursor-pointer flex justify-between items-center transition-colors group"
                                            >
                                                <span className="font-bold text-sm text-slate-800 dark:text-white uppercase italic group-hover:text-blue-600 transition-colors">{m.name}</span>
                                                <span className="font-mono text-[10px] text-slate-400 font-black">{m.machineNumber}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Proces Type (Sjabloon)</label>
                            <div className="w-full p-4 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 font-bold text-slate-700 dark:text-slate-300 cursor-not-allowed flex items-center gap-3">
                                <Box size={18} className="text-orange-500" />
                                {templates.find(t => t.id === setup.setupTemplateId)?.name || 'Geen sjabloon geselecteerd'}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 ml-1">
                                Het sjabloon wordt vastgelegd bij het aanmaken.
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* COMPACT TIME FIELDS */}
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Insteltijd</label>
                    <div className={`w-full p-3 rounded-[2rem] border-2 bg-white dark:bg-slate-800 flex items-center gap-3 transition-all ${isLocked ? 'border-slate-200 dark:border-slate-700 opacity-60' : 'border-slate-200 dark:border-slate-700 hover:border-blue-500 shadow-sm'}`}>
                         <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
                             <Clock size={18} />
                         </div>
                         <input 
                            disabled={isLocked} 
                            type="number" 
                            className="flex-1 font-bold text-lg bg-transparent border-none outline-none text-slate-800 dark:text-white tabular-nums" 
                            value={setup.setupTimeMinutes} 
                            onChange={e => onUpdate({ setupTimeMinutes: parseInt(e.target.value) || 0 })} 
                            placeholder="0"
                         />
                         <span className="text-xs font-bold text-slate-400">min</span>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Cyclus Tijd</label>
                    <div className={`w-full p-3 rounded-[2rem] border-2 bg-white dark:bg-slate-800 flex items-center gap-3 transition-all ${isLocked ? 'border-slate-200 dark:border-slate-700 opacity-60' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500 shadow-sm'}`}>
                         <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
                             <RefreshCw size={18} />
                         </div>
                         <input 
                            disabled={isLocked} 
                            type="number" 
                            step="0.01"
                            className="flex-1 font-bold text-lg bg-transparent border-none outline-none text-slate-800 dark:text-white tabular-nums" 
                            value={setup.cycleTimeMinutes} 
                            onChange={e => onUpdate({ cycleTimeMinutes: parseFloat(e.target.value) || 0 })} 
                            placeholder="0.00"
                         />
                         <span className="text-xs font-bold text-slate-400">min</span>
                    </div>
                </div>
            </div>

            {/* HISTORY MODAL */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl relative border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Proces Historie</h3>
                                <p className="text-xs text-slate-500 font-bold">Volledig logboek van wijzigingen in deze setup.</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            {setup.changeLog && setup.changeLog.length > 0 ? (
                                <div className="space-y-6 relative ml-2">
                                    <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                                    {setup.changeLog.map((entry, idx) => (
                                        <div key={idx} className="relative flex gap-6 group">
                                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 z-10 flex items-center justify-center shrink-0 shadow-sm group-hover:border-blue-500 transition-colors">
                                                {getChangeIcon(entry.type)}
                                            </div>
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{getChangeLabel(entry.type)}</span>
                                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{entry.description}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="flex items-center justify-end gap-1 text-[10px] font-mono font-bold text-slate-400">
                                                            <Calendar size={10} />
                                                            {new Date(entry.date).toLocaleDateString()}
                                                        </span>
                                                        <span className="flex items-center justify-end gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                                                            <User size={10} />
                                                            {entry.user}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-xs bg-white dark:bg-slate-900 p-3 rounded-[2rem] border border-slate-200 dark:border-slate-700 italic text-slate-600 dark:text-slate-300">
                                                    "<span className="font-bold not-italic text-slate-800 dark:text-slate-200">Reden:</span> {entry.reason}"
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center text-slate-400 italic">
                                    <History size={48} className="mx-auto mb-4 opacity-20" />
                                    <p className="font-bold text-sm">Geen wijzigingen geregistreerd.</p>
                                    <p className="text-xs mt-1">Wijzigingen aan NC programma's of tools worden hier getoond.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
