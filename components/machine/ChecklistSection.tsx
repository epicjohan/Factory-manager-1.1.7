import React, { useState, useMemo } from 'react';
import { Machine, ChecklistLog, ChecklistItem, ChecklistInterval, Permission } from '../../types';
import { db } from '../../services/storage';
import { KEYS, generateId } from '../../services/db/core';
import { useAuth } from '../../contexts/AuthContext';
import { useTable } from '../../hooks/useTable';
import {
    ClipboardList, CheckSquare, History, Settings, Plus, Trash2, XCircle, Square, CheckCircle, Calendar, Filter, CloudCog, Clock
} from '../../icons';
import { useConfirm } from '../../contexts/ConfirmContext';

interface ChecklistSectionProps {
    machine: Machine;
}

export const ChecklistSection: React.FC<ChecklistSectionProps> = ({ machine }) => {
    const { user, hasPermission } = useAuth();
    const confirm = useConfirm();

    const [view, setView] = useState<'EXECUTE' | 'HISTORY'>('EXECUTE');
    const [showConfig, setShowConfig] = useState(false);

    const [newDesc, setNewDesc] = useState('');
    const [newInterval, setNewInterval] = useState<ChecklistInterval>(ChecklistInterval.DAGELIJKS);
    const [newCustomText, setNewCustomText] = useState('');
    const [newCustomDays, setNewCustomDays] = useState<number>(7);

    const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
    const [historyFilterItem, setHistoryFilterItem] = useState<string>('ALL');

    const { data: allChecklistLogs } = useTable<ChecklistLog>(KEYS.LOGS_CHECKLIST);

    const augmentedLogs = useMemo(() => {
        return allChecklistLogs
            .filter(l => l.machineId === machine.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allChecklistLogs, machine.id]);

    const getItemStatus = (item: ChecklistItem) => {
        const logs = augmentedLogs.filter(l => l.checklistItemId === item.id);
        if (logs.length === 0) return { done: false, lastDate: null };

        const lastLog = logs[0];
        const lastDate = new Date(lastLog.date);
        const now = new Date();

        let done = false;

        switch (item.interval) {
            case ChecklistInterval.DAGELIJKS:
                done = lastLog.date.startsWith(now.toISOString().split('T')[0]);
                break;
            case ChecklistInterval.WEKELIJKS:
                const getWeek = (d: Date) => {
                    const date = new Date(d.getTime());
                    date.setHours(0, 0, 0, 0);
                    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
                    const week1 = new Date(date.getFullYear(), 0, 4);
                    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
                };
                done = getWeek(lastDate) === getWeek(now) && lastDate.getFullYear() === now.getFullYear();
                break;
            case ChecklistInterval.MAANDELIJKS:
                done = lastDate.getMonth() === now.getMonth() && lastDate.getFullYear() === now.getFullYear();
                break;
            case ChecklistInterval.AANGEPAST:
                if (item.customIntervalDays) {
                    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    done = diffDays < item.customIntervalDays;
                } else {
                    done = lastLog.date.startsWith(now.toISOString().split('T')[0]);
                }
                break;
        }

        return { done, lastDate };
    };

    const handleToggle = (itemId: string) => {
        const item = machine.checklist?.find(i => i.id === itemId);
        if (!item || machine.isArchived || getItemStatus(item).done || !user) return;

        const newLog: ChecklistLog = {
            id: generateId(),
            machineId: machine.id,
            checklistItemId: itemId,
            date: new Date().toISOString(),
            checkedBy: user.name,
            status: 'OK'
        };
        db.addChecklistLog(newLog);
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDesc) return;
        const newItem: ChecklistItem = {
            id: generateId(),
            description: newDesc,
            interval: newInterval,
            customIntervalText: (newInterval === ChecklistInterval.AANGEPAST && newCustomText.trim()) ? newCustomText : undefined,
            customIntervalDays: newInterval === ChecklistInterval.AANGEPAST ? newCustomDays : undefined
        };
        const updatedMachine = { ...machine, checklist: [...(machine.checklist || []), newItem] };
        db.updateMachine(updatedMachine);
        setNewDesc(''); setNewCustomText(''); setShowConfig(false);
    };

    const handleDeleteItem = async (itemId: string) => {
        const ok = await confirm({ title: 'Item verwijderen', message: 'Checklist item verwijderen?' });
        if (!ok) return;
        const updatedMachine = { ...machine, checklist: (machine.checklist || []).filter(i => i.id !== itemId) };
        db.updateMachine(updatedMachine);
    };

    const filteredHistory = augmentedLogs.filter(log => {
        const logDate = log.date.split('T')[0];
        return logDate === historyDate && (historyFilterItem === 'ALL' || log.checklistItemId === historyFilterItem);
    });

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-tighter italic text-xl"> <ClipboardList size={24} className="text-purple-500" /> Onderhouds Checklist </h3>
                    <div className="flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700">
                        <button onClick={() => setView('EXECUTE')} className={`px-5 py-2 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'EXECUTE' ? 'bg-white dark:bg-slate-800 text-purple-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}> <CheckSquare size={16} /> Uitvoeren </button>
                        <button onClick={() => setView('HISTORY')} className={`px-5 py-2 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'HISTORY' ? 'bg-white dark:bg-slate-800 text-purple-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}> <History size={16} /> Historie </button>
                    </div>
                    {view === 'EXECUTE' && hasPermission(Permission.MANAGE_MACHINES) && !machine.isArchived && (
                        <button onClick={() => setShowConfig(!showConfig)} className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"> {showConfig ? <XCircle size={18} /> : <Settings size={18} />} </button>
                    )}
                </div>

                {view === 'EXECUTE' && (
                    <>
                        {showConfig && (
                            <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-2xl p-6 mb-8 animate-in slide-in-from-top-2">
                                <h4 className="text-sm font-black uppercase tracking-widest text-purple-800 dark:text-purple-300 mb-4 flex items-center gap-2"> <Plus size={16} /> Item Toevoegen </h4>
                                <form onSubmit={handleAddItem} className="space-y-4">
                                    <div className="flex flex-col md:flex-row gap-3 items-end">
                                        <div className="flex-1 w-full">
                                            <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Omschrijving van de check</label>
                                            <input required type="text" placeholder="Bijv. Oliepeil controleren" className="w-full p-3 rounded-[2rem] border border-purple-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-sm" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                                        </div>
                                        <div className="w-full md:w-56">
                                            <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Interval</label>
                                            <select className="w-full p-3 rounded-[2rem] border border-purple-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-sm" value={newInterval} onChange={e => setNewInterval(e.target.value as ChecklistInterval)}>
                                                <option value={ChecklistInterval.DAGELIJKS}>Dagelijks</option>
                                                <option value={ChecklistInterval.WEKELIJKS}>Wekelijks</option>
                                                <option value={ChecklistInterval.MAANDELIJKS}>Maandelijks</option>
                                                <option value={ChecklistInterval.AANGEPAST}>Anders (Dagen)...</option>
                                            </select>
                                        </div>
                                        <button type="submit" className="w-full md:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest rounded-[2rem] text-xs transition-colors shadow-md shadow-purple-500/30">Toevoegen</button>
                                    </div>
                                    {newInterval === ChecklistInterval.AANGEPAST && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-1 pt-4">
                                            <div>
                                                <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Label (Optioneel, bijv. Elke 100u)</label>
                                                <input type="text" placeholder="Laat leeg voor standaard weergave" className="w-full p-3 rounded-[2rem] border border-purple-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-sm font-bold" value={newCustomText} onChange={e => setNewCustomText(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Actief na (Aantal dagen)</label>
                                                <input required type="number" min="1" className="w-full p-3 rounded-[2rem] border border-purple-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-sm font-bold" value={newCustomDays} onChange={e => setNewCustomDays(parseInt(e.target.value))} />
                                            </div>
                                        </div>
                                    )}
                                </form>
                            </div>
                        )}
                        <div className="space-y-3">
                            {machine.checklist && machine.checklist.length > 0 ? (
                                machine.checklist.map(item => {
                                    const { done, lastDate } = getItemStatus(item);
                                    const label = item.interval === ChecklistInterval.AANGEPAST
                                        ? (item.customIntervalText ? `${item.customIntervalText} (${item.customIntervalDays}d)` : `Elke ${item.customIntervalDays} dagen`)
                                        : item.interval.toLowerCase();

                                    return (
                                        <div key={item.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all hover:scale-[1.01] ${done ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                            <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleToggle(item.id)}>
                                                {done ? (<div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-full text-green-600 dark:text-green-400"><CheckCircle size={24} /></div>) : (<div className="bg-white dark:bg-slate-800 p-2 rounded-full text-slate-300 border border-slate-200 dark:border-slate-600"><Square size={24} /></div>)}
                                                <div>
                                                    <div className={`font-bold ${done ? 'text-green-800 dark:text-green-300 line-through opacity-70' : 'text-slate-800 dark:text-slate-200'}`}>{item.description}</div>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Interval: {label}</div>
                                                        {done && lastDate && (
                                                            <div className="text-[10px] text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                                                                <Clock size={10} /> Voldaan op {lastDate.toLocaleDateString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {showConfig && (<button onClick={() => handleDeleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>)}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300"> Geen items geconfigureerd. </div>
                            )}
                        </div>
                    </>
                )}

                {view === 'HISTORY' && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                            <div className="flex-1">
                                <label className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-2"><Calendar size={12} /> Datum</label>
                                <input type="date" className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-sm font-bold" value={historyDate} onChange={e => setHistoryDate(e.target.value)} />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-2"><Filter size={12} /> Actie Punt</label>
                                <select className="w-full p-3 rounded-[2rem] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-sm font-bold" value={historyFilterItem} onChange={e => setHistoryFilterItem(e.target.value)}>
                                    <option value="ALL">Alle Punten</option>
                                    {machine.checklist?.map(item => (<option key={item.id} value={item.id}>{item.description}</option>))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {filteredHistory.length > 0 ? (
                                filteredHistory.map(log => {
                                    const desc = machine.checklist?.find(i => i.id === log.checklistItemId)?.description || "Onbekend Item";
                                    return (
                                        <div key={log.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="text-green-500"><CheckCircle size={18} /></div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                                        {desc}
                                                        {(log as any).isPending && <CloudCog size={12} className="text-orange-500 animate-spin-slow" />}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">{new Date(log.date).toLocaleTimeString()} • {log.checkedBy}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-slate-400 text-xs italic border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl"> Geen logs gevonden. </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};