/**
 * F-04: DMS Admin Dashboard
 * Biedt visueel inzicht in de DMS-opslag:
 * 1. Statistieken (totaal documenten, opslaggrootte, sync-status)
 * 2. Wees-documenten browser met bulk-verwijdering
 * 3. Recent geüploade documenten
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Database, Trash2, RefreshCw, AlertTriangle, CheckCircle,
    FileText, Search, HelpCircle, Archive, Loader2
} from '../../icons';
import { DMSDocument } from '../../types';
import { documentService } from '../../services/db/documentService';
import { useNotifications } from '../../contexts/NotificationContext';
import { useConfirm } from '../../contexts/ConfirmContext';

interface DmsStats {
    totalDocuments: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    orphanedCount: number;
    syncedCount: number;
    unsyncedCount: number;
    typeDistribution: Record<string, number>;
}

export const SettingsDMS: React.FC = () => {
    const { addNotification } = useNotifications();
    const confirm = useConfirm();

    const [stats, setStats] = useState<DmsStats | null>(null);
    const [orphans, setOrphans] = useState<DMSDocument[]>([]);
    const [recentDocs, setRecentDocs] = useState<DMSDocument[]>([]);
    const [selectedOrphans, setSelectedOrphans] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsData, orphanData, allDocs] = await Promise.all([
                documentService.getDocumentStats(),
                documentService.getOrphanedDocuments(),
                documentService.getDocuments()
            ]);
            setStats(statsData);
            setOrphans(orphanData);
            // Recent: top 10 gesorteerd op uploadDate (nieuwste eerst)
            const sorted = [...allDocs].sort((a, b) =>
                new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
            );
            setRecentDocs(sorted.slice(0, 10));
        } catch (e) {
            console.error('DMS stats laden mislukt:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const toggleOrphan = (id: string) => {
        setSelectedOrphans(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAllOrphans = () => {
        if (selectedOrphans.size === orphans.length) {
            setSelectedOrphans(new Set());
        } else {
            setSelectedOrphans(new Set(orphans.map(o => o.id)));
        }
    };

    const handleDeleteOrphans = async () => {
        if (selectedOrphans.size === 0) return;
        const ok = await confirm({
            title: `${selectedOrphans.size} wees-document(en) verwijderen`,
            message: `Weet je zeker dat je ${selectedOrphans.size} ongebruikt(e) document(en) permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`
        });
        if (!ok) return;

        setDeleting(true);
        let count = 0;
        for (const id of selectedOrphans) {
            try {
                await documentService.deleteDocument(id);
                count++;
            } catch (e) {
                console.error(`Fout bij verwijderen document ${id}:`, e);
            }
        }
        setSelectedOrphans(new Set());
        addNotification('SUCCESS', 'Opgeruimd', `${count} wees-document(en) succesvol verwijderd.`);
        await loadData();
        setDeleting(false);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('nl-NL', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch { return iso; }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                <Loader2 size={20} className="animate-spin" /> Laden...
            </div>
        );
    }

    // Type distributie grafiek berekeningen
    const typeEntries = stats ? Object.entries(stats.typeDistribution).sort((a, b) => b[1] - a[1]) : [];
    const maxTypeCount = typeEntries.length > 0 ? typeEntries[0][1] : 1;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

            {/* INFO HEADER */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-6 rounded-[2rem] flex gap-4 shadow-sm items-center">
                <Database className="text-blue-500 shrink-0" size={24} />
                <div>
                    <h4 className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest">DMS Opslag Dashboard</h4>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 leading-relaxed">
                        Overzicht van alle documenten in het Document Management Systeem. Beheer wees-documenten en bekijk opslagstatistieken.
                    </div>
                </div>
                <button
                    onClick={loadData}
                    className="ml-auto p-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-2xl text-blue-500 hover:text-blue-700 hover:border-blue-400 transition-all shrink-0"
                    title="Data verversen"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* STATISTIEKEN KAARTEN */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Totaal Documenten"
                        value={stats.totalDocuments.toString()}
                        icon={<FileText size={20} />}
                        color="bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                    />
                    <StatCard
                        label="Opslagruimte"
                        value={`${stats.totalSizeMB} MB`}
                        icon={<Database size={20} />}
                        color="bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
                    />
                    <StatCard
                        label="Wees-documenten"
                        value={stats.orphanedCount.toString()}
                        icon={<AlertTriangle size={20} />}
                        color={stats.orphanedCount > 0
                            ? "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
                            : "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                        }
                    />
                    <StatCard
                        label="Gesynced"
                        value={`${stats.syncedCount} / ${stats.totalDocuments}`}
                        icon={<CheckCircle size={20} />}
                        color="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                    />
                </div>
            )}

            {/* TYPE DISTRIBUTIE */}
            {typeEntries.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">
                        Type Verdeling
                    </h3>
                    <div className="space-y-3">
                        {typeEntries.map(([ext, count]) => (
                            <div key={ext} className="flex items-center gap-4">
                                <span className="text-xs font-mono font-bold text-slate-500 w-16 text-right uppercase">.{ext}</span>
                                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                        style={{ width: `${Math.max((count / maxTypeCount) * 100, 8)}%` }}
                                    >
                                        <span className="text-[10px] font-black text-white">{count}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* WEES-DOCUMENTEN */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                            Wees-documenten
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 font-bold">
                            Documenten die niet meer gekoppeld zijn aan een artikel of setup.
                        </p>
                    </div>
                    {orphans.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={selectAllOrphans}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all"
                            >
                                {selectedOrphans.size === orphans.length ? 'Deselecteer alles' : 'Selecteer alles'}
                            </button>
                            <button
                                onClick={handleDeleteOrphans}
                                disabled={selectedOrphans.size === 0 || deleting}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                            >
                                <Trash2 size={14} />
                                {deleting ? 'Bezig...' : `Verwijder (${selectedOrphans.size})`}
                            </button>
                        </div>
                    )}
                </div>

                {orphans.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <CheckCircle size={32} className="mx-auto mb-3 text-green-400" />
                        <p className="text-sm font-bold">Geen wees-documenten gevonden.</p>
                        <p className="text-xs mt-1">Alle documenten zijn correct gekoppeld.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {orphans.map(doc => (
                            <div
                                key={doc.id}
                                onClick={() => toggleOrphan(doc.id)}
                                className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${selectedOrphans.has(doc.id)
                                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                                    }`}
                            >
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${selectedOrphans.has(doc.id)
                                    ? 'bg-red-600 border-red-600 text-white'
                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                                    }`}>
                                    {selectedOrphans.has(doc.id) && <CheckCircle size={14} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{doc.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{doc.documentNumber || doc.id.substring(0, 8)}</p>
                                </div>

                                <span className="text-xs font-mono text-slate-400 shrink-0">{formatSize(doc.size || 0)}</span>
                                <span className="text-[10px] text-slate-400 shrink-0">{formatDate(doc.uploadDate)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* RECENT GEÜPLOAD */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">
                    Recent Geüpload
                </h3>
                {recentDocs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm font-medium">
                        Nog geen documenten in het systeem.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentDocs.map(doc => (
                            <div key={doc.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl shrink-0">
                                    <FileText size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{doc.name}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                        <span className="font-mono">{doc.documentNumber}</span>
                                        <span>•</span>
                                        <span>{doc.uploadedBy}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-mono text-slate-400">{formatSize(doc.size || 0)}</p>
                                    <p className="text-[10px] text-slate-400">{formatDate(doc.uploadDate)}</p>
                                </div>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${doc.isSynced ? 'bg-green-400' : 'bg-orange-400'}`} title={doc.isSynced ? 'Gesynced' : 'Niet gesynced'} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Sub-component: Statistiek Kaart ---
const StatCard = ({ label, value, icon, color }: {
    label: string; value: string; icon: React.ReactNode; color: string;
}) => (
    <div className={`p-6 rounded-[2rem] border ${color} flex flex-col items-center text-center shadow-sm`}>
        <div className="mb-3 opacity-80">{icon}</div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">{label}</p>
    </div>
);
