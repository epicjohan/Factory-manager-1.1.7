
import React, { useState } from 'react';
import { CalendarClock, Plus, Edit2, Trash2, HelpCircle, X } from '../../icons';
import { db } from '../../services/storage';
import { WorkSchedule, DailyShift } from '../../types';
import { useTable } from '../../hooks/useTable';
import { KEYS, generateId } from '../../services/db/core';

export const SettingsSchedules: React.FC = () => {
    const { data: schedules } = useTable<WorkSchedule>(KEYS.SCHEDULES);

    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
    const [newName, setNewName] = useState('');
    const [tempShifts, setTempShifts] = useState<DailyShift[]>([]);

    const handleOpenModal = (sc?: WorkSchedule) => {
        if (sc) {
            setEditingSchedule(sc);
            setNewName(sc.name);
            setTempShifts(JSON.parse(JSON.stringify(sc.shifts))); 
        } else {
            setEditingSchedule(null);
            setNewName('');
            setTempShifts([
                { day: 'Monday', label: 'Maandag', enabled: true, startTime: '07:30', endTime: '16:00' },
                { day: 'Tuesday', label: 'Dinsdag', enabled: true, startTime: '07:30', endTime: '16:00' },
                { day: 'Wednesday', label: 'Woensdag', enabled: true, startTime: '07:30', endTime: '16:00' },
                { day: 'Thursday', label: 'Donderdag', enabled: true, startTime: '07:30', endTime: '16:00' },
                { day: 'Friday', label: 'Vrijdag', enabled: true, startTime: '07:30', endTime: '16:00' },
                { day: 'Saturday', label: 'Zaterdag', enabled: false, startTime: '07:30', endTime: '16:00' },
                { day: 'Sunday', label: 'Zondag', enabled: false, startTime: '07:30', endTime: '16:00' }
            ]);
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const data: WorkSchedule = { 
            id: editingSchedule?.id || generateId(), 
            name: newName, 
            shifts: tempShifts 
        };
        
        if (editingSchedule) await db.updateSchedule(data);
        else await db.addSchedule(data);
        
        setShowModal(false);
    };

    const handleDelete = async (id: string) => {
        if(window.confirm("Rooster verwijderen?")) {
            await db.deleteSchedule(id);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-4 rounded-xl">
                <div className="flex gap-3">
                    <HelpCircle className="text-blue-500 shrink-0" size={20} />
                    <div>
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-tight">Ploegendiensten</h4>
                        <div className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                            Definieer de werktijden voor correcte OEE berekeningen en doelstellingen.
                        </div>
                    </div>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs uppercase tracking-widest">
                    <Plus size={18} /> Nieuw Rooster
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedules.map(sched => (
                    <div key={sched.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm group hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400"><CalendarClock size={20} /></div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-lg">{sched.name}</h4>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenModal(sched)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(sched.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                            {sched.shifts.map(s => (
                                <div key={s.day} className={`text-[10px] px-2 py-1 rounded font-bold border ${s.enabled ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-600'}`}>
                                    {s.day.slice(0, 2)}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">{editingSchedule ? 'Rooster Bewerken' : 'Nieuw Rooster'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Naam Rooster</label>
                                <input required type="text" className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Bijv. 2-Ploegendienst" />
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                {tempShifts.map((shift, idx) => (
                                    <div key={shift.day} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${shift.enabled ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-900/50 dark:border-slate-800 opacity-60'}`}>
                                        <div className="w-24 font-bold text-slate-600 dark:text-slate-300 text-sm">{shift.label}</div>
                                        <div className="flex-1 flex gap-2">
                                            {shift.enabled && <>
                                                <input type="time" className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-xs font-mono font-bold" value={shift.startTime} onChange={e => { const n = [...tempShifts]; n[idx].startTime = e.target.value; setTempShifts(n); }} />
                                                <span className="self-center text-slate-400">-</span>
                                                <input type="time" className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-xs font-mono font-bold" value={shift.endTime} onChange={e => { const n = [...tempShifts]; n[idx].endTime = e.target.value; setTempShifts(n); }} />
                                            </>}
                                        </div>
                                        <button type="button" onClick={() => { const n = [...tempShifts]; n[idx].enabled = !n[idx].enabled; setTempShifts(n); }} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${shift.enabled ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'}`}>{shift.enabled ? 'AAN' : 'UIT'}</button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">Annuleren</button>
                                <button type="submit" className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-transform active:scale-95">Opslaan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
