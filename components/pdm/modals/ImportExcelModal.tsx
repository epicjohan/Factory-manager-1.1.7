import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { FileUp, X, CheckCircle, AlertCircle, Loader2 } from '../../../icons';
import { Article, ArticleStatus } from '../../../types';
import { generateId, getNowISO } from '../../../services/db/core';
import { articleService } from '../../../services/db/articleService';
import { useAuth } from '../../../contexts/AuthContext';

interface ImportExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
}

interface ParsedRow {
    Artikel?: string;
    Omschrijving?: string;
    'Omschrijving 2'?: string;
    Tekening?: string;
    Revisie?: string;
    Pos?: string;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({ isOpen, onClose, onImportSuccess }) => {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importStats, setImportStats] = useState<{ total: number; success: number; failed: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseExcel(selectedFile);
        }
    };

    const parseExcel = async (file: File) => {
        setIsParsing(true);
        setError(null);
        setImportStats(null);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Expected headers: Artikel, Omschrijving, Omschrijving 2, Tekening, Revisie, Pos
            const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { defval: "" });

            // Valideer of op z'n minst Artikel of Omschrijving column bestaat in de eerste rij
            if (jsonData.length > 0) {
                const firstRow = jsonData[0];
                if (!('Artikel' in firstRow) && !('Omschrijving' in firstRow)) {
                    setError('Het bestand lijkt niet de juiste MKG kolommen te bevatten (Artikel, Omschrijving). Controleer de export.');
                    setParsedData([]);
                } else {
                    // Filter empty rows
                    const validData = jsonData.filter(row => row.Artikel || row.Omschrijving);
                    setParsedData(validData);
                }
            } else {
                setError('Het bestand is leeg.');
                setParsedData([]);
            }
        } catch (err) {
            console.error(err);
            setError('Fout bij het lezen van het Excel-bestand. Zorg dat het een geldig .xlsx of .xls bestand is.');
        } finally {
            setIsParsing(false);
        }
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;
        setIsImporting(true);
        setError(null);

        let successCount = 0;
        let failCount = 0;

        // Load existing articles to check for duplicates by articleCode
        const existingArticles = await articleService.getArticles();
        const existingCodes = new Set(existingArticles.map(a => a.articleCode?.trim().toLowerCase()).filter(Boolean));

        try {
            for (const row of parsedData) {
                const code = (row.Artikel || '').toString().trim();
                const name = (row.Omschrijving || '').toString().trim();

                // Skip if both code and name are empty
                if (!code && !name) continue;

                // Optioneel: Overslaan als Artikelcode al in het systeem staat
                // Hier kiezen we ervoor om alleen nieuwe unieke artikelen te importeren gebaseerd op de code.
                if (code && existingCodes.has(code.toLowerCase())) {
                    failCount++;
                    continue; // Skip duplicate
                }

                const newArticle: Article = {
                    id: generateId(),
                    articleCode: code || `ART-${generateId().slice(0, 6)}`,
                    name: name || 'Geen omschrijving',
                    description2: (row['Omschrijving 2'] || '').toString().trim(),
                    drawingNumber: (row.Tekening || '').toString().trim(),
                    drawingRevision: (row.Revisie || '').toString().trim() || undefined,
                    revision: '-', // PLM revisie wordt nooit vanuit Excel import gezet
                    posNumber: (row.Pos || '').toString().trim(),
                    // Default values for new articles
                    status: ArticleStatus.DRAFT,
                    operations: [],
                    bomItems: [],
                    files: [], // Dit wordt later gemapped naar filesMeta in sync.ts
                    auditTrail: [{
                        id: generateId(),
                        action: 'Artikel geïmporteerd vanuit MKG Excel export.',
                        timestamp: getNowISO(),
                        user: user?.name || 'Systeem'
                    }],
                    created: getNowISO(),
                    createdBy: user?.name || 'Systeem',
                    updated: getNowISO(),
                    updatedBy: user?.name || 'Systeem'
                };

                await articleService.addArticle(newArticle);
                if (code) {
                    existingCodes.add(code.toLowerCase()); // Voorkom dubbele in dezelfde Excel lijst
                }
                successCount++;

                // We sturen de bulk sync-updates niet individueel per record om UI freezes te voorkomen,
                // articleService.saveArticle roept saveTable -> dispatchEvent en addToOutbox aan per stuk.
                // Dit gaat vrij snel voor een honderdtal rijen.
            }

            setImportStats({ total: parsedData.length, success: successCount, failed: failCount });

            if (successCount > 0) {
                setTimeout(() => {
                    onImportSuccess();
                }, 2000); // Geef de gebruiker kort de tijd om de resultaten te zien
            }

        } catch (err) {
            console.error('Import error:', err);
            setError('Er is een onverwachte fout opgetreden tijdens het importeren naar de database.');
        } finally {
            setIsImporting(false);
        }
    };

    const reset = () => {
        setFile(null);
        setParsedData([]);
        setError(null);
        setImportStats(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                            <FileUp size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Importeer vanuit MKG</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Importeer artikelen direct uit een Excel (.xlsx) export.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {!file ? (
                        <div
                            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileUp size={48} className="mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Selecteer MKG Export</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Sleep een bestand hierheen of klik om te bladeren</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <FileUp className="text-green-600 dark:text-green-400" size={24} />
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white">{file.name}</p>
                                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                {!isImporting && !importStats && (
                                    <button onClick={reset} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                                        Ander bestand
                                    </button>
                                )}
                            </div>

                            {isParsing ? (
                                <div className="flex items-center justify-center p-8 text-slate-500 gap-3">
                                    <Loader2 className="animate-spin" /> Bestand analyseren...
                                </div>
                            ) : error ? (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex gap-3 items-start text-sm">
                                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                                    <p>{error}</p>
                                </div>
                            ) : importStats ? (
                                <div className="p-6 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800/50 text-center">
                                    <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
                                    <h3 className="text-xl font-bold mb-2">Import Voltooid!</h3>
                                    <p className="mb-4 text-sm">De MKG artikelen zijn succesvol ingeladen.</p>
                                    <div className="flex justify-center gap-8 text-sm">
                                        <div>
                                            <p className="text-2xl font-black">{importStats.success}</p>
                                            <p className="opacity-80">Geïmporteerd</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black">{importStats.failed}</p>
                                            <p className="opacity-80">Overgeslagen (Dubbel)</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-slate-800 dark:text-white">Voorbeeld ({parsedData.length} records gevonden)</h3>
                                        <p className="text-xs text-slate-500">Artikelen met een bestaande code worden overgeslagen.</p>
                                    </div>
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Artikel</th>
                                                    <th className="py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Omschrijving</th>
                                                    <th className="py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Revisie</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {parsedData.slice(0, 10).map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300">
                                                        <td className="py-2 px-3 font-medium">{row.Artikel}</td>
                                                        <td className="py-2 px-3 truncate max-w-[200px]">{row.Omschrijving}</td>
                                                        <td className="py-2 px-3">{row.Revisie}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {parsedData.length > 10 && (
                                            <div className="text-center p-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                                                ... en nog {parsedData.length - 10} andere rijen
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                    {importStats ? (
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all"
                        >
                            Sluiten
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                disabled={isImporting}
                                className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium transition-all"
                            >
                                Annuleren
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={parsedData.length === 0 || isImporting}
                                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isImporting ? (
                                    <><Loader2 size={18} className="animate-spin" /> Importeren...</>
                                ) : (
                                    <>Start Import ({parsedData.length})</>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
