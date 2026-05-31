/**
 * MkgBomImportModal — Modal voor het importeren van een MKG stuklijst naar PDM.
 * Toont preview van artikeldata, bewerkingen en BOM items, met bevestiging.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Package, Wrench, AlertTriangle, Check, X, Loader2, FileText, Plus } from 'lucide-react';
import { db } from '../../services/storage';
import { mkgStuklijstService, MappedBomResult } from '../../services/mkg/mkgStuklijstService';
import { Article, ArticleStatus, ArticleAuditEntry } from '../../types/pdm';
import { MkgBomData } from '../../types/system';
import { generateId, getNowISO, getCurrentUserName } from '../../services/db/core';

// ── Props ─────────────────────────────────────────────────────────────────────

interface MkgBomImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    artiCode: string;
    onImportComplete: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const MkgBomImportModal: React.FC<MkgBomImportModalProps> = ({
    isOpen, onClose, artiCode, onImportComplete
}) => {
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bomData, setBomData] = useState<MkgBomData | null>(null);
    const [mapped, setMapped] = useState<MappedBomResult | null>(null);

    // ── Fetch BOM data wanneer modal opent ──────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!artiCode) return;
        setLoading(true);
        setError(null);
        setBomData(null);
        setMapped(null);

        try {
            const serverConfig = await db.getServerSettings();
            const pbUrl = serverConfig.url;
            if (!pbUrl) throw new Error('Server URL niet geconfigureerd. Ga naar Instellingen → Server.');

            const machines = await db.getMachines();
            const articles = await db.getArticles();
            const mkgOperations = await db.getMkgOperations();
            const userName = getCurrentUserName();

            // BOM ophalen uit MKG via proxy
            const result = await mkgStuklijstService.fetchBomFromMkg(pbUrl, artiCode);

            if (!result.success || !result.bomData) {
                throw new Error(result.message || 'Onbekende fout bij ophalen stuklijst');
            }

            setBomData(result.bomData);

            // Mappen naar PDM structuur (incl. catalogus-koppeling)
            const mappedResult = mkgStuklijstService.mapToArticle(result.bomData, machines, articles, userName, mkgOperations);
            setMapped(mappedResult);

            console.log(`[MkgBomImport] Preview geladen: ${mappedResult.operations.length} bewerkingen, ${mappedResult.bomItems.length} BOM items`);
        } catch (err) {
            console.error('[MkgBomImport] Fout:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [artiCode]);

    useEffect(() => {
        if (isOpen && artiCode) {
            fetchData();
        }
    }, [isOpen, artiCode, fetchData]);

    // ── Import uitvoeren ────────────────────────────────────────────────────
    const handleImport = async () => {
        if (!mapped || !bomData) return;
        setImporting(true);
        setError(null);

        try {
            const userName = getCurrentUserName();
            const now = getNowISO();
            const existingArticles = await db.getArticles();

            // Stap 0: Maak onbekende bewerkingen aan in de catalogus
            if (mapped.newPredefinedOps && mapped.newPredefinedOps.length > 0) {
                for (const newOp of mapped.newPredefinedOps) {
                    try {
                        await db.addMkgOperation(newOp);
                        console.log(`[MkgBomImport] Catalogus bewerking aangemaakt: ${newOp.code} - ${newOp.name}`);
                    } catch (opErr) {
                        console.warn(`[MkgBomImport] Catalogus bewerking skip: ${(opErr as Error).message}`);
                    }
                }
                console.log(`[MkgBomImport] ${mapped.newPredefinedOps.length} nieuwe catalogus bewerkingen aangemaakt (template koppeling nog nodig)`);
            }

            // Stap 1: Maak ontbrekende sub-artikelen aan als DRAFT
            const newChildArticles: Article[] = [];
            for (const code of mapped.newArticleCodes) {
                // Check of al aangemaakt in deze batch
                if (newChildArticles.some(a => a.articleCode.toLowerCase() === code.toLowerCase())) continue;
                // Check of al bestaat
                if (existingArticles.some(a => a.articleCode.toLowerCase() === code.toLowerCase())) continue;

                // Vind bijbehorende stlr voor extra info
                const stlr = bomData.stlrData.find(s => s.arti_code?.toLowerCase() === code.toLowerCase());

                const childArticle: Article = {
                    id: generateId(),
                    articleCode: code,
                    name: stlr?.stlr_oms_1 || code,
                    description2: stlr?.stlr_oms_2 || '',
                    drawingNumber: stlr?.stlr_tekening || '',
                    revision: 'A',
                    status: ArticleStatus.DRAFT,
                    operations: [],
                    bomItems: [],
                    files: [],
                    auditTrail: [{
                        id: generateId(),
                        timestamp: now,
                        user: userName,
                        action: `Automatisch aangemaakt als halffabricaat bij import van ${artiCode}.`
                    }],
                    createdBy: userName,
                    updatedBy: userName,
                    created: now,
                    updated: now,
                };

                newChildArticles.push(childArticle);
            }

            // Sla sub-artikelen op
            for (const child of newChildArticles) {
                try {
                    await db.addArticle(child);
                    console.log(`[MkgBomImport] Sub-artikel aangemaakt: ${child.articleCode}`);
                } catch (addErr) {
                    // Kan voorkomen als artikel intussen al is aangemaakt
                    console.warn(`[MkgBomImport] Sub-artikel skip: ${(addErr as Error).message}`);
                }
            }

            // Stap 2: Update BOM items met childArticleId van nieuw aangemaakte artikelen
            const updatedBomItems = mapped.bomItems.map(item => {
                if (item.childArticleId) return item; // Al gekoppeld
                const newChild = newChildArticles.find(
                    a => a.articleCode.toLowerCase() === (item.childArticleCode || '').toLowerCase()
                );
                if (newChild) {
                    return { ...item, childArticleId: newChild.id };
                }
                return item;
            });

            // Stap 3: Maak het hoofdartikel aan
            const mainArticle: Article = {
                id: generateId(),
                articleCode: mapped.articleCode || artiCode,
                name: mapped.articleName || '',
                description2: mapped.description2 || '',
                drawingNumber: mapped.drawingNumber || '',
                revision: 'A',
                status: ArticleStatus.DRAFT,
                operations: mapped.operations,
                bomItems: updatedBomItems,
                files: [],
                auditTrail: [mapped.auditEntry],
                createdBy: userName,
                updatedBy: userName,
                created: now,
                updated: now,
            };

            await db.addArticle(mainArticle);
            console.log(`[MkgBomImport] Hoofdartikel aangemaakt: ${mainArticle.articleCode}`);

            onImportComplete();
            onClose();
        } catch (err) {
            console.error('[MkgBomImport] Import fout:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setImporting(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-[700px] max-h-[85vh] flex flex-col overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                            <Package size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                Stuklijst importeren uit MKG
                            </h2>
                            <p className="text-xs text-slate-500 font-mono font-bold mt-0.5">{artiCode}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={importing}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                            <p className="text-sm font-bold">Stuklijst ophalen uit MKG...</p>
                            <p className="text-xs">Artikel, bewerkingen en materialen worden opgehaald</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && !loading && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
                            <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-red-700 dark:text-red-400">Import mislukt</p>
                                <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    {mapped && !loading && (
                        <>
                            {/* ── Artikelinfo ── */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Artikel</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold">Artikelcode</p>
                                        <p className="text-sm font-black text-slate-800 dark:text-white font-mono">{mapped.articleCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold">Tekening</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono">{mapped.drawingNumber || '—'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-slate-400 font-bold">Omschrijving</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-200">{mapped.articleName || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ── Bewerkingen ── */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Wrench size={14} className="text-blue-500" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                        Bewerkingen ({mapped.operations.length})
                                    </p>
                                    {mapped.unknownResources.length > 0 && (
                                        <span className="text-[9px] px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-bold">
                                            {mapped.unknownResources.length} onbekend
                                        </span>
                                    )}
                                </div>

                                {mapped.operations.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic pl-6">Geen bewerkingen gevonden in de stuklijst</p>
                                ) : (
                                    <div className="space-y-1">
                                        {mapped.operations.map(op => {
                                            const setup = op.setups[0];
                                            const isReview = setup?.status === 'REVIEW';
                                            return (
                                                <div key={op.id} className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                    {isReview ? (
                                                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                                                    ) : (
                                                        <Check size={14} className="text-emerald-500 shrink-0" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                                            {op.description}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            {setup?.name || '—'} · Instel: {setup?.setupTimeMinutes || 0}min · Stuk: {setup?.cycleTimeMinutes || 0}min
                                                        </p>
                                                    </div>
                                                    {isReview && (
                                                        <span className="text-[9px] px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded font-bold shrink-0">
                                                            Review
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* ── BOM Items ── */}
                            {mapped.bomItems.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Package size={14} className="text-indigo-500" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                            Halffabricaten ({mapped.bomItems.length})
                                        </p>
                                        {mapped.newArticleCodes.length > 0 && (
                                            <span className="text-[9px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-bold">
                                                {mapped.newArticleCodes.length} nieuw
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1 max-h-52 overflow-y-auto">
                                        {mapped.bomItems.map(item => {
                                            const isNew = !item.childArticleId;
                                            return (
                                                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                    {isNew ? (
                                                        <Plus size={14} className="text-blue-500 shrink-0" />
                                                    ) : (
                                                        <Check size={14} className="text-emerald-500 shrink-0" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate font-mono">
                                                            {item.childArticleCode}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            {item.childArticleName} · Pos: {item.position} · Aantal: {item.quantity}
                                                        </p>
                                                    </div>
                                                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold shrink-0 ${
                                                        isNew
                                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                        {isNew ? 'Nieuw' : 'Bekend'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Waarschuwingen ── */}
                            {mapped.unknownResources.length > 0 && (
                                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                            {mapped.unknownResources.length} onbekende resource{mapped.unknownResources.length > 1 ? 's' : ''}
                                        </p>
                                        <p className="text-[10px] text-amber-600 dark:text-amber-300 mt-1">
                                            Deze bewerkingen worden met status "Review" aangemaakt. Koppel de juiste machine handmatig in de PDM module.
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {mapped.unknownResources.map(rsrc => (
                                                <span key={rsrc} className="text-[9px] px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded font-mono font-bold">
                                                    #{rsrc}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {mapped.newArticleCodes.length > 0 && (
                                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
                                    <Plus size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                                            {mapped.newArticleCodes.length} nieuw{mapped.newArticleCodes.length > 1 ? 'e' : ''} artikel{mapped.newArticleCodes.length > 1 ? 'en' : ''}
                                        </p>
                                        <p className="text-[10px] text-blue-600 dark:text-blue-300 mt-1">
                                            Deze halffabricaten worden automatisch als DRAFT artikel aangemaakt in Factory Manager.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {mapped.newPredefinedOps && mapped.newPredefinedOps.length > 0 && (
                                <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl">
                                    <Wrench size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                                            {mapped.newPredefinedOps.length} nieuwe catalogus bewerking{mapped.newPredefinedOps.length > 1 ? 'en' : ''}
                                        </p>
                                        <p className="text-[10px] text-indigo-600 dark:text-indigo-300 mt-1">
                                            Deze worden automatisch aangemaakt in de bewerkingscatalogus. De beheerder moet daarna nog de juiste template koppelen.
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {mapped.newPredefinedOps.map(op => (
                                                <span key={op.id} className="text-[9px] px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded font-mono font-bold">
                                                    {op.code}: {op.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {mapped.operations.length === 0 && mapped.bomItems.length === 0 && (
                                <div className="flex items-start gap-3 p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <FileText size={16} className="text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Geen stuklijst</p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Dit artikel heeft geen stuklijst in MKG. Het wordt aangemaakt met alleen de basisgegevens.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        disabled={importing}
                        className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Annuleren
                    </button>
                    {mapped && !error && (
                        <button
                            onClick={handleImport}
                            disabled={importing || loading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-60 shadow-lg shadow-blue-500/20"
                        >
                            {importing ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Importeren...
                                </>
                            ) : (
                                <>
                                    <Package size={14} />
                                    Importeren
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
