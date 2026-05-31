# MKG API Architectuur — Factory Manager

> Vastgelegd op basis van geleerde lessen tijdens de MKG planning integratie (mei 2026).

## Overzicht

Factory Manager communiceert met MKG via een **PocketBase proxy** (`pb_hooks/mkg_proxy.pb.js`).
De browser praat nooit direct met de MKG API — alle calls gaan via de proxy.

```
Browser (React)
    │
    │  POST /api/mkg-proxy  { action: "SYNC_PLNB", rsrcNum: 2113 }
    ▼
PocketBase Proxy (Goja JS)
    │
    │  GET /api/v1/Documents/plnb/?FieldList=...&Filter=...
    │  GET /api/v1/Documents/arti/?FieldList=...&Filter=...
    ▼
MKG API Server
```

---

## Regels

### 1. Proxy als aggregator

Elke feature krijgt **1 proxy actie** die server-side alle benodigde MKG calls combineert.

```javascript
// ✅ Goed: 1 actie, meerdere MKG calls server-side
if (body.action === "SYNC_PLNB") {
    // 1. Haal plnb records op
    // 2. Haal artikeldata op (inline)
    // 3. Return gecombineerd resultaat
}

// ❌ Fout: aparte calls vanuit de browser
// Frontend → SYNC_PLNB
// Frontend → FETCH_ARTI  ← PocketBase body parser breekt arrays
```

**Reden:** PocketBase's JavaScript runtime (Goja) heeft beperkingen met body parsing. Server-side aggregatie omzeilt dit volledig.

### 2. Geen arrays in request body

PocketBase's body parser verwerkt JavaScript arrays **niet betrouwbaar**.

```javascript
// ❌ Fout: arrays in body
body: JSON.stringify({ codes: ["A", "B", "C"] })
// → proxy ontvangt body.codes als undefined

// ✅ Goed: strings en nummers
body: JSON.stringify({ rsrcNum: 2113 })
body: JSON.stringify({ codesStr: "A,B,C" })  // komma-gescheiden als fallback
```

**Ondersteunde types in body:** `string`, `number`, `boolean`.

### 3. Per-resource fetchen

Haal **niet** alle data van alle machines/resources tegelijk op. Filter altijd op wat je nodig hebt.

```javascript
// ❌ Fout: alles ophalen (50.000+ records, paginatie-limiet)
Filter = ""  // geen filter

// ✅ Goed: per resource
Filter = "rsrc_num = 2113"
```

**Reden:** MKG heeft duizenden records per tabel. Zonder filter loop je tegen paginalimiet en worden sommige resources afgesneden.

### 4. Paginatie

MKG levert maximaal **1000 records per request**. Gebruik altijd een paginatie-loop:

```javascript
var pageSize = 1000;
var maxPages = 50;  // veiligheidsgrens
var allRecords = [];

for (var page = 0; page < maxPages; page++) {
    var params = "&NumRows=" + pageSize + "&StartRow=" + (page * pageSize);
    var pageData = fetchPage(params);
    allRecords = allRecords.concat(pageData);
    
    if (pageData.length < pageSize) break;  // laatste pagina
}
```

### 5. Client-side caching (IndexedDB)

Data wordt opgeslagen in IndexedDB via de `db/core.ts` service.

```typescript
// Per-resource sync: vervang alleen records van die resource
const existing = await loadTable<Record[]>(KEYS.TABLE, []);
const otherRecords = existing.filter(r => r.rsrc_num !== rsrcNum);
const merged = [...otherRecords, ...newRecords];
await saveTable(KEYS.TABLE, merged);
```

**Regel:** Bij per-resource sync, verwijder alleen de records van die resource en voeg de nieuwe toe. Raak data van andere resources niet aan.

### 6. Verrijking is niet-fataal

Als gerelateerde data (bijv. artikelgegevens) niet opgehaald kan worden, toon toch de basisdata.

```javascript
// In proxy:
try {
    // Haal artikeldata op
} catch (artiErr) {
    console.warn("Artikeldata mislukt (niet fataal): " + String(artiErr));
    // artiMap blijft leeg {}, basis plnb data wordt toch geretourneerd
}
```

### 7. Deduplicatie

MKG maakt vaak **meerdere records** per logische eenheid (bijv. per tijdslot/batch). Dedupliceer client-side:

```typescript
// Groepeer per uniek sleutel
const key = `${r.prdh_num}_${r.bwrk_num}_${r.plnb_wk_start}`;

// Merge groepen tot 1 record:
// - Vroegste start, laatste eind
// - Insteltijd 1x (niet vermenigvuldigen)
// - Max aantal_grd
// - Als ≥1 gestart → gestart
```

---

## Bestandsstructuur

| Bestand | Rol |
|---|---|
| `pb_hooks/mkg_proxy.pb.js` | PocketBase proxy — alle MKG API communicatie |
| `services/mkg/mkgCapaciteitService.ts` | Frontend service — sync, cache, deduplicatie |
| `types/system.ts` | TypeScript types voor MKG records |
| `components/machine/MkgPlanningWidget.tsx` | UI widget — planning weergave |
| `services/db/core.ts` | IndexedDB cache layer |

---

## Nieuwe feature toevoegen — checklist

### 1. Proxy actie toevoegen (`pb_hooks/mkg_proxy.pb.js`)

```javascript
if (body.action === "SYNC_NIEUW") {
    var loginResult = mkgLogin(cfg);
    
    // Hoofddata ophalen (met paginatie)
    var fields = "veld1,veld2,veld3";
    var filter = [];
    if (body.filterParam) filter.push("veld = " + body.filterParam);
    
    // Paginatie loop...
    
    // Gerelateerde data ophalen (inline, try/catch)
    
    // Return
    return e.json(200, {
        success: true,
        data: allRecords,
        extraMap: relatedData
    });
}
```

### 2. Types definiëren (`types/system.ts`)

```typescript
export interface MkgNieuwRecord {
    veld1: string;
    veld2: number;
    // ...
    syncedAt: string;
}
```

### 3. Service toevoegen (`services/mkg/`)

```typescript
// Sync functie
syncNieuwFromMkg: async (pbUrl: string, filterParam?: number) => { ... }

// Cache ophalen
getNieuwForX: async (xId: number) => { ... }

// Mapping functie
const mapNieuwRecord = (raw: any): MkgNieuwRecord => { ... }
```

### 4. Widget/component bouwen

```tsx
// Sync knop → service.syncNieuwFromMkg(pbUrl, filterParam)
// Data laden → service.getNieuwForX(xId)
```

### 5. Deployen

1. `pb_hooks/mkg_proxy.pb.js` → server kopiëren + **PocketBase herstarten**
2. `dist/` → server kopiëren
3. Testen via browser console

---

## MKG API referentie

### Basis URL
```
{MKG_URL}/api/v1/Documents/{tabel}/
```

### Parameters
| Parameter | Beschrijving | Voorbeeld |
|---|---|---|
| `FieldList` | Komma-gescheiden veldnamen | `arti_code,arti_oms_1` |
| `Filter` | Filterexpressie | `rsrc_num = 2113` |
| `NumRows` | Max records per request | `1000` |
| `StartRow` | Offset voor paginatie | `0`, `1000`, `2000` |

### Bekende tabellen
| Tabel | Document | Omschrijving |
|---|---|---|
| `plnb` | 258 | Planning bewerkingen |
| `plnc` | 259 | Capaciteit resources |
| `arti` | 185 | Artikelen |
| `prdh` | - | Productieorder headers |
| `prdr` | - | Productieorder regels |
| `rsrc` | - | Resources/machines |

### Authenticatie
- **Login:** POST naar `{MKG_URL}/api/v1/Login/` met `Username` + `Password`
- **Session:** Cookie `sessionId` uit login response
- **API Key:** Header `api-key` bij elke request

---

## Bekende beperkingen

1. **PocketBase Goja runtime:** Geen `Array.isArray()`, geen arrays in body parsing
2. **MKG paginatie:** Max 1000 records per request
3. **MKG boolean filter:** `plnb_gereed = false` werkt onbetrouwbaar — filter client-side
4. **Resources 2105/2108:** Ontbreken in MKG plnb response bij bulk fetch (>50k records), werken wel bij per-resource fetch
