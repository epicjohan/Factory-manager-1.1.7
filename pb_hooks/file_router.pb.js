/**
 * Factory Manager — FileRouter v5.1 (PocketBase v0.35)
 * =====================================================
 *
 * Dit bestand registreert ALLEEN de hooks.
 * Alle logica staat in file_router_utils.js (geladen via require).
 *
 * PocketBase JSVM draait hooks in een pool van runtimes.
 * Functies gedefinieerd buiten de hook-callback zijn NIET beschikbaar.
 * Daarom laden we ze bij elke aanroep via require().
 *
 * Bestanden in pb_hooks/:
 *   file_router.pb.js       ← dit bestand (hook registratie)
 *   file_router_utils.js    ← logica (GEEN .pb.js extensie!)
 */

console.log("[FileRouter] v5.1 — Registering hooks...");

// ─── AFTER CREATE ────────────────────────────────────────

onRecordAfterCreateSuccess((e) => {
    try {
        const utils = require(__hooks + "/file_router_utils.js");
        utils.runFileSync(e);
    } catch (err) {
        console.error("[FileRouter] afterCreate fout: " + String(err));
    }
    e.next();
}, "machines", "tickets", "articles");

// ─── AFTER UPDATE ────────────────────────────────────────

onRecordAfterUpdateSuccess((e) => {
    try {
        const utils = require(__hooks + "/file_router_utils.js");
        utils.runFileSync(e);
    } catch (err) {
        console.error("[FileRouter] afterUpdate fout: " + String(err));
    }
    e.next();
}, "machines", "tickets", "articles");

// ─── AFTER DELETE ────────────────────────────────────────

onRecordAfterDeleteSuccess((e) => {
    try {
        const utils = require(__hooks + "/file_router_utils.js");
        utils.handleRecordDelete(e);
    } catch (err) {
        console.error("[FileRouter] afterDelete fout: " + String(err));
    }
    e.next();
}, "machines", "tickets", "articles");

console.log("[FileRouter] v5.1 — Ready. Listening on: machines, tickets, articles");
