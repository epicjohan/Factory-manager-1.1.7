import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Plus, Folder as FolderIcon, Calendar, CheckCircle, Clock, StickyNote, CheckSquare, FileText as FileTextIcon } from '../icons';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';
import { QmsFramework, QmsFolder, QmsAudit } from '../types';
import { NewFolderModal } from '../components/qms/NewFolderModal';
import { NewAuditModal } from '../components/qms/NewAuditModal';
import { EditAuditModal } from '../components/qms/EditAuditModal';
import { FolderDocumentList } from '../components/qms/FolderDocumentList';
import { FolderNotes } from '../components/qms/FolderNotes';
import { FolderTodos } from '../components/qms/FolderTodos';

export const ComplianceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: frameworks } = useTable<QmsFramework>(KEYS.QMS_FRAMEWORKS);
    const { data: folders } = useTable<QmsFolder>(KEYS.QMS_FOLDERS);
    const { data: audits } = useTable<QmsAudit>(KEYS.QMS_AUDITS);

    const [showFolderModal, setShowFolderModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [editingAudit, setEditingAudit] = useState<QmsAudit | null>(null);

    const framework = frameworks.find(f => f.id === id);
    const fwFolders = folders.filter(f => f.frameworkId === id).sort((a,b) => b.year - a.year);
    const fwAudits = audits.filter(a => a.frameworkId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Groepeer mappen per jaar
    const foldersByYear = fwFolders.reduce((acc, folder) => {
        if (!acc[folder.year]) acc[folder.year] = [];
        acc[folder.year].push(folder);
        return acc;
    }, {} as Record<number, QmsFolder[]>);

    const [expandedYear, setExpandedYear] = useState<number | null>(
        Object.keys(foldersByYear).length > 0 ? Math.max(...Object.keys(foldersByYear).map(Number)) : null
    );
    const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
    const [folderActiveTab, setFolderActiveTab] = useState<Record<string, 'docs' | 'notes' | 'todos'>>({});

    if (!framework) {
        return (
            <div className="max-w-6xl mx-auto pb-20 p-8 text-center text-slate-500">
                Laden of dossier niet gevonden...
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-8 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform duration-700 hover:scale-110 hover:rotate-6 origin-bottom-right">
                    <BookOpen size={240} />
                </div>
                <div className="relative z-10 min-w-0">
                    <button onClick={() => navigate('/compliance')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-4 font-bold text-sm uppercase tracking-widest transition-colors w-fit">
                        <ArrowLeft size={16} /> Terug naar Overzicht
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border 
                            ${framework.type === 'ISO_NORM' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800'}`}>
                            {framework.type === 'ISO_NORM' ? 'ISO Normering' : 'Klant Audit'}
                        </span>
                        {framework.certifier && (
                            <span className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                                {framework.certifier}
                            </span>
                        )}
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 uppercase italic tracking-tighter">
                        {framework.name}
                    </h2>
                    {framework.description && (
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-xl">
                            {framework.description}
                        </p>
                    )}
                </div>
                
                <div className="relative z-10 flex gap-3">
                    <button 
                        onClick={() => setShowFolderModal(true)}
                        className="flex items-center gap-3 px-6 py-4 bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-transform active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={20} /> Dossier (Map)
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Linker kolom: Jaren en Mappen */}
                <div className="lg:col-span-2 space-y-6">
                    {Object.keys(foldersByYear).length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] bg-slate-50 dark:bg-slate-800/30 text-center px-6">
                            <FolderIcon size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Geen dossiers gevonden</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-md">Kies "Dossier Maken" om de mappenstructuur te starten voor deze normering, gegroepeerd per jaar.</p>
                        </div>
                    ) : (
                        Object.keys(foldersByYear)
                            .map(Number)
                            .sort((a,b) => b - a)
                            .map(year => (
                            <div key={year} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                <button 
                                    onClick={() => setExpandedYear(expandedYear === year ? null : year)}
                                    className="w-full flex items-center justify-between text-left group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Calendar size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter">Jaar {year}</h3>
                                            <p className="text-slate-500 text-sm font-bold tracking-widest uppercase">{foldersByYear[year].length} Documenten Mappen</p>
                                        </div>
                                    </div>
                                    <div className="text-blue-500 p-2 bg-blue-50 transition-transform dark:bg-blue-900/30 rounded-full" style={{ transform: expandedYear === year ? 'rotate(180deg)' : 'rotate(0)' }}>
                                        <ArrowLeft size={20} className="-rotate-90" />
                                    </div>
                                </button>
                                
                                {expandedYear === year && (
                                    <div className="mt-8 grid grid-cols-1 gap-4 animate-in slide-in-from-top-4 duration-300 border-t border-slate-100 dark:border-slate-700 pt-6">
                                        {foldersByYear[year].map((folder: QmsFolder) => (
                                            <div 
                                                key={folder.id} 
                                                className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors"
                                            >
                                                <div 
                                                    onClick={() => setExpandedFolderId(expandedFolderId === folder.id ? null : folder.id)}
                                                    className="group p-5 cursor-pointer flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <FolderIcon size={32} className="text-blue-400 group-hover:text-blue-600 dark:text-slate-600 dark:group-hover:text-blue-400 transition-colors" />
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-slate-800 dark:text-white truncate">{folder.name}</h4>
                                                            <p className="text-xs text-slate-500 font-medium">{(folder.documents || []).length} document{(folder.documents || []).length !== 1 ? 'en' : ''}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-slate-400 p-2 transition-transform" style={{ transform: expandedFolderId === folder.id ? 'rotate(180deg)' : 'rotate(0)' }}>
                                                        <ArrowLeft size={16} className="-rotate-90" />
                                                    </div>
                                                </div>
                                                {expandedFolderId === folder.id && (
                                                    <div className="border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4 duration-300">
                                                        {/* Tab Bar */}
                                                        <div className="flex bg-slate-50 dark:bg-slate-900/50">
                                                            {([
                                                                { key: 'docs', label: 'Documenten', Icon: FileTextIcon, count: (folder.documents || []).length },
                                                                { key: 'notes', label: 'Notities', Icon: StickyNote, count: (folder.notes || []).length },
                                                                { key: 'todos', label: 'Actiepunten', Icon: CheckSquare, count: (folder.todos || []).filter(t => !t.done).length },
                                                            ] as const).map(({ key, label, Icon, count }) => {
                                                                const active = (folderActiveTab[folder.id] || 'docs') === key;
                                                                return (
                                                                    <button
                                                                        key={key}
                                                                        onClick={() => setFolderActiveTab(prev => ({ ...prev, [folder.id]: key }))}
                                                                        className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                                                                            active
                                                                                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800'
                                                                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                                        }`}
                                                                    >
                                                                        <Icon size={13} />
                                                                        {label}
                                                                        {count > 0 && (
                                                                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                                                                active ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                                            }`}>{count}</span>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        {/* Tab Panels */}
                                                        <div className="p-4 bg-white dark:bg-slate-800/50">
                                                            {(folderActiveTab[folder.id] || 'docs') === 'docs' && <FolderDocumentList folder={folder} />}
                                                            {folderActiveTab[folder.id] === 'notes' && <FolderNotes folder={folder} />}
                                                            {folderActiveTab[folder.id] === 'todos' && <FolderTodos folder={folder} />}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Rechter kolom: Audit Tabel */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-base font-black text-slate-800 dark:text-white uppercase italic tracking-tighter flex items-center gap-2">
                                <CheckCircle className="text-emerald-500" size={20} /> Audit Historie
                                <span className="text-xs font-bold text-slate-400 normal-case tracking-normal not-italic">({fwAudits.length})</span>
                            </h3>
                            <button
                                onClick={() => setShowAuditModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-500/20 transition-all"
                            >
                                <Plus size={14} /> Nieuwe Audit
                            </button>
                        </div>

                        {fwAudits.length === 0 ? (
                            <div className="py-12 text-center">
                                <CheckCircle className="mx-auto mb-3 text-slate-200 dark:text-slate-700" size={32} />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nog geen audits</p>
                                <p className="text-xs text-slate-400 mt-1">Klik op "Nieuwe Audit" om te beginnen</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {fwAudits.map(audit => {
                                    const RESULT_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
                                        PASSED:   { label: 'Geslaagd',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500' },
                                        PLANNED:  { label: 'Gepland',   cls: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', dot: 'bg-blue-400' },
                                        WARNINGS: { label: 'Minor NC',  cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500' },
                                        FAILED:   { label: 'Afgekeurd', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', dot: 'bg-red-500' },
                                    };
                                    const TYPE_LABELS: Record<string, string> = { INTERNAL: 'Intern', EXTERNAL: 'Extern', CUSTOMER: 'Klant' };
                                    const cfg = RESULT_CONFIG[audit.result] || RESULT_CONFIG.PLANNED;
                                    return (
                                        <div key={audit.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-black text-slate-800 dark:text-white">{audit.date}</span>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-full">
                                                        {TYPE_LABELS[audit.type] || audit.type}
                                                    </span>
                                                </div>
                                                {audit.auditorName && (
                                                    <p className="text-xs text-slate-500 mt-0.5">Auditor: <span className="font-bold">{audit.auditorName}</span></p>
                                                )}
                                                {audit.notes && (
                                                    <p className="text-xs text-slate-400 mt-1 italic truncate max-w-xs">{audit.notes}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setEditingAudit(audit)}
                                                className="shrink-0 opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                            >
                                                Bewerken
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showFolderModal && (
                <NewFolderModal 
                    frameworkId={framework.id} 
                    onClose={() => setShowFolderModal(false)} 
                    onAdd={() => setShowFolderModal(false)} 
                />
            )}

            {showAuditModal && (
                <NewAuditModal
                    frameworkId={framework.id}
                    onClose={() => setShowAuditModal(false)}
                    onAdd={() => setShowAuditModal(false)}
                />
            )}

            {editingAudit && (
                <EditAuditModal
                    audit={editingAudit}
                    onClose={() => setEditingAudit(null)}
                    onSave={() => setEditingAudit(null)}
                />
            )}
        </div>
    );
};
