
import React, { useState } from 'react';
import { db } from '../services/storage';
import { generateId } from '../services/db/core';
import { MaintenanceEvent, Machine, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, X, Check, Trash2, Clock, CheckCircle } from '../icons';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';

export const MaintenancePlanner: React.FC = () => {
  const { canAccessAsset } = useAuth();
  
  // REACTIVE HOOKS
  const { data: allEvents } = useTable<MaintenanceEvent>(KEYS.EVENTS);
  const { data: allMachines } = useTable<Machine>(KEYS.MACHINES);
  const { data: allUsers } = useTable<User>(KEYS.USERS);

  // Filtered Data
  const machines = allMachines.filter(m => canAccessAsset(m.id));
  const events = allEvents.filter(ev => canAccessAsset(ev.machineId));
  const users = allUsers;
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<MaintenanceEvent | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formMachine, setFormMachine] = useState('');
  const [formUser, setFormUser] = useState('');

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); 

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(clickedDate);
    setEditingEvent(null);
    setFormTitle('');
    setFormMachine(machines.length > 0 ? machines[0].id : '');
    setFormUser(users.length > 0 ? users[0].name : '');
    setShowModal(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: MaintenanceEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setSelectedDate(new Date(event.date));
    setFormTitle(event.title);
    setFormMachine(event.machineId);
    setFormUser(event.assignedTo);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    if (editingEvent) {
        const updated: MaintenanceEvent = {
            ...editingEvent,
            title: formTitle,
            machineId: formMachine,
            assignedTo: formUser,
        };
        db.updateMaintenanceEvent(updated);
        // Note: No need to update local state manually, useTable handles it
    } else {
        const newEvent: MaintenanceEvent = {
            id: generateId(),
            title: formTitle,
            machineId: formMachine,
            assignedTo: formUser,
            date: selectedDate.toISOString(),
            status: 'PLANNED'
        };
        db.addMaintenanceEvent(newEvent);
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (editingEvent && window.confirm('Taak verwijderen?')) {
        db.deleteMaintenanceEvent(editingEvent.id);
        setShowModal(false);
    }
  };

  const handleToggleStatus = () => {
      if (editingEvent) {
          const newStatus: 'PLANNED' | 'COMPLETED' = editingEvent.status === 'PLANNED' ? 'COMPLETED' : 'PLANNED';
          const updated: MaintenanceEvent = { ...editingEvent, status: newStatus };
          db.updateMaintenanceEvent(updated);
          // Update the modal's internal view of the event immediately for better UX
          setEditingEvent(updated); 
      }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysCount = getDaysInMonth(year, month);
  let startDay = getFirstDayOfMonth(year, month);
  if (startDay === 0) startDay = 7; 
  startDay = startDay - 1; 

  const monthNames = [
    "Januari", "Februari", "Maart", "April", "Mei", "Juni", 
    "Juli", "Augustus", "September", "Oktober", "November", "December"
  ];

  const getEventsForDay = (day: number) => {
    return events.filter(ev => {
        const d = new Date(ev.date);
        return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <CalendarIcon className="text-blue-500" />
              Onderhoudsplanner
            </h2>
            <p className="text-slate-500 dark:text-slate-400">Beheer gepland onderhoud en taken.</p>
          </div>
          <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
             <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
             </button>
             <div className="font-bold text-lg min-w-[150px] text-center text-slate-800 dark:text-white">
                {monthNames[month]} {year}
             </div>
             <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <ChevronRight size={20} className="text-slate-600 dark:text-slate-300" />
             </button>
          </div>
       </div>

       <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
             {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
                <div key={day} className="p-4 text-center font-bold text-slate-600 dark:text-slate-400">
                   {day}
                </div>
             ))}
          </div>
          
          <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)]">
             {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="border-b border-r border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/20"></div>
             ))}

             {Array.from({ length: daysCount }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                return (
                   <div 
                     key={day} 
                     onClick={() => handleDayClick(day)}
                     className={`border-b border-r border-slate-200 dark:border-slate-700 p-2 relative group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                   >
                      <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                         {day}
                      </span>
                      
                      <div className="mt-2 space-y-1">
                         {dayEvents.map(ev => (
                            <div 
                              key={ev.id}
                              onClick={(e) => handleEventClick(e, ev)}
                              className={`text-xs p-1.5 rounded truncate flex items-center gap-1 shadow-sm transition-all hover:scale-105 ${ev.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 decoration-slate-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'}`}
                            >
                               {ev.status === 'COMPLETED' && <Check size={10} />}
                               {ev.title}
                            </div>
                         ))}
                      </div>
                      
                      <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-500">
                         <Plus size={14} />
                      </button>
                   </div>
                );
             })}
          </div>
       </div>

       {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                   <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                      {editingEvent ? 'Taak Bewerken' : 'Nieuwe Taak Plannen'}
                   </h3>
                   <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                      <X size={24} />
                   </button>
                </div>
                
                <form onSubmit={handleSave} className="p-6 space-y-4">
                   <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4 bg-slate-100 dark:bg-slate-700/50 p-2 rounded">
                      <CalendarIcon size={16} />
                      <span>Datum: {selectedDate?.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Titel / Omschrijving</label>
                      <input 
                         required
                         type="text" 
                         className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                         placeholder="Bijv. Jaarlijks onderhoud"
                         value={formTitle}
                         onChange={e => setFormTitle(e.target.value)}
                      />
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asset Selecteren</label>
                      <select 
                         className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                         value={formMachine}
                         onChange={e => setFormMachine(e.target.value)}
                      >
                         <option value="">-- Selecteer Asset --</option>
                         {machines.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.machineNumber})</option>
                         ))}
                      </select>
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Toewijzen aan</label>
                      <select 
                         className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                         value={formUser}
                         onChange={e => setFormUser(e.target.value)}
                      >
                         <option value="">-- Selecteer Persoon --</option>
                         {users.map(u => (
                            <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                         ))}
                      </select>
                   </div>

                   <div className="pt-4 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700 mt-6">
                      {editingEvent ? (
                         <div className="flex gap-2">
                             <button 
                                type="button" 
                                onClick={handleDelete}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Verwijderen"
                             >
                                <Trash2 size={20} />
                             </button>
                             <button 
                                type="button" 
                                onClick={handleToggleStatus}
                                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${editingEvent.status === 'COMPLETED' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                             >
                                {editingEvent.status === 'COMPLETED' ? <Clock size={16} /> : <CheckCircle size={16} />}
                                {editingEvent.status === 'COMPLETED' ? 'Heropenen' : 'Voltooien'}
                             </button>
                         </div>
                      ) : (
                          <div></div> 
                      )}
                      
                      <div className="flex gap-2">
                         <button 
                            type="button" 
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                         >
                            Annuleren
                         </button>
                         <button 
                            type="submit" 
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
                         >
                            Opslaan
                         </button>
                      </div>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
};
