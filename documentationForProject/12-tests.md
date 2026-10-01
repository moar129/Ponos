# 12. Tests

## 12.1 Status (observeret)

| Spørgsmål | Svar |
|---|---|
| Test-framework | **Intet.** Ingen Vitest/Jest/Playwright/Cypress i `package.json`, ingen `*.test.*`/`*.spec.*`-filer, intet `test`-script. (Bekræftet i CLAUDE.md.) |
| Unit tests | 0 |
| Integration tests | 0 |
| End-to-end tests | 0 |
| Mocking | – |
| Test coverage | 0 % (kan ikke måles – intet framework) |
| CI | Ingen (`.github/workflows` findes ikke) |

## 12.2 Hvad der faktisk bruges som kvalitetssikring

1. **TypeScript (strict via TS 6-default) + `npm run build`** – fanger typefejl, ukendte i18n-nøgler (typet `t()`), ubrugte variabler.
2. **ESLint** inkl. `react-hooks` v7 (regler for hooks og React Compiler-kompatibilitet).
3. **`npm run i18n:check`** – nøgleparitet og flertalsformer (fejler p.t., se `11-code-quality.md`).
4. **Datadrevet manuel verifikation af statistik:** `docs/seed/generate.mjs` genererer seed-data **og** `FACIT.md` med forventede tal. Migrationer noteres som "kørt og verificeret mod FACIT af bruger" i `docs/migrations/README.md`. Det er reelt en manuel *golden master*-test.
5. **Manuel browser-test** ("testet i browseren af bruger" går igen i migrations-README'en).
6. **Mock-brugere med forskellige roller** (`docs/seed/README.md`) – fx "log ind som `sofie.andersen` for at tjekke, at statistikken viser samme tal som admin".

## 12.3 Vigtig funktionalitet uden tests – prioriteret

Prioriteret efter risiko (konsekvens × sandsynlighed for regression):

| # | Område | Hvorfor vigtigt | Testtype |
|---|---|---|---|
| 1 | **RLS og RPC-guards** (tenant-isolation, privilegier, eskalering) | Hele sikkerhedsmodellen ligger her; sårbarhederne i `08-security.md` ville være fanget af simple "bruger A må ikke X"-tests | Integrationstests mod en lokal Supabase (fx [pgTAP](https://pgtap.org/) i Postgres, eller supabase-js med to testbrugere) |
| 2 | **Materiale-flowet** (`reserve_item_units`, `apply_task_material_outcomes`, `set_task_status`, `approve_task_request`) | Mange migrationer/bugfixes 2026-09-23/24; komplekse mængde-splits | pgTAP / SQL-integrationstests |
| 3 | **Statistik** (`statistics_payload`) | Allerede har facit – kan automatiseres direkte ved at køre `get_statistics` mod seed og sammenligne med `FACIT.md` | Automatiseret golden-master |
| 4 | **Rene funktioner** | Lette og hurtige at teste, stor dækning pr. linje | Unit (Vitest) |
| | – `apiError.ts` (`mapDbError`), `ErrorMessage.ts` | Fejlkæden | |
| | – `richText.ts` (`sanitizeRichText`) | **XSS-forsvar** – bør have tests med kendte payloads | |
| | – `privilegeLocking.ts` | Spejler DB-triggere | |
| | – `buildCategoryTree`, `aggregatedItems`, `itemPlacements` | Datalagerets visning | |
| | – `orgPalette.ts` (kontrastkrav) | WCAG-garanti | |
| | – `calendar.ts`, `useStatisticsPeriod` (periodeberegning, tidszoner, midnat) | Klassisk kilde til off-by-one | |
| | – `statisticsSnapshot.ts`, `statisticsCsv.ts`, `taskFilters.ts` | | |
| 5 | **Auth-flows** (login, logout-cache-rydning, `USER_SCOPED_TAGS`) | Kommentarerne beskriver konkrete tidligere bugs (US-59) | Komponent-/integrationstest med mocket supabase |
| 6 | **Kritiske brugerflows** (opret org → inviter → tildel rolle → opret opgave → meld færdig → godkend) | Regressionssikring på tværs | E2E (Playwright) mod seed-database |

## 12.4 Anbefalet minimal opsætning

1. `npm i -D vitest @testing-library/react jsdom` – Vitest passer direkte ind i Vite-konfigurationen.
2. Start med unit tests af `src/lib/richText.ts`, `src/store/apis/apiError.ts`, `src/components/dashboard/roles/privilegeLocking.ts`, `src/utils/calendar.ts`.
3. Tilføj `"test": "vitest run"` og `npm run i18n:check` til en GitHub Actions-workflow sammen med `lint` og `build`.
4. Næste skridt: lokal Supabase (`supabase start` kræver Docker – **ikke** til stede på den nuværende udviklermaskine ifølge CLAUDE.md) eller et separat test-projekt til RLS-/RPC-tests.
