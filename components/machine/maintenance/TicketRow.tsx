
import React, { useState } from 'react';
import { 
    MaintenanceTicket, Machine, GeneralPart, MachinePart, TicketImpact, MaintenanceAction, 
    UsedPart, UploadedDocument, UserRole, Permission 
} from '../../../types';
import { db } from '../../../services/storage';
import { generateId } from '../../../services/db/core';
import { useAuth } from '../../../contexts/AuthContext';
import { SyncService } from '../../../services/sync';
import { KEYS } from '../../../services/db/core';
import { 
    AlertTriangle, Clock, CloudCog, CheckCircle, Trash2, AlertCircle, ShoppingCart, 
    Paperclip, FileText, Download, Upload, Send 
} from '../../../icons';
import { ResolveTicketForm } from './ResolveTicketForm';

interface TicketRowProps {
    ticket: MaintenanceTicket;
    machine: Machine;
    isExpanded: boolean;
    onToggle: () => void;
    onDelete: () => void;
    parts: (GeneralPart | MachinePart)[];
    serverUrl?: string;
}

export const TicketRow: React.FC<TicketRowProps> = ({ 
    ticket, machine, isExpanded, onToggle, onDelete, parts, serverUrl 
}) => {
    const { user, hasPermission } = useAuth();
    const [newActionText, setNewActionText] = useState('');
    const [isResolving, setIsResolving] = useState(false);
    
    // Part selection state
    const [selectedPartId, setSelectedPartId] = useState('');
    const [selectedPartQty, setSelectedPartQty] = useState(1);
    const [confirmDeletePartKey, setConfirmDeletePartKey] = useState<string | null>(null);
    const [confirmDeleteTicket, setConfirmDeleteTicket] = useState(false);

    const isTD = user?.role === UserRole.MAINTENANCE || user?.role === UserRole.ADMIN;
    
    const resolveFileUrl = (url?: string) => {
        if (!url) return '#';
        return SyncService.resolveFileUrl(ticket.id, url, KEYS.TICKETS, serverUrl);
    };

    const handleAddAction = () => {
        if (!newActionText || !user) return;
        const action: MaintenanceAction = { 
            id: generateId(), 
            description: newActionText, 
            date: new Date().toISOString(), 
            user: user.name 
        };
        const updatedTicket = { ...ticket, actions: [...ticket.actions, action] };
        db.updateMaintenanceTicket(updatedTicket);
        setNewActionText('');
    };

    const handleAddPart = () => {
        if (!selectedPartId || selectedPartQty <= 0) return;
        const part = parts.find(p => p.id === selectedPartId);
        if (!part) return;
        
        const usedPart: UsedPart = { 
            partId: part.id, 
            name: part.description, 
            articleCode: part.articleCode, 
            quantity: selectedPartQty, 
            pricePerUnit: part.price, 
            totalCost: part.price * selectedPartQty, 
            source: 'location' in part ? 'GENERAL_PART' : 'MACHINE_PART' 
        };
        
        const updatedTicket = { 
            ...ticket, 
            usedParts: [...(ticket.usedParts || []), usedPart], 
            repairCost: (ticket.repairCost || 0) + usedPart.totalCost 
        };
        
        db.updateMaintenanceTicket(updatedTicket);
        db.consumePart(part.id, selectedPartQty);
        
        setSelectedPartId(''); 
        setSelectedPartQty(1);
    };

    const handleRemovePart = async (idx: number) => {
        const key = `${ticket.id}-${idx}`;
        if (confirmDeletePartKey !== key) {
            setConfirmDeletePartKey(key);
            return;
        }

        if (!ticket.usedParts) return;
        const partToRemove = ticket.usedParts[idx];
        
        await db.releasePart(partToRemove.partId, partToRemove.quantity);
        
        const newUsedParts = ticket.usedParts.filter((_, i) => i !== idx);
        const newRepairCost = Math.max(0, (ticket.repairCost || 0) - partToRemove.totalCost);
        
        await db.updateMaintenanceTicket({
            ...ticket,
            usedParts: newUsedParts,
            repairCost: newRepairCost
        });
        
        setConfirmDeletePartKey(null);
    };

    const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newDoc: UploadedDocument = { name: file.name, type: file.type, url: reader.result as string, category: 'Factuur' };
                db.updateMaintenanceTicket({ ...ticket, invoice: newDoc });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden ${ticket.status === 'RESOLVED' ? 'opacity-85' : 'shadow-sm hover:shadow-md'} transition-all ${(ticket as any).isPending ? 'ring-2 ring-orange-500/30' : ''}`}>
            <div className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors" onClick={onToggle}>
                <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 flex-wrap">
                            <span className="truncate">{ticket.title}</span>
                            {ticket.impact === TicketImpact.CRITICAL && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                            {(ticket as any).isPending && <CloudCog size={14} className="text-orange-500 animate-spin-slow shrink-0" />}
                        </h4>
                        <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 uppercase font-bold tracking-widest">
                            <span className="flex items-center gap-1"><Clock size={12} className="shrink-0" /> {new Date(ticket.reportedDate).toLocaleDateString()}</span>
                            <span className="text-slate-200 dark:text-slate-700 hidden sm:inline">•</span>
                            <span>Gemeld door: {ticket.reportedBy}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${ticket.status === 'OPEN' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>{ticket.status}</span>
                        {isTD && (
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(confirmDeleteTicket) onDelete();
                                    else setConfirmDeleteTicket(true);
                                }}
                                className={`p-1.5 transition-all rounded-lg flex items-center gap-2 ${confirmDeleteTicket ? 'bg-red-600 text-white px-3' : 'text-slate-300 hover:text-red-500'}`}
                                title="Bon verwijderen"
                            >
                                {confirmDeleteTicket ? <><AlertCircle size={14} /><span className="text-[10px] font-black uppercase">WISSEN?</span></> : <Trash2 size={16} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* LEFT COLUMN: DESCRIPTION & ACTIONS */}
                        <div className="flex-1 space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-600 shadow-inner relative overflow-hidden">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em] border-b border-slate-50 dark:border-slate-700 pb-1">Melding Omschrijving</h5>
                                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-normal break-words line-clamp-6">{ticket.description}</p>
                            </div>
                            
                            <div className="space-y-3">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Interventie Logboek</h5>
                                {ticket.actions.length === 0 && <div className="text-xs text-slate-400 italic py-2 pl-1">Geen acties geregistreerd.</div>}
                                {ticket.actions.map(action => (
                                    <div key={action.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shadow-sm">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-tight border-b border-slate-50 dark:border-slate-700 pb-1">
                                            <span className="text-blue-600 dark:text-blue-400">{action.user}</span>
                                            <span>{new Date(action.date).toLocaleDateString()} {new Date(action.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-normal break-words">{action.description}</div>
                                    </div>
                                ))}
                                
                                {ticket.status === 'OPEN' && !machine.isArchived && isTD && (
                                    <div className="flex gap-2 mt-4">
                                        <input 
                                            type="text" 
                                            className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                                            placeholder="Beschrijf uitgevoerde actie..." 
                                            value={newActionText} 
                                            onChange={e => setNewActionText(e.target.value)} 
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddAction()} 
                                        />
                                        <button onClick={handleAddAction} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95"><Send size={18} /></button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: PARTS & INVOICE */}
                        <div className="w-full md:w-80 space-y-4 shrink-0">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-1.5 tracking-widest"><ShoppingCart size={14} className="text-blue-500" /> Materialen</h5>
                                {ticket.usedParts && ticket.usedParts.length > 0 ? (
                                    <div className="space-y-1.5 mb-4">
                                        {ticket.usedParts.map((p, idx) => {
                                            const partKey = `${ticket.id}-${idx}`;
                                            const isConfirming = confirmDeletePartKey === partKey;
                                            return (
                                                <div key={idx} className={`flex items-center justify-between text-[10px] p-2 rounded font-bold group/item transition-colors ${isConfirming ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-700'}`}>
                                                    <div className="flex-1 truncate pr-2" title={`${p.quantity}x ${p.name}`}>{p.quantity}x {p.name}</div>
                                                    <div className="flex items-center gap-2">
                                                        {!isConfirming && <div className="font-mono text-blue-600 dark:text-blue-400 shrink-0">€{p.totalCost.toFixed(2)}</div>}
                                                        {ticket.status === 'OPEN' && isTD && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleRemovePart(idx); }}
                                                                className={`transition-colors flex items-center gap-1 ${isConfirming ? 'text-red-600 animate-pulse font-black' : 'text-slate-300 hover:text-red-500'}`}
                                                                title="Onderdeel verwijderen"
                                                            >
                                                                {isConfirming ? 'WISSEN?' : <Trash2 size={12} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="border-t border-slate-100 dark:border-slate-600 pt-2 mt-2 flex justify-between text-[11px] font-black uppercase tracking-widest">
                                            <span className="text-slate-400">Subtotaal:</span>
                                            <span className="text-slate-800 dark:text-white font-mono font-black">€ {ticket.usedParts.reduce((acc, p) => acc + p.totalCost, 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-slate-400 italic mb-4">Nog geen onderdelen gekoppeld.</div>
                                )}
                                
                                {!machine.isArchived && isTD && ticket.status === 'OPEN' && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/50">
                                        <div className="flex gap-2 mb-2">
                                            <select className="flex-1 text-[10px] p-2 rounded-lg border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white font-bold outline-none" value={selectedPartId} onChange={e => setSelectedPartId(e.target.value)}>
                                                <option value="">+ Artikel</option>
                                                {parts.map(p => (<option key={p.id} value={p.id}>{p.description} (€{p.price})</option>))}
                                            </select>
                                            <input type="number" className="w-12 text-[10px] p-2 rounded-lg border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white font-bold" min="1" value={selectedPartQty} onChange={e => setSelectedPartQty(parseInt(e.target.value))} />
                                        </div>
                                        <button onClick={handleAddPart} disabled={!selectedPartId} className="w-full py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-all active:scale-95">Toevoegen aan bon</button>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-1.5 tracking-widest"><Paperclip size={14} className="text-blue-500" /> Bijlagen</h5>
                                {ticket.invoice ? (
                                    <div className="flex items-center justify-between p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800 mb-3 overflow-hidden">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText size={18} className="text-green-600 shrink-0" />
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-bold text-green-800 dark:text-green-300 truncate" title={ticket.invoice.name}>{ticket.invoice.name}</div>
                                                <div className="text-[8px] uppercase font-bold text-green-600/50">Factuur/Bon</div>
                                            </div>
                                        </div>
                                        <a href={resolveFileUrl(ticket.invoice.url) || '#'} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white dark:bg-slate-800 rounded-lg text-green-600 hover:text-green-800 shadow-sm shrink-0 transition-colors">
                                            <Download size={16} />
                                        </a>
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-slate-400 italic mb-3">Nog geen PDF of afbeelding geüpload.</div>
                                )}
                                {!machine.isArchived && isTD && (
                                    <label className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-all">
                                        <Upload size={14} /><span>{ticket.invoice ? 'Factuur wijzigen' : 'Scan toevoegen'}</span>
                                        <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={handleInvoiceUpload} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RESOLVE AREA */}
                    {ticket.status === 'OPEN' ? (
                        isTD && !machine.isArchived && (
                            <>
                                <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div> 
                                {!isResolving ? (
                                    <button onClick={() => setIsResolving(true)} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white text-sm font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-green-500/20 transition-all active:scale-95"><CheckCircle size={24} /> Melding Definitief Oplossen</button>
                                ) : (
                                    <ResolveTicketForm ticket={ticket} onClose={() => setIsResolving(false)} />
                                )}
                            </>
                        )
                    ) : (
                        <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-full text-emerald-500 shadow-sm"><CheckCircle size={20} /></div>
                                    <div>
                                        <div className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Opgelost door {ticket.resolvedBy}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">{new Date(ticket.resolvedDate!).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-black text-slate-800 dark:text-white font-mono">€ {ticket.repairCost?.toFixed(2)}</div>
                                    <div className="text-[8px] text-slate-400 uppercase font-black">Totale Kosten</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
