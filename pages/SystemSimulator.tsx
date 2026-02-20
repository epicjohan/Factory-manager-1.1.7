
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/storage';
import { Machine, SimulationState } from '../types';
import { 
    ArrowLeft, 
    Beaker, 
    Zap, 
    AlertTriangle, 
    Play, 
    Square, 
    Activity, 
    Cpu, 
    Wifi, 
    RefreshCw, 
    Terminal, 
    Trash2, 
    ChevronDown, 
    ChevronUp,
    Bug,
    List,
    TrendingUp,
    ShieldAlert,
    X,
    Plus,
    CheckCircle
} from 'lucide-react';

interface ConsoleLog {
    id: string;
    timestamp: string;
    type: 'INJECTION' | 'SYSTEM' | 'ALARM' | 'SUCCESS';
    message: string;
}

export const SystemSimulator: React.FC = () => {
    const navigate = useNavigate();
    const consoleRef = useRef<HTMLDivElement>(null);
    const [logs, setLogs] = useState<ConsoleLog[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [simState, setSimState] = useState<SimulationState>({
        active: false,
        machineId: '',
        toolSequence: [1, 4, 8],
        activeToolIdx: 0,
        secondsPerTool: 5,
        elapsedInTool: 0,
        scenario: 'STABLE',
        cycleCount: 0,
        baseLoad: 40
    });

    useEffect(() => {
        // --- FIX: Load machines and simState asynchronously ---
        const init = async () => {
            const all = await db.getMachines();
            setMachines(all);
            
            const existingState = await db.getSimulationState();
            if (existingState) {
                setSimState(existingState);
            } else if (all.length > 0) {
                setSimState(prev => ({ ...prev, machineId: all[0].id }));
            }
        };
        init();
        addLog('SYSTEM', 'Twin Remote Interface geladen.');
    }, []);

    // Listen for ticks from background to update UI logs
    useEffect(() => {
        const handleTick = async (e: any) => {
            const stats = e.detail;
            if (stats.alarmMessage) addLog('ALARM', stats.alarmMessage);
            else if (simState.active) {
                const curSim = await db.getSimulationState();
                if (curSim && curSim.elapsedInTool === 0) {
                     addLog('INJECTION', `Switch naar T${stats.currentTool} (Cycle ${stats.partsCount + 1})`);
                }
            }
        };
        window.addEventListener('simulation-tick', handleTick);
        return () => window.removeEventListener('simulation-tick', handleTick);
    }, [simState.active]);

    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs]);

    const addLog = (type: ConsoleLog['type'], message: string) => {
        const newLog: ConsoleLog = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            type,
            message
        };
        setLogs(prev => [...prev.slice(-49), newLog]);
    };

    const handleSaveAndSync = (newSt: SimulationState) => {
        setSimState(newSt);
        db.setSimulationState(newSt);
    };

    const toggleSim = () => {
        const next = !simState.active;
        const updated = { ...simState, active: next, elapsedInTool: 0 };
        handleSaveAndSync(updated);
        addLog('SYSTEM', next ? 'Simulator Loop gestart op achtergrond.' : 'Simulator gepauzeerd.');
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 text-left">
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors">
                <ArrowLeft size={18} />
                <span>Terug naar Admin</span>
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Beaker className="text-purple-500" />
                        Process Twin Simulator
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Stuur live data aan, zelfs als je navigeert.</p>
                </div>
                <button 
                    onClick={toggleSim}
                    className={`px-10 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl text-lg ${simState.active ? 'bg-red-600 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                >
                    {simState.active ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                    <span>{simState.active ? 'STOP SIMULATIE' : 'START SIMULATIE'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Cpu size={14} /> Machine</h3>
                                <select 
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none"
                                    value={simState.machineId}
                                    onChange={e => handleSaveAndSync({ ...simState, machineId: e.target.value })}
                                >
                                    {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.machineNumber})</option>)}
                                </select>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Baseline Load</label>
                                        <span className="font-mono font-bold text-blue-500">{simState.baseLoad}%</span>
                                    </div>
                                    <input 
                                        type="range" min="5" max="100" value={simState.baseLoad} 
                                        onChange={e => handleSaveAndSync({ ...simState, baseLoad: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><List size={14} /> Sequence</h3>
                                <div className="flex flex-wrap gap-2">
                                    {simState.toolSequence.map((t, idx) => (
                                        <div key={idx} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-black relative ${idx === simState.activeToolIdx && simState.active ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                            T{t}
                                            <button onClick={() => handleSaveAndSync({ ...simState, toolSequence: simState.toolSequence.filter((_, i) => i !== idx) })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={10}/></button>
                                        </div>
                                    ))}
                                    <button onClick={() => handleSaveAndSync({ ...simState, toolSequence: [...simState.toolSequence, (simState.toolSequence[simState.toolSequence.length-1] || 0) + 1] })} className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400"><Plus size={20}/></button>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Snelheid</label><span className="text-xs font-bold text-slate-500">{simState.secondsPerTool}s/tool</span></div>
                                    <input type="range" min="2" max="30" value={simState.secondsPerTool} onChange={e => handleSaveAndSync({ ...simState, secondsPerTool: parseInt(e.target.value) })} className="w-full h-2 accent-slate-500" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Bug size={14} /> Scenarioselectie</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(['STABLE', 'WEAR', 'BREAKAGE'] as const).map(sc => (
                                    <button 
                                        key={sc} 
                                        onClick={() => handleSaveAndSync({ ...simState, scenario: sc })}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${simState.scenario === sc ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20' : 'bg-white border-slate-100 dark:bg-slate-800 opacity-60'}`}
                                    >
                                        <div className="font-black text-sm uppercase mb-1">{sc === 'STABLE' ? 'Productie' : sc === 'WEAR' ? 'Slijtage' : 'Breuk'}</div>
                                        <p className="text-[10px] text-slate-500">{sc === 'STABLE' ? 'Normale load.' : sc === 'WEAR' ? '+0.5% per cyclus.' : 'Load piek op T1.'}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[500px]">
                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-800">
                            <div className="flex items-center gap-3"><Terminal size={18} className="text-blue-500" /><h3 className="text-sm font-black text-white uppercase tracking-widest">Live Trace</h3></div>
                            <button onClick={() => setLogs([])} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                        </div>
                        <div ref={consoleRef} className="flex-1 overflow-y-auto p-6 font-mono text-[10px] space-y-1 custom-scrollbar">
                            {logs.map(log => (
                                <div key={log.id} className="flex gap-4">
                                    <span className="text-slate-600">[{log.timestamp}]</span>
                                    <span className={`font-bold w-16 ${log.type === 'ALARM' ? 'text-red-500' : log.type === 'INJECTION' ? 'text-green-500/70' : 'text-blue-500'}`}>{log.type}</span>
                                    <span className="text-slate-300">{log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
