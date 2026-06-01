/**
 * mkgCapaciteitService — Haalt geplande capaciteit (plnc) op uit MKG via de PocketBase proxy.
 * Slaat de data lokaal op in IndexedDB (KEYS.MKG_PLNC) en is klaar voor weergave per machine.
 */

import { KEYS, loadTable, saveTable } from '../db/core';
import { MkgPlncRecord, MkgPlnbRecord } from '../../types';

const getNowISO = () => new Date().toISOString();

/**
 * Zet een MKG duur-string om naar minuten.
 * MKG stuurt durations soms als HH:MM of als decimale uren.
 */
const toMinutes = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return Math.round(val);
    if (typeof val === 'string') {
        // HH:MM formaat
        if (val.includes(':')) {
            const [h, m] = val.split(':').map(Number);
            return (h || 0) * 60 + (m || 0);
        }
        // Decimale uren
        return Math.round(parseFloat(val) * 60);
    }
    return 0;
};

/**
 * Map een ruwe MKG plnc record naar ons MkgPlncRecord type.
 * Bevestigde data uit Postman test (2026-05-29):
 * - RowKey = unieke hex identifier (bijv. "0x0000000001d6b1fb")
 * - plnc_tijd altijd 0 in productiedata
 * - plnc_tijd_bemand in SECONDEN (bijv. 25200 = 7 uur)
 */
const mapPlncRecord = (raw: any): MkgPlncRecord => {
    const tijdBemandSec: number = typeof raw.plnc_tijd_bemand === 'number' ? raw.plnc_tijd_bemand : 0;
    const tijdOnbemandSec: number = typeof raw.plnc_tijd === 'number' ? raw.plnc_tijd : 0;
    return {
        id:                   raw.RowKey         ?? `${raw.admi_num}_${raw.rsrc_num}_${raw.plnc_datum}`,
        admi_num:             raw.admi_num        ?? 0,
        rsrc_num:             Number(raw.rsrc_num) || 0,
        prdh_num:             raw.prdh_num        ?? '',
        prdr_num:             raw.prdr_num        ?? 0,
        plnc_datum:           raw.plnc_datum      ?? '',
        plnc_week:            raw.plnc_week       ?? 0,
        plnc_maand:           raw.plnc_maand      ?? 0,
        plnc_tijd:            tijdOnbemandSec,
        plnc_tijd_min:        Math.round(tijdOnbemandSec / 60),  // seconden → minuten (onbemand)
        plnc_tijd_bemand:     tijdBemandSec,
        plnc_tijd_bemand_min: Math.round(tijdBemandSec / 60),    // seconden → minuten (bemand)
        plnc_forecast:        !!raw.plnc_forecast,
        syncedAt:             getNowISO(),
    };
};


export const mkgCapaciteitService = {

    /**
     * Haal alle lokaal opgeslagen plnc-records op.
     */
    getRecords: (): Promise<MkgPlncRecord[]> =>
        loadTable<MkgPlncRecord[]>(KEYS.MKG_PLNC, []),

    /**
     * Haal records op voor een specifieke resource.
     */
    getRecordsForResource: async (rsrcNum: number): Promise<MkgPlncRecord[]> => {
        const all = await loadTable<MkgPlncRecord[]>(KEYS.MKG_PLNC, []);
        // Gebruik Number() conversie — MKG kan rsrc_num als string sturen
        const numRsrc = Number(rsrcNum);
        const filtered = all.filter(r => Number(r.rsrc_num) === numRsrc);
        
        // Debug: log beschikbare resources en match
        const uniqueResources = [...new Set(all.map(r => r.rsrc_num))];
        console.log(`[MkgCapaciteit] Zoek rsrc_num=${numRsrc}, cache=${all.length} records, unieke resources: [${uniqueResources.join(', ')}], matches: ${filtered.length}`);
        
        return filtered;
    },

    /**
     * Haal records op voor een specifieke week.
     */
    getRecordsForWeek: async (weekNum: number): Promise<MkgPlncRecord[]> => {
        const all = await loadTable<MkgPlncRecord[]>(KEYS.MKG_PLNC, []);
        return all.filter(r => r.plnc_week === weekNum);
    },

    /**
     * Bereken bezettingsgraad per week per resource.
     * availableMinutesPerWeek: beschikbare minuten per week (bijv. 40u × 60 = 2400)
     */
    getBezettingPerWeek: async (rsrcNum: number, availableMinutesPerWeek = 2400): Promise<{
        week: number;
        datum: string;
        geplande_minuten: number;
        bezettingsgraad: number;
        orders: MkgPlncRecord[];
    }[]> => {
        const records = await mkgCapaciteitService.getRecordsForResource(rsrcNum);
        const byWeek = new Map<number, MkgPlncRecord[]>();
        for (const r of records) {
            if (!byWeek.has(r.plnc_week)) byWeek.set(r.plnc_week, []);
            byWeek.get(r.plnc_week)!.push(r);
        }
        return Array.from(byWeek.entries())
            .sort(([a], [b]) => a - b)
            .map(([week, orders]) => {
                const geplande_minuten = orders.reduce((s, r) => s + r.plnc_tijd, 0);
                return {
                    week,
                    datum: orders[0]?.plnc_datum ?? '',
                    geplande_minuten,
                    bezettingsgraad: Math.round((geplande_minuten / availableMinutesPerWeek) * 100),
                    orders,
                };
            });
    },

    /**
     * Sync: haalt plnc op via de PocketBase proxy en slaat op in IndexedDB.
     * Roep dit aan vanuit de sync-loop.
     */
    syncFromMkg: async (pbUrl: string): Promise<{ success: boolean; count: number; message: string }> => {
        try {
            const currentWeek = getCurrentWeekNumber();
            const response = await fetch(`${pbUrl}/api/mkg-proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action:   'SYNC_PLNC',
                    // Geen weekFrom filter — haal alles op, widget filtert client-side
                    limit:    5000,
                }),
            });

            if (!response.ok) {
                return { success: false, count: 0, message: `HTTP ${response.status}` };
            }

            const result = await response.json();
            if (!result.success) {
                return { success: false, count: 0, message: result.message || 'MKG fout' };
            }

            // De proxy (v4.0) extraheert al response.ResultData[0].plnc server-side.
            // result.data is dus een directe array van plnc-records.
            // Fallback: ook ruwe MKG-structuur afhandelen als de proxy dat niet deed.
            let rawRecords: any[] = [];
            if (Array.isArray(result.data)) {
                rawRecords = result.data;
            } else if (result.data?.response?.ResultData?.[0]?.plnc) {
                rawRecords = result.data.response.ResultData[0].plnc;
            } else if (result.rawResponse?.response?.ResultData?.[0]?.plnc) {
                rawRecords = result.rawResponse.response.ResultData[0].plnc;
            } else {
                console.warn('[MkgCapaciteit] Onverwacht data-formaat:', result);
                return { success: false, count: 0, message: 'Onverwacht data-formaat van MKG' };
            }

            const mapped = rawRecords.map(mapPlncRecord);

            // Samenvoegen met bestaande records (dedupliceer op id)
            const existing = await loadTable<MkgPlncRecord[]>(KEYS.MKG_PLNC, []);
            const existingMap = new Map(existing.map(r => [r.id, r]));
            for (const r of mapped) existingMap.set(r.id, r);
            const merged = Array.from(existingMap.values());

            await saveTable(KEYS.MKG_PLNC, merged);
            console.log(`[MkgCapaciteit] Sync voltooid: ${mapped.length} records, totaal ${merged.length} in cache.`);

            return { success: true, count: mapped.length, message: `${mapped.length} plnc-records gesynchroniseerd.` };

        } catch (err) {
            console.error('[MkgCapaciteit] Sync fout:', err);
            return { success: false, count: 0, message: String(err) };
        }
    },

    // ══════════════════════════════════════════════════════════════════════
    // PLNB — Planning bewerkingen (nieuw, vervangt plnc)
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Haal alle lokaal opgeslagen plnb-records op.
     */
    getPlnbRecords: (): Promise<MkgPlnbRecord[]> =>
        loadTable<MkgPlnbRecord[]>(KEYS.MKG_PLNB, []),

    /**
     * Haal plnb-records op voor een specifieke resource.
     */
    getPlnbForResource: async (rsrcNum: number): Promise<MkgPlnbRecord[]> => {
        const all = await loadTable<MkgPlnbRecord[]>(KEYS.MKG_PLNB, []);
        const numRsrc = Number(rsrcNum);
        const filtered = all.filter(r => Number(r.rsrc_num) === numRsrc);
        console.log(`[MkgPlnb] Zoek rsrc_num=${numRsrc}, cache=${all.length}, matches=${filtered.length}`);
        
        // Debug: als 0 matches, toon alle beschikbare resources
        if (filtered.length === 0 && all.length > 0) {
            const uniqueResources = [...new Set(all.map(r => Number(r.rsrc_num)))].sort((a, b) => a - b);
            console.log(`[MkgPlnb] ⚠ Resource ${numRsrc} NIET gevonden! Beschikbare resources (${uniqueResources.length}): [${uniqueResources.join(', ')}]`);
        }
        
        // Deduplicatie: MKG maakt meerdere plnb-records per order+bewerking (per tijdslot/batch).
        // Groepeer per prdh_num+bwrk_num en merge tot 1 record.
        const merged = deduplicatePlnbRecords(filtered);
        console.log(`[MkgPlnb] Na deduplicatie: ${filtered.length} → ${merged.length} unieke bewerkingen`);
        
        return merged;
    },

    /**
     * Groepeer plnb-records per startweek voor een resource.
     */
    getPlnbByWeek: async (rsrcNum: number): Promise<Map<number, MkgPlnbRecord[]>> => {
        const records = await mkgCapaciteitService.getPlnbForResource(rsrcNum);
        const map = new Map<number, MkgPlnbRecord[]>();
        for (const r of records) {
            const week = r.plnb_wk_start || 0;
            if (!map.has(week)) map.set(week, []);
            map.get(week)!.push(r);
        }
        return map;
    },

    /**
     * Synchroniseer plnb (planning bewerkingen) vanuit MKG.
     * @param pbUrl PocketBase URL
     * @param rsrcNum Optioneel: alleen voor deze resource ophalen (veel sneller)
     */
    syncPlnbFromMkg: async (pbUrl: string, rsrcNum?: number): Promise<{ success: boolean; count: number; message: string }> => {
        try {
            const requestBody: any = {
                action: 'SYNC_PLNB',
            };
            if (rsrcNum) {
                requestBody.rsrcNum = rsrcNum;
                console.log(`[MkgPlnb] Sync voor resource ${rsrcNum}`);
            }
            
            const response = await fetch(`${pbUrl}/api/mkg-proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                return { success: false, count: 0, message: `HTTP ${response.status}` };
            }

            const result = await response.json();
            if (!result.success) {
                return { success: false, count: 0, message: result.message || 'MKG fout' };
            }

            // Extractie: proxy geeft data als array, of MKG nested structuur
            let rawRecords: any[] = [];
            if (Array.isArray(result.data)) {
                rawRecords = result.data;
            } else if (result.data?.response?.ResultData?.[0]?.plnb) {
                rawRecords = result.data.response.ResultData[0].plnb;
            } else if (result.rawResponse?.response?.ResultData?.[0]?.plnb) {
                rawRecords = result.rawResponse.response.ResultData[0].plnb;
            } else {
                console.warn('[MkgPlnb] Onverwacht data-formaat:', result);
                return { success: false, count: 0, message: 'Onverwacht data-formaat van MKG' };
            }

            // Debug: log eerste 3 ruwe records om formaat te analyseren
            for (let i = 0; i < Math.min(3, rawRecords.length); i++) {
                const r = rawRecords[i];
                console.log(`[MkgPlnb] RAW record ${i}:`, JSON.stringify({
                    prdh_num: r.prdh_num,
                    rsrc_num: r.rsrc_num,
                    arti_code: r.arti_code,
                    arti_oms1: r.arti_oms1,
                    arti_tek_num: r.arti_tek_num,
                    plnb_duur: r.plnb_duur,
                    plnb_instel_tijd: r.plnb_instel_tijd,
                    plnb_tijd_per_stuk: r.plnb_tijd_per_stuk,
                    plnb_aantal: r.plnb_aantal,
                }));
            }

            const mapped = rawRecords.map(mapPlnbRecord);
            
            // Client-side filter: verwijder afgeronde bewerkingen
            const open = mapped.filter(r => !r.plnb_gereed);
            console.log(`[MkgPlnb] Totaal: ${mapped.length}, niet-gereed: ${open.length}, gereed (verwijderd): ${mapped.length - open.length}`);

            // ── Artikelgegevens verrijken via artiMap uit proxy response ──
            const artiMap = result.artiMap || {};
            const artiKeys = Object.keys(artiMap);
            if (artiKeys.length > 0) {
                console.log(`[MkgPlnb] ${artiKeys.length} artikelen ontvangen van proxy, verrijken...`);
                for (const r of open) {
                    const artInfo = artiMap[r.arti_code];
                    if (artInfo) {
                        r.arti_oms1 = String(artInfo.arti_oms_1 || '');
                        r.arti_tek_num = String(artInfo.arti_tekening || '');
                    }
                }
            } else {
                console.log('[MkgPlnb] Geen artikeldata in proxy response.');
            }

            if (rsrcNum) {
                // Per-resource sync: vervang alleen records van deze resource in cache
                const existing = await loadTable<MkgPlnbRecord[]>(KEYS.MKG_PLNB, []);
                const numRsrc = Number(rsrcNum);
                const otherRecords = existing.filter(r => Number(r.rsrc_num) !== numRsrc);
                const merged = [...otherRecords, ...open];
                await saveTable(KEYS.MKG_PLNB, merged);
                console.log(`[MkgPlnb] Sync resource ${rsrcNum}: ${open.length} records (cache totaal: ${merged.length})`);
            } else {
                // Volledige sync: vervang alles
                await saveTable(KEYS.MKG_PLNB, open);
                console.log(`[MkgPlnb] Sync voltooid: ${open.length} openstaande bewerkingen opgeslagen.`);
            }

            return { success: true, count: open.length, message: `${open.length} bewerkingen gesynchroniseerd.` };
        } catch (err) {
            console.error('[MkgPlnb] Sync fout:', err);
            return { success: false, count: 0, message: String(err) };
        }
    },
};

/**
 * Dedupliceer plnb-records: MKG maakt meerdere records per order+bewerking+week (tijdslots).
 * Groepeer per prdh_num+bwrk_num+plnb_wk_start en merge tot 1 record per week.
 * Zo blijft per week een apart record bestaan, maar worden tijdslots binnen 1 week gemerged.
 */
const deduplicatePlnbRecords = (records: MkgPlnbRecord[]): MkgPlnbRecord[] => {
    const groups = new Map<string, MkgPlnbRecord[]>();
    
    for (const r of records) {
        const key = `${r.prdh_num}_${r.bwrk_num}_${r.plnb_wk_start}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
    }
    
    return Array.from(groups.values()).map(group => {
        if (group.length === 1) return group[0];
        
        // Neem het eerste record als basis
        const base = { ...group[0] };
        
        // Vroegste start, laatste eind
        for (const r of group) {
            if (r.plnb_dat_start && r.plnb_dat_start < base.plnb_dat_start) {
                base.plnb_dat_start = r.plnb_dat_start;
                base.plnb_tijd_start = r.plnb_tijd_start;
            }
            if (r.plnb_dat_eind && r.plnb_dat_eind > base.plnb_dat_eind) {
                base.plnb_dat_eind = r.plnb_dat_eind;
                base.plnb_tijd_eind = r.plnb_tijd_eind;
            }
            // Vroegste startweek, laatste eindweek
            if (r.plnb_wk_start > 0 && (base.plnb_wk_start === 0 || r.plnb_wk_start < base.plnb_wk_start)) {
                base.plnb_wk_start = r.plnb_wk_start;
            }
            if (r.plnb_wk_eind > base.plnb_wk_eind) {
                base.plnb_wk_eind = r.plnb_wk_eind;
            }
            // Als minstens 1 record gestart is → gestart
            if (r.plnb_gestart) base.plnb_gestart = true;
        }
        
        // Insteltijd: neem slechts 1x mee (niet per tijdslot herhalen)
        // Werktijd (plnb_duur_min) = instel + (tijd_per_stuk × aantal) — al correct per record
        // Maar bij duplicaten is het PER RECORD dezelfde waarde, dus NIET sommeren
        // We houden het basis-record aan want alle duplicaten zijn identiek qua berekende werktijd
        
        // Bestede tijd: neem de max (meest recente status)
        base.plnb_tijd_besteed = Math.max(...group.map(r => r.plnb_tijd_besteed));
        base.plnb_tijd_besteed_min = Math.round(base.plnb_tijd_besteed / 60);
        
        // Aantal gereed: neem de max
        base.plnb_aantal_grd = Math.max(...group.map(r => r.plnb_aantal_grd));
        
        return base;
    });
};

/**
 * Map een ruwe MKG plnb record naar MkgPlnbRecord.
 */
const mapPlnbRecord = (raw: any): MkgPlnbRecord => {
    const duurSec = Number(raw.plnb_duur) || 0;              // kalendertijd (inclusief nachten/weekenden)
    const instalSec = Number(raw.plnb_instel_tijd) || 0;     // insteltijd in seconden
    const besteedSec = Number(raw.plnb_tijd_besteed) || 0;
    const tijdPerStuk = Number(raw.plnb_tijd_per_stuk) || 0; // seconden per stuk
    const aantal = Number(raw.plnb_aantal) || 0;

    // Werktijd = insteltijd + (tijd per stuk × aantal)
    // plnb_duur is de KALENDERTIJD (doorlooptijd), niet de werktijd!
    const werktijdSec = instalSec + (tijdPerStuk * aantal);

    return {
        id:                      raw.RowKey ?? `${raw.admi_num}_${raw.rsrc_num}_${raw.prdh_num}_${raw.bwrk_num}`,
        admi_num:                Number(raw.admi_num) || 0,
        rsrc_num:                Number(raw.rsrc_num) || 0,
        prdh_num:                String(raw.prdh_num ?? ''),
        prdr_num:                Number(raw.prdr_num) || 0,
        bwrk_num:                Number(raw.bwrk_num) || 0,
        plnb_num:                Number(raw.plnb_num) || 0,
        plnb_oms:                String(raw.plnb_oms ?? ''),

        plnb_dat_start:          String(raw.plnb_dat_start ?? ''),
        plnb_dat_eind:           String(raw.plnb_dat_eind ?? ''),
        plnb_dat_gestart:        String(raw.plnb_dat_gestart ?? ''),
        plnb_wk_start:           Number(raw.plnb_wk_start) || 0,
        plnb_wk_eind:            Number(raw.plnb_wk_eind) || 0,
        plnb_tijd_start:         Number(raw.plnb_tijd_start) || 0,
        plnb_tijd_eind:          Number(raw.plnb_tijd_eind) || 0,

        plnb_duur:               duurSec,                           // kalendertijd (doorlooptijd) in sec
        plnb_duur_min:           Math.round(werktijdSec / 60),      // WERKTIJD in minuten (instel + productie)
        plnb_instel_tijd:        instalSec,
        plnb_instel_min:         Math.round(instalSec / 60),

        plnb_tijd_per_stuk:      tijdPerStuk,
        plnb_plan_tijd_per_stuk: Number(raw.plnb_plan_tijd_per_stuk) || 0,

        plnb_aantal:             aantal,
        plnb_aantal_grd:         Number(raw.plnb_aantal_grd) || 0,
        plnb_start_aantal:       Number(raw.plnb_start_aantal) || 0,
        plnb_gestart:            !!raw.plnb_gestart,
        plnb_gereed:             !!raw.plnb_gereed,
        plnb_forecast:           !!raw.plnb_forecast,

        plnb_onbemand:           !!raw.plnb_onbemand,
        plnb_vast:               !!raw.plnb_vast,
        plnb_uitbesteden:        !!raw.plnb_uitbesteden,
        cred_num:                String(raw.cred_num ?? ''),

        plnb_tijd_besteed:       besteedSec,
        plnb_tijd_besteed_min:   Math.round(besteedSec / 60),
        plnb_prod_fase:          Number(raw.plnb_prod_fase) || 0,
        plnb_memo:               String(raw.plnb_memo ?? ''),
        plnb_volgorde:           Number(raw.plnb_volgorde) || 0,

        arti_code:               String(raw.arti_code ?? ''),
        arti_oms1:               String(raw.arti_oms1 ?? ''),
        arti_tek_num:            String(raw.arti_tek_num ?? ''),

        syncedAt:                getNowISO(),
    };
};

/** ISO week number voor de huidige datum. */
function getCurrentWeekNumber(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil((diff / oneWeek) + 1);
}
