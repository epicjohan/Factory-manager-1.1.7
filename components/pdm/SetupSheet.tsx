
/**
 * SetupSheet.tsx
 * Printable A4 setup sheet for CNC tool lists.
 * - Portrait (default): 9 columns standard, multi-page auto-flow
 * - Landscape: extra "OPMERKING" column, fits more per row
 * - Dynamic columns: uses setup.frozenToolFields (template) when available
 *   Custom field values stored in tool.toolData[key]
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Article, ArticleTool, SetupVariant, Machine, SetupStatus, SetupFieldDefinition } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SetupSheetProps {
    article: Article;
    setup: SetupVariant;
    machine: Machine | null;
    companyName: string;
    existingToolIds?: string[];
    onClose: () => void;
}



// ── Constants ─────────────────────────────────────────────────────────────────

const TOOLS_PER_PAGE_PORTRAIT = 20;
const TOOLS_PER_PAGE_LANDSCAPE = 15;
const EMPTY_ROWS = 4;

const STATUS_LABEL: Record<string, string> = {
    [SetupStatus.DRAFT]: 'CONCEPT',
    [SetupStatus.REVIEW]: 'TER REVIEW',
    [SetupStatus.RELEASED]: 'VRIJGEGEVEN',
    [SetupStatus.ARCHIVED]: 'GEARCHIVEERD',
};

const today = () =>
    new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ── Column definitions ────────────────────────────────────────────────────────

/**
 * Standard hardcoded columns (always present, mapped to known ArticleTool fields).
 * These are the "base" columns regardless of template.
 */
const STANDARD_COLS = [
    { key: '_order', label: 'T#', width: '32px', align: 'center' as const },
    { key: '_description', label: 'OMSCHRIJVING', width: 'auto', align: 'left' as const },
    { key: '_matrixCode', label: 'MATRIX CODE', width: '80px', align: 'left' as const },
    { key: '_assemblyCode', label: 'ASSEMBLAGE', width: '72px', align: 'left' as const },
    { key: '_cuttingLength', label: 'SNI mm', width: '48px', align: 'right' as const },
    { key: '_overhangLength', label: 'UIT mm', width: '48px', align: 'right' as const },
    { key: '_holder', label: 'HOUDER', width: '56px', align: 'left' as const },
    { key: '_lifeTime', label: 'LEVENSDUUR', width: '72px', align: 'left' as const },
    { key: '_cooling', label: 'KOE', width: '32px', align: 'center' as const },
];

const LANDSCAPE_EXTRA = { key: '_remark', label: 'OPMERKING', width: 'auto', align: 'left' as const };

export function buildColumns(setup: SetupVariant) {
    if (setup.frozenSheetConfig && setup.frozenSheetConfig.columns.length > 0) {
        let cols = setup.frozenSheetConfig.columns.filter(c => c.visible).map(c => ({
            ...c,
            // Ensure width is handled gracefully
            align: c.align as 'left' | 'right' | 'center'
        }));
        
        if (!cols.some(c => c.key === '_remark')) {
            cols.push(LANDSCAPE_EXTRA as any);
        }
        return cols;
    }

    const toolFields = setup.frozenToolFields || [];
    const base = [...STANDARD_COLS, LANDSCAPE_EXTRA];

    if (!toolFields || toolFields.length === 0) return base;

    // Append custom template fields (skip 'header' type fields — they're separators)
    const customCols = toolFields
        .filter(f => f.type !== 'header')
        .map(f => ({
            key: `toolData.${f.key}`,
            label: f.label.toUpperCase(),
            width: f.type === 'boolean' ? '36px' : f.type === 'number' ? '52px' : '80px',
            align: (f.type === 'number' ? 'right' : 'left') as 'left' | 'right' | 'center',
            unit: f.unit,
        }));

    return [...base, ...customCols];
}

/** Extract cell value from a tool given a column key. */
export function cellValue(tool: ArticleTool, colKey: string): string {
    switch (colKey) {
        case '_order': return `T${String(tool.order).padStart(2, '0')}`;
        case '_description': return tool.description || '—';
        case '_matrixCode': return tool.matrixCode || '—';
        case '_assemblyCode': return tool.assemblyCode || '—';
        case '_cuttingLength': return tool.cuttingLength || '—';
        case '_overhangLength': return tool.overhangLength || '—';
        case '_holder': return tool.holder || '—';
        case '_lifeTime': return tool.lifeTime || '—';
        case '_cooling': return tool.internalCooling ? 'JA' : 'NEE';
        case '_remark': return ''; // landscape notes column — always empty
        default:
            if (colKey.startsWith('toolData.')) {
                const field = colKey.replace('toolData.', '');
                const val = tool.toolData?.[field];
                if (val === undefined || val === null || val === '') return '—';
                if (typeof val === 'boolean') return val ? 'JA' : 'NEE';
                return String(val);
            }
            return '—';
    }
}

// ── Sub-components ────────────────────────────────────────────────────────────

const f: React.CSSProperties = { fontFamily: 'Arial, sans-serif' };

const SheetHeader: React.FC<{
    companyName: string; currentPage: number; totalPages: number; isContinuation?: boolean;
}> = ({ companyName, currentPage, totalPages, isContinuation }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f0f0', padding: '8px 14px', borderBottom: '1px solid #ccc' }}>
        <span style={{ ...f, fontSize: isContinuation ? '12px' : '16px', fontWeight: 900, color: '#1a1a1a', letterSpacing: '0.5px' }}>
            {companyName.toUpperCase()}
        </span>
        <div style={{ ...f, fontSize: isContinuation ? '10px' : '13px', fontWeight: 700, color: '#1a1a1a', textAlign: 'center' }}>
            SETUP SHEET — GEREEDSCHAPPEN{isContinuation ? ' — VERVOLG' : ''}
        </div>
        <div style={{ ...f, fontSize: '10px', color: '#555', textAlign: 'right' }}>
            PAGINA {currentPage} / {totalPages}
        </div>
    </div>
);

const ArticleInfoBar: React.FC<{ article: Article }> = ({ article }) => (
    <div style={{ borderBottom: '1px solid #ccc', padding: '6px 14px', backgroundColor: '#f9f9f9' }}>
        <div style={{ ...f, fontSize: '7px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
            ARTIKEL INFORMATIE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.6fr 2.5fr 0.6fr', gap: '0 12px' }}>
            {[
                { label: 'TEKENING NR', value: article.drawingNumber || '—' },
                { label: 'TEKENING REVISIE', value: article.drawingRevision || '—' },
                { label: 'OMSCHRIJVING', value: article.name || '—' },
                { label: 'PLM REVISIE', value: article.revision || '—' },
            ].map(fld => (
                <div key={fld.label}>
                    <div style={{ ...f, fontSize: '7px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{fld.label}</div>
                    <div style={{ ...f, fontSize: '11px', fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fld.value}</div>
                </div>
            ))}
        </div>
    </div>
);

const SetupStatusBar: React.FC<{ setup: SetupVariant; machine: Machine | null }> = ({ setup, machine }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 0.6fr 1.2fr', borderBottom: '1px solid #bbb', backgroundColor: '#eeeeee' }}>
        {[
            { label: 'SETUP', value: setup.name },
            { label: 'ASSET / MACHINE', value: machine ? `${machine.name} (${machine.machineNumber})` : '—' },
            { label: 'VERSIE', value: `v${setup.version || 1}` },
            { label: 'STATUS', value: `● ${STATUS_LABEL[setup.status] || setup.status}` },
        ].map((s, i, arr) => (
            <div key={s.label} style={{ padding: '5px 14px', borderRight: i < arr.length - 1 ? '1px solid #bbb' : 'none' }}>
                <div style={{ ...f, fontSize: '7px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{s.label}</div>
                <div style={{ ...f, fontSize: '11px', fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</div>
            </div>
        ))}
    </div>
);

const CompactInfoStrip: React.FC<{ article: Article; setup: SetupVariant; machine: Machine | null }> = ({ article, setup, machine }) => (
    <div style={{ ...f, fontSize: '8px', color: '#555', borderBottom: '1px solid #ddd', padding: '4px 14px', backgroundColor: '#fafafa' }}>
        Artikel: <strong>{article.drawingNumber}</strong> | Rev. <strong>{article.drawingRevision || '—'}</strong> | PLM Rev. <strong>{article.revision}</strong> | {article.name} | Setup: <strong>{setup.name}</strong> | v{setup.version || 1} | {machine?.name || '—'} | ● {STATUS_LABEL[setup.status] || setup.status}
    </div>
);

/** Renders the template name banner when a template is active */
const TemplateBanner: React.FC<{ templateName?: string }> = ({ templateName }) =>
    templateName ? (
        <div style={{ ...f, fontSize: '7px', color: '#888', padding: '3px 14px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #e8e8e8', fontStyle: 'italic' }}>
            Sjabloon: {templateName} — kolommen worden bepaald door sjabloondefinitie
        </div>
    ) : null;

interface ToolsTableProps {
    tools: ArticleTool[];
    cols: ReturnType<typeof buildColumns>;
    existingToolIds?: string[];
}

const ToolsTable: React.FC<ToolsTableProps> = ({ tools, cols, existingToolIds }) => {
    const cell: React.CSSProperties = {
        padding: '3px 5px', fontSize: '9px', ...f,
        color: '#1a1a1a', borderRight: '1px solid #ddd',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        verticalAlign: 'middle',
    };

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: '1px solid #ccc' }}>
            <thead>
                <tr style={{ backgroundColor: '#e8e8e8' }}>
                    {cols.map(c => (
                        <th key={c.key} style={{ ...cell, width: c.width, fontWeight: 700, fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#333', borderBottom: '1.5px solid #bbb', textAlign: c.align }}>
                            {'unit' in c && c.unit ? `${c.label} (${c.unit})` : c.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {tools.map((tool, idx) => {
                    const isExisting = existingToolIds?.includes(tool.id);
                    return (
                        <tr key={tool.id} style={{ 
                            backgroundColor: isExisting ? '#e2e8f0' : (idx % 2 === 0 ? '#fff' : '#f7f7f7'),
                            color: isExisting ? '#64748b' : '#1a1a1a',
                            opacity: isExisting ? 0.7 : 1
                        }}>
                            {cols.map(c => (
                                <td key={c.key} style={{ ...cell, fontWeight: c.key === '_order' ? 700 : 400, textAlign: c.align, color: isExisting ? '#64748b' : '#1a1a1a', textDecoration: isExisting && c.key === '_description' ? 'line-through' : 'none' }}>
                                    {cellValue(tool, c.key)}
                                </td>
                            ))}
                        </tr>
                    );
                })}
                {/* Empty rows for handwritten additions */}
                {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
                    <tr key={`empty-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f7f7f7' }}>
                        {cols.map(c => (
                            <td key={c.key} style={{ ...cell, height: '18px' }}>&nbsp;</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const NotesBlock: React.FC = () => (
    <div style={{ border: '1px solid #ccc', marginTop: 10, padding: '8px 10px' }}>
        <div style={{ ...f, fontSize: '8px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>NOTITIES / OPMERKINGEN</div>
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ borderBottom: '1px solid #e0e0e0', height: '18px', marginBottom: 2 }} />
        ))}
    </div>
);

const SheetFooter: React.FC<{ setupName: string; version: number; currentPage: number; totalPages: number }> = ({ setupName, version, currentPage, totalPages }) => (
    <div style={{ borderTop: '1px solid #ddd', marginTop: 'auto', paddingTop: 4, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ ...f, fontSize: '7px', color: '#aaa', fontStyle: 'italic' }}>
            Factory Manager | Setup: {setupName} | v{version} | Afgedrukt op: {today()}{currentPage < totalPages ? ' | Vervolg op volgende pagina →' : ''}
        </span>
        {currentPage === totalPages && (
            <span style={{ ...f, fontSize: '7px', color: '#aaa', fontStyle: 'italic' }}>
                Wijzigingen uitsluitend via nieuwe versie
            </span>
        )}
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const SetupSheet: React.FC<SetupSheetProps> = ({ article, setup, machine, companyName, existingToolIds, onClose }) => {
    // Template fields from frozen setup
    const templateFields: SetupFieldDefinition[] = setup.frozenToolFields || [];
    const templateName = (setup as any).templateName as string | undefined;

    const cols = buildColumns(setup);
    const toolsPerPage = TOOLS_PER_PAGE_LANDSCAPE;
    const activeTools = (setup.tools || []).filter(t => t.status !== 'REPLACED').sort((a, b) => a.order - b.order);
    const totalPages = Math.max(1, Math.ceil(activeTools.length / toolsPerPage));
    const pages = Array.from({ length: totalPages }, (_, i) => activeTools.slice(i * toolsPerPage, (i + 1) * toolsPerPage));
    if (pages.length === 0) pages.push([]);

    const isLandscape = true;

    return createPortal(
        <>
            <style>{`
                @media print {
                    body > *:not(#setup-sheet-root) { display: none !important; }
                    #setup-sheet-root { display: block !important; position: static !important; }
                    .no-print { display: none !important; }
                    @page { size: A4 landscape; margin: 10mm 12mm 10mm 12mm; }
                }
                @media screen {
                    #setup-sheet-root {
                        position: fixed; inset: 0; background: rgba(0,0,0,0.75);
                        z-index: 1000; display: flex; align-items: flex-start;
                        justify-content: center; overflow-y: auto; padding: 24px 24px 40px;
                    }
                }
            `}</style>

            <div id="setup-sheet-root">
                {/* Screen-only controls */}
                <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 1001, display: 'flex', gap: 8, alignItems: 'center' }}>

                    <button
                        onClick={() => window.print()}
                        style={{ padding: '8px 20px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                    >
                        🖨 Printen / PDF
                    </button>
                    <button
                        onClick={onClose}
                        style={{ padding: '8px 16px', background: '#555', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                    >
                        ✕ Sluiten
                    </button>
                </div>

                {/* Pages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {pages.map((pageTools, pageIdx) => {
                        const isFirst = pageIdx === 0;
                        const isLast = pageIdx === totalPages - 1;
                        return (
                            <div
                                key={pageIdx}
                                style={{
                                    width: '297mm',
                                    minHeight: '210mm',
                                    backgroundColor: 'white',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    pageBreakAfter: isLast ? 'avoid' : 'always',
                                    overflow: 'hidden',
                                }}
                            >
                                <SheetHeader companyName={companyName} currentPage={pageIdx + 1} totalPages={totalPages} isContinuation={!isFirst} />

                                {isFirst ? (
                                    <>
                                        <ArticleInfoBar article={article} />
                                        <SetupStatusBar setup={setup} machine={machine} />
                                        {templateFields.length > 0 && <TemplateBanner templateName={templateName} />}
                                    </>
                                ) : (
                                    <CompactInfoStrip article={article} setup={setup} machine={machine} />
                                )}

                                <div style={{ padding: '8px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {!isFirst && (
                                        <div style={{ ...f, fontSize: '8px', color: '#bbb', marginBottom: 4, fontStyle: 'italic' }}>
                                            (VERVOLG — T{pageIdx * toolsPerPage + 1} t/m T{Math.min((pageIdx + 1) * toolsPerPage, activeTools.length)})
                                        </div>
                                    )}

                                    <ToolsTable tools={pageTools} cols={cols} existingToolIds={existingToolIds} />

                                    {isLast && (
                                        <>
                                            <div style={{ borderLeft: '1px solid #ccc', borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', padding: '4px 8px', backgroundColor: '#f0f0f0' }}>
                                                <span style={{ ...f, fontSize: '9px', fontWeight: 700, color: '#333' }}>
                                                    TOTAAL ACTIEVE GEREEDSCHAPPEN: {activeTools.length}
                                                    {templateFields.length > 0 && (
                                                        <span style={{ fontWeight: 400, color: '#888', marginLeft: 12 }}>
                                                            | Sjabloon-kolommen: {templateFields.filter(f => f.type !== 'header').length}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <NotesBlock />
                                        </>
                                    )}
                                </div>

                                <div style={{ padding: '0 14px 8px 14px' }}>
                                    <SheetFooter setupName={setup.name} version={setup.version || 1} currentPage={pageIdx + 1} totalPages={totalPages} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>,
        document.body
    );
};
