/**
 * mkgStuklijstService — Haalt stuklijst (BOM) data op uit MKG via de PocketBase proxy
 * en mapt deze naar PDM Article/Operation/BOMItem types.
 *
 * Architectuur: Browser → POST /api/mkg-proxy { action: "FETCH_BOM" } → PocketBase Proxy → MKG API
 */

import { MkgBomData, MkgStlrRecord, MkgStlbRecord } from '../../types/system';
import { Article, ArticleOperation, ArticleBOMItem, SetupVariant, ArticleStatus, SetupStatus, ArticleAuditEntry } from '../../types/pdm';
import { Machine } from '../../types/machine';

// ─── Result Types ──────────────────────────────────────────────────────────────

export interface MkgBomImportResult {
  success: boolean;
  message: string;
  bomData?: MkgBomData;
  mapped?: MappedBomResult;
}

export interface MappedBomResult {
  articleCode: string;
  articleName: string;
  drawingNumber: string;
  description2: string;
  operations: ArticleOperation[];
  bomItems: ArticleBOMItem[];
  /** rsrc_num waarden waarvoor geen machine gevonden is */
  unknownResources: number[];
  /** Artikelcodes uit de stuklijst die nog niet in PDM bestaan */
  newArticleCodes: string[];
  auditEntry: ArticleAuditEntry;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getNowISO = () => new Date().toISOString();

/**
 * Zoek een machine op basis van MKG rsrc_num.
 * Machine.mkgResourceCode bevat het rsrc_num uit MKG.
 */
const findMachineByRsrcNum = (rsrcNum: number, machines: Machine[]): Machine | undefined => {
  return machines.find(m => m.mkgResourceCode === rsrcNum);
};

// ─── Service ───────────────────────────────────────────────────────────────────

export const mkgStuklijstService = {

  /**
   * Haal BOM data op uit MKG via de PocketBase proxy.
   * @param pbUrl  PocketBase server URL
   * @param artiCode  Artikelcode om op te zoeken in MKG
   */
  fetchBomFromMkg: async (pbUrl: string, artiCode: string): Promise<MkgBomImportResult> => {
    try {
      console.log(`[MkgStuklijst] Ophalen stuklijst voor artikel: ${artiCode}`);

      const response = await fetch(`${pbUrl}/api/mkg-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FETCH_BOM',
          artiCode,
        }),
      });

      if (!response.ok) {
        const msg = `HTTP ${response.status} bij ophalen stuklijst`;
        console.error(`[MkgStuklijst] ${msg}`);
        return { success: false, message: msg };
      }

      const result = await response.json();

      if (!result.success) {
        const msg = result.message || 'MKG fout bij ophalen stuklijst';
        console.error(`[MkgStuklijst] ${msg}`);
        return { success: false, message: msg };
      }

      // De proxy geeft article + stlrData direct op het root-object terug
      const bomData: MkgBomData = {
        article: result.article,
        stlrData: result.stlrData || [],
      };

      if (!bomData.article) {
        console.warn('[MkgStuklijst] Onverwacht data-formaat:', result);
        return { success: false, message: 'Onverwacht data-formaat van MKG — geen stuklijstdata gevonden' };
      }

      console.log(`[MkgStuklijst] Stuklijst ontvangen: ${bomData.stlrData.length} regels voor artikel ${bomData.article.arti_code}`);

      return {
        success: true,
        message: `Stuklijst opgehaald: ${bomData.stlrData.length} regels`,
        bomData,
      };

    } catch (err) {
      console.error('[MkgStuklijst] Fout bij ophalen stuklijst:', err);
      return { success: false, message: String(err) };
    }
  },

  /**
   * Map MKG BOM data naar PDM-structuren (Article velden, operations, bomItems).
   *
   * @param bomData       Ruwe MKG BOM data (article + stlrData)
   * @param machines      Lijst van bekende machines (voor rsrc_num → machineId koppeling)
   * @param existingArticles  Bestaande PDM artikelen (voor BOM child-lookup)
   * @param userName      Naam van de gebruiker die de import uitvoert
   */
  mapToArticle: (
    bomData: MkgBomData,
    machines: Machine[],
    existingArticles: Article[],
    userName: string,
  ): MappedBomResult => {
    const now = getNowISO();
    const unknownResources: number[] = [];
    const newArticleCodes: string[] = [];

    // ── 1. Artikel basisgegevens ───────────────────────────────────────────
    const { article, stlrData } = bomData;

    // ── 2. Zoek de root regel (stlr_num === 1, het eindproduct) ────────────
    const rootRecord = stlrData.find(r => r.stlr_num === 1);

    // ── 3. Bewerkingen mappen (van alle stlr records met bewerkingen) ──────
    const operations: ArticleOperation[] = [];

    for (const stlr of stlrData) {
      if (!stlr.bewerkingen || stlr.bewerkingen.length === 0) continue;

      for (const stlb of stlr.bewerkingen) {
        const operation = mapStlbToOperation(stlb, machines, unknownResources);
        operations.push(operation);
      }
    }

    // Sorteer op volgorde
    operations.sort((a, b) => a.order - b.order);

    console.log(`[MkgStuklijst] ${operations.length} bewerkingen gemapt`);

    // ── 4. BOM items mappen (child regels, stlr_parent > 0, skip root) ────
    const bomItems: ArticleBOMItem[] = [];

    for (const stlr of stlrData) {
      // Skip de root (stlr_num === 1 is het eindproduct zelf)
      if (stlr.stlr_num === 1) continue;
      // Alleen regels met een parent (echte BOM-kinderen)
      if (stlr.stlr_parent <= 0) continue;

      const bomItem = mapStlrToBomItem(stlr, existingArticles, newArticleCodes);
      bomItems.push(bomItem);
    }

    console.log(`[MkgStuklijst] ${bomItems.length} BOM-items gemapt, ${newArticleCodes.length} nieuwe artikelcodes`);

    if (unknownResources.length > 0) {
      console.warn(`[MkgStuklijst] ⚠ ${unknownResources.length} onbekende resources: [${unknownResources.join(', ')}]`);
    }

    // ── 5. Audit entry ────────────────────────────────────────────────────
    const auditEntry: ArticleAuditEntry = {
      id: crypto.randomUUID(),
      timestamp: now,
      user: userName,
      action: `MKG stuklijst geïmporteerd (${operations.length} bewerkingen, ${bomItems.length} BOM-items)`,
    };

    return {
      articleCode: article.arti_code,
      articleName: article.arti_oms_1,
      drawingNumber: article.arti_tekening || '',
      description2: article.arti_oms_2 || '',
      operations,
      bomItems,
      unknownResources: Array.from(new Set(unknownResources)),
      newArticleCodes: Array.from(new Set(newArticleCodes)),
      auditEntry,
    };
  },
};

// ─── Mapping Functies ──────────────────────────────────────────────────────────

/**
 * Map een MKG stlb (bewerking) record naar een PDM ArticleOperation met SetupVariant.
 *
 * Tijdconversie: MKG levert tijden in seconden, PDM gebruikt minuten.
 * Status logica: REVIEW als machine niet gevonden, DRAFT als machine wel gekoppeld.
 */
function mapStlbToOperation(
  stlb: MkgStlbRecord,
  machines: Machine[],
  unknownResources: number[],
): ArticleOperation {
  const machine = findMachineByRsrcNum(stlb.rsrc_num, machines);

  if (!machine && stlb.rsrc_num > 0) {
    unknownResources.push(stlb.rsrc_num);
  }

  // Setup variant aanmaken
  const setupVariant: SetupVariant = {
    id: crypto.randomUUID(),
    name: machine ? machine.name : `MKG Resource ${stlb.rsrc_num}`,
    machineId: machine?.id ?? '',
    status: machine ? SetupStatus.DRAFT : SetupStatus.REVIEW,
    isDefault: true,
    version: 1,
    setupTimeMinutes: Math.round((stlb.stlb_instel_tijd / 60) * 100) / 100,  // seconden → minuten
    cycleTimeMinutes: Math.round((stlb.stlb_tijd_per_stuk / 60) * 100) / 100, // seconden → minuten
    steps: [],
    tools: [],
  };

  const operation: ArticleOperation = {
    id: crypto.randomUUID(),
    order: stlb.stlb_volgorde * 10,
    description: stlb.stlb_oms || `Bewerking ${stlb.stlb_volgorde}`,
    mkgOperationCode: String(stlb.bwrk_num),
    setups: [setupVariant],
  };

  return operation;
}

/**
 * Map een MKG stlr (halffabricaat/component) record naar een PDM ArticleBOMItem.
 * Checkt of het artikel al bestaat in PDM; zo niet, wordt de code toegevoegd aan newArticleCodes.
 */
function mapStlrToBomItem(
  stlr: MkgStlrRecord,
  existingArticles: Article[],
  newArticleCodes: string[],
): ArticleBOMItem {
  // Zoek bestaand artikel op basis van artikelcode
  const existingArticle = existingArticles.find(a => a.articleCode === stlr.arti_code);

  if (!existingArticle) {
    newArticleCodes.push(stlr.arti_code);
  }

  const bomItem: ArticleBOMItem = {
    id: crypto.randomUUID(),
    childArticleId: existingArticle?.id ?? '',
    childArticleName: stlr.stlr_oms_1 || undefined,
    childArticleCode: stlr.arti_code,
    position: stlr.stlr_pos || String(stlr.stlr_volgorde),
    quantity: stlr.stlr_aantal,
  };

  return bomItem;
}
