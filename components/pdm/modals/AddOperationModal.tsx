
import React, { useState, useEffect, useMemo } from 'react';
import { Machine, SetupTemplate, AssetType, PredefinedOperation } from '../../../types';
import { Plus, Monitor, X, PlayCircle, Box, CheckCircle2 } from '../../../icons';

interface AddOperationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (type: 'MACHINE' | 'PROCESS', id: string) => void;
    machines: Machine[];
    templates: SetupTemplate[];
    mkgOperations: PredefinedOperation[];
}

export const AddOperationModal: React.FC<AddOperationModalProps> = ({ 
    isOpen, onClose, onConfirm, machines, templates, mkgOperations 
}) => {
    const [opType, setOpType] = useState<'MACHINE' | 'PROCESS'>('MACHINE');
    const [selectedId, setSelectedId] = useState('');

    // Filter Catalog for 'PROCESS' type items
    const catalogProcesses = useMemo(() => {
        return mkgOperations.filter(op => op.operationType === 'PROCESS');
    }, [mkgOperations]);

    // Pre-select first available item when type changes or modal opens
    useEffect(() => {
        if (isOpen) {
            if (opType === 'MACHINE') {
                if (machines.length > 0) setSelectedId(machines[0].id);
                else setSelectedId('');
            } else {
                if (catalogProcesses.length > 0) setSelectedId(catalogProcesses[0].id);
                else setSelectedId('');
            }
        }
    }, [isOpen, opType, machines, catalogProcesses]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!selectedId) return;
        onConfirm(opType, selectedId);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <Plus size={18} className="text-orange-500" /> Nieuwe Bewerking Starten
                        </h3>
                        <p className="text-xs text-slate-500 font-bold">Kies het type stap voor dit proces.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    
                    {/* TYPE TOGGLE */}
                    <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex border border-slate-200 dark:border-slate-700 shadow-inner">
                        <button 
                            type="button"
                            onClick={() => setOpType('MACHINE')}
                            className={`flex-1 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${opType === 'MACHINE' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Monitor size={16} /> Machine
                        </button>
                        <button 
                            type="button"
                            onClick={() => setOpType('PROCESS')}
                            className={`flex-1 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${opType === 'PROCESS' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Box size={16} /> Proces
                        </button>
                    </div>

                    {/* INFO CARD */}
                    <div className={`p-4 rounded-2xl border flex gap-4 items-start ${opType === 'MACHINE' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800'}`}>
                        <div className={`p-2 rounded-[2rem] shrink-0 ${opType === 'MACHINE' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                            {opType === 'MACHINE' ? <Monitor size={24} /> : <Box size={24} />}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                                {opType === 'MACHINE' ? 'Selecteer Machine' : 'Selecteer Proces'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {opType === 'MACHINE' 
                                    ? 'Er wordt direct een setup aangemaakt met de juiste templates en parameters voor deze machine.'
                                    : 'Kies een handmatig proces uit de catalogus (bijv. Assemblage, Inpakken).'
                                }
                            </p>
                        </div>
                    </div>

                    {/* SELECTION DROPDOWN */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            {opType === 'MACHINE' ? 'Beschikbare Assets' : 'Beschikbare Processen (Catalogus)'}
                        </label>
                        <div className="relative">
                            <select 
                                className="w-full p-4 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all text-sm"
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                            >
                                {opType === 'MACHINE' ? (
                                    <>
                                        {machines.length === 0 && <option value="">Geen machines gevonden</option>}
                                        {machines.filter(m => !m.isArchived).map(m => (
                                            <option key={m.id} value={m.id}>{m.name} ({m.machineNumber})</option>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {catalogProcesses.length === 0 && <option value="">Geen processen in catalogus</option>}
                                        {catalogProcesses.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-800 rounded-[2rem] transition-colors">
                        Annuleren
                    </button>
                    <button onClick={handleConfirm} disabled={!selectedId} className="flex-[2] py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                        <PlayCircle size={16} /> Toevoegen
                    </button>
                </div>
            </div>
        </div>
    );
};
