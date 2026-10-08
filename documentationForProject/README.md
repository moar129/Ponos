# Ponos – teknisk dokumentation

Komplet teknisk dokumentation af Ponos-kodebasen, skrevet til en udvikler, der ikke har set projektet før. Den bygger på den faktiske kode (`src/`), live-databasens skemaeksport (2026-10-01) og `docs/`.

**Ny i projektet?** Start med [17 – Sådan lærer jeg dette projekt](17-learning-guide.md) og [01 – Formål og arkitektur](01-formaal-og-arkitektur.md).

---

## Indhold

| # | Fil | Indhold |
|---|---|---|
| 1 | [01-formaal-og-arkitektur.md](01-formaal-og-arkitektur.md) | Hvad Ponos er, problemet, brugere, funktioner, stack, arkitekturdiagram |
| 2 | [02-projektstruktur.md](02-projektstruktur.md) | Mapper, vigtige filer, hvor hvad ligger |
| 3 | [03-application-flow.md](03-application-flow.md) | Opstart → navigation → query/mutation → database → render |
| 4 | **Kodegennemgang** (`04-kode/`) | Fil-for-fil, pr. domæne: |
| | [04-kode/01-infrastruktur.md](04-kode/01-infrastruktur.md) | `main`, `App`, store, `supabaseApi`, fejlmodel, session |
| | [04-kode/02-auth-og-profil.md](04-kode/02-auth-og-profil.md) | Login, signup, session, profil, password-reset |
| | [04-kode/03-organisation-roller.md](04-kode/03-organisation-roller.md) | Organisationer, medlemskaber, invitationer, roller, privilegier |
| | [04-kode/04-datalayer.md](04-kode/04-datalayer.md) | Kategorier, items, enheder, lokationer, reservation |
| | [04-kode/05-opgaver.md](04-kode/05-opgaver.md) | Opgaver, rum, statusmaskine, godkendelse, materialer |
| | [04-kode/06-beskeder-notifikationer.md](04-kode/06-beskeder-notifikationer.md) | Beskeder, notifikationer, realtime |
| | [04-kode/07-nyheder.md](04-kode/07-nyheder.md) | Nyheder, rich text og sanitering |
| | [04-kode/08-statistik.md](04-kode/08-statistik.md) | Server-side statistik, perioder, snapshots |
| | [04-kode/09-dashboard-og-layout.md](04-kode/09-dashboard-og-layout.md) | Dashboard, header/footer, offentlige sider |
| | [04-kode/10-faelles-ui-hooks-utils.md](04-kode/10-faelles-ui-hooks-utils.md) | Fælles komponenter, hooks, utils, typer |
| | [04-kode/11-i18n-og-tema.md](04-kode/11-i18n-og-tema.md) | 14 sprog, tema, organisationsfarver |
| 5 | [05-klasser-og-patterns.md](05-klasser-og-patterns.md) | Klasser (én), objekter og observerede design patterns |
| 6 | [06-database.md](06-database.md) | Tabeller, relationer, funktioner, triggere, RLS, migrationer, drift |
| 7 | [07-api.md](07-api.md) | Alle 122 RTK-endpoints → HTTP/RPC, privilegier |
| 8 | [08-security.md](08-security.md) | Auth, authorization, sårbarheder (hvor/hvorfor/udnyttelse/løsning) |
| 9 | [09-error-handling.md](09-error-handling.md) | Fejlkæden, hvad brugeren ser, mangler |
| 10 | [10-performance.md](10-performance.md) | N+1, round-trips, bundle, database |
| 11 | [11-code-quality.md](11-code-quality.md) | Lint/build-status, SOLID/DRY/KISS, problemer → forbedringer |
| 12 | [12-tests.md](12-tests.md) | Teststatus og hvad der bør testes først |
| 13 | [13-konfiguration.md](13-konfiguration.md) | Env-vars, konfigurationsfiler, dev/prod |
| 14 | [14-dependencies.md](14-dependencies.md) | Dependencies, versioner, eksterne tjenester |
| 15 | [15-kritiske-flows.md](15-kritiske-flows.md) | 10 flows end-to-end med sekvensdiagrammer |
| 16 | [16-teknisk-gaeld.md](16-teknisk-gaeld.md) | Kritiske / vigtige / nice-to-have forbedringer |
| 17 | [17-learning-guide.md](17-learning-guide.md) | Læserækkefølge for nye udviklere |
| 18 | [18-final-summary.md](18-final-summary.md) | Arkitektur, komponenter, dataflows, risici |
| 19 | [19-loesningsbeskrivelse.md](19-loesningsbeskrivelse.md) | Løsningsbeskrivelse: grøn omstilling, People/Profit/Planet, udbredelse |
| 20 | [20-casebeskrivelse.md](20-casebeskrivelse.md) | Casebeskrivelse for generel læser: case, problem, løsning, værdi, status |
| 21 | [21-afklarende-spoergsmaal.md](21-afklarende-spoergsmaal.md) | Afklarende spørgsmål før ansøgningssvar (TRIN 2) |
| 22 | [22-ansoegningssvar.md](22-ansoegningssvar.md) | Endelige ansøgningssvar (TRIN 3) + fakta vs. antagelser |

---

## Konventioner i denne dokumentation

- **Observeret** = læst direkte i koden eller live-skemaet. **Anbefaling** = forfatterens vurdering. **Uklart** = kan ikke afgøres ud fra repoet; der står, hvad der mangler.
- **(verificér)** = udledt af kode/skema, men ikke afprøvet mod en kørende database.
- Henvisninger er filstier + symbolnavne (fx `src/store/apis/session.ts` → `getActiveOrganisationId`). Der bruges bevidst ikke linjenumre, da de ændrer sig.
- Diagrammer er i **Mermaid** (renderes af GitHub og VS Code med Mermaid-understøttelse).
- Kode-identifikatorer er engelske (som i koden); forklaringer er på dansk.

## Kilder og grundlag

| Kilde | Brug |
|---|---|
| `src/**` (≈ 30.000 linjer TS/TSX) | Primær kilde for klienten |
| Live-skemaeksport (CSV fra `docs/exportSchema.sql`, 2026-10-01) | Autoritativ for databasen: 33 tabeller, 103 policies, 93 funktioner, 33 triggere, grants |
| `docs/dbSchema.sql` | Begrundelser og historik for DB-ændringer (har drift, se `06-database.md` §6.9) |
| `docs/Project.md`, `docs/userStories.md`, `docs/statistik-plan.md`, `docs/seed/*`, `docs/migrations/README.md`, `src/i18n/README.md`, `CLAUDE.md` | Kontekst og hensigt |
| `npm run lint` (0 fund), `npm run build` (grøn, 1,7 MB chunk-advarsel), `npm run i18n:check` (fejler: 104 manglende nøgler i 12 sprog), `tsc` strict-test | Målinger 2026-10-01 |

`npm audit` er ikke kørt. Runtime-adfærd (fx RLS-sårbarheder) er analyseret ud fra definitioner, ikke afprøvet.
