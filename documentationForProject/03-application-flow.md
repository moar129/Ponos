# 3. Application flow

Ponos er en **Single Page Application** uden egen server, så "en request" er her en brugerhandling i browseren, der bliver til et eller flere HTTP-kald direkte til Supabase. Flowet er tilpasset det.

---

## 3.1 Hvordan applikationen starter

1. **Browseren henter `index.html`** (fra Vite dev-server eller en statisk host).
2. **Pre-hydration-scriptet** i `<head>` kører synkront:
   - `data-theme` sættes ud fra `localStorage['ponos-theme']` eller OS'ets `prefers-color-scheme`.
   - `<html lang>` sættes ud fra `localStorage['ponos-language']` eller `navigator.language` (fallback `da`).
3. **`/src/main.tsx` indlæses som ES-modul.** Ved import af modulerne sker der side effects:
   - `src/i18n/config.ts`: `i18n.use(initReactI18next).init(...)` med dansk bundlet; er sproget ikke dansk, startes `loadLanguage(lang)` asynkront (lazy chunk).
   - `src/store/store.ts`: `configureStore(...)` + `setupListeners(store.dispatch)`.
   - `src/lib/supabase.ts` (importeres transitivt af API-filerne): `createClient(url, anonKey)` – advarer hvis env-vars mangler.
   - Alle `*Api.ts`-filer kalder `supabaseApi.injectEndpoints(...)` ved import og registrerer dermed deres endpoints.
4. **`createRoot(...).render(<StrictMode><Provider><I18nextProvider><BrowserRouter><App/>…)`**.

## 3.2 Hvordan configuration indlæses

| Konfiguration | Hvornår | Hvordan |
|---|---|---|
| Supabase URL/nøgle | Build-tid | Vite erstatter `import.meta.env.VITE_*` med værdier fra `.env.local` |
| Sprog | Første script + i18n-init | `<html lang>` → `getDocumentLanguage()` |
| Tema | Første script + `themeSlice` initialState | `data-theme` → `getInitialTheme()` |
| Organisationens farver | Runtime efter login | `useOrganisationTheme()` → `getMyOrganisation` → CSS-variabler |
| Brugerens rettigheder | Runtime efter login | `getMyPrivileges` (cache) |

## 3.3 Hvordan dependencies initialiseres

Der er ingen DI-container. "Dependencies" leveres på tre måder:
- **Modul-singletons:** `supabase`-klienten, `store`, `i18n` – importeres direkte, hvor de bruges.
- **React Context via providers** (`main.tsx`): Redux-store (→ `useSelector`, RTK-hooks), i18n (→ `useTranslation`), router (→ `useNavigate`, `useSearchParams`).
- **Endpoint-injektion:** hver feature-fil udvider det fælles `supabaseApi` (`injectEndpoints`) og eksporterer auto-genererede hooks (`useGetTasksQuery` …).

## 3.4 Hvordan en "request" kommer ind

Tre kilder:
1. **Navigation** (link, `navigate()`, F5, delt link) → React Router matcher en rute i `App.tsx` → evt. `ProtectedRoute` → sidekomponenten mountes → dens query-hooks starter.
2. **Brugerhandling** (klik/submit) → event-handler → mutation-trigger (`const [mutate] = useXMutation(); await mutate(args).unwrap()`).
3. **Push fra serveren** (Realtime) → `postgres_changes`-event → `updateCachedData` eller `invalidateTags` i et `onCacheEntryAdded`-abonnement.

Desuden: **auth-hændelser** (`onAuthStateChange`) og **fokus/reconnect** (kun statistik har `refetchOnFocus`).

## 3.5 Hvordan requesten behandles (query)

```mermaid
sequenceDiagram
  participant C as Komponent
  participant H as RTK Query-hook
  participant Cache as RTK-cache
  participant Q as queryFn (endpoint)
  participant S as session.ts
  participant SB as supabase-js
  participant DB as Postgres (RLS)
  C->>H: useGetTasksQuery()
  H->>Cache: findes frisk data for (endpoint, args)?
  alt cache-hit og ikke invalideret
    Cache-->>H: data (ingen netværk)
  else cache-miss eller invalideret
    H->>Q: kør queryFn
    Q->>S: getActiveOrganisationId()
    S->>SB: auth.getUser() + profiles-opslag
    Q->>SB: from('tasks').select('*').eq('organisation_id', org)
    SB->>DB: GET /rest/v1/tasks?… (Bearer JWT)
    DB->>DB: RLS: org = auth_profile_org() ∧ read_tasks ∧ rum-adgang …
    DB-->>SB: rækker (kun dem brugeren må se)
    SB-->>Q: { data, error }
    Q-->>H: { data } eller { error: QueryError }
    H->>Cache: gem + providesTags
  end
  H-->>C: { data, isLoading, isFetching, error } → re-render
```

- **Deduplikering:** to komponenter med samme `(endpoint, args)` deler én request og ét cache-entry.
- **Levetid:** et cache-entry uden abonnenter fjernes efter 60 sek (RTK-default; `keepUnusedDataFor` ændres ikke i koden).

## 3.6 Hvordan business logic udføres (mutation)

```mermaid
sequenceDiagram
  participant C as Komponent
  participant M as Mutation-endpoint
  participant DB as Postgres
  participant Cache as RTK-cache
  C->>C: klientvalidering (UX)
  C->>M: mutate(args).unwrap()
  alt simpel CRUD
    M->>DB: insert/update/delete (RLS WITH CHECK/USING)
    DB->>DB: BEFORE-triggere (sync org, guards) → skriv → AFTER-triggere (historik, notifikationer, chat)
  else sammensat regel
    M->>DB: rpc('fn', args) – SECURITY DEFINER, guards, én transaktion
  end
  DB-->>M: OK eller fejl (code/hint)
  M-->>C: data eller QueryError (errors:-nøgle)
  M->>Cache: invalidatesTags → berørte queries refetches
  opt optimistisk opdatering
    M->>Cache: updateQueryData før svaret, patch.undo() ved fejl
  end
```

**Hvor reglerne ligger:**
- **Databasen:** isolation, privilegier, invarianter (én admin, faste roller, låste enheder), workflows (accept → medlemskab, godkend → afrapportér → afslut), afledte data (historik, notifikationer, chats).
- **Klienten:** UX-validering, visnings-logik, orkestrering af multi-trin-handlinger og nogle regler, der (endnu) ikke er håndhævet server-side (se `16-teknisk-gaeld.md`).

## 3.7 Hvordan data hentes eller gemmes

- **Læsning:** PostgREST-`GET` med `select`, filtre og sortering; enkelte embeds; profiler i batch (`fetchProfilesByIds`); aggregater via RPC (statistik, samtaleliste, ventende godkendelser).
- **Skrivning:** PostgREST-`POST/PATCH/DELETE` for simple rækker; RPC for alt, der skal være atomisk eller kræver forhøjede rettigheder.
- **Mapping:** rækker → camelCase-domæneobjekter i endpointet (undtagen `Task`).
- **Klient-cache:** RTK Query (in-memory). **Persistens i browseren:** kun session (supabase-js), tema, sprog og én widget-fane i `localStorage`.

## 3.8 Hvordan "response" returneres til brugeren

1. Hook-tilstanden ændres (`isLoading → false`, `data`/`error` sat).
2. Komponenten re-renderer (React Compiler sørger for minimal genberegning).
3. Loading: tekst/`Spinner`; tom: `EmptyState`; fejl: `<Alert>{readableError(error)}</Alert>`; succes: data, evt. en succes-`Alert` ("Gemt").
4. Tekster slås op i i18n på brugerens sprog; datoer/tal formateres med `Intl` og aktuelt sprog (`utils/formatDate.ts`).
5. Andre brugere ser ændringen: **med det samme** for beskeder/notifikationer (Realtime); **ved næste refetch** for alt andet (navigation, invalidering, fokus på statistik, token-refresh).

---

## 3.9 Samlet livscyklus i ét billede

```mermaid
flowchart TD
  A[index.html: tema+sprog] --> B[main.tsx: store, i18n, supabase, providers]
  B --> C[App: session-lytter, org-farver, routes]
  C --> D{Rute}
  D -->|offentlig| E[Landing/Login/…]
  D -->|beskyttet| F[ProtectedRoute]
  F -->|ingen session| E
  F -->|session| G[Side]
  G --> H[Queries via RTK]
  G --> I[Mutations ved handling]
  H & I --> J[session.ts + supabase-js]
  J --> K[(Supabase: RLS · RPC · triggere)]
  K --> L[svar / fejl med hint]
  L --> M[cache + tags]
  M --> G
  K -. Realtime .-> M
  N[onAuthStateChange] --> M
```
