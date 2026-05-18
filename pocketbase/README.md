# PocketBase Schema

Deze map bevat de officiële PocketBase database schema-export.

## Doel
- **Single source of truth** voor alle collecties en velden
- Versiebeheer van schema-wijzigingen via Git
- Referentie voor ontwikkeling: altijd weten welke collecties/velden bestaan
- Mogelijkheid om een nieuwe PocketBase instantie op te zetten met het juiste schema

## Bestanden

| Bestand | Omschrijving |
|---|---|
| `pb_schema.json` | Volledige PocketBase collectie-export (via Admin UI → Settings → Export collections) |

## Schema bijwerken

1. Open PocketBase Admin UI → **Settings** → **Export collections**
2. Kopieer/download het JSON-bestand
3. Sla het op als `pb_schema.json` in deze map
4. Commit naar Git met een beschrijvende message, bijv.: `chore: update PocketBase schema (added raw materials collections)`

## Schema importeren (nieuwe installatie)

1. Open PocketBase Admin UI → **Settings** → **Import collections**
2. Selecteer `pb_schema.json`
3. Review de wijzigingen en bevestig

> **Let op:** Een import overschrijft bestaande collecties niet automatisch — PocketBase toont een diff zodat je kunt kiezen wat je wilt toepassen.
