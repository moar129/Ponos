# 5. Classes, objects og design patterns

## 5.1 Klasser i koden

Ponos er skrevet **funktionelt**: React-funktionskomponenter, hooks og rene funktioner. Der findes præcis **én** egen klasse:

### `QueryFailure` (`src/store/apis/apiError.ts`)
```ts
export class QueryFailure extends Error {
  readonly queryError: QueryError
  constructor(queryError: QueryError) {
    super(queryError.error)
    this.queryError = queryError
  }
}
```
| Aspekt | Beskrivelse |
|---|---|
| Ansvar | Bære en færdig `QueryError` gennem et `throw`, så hjælpefunktioner i `session.ts` kan afbryde et endpoint uden at hvert trin skal tjekke en returværdi |
| Felter | `queryError: QueryError` (readonly); `message` (arvet) = fejlstrengen |
| Metoder | Kun constructor |
| Inheritance | `extends Error` (så `instanceof Error` og stack trace virker) |
| Relationer | Kastes af `session.ts` og `fetchProfilesByIds`; fanges af `runQuery` → `toQueryError` |

**Interfaces/typer** bruges i stedet for klasser til at beskrive data: domænetyper (`Profile`, `Organisation`, `Task`, `ItemUnit` …), prop-typer (`…Props`), API-inputtyper (`CreateRoleInput` …), samt diskriminerede unions (`QueryResult<T> = { data } | { error }`, `DataLayerFavoriteTarget = { categoryId } | { locationId }`).

## 5.2 "Objekt-systemer" der fungerer som klasser

Selv uden `class` er der et par centrale objekter med tilstand og adfærd:

| Objekt | Fil | Tilstand | "Metoder" |
|---|---|---|---|
| `supabase` (klient) | `lib/supabase.ts` | session, kanaler | `auth.*`, `from()`, `rpc()`, `channel()` |
| `store` | `store/store.ts` | hele Redux-tilstanden | `dispatch`, `getState` |
| `supabaseApi` | `store/apis/supabaseApi.ts` | endpoints, cache | `injectEndpoints`, `util.invalidateTags`, `util.updateQueryData` |
| `i18n` | `i18n/config.ts` | sprog, ressourcer | `t`, `changeLanguage`, `addResourceBundle` |
| `openStack` | `components/common/Modal.tsx` | stak af åbne modaler (modulniveau) | push/splice i effect |
| `languageLoads` | `i18n/config.ts` | `Map<sprog, Promise>` | memoisering af indlæsning |

## 5.3 Design patterns observeret i koden

Kun mønstre, der faktisk kan peges på i koden:

| Pattern | Hvor | Hvorfor det bruges |
|---|---|---|
| **Singleton (modul-singleton)** | `supabase` i `lib/supabase.ts`, `store`, `i18n`, `supabaseApi` | Én forbindelse/én cache for hele appen; ES-moduler evalueres kun én gang |
| **Provider / Dependency Injection via Context** | `main.tsx`: `Provider`, `I18nextProvider`, `BrowserRouter` | Komponenter får store, oversættelser og router uden at importere dem eller få dem som props |
| **Observer / Publish–Subscribe** | `authApi.getSession.onCacheEntryAdded` (`onAuthStateChange`), Realtime-kanaler i `messageApi`/`notificationApi`, RTK Query's tag-invalidering, `window`-events i `useStatisticsPeriod`/`useMessageThread` | Hold UI i sync med ændringer, der sker andre steder (anden fane, anden bruger, serveren) |
| **Facade / Gateway** | Hver `*Api.ts` skjuler Supabase bag domæneorienterede hooks (`useAssignRoleMutation`); `session.ts` skjuler "hvem/hvor er jeg"-opslag | Komponenter kender ikke tabelnavne, RPC'er eller fejlkoder |
| **Repository-lignende data-adgang** | Endpoints pr. aggregat (roller, opgaver, nyheder …) med mapping fra rækker til domæneobjekter (`toOrganisation`, `mapNewsRow`, `toMessage`) | Isolerer persistensformat (snake_case, joins) fra UI'et. (Ikke et klassisk repository-interface, men samme ansvar.) |
| **Adapter / Mapper** | `mapDbError` (Postgres-fejl → app-fejl), `toRoom`, `toItemLocation`, `addItemRpcArgs` (camelCase → `p_*`-parametre) | Oversætter mellem to formater |
| **Composite (træstruktur)** | Kategoritræet `DataLayerCat { items, subCategories }` bygget af `buildCategoryTree` og gennemløbet rekursivt (`getAggregatedItems`, `getDescendantCategories`), `CategoriTreeNodeComponent` der renderer sig selv rekursivt | Ensartet behandling af blade og grene |
| **Strategy (let variant)** | `compareTasks(sortBy)` returnerer en sammenligningsfunktion; `ResolveTaskMaterialsModal` med `mode: 'resolve' \| 'release' \| 'deleteTask'` og `useApplyMaterialOutcomes` (`release` vs `resolve`) | Udskiftelig algoritme bag samme UI |
| **Optimistic UI / Command med undo** | `onQueryStarted` + `updateQueryData` + `patch.undo()` i favorit-API'erne, `markConversationRead`, notifikationspræferencer | Øjeblikkelig respons, rulles tilbage ved fejl |
| **Memoization** | `languageLoads` (promise-cache), React Compiler, `fetchProfilesByIds` (dedup) | Undgå dobbeltarbejde |
| **Guard / Template for endpoints** | `runQuery(async () => …)` + kastende `session.ts`-hjælpere | Ensartet try/catch og fejlformat uden gentaget kode |
| **Higher-order route (Guard)** | `ProtectedRoute` som layout-route med `<Outlet/>` | Fælles adgangskrav for en gruppe ruter |
| **Custom hooks som "view models"** | `useTaskBoard`, `useMessageThread`, `useStatisticsPeriod`, `useAdministrationTabs` | Samler data, afledt tilstand og handlinger for en visning; komponenten bliver ren præsentation (beslægtet med MVVM) |
| **Database-side patterns** | SECURITY DEFINER-funktioner som "stored procedures/service layer"; triggere som domæne-events; SCD type 2-historik (`valid_from/valid_to`); *bypass*-flag via `set_config` | Atomiske regler tæt på data; historik til statistik |

**Ikke observeret:** MVC (i klassisk forstand), CQRS (læse- og skrivemodel er de samme tabeller – statistik-RPC'en er dog en separat "læsemodel"), Factory-klasser, abstrakte klasser/arv ud over `QueryFailure`, klassisk constructor-DI.

## 5.4 Interfaces og typer som kontrakter

- **Typede endpoints:** `builder.query<ResultType, ArgType>` og `builder.mutation<…>` – hooks arver typerne automatisk.
- **Typede i18n-nøgler:** `CustomTypeOptions` i `i18next.d.ts` gør dansk ordbog til kontrakt for `t()`.
- **`as const satisfies …`**-mønstret (fx `taskTags`, `TOP_TABS`) giver både literal-typer og kontrol af formen.
- **Svagt punkt:** grænsen mod databasen er *ikke* typet (ingen genererede `Database`-typer), så rækker castes (`as Task`, `as StatisticsResult`).
