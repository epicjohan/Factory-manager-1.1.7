
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

    const statusInfo = ticket.status === 'OPEN'
        ? { label: 'Open', color: 'border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-300 dark:bg-red-900/20', icon: <AlertCircle size={24} className="text-red-500" /> }
        : { label: 'Opgelost', color: 'border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-900/20', icon: <CheckCircle size={24} className="text-green-500" /> };

    const impactInfo = ticket.impact === TicketImpact.CRITICAL
        ? { label: 'Kritiek', color: 'border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-300 dark:bg-red-900/20' }
        : { label: 'Normaal', color: 'border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/20' };

    return (
        <div className={`border transition-all duration-300 overflow-hidden ${isExpanded ? 'bg-white dark:bg-slate-800 rounded-[2rem] border-slate-300 dark:border-slate-600 shadow-xl my-6' : 'bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm hover:shadow-md'}`}>
            <div
                className="p-5 cursor-pointer flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                onClick={onToggle}
            >
                <div className="flex items-start gap-4">
                    <div className="mt-1">
                        {statusInfo.icon}
                    </div>
                    <div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                            <h3 className={`text-lg font-black uppercase tracking-tight italic flex items-center gap-2 ${isExpanded ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                                {ticket.title}
                                {ticket.impact === TicketImpact.CRITICAL && <AlertTriangle size={16} className="text-red-500 shrink-0" />}
                                {(ticket as any).isPending && <CloudCog size={16} className="text-orange-500 animate-spin-slow shrink-0" />}
                            </h3>
                            <div className="flex gap-2">
                                <span className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full border ${impactInfo.color}`}>{impactInfo.label}</span>
                                <span className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full border ${statusInfo.color}`}>{statusInfo.label}</span>
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-1.5">
                            <span className="flex items-center gap-1.5"><Clock size={12} className="shrink-0" /> {new Date(ticket.reportedDate).toLocaleDateString()}</span>
                            {!isExpanded && (
                                <span className="hidden md:inline truncate max-w-xs opacity-70"> • Gemeld door: {ticket.reportedBy}</span>
                            )}
                        </div>
                    </div>
                </div>
                {isTD && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirmDeleteTicket) onDelete();
                            else setConfirmDeleteTicket(true);
                        }}
                        className={`p-2 transition-all rounded-lg flex items-center gap-2 ${confirmDeleteTicket ? 'bg-red-600 text-white px-3' : 'text-slate-300 hover:text-red-500'}`}
                        title="Bon verwijderen"
                    >
                        {confirmDeleteTicket ? <><AlertCircle size={14} /><span className="text-[10px] font-black uppercase">WISSEN?</span></> : <Trash2 size={16} />}
                    </button>
                )}
            </div>

            {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* LEFT COLUMN: DESCRIPTION & ACTIONS */}
                        <div className="flex-1 space-y-6">
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] p-5 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                                    <AlertCircle size={14} /> Omschrijving Melder
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                            </div>

                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] p-5 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                                    <Clock size={14} /> Tijdslijn & Acties
                                </h4>
                                <div className="space-y-3">
                                    {ticket.actions.length === 0 && <div className="text-xs text-slate-400 italic py-2 pl-1">Geen acties geregistreerd.</div>}
                                    {ticket.actions.map(action => (
                                        <div key={action.id} className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-100 dark:border-slate-600 shadow-sm relative group overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">{new Date(action.date).toLocaleString()} • {action.user}</div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">{action.description}</div>
                                        </div>
                                    ))}
                                </div>

                                {ticket.status === 'OPEN' && !machine.isArchived && isTD && (
                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-end">
                                        <input
                                            type="text"
                                            className="flex-1 p-3 rounded-xl border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Beschrijf uitgevoerde actie..."
                                            value={newActionText}
                                            onChange={e => setNewActionText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
                                        />
                                        <button
                                            onClick={handleAddAction}
                                            disabled={!newActionText.trim()}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/20"
                                        >
                                            <Send size={14} /> Opslaan
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: PARTS & INVOICE */}
                        <div className="w-full md:w-80 space-y-4 shrink-0">
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] p-5 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                                    <ShoppingCart size={14} /> Materialen
                                </h4>
                                {ticket.usedParts && ticket.usedParts.length > 0 ? (
                                    <div className="space-y-2 mb-4">
                                        {ticket.usedParts.map((p, idx) => {
                                            const partKey = `${ticket.id}-${idx}`;
                                            const isConfirming = confirmDeletePartKey === partKey;
                                            return (
                                                <div key={idx} className={`flex items-center justify-between text-[10px] p-2.5 rounded-lg font-bold group/item transition-colors ${isConfirming ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-700'}`}>
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

                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] p-5 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                                    <Paperclip size={14} /> Bijlagen
                                </h4>
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
