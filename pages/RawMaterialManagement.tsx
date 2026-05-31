import React, { useState, useMemo, useRef } from 'react';
import { db } from '../services/storage';
import { KEYS, generateId } from '../services/db/core';
import { RawMaterial, RawMaterialTransaction, MaterialType, MaterialProfile, MaterialCategory, RawMaterialDimensions, DMSDocument, StorageLocation, UserRole } from '../types';
import {
    Plus, Search, Package, Trash2, Edit, MapPin, AlertTriangle, X, Layers, Save, Upload, FileText, Eye, History, LayoutGrid, List, Download, RefreshCw, Info, Building2, ShoppingCart, ClipboardList, StickyNote, Scissors, Ruler, Lock, LockOpen
} from '../icons';
import { useAuth } from '../contexts/AuthContext';
import { useTable } from '../hooks/useTable';
import { useConfirm } from '../contexts/ConfirmContext';
import { documentService } from '../services/db/documentService';
import { DocumentLibraryModal } from '../components/pdm/modals/DocumentLibraryModal';
import { printRawMaterialLabel, formatDimensions } from '../services/labelService';
import * as XLSX from 'xlsx';

export const RawMaterialManagement: React.FC = () => {
    const { user } = useAuth();
    const confirm = useConfirm();
    const isAdmin = user?.role === UserRole.ADMIN || user?.id === 'super-admin-ghost';

    const { data: rawMaterials } = useTable<RawMaterial>(KEYS.RAW_MATERIALS);
    const { data: materialTypes } = useTable<MaterialType>(KEYS.MATERIAL_TYPES);
    const { data: materialProfiles } = useTable<MaterialProfile>(KEYS.MATERIAL_PROFILES);
    const { data: materialCategories } = useTable<MaterialCategory>(KEYS.MATERIAL_CATEGORIES);
    const { data: allDocs } = useTable<DMSDocument>(KEYS.DOCUMENTS);
    const { data: storageLocations } = useTable<StorageLocation>(KEYS.STORAGE_LOCATIONS);
    const certInputRef = useRef<HTMLInputElement>(null);
    const [showCertLibrary, setShowCertLibrary] = useState(false);
    const [isUploadingCert, setIsUploadingCert] = useState(false);
    const [locSearch, setLocSearch] = useState('');
    const [locDropOpen, setLocDropOpen] = useState(false);

    const [withdrawModal, setWithdrawModal] = useState<RawMaterial | false>(false);
    const [withdrawQty, setWithdrawQty] = useState(1);
    const [withdrawPO, setWithdrawPO] = useState('');
    const [withdrawNote, setWithdrawNote] = useState('');
    const [historyModal, setHistoryModal] = useState<RawMaterial | false>(false);
    const [batchDetail, setBatchDetail] = useState<RawMaterialTransaction | null>(null);
    const [infoModal, setInfoModal] = useState<RawMaterial | false>(false);

    // Restock modal state
    const [restockModal, setRestockModal] = useState<RawMaterial | false>(false);
    const [restockQty, setRestockQty] = useState(1);
    const [restockPO, setRestockPO] = useState('');
    const [restockIO, setRestockIO] = useState('');
    const [restockNote, setRestockNote] = useState('');
    const [restockCertIds, setRestockCertIds] = useState<string[]>([]);
    const [showRestockCertLibrary, setShowRestockCertLibrary] = useState(false);
    const restockCertInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingRestockCert, setIsUploadingRestockCert] = useState(false);

    // ── Transfer state ──
    const [transferModal, setTransferModal] = useState<RawMaterial | false>(false);
    const [transferAll, setTransferAll] = useState(true);
    const [transferQty, setTransferQty] = useState(1);
    const [transferToLocation, setTransferToLocation] = useState('');
    const [transferNote, setTransferNote] = useState('');
    const [transferLocSearch, setTransferLocSearch] = useState('');
    const [transferLocDropOpen, setTransferLocDropOpen] = useState(false);

    // ── Zaag state ──
    const [zaagModal, setZaagModal] = useState<RawMaterial | false>(false);
    const [zaagSourceQty, setZaagSourceQty] = useState(1);
    const [zaagTargetLength, setZaagTargetLength] = useState<number>(1000);
    const [zaagTargetQty, setZaagTargetQty] = useState<number>(1);
    const [zaagLocation, setZaagLocation] = useState('');
    const [zaagNote, setZaagNote] = useState('');
    const [zaagLocSearch, setZaagLocSearch] = useState('');
    const [zaagLocDropOpen, setZaagLocDropOpen] = useState(false);
    const [zaagQtyLocked, setZaagQtyLocked] = useState(false);   // qty vergrendeld door lengte
    const [zaagLenLocked, setZaagLenLocked] = useState(false);   // lengte vergrendeld door qty

    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [filterSource, setFilterSource] = useState<string>('');
    const [filterLocation, setFilterLocation] = useState<string>('');
    const [sortBy, setSortBy] = useState<'description' | 'materialTypeName' | 'location' | 'stock'>('description');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const [rawModal, setRawModal] = useState<Partial<RawMaterial> | false>(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const getCatColor = (catCode: string) => {
        const cat = materialCategories.find(c => c.code === catCode);
        return cat?.color || 'bg-slate-400';
    };

    const generateBatchNr = (): string => {
        const now = new Date();
        const dateStr = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
        const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
        return `BATCH-${dateStr}-${seq}`;
    };

    const buildRawDescription = (mtId?: string, profId?: string, dims?: RawMaterialDimensions) => {
        const mt = materialTypes.find(t => t.id === mtId);
        const mp = materialProfiles.find(p => p.id === profId);
        const parts: string[] = [];
        if (mt) parts.push(mt.name);
        if (mp) parts.push(mp.name);
        if (dims?.diameter) parts.push(`Ø${dims.diameter}`);
        if (dims?.width && dims?.height) parts.push(`${dims.width}×${dims.height}`);
        else if (dims?.width) parts.push(`B${dims.width}`);
        else if (dims?.height) parts.push(`H${dims.height}`);
        if (dims?.length) parts.push(`L${dims.length}mm`);
        if (dims?.thickness) parts.push(`D${dims.thickness}mm`);
        return parts.join(' ') || '';
    };

    const setRmFormWithDesc = (update: Partial<RawMaterial>) => {
        const merged = { ...(rawModal || {}), ...update } as Partial<RawMaterial>;
        if (!merged.id) {
            merged.description = buildRawDescription(merged.materialTypeId, merged.profileId, merged.dimensions);
        }
        setRawModal(merged);
    };

    const filteredRaw = useMemo(() => {
        const q = search.toLowerCase();
        let results = (rawMaterials || []).filter(r => {
            const textMatch = !q || r.description.toLowerCase().includes(q) ||
                r.materialTypeName.toLowerCase().includes(q) ||
                r.profileName.toLowerCase().includes(q) ||
                r.location.toLowerCase().includes(q) ||
                (r.articleCode || '').toLowerCase().includes(q) ||
                (r.productionOrderNr || '').toLowerCase().includes(q) ||
                (r.purchaseOrderNr || '').toLowerCase().includes(q) ||
                (r.supplier || '').toLowerCase().includes(q) ||
                (r.transactions || []).some((tx: RawMaterialTransaction) => (tx.batchNr || '').toLowerCase().includes(q));
            const catMatch = !filterCategory || (materialTypes.find(t => t.id === r.materialTypeId)?.category === filterCategory);
            const sourceMatch = !filterSource || r.source === filterSource;
            const locMatch = !filterLocation || r.location === filterLocation;
            return textMatch && catMatch && sourceMatch && locMatch;
        });
        results.sort((a, b) => {
            if (sortBy === 'stock') return sortDir === 'asc' ? (a.stock - b.stock) : (b.stock - a.stock);
            const av = (a[sortBy] || '').toLowerCase();
            const bv = (b[sortBy] || '').toLowerCase();
            return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        });
        return results;
    }, [rawMaterials, search, filterCategory, filterSource, filterLocation, sortBy, sortDir, materialTypes]);

    const activeFilterCount = [filterCategory, filterSource, filterLocation].filter(Boolean).length;

    const handleSaveRaw = async (item: RawMaterial) => {
        const exists = (rawMaterials || []).find(r => r.id === item.id);
        const now = new Date().toISOString();
        const userName = user?.name || 'Onbekend';
        const txs: RawMaterialTransaction[] = [...(item.transactions || [])];
        if (exists) {
            if (exists.stock !== item.stock) {
                txs.push({ id: generateId(), type: 'STOCK_ADJUST', previousStock: exists.stock, newStock: item.stock, quantity: Math.abs(item.stock - exists.stock), performedBy: userName, performedAt: now, note: `Voorraad aangepast van ${exists.stock} naar ${item.stock}` });
            } else {
                txs.push({ id: generateId(), type: 'EDIT', performedBy: userName, performedAt: now, note: 'Materiaal gegevens bijgewerkt' });
            }
            item.transactions = txs;
            await db.updateRawMaterial(item);
        } else {
            txs.push({ id: generateId(), type: 'CREATED', newStock: item.stock, performedBy: userName, performedAt: now });
            item.transactions = txs;
            await db.addRawMaterial(item);
        }
        setRawModal(false);

        // Offer label printing only for newly created materials
        if (!exists) {
            const wantPrint = await confirm({
                title: 'Label Printen',
                message: `Materiaal "${item.description}" is aangemaakt. Wilt u een sticker label printen?`
            });
            if (wantPrint) {
                printRawMaterialLabel({
                    description: item.description,
                    materialTypeName: item.materialTypeName,
                    profileName: item.profileName,
                    dimensions: formatDimensions(item.dimensions),
                    stock: item.stock,
                    location: item.location,
                    source: item.source,
                    productionOrderNr: item.productionOrderNr,
                    purchaseOrderNr: item.purchaseOrderNr,
                    supplier: item.supplier,
                    addedBy: userName,
                    date: new Date().toLocaleDateString('nl-NL'),
                    transactionType: 'NEW'
                });
            }
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawModal || withdrawQty < 1 || !withdrawPO.trim()) return;
        const rm = withdrawModal;
        const now = new Date().toISOString();
        const userName = user?.name || 'Onbekend';
        const previousStock = rm.stock;
        const newStock = Math.max(0, previousStock - withdrawQty);
        const batchNr = generateBatchNr();
        const tx: RawMaterialTransaction = {
            id: generateId(), type: 'WITHDRAWAL', batchNr, quantity: withdrawQty,
            previousStock, newStock, productionOrderNr: withdrawPO.trim(),
            note: withdrawNote.trim() || undefined, performedBy: userName, performedAt: now
        };
        const updated: RawMaterial = { ...rm, stock: newStock, transactions: [...(rm.transactions || []), tx] };
        await db.updateRawMaterial(updated);
        const savedQty = withdrawQty;
        const savedPO = withdrawPO.trim();
        const savedBatchNr = batchNr;
        setWithdrawModal(false);
        setWithdrawQty(1); setWithdrawPO(''); setWithdrawNote('');

        const wantPrint = await confirm({
            title: 'Label Printen',
            message: `Afname van ${savedQty} st. verwerkt (${savedBatchNr}). Wilt u een sticker label printen?`
        });
        if (wantPrint) {
            printRawMaterialLabel({
                description: updated.description,
                materialTypeName: updated.materialTypeName,
                profileName: updated.profileName,
                dimensions: formatDimensions(updated.dimensions),
                stock: updated.stock,
                location: updated.location,
                source: updated.source,
                productionOrderNr: savedPO || undefined,
                supplier: updated.supplier,
                addedBy: userName,
                date: new Date().toLocaleDateString('nl-NL'),
                transactionType: 'WITHDRAWAL',
                withdrawQty: savedQty,
                batchNr: savedBatchNr
            });
        }
    };

    const handleDeleteRaw = async (id: string) => {
        const ok = await confirm({ title: 'Ruwdeel verwijderen', message: 'Weet u zeker dat u dit ruwdeel wilt verwijderen?' });
        if (ok) await db.deleteRawMaterial(id);
    };

    const openRestockModal = (rm: RawMaterial) => {
        setRestockModal(rm);
        setRestockQty(1);
        setRestockPO('');
        setRestockIO('');
        setRestockNote('');
        setRestockCertIds([]);
    };

    const handleRestock = async () => {
        if (!restockModal || restockQty < 1) return;
        const rm = restockModal;
        const now = new Date().toISOString();
        const userName = user?.name || 'Onbekend';
        const previousStock = rm.stock;
        const newStock = previousStock + restockQty;
        const tx: RawMaterialTransaction = {
            id: generateId(), type: 'RESTOCK', quantity: restockQty,
            previousStock, newStock,
            productionOrderNr: restockPO.trim() || undefined,
            purchaseOrderNr: restockIO.trim() || undefined,
            certificateDocIds: restockCertIds.length > 0 ? restockCertIds : undefined,
            note: restockNote.trim() || undefined,
            performedBy: userName, performedAt: now
        };
        // Merge new certificate IDs into the material's main list
        const mergedCerts = [...(rm.certificateDocIds || [])];
        restockCertIds.forEach(id => { if (!mergedCerts.includes(id)) mergedCerts.push(id); });
        const updated: RawMaterial = { ...rm, stock: newStock, certificateDocIds: mergedCerts, transactions: [...(rm.transactions || []), tx] };
        await db.updateRawMaterial(updated);
        const savedQty = restockQty;
        const savedPO = restockPO.trim();
        const savedIO = restockIO.trim();
        setRestockModal(false);

        const wantPrint = await confirm({
            title: 'Label Printen',
            message: `Opboeking van ${savedQty} st. is verwerkt. Wilt u een sticker label printen?`
        });
        if (wantPrint) {
            printRawMaterialLabel({
                description: updated.description,
                materialTypeName: updated.materialTypeName,
                profileName: updated.profileName,
                dimensions: formatDimensions(updated.dimensions),
                stock: updated.stock,
                location: updated.location,
                source: updated.source,
                productionOrderNr: savedPO || undefined,
                purchaseOrderNr: savedIO || undefined,
                supplier: updated.supplier,
                addedBy: userName,
                date: new Date().toLocaleDateString('nl-NL'),
                transactionType: 'RESTOCK',
                restockQty: savedQty
            });
        }
    };

    // ── Verplaatsen handler ──
    const handleTransfer = async () => {
        if (!transferModal || !transferToLocation.trim()) return;
        const rm = transferModal;
        const now = new Date().toISOString();
        const userName = user?.name || 'Onbekend';
        const qty = transferAll ? rm.stock : Math.min(transferQty, rm.stock);
        if (qty < 1) return;
        const fromLocation = rm.location;
        const toLocation = transferToLocation.trim();
        if (fromLocation === toLocation) return;

        const tx: RawMaterialTransaction = {
            id: generateId(),
            type: 'TRANSFER',
            quantity: qty,
            previousStock: rm.stock,
            newStock: rm.stock - qty,
            fromLocation,
            toLocation,
            note: transferNote.trim() || undefined,
            performedBy: userName,
            performedAt: now
        };

        if (transferAll || qty === rm.stock) {
            // Volledige verplaatsing: update locatie op hetzelfde record
            const updated: RawMaterial = {
                ...rm,
                location: toLocation,
                transactions: [...(rm.transactions || []), tx]
            };
            await db.updateRawMaterial(updated);
        } else {
            // Gedeeltelijke verplaatsing: verlaag voorraad origineel, maak nieuw record aan
            const updatedOriginal: RawMaterial = {
                ...rm,
                stock: rm.stock - qty,
                transactions: [...(rm.transactions || []), { ...tx, newStock: rm.stock - qty }]
            };
            await db.updateRawMaterial(updatedOriginal);

            const newRecord: RawMaterial = {
                ...rm,
                id: generateId(),
                location: toLocation,
                stock: qty,
                addedDate: now,
                addedBy: userName,
                transactions: [{
                    id: generateId(),
                    type: 'TRANSFER',
                    quantity: qty,
                    previousStock: 0,
                    newStock: qty,
                    fromLocation,
                    toLocation,
                    note: `Verplaatst van ${fromLocation}`,
                    performedBy: userName,
                    performedAt: now
                }]
            };
            await db.addRawMaterial(newRecord);
        }

        const savedQty = qty;
        const savedFrom = fromLocation;
        const savedTo = toLocation;
        setTransferModal(false);
        setTransferToLocation('');
        setTransferNote('');
        setTransferAll(true);

        const wantPrint = await confirm({
            title: 'Label Printen',
            message: `${savedQty} st. verplaatst van ${savedFrom} naar ${savedTo}. Wilt u een sticker label printen?`
        });
        if (wantPrint) {
            printRawMaterialLabel({
                description: rm.description,
                materialTypeName: rm.materialTypeName,
                profileName: rm.profileName,
                dimensions: formatDimensions(rm.dimensions),
                stock: qty,
                location: savedTo,
                source: rm.source,
                addedBy: userName,
                date: new Date().toLocaleDateString('nl-NL'),
                transactionType: 'TRANSFER',
                fromLocation: savedFrom,
                transferQty: savedQty
            });
        }
    };

    // ── Zagen handler ──
    const handleZaag = async () => {
        if (!zaagModal || !zaagLocation.trim() || zaagTargetLength < 1 || zaagTargetQty < 1) return;
        const rm = zaagModal;
        const now = new Date().toISOString();
        const userName = user?.name || 'Onbekend';
        const consumeQty = Math.min(zaagSourceQty, rm.stock);

        // 1. Verlaag bronmateriaal
        const zaagTx: RawMaterialTransaction = {
            id: generateId(),
            type: 'ZAAG',
            quantity: consumeQty,
            previousStock: rm.stock,
            newStock: rm.stock - consumeQty,
            targetLength: zaagTargetLength,
            sawQty: zaagTargetQty,
            toLocation: zaagLocation.trim(),
            note: zaagNote.trim() || undefined,
            performedBy: userName,
            performedAt: now,
        };
        const updatedSource: RawMaterial = {
            ...rm,
            stock: rm.stock - consumeQty,
            transactions: [...(rm.transactions || []), zaagTx],
        };
        await db.updateRawMaterial(updatedSource);

        // 2. Maak zaagstukken-record aan
        const newDims: RawMaterialDimensions = { ...rm.dimensions, length: zaagTargetLength };
        const newDesc = [
            rm.materialTypeName,
            rm.profileName,
            newDims.diameter ? `Ø${newDims.diameter}` : '',
            newDims.width ? `${newDims.width}${newDims.height ? `×${newDims.height}` : ''}` : '',
            newDims.length ? `L${newDims.length}` : '',
            newDims.thickness ? `D${newDims.thickness}` : '',
        ].filter(Boolean).join(' ');

        const newRecord: RawMaterial = {
            ...rm,
            id: generateId(),
            description: newDesc,
            dimensions: newDims,
            stock: zaagTargetQty,
            location: zaagLocation.trim(),
            source: 'RESTMATERIAAL',
            addedDate: now,
            addedBy: userName,
            transactions: [{
                id: generateId(),
                type: 'CREATED',
                quantity: zaagTargetQty,
                previousStock: 0,
                newStock: zaagTargetQty,
                note: `Gezaagd van ${rm.description} (${consumeQty} st.)`,
                performedBy: userName,
                performedAt: now,
            }],
        };
        await db.addRawMaterial(newRecord);

        const savedQty = zaagTargetQty;
        const savedLen = zaagTargetLength;
        const savedLoc = zaagLocation.trim();
        setZaagModal(false);
        setZaagLocation('');
        setZaagNote('');
        setZaagSourceQty(1);
        setZaagTargetQty(1);
        setZaagTargetLength(1000);

        const wantPrint = await confirm({
            title: 'Label Printen',
            message: `${savedQty} zaagstukken van ${savedLen}mm aangemaakt op ${savedLoc}. Wilt u een sticker label printen?`,
        });
        if (wantPrint) {
            printRawMaterialLabel({
                description: newDesc,
                materialTypeName: rm.materialTypeName,
                profileName: rm.profileName,
                dimensions: formatDimensions(newDims),
                stock: savedQty,
                location: savedLoc,
                source: 'RESTMATERIAAL',
                addedBy: userName,
                date: new Date().toLocaleDateString('nl-NL'),
                transactionType: 'NEW',
            });
        }
    };

    const exportToExcel = () => {
        const rows = filteredRaw.map(rm => {
            const dims = rm.dimensions || {};
            const dimParts: string[] = [];
            if (dims.diameter) dimParts.push(`Ø${dims.diameter}`);
            if (dims.width) dimParts.push(`B${dims.width}`);
            if (dims.height) dimParts.push(`H${dims.height}`);
            if (dims.length) dimParts.push(`L${dims.length}`);
            if (dims.thickness) dimParts.push(`D${dims.thickness}`);
            return {
                'Omschrijving': rm.description,
                'Materiaalsoort': rm.materialTypeName,
                'Profielvorm': rm.profileName,
                'Afmetingen (mm)': dimParts.length > 0 ? dimParts.join(' × ') : '',
                'Voorraad': rm.stock,
                'Gewicht (kg)': rm.weight ?? '',
                'Locatie': rm.location || '',
                'Herkomst': rm.source === 'RESTMATERIAAL' ? 'Restmateriaal' : 'Nieuw',
                'Productie Order': rm.productionOrderNr || '',
                'Inkoop Order': rm.purchaseOrderNr || '',
                'Leverancier': rm.supplier || '',
                'Prijs/kg (€)': rm.pricePerKg ?? '',
                'Aangemaakt door': rm.addedBy,
                'Aanmaakdatum': rm.addedDate ? new Date(rm.addedDate).toLocaleDateString('nl-NL') : '',
                'Transacties': (rm.transactions || []).length,
                'Notities': rm.notes || ''
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        // Auto-size columns
        const colWidths = Object.keys(rows[0] || {}).map(key => ({
            wch: Math.max(key.length, ...rows.map(r => String((r as any)[key] || '').length))
        }));
        ws['!cols'] = colWidths;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ruwdelen Voorraad');
        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `Ruwdelen_Voorraad_${dateStr}.xlsx`);
    };


    return (
        <div className="px-6 pb-10 space-y-6 text-left">
            <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 italic uppercase">
                            <Layers className="text-blue-600" />
                            Ruwdelen <span className="text-blue-600">Voorraad</span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Beheer ruw materiaal en restmateriaal voorraad.</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Zoek ruwdeel, materiaal of locatie..." className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={exportToExcel} disabled={filteredRaw.length === 0} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
                        <Download size={18} /> Excel Export
                    </button>
                    <button onClick={() => setRawModal({})} className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-500/20 w-full md:w-auto justify-center">
                        <Plus size={20} /> Nieuw Ruwdeel
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">Categorie:</span>
                    <button onClick={() => setFilterCategory('')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${!filterCategory ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600 hover:border-blue-300'}`}>Alle</button>
                    {materialCategories.map(cat => (
                        <button key={cat.code} onClick={() => setFilterCategory(filterCategory === cat.code ? '' : cat.code)} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-1.5 ${filterCategory === cat.code ? `${cat.color} text-white border-transparent shadow-md` : 'bg-white dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600 hover:border-blue-300'}`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                            {cat.name}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Herkomst:</span>
                        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white outline-none">
                            <option value="">Alle</option>
                            <option value="NIEUW">Nieuw</option>
                            <option value="RESTMATERIAAL">Restmateriaal</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Locatie:</span>
                        <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white outline-none">
                            <option value="">Alle</option>
                            {storageLocations.map(loc => (<option key={loc.id} value={loc.code}>{loc.code} — {loc.name}</option>))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sorteer:</span>
                        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white outline-none">
                            <option value="description">Omschrijving</option>
                            <option value="materialTypeName">Materiaal</option>
                            <option value="location">Locatie</option>
                            <option value="stock">Voorraad</option>
                        </select>
                        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors text-xs font-black">
                            {sortDir === 'asc' ? '↑ A-Z' : '↓ Z-A'}
                        </button>
                    </div>
                    {activeFilterCount > 0 && (
                        <button onClick={() => { setFilterCategory(''); setFilterSource(''); setFilterLocation(''); }} className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl transition-colors">
                            Filters wissen ({activeFilterCount})
                        </button>
                    )}
                </div>
                <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-slate-400">{filteredRaw.length} van {(rawMaterials || []).length} ruwdelen</span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-0.5">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Blokweergave">
                            <LayoutGrid size={16} />
                        </button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Lijstweergave">
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Legenda ── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-3 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5">Knoplegenda</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {[
                        { icon: <Info size={13} />,       color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',  label: 'Info — bekijk alle materiaalgegevens, orders en batches (alleen lezen)' },
                        { icon: <Package size={13} />,    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',        label: 'Afname — neem materiaal af voor een productie order' },
                        { icon: <Plus size={13} />,       color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20',        label: 'Opboeken — voeg voorraad toe aan het materiaal' },
                        { icon: <RefreshCw size={13} />,  color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',     label: 'Verplaatsen — verplaats (deel van) de voorraad naar een nieuwe locatie' },
                        { icon: <Scissors size={13} />,   color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20',        label: 'Zagen — zaag stukken naar gewenste lengte en leg op nieuwe locatie' },
                        { icon: <History size={13} />,    color: 'text-slate-500 bg-slate-100 dark:bg-slate-700/50',    label: 'Historie — bekijk alle transacties van dit materiaal' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>{item.icon}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
                {filteredRaw.length > 0 ? (
                    viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredRaw.map(rm => {
                            const catColor = getCatColor(materialTypes.find(t => t.id === rm.materialTypeId)?.category || '');
                            const dims = rm.dimensions || {};
                            const dimParts: string[] = [];
                            if (dims.diameter) dimParts.push(`Ø${dims.diameter}`);
                            if (dims.width) dimParts.push(`B${dims.width}`);
                            if (dims.height) dimParts.push(`H${dims.height}`);
                            if (dims.length) dimParts.push(`L${dims.length}`);
                            if (dims.thickness) dimParts.push(`D${dims.thickness}`);
                            return (
                                <div key={rm.id} className="group bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-3 h-3 rounded-full ${catColor} shadow-sm`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{rm.materialTypeName}</span>
                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg">{rm.profileName}</span>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isAdmin && (<>
                                                <button onClick={() => setRawModal(rm)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all" title="Bewerken"><Edit size={14} /></button>
                                                <button onClick={() => handleDeleteRaw(rm.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all" title="Verwijderen"><Trash2 size={14} /></button>
                                            </>)}
                                        </div>
                                    </div>
                                    <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight mb-1 line-clamp-2">{rm.description}</h4>
                                    {dimParts.length > 0 && (<div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-3">{dimParts.join(' × ')} mm</div>)}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase">{rm.stock} st.</span>
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><MapPin size={10} />{rm.location || 'N.v.t.'}</span>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${rm.source === 'RESTMATERIAAL' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' : 'bg-green-50 dark:bg-green-900/20 text-green-500'}`}>
                                            {rm.source === 'RESTMATERIAAL' ? 'Rest' : 'Nieuw'}
                                        </span>
                                    </div>
                                    <div className="flex gap-1.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-700">
                                        <button onClick={() => setInfoModal(rm)} className="flex-1 flex items-center justify-center py-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors" title="Materiaalinformatie">
                                            <Info size={15} />
                                        </button>
                                        <button onClick={() => { setWithdrawModal(rm); setWithdrawQty(1); setWithdrawPO(''); setWithdrawNote(''); }} disabled={rm.stock === 0} className="flex-1 flex items-center justify-center py-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Materiaal afnemen">
                                            <Package size={15} />
                                        </button>
                                        <button onClick={() => openRestockModal(rm)} className="flex-1 flex items-center justify-center py-2.5 text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors" title="Voorraad opboeken">
                                            <Plus size={15} />
                                        </button>
                                        <button onClick={() => { setTransferModal(rm); setTransferAll(true); setTransferQty(1); setTransferToLocation(''); setTransferNote(''); }} disabled={rm.stock === 0} className="flex-1 flex items-center justify-center py-2.5 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Voorraad verplaatsen">
                                            <RefreshCw size={15} />
                                        </button>
                                        <button onClick={() => { setZaagModal(rm); setZaagSourceQty(1); setZaagTargetLength(rm.dimensions?.length ? Math.floor(rm.dimensions.length / 2) : 1000); setZaagTargetQty(1); setZaagLocation(''); setZaagNote(''); setZaagQtyLocked(false); setZaagLenLocked(false); }} disabled={rm.stock === 0} className="flex-1 flex items-center justify-center py-2.5 text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Materiaal zagen">
                                            <Scissors size={15} />
                                        </button>
                                        <button onClick={() => setHistoryModal(rm)} className="flex-1 flex items-center justify-center py-2.5 text-slate-500 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative" title="Transactiegeschiedenis">
                                            <History size={15} />
                                            {(rm.transactions || []).length > 0 && <span className="absolute top-1 right-1 text-[7px] bg-slate-400 text-white w-3 h-3 flex items-center justify-center rounded-full font-black leading-none">{(rm.transactions || []).length}</span>}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    ) : (
                    /* ── LIST VIEW ── */
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Materiaal</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Omschrijving</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Afmetingen</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Voorraad</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Locatie</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Herkomst</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acties</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {filteredRaw.map(rm => {
                                        const catColor = getCatColor(materialTypes.find(t => t.id === rm.materialTypeId)?.category || '');
                                        const dims = rm.dimensions || {};
                                        const dimParts: string[] = [];
                                        if (dims.diameter) dimParts.push(`Ø${dims.diameter}`);
                                        if (dims.width) dimParts.push(`B${dims.width}`);
                                        if (dims.height) dimParts.push(`H${dims.height}`);
                                        if (dims.length) dimParts.push(`L${dims.length}`);
                                        if (dims.thickness) dimParts.push(`D${dims.thickness}`);
                                        return (
                                            <tr key={rm.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${catColor} shrink-0`} />
                                                        <div>
                                                            <span className="text-xs font-black text-slate-700 dark:text-white uppercase">{rm.materialTypeName}</span>
                                                            <span className="text-[10px] font-mono text-slate-400 ml-1.5">{rm.profileName}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-bold text-slate-800 dark:text-white">{rm.description}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {dimParts.length > 0 ? (
                                                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{dimParts.join(' × ')} mm</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black">{rm.stock}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-1 text-xs font-bold text-slate-500"><MapPin size={12} />{rm.location || 'N.v.t.'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${rm.source === 'RESTMATERIAAL' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' : 'bg-green-50 dark:bg-green-900/20 text-green-500'}`}>
                                                        {rm.source === 'RESTMATERIAAL' ? 'Rest' : 'Nieuw'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => setInfoModal(rm)} className="p-1.5 rounded-lg text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all" title="Materiaalinformatie">
                                                            <Info size={16} />
                                                        </button>
                                                        <button onClick={() => { setWithdrawModal(rm); setWithdrawQty(1); setWithdrawPO(''); setWithdrawNote(''); }} disabled={rm.stock === 0} className="p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Materiaal afnemen">
                                                            <Package size={16} />
                                                        </button>
                                                        <button onClick={() => openRestockModal(rm)} className="p-1.5 rounded-lg text-teal-500 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-all" title="Voorraad opboeken">
                                                            <Plus size={16} />
                                                        </button>
                                                        <button onClick={() => { setTransferModal(rm); setTransferAll(true); setTransferQty(1); setTransferToLocation(''); setTransferNote(''); }} disabled={rm.stock === 0} className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Voorraad verplaatsen">
                                                            <RefreshCw size={16} />
                                                        </button>
                                                        <button onClick={() => { setZaagModal(rm); setZaagSourceQty(1); setZaagTargetLength(rm.dimensions?.length ? Math.floor(rm.dimensions.length / 2) : 1000); setZaagTargetQty(1); setZaagLocation(''); setZaagNote(''); setZaagQtyLocked(false); setZaagLenLocked(false); }} disabled={rm.stock === 0} className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Materiaal zagen">
                                                            <Scissors size={16} />
                                                        </button>
                                                        <button onClick={() => setHistoryModal(rm)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all relative" title="Transactiegeschiedenis">
                                                            <History size={16} />
                                                            {(rm.transactions || []).length > 0 && <span className="absolute -top-0.5 -right-0.5 text-[8px] bg-slate-500 text-white w-3.5 h-3.5 flex items-center justify-center rounded-full font-black">{(rm.transactions || []).length}</span>}
                                                        </button>
                                                        {isAdmin && (<>
                                                            <button onClick={() => setRawModal(rm)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all opacity-0 group-hover:opacity-100" title="Bewerken"><Edit size={16} /></button>
                                                            <button onClick={() => handleDeleteRaw(rm.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all opacity-0 group-hover:opacity-100" title="Verwijderen"><Trash2 size={16} /></button>
                                                        </>)}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    )
                ) : (
                    <div className="py-24 text-center flex flex-col items-center text-slate-400 bg-white dark:bg-slate-800/20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <Layers size={64} className="mb-6 opacity-10" />
                        <p className="font-black uppercase tracking-widest">Geen ruwdelen gevonden</p>
                        <p className="text-xs mt-2 max-w-xs mx-auto">Klik op "Nieuw Ruwdeel" om restmateriaal of ruw materiaal te registreren.</p>
                    </div>
                )}
            </div>
            {/* Raw Material Modal */}
            {rawModal !== false && (() => {
                const isEdit = !!rawModal.id;
                const [rmForm, setRmForm] = [rawModal, (v: Partial<RawMaterial>) => setRawModal(v)];
                const selectedProfile = materialProfiles.find(p => p.id === rmForm.profileId);
                return (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic flex items-center gap-3">
                                    <Layers size={24} className="text-blue-600" />
                                    {isEdit ? 'Ruwdeel Bewerken' : 'Nieuw Ruwdeel'}
                                </h3>
                                <button onClick={() => setRawModal(false)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400"><X size={20} /></button>
                            </div>

                            {materialTypes.length === 0 || materialProfiles.length === 0 ? (
                                <div className="p-8 text-center">
                                    <AlertTriangle size={40} className="text-orange-500 mx-auto mb-4" />
                                    <p className="font-black uppercase tracking-widest text-sm text-slate-600 dark:text-slate-300 mb-2">Configuratie vereist</p>
                                    <p className="text-xs text-slate-400">Ga naar <strong>Configuratie → Materialen</strong> om eerst materiaalsoorten en profielvormen aan te maken.</p>
                                </div>
                            ) : (
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!rmForm.materialTypeId || !rmForm.profileId || !rmForm.description) return;
                                    const mt = materialTypes.find(t => t.id === rmForm.materialTypeId);
                                    const mp = materialProfiles.find(p => p.id === rmForm.profileId);
                                    handleSaveRaw({
                                        id: rmForm.id || generateId(),
                                        description: rmForm.description || '',
                                        articleCode: rmForm.articleCode,
                                        batchNumber: rmForm.batchNumber,
                                        materialTypeId: rmForm.materialTypeId!,
                                        materialTypeName: mt?.name || '',
                                        profileId: rmForm.profileId!,
                                        profileName: mp?.name || '',
                                        dimensions: rmForm.dimensions || {},
                                        stock: Number(rmForm.stock) || 0,
                                        weight: rmForm.weight ? Number(rmForm.weight) : undefined,
                                        location: rmForm.location || '',
                                        source: rmForm.source || 'NIEUW',
                                        sourceOrderNr: rmForm.sourceOrderNr,
                                        productionOrderNr: rmForm.productionOrderNr,
                                        purchaseOrderNr: rmForm.purchaseOrderNr,
                                        supplier: rmForm.supplier,
                                        pricePerKg: rmForm.pricePerKg ? Number(rmForm.pricePerKg) : undefined,
                                        addedBy: rmForm.addedBy || 'Gebruiker',
                                        addedDate: rmForm.addedDate || new Date().toISOString(),
                                        notes: rmForm.notes,
                                        certificateDocIds: rmForm.certificateDocIds || [],
                                    });
                                }} className="space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Omschrijving {!isEdit && <span className="text-blue-500 normal-case tracking-normal font-bold">(automatisch gegenereerd)</span>}</label>
                                        <input required type="text" readOnly={!isEdit} className={`w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 ${!isEdit ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-slate-50 dark:bg-slate-900'} dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500`} value={rmForm.description || ''} onChange={e => isEdit && setRawModal({...rmForm, description: e.target.value})} placeholder="Kies materiaal en profiel..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Materiaalsoort *</label>
                                            <select required className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" value={rmForm.materialTypeId || ''} onChange={e => setRmFormWithDesc({materialTypeId: e.target.value})}>
                                                <option value="">Selecteer...</option>
                                                {materialTypes.map(mt => <option key={mt.id} value={mt.id}>{mt.name} ({mt.category})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Profielvorm *</label>
                                            <select required className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" value={rmForm.profileId || ''} onChange={e => setRmFormWithDesc({profileId: e.target.value, dimensions: {}})}>
                                                <option value="">Selecteer...</option>
                                                {materialProfiles.map(mp => <option key={mp.id} value={mp.id}>{mp.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    {selectedProfile && (
                                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                                            <label className="block text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3">Afmetingen (mm)</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {selectedProfile.hasDiameter && <div><label className="text-[9px] font-black text-slate-400 uppercase">Diameter (Ø)</label><input type="number" step="0.1" className="w-full p-3 rounded-xl border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white font-mono font-bold outline-none" value={rmForm.dimensions?.diameter || ''} onChange={e => setRmFormWithDesc({dimensions: {...(rmForm.dimensions||{}), diameter: parseFloat(e.target.value) || undefined}})}/></div>}
                                                {selectedProfile.hasWidth && <div><label className="text-[9px] font-black text-slate-400 uppercase">Breedte</label><input type="number" step="0.1" className="w-full p-3 rounded-xl border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white font-mono font-bold outline-none" value={rmForm.dimensions?.width || ''} onChange={e => setRmFormWithDesc({dimensions: {...(rmForm.dimensions||{}), width: parseFloat(e.target.value) || undefined}})}/></div>}
                                                {selectedProfile.hasHeight && <div><label className="text-[9px] font-black text-slate-400 uppercase">Hoogte</label><input type="number" step="0.1" className="w-full p-3 rounded-xl border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white font-mono font-bold outline-none" value={rmForm.dimensions?.height || ''} onChange={e => setRmFormWithDesc({dimensions: {...(rmForm.dimensions||{}), height: parseFloat(e.target.value) || undefined}})}/></div>}
                                                {selectedProfile.hasLength && <div><label className="text-[9px] font-black text-slate-400 uppercase">Lengte</label><input type="number" step="0.1" className="w-full p-3 rounded-xl border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white font-mono font-bold outline-none" value={rmForm.dimensions?.length || ''} onChange={e => setRmFormWithDesc({dimensions: {...(rmForm.dimensions||{}), length: parseFloat(e.target.value) || undefined}})}/></div>}
                                                {selectedProfile.hasThickness && <div><label className="text-[9px] font-black text-slate-400 uppercase">Dikte</label><input type="number" step="0.1" className="w-full p-3 rounded-xl border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white font-mono font-bold outline-none" value={rmForm.dimensions?.thickness || ''} onChange={e => setRmFormWithDesc({dimensions: {...(rmForm.dimensions||{}), thickness: parseFloat(e.target.value) || undefined}})}/></div>}
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Aantal *</label><input required type="number" min="0" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-black text-center text-xl outline-none focus:ring-2 focus:ring-blue-500" value={rmForm.stock ?? ''} onChange={e => setRmForm({...rmForm, stock: parseInt(e.target.value) || 0})} /></div>
                                        <div className="relative">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Locatie</label>
                                            <input
                                                type="text"
                                                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-black uppercase outline-none focus:ring-2 focus:ring-blue-500"
                                                value={locDropOpen ? locSearch : (rmForm.location || '')}
                                                onFocus={() => { setLocDropOpen(true); setLocSearch(rmForm.location || ''); }}
                                                onChange={e => { setLocSearch(e.target.value); setLocDropOpen(true); setRmForm({...rmForm, location: e.target.value}); }}
                                                onBlur={() => setTimeout(() => setLocDropOpen(false), 200)}
                                                placeholder="Zoek of typ locatie..."
                                            />
                                            {locDropOpen && (() => {
                                                const q = locSearch.toLowerCase();
                                                const filtered = storageLocations.filter(l =>
                                                    l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q) || (l.zone || '').toLowerCase().includes(q)
                                                );
                                                return filtered.length > 0 ? (
                                                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">
                                                        {filtered.map(loc => (
                                                            <button key={loc.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setRmForm({...rmForm, location: loc.code}); setLocDropOpen(false); }} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                                                <span className="font-black text-xs text-slate-800 dark:text-white uppercase">{loc.code}</span>
                                                                <span className="text-[10px] text-slate-400 truncate">{loc.name}</span>
                                                                {loc.zone && <span className="text-[9px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-1.5 py-0.5 rounded-lg ml-auto shrink-0">{loc.zone}</span>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Herkomst</label>
                                            <select className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" value={rmForm.source || 'NIEUW'} onChange={e => setRmForm({...rmForm, source: e.target.value})}>
                                                <option value="NIEUW">Nieuw materiaal</option>
                                                <option value="RESTMATERIAAL">Restmateriaal</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Gewicht (kg)</label><input type="number" step="0.01" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500" value={rmForm.weight ?? ''} onChange={e => setRmForm({...rmForm, weight: parseFloat(e.target.value) || undefined})} /></div>
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Prijs/kg (€)</label><input type="number" step="0.01" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500" value={rmForm.pricePerKg ?? ''} onChange={e => setRmForm({...rmForm, pricePerKg: parseFloat(e.target.value) || undefined})} /></div>
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Leverancier</label><input type="text" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" value={rmForm.supplier || ''} onChange={e => setRmForm({...rmForm, supplier: e.target.value})} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Productie Order Nr</label><input type="text" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" value={rmForm.productionOrderNr || ''} onChange={e => setRawModal({...rmForm, productionOrderNr: e.target.value})} placeholder="PO-2026-001" /></div>
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Inkoop Order Nr</label><input type="text" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" value={rmForm.purchaseOrderNr || ''} onChange={e => setRawModal({...rmForm, purchaseOrderNr: e.target.value})} placeholder="IO-2026-050" /></div>
                                    </div>

                                    {/* Materiaal Certificaat */}
                                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-800/50">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-[0.2em] flex items-center gap-2"><FileText size={14} /> Materiaal Certificaten</label>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => setShowCertLibrary(true)} className="text-[9px] font-bold text-green-600 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-green-200 dark:border-green-700 hover:bg-green-50 transition-colors">Koppel uit DMS</button>
                                                <input type="file" ref={certInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff" onChange={async (e) => {
                                                    const file = e.target.files?.[0]; if (!file) return;
                                                    setIsUploadingCert(true);
                                                    try {
                                                        const reader = new FileReader();
                                                        reader.onload = async () => {
                                                            const doc = await documentService.addDocumentFromBase64(file.name, file.type, reader.result as string, file.size);
                                                            setRawModal({...rmForm, certificateDocIds: [...(rmForm.certificateDocIds || []), doc.id]});
                                                        };
                                                        reader.readAsDataURL(file);
                                                    } finally { setIsUploadingCert(false); if (certInputRef.current) certInputRef.current.value = ''; }
                                                }} />
                                                <button type="button" onClick={() => certInputRef.current?.click()} disabled={isUploadingCert} className="text-[9px] font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-xl shadow-sm transition-all disabled:opacity-50">{isUploadingCert ? 'Uploaden...' : 'Upload'}</button>
                                            </div>
                                        </div>
                                        {(rmForm.certificateDocIds || []).length > 0 ? (
                                            <div className="space-y-2">
                                                {(rmForm.certificateDocIds || []).map(docId => {
                                                    const doc = allDocs.find(d => d.id === docId);
                                                    return doc ? (
                                                        <div key={docId} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-slate-700">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <FileText size={14} className="text-green-600 shrink-0" />
                                                                <span className="text-xs font-bold text-slate-700 dark:text-white truncate">{doc.name}</span>
                                                                {doc.documentNumber && <span className="text-[9px] font-mono text-green-500 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-lg shrink-0">{doc.documentNumber}</span>}
                                                            </div>
                                                            <div className="flex gap-1 shrink-0">
                                                                {doc.url && <button type="button" onClick={() => window.open(doc.url, '_blank')} className="p-1 text-slate-400 hover:text-blue-600 rounded-lg"><Eye size={12} /></button>}
                                                                <button type="button" onClick={() => setRawModal({...rmForm, certificateDocIds: (rmForm.certificateDocIds || []).filter(id => id !== docId)})} className="p-1 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 size={12} /></button>
                                                            </div>
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-slate-400 text-center py-3">Nog geen certificaten gekoppeld</p>
                                        )}
                                    </div>

                                    <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Notities</label><input type="text" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" value={rmForm.notes || ''} onChange={e => setRawModal({...rmForm, notes: e.target.value})} placeholder="Optionele opmerkingen" /></div>
                                    <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                        <button type="button" onClick={() => setRawModal(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-800 transition-colors">Annuleren</button>
                                        <button type="submit" className="flex-[2] px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"><Save size={16} /> Opslaan</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                );
            })()}
            {showCertLibrary && (
                <DocumentLibraryModal
                    onClose={() => setShowCertLibrary(false)}
                    onSelect={(doc) => {
                        setShowCertLibrary(false);
                        if (rawModal && typeof rawModal === 'object') {
                            const existing = rawModal.certificateDocIds || [];
                            if (!existing.includes(doc.id)) {
                                setRawModal({...rawModal, certificateDocIds: [...existing, doc.id]});
                            }
                        }
                    }}
                />
            )}

            {/* ── Afname Modal ── */}
            {withdrawModal && (() => {
                const rm = withdrawModal;
                return (
                    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <Package size={20} className="text-blue-600" /> Materiaal Afname
                                </h3>
                                <button onClick={() => setWithdrawModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                    <p className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">{rm.description}</p>
                                    <p className="text-xs text-slate-400 mt-1">Huidige voorraad: <span className="font-black text-blue-600">{rm.stock} st.</span></p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Aantal af te nemen *</label>
                                    <input type="number" min={1} max={rm.stock} required value={withdrawQty} onChange={e => setWithdrawQty(Math.min(rm.stock, Math.max(1, parseInt(e.target.value) || 1)))} className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white font-black text-center text-2xl outline-none focus:ring-2 focus:ring-blue-500" />
                                    <p className="text-[10px] text-slate-400 text-center mt-1">Na afname: <span className="font-black text-slate-600 dark:text-slate-300">{rm.stock - withdrawQty} st.</span> resterend</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Productie Order Nr *</label>
                                    <input type="text" required value={withdrawPO} onChange={e => setWithdrawPO(e.target.value)} placeholder="PO-2026-001" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Notitie</label>
                                    <input type="text" value={withdrawNote} onChange={e => setWithdrawNote(e.target.value)} placeholder="Optioneel" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button type="button" onClick={() => setWithdrawModal(false)} className="flex-1 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Annuleren</button>
                                    <button type="button" onClick={handleWithdraw} disabled={!withdrawPO.trim() || withdrawQty < 1} className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"><Package size={16} /> Afnemen</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Info Modal (read-only, voor alle gebruikers) ── */}
            {infoModal && (() => {
                const rm = infoModal;
                const txs = [...(rm.transactions || [])].reverse();
                const txTypeConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
                    CREATED:     { label: 'Aangemaakt',  color: 'text-green-700',  bg: 'bg-green-50 dark:bg-green-900/20',   dot: 'bg-green-500' },
                    RESTOCK:     { label: 'Opboeking',   color: 'text-teal-700',   bg: 'bg-teal-50 dark:bg-teal-900/20',     dot: 'bg-teal-500' },
                    WITHDRAWAL:  { label: 'Afname',      color: 'text-blue-700',   bg: 'bg-blue-50 dark:bg-blue-900/20',     dot: 'bg-blue-500' },
                    TRANSFER:    { label: 'Verplaatst',  color: 'text-amber-700',  bg: 'bg-amber-50 dark:bg-amber-900/20',   dot: 'bg-amber-500' },
                    EDIT:        { label: 'Bewerkt',     color: 'text-slate-600',  bg: 'bg-slate-50 dark:bg-slate-700/50',   dot: 'bg-slate-400' },
                    STOCK_ADJUST:{ label: 'Aanpassing',  color: 'text-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20', dot: 'bg-purple-500' },
                };
                const dims = formatDimensions(rm.dimensions);
                return (
                    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">

                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                        <Info size={20} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">{rm.description}</h3>
                                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest">Materiaalinformatie · Alleen lezen</p>
                                    </div>
                                </div>
                                <button onClick={() => setInfoModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto">

                                {/* Materiaal details */}
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Materiaalgegevens</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Materiaalsoort', value: rm.materialTypeName },
                                            { label: 'Profielvorm',    value: rm.profileName },
                                            { label: 'Afmetingen',     value: dims || '—' },
                                            { label: 'Locatie',        value: rm.location || '—' },
                                            { label: 'Herkomst',       value: rm.source === 'RESTMATERIAAL' ? 'Restmateriaal' : 'Nieuw' },
                                            { label: 'Voorraad',       value: `${rm.stock} st.` },
                                        ].map(item => (
                                            <div key={item.label} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3.5">
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</div>
                                                <div className="text-sm font-black text-slate-800 dark:text-white">{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Orders & Leverancier */}
                                {(rm.productionOrderNr || rm.purchaseOrderNr || rm.supplier) && (
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Orders & Leverancier</p>
                                        <div className="space-y-2.5">
                                            {rm.productionOrderNr && (
                                                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/10 rounded-2xl px-4 py-3">
                                                    <ClipboardList size={16} className="text-blue-500 shrink-0" />
                                                    <div>
                                                        <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Productie Order</div>
                                                        <div className="text-sm font-black text-blue-800 dark:text-blue-300">{rm.productionOrderNr}</div>
                                                    </div>
                                                </div>
                                            )}
                                            {rm.purchaseOrderNr && (
                                                <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/10 rounded-2xl px-4 py-3">
                                                    <ShoppingCart size={16} className="text-purple-500 shrink-0" />
                                                    <div>
                                                        <div className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Inkoop Order</div>
                                                        <div className="text-sm font-black text-purple-800 dark:text-purple-300">{rm.purchaseOrderNr}</div>
                                                    </div>
                                                </div>
                                            )}
                                            {rm.supplier && (
                                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-3">
                                                    <Building2 size={16} className="text-slate-500 shrink-0" />
                                                    <div>
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Leverancier</div>
                                                        <div className="text-sm font-black text-slate-800 dark:text-white">{rm.supplier}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Notities */}
                                {rm.notes && (
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                            <StickyNote size={12} /> Notities
                                        </p>
                                        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-2xl p-4">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{rm.notes}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Batch / transactie overzicht */}
                                <div className="p-6">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <History size={12} /> Batches & Transacties
                                        <span className="ml-auto bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-black px-2 py-0.5 rounded-full">{txs.length}</span>
                                    </p>
                                    {txs.length > 0 ? (
                                        <div className="space-y-2.5">
                                            {txs.map(tx => {
                                                const cfg = txTypeConfig[tx.type] || txTypeConfig.EDIT;
                                                return (
                                                    <div key={tx.id} className={`rounded-2xl border border-slate-100 dark:border-slate-700 ${cfg.bg} p-4`}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                                                <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                                                                {tx.batchNr && <span className="text-[9px] font-black font-mono text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-lg">{tx.batchNr}</span>}
                                                            </div>
                                                            <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                                                {new Date(tx.performedAt).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 items-center">
                                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{tx.performedBy}</span>
                                                            {tx.quantity != null && (
                                                                <span className="text-xs font-black bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-lg text-slate-800 dark:text-white">
                                                                    {tx.type === 'RESTOCK' ? '+' : tx.type === 'TRANSFER' ? '' : tx.type === 'CREATED' ? '' : '-'}{tx.quantity} st.
                                                                </span>
                                                            )}
                                                            {tx.type === 'TRANSFER' && tx.fromLocation && tx.toLocation && (
                                                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-lg">
                                                                    {tx.fromLocation} → {tx.toLocation}
                                                                </span>
                                                            )}
                                                            {tx.type !== 'TRANSFER' && tx.previousStock != null && tx.newStock != null && (
                                                                <span className="text-[10px] font-mono text-slate-400">{tx.previousStock} → {tx.newStock} st.</span>
                                                            )}
                                                        </div>
                                                        {/* PO / IO per transactie */}
                                                        {(tx.productionOrderNr || tx.purchaseOrderNr) && (
                                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                                {tx.productionOrderNr && (
                                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                                        <ClipboardList size={10} /> PO: {tx.productionOrderNr}
                                                                    </span>
                                                                )}
                                                                {tx.purchaseOrderNr && (
                                                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                                        <ShoppingCart size={10} /> IO: {tx.purchaseOrderNr}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {/* Certificaten */}
                                                        {tx.certificateDocIds && tx.certificateDocIds.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                                {tx.certificateDocIds.map(cId => {
                                                                    const doc = allDocs.find(d => d.id === cId);
                                                                    return doc ? (
                                                                        <span key={cId} className="inline-flex items-center gap-1 text-[9px] font-bold text-green-700 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-lg">
                                                                            <FileText size={9} /> {doc.name}
                                                                            {doc.url && <button onClick={() => window.open(doc.url, '_blank')} className="text-green-500 hover:text-green-700"><Eye size={9} /></button>}
                                                                        </span>
                                                                    ) : null;
                                                                })}
                                                            </div>
                                                        )}
                                                        {tx.note && <p className="text-[10px] text-slate-400 mt-1.5 italic">{tx.note}</p>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-10 text-center text-slate-400">
                                            <History size={36} className="mx-auto opacity-10 mb-3" />
                                            <p className="text-xs font-bold">Nog geen transacties</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
                                <button onClick={() => setInfoModal(false)} className="w-full py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Sluiten</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Historie Modal ── */}
            {historyModal && (() => {
                const rm = historyModal;
                const txs = [...(rm.transactions || [])].reverse();
                const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
                    CREATED: { label: 'Aangemaakt', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                    WITHDRAWAL: { label: 'Afname', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    RESTOCK: { label: 'Opgeboekt', color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
                    EDIT: { label: 'Bewerkt', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    STOCK_ADJUST: { label: 'Voorraad', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                    TRANSFER: { label: 'Verplaatst', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                    ZAAG:     { label: 'Gezaagd',    color: 'text-rose-600',   bg: 'bg-rose-50 dark:bg-rose-900/20' }
                };
                return (
                    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 max-h-[80vh] flex flex-col">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <History size={20} className="text-slate-500" /> Transactiegeschiedenis
                                </h3>
                                <button onClick={() => setHistoryModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={20} /></button>
                            </div>
                            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shrink-0">
                                <p className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">{rm.description}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Huidige voorraad: <span className="font-black text-blue-600">{rm.stock} st.</span> — {txs.length} transactie(s)</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {txs.length > 0 ? (
                                    <div className="space-y-3">
                                        {txs.map(tx => {
                                            const cfg = typeConfig[tx.type] || typeConfig.EDIT;
                                            return (
                                                <div key={tx.id} className={`p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700 ${cfg.bg} ${tx.batchNr ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all' : ''}`} onClick={() => tx.batchNr ? setBatchDetail(tx) : undefined}>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                                                            {tx.batchNr && <span className="text-[9px] font-black font-mono text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-lg">{tx.batchNr}</span>}
                                                        </div>
                                                        <span className="text-[9px] font-mono text-slate-400">{new Date(tx.performedAt).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{tx.performedBy}</span>
                                                        {tx.quantity != null && <span className={`text-xs font-black text-slate-800 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-600`}>{tx.type === 'RESTOCK' ? '+' : tx.type === 'TRANSFER' ? '' : '-'}{tx.quantity} st.</span>}
                                                        {tx.type === 'TRANSFER' && tx.fromLocation && tx.toLocation && (
                                                            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                                <RefreshCw size={10} /> {tx.fromLocation} → {tx.toLocation}
                                                            </span>
                                                        )}
                                                        {tx.type !== 'TRANSFER' && tx.previousStock != null && tx.newStock != null && <span className="text-[10px] font-mono text-slate-400">{tx.previousStock} → {tx.newStock}</span>}
                                                        {tx.productionOrderNr && <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg">PO: {tx.productionOrderNr}</span>}
                                                        {tx.purchaseOrderNr && <span className="text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-lg">IO: {tx.purchaseOrderNr}</span>}
                                                    </div>
                                                    {tx.certificateDocIds && tx.certificateDocIds.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                            {tx.certificateDocIds.map(cId => {
                                                                const cdoc = allDocs.find(d => d.id === cId);
                                                                return cdoc ? (
                                                                    <span key={cId} className="inline-flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-lg">
                                                                        <FileText size={10} />{cdoc.name}
                                                                        {cdoc.url && <button onClick={(e) => { e.stopPropagation(); window.open(cdoc.url, '_blank'); }} className="text-green-400 hover:text-green-600"><Eye size={10} /></button>}
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    )}
                                                    {tx.note && <p className="text-[10px] text-slate-400 mt-1.5 italic">{tx.note}</p>}
                                                    {tx.batchNr && <p className="text-[8px] text-blue-400 mt-1 font-bold">Klik voor batch details →</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-slate-400">
                                        <History size={40} className="mx-auto opacity-10 mb-3" />
                                        <p className="text-xs font-bold">Nog geen transacties vastgelegd</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
                                <button onClick={() => setHistoryModal(false)} className="w-full py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Sluiten</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Zaag Modal ── */}
            {zaagModal && (() => {
                const rm = zaagModal;
                const srcLen = rm.dimensions?.length;
                const filteredZaagLocs = (storageLocations || []).filter(l =>
                    zaagLocSearch === '' || l.code.toLowerCase().includes(zaagLocSearch.toLowerCase()) || (l.name || '').toLowerCase().includes(zaagLocSearch.toLowerCase())
                );
                const piecesPerBar = srcLen && zaagTargetLength > 0 ? Math.floor(srcLen / zaagTargetLength) : null;
                const totalPieces = piecesPerBar !== null ? piecesPerBar * Math.min(zaagSourceQty, rm.stock) : null;
                return (
                    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col">

                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <Scissors size={20} className="text-rose-500" /> Materiaal Zagen
                                </h3>
                                <button onClick={() => setZaagModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={20} /></button>
                            </div>

                            {/* Material info */}
                            <div className="px-6 py-3 bg-rose-50 dark:bg-rose-900/10 border-b border-rose-100 dark:border-rose-800/30 shrink-0">
                                <p className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">{rm.description}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span className="flex items-center gap-1"><MapPin size={10} /> {rm.location || 'Onbekend'}</span>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <span>Voorraad: <strong className="text-slate-700 dark:text-slate-200">{rm.stock} st.</strong></span>
                                    {srcLen && <><span className="text-slate-300 dark:text-slate-600">·</span><span>Bronlengte: <strong className="text-rose-600">{srcLen} mm</strong></span></>}
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5">

                                {/* Te verbruiken */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                                        Te verbruiken bronmateriaal
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input type="number" min={1} max={rm.stock} value={zaagSourceQty}
                                            onChange={e => setZaagSourceQty(Math.max(1, Math.min(rm.stock, parseInt(e.target.value) || 1)))}
                                            className="w-24 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white font-black text-lg text-center outline-none focus:ring-2 focus:ring-rose-500" />
                                        <span className="text-sm font-bold text-slate-400">st. van {rm.stock}</span>
                                    </div>
                                </div>

                                {/* Zaaglengte */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                            Gewenste zaaglengte <span className="text-rose-500">*</span>
                                        </label>
                                        {zaagLenLocked && (
                                            <button type="button" onClick={() => setZaagLenLocked(false)}
                                                className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors">
                                                <Lock size={10} /> Vergrendeld — klik om te ontgrendelen
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input type="number" min={1} value={zaagTargetLength}
                                                disabled={zaagLenLocked}
                                                onChange={e => {
                                                    const newLen = Math.max(1, parseInt(e.target.value) || 1);
                                                    setZaagTargetLength(newLen);
                                                    // Auto-bereken qty en vergrendel dat veld
                                                    if (rm.dimensions?.length) {
                                                        const perBar = Math.floor(rm.dimensions.length / newLen);
                                                        setZaagTargetQty(perBar * Math.min(zaagSourceQty, rm.stock));
                                                        setZaagQtyLocked(true);
                                                    }
                                                    setZaagLenLocked(false);
                                                }}
                                                className={`w-32 p-3.5 rounded-2xl border font-black text-lg text-center outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
                                                    zaagLenLocked
                                                        ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700 text-amber-600 dark:text-amber-400 cursor-not-allowed'
                                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white'
                                                }`} />
                                            {zaagLenLocked && <Lock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />}
                                        </div>
                                        <span className="text-sm font-bold text-slate-400">mm</span>
                                        {piecesPerBar !== null && !zaagLenLocked && (
                                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-xl flex items-center gap-1">
                                                <Ruler size={11} /> {piecesPerBar} st. per bron
                                            </span>
                                        )}
                                        {!zaagLenLocked && !zaagQtyLocked && (
                                            <button type="button" onClick={() => { setZaagLenLocked(true); setZaagQtyLocked(false); }}
                                                title="Vergrendel lengte"
                                                className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                                <LockOpen size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Aantal zaagstukken */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                            Aantal zaagstukken aan te maken <span className="text-rose-500">*</span>
                                        </label>
                                        {zaagQtyLocked && (
                                            <button type="button" onClick={() => setZaagQtyLocked(false)}
                                                className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors">
                                                <Lock size={10} /> Vergrendeld — klik om te ontgrendelen
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input type="number" min={1} value={zaagTargetQty}
                                                disabled={zaagQtyLocked}
                                                onChange={e => {
                                                    const newQty = Math.max(1, parseInt(e.target.value) || 1);
                                                    setZaagTargetQty(newQty);
                                                    // Vergrendel lengte, ontgrendel qty
                                                    setZaagLenLocked(true);
                                                    setZaagQtyLocked(false);
                                                }}
                                                className={`w-24 p-3.5 rounded-2xl border font-black text-lg text-center outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
                                                    zaagQtyLocked
                                                        ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700 text-amber-600 dark:text-amber-400 cursor-not-allowed'
                                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white'
                                                }`} />
                                            {zaagQtyLocked && <Lock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />}
                                        </div>
                                        <span className="text-sm font-bold text-slate-400">st.</span>
                                        {!zaagQtyLocked && !zaagLenLocked && totalPieces !== null && (
                                            <button type="button" onClick={() => { setZaagTargetQty(totalPieces); setZaagQtyLocked(true); }}
                                                className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 px-3 py-1.5 rounded-xl transition-colors">
                                                Max: {totalPieces} st. invullen
                                            </button>
                                        )}
                                        {!zaagQtyLocked && !zaagLenLocked && (
                                            <button type="button" onClick={() => { setZaagLenLocked(true); setZaagQtyLocked(false); }}
                                                title="Vergrendel aantal"
                                                className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                                <LockOpen size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Locatie */}
                                <div className="relative">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                                        Locatie voor zaagstukken <span className="text-rose-500">*</span>
                                    </label>
                                    <input type="text"
                                        className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-rose-500"
                                        placeholder="Zoek of typ een locatie..."
                                        value={zaagLocDropOpen ? zaagLocSearch : zaagLocation}
                                        onFocus={() => { setZaagLocDropOpen(true); setZaagLocSearch(zaagLocation); }}
                                        onChange={e => { setZaagLocSearch(e.target.value); setZaagLocation(e.target.value); setZaagLocDropOpen(true); }}
                                        onBlur={() => setTimeout(() => setZaagLocDropOpen(false), 150)}
                                    />
                                    {zaagLocDropOpen && filteredZaagLocs.length > 0 && (
                                        <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 max-h-44 overflow-y-auto">
                                            {filteredZaagLocs.map(loc => (
                                                <button key={loc.id} type="button" onMouseDown={e => e.preventDefault()}
                                                    onClick={() => { setZaagLocation(loc.code); setZaagLocDropOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                                    <MapPin size={14} className="text-rose-400 shrink-0" />
                                                    <div>
                                                        <span className="text-sm font-black text-slate-800 dark:text-white">{loc.code}</span>
                                                        {loc.name && <span className="text-[10px] text-slate-400 ml-2">{loc.name}</span>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Notitie */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Notitie (optioneel)</label>
                                    <input type="text" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-rose-500"
                                        value={zaagNote} onChange={e => setZaagNote(e.target.value)} placeholder="Bijv. voor project X, afval retour naar magazijn..." />
                                </div>

                                {/* Resultaat preview */}
                                {zaagLocation && zaagTargetLength > 0 && zaagTargetQty > 0 && (
                                    <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 rounded-2xl p-4 space-y-2">
                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Resultaat</p>
                                        <div className="flex items-center gap-3 flex-wrap text-sm">
                                            <div className="text-center">
                                                <div className="text-[9px] text-slate-400 uppercase font-black">Bron</div>
                                                <div className="font-black text-slate-700 dark:text-white">-{Math.min(zaagSourceQty, rm.stock)} st.</div>
                                                <div className="text-[9px] text-slate-400">{rm.stock - Math.min(zaagSourceQty, rm.stock)} resterend</div>
                                            </div>
                                            <Scissors size={18} className="text-rose-400 shrink-0" />
                                            <div className="text-center">
                                                <div className="text-[9px] text-slate-400 uppercase font-black">Nieuw</div>
                                                <div className="font-black text-rose-600">{zaagTargetQty} st. × {zaagTargetLength}mm</div>
                                                <div className="text-[9px] text-slate-400">{zaagLocation}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setZaagModal(false)} className="flex-1 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Annuleren</button>
                                    <button type="button" onClick={handleZaag}
                                        disabled={!zaagLocation.trim() || zaagTargetLength < 1 || zaagTargetQty < 1}
                                        className="flex-[2] py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                        <Scissors size={16} /> Zagen & Opslaan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Transfer Modal ── */}
            {transferModal && (() => {
                const rm = transferModal;
                const effQty = transferAll ? rm.stock : Math.min(transferQty, rm.stock);
                const filteredTransferLocs = (storageLocations || []).filter(l =>
                    l.code !== rm.location &&
                    (transferLocSearch === '' || l.code.toLowerCase().includes(transferLocSearch.toLowerCase()) || (l.name || '').toLowerCase().includes(transferLocSearch.toLowerCase()))
                );
                return (
                    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <RefreshCw size={20} className="text-amber-500" /> Voorraad Verplaatsen
                                </h3>
                                <button onClick={() => setTransferModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={20} /></button>
                            </div>
                            <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/30">
                                <p className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">{rm.description}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                    <MapPin size={10} /> Huidige locatie: <span className="font-black text-amber-600">{rm.location || 'Onbekend'}</span>
                                    <span className="text-slate-300 dark:text-slate-600">·</span> Voorraad: <span className="font-black text-slate-700 dark:text-slate-200">{rm.stock} st.</span>
                                </p>
                            </div>
                            <div className="p-6 space-y-5">
                                {/* Hoeveelheid */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Hoeveelheid</label>
                                    <div className="flex gap-3 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setTransferAll(true)}
                                            className={`flex-1 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 ${transferAll ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-amber-300'}`}
                                        >
                                            Alles ({rm.stock} st.)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTransferAll(false)}
                                            className={`flex-1 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 ${!transferAll ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-amber-300'}`}
                                        >
                                            Deelhoeveelheid
                                        </button>
                                    </div>
                                    {!transferAll && (
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                min={1}
                                                max={rm.stock}
                                                value={transferQty}
                                                onChange={e => setTransferQty(Math.max(1, Math.min(rm.stock, parseInt(e.target.value) || 1)))}
                                                className="w-28 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-black text-lg text-center outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                            <span className="text-sm font-bold text-slate-400">st. van {rm.stock}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Nieuwe locatie */}
                                <div className="relative">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Nieuwe locatie <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-amber-500"
                                        placeholder="Zoek of typ een locatie..."
                                        value={transferLocDropOpen ? transferLocSearch : transferToLocation}
                                        onFocus={() => { setTransferLocDropOpen(true); setTransferLocSearch(transferToLocation); }}
                                        onChange={e => { setTransferLocSearch(e.target.value); setTransferToLocation(e.target.value); setTransferLocDropOpen(true); }}
                                        onBlur={() => setTimeout(() => setTransferLocDropOpen(false), 150)}
                                    />
                                    {transferLocDropOpen && filteredTransferLocs.length > 0 && (
                                        <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 max-h-44 overflow-y-auto">
                                            {filteredTransferLocs.map(loc => (
                                                <button key={loc.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setTransferToLocation(loc.code); setTransferLocDropOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                                    <MapPin size={14} className="text-amber-400 shrink-0" />
                                                    <div>
                                                        <span className="text-sm font-black text-slate-800 dark:text-white">{loc.code}</span>
                                                        {loc.name && <span className="text-[10px] text-slate-400 ml-2">{loc.name}</span>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Notitie */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Notitie (optioneel)</label>
                                    <input type="text" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-amber-500"
                                        value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="Reden van verplaatsing..." />
                                </div>

                                {/* Preview */}
                                {transferToLocation && (
                                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 flex items-center gap-3">
                                        <div className="text-center">
                                            <div className="text-[10px] font-black text-slate-400 uppercase">Van</div>
                                            <div className="text-lg font-black text-slate-700 dark:text-white">{rm.location || '?'}</div>
                                        </div>
                                        <RefreshCw size={20} className="text-amber-400 shrink-0" />
                                        <div className="text-center">
                                            <div className="text-[10px] font-black text-slate-400 uppercase">Naar</div>
                                            <div className="text-lg font-black text-amber-600">{transferToLocation}</div>
                                        </div>
                                        <div className="ml-auto text-center">
                                            <div className="text-[10px] font-black text-slate-400 uppercase">Aantal</div>
                                            <div className="text-lg font-black text-slate-700 dark:text-white">{effQty} st.</div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setTransferModal(false)} className="flex-1 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Annuleren</button>
                                    <button type="button" onClick={handleTransfer} disabled={!transferToLocation.trim() || transferToLocation === rm.location || effQty < 1}
                                        className="flex-[2] py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                        <RefreshCw size={16} /> Verplaatsen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Batch Detail Modal ── */}
            {batchDetail && (() => {
                const tx = batchDetail;
                const cfg = ({
                    WITHDRAWAL: { label: 'Afname', color: 'text-blue-600', border: 'border-blue-200 dark:border-blue-800' },
                    RESTOCK: { label: 'Opboeking', color: 'text-teal-600', border: 'border-teal-200 dark:border-teal-800' }
                } as Record<string, { label: string; color: string; border: string }>)[tx.type] || { label: tx.type, color: 'text-slate-600', border: 'border-slate-200 dark:border-slate-700' };
                return (
                    <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <Package size={20} className="text-blue-600" /> Batch Details
                                </h3>
                                <button onClick={() => setBatchDetail(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Batch Nr Header */}
                                <div className="text-center bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Batch Nummer</p>
                                    <p className="text-2xl font-black font-mono text-blue-700 dark:text-blue-300 tracking-wider">{tx.batchNr}</p>
                                </div>

                                {/* Detail Rows */}
                                <div className={`rounded-2xl border ${cfg.border} divide-y divide-slate-100 dark:divide-slate-700/50 overflow-hidden`}>
                                    <div className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</span>
                                        <span className={`text-xs font-black uppercase ${cfg.color}`}>{cfg.label}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-4 py-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Datum & Tijd</span>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{new Date(tx.performedAt).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-4 py-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uitgevoerd door</span>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{tx.performedBy}</span>
                                    </div>
                                    {tx.quantity != null && (
                                        <div className="flex justify-between items-center px-4 py-3">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aantal</span>
                                            <span className="text-sm font-black text-slate-800 dark:text-white">{tx.type === 'RESTOCK' ? '+' : '-'}{tx.quantity} st.</span>
                                        </div>
                                    )}
                                    {tx.previousStock != null && tx.newStock != null && (
                                        <div className="flex justify-between items-center px-4 py-3">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voorraadverloop</span>
                                            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{tx.previousStock} → {tx.newStock} st.</span>
                                        </div>
                                    )}
                                    {tx.productionOrderNr && (
                                        <div className="flex justify-between items-center px-4 py-3">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Productie Order</span>
                                            <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg">{tx.productionOrderNr}</span>
                                        </div>
                                    )}
                                    {tx.purchaseOrderNr && (
                                        <div className="flex justify-between items-center px-4 py-3">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inkoop Order</span>
                                            <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-lg">{tx.purchaseOrderNr}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Certificates */}
                                {tx.certificateDocIds && tx.certificateDocIds.length > 0 && (
                                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-800/50">
                                        <p className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-[0.2em] mb-2.5 flex items-center gap-1.5"><FileText size={12} /> Certificaten</p>
                                        <div className="space-y-2">
                                            {tx.certificateDocIds.map(cId => {
                                                const cdoc = allDocs.find(d => d.id === cId);
                                                return cdoc ? (
                                                    <div key={cId} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-slate-700">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <FileText size={14} className="text-green-600 shrink-0" />
                                                            <span className="text-xs font-bold text-slate-700 dark:text-white truncate">{cdoc.name}</span>
                                                        </div>
                                                        {cdoc.url && <button onClick={() => window.open(cdoc.url, '_blank')} className="p-1.5 text-green-500 hover:text-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"><Eye size={14} /></button>}
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Note */}
                                {tx.note && (
                                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1">Notitie</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">{tx.note}</p>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button onClick={() => setBatchDetail(null)} className="w-full py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700">Terug naar Historie</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Opboeken Modal ── */}
            {restockModal && (() => {
                const rm = restockModal;
                return (
                    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <Plus size={20} className="text-teal-600" /> Voorraad Opboeken
                                </h3>
                                <button onClick={() => setRestockModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="bg-teal-50 dark:bg-teal-900/10 p-4 rounded-2xl border border-teal-100 dark:border-teal-800/50">
                                    <p className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">{rm.description}</p>
                                    <p className="text-xs text-slate-400 mt-1">Huidige voorraad: <span className="font-black text-teal-600">{rm.stock} st.</span></p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Aantal op te boeken *</label>
                                    <input type="number" min={1} required value={restockQty} onChange={e => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white font-black text-center text-2xl outline-none focus:ring-2 focus:ring-teal-500" />
                                    <p className="text-[10px] text-slate-400 text-center mt-1">Na opboeking: <span className="font-black text-teal-600">{rm.stock + restockQty} st.</span></p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Productie Order Nr</label>
                                        <input type="text" value={restockPO} onChange={e => setRestockPO(e.target.value)} placeholder="PO-2026-001" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-teal-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Inkoop Order Nr</label>
                                        <input type="text" value={restockIO} onChange={e => setRestockIO(e.target.value)} placeholder="IO-2026-050" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-teal-500" />
                                    </div>
                                </div>

                                {/* Certificaat upload */}
                                <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-800/50">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-[0.2em] flex items-center gap-2"><FileText size={14} /> Materiaal Certificaten</label>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setShowRestockCertLibrary(true)} className="text-[9px] font-bold text-green-600 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-green-200 dark:border-green-700 hover:bg-green-50 transition-colors">Koppel uit DMS</button>
                                            <input type="file" ref={restockCertInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff" onChange={async (e) => {
                                                const file = e.target.files?.[0]; if (!file) return;
                                                setIsUploadingRestockCert(true);
                                                try {
                                                    const reader = new FileReader();
                                                    reader.onload = async () => {
                                                        const doc = await documentService.addDocumentFromBase64(file.name, file.type, reader.result as string, file.size);
                                                        setRestockCertIds(prev => [...prev, doc.id]);
                                                    };
                                                    reader.readAsDataURL(file);
                                                } finally { setIsUploadingRestockCert(false); if (restockCertInputRef.current) restockCertInputRef.current.value = ''; }
                                            }} />
                                            <button type="button" onClick={() => restockCertInputRef.current?.click()} disabled={isUploadingRestockCert} className="text-[9px] font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-xl shadow-sm transition-all disabled:opacity-50">{isUploadingRestockCert ? 'Uploaden...' : 'Upload'}</button>
                                        </div>
                                    </div>
                                    {restockCertIds.length > 0 ? (
                                        <div className="space-y-2">
                                            {restockCertIds.map(docId => {
                                                const doc = allDocs.find(d => d.id === docId);
                                                return doc ? (
                                                    <div key={docId} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-slate-700">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <FileText size={14} className="text-green-600 shrink-0" />
                                                            <span className="text-xs font-bold text-slate-700 dark:text-white truncate">{doc.name}</span>
                                                        </div>
                                                        <div className="flex gap-1 shrink-0">
                                                            {doc.url && <button type="button" onClick={() => window.open(doc.url, '_blank')} className="p-1 text-slate-400 hover:text-blue-600 rounded-lg"><Eye size={12} /></button>}
                                                            <button type="button" onClick={() => setRestockCertIds(prev => prev.filter(id => id !== docId))} className="p-1 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 size={12} /></button>
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-slate-400 text-center py-3">Nog geen certificaten gekoppeld</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Notitie</label>
                                    <input type="text" value={restockNote} onChange={e => setRestockNote(e.target.value)} placeholder="Optioneel — bijv. restmateriaal uit productie" className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-teal-500" />
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button type="button" onClick={() => setRestockModal(false)} className="flex-1 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Annuleren</button>
                                    <button type="button" onClick={handleRestock} disabled={restockQty < 1} className="flex-[2] py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-teal-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"><Plus size={16} /> Opboeken</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* DMS Library voor Restock certificaten */}
            {showRestockCertLibrary && (
                <DocumentLibraryModal
                    onClose={() => setShowRestockCertLibrary(false)}
                    onSelect={(doc) => {
                        setShowRestockCertLibrary(false);
                        if (!restockCertIds.includes(doc.id)) {
                            setRestockCertIds(prev => [...prev, doc.id]);
                        }
                    }}
                />
            )}
        </div>
    );
};