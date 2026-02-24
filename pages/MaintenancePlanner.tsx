
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
         <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
            <div>
               <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-tighter italic">
                  <CalendarIcon size={28} className="text-blue-500" />
                  Onderhoudsplanner
               </h2>
               <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-1">Beheer gepland onderhoud en taken</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner">
               <button onClick={() => changeMonth(-1)} className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-all shadow-sm">
                  <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
               </button>
               <div className="font-black uppercase tracking-widest text-sm min-w-[160px] text-center text-slate-800 dark:text-white px-4">
                  {monthNames[month]} {year}
               </div>
               <button onClick={() => changeMonth(1)} className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-all shadow-sm">
                  <ChevronRight size={20} className="text-slate-600 dark:text-slate-300" />
               </button>
            </div>
         </div>

         <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
               {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
                  <div key={day} className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
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
                        className={`border-b border-r border-slate-100 dark:border-slate-700/50 p-2 md:p-3 relative group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer min-h-[140px] flex flex-col ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                     >
                        <div className="flex justify-between items-start mb-2">
                           <span className={`text-xs font-black uppercase tracking-widest w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                              {day}
                           </span>
                        </div>

                        <div className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
                           {dayEvents.map(ev => (
                              <div
                                 key={ev.id}
                                 onClick={(e) => handleEventClick(e, ev)}
                                 className={`text-xs px-2 py-1.5 rounded-[2rem] truncate flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] border ${ev.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50 decoration-slate-400' : 'bg-white text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'}`}
                              >
                                 <div className={`shrink-0 w-2 h-2 rounded-full ${ev.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                                 <span className="font-bold truncate">{ev.title}</span>
                              </div>
                           ))}
                        </div>

                        <button className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-500 rounded-full text-slate-400 shadow-sm transition-all hover:scale-110">
                           <Plus size={14} />
                        </button>
                     </div>
                  );
               })}
            </div>
         </div>

         {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-slate-200 dark:border-slate-700">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                     <h3 className="text-xl font-black uppercase tracking-tighter italic text-slate-800 dark:text-white">
                        {editingEvent ? 'Taak Bewerken' : 'Nieuwe Taak Plannen'}
                     </h3>
                     <button type="button" onClick={(e) => { e.stopPropagation(); setShowModal(false); }} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all hover:scale-110 shadow-sm">
                        <X size={16} />
                     </button>
                  </div>

                  <form onSubmit={handleSave} className="p-6 space-y-5">
                     <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-2xl border border-blue-100 dark:border-blue-800">
                        <CalendarIcon size={16} />
                        <span>{selectedDate?.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                     </div>

                     <div className="space-y-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Titel / Omschrijving</label>
                        <input
                           required
                           type="text"
                           className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-bold text-sm"
                           placeholder="Bijv. Jaarlijks onderhoud"
                           value={formTitle}
                           onChange={e => setFormTitle(e.target.value)}
                        />
                     </div>

                     <div className="space-y-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Asset Selecteren</label>
                        <select
                           className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-sm"
                           value={formMachine}
                           onChange={e => setFormMachine(e.target.value)}
                           required
                        >
                           <option value="">-- Selecteer Asset --</option>
                           {machines.map(m => (
                              <option key={m.id} value={m.id}>{m.name} ({m.machineNumber})</option>
                           ))}
                        </select>
                     </div>

                     <div className="space-y-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Toewijzen aan</label>
                        <select
                           className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-sm"
                           value={formUser}
                           onChange={e => setFormUser(e.target.value)}
                           required
                        >
                           <option value="">-- Selecteer Persoon --</option>
                           {users.map(u => (
                              <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                           ))}
                        </select>
                     </div>

                     <div className="pt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-8">
                        {editingEvent ? (
                           <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                 type="button"
                                 onClick={handleDelete}
                                 className="p-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-2xl transition-all shadow-sm flex-1 sm:flex-none flex justify-center items-center"
                                 title="Verwijderen"
                              >
                                 <Trash2 size={20} />
                              </button>
                              <button
                                 type="button"
                                 onClick={handleToggleStatus}
                                 className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm flex-1 sm:flex-none ${editingEvent.status === 'COMPLETED' ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'}`}
                              >
                                 {editingEvent.status === 'COMPLETED' ? <Clock size={16} /> : <CheckCircle size={16} />}
                                 {editingEvent.status === 'COMPLETED' ? 'Heropenen' : 'Voltooien'}
                              </button>
                           </div>
                        ) : (
                           <div className="hidden sm:block"></div>
                        )}

                        <div className="flex gap-2 w-full sm:w-auto">
                           <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setShowModal(false); }}
                              className="flex-1 sm:flex-none px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl transition-colors text-center shadow-sm border border-slate-200 dark:border-slate-700"
                           >
                              Annuleren
                           </button>
                           <button
                              type="submit"
                              className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all font-black uppercase tracking-widest text-xs text-center border-b-2 border-blue-700 active:translate-y-px active:border-b-0"
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
