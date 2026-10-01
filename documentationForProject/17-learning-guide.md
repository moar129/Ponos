# Sådan lærer jeg dette projekt

En anbefalet rækkefølge for en udvikler, der aldrig har set Ponos før. Regn med 2–3 dage for at nå punkt 8. Hav appen kørende ved siden af (`npm run dev` med en `.env.local`, se `13-konfiguration.md`), og log ind som en af seed-brugerne fra `docs/seed/README.md` med forskellige roller.

---

## Trin 0 – Forstå produktet (½ time)
- `README.md` (roden) og `docs/Project.md` §1–4 – hvad og hvorfor.
- Denne dokumentations `01-formaal-og-arkitektur.md`.
- **Mål:** kunne forklare "Data → Mennesker → Opgaver → Handling → Indsigt" og de tre spørgsmål.

## Trin 1 – Opstart og skelet (1 time)
1. `index.html` – læg mærke til scriptet i `<head>`.
2. `src/main.tsx` → `src/App.tsx` → `src/routes/ProtectedRoute/ProtectedRoute.tsx`.
3. `src/store/store.ts`.
4. Læs `03-application-flow.md` og `04-kode/01-infrastruktur.md`.
- **Mål:** vide hvilken komponent, der vises for en given URL, og hvorfor man sendes til `/login`.

## Trin 2 – Data-laget: det vigtigste mønster i appen (2 timer)
1. `src/lib/supabase.ts` – den ene klient.
2. `src/store/apis/supabaseApi.ts` – `createApi` + `fakeBaseQuery`, `USER_SCOPED_TAGS`, tag-hjælpere.
3. `src/store/apis/apiError.ts` → `src/store/apis/session.ts` → `src/ErrorMessage.ts` – fejlkæden.
4. Et lille, rent API: `src/store/apis/newsApi.ts` – og så hvor det bruges: `src/pages/News/NewsPage.tsx`.
5. `src/store/apis/authApi.ts` – Observer-mønstret med `onAuthStateChange`.
- **Øvelse:** følg `useGetNewsQuery()` fra komponenten til HTTP-kaldet og tilbage (åbn DevTools → Network).
- **Mål:** kunne skrive et nyt endpoint med `injectEndpoints`, `runQuery`, `mapDbError` og korrekte tags.

## Trin 3 – Multi-tenancy og rettigheder (2–3 timer) ⭐ vigtigst at forstå
1. `04-kode/03-organisation-roller.md` (§1 og §2 er nøglen).
2. I `docs/dbSchema.sql`: §14 (hjælpefunktioner) og §16 (RLS) – læs `auth_profile_org()` og `has_privilege_or_admin()`.
3. `src/store/apis/privilegeApi.ts` – privilegiekataloget og `useHasPrivilege`.
4. `src/components/dashboard/roles/privilegeLocking.ts` – hvordan klienten spejler DB-reglerne.
- **Øvelse:** log ind som `sofie.andersen` og som en admin; sammenlign navigation og hvad der kan ses. Sammenlign i DevTools → Network svaret fra `GET /rest/v1/tasks` for forskellige brugere (klienten er ikke eksponeret på `window`, så direkte konsol-kald kræver en midlertidig import).
- **Mål:** kunne forklare forskellen på "skjult i UI" og "afvist af RLS", og hvorfor *aktiv* organisation styrer alt.

## Trin 4 – Databasen som backend (2 timer)
1. `06-database.md` – tabeller, ER-diagram, funktioner, triggere, bypass-flag.
2. Læs én RPC helt: `create_organisation` (`dbSchema.sql` §15.8) – guards, bypass-flag, atomisk.
3. Læs én trigger-kæde: `handle_membership_request_status_change` (§15.3).
4. `docs/migrations/README.md` – hvordan ændringer køres.
- **Mål:** vide, at "hvorfor skete X?" ofte besvares i en trigger, ikke i React-koden.

## Trin 5 – Et domæne i dybden: Opgaver (2–3 timer)
1. `04-kode/05-opgaver.md` (statusmaskine + materialer).
2. `src/store/hooks/useTaskBoard.ts` → `src/pages/Task/TaskPage.tsx` → `src/components/Task/TaskBoard.tsx` → `TaskCard.tsx`.
3. `src/store/apis/taskApi.ts` (skim) og RPC'erne `set_task_status`, `approve_task_request`.
- **Øvelse:** opret en opgave med materialer, påbegynd, meld færdig, godkend som en anden bruger – og følg i Network-fanen, hvilke RPC'er der kaldes.

## Trin 6 – Datalageret (2 timer)
1. `04-kode/04-datalayer.md` §1 (item vs. enhed, de tre "arter") – læs grundigt.
2. `src/store/apis/categoryApi.ts` (`getCategoryTree`, `buildCategoryTree`).
3. `src/store/slices/dataLayersSlices/*` (rene hjælpere trods navnet).
4. `src/pages/dataLayer/DataLayerPage.tsx` (skim – stor fil).

## Trin 7 – Realtime, i18n og UI-fundament (1–2 timer)
1. `04-kode/06-beskeder-notifikationer.md` – `onCacheEntryAdded` + kanaler.
2. `src/i18n/README.md` og `04-kode/11-i18n-og-tema.md`.
3. `src/components/common/*` og `04-kode/10-faelles-ui-hooks-utils.md` – **genbrug før du bygger nyt**.

## Trin 8 – Statistik (1 time)
1. `docs/statistik-plan.md` (definitioner) og `04-kode/08-statistik.md`.
2. `docs/seed/FACIT.md` – sammenlign med `/statistik` som admin.

## Trin 9 – Risici og edge cases (1 time)
1. `08-security.md`, `16-teknisk-gaeld.md`, `09-error-handling.md`, `10-performance.md`.
2. `15-kritiske-flows.md` som opsummering.

---

## Det vigtigste at forstå først (i prioriteret rækkefølge)
1. **Aktiv organisation + RLS** er sikkerhedsmodellen. Klientens rettighedstjek er kun UX.
2. **Ét `supabaseApi` med `injectEndpoints`** og **tag-invalidering** er måden, data hentes og holdes friske på.
3. **Fejl er i18n-nøgler** (`errors:…`), og DB-fejl bærer en stabil kode i `hint`.
4. **Meget logik bor i Postgres** (RPC'er og triggere) – læs `docs/dbSchema.sql`, når noget "sker af sig selv".
5. **Genbrug** fælles komponenter/hooks/utils og følg mønstrene "afled i stedet for at synkronisere" og "returnér nøgler fra moduler uden for React".

## Praktiske råd
- **Kør altid** `npm run lint` og `npm run build` (= typecheck); kør `npm run i18n:check`, når du tilføjer tekst.
- **SQL-ændringer** skrives som en fil i `docs/migrations/` og køres manuelt af projektejeren i Supabase SQL Editor.
- **Domæneejerskab:** tjek hvilken studerende der ejer et område, før du ændrer det (`docs/studerende1-plan.md`, kommentarer i koden).
- **Når dokumentation og kode er uenige, har koden (og live-skemaet) ret.** Brug `docs/exportSchema.sql` til at tjekke databasen.
