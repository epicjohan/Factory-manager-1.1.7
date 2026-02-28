
import React, { useState, useEffect } from 'react';
import { Machine, SetupVariant } from '../../../types';
import { Copy, LayoutTemplate, Monitor, X, Check } from '../../../icons';

interface DuplicateSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (targetMachineId: string, mode: 'CLONE' | 'TEMPLATE') => void;
    sourceSetup: SetupVariant | null;
    machines: Machine[];
}

export const DuplicateSetupModal: React.FC<DuplicateSetupModalProps> = ({
    isOpen, onClose, onConfirm, sourceSetup, machines
}) => {
    const [targetMachineId, setTargetMachineId] = useState('');
    const [mode, setMode] = useState<'CLONE' | 'TEMPLATE'>('CLONE');

    const wasOpen = React.useRef(false);

    // Pre-select current machine if possible, otherwise first available
    useEffect(() => {
        if (isOpen && !wasOpen.current && sourceSetup) {
            const availableMachines = machines.filter(m => !m.isArchived);
            setTargetMachineId(sourceSetup.machineId || (availableMachines.length > 0 ? availableMachines[0].id : ''));
            setMode('CLONE');
            wasOpen.current = true;
        } else if (!isOpen) {
            wasOpen.current = false;
        }
    }, [isOpen, sourceSetup, machines]);

    if (!isOpen || !sourceSetup) return null;

    const handleConfirm = () => {
        if (!targetMachineId) return;
        onConfirm(targetMachineId, mode);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">

                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <Copy size={18} className="text-blue-600" /> Setup Dupliceren
                        </h3>
                        <p className="text-xs text-slate-500 font-bold">Bron: {sourceSetup.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8">

                    {/* STEP 1: TARGET MACHINE */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">1. Selecteer Doel Asset</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Monitor size={18} /></div>
                            <select
                                className="w-full pl-12 pr-4 py-4 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all"
                                value={targetMachineId}
                                onChange={(e) => setTargetMachineId(e.target.value)}
                            >
                                <option value="">-- Kies Machine --</option>
                                {machines.filter(m => !m.isArchived).map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.machineNumber})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* STEP 2: STRATEGY */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">2. Kopieer Methode</label>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => setMode('CLONE')}
                                className={`flex items-center gap-4 p-4 rounded-[2rem] border-2 transition-all text-left group ${mode === 'CLONE' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}
                            >
                                <div className={`p-3 rounded-full ${mode === 'CLONE' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                    <Copy size={20} />
                                </div>
                                <div>
                                    <div className={`font-bold text-sm ${mode === 'CLONE' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>Volledige Kloon</div>
                                    <div className="text-[10px] text-slate-500 leading-tight mt-1">Kopieer alle gereedschappen, stappen, bestanden en foto's.</div>
                                </div>
                                {mode === 'CLONE' && <Check size={20} className="ml-auto text-blue-600" />}
                            </button>

                            <button
                                onClick={() => setMode('TEMPLATE')}
                                className={`flex items-center gap-4 p-4 rounded-[2rem] border-2 transition-all text-left group ${mode === 'TEMPLATE' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-500' : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'}`}
                            >
                                <div className={`p-3 rounded-full ${mode === 'TEMPLATE' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                    <LayoutTemplate size={20} />
                                </div>
                                <div>
                                    <div className={`font-bold text-sm ${mode === 'TEMPLATE' ? 'text-orange-700 dark:text-orange-300' : 'text-slate-700 dark:text-slate-300'}`}>Alleen Template (Schoon)</div>
                                    <div className="text-[10px] text-slate-500 leading-tight mt-1">Maak een lege setup met de velden van de nieuwe machine.</div>
                                </div>
                                {mode === 'TEMPLATE' && <Check size={20} className="ml-auto text-orange-600" />}
                            </button>
                        </div>
                    </div>

                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-800 rounded-[2rem] transition-colors">
                        Annuleren
                    </button>
                    <button onClick={handleConfirm} disabled={!targetMachineId} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">
                        Start Kopie
                    </button>
                </div>
            </div>
        </div>
    );
};
