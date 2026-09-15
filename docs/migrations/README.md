# docs/migrations

Kørselsklare SQL-uddrag. Én fil pr. ændring, beregnet til at blive kopieret direkte ind i **Supabase SQL Editor**.

## Konvention

- **Filnavn:** `<user story>-<kort beskrivelse>.sql`, eller `<ÅÅÅÅ-MM-DD>-<kort beskrivelse>.sql` for rettelser uden en story.
- **Header i hver fil:** hvad den gør, hvilken user story den hører til, og om den er kørt endnu.
- **Rollback nederst** som kommentar — så en ændring altid kan rulles tilbage uden at skulle genudledes.
- **Brugeren kører selv SQL'en** i Supabase SQL Editor. Claude skriver den, kører den aldrig.
- **Efter en fil er kørt og bekræftet:** opdatér `docs/dbSchema.sql` og status-rækken i `docs/studerende1-plan.md` — og **slet så filen her**.

Den sidste regel er bevidst: når ændringen står i `dbSchema.sql`, er filen ren dublet, og git har den, hvis den nogensinde skal frem igen. Mappen indeholder derfor altid kun det, der **mangler** at blive kørt — ikke en voksende bunke historik. Færdigt arbejde dokumenteres i prosa i `studerende1-plan.md`, som resten af projektet allerede gør (se US-59-, US-64- og US-66/67-afsnittene dér).

`docs/dbSchema.sql` er fortsat den samlede, autoritative dokumentation af hele skemaet. Filerne her er kørselsklare uddrag af den — ikke en erstatning.

## Venter på at blive kørt

| Fil | Story | Status |
|---|---|---|
| `fase3-medlem-rolle.sql` | Fase 3 | Klar — kør FØRST |
| `fase3-roles-organisation-privileges.sql` | Fase 3 | Klar — efter medlem-rolle |
| `fase3-membership-members-invitations-privileges.sql` | Fase 3 | Klar — efter medlem-rolle |
| `fase3-news-privileges.sql` | Fase 3 | Klar — efter medlem-rolle |
| `fase3-datalayer-privileges.sql` | Fase 3 (US-62) | Vent — frontend-gating i Studerende 2's filer mangler |
| `fase3-tasks-privileges.sql` | Fase 3 (US-63) | Vent — aftale med Studerende 3 mangler |

Erstatter de tidligere `us-62-datalayer-write-privileges.sql`/`us-63-tasks-write-privileges.sql` (slettet 2026-09-15, aldrig kørt) - designet om fra ét `manage_X`-privilegie til fuldt CRUD, se `docs/studerende1-plan.md` (Fase 3).

`fase3-combined-1-4-RUN-NOW.sql` er en engangs-sammenkopiering af de fire klar-filer (1-4, IKKE Datalayer/Opgaver), til at køre alt i én omgang i Supabase SQL Editor. Samme regel som CSV-eksporten nedenfor: **slet den igen efter kørsel** - de fire originale filer er kilden, denne er ren bekvemmelighed.

Kørt og slettet: `2026-09-11-fix-memberships-role-guard.sql` (US-11, Fase 1-bugfix) — se `dbSchema.sql` §16.10 og "Skema-eksport og drift-fund" i `studerende1-plan.md`.

## Drift-tjek

`docs/exportSchema.sql` henter hele det faktiske skema (enums, kolonner, constraints, indexes, RLS-status, policies, funktioner, triggers, grants) ud af Supabase som CSV. Kør den, hvis du er i tvivl om `dbSchema.sql` stadig matcher virkeligheden — det gjorde den ikke 2026-09-11, hvor 7 udokumenterede objekter dukkede op.

CSV-resultatet er et øjebliksbillede og gemmes **ikke** i repoet — det bliver misvisende, så snart nogen ændrer noget. Slet det efter brug.
