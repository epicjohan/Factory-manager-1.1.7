
import React, { useState, useMemo } from 'react';
import { MaintenanceTicket, Machine, TicketImpact } from '../types';
import { AlertTriangle, Search, Filter, ArrowRight, CheckCircle, Clock, Zap, ChevronDown, X, Edit2 } from '../icons';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';
import { TicketEditModal } from '../components/tickets/TicketEditModal';

const IMPACT_CONFIG: Record<TicketImpact, { label: string; color: string; bgColor: string; darkBg: string; borderColor: string; darkBorder: string; icon: any }> = {
    [TicketImpact.CRITICAL]: {
        label: 'Kritiek',
        color: 'text-red-700 dark:text-red-300',
        bgColor: 'bg-red-50',
        darkBg: 'dark:bg-red-950/30',
        borderColor: 'border-red-200',
        darkBorder: 'dark:border-red-900/50',
        icon: Zap
    },
    [TicketImpact.NORMAL]: {
        label: 'Normaal',
        color: 'text-orange-700 dark:text-orange-300',
        bgColor: 'bg-orange-50',
        darkBg: 'dark:bg-orange-950/30',
        borderColor: 'border-orange-200',
        darkBorder: 'dark:border-orange-900/50',
        icon: AlertTriangle
    },
    [TicketImpact.LOW]: {
        label: 'Laag',
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-50',
        darkBg: 'dark:bg-blue-950/30',
        borderColor: 'border-blue-200',
        darkBorder: 'dark:border-blue-900/50',
        icon: Clock
    }
};

export const TicketDashboard: React.FC = () => {
    const { data: tickets } = useTable<MaintenanceTicket>(KEYS.TICKETS);
    const { data: machines } = useTable<Machine>(KEYS.MACHINES);

    // Filters
    const [filterAsset, setFilterAsset] = useState<string>('ALL');
    const [filterImpact, setFilterImpact] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

    // Only open tickets
    const openTickets = useMemo(() => tickets.filter(t => t.status === 'OPEN'), [tickets]);

    // Apply filters
    const filteredTickets = useMemo(() => {
        return openTickets.filter(t => {
            if (filterAsset !== 'ALL' && t.machineId !== filterAsset) return false;
            if (filterImpact !== 'ALL' && t.impact !== filterImpact) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const machineName = machines.find(m => m.id === t.machineId)?.name?.toLowerCase() || '';
                if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q) && !machineName.includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }, [openTickets, filterAsset, filterImpact, searchQuery, machines]);

    // Sort: Critical first, then by date (newest first)
    const sortedTickets = useMemo(() => {
        const impactOrder: Record<string, number> = { [TicketImpact.CRITICAL]: 0, [TicketImpact.NORMAL]: 1, [TicketImpact.LOW]: 2 };
        return [...filteredTickets].sort((a, b) => {
            const impactDiff = (impactOrder[a.impact] ?? 2) - (impactOrder[b.impact] ?? 2);
            if (impactDiff !== 0) return impactDiff;
            return new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime();
        });
    }, [filteredTickets]);

    // Stats for header
    const criticalCount = openTickets.filter(t => t.impact === TicketImpact.CRITICAL).length;
    const normalCount = openTickets.filter(t => t.impact === TicketImpact.NORMAL).length;
    const lowCount = openTickets.filter(t => t.impact === TicketImpact.LOW).length;

    // Unique machines with open tickets for filter dropdown
    const assetsWithTickets = useMemo(() => {
        const ids = [...new Set(openTickets.map(t => t.machineId))];
        return ids.map(id => machines.find(m => m.id === id)).filter(Boolean) as Machine[];
    }, [openTickets, machines]);

    const hasActiveFilters = filterAsset !== 'ALL' || filterImpact !== 'ALL' || searchQuery.trim() !== '';

    const clearFilters = () => {
        setFilterAsset('ALL');
        setFilterImpact('ALL');
        setSearchQuery('');
    };

    const daysSince = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Vandaag';
        if (days === 1) return 'Gisteren';
        return `${days} dagen geleden`;
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 uppercase italic tracking-tighter">
                        <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-600 dark:text-red-400">
                            <AlertTriangle size={28} />
                        </div>
                        Openstaande Storingen
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 tracking-wide">
                        Overzicht van alle actieve meldingen en storingen.
                    </p>
                </div>

                {/* KPI pills */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                        <span className="text-2xl font-black text-slate-800 dark:text-white">{openTickets.length}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totaal</span>
                    </div>
                    {criticalCount > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl shadow-sm">
                            <Zap size={16} className="text-red-500" />
                            <span className="text-2xl font-black text-red-700 dark:text-red-300">{criticalCount}</span>
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Kritiek</span>
                        </div>
                    )}
                    {normalCount > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-2xl shadow-sm">
                            <span className="text-lg font-black text-orange-700 dark:text-orange-300">{normalCount}</span>
                            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Normaal</span>
                        </div>
                    )}
                    {lowCount > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl shadow-sm">
                            <span className="text-lg font-black text-blue-700 dark:text-blue-300">{lowCount}</span>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Laag</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-0">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Zoek op titel, omschrijving of machine..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* Asset Filter */}
                    <div className="relative">
                        <select
                            value={filterAsset}
                            onChange={e => setFilterAsset(e.target.value)}
                            className="appearance-none w-full md:w-auto pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 cursor-pointer hover:border-blue-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <option value="ALL">Alle Assets</option>
                            {assetsWithTickets.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Impact Filter */}
                    <div className="relative">
                        <select
                            value={filterImpact}
                            onChange={e => setFilterImpact(e.target.value)}
                            className="appearance-none w-full md:w-auto pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 cursor-pointer hover:border-blue-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <option value="ALL">Alle Impact</option>
                            <option value={TicketImpact.CRITICAL}>🔴 Kritiek</option>
                            <option value={TicketImpact.NORMAL}>🟠 Normaal</option>
                            <option value={TicketImpact.LOW}>🔵 Laag</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 rounded-2xl transition-colors shrink-0"
                        >
                            <X size={14} /> Wis Filters
                        </button>
                    )}
                </div>

                {/* Active filter summary */}
                {hasActiveFilters && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Filter size={12} />
                        <span>{filteredTickets.length} van {openTickets.length} meldingen</span>
                    </div>
                )}
            </div>

            {/* Ticket Grid */}
            {sortedTickets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sortedTickets.map(ticket => {
                        const machine = machines.find(m => m.id === ticket.machineId);
                        const config = IMPACT_CONFIG[ticket.impact as TicketImpact] || IMPACT_CONFIG[TicketImpact.NORMAL];
                        const ImpactIcon = config.icon;

                        return (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicketId(ticket.id)}
                                className={`group block p-6 rounded-[2rem] border-2 transition-all hover:shadow-xl hover:-translate-y-0.5 cursor-pointer ${config.bgColor} ${config.darkBg} ${config.borderColor} ${config.darkBorder}`}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`p-1.5 rounded-xl ${ticket.impact === TicketImpact.CRITICAL ? 'bg-red-200 dark:bg-red-900/50' : ticket.impact === TicketImpact.NORMAL ? 'bg-orange-200 dark:bg-orange-900/50' : 'bg-blue-200 dark:bg-blue-900/50'}`}>
                                            <ImpactIcon size={16} className={config.color} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>
                                            {config.label}
                                        </span>
                                        {ticket.ticketNumber && (
                                            <span className="text-[10px] font-mono text-slate-400 bg-white/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-lg">
                                                #{ticket.ticketNumber}
                                            </span>
                                        )}
                                    </div>
                                    <Edit2 size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-all shrink-0" />
                                </div>

                                {/* Title */}
                                <h4 className="font-black text-slate-800 dark:text-white text-sm leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                    {ticket.title}
                                </h4>

                                {/* Description */}
                                {ticket.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                                        {ticket.description}
                                    </p>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                                    <div className="flex items-center gap-2">
                                        {machine && (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                                                {machine.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span className="flex items-center gap-1">
                                            <Clock size={10} />
                                            {daysSince(ticket.reportedDate)}
                                        </span>
                                    </div>
                                </div>

                                {/* Reporter */}
                                <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wider">
                                    Gemeld door: {ticket.reportedBy}
                                </div>

                                {/* Actions count */}
                                {ticket.actions && ticket.actions.length > 0 && (
                                    <div className="mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        <CheckCircle size={10} />
                                        {ticket.actions.length} actie{ticket.actions.length !== 1 ? 's' : ''} gelogd
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-16 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full mb-6">
                        <CheckCircle size={36} className="text-green-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">
                        {hasActiveFilters ? 'Geen resultaten' : 'Alles in orde'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold max-w-md mx-auto">
                        {hasActiveFilters 
                            ? 'Er zijn geen storingen gevonden die overeenkomen met de huidige filters.'
                            : 'Er zijn momenteel geen openstaande storingen of meldingen.'}
                    </p>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="mt-6 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 rounded-2xl transition-colors"
                        >
                            Filters wissen
                        </button>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            {selectedTicketId && (() => {
                const ticket = tickets.find(t => t.id === selectedTicketId);
                if (!ticket) return null;
                const machine = machines.find(m => m.id === ticket.machineId) || null;
                return (
                    <TicketEditModal
                        ticket={ticket}
                        machine={machine}
                        onClose={() => setSelectedTicketId(null)}
                        onSaved={() => setSelectedTicketId(null)}
                    />
                );
            })()}
        </div>
    );
};
