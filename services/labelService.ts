/**
 * Label Service — Generates and prints Dymo-compatible sticker labels
 * Uses a hidden iframe with inline CSS/HTML for browser-native printing.
 * No external SDK required — the Dymo printer must be installed as a system printer.
 * 
 * Label format: Dymo S0929100 (51 × 89 mm)
 */

export interface RawMaterialLabelData {
    description: string;
    materialTypeName: string;
    profileName: string;
    dimensions: string;          // e.g. "Ø50 × L200 mm"
    stock: number;
    location: string;
    source: string;              // "NIEUW" | "RESTMATERIAAL"
    productionOrderNr?: string;
    purchaseOrderNr?: string;
    supplier?: string;
    addedBy: string;
    date: string;                // formatted date string
    transactionType: 'NEW' | 'RESTOCK' | 'WITHDRAWAL';
    restockQty?: number;         // only for RESTOCK — quantity added
    withdrawQty?: number;        // only for WITHDRAWAL — quantity removed
    batchNr?: string;            // only for WITHDRAWAL — unique batch number
}

const LABEL_WIDTH = '89mm';
const LABEL_HEIGHT = '51mm';

function buildLabelHTML(data: RawMaterialLabelData): string {
    const sourceLabel = data.source === 'RESTMATERIAAL' ? 'Rest' : 'Nieuw';
    const txLabel = data.transactionType === 'RESTOCK' ? 'OPBOEKING'
        : data.transactionType === 'WITHDRAWAL' ? 'AFNAME'
        : 'NIEUW MATERIAAL';
    const qtyLabel = data.transactionType === 'RESTOCK'
        ? `+${data.restockQty} (tot: ${data.stock})`
        : data.transactionType === 'WITHDRAWAL'
        ? `-${data.withdrawQty} (rest: ${data.stock})`
        : `${data.stock} st.`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page {
        size: ${LABEL_WIDTH} ${LABEL_HEIGHT};
        margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        width: ${LABEL_WIDTH};
        height: ${LABEL_HEIGHT};
        font-family: 'Arial', 'Helvetica Neue', sans-serif;
        font-size: 6pt;
        color: #111;
        padding: 2mm 2.5mm;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 0.3mm solid #000;
        padding-bottom: 1mm;
        margin-bottom: 1mm;
    }
    .tx-type {
        font-size: 5.5pt;
        font-weight: 900;
        letter-spacing: 0.4pt;
        text-transform: uppercase;
        background: #000;
        color: #fff;
        padding: 0.3mm 1.5mm;
        border-radius: 0.5mm;
    }
    .batch-nr {
        font-size: 5pt;
        font-weight: 900;
        font-family: 'Courier New', monospace;
        letter-spacing: 0.2pt;
    }
    .date {
        font-size: 5pt;
        color: #555;
    }
    .desc {
        font-size: 8pt;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: -0.2pt;
        line-height: 1.15;
        margin-bottom: 1mm;
        max-height: 7mm;
        overflow: hidden;
    }
    .row {
        display: flex;
        gap: 1.5mm;
        margin-bottom: 0.8mm;
    }
    .field { flex: 1; min-width: 0; }
    .fl {
        font-size: 4pt;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.2pt;
        color: #888;
        margin-bottom: 0.2mm;
    }
    .fv {
        font-size: 6pt;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .fv.lg {
        font-size: 9pt;
        font-weight: 900;
    }
    .div { border-top: 0.15mm dashed #ccc; margin: 0.6mm 0; }
    .foot {
        margin-top: auto;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 4.5pt;
        color: #999;
        border-top: 0.15mm solid #ccc;
        padding-top: 0.5mm;
    }
</style>
</head>
<body>
    <div class="header">
        <span class="tx-type">${txLabel}</span>
        ${data.batchNr ? `<span class="batch-nr">${escapeHtml(data.batchNr)}</span>` : ''}
        <span class="date">${data.date}</span>
    </div>

    <div class="desc">${escapeHtml(data.description)}</div>

    <div class="row">
        <div class="field">
            <div class="fl">Materiaal</div>
            <div class="fv">${escapeHtml(data.materialTypeName)}</div>
        </div>
        <div class="field">
            <div class="fl">Profiel</div>
            <div class="fv">${escapeHtml(data.profileName)}</div>
        </div>
        ${data.dimensions ? `<div class="field">
            <div class="fl">Afm.</div>
            <div class="fv">${escapeHtml(data.dimensions)}</div>
        </div>` : ''}
    </div>

    <div class="div"></div>

    <div class="row">
        <div class="field">
            <div class="fl">Aantal</div>
            <div class="fv lg">${qtyLabel}</div>
        </div>
        <div class="field">
            <div class="fl">Locatie</div>
            <div class="fv lg">${escapeHtml(data.location || 'N.v.t.')}</div>
        </div>
        <div class="field">
            <div class="fl">Herkomst</div>
            <div class="fv">${sourceLabel}</div>
        </div>
    </div>

    ${(data.productionOrderNr || data.purchaseOrderNr || data.supplier) ? `
    <div class="div"></div>
    <div class="row">
        ${data.productionOrderNr ? `<div class="field"><div class="fl">PO</div><div class="fv">${escapeHtml(data.productionOrderNr)}</div></div>` : ''}
        ${data.purchaseOrderNr ? `<div class="field"><div class="fl">IO</div><div class="fv">${escapeHtml(data.purchaseOrderNr)}</div></div>` : ''}
        ${data.supplier ? `<div class="field"><div class="fl">Leverancier</div><div class="fv">${escapeHtml(data.supplier)}</div></div>` : ''}
    </div>` : ''}

    <div class="foot">
        <span>${escapeHtml(data.addedBy)}</span>
        <span>Factory Manager</span>
    </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Print a raw material label using a hidden iframe.
 * Opens the browser print dialog targeting the Dymo printer.
 */
export function printRawMaterialLabel(data: RawMaterialLabelData): void {
    const html = buildLabelHTML(data);

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
        document.body.removeChild(iframe);
        return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for content to render, then print
    setTimeout(() => {
        try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        } catch (e) {
            console.error('Label print failed:', e);
        }

        // Clean up after print dialog closes
        setTimeout(() => {
            if (iframe.parentNode) {
                document.body.removeChild(iframe);
            }
        }, 2000);
    }, 300);
}

/**
 * Build a dimension string from RawMaterialDimensions.
 */
export function formatDimensions(dims?: { diameter?: number; width?: number; height?: number; length?: number; thickness?: number }): string {
    if (!dims) return '';
    const parts: string[] = [];
    if (dims.diameter) parts.push(`Ø${dims.diameter}`);
    if (dims.width) parts.push(`B${dims.width}`);
    if (dims.height) parts.push(`H${dims.height}`);
    if (dims.length) parts.push(`L${dims.length}`);
    if (dims.thickness) parts.push(`D${dims.thickness}`);
    return parts.length > 0 ? `${parts.join(' × ')} mm` : '';
}
