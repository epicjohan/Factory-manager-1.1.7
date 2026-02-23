
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Machine, AssetType, MaintenanceTicket, Permission, TicketImpact, UserRole } from '../types';
import { db } from '../services/storage';
import { KEYS, generateId } from '../services/db/core';
import { MachineCard } from '../components/MachineCard';
import { useAuth } from '../contexts/AuthContext';
/**
 * Fix: Added CloudCog to the import list from '../icons' to resolve the reference on line 214
 */
import { Search, Filter, AlertTriangle, Clock, ArrowRight, CheckCircle, Plus, X, Siren, Zap, CalendarClock, Info, CloudCog } from '../icons';
import { ManagerDashboard } from './ManagerDashboard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { StatusBadge } from '../components/StatusBadge';
import { useTable } from '../hooks/useTable';

interface DashboardProps {
  typeFilter?: AssetType; 
  title?: string;
  subtitle?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  typeFilter, 
  title = "Fabriek Overzicht", 
  subtitle = "Real-time storingen en meldingen." 
}) => {
  const { user, canAccessAsset, hasPermission } = useAuth();
  const [filter, setFilter] = useState('');

  // Gebruik de reactieve hook voor machines en tickets
  const { data: allMachines } = useTable<Machine>(KEYS.MACHINES);
  const { data: allTickets } = useTable<MaintenanceTicket>(KEYS.TICKETS);

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [qtMachineId, setQtMachineId] = useState('');
  const [qtTitle, setQtTitle] = useState('');
  const [qtDescription, setQtDescription] = useState('');
  const [qtImpact, setQtImpact] = useState<TicketImpact>(TicketImpact.NORMAL);

  const machines = allMachines.filter(m => canAccessAsset(m.id) && !m.isArchived);
  const tickets = allTickets.filter(t => canAccessAsset(t.machineId) && t.status === 'OPEN');

  const handleQuickTicketSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!qtMachineId || !qtTitle || !user) return;

      const ticket: MaintenanceTicket = {
          id: generateId(),
          machineId: qtMachineId,
          title: qtTitle,
          description: qtDescription,
          reportedBy: user.name,
          reportedDate: new Date().toISOString(),
          status: 'OPEN',
          impact: qtImpact,
          actions: [],
          updatedAt: Date.now()
      };
      db.addMaintenanceTicket(ticket);

      if (qtImpact === TicketImpact.CRITICAL) {
          const targetMachine = machines.find(m => m.id === qtMachineId);
          if (targetMachine && targetMachine.status !== 'ERROR') {
              const updatedMachine: Machine = {
                  ...targetMachine,
                  status: 'ERROR',
                  updatedAt: Date.now()
              };
              db.updateMachine(updatedMachine);
          }
      }

      setShowTicketModal(false);
      setQtMachineId(''); setQtTitle(''); setQtDescription(''); setQtImpact(TicketImpact.NORMAL);
  };

  const getImpactBadge = (impact: TicketImpact) => {
      switch(impact) {
          case TicketImpact.CRITICAL:
              return (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 text-xs font-bold uppercase border border-red-200 dark:border-red-800">
                      <Zap size={12} /> Meteen Actie
                  </span>
              );
          case TicketImpact.NORMAL:
              return (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 text-xs font-bold uppercase border border-blue-200 dark:border-blue-800">
                      <CalendarClock size={12} /> Kan Later
                  </span>
              );
          case TicketImpact.LOW:
              return (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xs font-bold uppercase border border-slate-200 dark:border-slate-600">
                      <Info size={12} /> Toekomst
                  </span>
              );
          default: 
            return null;
      }
  };

  if (!typeFilter && user?.role === UserRole.MANAGER) {
      return (
          <ErrorBoundary>
              <ManagerDashboard />
          </ErrorBoundary>
      );
  }

  if (typeFilter) {
    const filteredMachines = machines
      .filter(m => m.type === typeFilter)
      .filter(m => 
        m.name.toLowerCase().includes(filter.toLowerCase()) || 
        m.machineNumber.toLowerCase().includes(filter.toLowerCase())
      )
      .sort((a, b) => a.machineNumber.localeCompare(b.machineNumber, undefined, { numeric: true }));

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
               {title}
               <span className="text-sm px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-full font-normal text-slate-600 dark:text-slate-300">{filteredMachines.length} assets</span>
             </h2>
             <p className="text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Zoek asset..." 
              className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        <ErrorBoundary>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMachines.map(machine => (
                <MachineCard key={machine.id} machine={machine} />
            ))}
            {filteredMachines.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                <Filter size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">Geen items gevonden</p>
                <p className="text-sm">Er zijn geen actieve assets in deze categorie.</p>
                </div>
            )}
            </div>
        </ErrorBoundary>
      </div>
    );
  }

  const getMachineName = (id: string) => allMachines.find(m => m.id === id)?.name || 'Onbekend';
  const getMachineType = (id: string) => allMachines.find(m => m.id === id)?.type || 'CNC';
  const getMachineNumber = (id: string) => allMachines.find(m => m.id === id)?.machineNumber || '';
  const getMachineStatus = (id: string) => allMachines.find(m => m.id === id)?.status || 'OFFLINE';

  return (
    <div className="space-y-8 relative text-left">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
         <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <AlertTriangle className="text-orange-500" />
              Actieve Storingen
            </h2>
            <p className="text-slate-500 dark:text-slate-400">Overzicht van alle openstaande meldingen.</p>
         </div>
         
         {hasPermission(Permission.CREATE_TICKET) && (
             <button 
                onClick={() => setShowTicketModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-500/20 flex items-center gap-2 transition-transform hover:scale-105"
             >
                <Siren size={20} />
                Snel Storing Melden
             </button>
         )}
       </div>

       <ErrorBoundary>
           <div className="grid grid-cols-1 gap-4">
              {tickets.length > 0 ? (
                tickets.map(ticket => {
                  const borderClass = ticket.impact === TicketImpact.CRITICAL ? 'border-red-500' : ticket.impact === TicketImpact.NORMAL ? 'border-blue-400' : 'border-slate-400';

                  return (
                    <div key={ticket.id} className={`bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 ${borderClass} shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between md:items-center gap-4`}>
                       <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                             <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                               {getMachineType(ticket.machineId)}
                             </span>
                             <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                               {getMachineNumber(ticket.machineId)}
                             </span>
                             {getImpactBadge(ticket.impact || TicketImpact.NORMAL)}
                             <StatusBadge status={getMachineStatus(ticket.machineId)} showIcon={false} className="ml-2" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-white">{ticket.title}</h3>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">{ticket.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                             <span className="flex items-center gap-1">
                               <Clock size={14} />
                               {new Date(ticket.reportedDate).toLocaleDateString()} {new Date(ticket.reportedDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                             <span>•</span>
                             <span>Gemeld door: <span className="font-semibold">{ticket.reportedBy}</span></span>
                             {(ticket as any).isPending && (
                                <span className="flex items-center gap-1 text-orange-500 font-black animate-pulse">
                                    <CloudCog size={14} /> SYNCING
                                </span>
                             )}
                          </div>
                       </div>

                       <div className="flex items-center gap-4">
                          <div className="hidden md:block text-right mr-4">
                             <div className="text-lg font-semibold text-slate-800 dark:text-white">{getMachineName(ticket.machineId)}</div>
                             {ticket.actions.length > 0 ? (
                                <div className="text-xs text-green-600 dark:text-green-400">{ticket.actions.length} acties ondernomen</div>
                             ) : (
                                <div className="text-xs text-orange-500 italic">Nog geen acties</div>
                             )}
                          </div>
                          <Link 
                            to={`/machine/${ticket.machineId}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
                            title="Naar Machine"
                          >
                             <ArrowRight size={24} />
                          </Link>
                       </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-green-300 dark:border-green-800">
                   <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
                   <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Alles draait soepel!</h3>
                   <p className="text-slate-500 dark:text-slate-400">Er zijn momenteel geen actieve storingen gemeld voor uw zichtbare machines.</p>
                </div>
              )}
           </div>
       </ErrorBoundary>

       {showTicketModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-6 backdrop-blur-md">
             <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Siren className="text-red-600" />
                        Snel Storing Melden
                    </h3>
                    <button onClick={() => setShowTicketModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={24} />
                    </button>
                 </div>
                 
                 {qtImpact === TicketImpact.CRITICAL && (
                     <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-4 rounded-xl mb-6 text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                        <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                        <div>
                            Let op: Bij <strong>Meteen Actie</strong> wordt de machinestatus direct op <strong>STORING</strong> gezet.
                        </div>
                     </div>
                 )}

                 <form onSubmit={handleQuickTicketSubmit} className="space-y-6">
                     <div>
                         <label className="block text-sm font-bold mb-2 dark:text-slate-300 uppercase text-left">Selecteer Machine</label>
                         <select 
                             required
                             className="w-full p-4 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white outline-none focus:border-red-500"
                             value={qtMachineId}
                             onChange={e => setQtMachineId(e.target.value)}
                         >
                             <option value="">-- Kies Asset --</option>
                             {machines.map(m => (
                                 <option key={m.id} value={m.id}>{m.name} ({m.machineNumber})</option>
                             ))}
                         </select>
                     </div>

                     <div>
                         <label className="block text-sm font-bold mb-2 dark:text-slate-300 uppercase text-left">Titel van storing</label>
                         <input 
                             required
                             type="text" 
                             className="w-full p-4 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-transparent dark:text-white outline-none focus:border-red-500"
                             placeholder="Bijv. Lekkage, Foutmelding 404"
                             value={qtTitle}
                             onChange={e => setQtTitle(e.target.value)}
                         />
                     </div>
                     
                     <div>
                         <label className="block text-sm font-bold mb-2 dark:text-slate-300 uppercase text-left">Omschrijving</label>
                         <textarea 
                             className="w-full p-4 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-transparent dark:text-white outline-none focus:border-red-500"
                             placeholder="Wat is er aan de hand?"
                             rows={3}
                             value={qtDescription}
                             onChange={e => setQtDescription(e.target.value)}
                         />
                     </div>

                     <div>
                        <label className="block text-sm font-bold mb-2 dark:text-slate-300 uppercase text-left">Urgentie & Impact</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button" 
                                onClick={() => setQtImpact(TicketImpact.NORMAL)}
                                className={`p-3 rounded-xl border-2 font-bold transition-all ${qtImpact === TicketImpact.NORMAL ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200' : 'border-slate-200 dark:border-slate-600 text-slate-500'}`}
                            >
                                <div className="flex items-center gap-2 justify-center mb-1"><CalendarClock size={20} /> Normaal</div>
                                <div className="text-[10px] opacity-70">Kan wachten</div>
                            </button>
                            <button
                                type="button" 
                                onClick={() => setQtImpact(TicketImpact.CRITICAL)}
                                className={`p-3 rounded-xl border-2 font-bold transition-all ${qtImpact === TicketImpact.CRITICAL ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-blue-200' : 'border-slate-200 dark:border-slate-600 text-slate-500'}`}
                            >
                                <div className="flex items-center gap-2 justify-center mb-1"><Zap size={20} /> Kritiek</div>
                                <div className="text-[10px] opacity-70">Machine stilstand</div>
                            </button>
                        </div>
                     </div>

                     <button 
                        type="submit" 
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg shadow-red-500/30 transition-transform active:scale-95 text-lg"
                     >
                        Melding Versturen
                     </button>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};
