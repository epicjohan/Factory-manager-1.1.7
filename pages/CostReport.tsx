
import React, { useState, useMemo } from 'react';
import { MaintenanceTicket, Machine, AssetType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Euro, Clock, FileText, BarChart2, Filter, Download, Calendar } from '../icons';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';

export const CostReport: React.FC = () => {
  const navigate = useNavigate();
  const { canAccessAsset } = useAuth();
  
  // REACTIVE HOOKS
  const { data: allTickets } = useTable<MaintenanceTicket>(KEYS.TICKETS);
  const { data: allMachines } = useTable<Machine>(KEYS.MACHINES);

  // Derived State based on permissions
  const machines = useMemo(() => allMachines.filter(m => canAccessAsset(m.id)), [allMachines, canAccessAsset]);
  const tickets = useMemo(() => allTickets.filter(t => canAccessAsset(t.machineId)), [allTickets, canAccessAsset]);
  
  // Filter States
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // Jan 1st current year
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today
  
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetType | 'ALL'>('ALL');
  const [machineIdFilter, setMachineIdFilter] = useState<string>('ALL');

  const filteredTickets = useMemo(() => {
      if (!startDate || !endDate) return tickets;

      const start = new Date(startDate).setHours(0,0,0,0);
      const end = new Date(endDate).setHours(23,59,59,999);

      return tickets.filter(t => {
          // Status check
          if (t.status !== 'RESOLVED' || !t.resolvedDate) return false;
          
          // Machine check (must exist to filter by type)
          const machine = machines.find(m => m.id === t.machineId);
          if (!machine) return false;

          // Asset Type Filter
          if (assetTypeFilter !== 'ALL' && machine.type !== assetTypeFilter) return false;

          // Specific Machine Filter
          if (machineIdFilter !== 'ALL' && t.machineId !== machineIdFilter) return false;

          // Date Filter
          const ticketDate = new Date(t.resolvedDate).getTime();
          return ticketDate >= start && ticketDate <= end;
      });
  }, [tickets, machines, startDate, endDate, assetTypeFilter, machineIdFilter]);

  // Export Function
  const handleExport = () => {
    const headers = ['Datum', 'Machine Naam', 'Machine Nummer', 'Type', 'Titel Storing', 'Opgelost Door', 'Stilstand (Uren)', 'Kosten (EUR)'];
    const rows = filteredTickets.map(t => {
        const m = machines.find(mac => mac.id === t.machineId);
        return [
            t.resolvedDate ? new Date(t.resolvedDate).toLocaleDateString() : '',
            `"${m?.name || 'Onbekend'}"`, 
            `"${m?.machineNumber || ''}"`,
            m?.type || '',
            `"${t.title.replace(/"/g, '""')}"`, 
            `"${t.resolvedCompany || ''}"`,
            t.downtimeMinutes ? (t.downtimeMinutes / 60).toFixed(2).replace('.', ',') : '0',
            t.repairCost ? t.repairCost.toFixed(2).replace('.', ',') : '0'
        ].join(';'); 
    });

    const csvContent = '\ufeff' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Financieel_Rapport_${startDate}_tot_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPIs
  const totalCost = filteredTickets.reduce((acc, t) => acc + (t.repairCost || 0), 0);
  const totalDowntime = filteredTickets.reduce((acc, t) => acc + (t.downtimeMinutes || 0), 0);
  const avgCost = filteredTickets.length > 0 ? totalCost / filteredTickets.length : 0;

  // Chart Data: Costs per Machine (based on current filter)
  const costPerMachine = useMemo(() => {
      return machines
          .filter(m => {
              if (assetTypeFilter !== 'ALL' && m.type !== assetTypeFilter) return false;
              if (machineIdFilter !== 'ALL' && m.id !== machineIdFilter) return false;
              return true;
          })
          .map(m => {
              const machineTickets = filteredTickets.filter(t => t.machineId === m.id);
              const cost = machineTickets.reduce((acc, t) => acc + (t.repairCost || 0), 0);
              return { name: m.name, code: m.machineNumber, cost: cost };
          })
          .filter(d => d.cost > 0)
          .sort((a,b) => b.cost - a.cost);
  }, [machines, filteredTickets, assetTypeFilter, machineIdFilter]);

  // Available machines for dropdown
  const filteredMachinesDropdown = machines.filter(m => 
      assetTypeFilter === 'ALL' ? true : m.type === assetTypeFilter
  );

  return (
    <div className="space-y-8 pb-10">
        <div>
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-4 transition-colors">
            <ArrowLeft size={18} />
            <span>Terug naar Admin</span>
            </button>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <BarChart2 className="text-emerald-500" />
                        Financieel Rapportage
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">Inzicht in reparatiekosten en stilstand.</p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-2xl shadow-sm transition-colors"
                        title="Download huidige selectie als CSV"
                    >
                        <Download size={16} />
                        Export naar CSV
                    </button>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm self-start">
                        <div className="flex items-center gap-2 px-2 hidden md:flex">
                            <Calendar size={16} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase">Periode</span>
                        </div>
                        <input 
                            type="date"
                            className="bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm px-2 py-1 rounded border border-slate-300 dark:border-slate-600 outline-none focus:ring-1 focus:ring-emerald-500"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-slate-400">-</span>
                        <input 
                            type="date"
                            className="bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm px-2 py-1 rounded border border-slate-300 dark:border-slate-600 outline-none focus:ring-1 focus:ring-emerald-500"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Asset Filters */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                <Filter size={16} /> Filters:
            </div>
            
            <select 
                value={assetTypeFilter}
                onChange={(e) => {
                    setAssetTypeFilter(e.target.value as AssetType | 'ALL');
                    setMachineIdFilter('ALL'); 
                }}
                className="px-3 py-2 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
                <option value="ALL">Alle Asset Types</option>
                <option value="CNC">CNC Machines</option>
                <option value="ROBOT">Robots</option>
                <option value="CMM">CMM (Meetkamer)</option>
                <option value="CLIMATE">Klimaatbeheersing</option>
            </select>

            <select 
                value={machineIdFilter}
                onChange={(e) => setMachineIdFilter(e.target.value)}
                className="px-3 py-2 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
                <option value="ALL">Alle Machines</option>
                {filteredMachinesDropdown.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.machineNumber})</option>
                ))}
            </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
                        <Euro size={24} />
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Totale Kosten</span>
                </div>
                <div className="text-3xl font-bold text-slate-800 dark:text-white">€ {totalCost.toFixed(2)}</div>
                <div className="text-xs text-slate-400 mt-1">Gefilterde periode & selectie</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
                        <Clock size={24} />
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Totale Stilstand</span>
                </div>
                <div className="text-3xl font-bold text-slate-800 dark:text-white">{(totalDowntime / 60).toFixed(1)} <span className="text-lg font-normal text-slate-500">uur</span></div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600 dark:text-purple-400">
                        <FileText size={24} />
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Gem. Kosten / Storing</span>
                </div>
                <div className="text-3xl font-bold text-slate-800 dark:text-white">€ {avgCost.toFixed(2)}</div>
            </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-white">Kostenverdeling</h3>
            <div className="h-80 w-full">
                {costPerMachine.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={costPerMachine}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                            <XAxis dataKey="code" stroke="#94a3b8" tick={{fontSize: 12}} />
                            <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                itemStyle={{ color: '#10b981' }}
                                formatter={(value: number) => [`€ ${value.toFixed(2)}`, 'Kosten']}
                            />
                            <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                                {costPerMachine.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#34d399'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        Geen kostendata beschikbaar voor deze selectie.
                    </div>
                )}
            </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Factuur & Kosten detail</h3>
                    <button onClick={handleExport} className="text-xs text-blue-500 hover:text-blue-600 font-medium">
                        Download Tabel
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 uppercase">
                        <tr>
                            <th className="px-6 py-3">Datum</th>
                            <th className="px-6 py-3">Asset</th>
                            <th className="px-6 py-3">Omschrijving</th>
                            <th className="px-6 py-3">Bedrijf</th>
                            <th className="px-6 py-3 text-right">Stilstand</th>
                            <th className="px-6 py-3 text-right">Kosten</th>
                            <th className="px-6 py-3 text-center">Factuur</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredTickets.map(t => {
                            const m = machines.find(mac => mac.id === t.machineId);
                            return (
                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">
                                        {new Date(t.resolvedDate!).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800 dark:text-white">{m?.name}</div>
                                        <div className="text-xs text-slate-500">{m?.machineNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                        {t.title}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {t.resolvedCompany || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-300">
                                        {t.downtimeMinutes ? `${(t.downtimeMinutes / 60).toFixed(1)}u` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-800 dark:text-white">
                                        {t.repairCost ? `€ ${t.repairCost.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {t.invoice ? (
                                            <a 
                                                href={t.invoice.url} 
                                                download={t.invoice.name}
                                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                <FileText size={14} />
                                                <span className="text-xs">PDF</span>
                                            </a>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredTickets.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                    Geen data gevonden.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
