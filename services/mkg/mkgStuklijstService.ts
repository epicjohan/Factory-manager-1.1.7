/**
 * mkgStuklijstService — Haalt stuklijst (BOM) data op uit MKG via de PocketBase proxy
 * en mapt deze naar PDM Article/Operation/BOMItem types.
 *
 * Architectuur: Browser → POST /api/mkg-proxy { action: "FETCH_BOM" } → PocketBase Proxy → MKG API
 */

import { MkgBomData, MkgStlrRecord, MkgStlbRecord } from '../../types/system';
import { Article, ArticleOperation, ArticleBOMItem, SetupVariant, ArticleStatus, SetupStatus, ArticleAuditEntry, PredefinedOperation } from '../../types/pdm';
import { Machine } from '../../types/machine';
import { generateId } from '../db/core';

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
  /** Nieuwe PredefinedOperations die aangemaakt moeten worden in de catalogus */
  newPredefinedOps: PredefinedOperation[];
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

/**
 * Zoek een PredefinedOperation via meerdere match-strategieën:
 * 1. Exacte code match op bwrk_num
 * 2. Exacte code match op rsrc_num  
 * 3. Numerieke vergelijking (code "500" === bwrk_num 500)
 * 4. Machine-gekoppelde operatie (defaultMachineId === gevonden machine)
 */
const findPredefinedOp = (
  ops: PredefinedOperation[],
  bwrkStr: string,
  rsrcStr: string,
  machine: Machine | undefined,
): PredefinedOperation | undefined => {
  // 1. Exacte code match op bwrk_num
  let match = ops.find(op => op.code === bwrkStr);
  if (match) return match;

  // 2. Exacte code match op rsrc_num (processtappen gebruiken rsrc_num als code)
  match = ops.find(op => op.code === rsrcStr);
  if (match) return match;

  // 3. Numerieke vergelijking (voor "500" === "0500" etc.)
  const bwrkNum = Number(bwrkStr);
  const rsrcNum = Number(rsrcStr);
  if (bwrkNum > 0) {
    match = ops.find(op => Number(op.code) === bwrkNum);
    if (match) return match;
  }
  if (rsrcNum > 0) {
    match = ops.find(op => Number(op.code) === rsrcNum);
    if (match) return match;
  }

  // 4. Case-insensitive code match
  const bwrkLower = bwrkStr.toLowerCase().trim();
  const rsrcLower = rsrcStr.toLowerCase().trim();
  match = ops.find(op => {
    const codeLower = op.code.toLowerCase().trim();
    return codeLower === bwrkLower || codeLower === rsrcLower;
  });
  if (match) return match;

  // 5. Machine-gekoppelde operatie (als machine gevonden is, zoek catalogus entry met die machine)
  if (machine) {
    match = ops.find(op => op.defaultMachineId === machine.id);
    if (match) return match;
  }

  return undefined;
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
   * @param bomData            Ruwe MKG BOM data (article + stlrData)
   * @param machines           Lijst van bekende machines (voor rsrc_num → machineId koppeling)
   * @param existingArticles   Bestaande PDM artikelen (voor BOM child-lookup)
   * @param userName           Naam van de gebruiker die de import uitvoert
   * @param mkgOperations      Catalogus van bekende bewerkingen (voor code → template koppeling)
   */
  mapToArticle: (
    bomData: MkgBomData,
    machines: Machine[],
    existingArticles: Article[],
    userName: string,
    mkgOperations?: PredefinedOperation[],
  ): MappedBomResult => {
    const now = getNowISO();
    const unknownResources: number[] = [];
    const newArticleCodes: string[] = [];
    const newPredefinedOps: PredefinedOperation[] = [];
    const allMkgOps = [...(mkgOperations || [])];

    // ── 1. Artikel basisgegevens ───────────────────────────────────────────
    const { article, stlrData } = bomData;

    // ── 2. Zoek de root regel (stlr_num === 1, het eindproduct) ────────────
    const rootRecord = stlrData.find(r => r.stlr_num === 1);

    // ── 3. Bewerkingen mappen (van alle stlr records met bewerkingen) ──────
    const operations: ArticleOperation[] = [];

    for (const stlr of stlrData) {
      if (!stlr.bewerkingen || stlr.bewerkingen.length === 0) continue;

      for (const stlb of stlr.bewerkingen) {
        const operation = mapStlbToOperation(stlb, machines, unknownResources, allMkgOps, newPredefinedOps);
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
      id: generateId(),
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
      newPredefinedOps,
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
  allMkgOps: PredefinedOperation[],
  newPredefinedOps: PredefinedOperation[],
): ArticleOperation {
  const machine = findMachineByRsrcNum(stlb.rsrc_num, machines);

  if (!machine && stlb.rsrc_num > 0) {
    unknownResources.push(stlb.rsrc_num);
  }

  // Zoek de PredefinedOperation — meerdere match-strategieën
  const bwrkStr = String(stlb.bwrk_num);
  const rsrcStr = String(stlb.rsrc_num);

  let predefinedOp = findPredefinedOp(allMkgOps, bwrkStr, rsrcStr, machine);

  if (predefinedOp) {
    console.log(`[MkgStuklijst] Bewerking bwrk=${bwrkStr} rsrc=${rsrcStr} gematcht aan catalogus: "${predefinedOp.name}" (${predefinedOp.id})`);
  }

  // Onbekende bewerking → automatisch nieuwe PredefinedOperation aanmaken
  if (!predefinedOp && (stlb.bwrk_num > 0 || stlb.rsrc_num > 0)) {
    // Check of we deze al eerder in deze batch hebben aangemaakt (op bwrk_num of rsrc_num)
    const alreadyCreated = newPredefinedOps.find(
      op => op.code === bwrkStr || op.code === rsrcStr
    );
    if (alreadyCreated) {
      predefinedOp = alreadyCreated;
    } else {
      // Bepaal of dit een proces of machine bewerking is
      const isProcess = !machine && stlb.rsrc_num > 0;
      const newOp: PredefinedOperation = {
        id: generateId(),
        code: bwrkStr !== '0' ? bwrkStr : rsrcStr,
        name: stlb.stlb_oms || `Bewerking ${bwrkStr}`,
        category: 'MKG Import',
        operationType: isProcess ? 'PROCESS' : 'MACHINING',
        defaultMachineId: machine?.id,
      };
      newPredefinedOps.push(newOp);
      allMkgOps.push(newOp);
      predefinedOp = newOp;
      console.log(`[MkgStuklijst] Nieuwe catalogus bewerking aangemaakt: code=${newOp.code}, type=${newOp.operationType}, naam="${newOp.name}"`);
    }
  }

  // Machine bepalen: eerst PredefinedOperation default, dan MKG rsrc_num match
  const effectiveMachine = machine || (predefinedOp?.defaultMachineId
    ? machines.find(m => m.id === predefinedOp.defaultMachineId)
    : undefined);

  // Setup variant aanmaken
  const setupVariant: SetupVariant = {
    id: generateId(),
    name: effectiveMachine ? effectiveMachine.name : `MKG Resource ${stlb.rsrc_num}`,
    machineId: effectiveMachine?.id ?? '',
    setupTemplateId: predefinedOp?.setupTemplateId || undefined,
    status: effectiveMachine ? SetupStatus.DRAFT : SetupStatus.REVIEW,
    isDefault: true,
    version: 1,
    setupTimeMinutes: Math.round((stlb.stlb_instel_tijd / 60) * 100) / 100,
    cycleTimeMinutes: Math.round((stlb.stlb_tijd_per_stuk / 60) * 100) / 100,
    steps: [],
    tools: [],
  };

  const operation: ArticleOperation = {
    id: generateId(),
    order: stlb.stlb_volgorde * 10,
    description: predefinedOp?.name || stlb.stlb_oms || `Bewerking ${stlb.stlb_volgorde}`,
    mkgOperationCode: predefinedOp?.id || undefined,
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
    id: generateId(),
    childArticleId: existingArticle?.id ?? '',
    childArticleName: stlr.stlr_oms_1 || undefined,
    childArticleCode: stlr.arti_code,
    position: stlr.stlr_pos || String(stlr.stlr_volgorde),
    quantity: stlr.stlr_aantal,
  };

  return bomItem;
}
