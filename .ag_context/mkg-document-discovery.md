# MKG Document Discovery — Bevindingen & Technisch Rapport

> Vastgelegd op 2 juni 2026 — Discovery sessie voor MKG → Factory Manager DMS integratie.

## Doel

Automatisch tekeningen (PDF) en STEP bestanden uit MKG importeren naar Factory Manager's DMS module bij het aanmaken van een nieuw artikel via de BOM import.

---

## Discovery Resultaten

### Test-artikel

| Veld | Waarde |
|---|---|
| Artikelcode (FM) | `00920113900001C01` |
| Artikelcode (MKG) | ` 20262450` (met spatie prefix) |
| Tekeningnummer | `P07277` |
| Stuklijst header | `25008374-001` |
| Stuklijstregels | 50 |

### MKG Document Tabel: `docs`

| Eigenschap | Waarde |
|---|---|
| Tabelnaam in MKG | `docs` |
| Document nummer | 420 |
| API endpoint | `GET /mkg/web/v3/MKG/Documents/docs/` |
| API rechten | Get |

### Beschikbare API velden (docs tabel)

Velden die de REST API retourneert:

| Veld | Type | Database? | Beschrijving | Voorbeeld waarde |
|---|---|---|---|---|
| `docs_bestand` | character(256) | ✅ | Bestandsnaam (vaak .lnk) | `p07277-0.pdf.lnk` |
| `docs_submap` | character(256) | ✅ | Relatief pad / submap | `2018\10\25\39563` |
| `docs_key` | character(40) | ✅ | Koppelsleutel | `001;60182681;1` |
| `docs_oms` | character(40) | ✅ | Omschrijving | (vaak leeg via API) |
| `docs_fysiek_bestand` | character(256) | ✅ | Volledige bestandsnaam | **⚠️ ALTIJD LEEG via API** |
| `docs_proces` | character(4) | ✅ | Gekoppeld proces | `prdr`, `arti`, `cprs` |
| `docs_type` | integer | ✅ | Type | `0` |
| `docs_default_printen` | logical | ✅ | Niet lokaal beschikbaar | `false` |
| `dcat_num` | integer | ✅ | Categorie nummer | `0`, `1`, `6` |
| `docf_key` | character(32) | ✅ | Sleutel | (vaak leeg via API) |
| `rela_num` | integer | ✅ | Relatie | `0` |
| `admi_num` | integer | ✅ | Administratie | `0` |
| `RowKey` | hex string | ✅ | MKG unieke sleutel | `0x00000000000e4cee` |

### Velden die NIET werken via de API

| Veld | Label | Reden |
|---|---|---|
| `docs_fysiek_bestand` | Volledige bestandsnaam | Geretourneerd maar **altijd leeg** |
| `t_dcat_oms` | Categorieën omschrijving | Computed veld (`Is database veld = 0`) |
| `t_file_type` | BestandsType | Computed veld |
| `t_fysiek_bestand` | Fysiek bestand | Computed veld |
| `docf_key` | Sleutel | Geretourneerd maar **altijd leeg** |

---

## Document Categorieën in MKG

| `dcat_num` | Categorie | Relevant voor FM? |
|---|---|---|
| **1** | **Tekeningen** | ✅ → FM categorie `KLANT_TEKENING` |
| 2 | Correspondentie | ❌ |
| 3 | E-mail [inkomend] | ❌ |
| 4 | E-mail [uitgaand] | ❌ |
| 5 | Klachten | ❌ |
| **6** | **Stepfiles** | ✅ → FM categorie `KLANT_STEP` |
| 7 | DXF | ❌ |
| 8 | DWG | ❌ |
| 9 | Werkmap | ❌ |
| 10 | Meetrapporten | ❌ |
| 11 | Certificaten | ❌ |
| 12 | Nabehandelingen | ❌ |
| 20-32 | Verkoop/inkoop documenten | ❌ |
| 33 | Offertes | ❌ |
| 34 | Cam files | ❌ (mogelijk later) |
| 35 | Verpakkingsvoorbeeld | ❌ |

---

## Geteste Zoekstrategieën

### ✅ Werkt: Zoeken op bestandsnaam

```
GET /Documents/docs/?Filter=docs_bestand contains 'P07277'&NumRows=10
```

Resultaat: 10 records gevonden met `docs_bestand = "p07277-0.pdf.lnk"`.

### ❌ Werkt NIET: Sub-collectie `stlr_files`

```
GET /Documents/stlr/1+25008374-001+1/stlr_files → HTTP 426
```

Het `stlr_files` veld bestaat in MKG als type "Documenten" (niet "verzameling"). HTTP 426 = "Upgrade Required" — dit endpoint-formaat wordt niet ondersteund voor document-type velden.

### ❌ Werkt NIET: Sub-collectie `stlr_docs`

```
GET /Documents/stlr/1+25008374-001+1/stlr_docs → HTTP 426
```

Zelfde probleem als `stlr_files`.

### ⚠️ Werkt deels: Filteren op `dcat_num`

```
GET /Documents/docs/?Filter=docs_bestand contains 'P07277' and dcat_num eq '1'
```

Filter retourneert records, maar **`dcat_num` filter lijkt niet correct te werken** — dezelfde records komen terug voor `dcat_num eq '1'` als voor `dcat_num eq '6'`. Mogelijk een MKG API beperking of verkeerde filter-syntax.

### ⚠️ Werkt deels: Filteren op `docf_key`

```
GET /Documents/docs/?Filter=docf_key eq '00920113900001C01'
```

Retourneert records, maar `docf_key` is leeg in alle resultaten. Filter werkt niet — retourneert ongerelateerde records.

---

## Record Structuur (ontdekt)

Documenten komen in **paren** (dubbelrecords):

| RowKey | dcat_num | docs_key | docs_proces | Betekenis |
|---|---|---|---|---|
| `...4ced` | 0 | (leeg) | (leeg) | Basisrecord (onbekoppeld) |
| `...4cee` | 1 | (leeg) | (leeg) | Categorierecord (Tekening) |
| `...4cef` | 0 | `001;60182681;1` | `prdr` | Link naar productieorderregel |
| `...4cf0` | 1 | `001;60182681;1` | `prdr` | Categorielink naar prdr |

Het patroon `docs_key = "001;60182681;1"` verwijst naar:
- `001` = administratienummer
- `60182681` = productieordernummer (prdh_num)
- `1` = regelnummer

---

## Bestandsopslag

### MKG Document Storage
- Bestanden worden opgeslagen als **`.lnk` (Windows shortcuts)**
- Pad: `{MKG_DOC_ROOT}\{docs_submap}\{docs_bestand}`
- Voorbeeld: `{MKG_DOC_ROOT}\2018\10\25\39563\p07277-0.pdf.lnk`
- De `.lnk` wijst naar het fysieke bestand op de `S:\` drive

### Fysieke Bestanden
- Locatie: `S:\Tekeningen\{klantnaam}\{bestandsnaam}`
- Voorbeeld: `S:\Tekeningen\Vanderlande\009201-139-00001-C01 Divert plate base.pdf`
- `S:\` is een **gemapte netwerkdrive** (Active Directory), identiek op alle servers
- PocketBase server kan de `S:\` drive bereiken

---

## Open Punten (wacht op MKG API team)

1. **Waar slaat MKG de `.lnk` bestanden op?** — De document root map is nodig om het volledige pad te construeren
2. **Is er een API endpoint om het fysieke pad op te halen?** — `docs_fysiek_bestand` is altijd leeg via de REST API
3. **Kan `stlr_files` (type "Documenten") benaderd worden via de API?** — HTTP 426 wijst op een ander request-formaat

### Mogelijke routes om bestanden op te halen

| Route | Aanpak | Complexiteit | Betrouwbaarheid |
|---|---|---|---|
| **A: `.lnk` resolven** | Lees `.lnk` van `{DOC_ROOT}\{submap}\{bestand}`, parse target pad | Hoog | Hoog |
| **B: Direct zoeken** | Strip `.lnk` extensie, zoek op `S:\Tekeningen\` | Medium | Medium |
| **C: MKG API uitbreiding** | Vraag MKG API team om `docs_fysiek_bestand` te vullen | Laag | Hoog |

---

## Stlr (Stuklijstregel) Sub-collecties

Gevonden in de data dictionary (`Data dictionairy/stlr.xlsx`):

| Sub-collectie | Label | Type | Status |
|---|---|---|---|
| `stlr_stlb` | Bewerkingen | verzameling | ✅ Werkt |
| `stlr_stlm` | Materialen | verzameling | ✅ Werkt |
| `stlr_files` | Document koppelingen | Documenten | ❌ HTTP 426 |
| `stlr_halffabrikaten` | Halffabricaten | verzameling | Niet getest |
| `stlr_pmld` | Meldingen | verzameling | Niet getest |
| `stlr_sbsm` | Koppeling stuklijst regel bewerking | verzameling | Niet getest |
| `stlr_stlb_prijs` | Bewerkingen prijs info | verzameling | Niet getest |
| `stlr_stlm_prijs` | Materialen prijs info | verzameling | Niet getest |
| `stlr_stlr_ep_onderliggend` | Halffabricaten van eindproduct | verzameling | Niet getest |
| `stlr_stlv` | Stuklijstregel vertalingen | verzameling | Niet getest |
| `stlr_strf` | Stuklijst regel formules | verzameling | Niet getest |

---

## Data Dictionary Bestanden

Beschikbaar in `/Data dictionairy/`:

| Bestand | Inhoud |
|---|---|
| `docu.xlsx` | Alle velden van de `docs` tabel (47 velden) |
| `stlr.xlsx` | Alle velden van de `stlr` tabel |
| `stlb.xlsx` | Alle velden van de `stlb` tabel |
| `prdh.xlsx` | Alle velden van de `prdh` tabel |
| `MKG velden Artikel.xlsx` | Artikelvelden |
| `planning dump.xlsx` | Planning data |
| `capaciteits overzicht.xlsx` | Capaciteitsplanning |
