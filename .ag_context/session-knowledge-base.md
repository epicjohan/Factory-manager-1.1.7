# Factory Manager — Sessie Kennisbank & Architectuur Beslissingen

> Bijgewerkt: 2 juni 2026 — Bevat alle kennis, beslissingen en technische details uit de ontwikkelsessies.

---

## 1. Architectuur Overzicht

### Technologie Stack

| Component | Technologie | Locatie |
|---|---|---|
| Frontend | React + TypeScript + Vite | `components/`, `pages/`, `services/` |
| Backend | PocketBase v0.35 (Go) | Server `10.1.111.26:8090` |
| MKG Proxy | PocketBase Hook (Goja JS) | `pb_hooks/mkg_proxy.pb.js` |
| Lokale opslag | IndexedDB | Browser (offline-first) |
| Sync | Outbox-patroon + SSE | `services/sync.ts` |
| File storage | PocketBase file fields | `documents` collectie |

### Data Flow

```
MKG ERP ←→ PocketBase Proxy ←→ PocketBase Server ←→ Browser (IndexedDB)
                                       ↕
                                  EventSource SSE
                                       ↕
                                Andere Browsers/Tablets
```

---

## 2. MKG Integratie — Volledige Staat

### Proxy Acties (pb_hooks/mkg_proxy.pb.js)

| Actie | Tabellen | Beschrijving | Status |
|---|---|---|---|
| `PING` | (root) | Verbindingstest | ✅ Werkt |
| `REQUEST` | (generiek) | Passthrough naar elk endpoint | ✅ Werkt |
| `SYNC_PLNC` | `plnc` | Capaciteitsplanning ophalen | ✅ Werkt |
| `SYNC_PLNB` | `plnb` + `arti` | Planning bewerkingen (gepagineerd) | ✅ Werkt |
| `UPDATE_PLNB` | `plnb` | Bewerking bijwerken (starten/gereedmelden) | ✅ Werkt |
| `APPEND_PRDH_MEMO` | `prdh` | Memo toevoegen aan productieorder | ✅ Werkt |
| `FETCH_ARTI` | `arti` | Artikeldata ophalen | ✅ Werkt |
| `FETCH_BOM` | `arti` + `stlr` + sub | Volledige stuklijst ophalen | ✅ Werkt |
| `DISCOVER_DOCS` | `docs` + `arti` + `stlr` | Document discovery (eenmalig) | ✅ Tijdelijk |

### MKG REST API Details

```
Auth:  https://{server}/mkg/static/auth/j_spring_security_check
API:   https://{server}/mkg/web/v3/MKG/Documents/{tabel}/
```

**Officiële API documentatie:**
🔗 https://www.mkg.eu/nl-NL/mijn-mkg/support/landingspagina/12152

**Authenticatie flow:**
1. POST login → ontvang JSESSIONID cookie
2. Gebruik cookie + `X-customerID` header bij elke API call

**Query parameters:** `FieldList`, `Filter`, `NumRows`, `StartRow`

### Bekende MKG Tabellen

| Tabel | Doc# | Omschrijving | In gebruik? |
|---|---|---|---|
| `plnb` | 258 | Planning bewerkingen | ✅ |
| `plnc` | 259 | Capaciteit resources | ✅ |
| `arti` | 185 | Artikelen | ✅ |
| `prdh` | - | Productieorder headers | ✅ |
| `prdr` | - | Productieorder regels | Niet direct |
| `stlr` | - | Stuklijstregels | ✅ |
| `stlb` | - | Stuklijst bewerkingen | ✅ (sub-collectie) |
| `stlm` | - | Stuklijst materialen | ✅ (sub-collectie) |
| `rsrc` | - | Resources/machines | Niet direct |
| `docs` | 420 | Documenten | 🔍 Discovery fase |

---

## 3. DMS Module — Document Management System

### Hoe bestanden worden opgeslagen

```typescript
// 1. Bestand → Base64
const base64 = await fileReader.readAsDataURL(file);

// 2. DMSDocument aanmaken
const doc = await documentService.addDocumentFromBase64(name, type, base64, size);
// → Genereert DOC-{YYYY}-{0001}-{random4} nummer
// → Opgeslagen in IndexedDB (fm_table_documents)
// → Automatisch in outbox voor PocketBase sync

// 3. ArticleFile metadata koppelen
const articleFile: ArticleFile = {
    id: generateId(),
    documentId: doc.id,           // Koppeling naar DMSDocument
    name: file.name,
    type: file.type,
    uploadedBy: userName,
    uploadDate: new Date().toISOString(),
    fileRole: 'DRAWING',          // of 'MODEL', 'CAM', 'NC', 'OTHER'
    version: 1
};

// 4. Toevoegen aan artikel
article.files.push(articleFile);
```

### Sync naar PocketBase

```
IndexedDB → Outbox → FormData (multipart) → PocketBase
                                                ↓
                                        SSE EventSource
                                                ↓
                                        Andere clients
```

- Base64 `url` → geconverteerd naar Blob → FormData upload
- PocketBase slaat bestand op in `documents` collectie
- Andere clients ontvangen metadata via SSE, downloaden bestand on-demand

### Document Categorieën (Factory Manager)

| Code | Naam | Icoon | Kleur | Systeem? |
|---|---|---|---|---|
| `DRAWING` | Tekening (PDF) | FileText | blue | ✅ |
| `MODEL` | 3D Model (STEP) | Box | purple | ✅ |
| `CAM` | CAM Programma | FileCode | orange | ✅ |
| `NC` | NC Code | Terminal | green | ✅ |
| `OTHER` | Overig | File | slate | ✅ |
| `KLANT_TEKENING` | Klant Tekening | FileText | cyan | ❌ (gepland) |
| `KLANT_STEP` | Klant STEP | Box | violet | ❌ (gepland) |

---

## 4. Planning & Auto-Sync

### MKG Planning Auto-Sync

Alle componenten die MKG planning data tonen synchroniseren automatisch op basis van de `mkgSyncIntervalMinutes` instelling:

| Component | Auto-sync | Locatie |
|---|---|---|
| `MkgPlanningWidget.tsx` | ✅ | Machine overzichtspagina |
| `JobSection.tsx` | ✅ | Werkorder tab in dashboard |
| `ProductionDashboard.tsx` | ✅ | Operator production view |
| `PlanningTvDashboard.tsx` | ✅ | TV dashboard (alle resources) |

**Configuratie:**
- Instelling: `mkgSyncIntervalMinutes` (via Instellingen → Integraties → MKG)
- Waarde `0` = alleen handmatig syncen
- Waarde `> 0` = automatisch syncen op dat interval (in minuten)
- Elk device synct onafhankelijk direct met de MKG API

### Sync Flow voor nieuw device

1. Device opent Factory Manager URL
2. PocketBase sync → machines worden opgehaald (met `mkgResourceCode`)
3. MKG auto-sync → `syncAllResources()` vindt resources en haalt planning op
4. Herhaalt op ingesteld interval

---

## 5. BOM Import (Stuklijst)

### Import Flow

```
Planning → Selecteer artikel → FETCH_BOM → Preview → Importeren
```

**Wat wordt geïmporteerd:**
- Artikelcode, omschrijving, tekeningnummer
- Bewerkingen (stlb) → ArticleOperation + SetupVariant
- Materialen (stlm) → ArticleBOMItem
- Tijden: MKG seconden → FM minuten conversie
- Onbekende resources → gelogd als `unknownResources`
- Nieuwe artikelcodes → gelogd als `newArticleCodes`
- PredefinedOperation entries automatisch aangemaakt

### Relevante Service

`services/mkg/mkgStuklijstService.ts` — mapt MKG data naar FM types

---

## 6. Gereedmelden & Starten

### Bewerking Starten
- Check of `plnb_gestart` al `true` is → zo ja, skip API call (422 voorkomen)
- Stuurt `plnb_gestart: true`, `plnb_dat_start_werkelijk: today` naar MKG
- Logt memo in productieorder

### Bewerking Gereedmelden
- Check of `plnb_gereed` al `true` is → zo ja, skip API call (422 voorkomen)
- Stuurt `plnb_gereed: markeerGereed`, `plnb_aantal_grd: aantal` naar MKG
- Logt memo in productieorder
- Verwijdert record uit lokale cache als gereed

### Bekende MKG 422 fouten
- **Dubbel starten:** MKG weigert als `plnb_gestart` al `true` is
- **Dubbel gereedmelden:** MKG weigert als `plnb_gereed` al `true` is
- **Fix:** Frontend checkt lokale staat vóór API call

### Error Handling
- HTML responses van MKG worden gestript (regex `/<[^>]*>/g`)
- HTTP 422 → gebruikersvriendelijke melding
- Memo loggen gaat door ook als API call faalt

---

## 7. Ontwikkelregels & Constraints

### Production Dashboard
> **"Ik wil het production dashboard heilig maken alleen dan aangevuld met de MKG knoppen. Dus er mag niet veranderen in de layout en werking van het production dashboard!!!"**

### MKG Planning Data
- MKG planning (`plnb`) blijft **lokaal** in IndexedDB
- Wordt NIET naar PocketBase gesynchroniseerd
- Auto-sync is de manier om consistentie tussen clients te waarborgen
- Planning data wordt per-resource gefetcht en samengevoegd

### MKG Artikelen & Setups
- Artikelen aangemaakt via BOM import worden WEL naar PocketBase gesynchroniseerd
- Gebruikt dezelfde `articleService.addArticle()` flow als handmatige creatie
- Gaat via outbox-patroon → automatische PocketBase sync

### PocketBase Hook Herstart
- `pb_hooks/*.pb.js` worden alleen geladen bij **PocketBase herstart**
- Na wijzigingen aan de proxy: altijd PocketBase herstarten op de server

---

## 8. Bestandsstructuur — Belangrijkste Bestanden

### MKG Integratie
| Bestand | Rol |
|---|---|
| `pb_hooks/mkg_proxy.pb.js` | PocketBase proxy — alle MKG API communicatie |
| `services/mkg/mkgCapaciteitService.ts` | Frontend service — planning sync, cache, gereedmelden |
| `services/mkg/mkgStuklijstService.ts` | Frontend service — BOM import, artikel mapping |
| `services/mkg/mkgDocumentService.ts` | (GEPLAND) Frontend service — document import |
| `types/system.ts` | TypeScript types voor MKG records |

### DMS & Artikelen
| Bestand | Rol |
|---|---|
| `services/db/documentService.ts` | Document CRUD (addDocumentFromBase64, etc.) |
| `services/db/articleService.ts` | Artikel CRUD + outbox sync |
| `services/storage.ts` | DB facade (db.addArticle, db.getServerSettings, etc.) |
| `services/sync.ts` | PocketBase sync — outbox processing, SSE, file upload |
| `types/pdm.ts` | Types: Article, ArticleFile, DMSDocument, FileRole |

### Components
| Bestand | Rol |
|---|---|
| `components/machine/MkgActionModal.tsx` | Modal voor starten/gereedmelden MKG bewerkingen |
| `components/machine/MkgPlanningWidget.tsx` | Planning widget met MKG orders |
| `components/machine/MkgBomImportModal.tsx` | BOM import modal (wordt uitgebreid met documenten) |
| `components/machine/JobSection.tsx` | Werkorder tab met MKG integratie |
| `components/pdm/ArticleFiles.tsx` | DMS bestanden component |
| `pages/ProductionDashboard.tsx` | Operator dashboard |
| `pages/PlanningTvDashboard.tsx` | TV dashboard voor planning |

### Data Dictionary (MKG velden exports)

Locatie: `Data dictionairy/` (project root)

> **Let op:** mapnaam bevat een typfout (`dictionairy` i.p.v. `dictionary`) — dit is bewust behouden voor backwards compatibility.

| Bestand | MKG Tabel | Inhoud | In gebruik? |
|---|---|---|---|
| `docu.xlsx` | `docs` (420) | Alle 47 velden van de documenten tabel | ✅ Discovery |
| `stlr.xlsx` | `stlr` | Stuklijstregels — velden + sub-collecties (stlr_stlb, stlr_files, etc.) | ✅ BOM import |
| `stlb.xlsx` | `stlb` | Stuklijst bewerkingen — velden | ✅ BOM import |
| `prdh.xlsx` | `prdh` | Productieorder headers — velden | ✅ Memo's |
| `MKG velden Artikel.xlsx` | `arti` (185) | Artikelvelden (originele export) | ✅ Referentie |
| `artikel velden.xlsx` | `arti` | Artikelvelden (alternatieve export) | ✅ Referentie |
| `planning dump.xlsx` | `plnb`/`plnc` | Planning velden en voorbeelddata | ✅ Planning sync |
| `capaciteits overzicht.xlsx` | `plnc` | Capaciteitsplanning velden | ✅ Capaciteit |

**Hoe te gebruiken (agents):**
```bash
# Parse een Excel data dictionary naar leesbare tekst:
python3 -c "
import zipfile, xml.etree.ElementTree as ET
z = zipfile.ZipFile('Data dictionairy/stlr.xlsx')
ss = []
try:
    tree = ET.parse(z.open('xl/sharedStrings.xml'))
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    for si in tree.findall('.//s:si', ns):
        texts = si.findall('.//s:t', ns)
        ss.append(''.join(t.text or '' for t in texts))
except: pass
tree = ET.parse(z.open('xl/worksheets/sheet1.xml'))
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
for row in tree.findall('.//s:row', ns):
    cells = []
    for c in row.findall('s:c', ns):
        v = c.find('s:v', ns)
        val = v.text if v is not None else ''
        if c.get('t') == 's' and val:
            val = ss[int(val)] if int(val) < len(ss) else val
        cells.append(val)
    print(' | '.join(cells))
"
```

---

## 9. Geplande Features

### MKG Document Import (wacht op MKG API team)

**Status:** Discovery afgerond, wacht op antwoorden van MKG API team over:
1. Document root pad (waar `.lnk` bestanden staan)
2. Of `docs_fysiek_bestand` gevuld kan worden via API
3. Of `stlr_files` (type "Documenten") benaderd kan worden

**Plan:**
1. Bij BOM import: zoek documenten in `docs` tabel op tekeningnummer
2. Filter op `dcat_num=1` (Tekeningen) en `dcat_num=6` (Stepfiles)
3. Download bestanden van `S:\Tekeningen\{klant}\` via PocketBase proxy
4. Sla op als `DMSDocument` via `documentService.addDocumentFromBase64()`
5. Koppel aan artikel als `ArticleFile` met `fileRole: 'KLANT_TEKENING'` of `'KLANT_STEP'`

**Custom categorieën:**
- `KLANT_TEKENING` — "Klant Tekening" (cyan, order 15)
- `KLANT_STEP` — "Klant STEP" (violet, order 25)
- Worden automatisch aangemaakt bij eerste import

Zie ook: [mkg-document-discovery.md](mkg-document-discovery.md)

---

## 10. Server Configuratie & Externe Referenties

| Item | Waarde |
|---|---|
| PocketBase server | `10.1.111.26:8090` |
| MKG server | Geconfigureerd via Instellingen → MKG ERP Koppeling |
| MKG API documentatie | https://www.mkg.eu/nl-NL/mijn-mkg/support/landingspagina/12152 |
| Bestanden server | `S:\Tekeningen\{klantnaam}\` (gemapte netwerkdrive, AD) |
| GitHub repo | `epicjohan/Factory-manager-1.1.7` |
| Branch (dev) | `feature/mkg-api-integration` |
| Branch (prod) | `main` |
| Data Dictionary | `Data dictionairy/` (project root, 8 Excel bestanden) |
