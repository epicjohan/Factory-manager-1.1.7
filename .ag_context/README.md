# 🤖 Agent Context — Factory Manager

> **Lees dit bestand EERST bij het starten van een nieuwe sessie.**
>
> Deze folder bevat alle geaccumuleerde kennis over het Factory Manager project.
> Alle agents (coding, research, planning) moeten deze folder raadplegen als startpunt.

---

## Hoe deze folder te gebruiken

### Voor agents:
1. **Lees `session-knowledge-base.md` EERST** — bevat het complete overzicht van architectuur, beslissingen, en lopende zaken
2. **Raadpleeg specifieke docs** bij een gerelateerde taak (zie overzicht hieronder)
3. **Update deze docs** na afronding van significante taken of nieuwe ontdekkingen

### Bestandsoverzicht

| Bestand | Wanneer raadplegen | Inhoud |
|---|---|---|
| **session-knowledge-base.md** | ⭐ ALTIJD als eerste | Complete kennisbank: architectuur, tech stack, alle MKG integratie details, DMS module, sync, constraints, bestandsstructuur, geplande features |
| **mkg-api-architecture.md** | Bij MKG API werk | API regels, proxy patronen, paginatie, caching, checklist voor nieuwe features |
| **mkg-document-discovery.md** | Bij DMS/document import | Discovery resultaten: welke API endpoints werken/niet werken, document categorieën, bestandsopslag, open vragen |

---

## Projectcontext (snel overzicht)

- **Wat:** Factory Manager — productie-management PWA voor metaalbewerkingsbedrijf
- **Stack:** React + TypeScript + Vite (frontend) → PocketBase (backend) → MKG ERP (externe API)
- **Repo:** `epicjohan/Factory-manager-1.1.7`
- **Server:** PocketBase op `10.1.111.26:8090`
- **MKG Proxy:** `pb_hooks/mkg_proxy.pb.js` — alle MKG communicatie loopt hier doorheen
- **Offline-first:** IndexedDB + outbox-patroon → PocketBase sync via SSE

## Actieve branches

| Branch | Doel |
|---|---|
| `main` | Productie — wordt gedeployed naar server |
| `feature/mkg-api-integration` | Ontwikkeling MKG integratie features |

## Belangrijke constraints

1. **Production Dashboard is heilig** — layout en werking mogen niet veranderen
2. **MKG planning data blijft lokaal** (IndexedDB) — wordt NIET naar PocketBase gesynchroniseerd
3. **Artikelen via BOM import gaan WEL naar PocketBase** — zelfde flow als handmatige creatie
4. **PocketBase hooks laden alleen bij herstart** — na proxy wijzigingen altijd PocketBase herstarten
5. **Geen arrays in proxy body** — PocketBase Goja runtime parsed arrays niet betrouwbaar
6. **`S:\` drive** is benaderbaar vanaf alle servers (AD gemapte netwerkdrive)

## Lopende taken

- [ ] **MKG Document Import** — wacht op antwoord MKG API team over document root pad en `docs_fysiek_bestand`
- [x] **Auto-sync planning** — geïmplementeerd en gedeployed
- [x] **Gereedmelden 422 fix** — dubbel gereedmelden afgevangen + betere foutmeldingen
