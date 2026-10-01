# 10. Performance

> Målt/observeret ved `npm run build` (2026-10-01) og ved læsning af koden. Der er ikke lavet runtime-profilering i en browser; tal for antal requests er udledt af koden.

---

## 10.1 Netværk: round-trips pr. endpoint

### Problem: `getUser()` + profilopslag foran næsten hvert kald
`session.ts`:
- `getCurrentUserId()` / `getOptionalUserId()` → `supabase.auth.getUser()` = **HTTP-kald til `/auth/v1/user`** (validerer JWT'en server-side).
- `getActiveOrganisationId()` → derudover `select active_organisation_id from profiles`.

Et typisk endpoint som `createRole` laver altså **3 sekventielle requests** (auth → profiles → roles). `getMyPrivileges` laver 4 (auth → profiles → memberships → privileges); `getMyProfile` op til 5.

**Hvorfor det er sådan:** sikkerhed (`getUser` stoler ikke blindt på den lokale token) og enkelhed. **Men:** databasen kender allerede både bruger (`auth.uid()`) og aktiv org (`auth_profile_org()`), og RLS håndhæver begge. Organisation-id'et bruges i klienten mest til `.eq('organisation_id', …)`-filtre og inserts.

**Forbedringer:**
- Brug `supabase.auth.getSession()` (lokal) til at finde bruger-id'et – RLS validerer alligevel JWT'en ved hvert DB-kald.
- Cache aktiv org i RTK (fx fra `getMyProfile`) i stedet for et ekstra opslag pr. endpoint, eller lad DB-default/trigger sætte `organisation_id = auth_profile_org()` ved insert.

### Problem: N+1 på opgavetavlen (vigtigst)
`TaskCard.tsx` kalder for **hvert** kort:
```ts
useGetTaskAssigneesQuery(task.id)   // 1 request
useGetTaskRequestsQuery(task.id)    // 1 request
useGetTaskMaterialsQuery(task.id)   // 1–4 sekventielle requests
```
Med 70 åbne opgaver (seed) ≈ **210–420 HTTP-requests** ved indlæsning af `/tasks`, selv om kortenes detaljer er lukkede. Browsere tillader ~6 samtidige forbindelser pr. host (HTTP/1.1) – resten køer.

**Forbedringer:** ét batch-endpoint (`getBoardDetails(taskIds)` med `.in('task_id', ids)`, som `getCompletedTasks` allerede gør), eller hent detaljerne først når kortet åbnes (`skip: !isDetailsOpen`), eller en RPC/view, der returnerer tavlen færdig.

### Problem: hele tabeller hentes og aggregeres i klienten
| Endpoint | Henter | Risiko |
|---|---|---|
| `getUnitLocationCounts` | alle enheder i org | O(enheder) data + PostgREST `max_rows` (default 1000) afkorter **stille** |
| `getAvailableUnitLocations` | alle `Available`-enheder | samme |
| `getCategoryTree` | alle kategorier + items + status-counts | samme + `.in(item_id, …)` i URL |
| `getMessages` | hele samtalen | samme; ældste først → nyeste skæres fra |
| `getTasks` | alle opgaver i org (inkl. afsluttede man må se) | vokser over tid |

Statistikken løser præcis dette med server-side aggregering – kommentaren i `statisticApi.ts` nævner 1000-rækkers-loftet eksplicit.

### Problem: bred tag-invalidering
- **Login/logout og hvert token-refresh** (`onAuthStateChange` fyrer `TOKEN_REFRESHED` ca. hver time) invaliderer alle 24 `USER_SCOPED_TAGS` → alle aktive queries refetches, også når brugeren ikke har ændret sig.
- `'Conversation'` invalideres af mange opgave-mutationer (`updateTask`, `updateTaskStatus`, tilmeld/afmeld …) → `get_my_conversations` refetches hyppigt.
- Hver indkommende `message`-notifikation invaliderer `Conversation` → hele samtalelisten genhentes ved hver besked.
- `useDeleteMany` sletter N rækker med N requests, og hver invaliderer listen.

**Forbedring:** filtrér på `event` i `onAuthStateChange` (kun `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED`), brug finkornede tags, bulk-delete med `.in('id', ids)`.

---

## 10.2 Database

| Observation | Konsekvens | Forslag |
|---|---|---|
| RLS-policies kalder `auth_profile_org()` og `has_privilege_or_admin()` direkte (ikke `(select …)`) | Postgres kan evaluere funktionen pr. række; `has_privilege_or_admin` er selv 2 joins | Supabases anbefaling: `(select public.auth_profile_org())` → InitPlan, én evaluering pr. query |
| Policies som `task_id IN (SELECT tasks.id FROM tasks WHERE organisation_id = auth_profile_org())` | Sub-select pr. forespørgsel, der igen rammer `tasks`' egne policies | Denormalisér `organisation_id` ind i barnetabellerne (som datalageret gør) |
| Manglende indeks `task_requests(task_id)`, `task_assignees(user_id)` | Seq scan ved vækst | Tilføj indeks |
| `get_my_memberships`: korreleret `count(*)` pr. medlemskab | Fint ved få medlemskaber | – |
| `statistics_payload` (581 linjer PL/pgSQL) | Én tung forespørgsel pr. periodeskift/fokus (`refetchOnFocus`) | Acceptabelt; evt. materialiserede aggregater ved meget data |
| `add_item_with_units`: løkke med én `insert` pr. enhed, ingen øvre grænse | 10.000 stk. = 10.000 inserts i én transaktion | Øvre grænse eller `insert … select generate_series` |

---

## 10.3 Frontend-bundle

Fra `npm run build`:
```
dist/assets/index-BfnCBCZp.js   1,706.57 kB │ gzip: 485.66 kB
(!) Some chunks are larger than 500 kB after minification.
```
- **Alle sider ligger i én chunk** – ingen `React.lazy`/route-splitting. En udlogget besøgende på forsiden downloader også recharts, statistiksiden, datalager-siden osv.
- Locale-JSON er derimod splittet pr. sprog og namespace (de mange små `nav-*.js`, `tasks-*.js` …) – godt.
- `recharts` (kun statistik) og `lucide-react` (ikoner; tree-shaking bør virke ved navngivne imports) er de tungeste kandidater.

**Forbedring:** `const StatisticsPage = lazy(() => import('./pages/statistik/StatisticsPage'))` + `<Suspense>` pr. rute; forventeligt stor gevinst for forside og login.

Byggetid: 16 s, heraf 71 % i Babel-transformen til React Compiler.

---

## 10.4 Rendering

- **React Compiler** memoiserer komponenter og afledte værdier automatisk; derfor er manuelle `useMemo`/`useCallback` sjældne (undtagelser: `PrivilegeMatrix`, `DataLayerPage`, `useMessageThread`, `RichTextEditor`).
- **Mønstret "afled i stedet for at synkronisere"** (fx valgt fane, valgt kategori fra URL) undgår ekstra render-runder fra `useEffect` + `setState`.
- **Store komponenter** (`DataLayerPage` 984 linjer, `TaskCard` 532, `itemsDetailComponent` 664) re-renderes som helhed ved enhver state-ændring; compileren afbøder det, men opdeling ville gøre det tydeligere.
- Lister er ikke virtualiserede (fx datalagerets item-liste, beskeder, notifikationssiden) – fint ved hundredvis af rækker.
- `buildCategoryTree` er O(C² + C·I); `getCompletedTasks` filtrerer alle tilmeldinger pr. opgave (O(T·A)). Fint ved nuværende datamængder.

---

## 10.5 Realtime

- Kanaler oprettes pr. cache-entry: én pr. åben samtale (`messages:<id>`), én pr. åben deltagerliste, og én pr. notifikations-query-variant (klokke `{limit: 8}`, dashboard, `/notifikationer`) – samme data abonneres op til 3 gange.
- Kanaler lukkes korrekt (`removeChannel` ved `cacheEntryRemoved`), dvs. ingen lækager ved navigation.

---

## 10.6 Prioriteret liste

1. **N+1 på `/tasks`** – størst målbar effekt for brugerne.
2. **Klient-aggregering af alle enheder/beskeder** – både performance og *korrekthed* (`max_rows`).
3. **Route-baseret code splitting** – 1,7 MB initial JS.
4. **Unødvendige `getUser`/profil-round-trips** i hvert endpoint.
5. **`TOKEN_REFRESHED` → fuld refetch** hver time.
6. RLS-funktioner i `(select …)` + manglende indekser – når datamængden vokser.
