# 11. Code quality

## 11.1 Målbare fakta (2026-10-01)

| Måling | Resultat |
|---|---|
| `npm run lint` (ESLint 10, `@eslint/js` recommended, `typescript-eslint` recommended, `react-hooks` v7, `react-refresh`) | **0 fejl, 0 advarsler** |
| `npm run build` (`tsc -b && vite build`) | **Grøn**; én Vite-advarsel om chunk > 500 kB |
| TypeScript strict | `tsconfig.app.json` sætter ikke `strict`, men **TypeScript 6 har `strict` som default** – verificeret: `tsc` 6.0.3 giver `TS7006` (implicit any) og `TS2322` (null) uden flaget. Desuden `noUnusedLocals/Parameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`. |
| `any` i `src/` | **0 forekomster** |
| `eslint-disable` | 4 (alle `react-hooks/exhaustive-deps`: `DataLayerPage` ×2, `locationsPickerComponent`, `useFitText`) |
| `TODO/FIXME/HACK` i kode | 0 |
| `npm run i18n:check` | **Fejler** – 12 sprog mangler 104 nøgler hver |
| Tests | 0 |
| Størrelse | ~30.000 linjer TS/TSX i `src/`, største filer: `DataLayerPage.tsx` 984, `taskApi.ts` 938, `categoryApi.ts` 781, `itemsDetailComponent.tsx` 664 |

**Samlet indtryk (vurdering):** Koden er usædvanligt velkommenteret og konsekvent i sine mønstre (ét `supabaseApi`, fælles fejlmodel, fælles UI-primitiver, i18n-nøgler overalt). Mange kommentarer dokumenterer *hvorfor* og henviser til user stories og migrationer. De største kvalitetsproblemer er ikke stil, men **arkitektoniske**: forretningsregler fordelt mellem klient, RPC'er og triggere; manglende tests; og dokumentationsdrift.

---

## 11.2 Problemer (Problem → Hvorfor → Konsekvens → Forbedring)

### 1. Forretningsregler håndhæves forskellige steder
- **Problem:** Nogle regler ligger i DB (én admin, faste roller, materialer skal afrapporteres), andre kun i klienten (`requires_approval`, `max_assignees`, "kun egne privilegier" ved direkte privilegie-insert), og nogle begge steder i to implementeringer (`addItemUnits` ↔ `add_item_with_units`).
- **Hvorfor problem:** Projektets egen regel (CLAUDE.md, `Project.md` §15) er, at sikkerhed og regler håndhæves server-side.
- **Konsekvens:** Regler kan omgås via API'et; to implementeringer kan drive fra hinanden.
- **Forbedring:** Én "regel-ejer" pr. regel – flyt de manglende ind i RPC/trigger, og lad klienten kun spejle dem (som `privilegeLocking.ts` gør godt).

### 2. Single Responsibility – "god components"
- **Problem:** `DataLayerPage.tsx` (984 linjer, ~20 `useState`), `TaskCard.tsx` (532, kort + modal + 8 handlinger + 3 queries), `itemsDetailComponent.tsx` (664), `OrganisationTab.tsx` (498).
- **Hvorfor:** Mange ansvar i én fil (data, URL-state, filtre, modaler, mutationer).
- **Konsekvens:** Svært at læse, teste og ændre uden sideeffekter; re-render af alt ved hver ændring.
- **Forbedring:** Custom hooks pr. ansvar (`useDataLayerSelection`, `useDataLayerFilters`, `useTaskCardActions`) og opdeling af kort vs. detalje-modal.

### 3. Dependency Inversion / testbarhed
- **Problem:** Alle API-filer importerer modul-singletonen `supabase` direkte; `session.ts` kalder `supabase.auth.getUser()`.
- **Hvorfor:** Ingen søm (seam) til at udskifte klienten.
- **Konsekvens:** Endpoints kan kun testes mod en rigtig Supabase eller med modul-mocking.
- **Forbedring:** Det er en almindelig og acceptabel afvejning i RTK+Supabase-apps; tests kan bruge `vi.mock('../../lib/supabase')`. De rene funktioner (`utils/*`, `privilegeLocking`, `buildCategoryTree`, `itemPlacements`, `orgPalette`, `richText`) er allerede let testbare.

### 4. Separation of Concerns – afvigelser fra eget mønster
- **Problem:** `Login.tsx`/`SignUp.tsx` kalder `supabase.auth` direkte; hooks (`useHasPrivilege`, `useActiveMembership`) ligger i API-filer; `src/store/slices/dataLayersSlices/` indeholder ikke slices; typefiler indeholder runtime-kode og Tailwind-klasser.
- **Konsekvens:** Nye udviklere ved ikke, hvor de skal lede eller lægge ny kode; CLAUDE.md beskriver en struktur, koden ikke helt følger.
- **Forbedring:** Flyt hooks til `store/hooks/`, helpers til `utils/`, login/signup til `authApi`-mutations.

### 5. Ikke-atomiske klient-orkestreringer
- **Problem:** `deleteRoom` (3 trin), `addItems`, `useDeleteMany`, kategori-omsortering, rolle + privilegier i matricen, opgave + reservationer, afrapportering + statusskift.
- **Konsekvens:** Delvise tilstande ved netværksfejl (fx slettede opgaver men rum består).
- **Forbedring:** RPC'er for operationer, der skal lykkes samlet (mønstret findes allerede: `create_role_with_privileges`, `create_task_room`).

### 6. DRY – godt arbejde, men rester
- **Observeret positivt:** Kommentarer dokumenterer konsolideringer: `Alert` (~70 kopier), `Modal` (~28 dialoger), `useDismissable` (4), `formatDate` (14 hardkodede `'da-DK'`), `personName` (~15), `USER_SCOPED_TAGS` (efter en konkret bug), `useNavItems` (3 navigationslister), `useMessageThread` (2).
- **Rester:** to veje til rolleoprettelse; dublerede sproglister (`index.html` ↔ `languages.ts`); danske sentinel-strenge delt mellem triggere og `notificationDisplay.ts`; samme "react på 0 rækker"-tjek kun 3 steder.

### 7. Inkonsistente konventioner
- **Problem:** camelCase-mapping i de fleste API'er, men `Task` er snake_case; filnavne `PascalCase.tsx` vs. `camelCaseComponent.tsx`; kommentarer dansk vs. engelsk (statistik, `richText`, `orgPalette` på engelsk; CLAUDE.md siger engelsk); indrykning i `messageApi.ts`.
- **Konsekvens:** Kognitiv belastning, sværere søgning.
- **Forbedring:** Beslut én konvention og ret ved lejlighed (fx via en lint-regel for filnavne).

### 8. "Magiske" strenge som domænenøgler
- **Problem:** Privilegier (`'read_tasks'`), standardroller (`'Admin'`, `'Medlem'`), sentinel-tekster (`'Denne besked er slettet'`) er fri tekst i både SQL og TS.
- **Konsekvens:** Stavefejl giver stille fejl; danske rollenavne er ikke generiske/oversættelige.
- **Forbedring:** Katalogtabel for privilegier med FK; et `is_system_role`/`system_key`-felt på roller i stedet for navnematch; kode-felter i notifikationer/beskeder.

### 9. Ukontrollerede typeantagelser ved API-grænsen
- **Problem:** `data as Task`, `data as StatisticsResult`, `row.organisations as unknown as { name: string }`, utypet `createClient`.
- **Konsekvens:** Skemaændringer opdages først ved runtime (og der er ingen Error Boundary).
- **Forbedring:** `supabase gen types typescript` → `createClient<Database>()`; evt. zod på RPC-svar.

### 10. Dokumentationsdrift
- **Problem:** `dbSchema.sql` mangler 4 tabeller m.m.; CLAUDE.md nævner filer der ikke findes; forældede kodekommentarer (`privilegeApi.ts` om ikke-kørte policies, `roleApi.deleteRole` om `set null`); i18n-README siger 14 namespaces.
- **Konsekvens:** Ny udvikler stoler på forkert information.
- **Forbedring:** Kør `exportSchema.sql` som fast trin; ret CLAUDE.md.

### 11. Kompleksitet i datalager-modellen (KISS)
- **Problem:** Tre "arter" × indhold/kapacitet/pakkestørrelse × automatiske statusser, i både TS og SQL, med mange migrationer på én dag (2026-09-23).
- **Konsekvens:** Svært at ræsonnere om (fx at `quantity` betyder *niveau* for beholdere men *antal* for andre).
- **Forbedring:** Dokumentér arterne ét sted (som `04-kode/04-datalayer.md` §1 forsøger), og overvej en eksplicit `kind`-kolonne på items i stedet for at udlede arten af kolonnekombinationer.

---

## 11.3 Coupling og cohesion

- **Høj kohæsion** i API-filerne (ét domæne pr. fil) og i `components/common`.
- **Kobling mellem features** (observeret): `taskApi` importerer `toItemLocation` fra `categoryApi`; næsten alle lister importerer `fetchProfilesByIds` fra `profileApi`; `organisationApi`/`authApi` deler `USER_SCOPED_TAGS`; `privilegeApi` importerer en i18n-type. Det er bevidst genbrug, men gør `profileApi` og `supabaseApi` til centrale afhængigheder.
- **Skjult kobling via databasen:** opgaver ↔ chats ↔ notifikationer ↔ statistik er koblet gennem triggere, ikke gennem kode, man kan følge i editoren.

## 11.4 Ting der fungerer godt (bør bevares)
- Ét `supabaseApi` med `injectEndpoints` og tag-hjælpere.
- Fejl som i18n-nøgler + DB-`hint`-koder.
- "Afled i stedet for at synkronisere"-mønstret (få `useEffect`'er).
- `privilegeLocking.ts` – ren funktion, der spejler DB-regler.
- Seed-generator + FACIT som verificerbar sandhed for statistikken.
- Kommentarer, der forklarer *hvorfor* og linker til user stories/migrationer.
