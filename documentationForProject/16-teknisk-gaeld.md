# 16. Teknisk gæld og forbedringer

Prioriteret efter **konkret teknisk konsekvens**, ikke smag. Hvert punkt henviser til den fil, hvor det er dokumenteret i detaljer. "(verificér)" = udledt af kode/skema, men ikke afprøvet mod en kørende database.

> Husk konteksten: projektet beskriver sig selv som en prototype, der ikke deployes (`dbSchema.sql` §15.17). Flere "kritiske" punkter er kun kritiske, hvis det ændrer sig – men de er netop dem, en ny udvikler skal kende, før det sker.

---

## Kritiske problemer
*Kan føre til sikkerhedsbrud, forkerte data eller at systemet holder op med at virke.*

| # | Problem | Hvor | Konsekvens | Forbedring | Detaljer |
|---|---|---|---|---|---|
| K1 | **Kontoovertagelse via `reset_password_prototype`** – email + fornavn + efternavn er hele beviset, og alle medlemmer kan se det om hinanden | RPC (anon), `ForgotPassword.tsx` | Ethvert medlem kan overtage administratorens konto | `resetPasswordForEmail` + OTP; fjern RPC og anon-grant | `08-security.md` §8.3.1 |
| K2 | **Interne SECURITY DEFINER-hjælpere kaldbare af anon** – `apply_task_material_outcomes` har ingen auth/privilegie-tjek; org-tjekket i `split_unit_if_needed` (`<> auth_profile_org()`) bliver `NULL` for udloggede og springes over (verificér) | Live-grants | Status på reserverede enheder kan ændres uden login, hvis et UUID kendes; medlemmer kan omgå `update_tasks`/`update_datalayer` | `revoke execute … from anon, authenticated` på interne hjælpere; `is distinct from` | `08-security.md` §8.3.2 |
| K3 | **Admin kan læse alle private beskeder** – policies "Admins can view archived …" tjekker ikke `archived_at` | RLS på `conversations`, `messages`, `conversation_participants` | Brud på brugernes forventning om privatliv i DM'er | Tilføj `archived_at is not null` eller fjern/dokumentér | `08-security.md` §8.3.3 |
| K4 | **Privilegie-eskalering via `update_roles`** – kan give egen rolle alle ikke-admin-privilegier | RLS på `privileges` | Rollemodellen kan omgås af en delvis betroet bruger | "Kun egne privilegier"-regel i policy | `08-security.md` §8.3.4 |
| K5 | **Forretningsregler kun i klienten** – `requires_approval` (`set_task_status`), `max_assignees`, rum-adgang ved selvtilmelding, `message_type='system'` | RPC/policies | Godkendelsesflowet kan springes over; loft og rum-låse kan omgås; falske systembeskeder | Håndhæv i RPC/policy/trigger | `08-security.md` §8.3.5, `04-kode/05-opgaver.md` |
| K6 | **Stille afkortning ved PostgREST `max_rows`** – klienten henter alle enheder/beskeder og aggregerer selv | `getUnitLocationCounts`, `getAvailableUnitLocations`, `getCategoryTree`, `getMessages` | Forkerte lagertal og manglende nyeste beskeder, når data vokser (seed: 837 enheder; default-loft 1000) | Server-side aggregering (som statistikken), paginering af beskeder (nyeste først) | `10-performance.md` §10.1 |
| K7 | **Ingen React Error Boundary** | `App.tsx` | Én uventet render-fejl (fx uventet API-data, der castes uden validering) giver hvid side for hele appen | `ErrorBoundary` om `<Routes>` | `09-error-handling.md` §9.6 |
| K8 | **`task_materials.item_id ON DELETE CASCADE`** | FK | Sletning af en vare fjerner den fra afsluttede opgaver → historik og statistik ændres bagudrettet | `RESTRICT` eller soft delete af varer | `06-database.md` §6.2 |
| K9 | **`profiles` kan opdateres uden kolonnebegrænsning** (verificér kolonne-grants) | RLS på `profiles` | Bruger kan ændre egen `email`/`note_admin`; kan blokere andres signup og opsnappe invitationer | Kolonne-grants eller trigger | `08-security.md` §8.3.6 |

---

## Vigtige forbedringer
*Maintainability, performance og arkitektur.*

| # | Problem | Hvor | Konsekvens | Forbedring | Detaljer |
|---|---|---|---|---|---|
| V1 | **N+1 på opgavetavlen** – 3–6 requests pr. kort | `TaskCard.tsx` | ~210–420 requests ved 70 opgaver; langsom `/tasks` | Batch-endpoint eller hent ved åbning | `10-performance.md` |
| V2 | **Ingen route-splitting** – 1,7 MB (486 kB gzip) i én chunk | `App.tsx` | Langsom første indlæsning, også for forsiden | `React.lazy` + `Suspense` pr. side | `10-performance.md` §10.3 |
| V3 | **Ekstra round-trips + fuld refetch ved token-refresh** | `session.ts`, `authApi` | 1–3 ekstra kald pr. endpoint; alle queries refetches ca. hver time | `getSession()`, cache aktiv org, filtrér auth-events | `10-performance.md` §10.1 |
| V4 | **Ikke-atomiske klient-orkestreringer** | `deleteRoom`, `addItems`, `useDeleteMany`, kategori-sortering, matrix-rolleoprettelse, afslut uden godkendelse | Delvise tilstande ved fejl | RPC'er for sammensatte operationer | `06-database.md` §6.10 |
| V5 | **Ingen tests og ingen CI**; `i18n:check` fejler og køres ikke automatisk | Repo | Regressioner (især i RLS/RPC og materiale-flow) opdages sent eller aldrig | Vitest + pgTAP/integration; GitHub Actions med lint/build/test/i18n | `12-tests.md` |
| V6 | **Skemadokumentation og -kontrol** – drift i `dbSchema.sql` (4 tabeller, 12 policies, 10 funktioner, 6 triggere), ingen migrationssporing, ingen genererede DB-typer | `docs/`, `lib/supabase.ts` | Databasen kan ikke genskabes fra repoet; skemaændringer brydes først ved runtime | Supabase CLI-migrations; `supabase gen types`; fast drift-tjek | `06-database.md` §6.9 |
| V7 | **Defense-in-depth for grants/policies** – 60 funktioner kaldbare af anon; `organisations` INSERT `with check (true)`; `is_conversation_participant` med frit user-id | Live-skema | Større angrebsflade end nødvendigt | Revoke fra anon; fjern bootstrap-policy | `08-security.md` §8.3.7 |
| V8 | **Usynlige fejl** – `TaskCard`-mutationer uden fejlvisning; RLS-afvisninger på UPDATE/DELETE giver "succes"; RPC'er uden `hint` | `TaskCard.tsx`, flere endpoints, `create/update_task_room` | Brugeren tror handlingen lykkedes | Vis `error`; `.select('id')`-tjek; tilføj hints | `09-error-handling.md` §9.7 |
| V9 | **"God components"** | `DataLayerPage` (984), `itemsDetailComponent` (664), `TaskCard` (532), `OrganisationTab` (498) | Svært at forstå, teste og ændre | Custom hooks pr. ansvar, opdeling | `11-code-quality.md` §2 |
| V10 | **Domænenøgler som fri tekst** – privilegienavne, rollerne "Admin"/"Medlem", danske sentinel-strenge i notifikationer | DB + TS | Stavefejl = stille fejl; ikke sprog-generisk; to definitioner af "admin" | Katalogtabel, `system_key` på roller, kodefelter | `11-code-quality.md` §8 |
| V11 | **Database-skalering** – manglende indekser (`task_requests(task_id)`, `task_assignees(user_id)`), RLS-funktioner ikke i `(select …)`, sub-select-policies | Live-skema | Langsommere forespørgsler ved vækst | Indekser + InitPlan-mønstret | `10-performance.md` §10.2 |
| V12 | **Duplikeret/parallel logik** – `addItemUnits` (TS) ↔ `add_item_with_units` (SQL); to veje til rolle + privilegier | `categoryApi.ts`, `PrivilegeMatrix.tsx` | Implementeringerne kan drive fra hinanden | Én implementering (RPC) | `04-kode/04-datalayer.md` |
| V13 | **Brugere kan ikke slettes** – FK'er uden `ON DELETE` (`assigned_by`, `requested_by`, `handled_by`, `archived_by`) | Live-skema | Sletning i Supabase-dashboardet fejler; GDPR-sletning besværlig | `ON DELETE SET NULL` | `06-database.md` §6.2 |
| V14 | **Samtidighed** – `createTaskRequest` (check-then-insert uden unikt indeks), `updateSavedColors` (læs–ændr–skriv) | `taskApi.ts`, `organisationApi.ts` | Dobbelte anmodninger, tabte farveændringer | Unikt partielt indeks; atomisk SQL | `04-kode/05-…`, `04-kode/03-…` |
| V15 | **Tilgængelighed i `Modal`** – ingen focus trap, fokusstyring eller scroll-lås | `components/common/Modal.tsx` | Tastatur-/skærmlæserbrugere kan "fare vild" bag dialoger | Fokusfælde + gendan fokus | `04-kode/10-…` |
| V16 | **Skemadump i git-historik + forkert `.gitignore`-mønster** | `fb74b0f`, `.gitignore` | Fuld funktions-/policy-definition kan være offentlig | Ret mønster; overvej historik-rens | `08-security.md` |

---

## Nice-to-have forbedringer
*Mindre refactoring, konsistens og developer experience.*

| # | Forbedring | Hvor |
|---|---|---|
| N1 | Opdatér CLAUDE.md (`dataLayerApi.ts` → `categoryApi.ts`, `taskSlices.ts` findes ikke, kommentarsprog), i18n-README (15 namespaces), forældede kommentarer (`privilegeApi.ts` om ikke-kørte policies, `roleApi.deleteRole` om `set null`), `docs/migrations/README.md` (ikke-eksisterende ventende fil) | docs/kode |
| N2 | Flyt `store/slices/dataLayersSlices/*` til `utils/`; flyt hooks ud af API-filer; flyt runtime-kode ud af `types/` | struktur |
| N3 | Ensret filnavne (`PascalCase.tsx`), ret stavefejl (`CategoriTree…`, `locationThreeNode…`), `types/Task` → `types/task` | navngivning |
| N4 | `Task`-typen til camelCase + mapper, som de andre domæner | `taskApi.ts` |
| N5 | Login/SignUp via `authApi`-mutations; `returnTo` efter login; erstat `alert()`; `signOut().unwrap()` | auth-sider |
| N6 | Formatér `messageApi.ts`; fjern `// NYT` og efterladt instruks-kommentar | `messageApi.ts` |
| N7 | `.env.example`, `engines`/`.nvmrc`, eksplicit `"strict": true` (før TypeScript 7) | rod |
| N8 | Fjern ubrugte `public/favicon.svg`, `public/icons.svg`; overvej at self-hoste Inter (privatliv) | `public/`, `index.html` |
| N9 | `try/catch` om `localStorage` | `useTheme`, `useLanguage`, `MyTasksWidget` |
| N10 | Håndtér `?news=<id>` (eller ret triggerens link til `/nyheder/<id>`); `read_tasks`-tjek på dashboard-genvejen; `isSafeHref` på `news.url` | nyheder/dashboard |
| N11 | Runtime-validering af `StatisticsResult` (zod) | `statisticApi.ts` |
| N12 | Afklar `task_participants` (ubrugt) og fjern eller tag i brug | DB |
| N13 | `getMyPendingRequest` uden `.maybeSingle()`-antagelse; tillad sletning af egen rolle via bypass | små edge cases |
| N14 | Én sproglisten-kilde (generér `index.html`-listen ved build) | i18n |
| N15 | Plan for afløser af `document.execCommand` | `RichTextEditor.tsx` |
| N16 | Højere minimumslængde for adgangskoder | `validatePassword.ts`, DB |

---

## Hvor man med fordel starter
1. **K2, K3, K4, K7** – små ændringer (et par `revoke`/policy-linjer, én komponent) med stor effekt.
2. **V5** – en minimal testopsætning gør resten af listen sikrere at arbejde med.
3. **V1 + V2** – mærkbar hastighed for brugerne.
4. **K1** – før enhver form for deployment.
