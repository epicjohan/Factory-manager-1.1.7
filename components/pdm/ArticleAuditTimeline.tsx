import React, { useState, useMemo } from 'react';
import { ArticleAuditEntry } from '../../types';
import { Clock, User, ChevronDown, ChevronRight, Search, Filter, X } from '../../icons';

interface Props {
    auditTrail?: ArticleAuditEntry[];
}

export const ArticleAuditTimeline: React.FC<Props> = ({ auditTrail }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<string>('ALL');
    const [selectedType, setSelectedType] = useState<string>('ALL'); // Action Type

    // Extract unique users
    const uniqueUsers = useMemo(() => {
        if (!auditTrail) return [];
        return Array.from(new Set(auditTrail.map(e => e.user))).sort();
    }, [auditTrail]);

    // Categorize actions
    const categorizeAction = (action: string) => {
        const lower = action.toLowerCase();
        if (lower.includes('bestanden') || lower.includes('document')) return 'Bestanden';
        if (lower.includes('gereedschap')) return 'Gereedschappen';
        if (lower.includes('opslaan') || lower.includes('stamgegevens')) return 'Stamgegevens';
        if (lower.includes('status')) return 'Statussen';
        if (lower.includes('bewerking') || lower.includes('setup')) return 'Setups';
        if (lower.includes('revisie')) return 'Revisies';
        return 'Overig';
    };

    const actionTypes = ['Bestanden', 'Gereedschappen', 'Stamgegevens', 'Statussen', 'Setups', 'Revisies', 'Overig'];

    const filteredTrail = useMemo(() => {
        if (!auditTrail) return [];

        let filtered = auditTrail;

        if (selectedUser !== 'ALL') {
            filtered = filtered.filter(e => e.user === selectedUser);
        }

        if (selectedType !== 'ALL') {
            filtered = filtered.filter(e => categorizeAction(e.action) === selectedType);
        }

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(entry =>
                entry.action.toLowerCase().includes(lowerSearch) ||
                entry.user.toLowerCase().includes(lowerSearch)
            );
        }

        return filtered;
    }, [auditTrail, searchTerm, selectedUser, selectedType]);

    const hasActiveFilters = searchTerm !== '' || selectedUser !== 'ALL' || selectedType !== 'ALL';

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedUser('ALL');
        setSelectedType('ALL');
    };

    if (!auditTrail || auditTrail.length === 0) {
        return (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center min-h-[150px]">
                <Clock size={32} className="text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Geen geschiedenis gevonden</p>
                <p className="text-[10px] text-slate-400 mt-1">Wijzigingen aan dit artikel of onderliggende setups worden hier bijgehouden.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    <Clock size={16} /> Audit Trail & Geschiedenis
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[9px]">
                        {auditTrail.length} {auditTrail.length === 1 ? 'wijziging' : 'wijzigingen'}
                    </span>
                </div>
                <div className="text-slate-400">
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
            </button>

            {isOpen && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Zoek op actie of gebruiker..."
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <select
                                value={selectedType}
                                onChange={e => setSelectedType(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-sm text-slate-700 dark:text-slate-300 outline-none flex-1 sm:w-36"
                            >
                                <option value="ALL">Alle Types</option>
                                {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>

                            {uniqueUsers.length > 1 && (
                                <select
                                    value={selectedUser}
                                    onChange={e => setSelectedUser(e.target.value)}
                                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-sm text-slate-700 dark:text-slate-300 outline-none flex-1 sm:w-32"
                                >
                                    <option value="ALL">Alle Gebruikers</option>
                                    {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            )}

                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="p-2 aspect-square flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                                    title="Filters wissen"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {filteredTrail.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <Filter size={24} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                            <p className="text-sm font-bold text-slate-500">Geen resultaten gevonden</p>
                            <p className="text-xs text-slate-400 mt-1">Pas je zoekopdracht of filters aan om de historie te zien.</p>
                            {hasActiveFilters && (
                                <button onClick={clearFilters} className="mt-4 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">Filters wissen</button>
                            )}
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-6 pb-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {filteredTrail.map((entry, idx) => (
                                <div key={entry.id || idx} className="relative pl-6">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-full"></div>

                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-sm font-bold text-slate-800 dark:text-white leading-snug">
                                                {entry.action}
                                            </div>
                                            <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                                                <div className="text-[10px] font-mono text-slate-400 whitespace-nowrap bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                                                    {new Date(entry.timestamp).toLocaleString('nl-NL', {
                                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                    })}
                                                </div>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">
                                                    {categorizeAction(entry.action)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <User size={12} className="text-slate-400" />
                                            <span>{entry.user}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
