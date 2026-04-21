import React, { useState, useEffect } from 'react';
import { db } from '../services/storage';
import { generateId, KEYS } from '../services/db/core';
import { Article, SetupVariant, Machine, ToolPreparationRequest, ToolRequestStatus, SetupTemplate } from '../types';
import { Wrench, Calendar, Clock, CheckCircle, Eye, Printer, Filter } from '../icons';
import { useNotifications } from '../contexts/NotificationContext';
import { SetupSheet } from '../components/pdm/SetupSheet';
import { ToolRequestDetailModal } from '../components/pdm/modals/ToolRequestDetailModal';

export const ToolPreparation: React.FC = () => {
    const [requests, setRequests] = useState<ToolPreparationRequest[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [templates, setTemplates] = useState<SetupTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<ToolRequestStatus | 'ALL'>('ALL');
    
    // Modal states
    const [selectedRequest, setSelectedRequest] = useState<ToolPreparationRequest | null>(null);
    const [sheetData, setSheetData] = useState<{ article: Article, setup: SetupVariant, machine: Machine | null } | null>(null);
    const [viewMode, setViewMode] = useState<'NONE' | 'DETAIL' | 'PRINT'>('NONE');
    const [companyName, setCompanyName] = useState('Factory Manager');
    const { addNotification } = useNotifications();

    const loadData = async () => {
        setIsLoading(true);
        try {
            const reqs = await db.getToolPrepRequests() || [];
            const arts = await db.getArticles() || [];
            const macs = await db.getMachines() || [];
            const tmpls = await db.getTemplates() || [];
            const meta = await db.getSystemSettings();
            
            setRequests(reqs.sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
            setArticles(arts);
            setMachines(macs);
            setTemplates(tmpls);
            if (meta?.companyName) setCompanyName(meta.companyName);
        } catch (e) {
            console.error('Failed to load tool prep stats', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        window.addEventListener(`db:${KEYS.TOOL_PREP_REQUESTS}:updated`, loadData);
        window.addEventListener('db-updated', loadData);
        return () => {
            window.removeEventListener(`db:${KEYS.TOOL_PREP_REQUESTS}:updated`, loadData);
            window.removeEventListener('db-updated', loadData);
        };
    }, []);

    const updateStatus = async (req: ToolPreparationRequest, newStatus: ToolRequestStatus) => {
        const updatedReq = { ...req, status: newStatus };
        try {
            await db.updateToolPrepRequest(updatedReq);
            addNotification('SUCCESS', 'Status Gewijzigd', `Aanvraag is nu ${newStatus}`);
            // Force reload in UI immediately while db syncs
            setRequests(prev => prev.map(r => r.id === req.id ? updatedReq : r));
        } catch (e) {
            addNotification('ERROR', 'Fout', 'Status kon niet gewijzigd worden');
        }
    };

    const openSheet = (req: ToolPreparationRequest) => {
        const article = articles.find(a => a.id === req.articleId);
        if (!article) {
            addNotification('WARNING', 'Fout', 'Artikel is mogelijk verwijderd');
            return;
        }
        let setup: SetupVariant | undefined;
        if (article.operations) {
            for (const op of article.operations) {
                setup = op.setups?.find(s => s.id === req.setupId);
                if (setup) break;
            }
        }
        
        if (!setup) {
            addNotification('WARNING', 'Fout', 'Setup is mogelijk verwijderd');
            return;
        }
        const activeMachine = machines.find(m => m.id === setup!.machineId) || null;
        
        // Dynamic Template Syncing (Same as SetupDocumentView)
        const liveTemplate = setup.setupTemplateId
            ? templates.find(t => t.id === setup!.setupTemplateId)
            : activeMachine?.setupTemplateId
                ? templates.find(t => t.id === activeMachine.setupTemplateId)
                : null;

        const isDraft = setup.status === 'DRAFT' || !setup.status;
        const effectiveToolFields = (isDraft && liveTemplate) ? (liveTemplate.toolFields || []) : (setup.frozenToolFields !== undefined ? setup.frozenToolFields : (liveTemplate?.toolFields || []));
        const effectiveSheetConfig = (isDraft && liveTemplate) ? liveTemplate.sheetConfig : setup.frozenSheetConfig;

        const dynamicSetup = {
            ...setup,
            frozenToolFields: effectiveToolFields,
            frozenSheetConfig: effectiveSheetConfig
        } as SetupVariant;
        
        setSheetData({ article, setup: dynamicSetup, machine: activeMachine });
        setSelectedRequest(req);
        setViewMode('DETAIL');
    };

    const filteredRequests = requests.filter(r => filterStatus === 'ALL' ? true : r.status === filterStatus);

    const getStatusColor = (status: ToolRequestStatus) => {
        switch (status) {
            case ToolRequestStatus.PENDING: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case ToolRequestStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border-blue-200';
            case ToolRequestStatus.READY: return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusLabel = (status: ToolRequestStatus) => {
        switch (status) {
            case ToolRequestStatus.PENDING: return 'Aangevraagd';
            case ToolRequestStatus.IN_PROGRESS: return 'Mee Bezig';
            case ToolRequestStatus.READY: return 'Klaar';
            default: return status;
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden min-h-[600px] flex flex-col relative">
                
                {/* Header & Filters */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center shrink-0">
                            <Wrench size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Oproepen</h2>
                            <p className="text-xs text-slate-500 font-medium">Overzicht van alle tool preps.</p>
                        </div>
                    </div>
                    
                    <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm self-start">
                        {(['ALL', ToolRequestStatus.PENDING, ToolRequestStatus.IN_PROGRESS, ToolRequestStatus.READY] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${filterStatus === status ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white'}`}
                            >
                                {status === 'ALL' ? 'Alles' : getStatusLabel(status as ToolRequestStatus)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List View */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="grid grid-cols-1 gap-4">
                        {filteredRequests.map(req => {
                            const date = new Date(req.requestDate).toLocaleString('nl-NL');
                            const dueDate = new Date(req.dueDate).toLocaleDateString('nl-NL');
                            return (
                                <div key={req.id} className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-[2rem] p-5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${getStatusColor(req.status)}`}>
                                                {getStatusLabel(req.status)}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
                                                {req.articleCode}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{req.setupName}</h3>
                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-indigo-400" /> Deadline: {dueDate}</span>
                                            <span className="flex items-center gap-1.5"><Clock size={14} className="text-orange-400" /> Aangevraagd: {date}</span>
                                            <span className="flex items-center gap-1.5">Door: {req.requestedBy}</span>
                                        </div>
                                        {req.notes && (
                                            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-xl text-sm font-medium border border-yellow-200 dark:border-yellow-900/50">
                                                {req.notes}
                                            </div>
                                        )}
                                        {req.existingToolIds && req.existingToolIds.length > 0 && (
                                            <div className="mt-2 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                                                +{req.existingToolIds.length} tools al aanwezig
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col md:flex-row items-center gap-3 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-700 pt-4 md:pt-0 md:pl-6">
                                        <select 
                                            value={req.status}
                                            onChange={(e) => updateStatus(req, e.target.value as ToolRequestStatus)}
                                            className="w-full md:w-auto p-3 text-xs font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none cursor-pointer hover:border-indigo-400 transition-colors"
                                        >
                                            <option value={ToolRequestStatus.PENDING}>Aangevraagd</option>
                                            <option value={ToolRequestStatus.IN_PROGRESS}>Mee Bezig</option>
                                            <option value={ToolRequestStatus.READY}>Klaar</option>
                                        </select>
                                        
                                        <button 
                                            onClick={() => openSheet(req)}
                                            className="w-full md:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
                                        >
                                            Inzien & Afvinken
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {filteredRequests.length === 0 && !isLoading && (
                            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <p className="font-bold text-sm uppercase tracking-widest">Geen oproepen in deze weergave</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {viewMode === 'DETAIL' && sheetData && selectedRequest && (
                <ToolRequestDetailModal
                    request={selectedRequest}
                    article={sheetData.article}
                    setup={sheetData.setup}
                    machine={sheetData.machine}
                    companyName={companyName}
                    onClose={() => {
                        setSheetData(null);
                        setSelectedRequest(null);
                        setViewMode('NONE');
                    }}
                    onToggleTool={async (toolId, isPrepared) => {
                         const currentIds = selectedRequest.preparedToolIds || [];
                         const newIds = isPrepared ? [...currentIds, toolId] : currentIds.filter(id => id !== toolId);
                         const updatedReq = { ...selectedRequest, preparedToolIds: newIds };
                         await db.updateToolPrepRequest(updatedReq);
                         setSelectedRequest(updatedReq);
                         setRequests(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));
                    }}
                    onUpdateStatus={async (status) => {
                        await updateStatus(selectedRequest, status);
                        setSelectedRequest(prev => prev ? { ...prev, status } : prev);
                    }}
                    onPrint={() => setViewMode('PRINT')}
                />
            )}

            {/* SETUP SHEET OVERLAY (Customized with existingToolIds) */}
            {viewMode === 'PRINT' && sheetData && selectedRequest && (
                <SetupSheet
                    article={sheetData.article}
                    setup={sheetData.setup}
                    machine={sheetData.machine}
                    companyName={companyName}
                    existingToolIds={selectedRequest.existingToolIds}
                    onClose={() => setViewMode('DETAIL')}
                />
            )}
        </div>
    );
};
