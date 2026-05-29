/**
 * mkgCapaciteitService — Haalt geplande capaciteit (plnc) op uit MKG via de PocketBase proxy.
 * Slaat de data lokaal op in IndexedDB (KEYS.MKG_PLNC) en is klaar voor weergave per machine.
 */

import { KEYS, loadTable, saveTable } from '../db/core';
import { MkgPlncRecord } from '../../types';

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
 */
const mapPlncRecord = (raw: any): MkgPlncRecord => ({
    id: `${raw.admi_num ?? 0}_${raw.rsrc_num ?? 0}_${raw.plnc_week ?? 0}_${raw.plnc_datum ?? ''}`,
    admi_num:         raw.admi_num        ?? 0,
    rsrc_num:         raw.rsrc_num        ?? 0,
    prdh_num:         raw.prdh_num        ?? '',
    prdr_num:         raw.prdr_num        ?? 0,
    plnb_num:         raw.plnb_num        ?? 0,
    plnb_type:        raw.plnb_type       ?? 0,
    plnc_admi:        raw.plnc_admi       ?? 0,
    plnc_datum:       raw.plnc_datum      ?? '',
    plnc_week:        raw.plnc_week       ?? 0,
    plnc_maand:       raw.plnc_maand      ?? 0,
    plnc_tijd:        toMinutes(raw.plnc_tijd),
    plnc_tijd_bemand: toMinutes(raw.plnc_tijd_bemand),
    plnc_forecast:    !!raw.plnc_forecast,
    plns_num:         raw.plns_num        ?? 0,
    syncedAt:         getNowISO(),
});

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
        return all.filter(r => r.rsrc_num === rsrcNum);
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
                    weekFrom: currentWeek,
                    limit:    1000,
                }),
            });

            if (!response.ok) {
                return { success: false, count: 0, message: `HTTP ${response.status}` };
            }

            const result = await response.json();
            if (!result.success) {
                return { success: false, count: 0, message: result.message || 'MKG fout' };
            }

            // result.data kan een array zijn of een object met een data-property
            const rawRecords: any[] = Array.isArray(result.data)
                ? result.data
                : (result.data?.data ?? result.data?.items ?? []);

            if (!Array.isArray(rawRecords)) {
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
};

/** ISO week number voor de huidige datum. */
function getCurrentWeekNumber(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil((diff / oneWeek) + 1);
}
