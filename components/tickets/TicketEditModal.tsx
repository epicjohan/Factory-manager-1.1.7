
import React, { useState } from 'react';
import { MaintenanceTicket, Machine, TicketImpact, MaintenanceAction, UsedPart, UploadedDocument, GeneralPart, MachinePart } from '../../types';
import { X, AlertTriangle, Zap, Clock, Save, Send, CheckCircle, Edit2, ShoppingCart, Upload, Paperclip, FileText, Download, Trash2, Plus } from '../../icons';
import { db } from '../../services/storage';
import { generateId, KEYS } from '../../services/db/core';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTable } from '../../hooks/useTable';
import { SyncService } from '../../services/sync';
import { documentService } from '../../services/db/documentService';

interface TicketEditModalProps {
    ticket: MaintenanceTicket;
    machine: Machine | null;
    onClose: () => void;
    onSaved: () => void;
}

const IMPACT_OPTIONS: { value: TicketImpact; label: string; color: string; activeColor: string; icon: any }[] = [
    { value: TicketImpact.LOW, label: 'Laag', color: 'border-slate-200 text-slate-500', activeColor: 'bg-slate-600 border-slate-500 text-white shadow-lg', icon: Clock },
    { value: TicketImpact.NORMAL, label: 'Normaal', color: 'border-slate-200 text-slate-500', activeColor: 'bg-blue-600 border-blue-500 text-white shadow-lg', icon: AlertTriangle },
    { value: TicketImpact.CRITICAL, label: 'Kritiek', color: 'border-slate-200 text-slate-500', activeColor: 'bg-red-600 border-red-500 text-white shadow-lg', icon: Zap },
];

export const TicketEditModal: React.FC<TicketEditModalProps> = ({ ticket, machine, onClose, onSaved }) => {
    const { user } = useAuth();
    const { addNotification } = useNotifications();

    // Load available parts
    const { data: generalParts } = useTable<GeneralPart>(KEYS.PARTS_GENERAL);
    const { data: machineParts } = useTable<MachinePart>(KEYS.PARTS_MACHINE);
    const relevantMachineParts = machineParts.filter(p => p.machineId === ticket.machineId);
    const allParts: (GeneralPart | MachinePart)[] = [...generalParts, ...relevantMachineParts];

    // Core fields
    const [title, setTitle] = useState(ticket.title);
    const [description, setDescription] = useState(ticket.description);
    const [impact, setImpact] = useState<TicketImpact>(ticket.impact);
    const [isSaving, setIsSaving] = useState(false);

    // Actions
    const [newActionText, setNewActionText] = useState('');
    const [pendingActions, setPendingActions] = useState<MaintenanceAction[]>([]);
    const allActions = [...ticket.actions, ...pendingActions];

    // Parts
    const [usedParts, setUsedParts] = useState<UsedPart[]>(ticket.usedParts || []);
    const [selectedPartId, setSelectedPartId] = useState('');
    const [selectedPartQty, setSelectedPartQty] = useState(1);
    const [pendingPartOps, setPendingPartOps] = useState<{ type: 'add' | 'remove'; partId: string; qty: number }[]>([]);

    // Invoice
    const [invoice, setInvoice] = useState<UploadedDocument | undefined>(ticket.invoice);
    const [invoiceChanged, setInvoiceChanged] = useState(false);

    const addAction = () => {
        if (!newActionText.trim() || !user) return;
        const action: MaintenanceAction = {
            id: generateId(),
            description: newActionText.trim(),
            date: new Date().toISOString(),
            user: user.name
        };
        setPendingActions(prev => [...prev, action]);
        setNewActionText('');
    };

    const handleAddPart = () => {
        if (!selectedPartId || selectedPartQty <= 0) return;
        const part = allParts.find(p => p.id === selectedPartId);
        if (!part) return;

        const usedPart: UsedPart = {
            partId: part.id,
            name: part.description,
            articleCode: part.articleCode,
            quantity: selectedPartQty,
            pricePerUnit: part.price,
            totalCost: part.price * selectedPartQty,
            source: 'machineId' in part ? 'MACHINE_PART' : 'GENERAL_PART'
        };

        setUsedParts(prev => [...prev, usedPart]);
        setPendingPartOps(prev => [...prev, { type: 'add', partId: part.id, qty: selectedPartQty }]);
        setSelectedPartId('');
        setSelectedPartQty(1);
    };

    const handleRemovePart = (idx: number) => {
        const partToRemove = usedParts[idx];
        setUsedParts(prev => prev.filter((_, i) => i !== idx));
        setPendingPartOps(prev => [...prev, { type: 'remove', partId: partToRemove.partId, qty: partToRemove.quantity }]);
    };

    const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                // Registreer in DMS
                const dmsDoc = await documentService.addDocumentFromBase64(file.name, file.type, base64, file.size);
                setInvoice({ name: file.name, type: file.type, url: '', documentId: dmsDoc.id, category: 'Factuur' });
                setInvoiceChanged(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const partsTotal = usedParts.reduce((acc, p) => acc + p.totalCost, 0);

    const hasChanges =
        title !== ticket.title ||
        description !== ticket.description ||
        impact !== ticket.impact ||
        pendingActions.length > 0 ||
        pendingPartOps.length > 0 ||
        invoiceChanged;

    const handleSave = async () => {
        if (!title.trim()) {
            addNotification('WARNING', 'Let op', 'Titel mag niet leeg zijn.');
            return;
        }

        setIsSaving(true);
        try {
            // Process part stock changes
            for (const op of pendingPartOps) {
                if (op.type === 'add') {
                    await db.consumePart(op.partId, op.qty);
                } else {
                    await db.releasePart(op.partId, op.qty);
                }
            }

            const updatedTicket: MaintenanceTicket = {
                ...ticket,
                title: title.trim(),
                description: description.trim(),
                impact,
                actions: allActions,
                usedParts,
                repairCost: partsTotal,
                invoice,
            };

            await db.updateMaintenanceTicket(updatedTicket);

            addNotification('SUCCESS', 'Opgeslagen', `Ticket ${ticket.ticketNumber || ''} is bijgewerkt.`);
            onSaved();
            onClose();
        } catch (e) {
            console.error(e);
            addNotification('ERROR', 'Fout', 'Ticket kon niet opgeslagen worden.');
            setIsSaving(false);
        }
    };

    const daysSince = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Vandaag';
        if (days === 1) return 'Gisteren';
        return `${days} dagen geleden`;
    };

    const resolveFileUrl = (url?: string) => {
        if (!url) return '#';
        return SyncService.resolveFileUrl(ticket.id, url, KEYS.TICKETS);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${impact === TicketImpact.CRITICAL ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : impact === TicketImpact.NORMAL ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            <Edit2 size={22} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                Ticket Bewerken
                                {ticket.ticketNumber && (
                                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 not-italic">
                                        #{ticket.ticketNumber}
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {machine && <span>{machine.name}</span>}
                                <span>•</span>
                                <span className="flex items-center gap-1"><Clock size={10} /> {daysSince(ticket.reportedDate)}</span>
                                <span>•</span>
                                <span>Door: {ticket.reportedBy}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={22} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                    {/* Title */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Titel *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Beschrijf de storing..."
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Omschrijving</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                            placeholder="Extra details over de storing..."
                        />
                    </div>

                    {/* Impact */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Impact</label>
                        <div className="flex gap-2">
                            {IMPACT_OPTIONS.map(opt => {
                                const isActive = impact === opt.value;
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setImpact(opt.value)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${isActive ? opt.activeColor : `bg-white dark:bg-slate-800 ${opt.color}`}`}
                                    >
                                        <Icon size={14} />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Two Column Layout: Actions + Parts/Invoice */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Left: Actions Timeline */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-5">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Clock size={14} /> Tijdslijn & Acties ({allActions.length})
                            </h4>

                            {allActions.length > 0 ? (
                                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1 mb-4">
                                    {allActions.map(action => {
                                        const isPending = pendingActions.some(p => p.id === action.id);
                                        return (
                                            <div key={action.id} className={`p-3 rounded-2xl border relative overflow-hidden ${isPending ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPending ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5 pl-2">
                                                    {new Date(action.date).toLocaleString('nl-NL')} • {action.user}
                                                    {isPending && <span className="ml-2 text-blue-500">(nieuw)</span>}
                                                </div>
                                                <div className="text-xs text-slate-700 dark:text-slate-300 font-medium pl-2">{action.description}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic mb-4">Geen acties geregistreerd.</p>
                            )}

                            {ticket.status === 'OPEN' && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newActionText}
                                        onChange={e => setNewActionText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addAction()}
                                        placeholder="Beschrijf uitgevoerde actie..."
                                        className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                    <button
                                        onClick={addAction}
                                        disabled={!newActionText.trim()}
                                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40 transition-colors shadow-sm shadow-blue-500/20 shrink-0"
                                    >
                                        <Send size={12} /> Toevoegen
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right: Parts + Invoice */}
                        <div className="space-y-4">
                            {/* Materials */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-5">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <ShoppingCart size={14} /> Materialen ({usedParts.length})
                                </h4>

                                {usedParts.length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1 mb-3">
                                        {usedParts.map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-[10px] font-bold group/item">
                                                <div className="flex-1 truncate pr-2" title={`${p.quantity}x ${p.name}`}>
                                                    {p.quantity}x {p.name}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-blue-600 dark:text-blue-400 shrink-0">€{p.totalCost.toFixed(2)}</span>
                                                    {ticket.status === 'OPEN' && (
                                                        <button
                                                            onClick={() => handleRemovePart(idx)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                            title="Verwijderen"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic mb-3">Nog geen onderdelen gekoppeld.</p>
                                )}

                                {usedParts.length > 0 && (
                                    <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mb-3 flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Subtotaal:</span>
                                        <span className="text-slate-800 dark:text-white font-mono">€ {partsTotal.toFixed(2)}</span>
                                    </div>
                                )}

                                {/* Add part */}
                                {ticket.status === 'OPEN' && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                                        <div className="flex gap-2 mb-2">
                                            <select
                                                value={selectedPartId}
                                                onChange={e => setSelectedPartId(e.target.value)}
                                                className="flex-1 text-[10px] p-2.5 rounded-2xl border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white font-bold outline-none"
                                            >
                                                <option value="">+ Selecteer artikel</option>
                                                {allParts.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.description} (€{p.price}) — {p.stock} op voorraad
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                min="1"
                                                value={selectedPartQty}
                                                onChange={e => setSelectedPartQty(parseInt(e.target.value) || 1)}
                                                className="w-14 text-[10px] p-2.5 rounded-2xl border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white font-bold text-center"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddPart}
                                            disabled={!selectedPartId}
                                            className="w-full py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                        >
                                            <Plus size={12} /> Toevoegen aan bon
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Invoice / Documents */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-5">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Paperclip size={14} /> Bijlagen
                                </h4>

                                {invoice ? (
                                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 mb-3 overflow-hidden">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText size={18} className="text-green-600 shrink-0" />
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-bold text-green-800 dark:text-green-300 truncate" title={invoice.name}>{invoice.name}</div>
                                                <div className="text-[8px] uppercase font-bold text-green-600/50">Factuur/Bon</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {!invoiceChanged && invoice.url && (
                                                <a
                                                    href={resolveFileUrl(invoice.url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 bg-white dark:bg-slate-800 rounded-xl text-green-600 hover:text-green-800 shadow-sm transition-colors"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <Download size={14} />
                                                </a>
                                            )}
                                            {ticket.status === 'OPEN' && (
                                                <button
                                                    onClick={() => { setInvoice(undefined); setInvoiceChanged(true); }}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                                    title="Bijlage verwijderen"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-slate-400 italic mb-3">Nog geen document geüpload.</p>
                                )}

                                {ticket.status === 'OPEN' && (
                                    <label className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-all">
                                        <Upload size={14} />
                                        <span>{invoice ? 'Document wijzigen' : 'Factuur / scan toevoegen'}</span>
                                        <input type="file" className="hidden" accept=".pdf,.jpg,.png,.jpeg" onChange={handleInvoiceUpload} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="text-xs text-slate-400 font-bold">
                        {hasChanges && <span className="text-blue-500">Niet-opgeslagen wijzigingen</span>}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Annuleren
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasChanges}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={16} /> Opslaan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
