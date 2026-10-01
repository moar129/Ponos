# 18. Final summary

## Systemets arkitektur
Ponos er en **React 19 + TypeScript SPA** (Vite, Tailwind v4, React Compiler) uden egen applikationsserver. Al server-state hentes gennem **RTK Query** (ét `supabaseApi` + 16 feature-API'er) direkte fra **Supabase** (Auth, PostgREST, Realtime). **PostgreSQL er backenden**: 33 tabeller med Row Level Security, 93 funktioner (RPC'er og hjælpere, alle `SECURITY DEFINER` med fast `search_path`) og 33 triggere bærer sikkerheden, invarianterne og en stor del af forretningslogikken. Multi-tenancy er løst med `organisation_id` på hver række og brugerens **aktive organisation** (`auth_profile_org()`), rettigheder med navngivne privilegier på roller (`has_privilege_or_admin()`).

## De vigtigste komponenter
| Komponent | Rolle |
|---|---|
| `src/lib/supabase.ts` | Eneste forbindelse til backend |
| `src/store/apis/supabaseApi.ts`, `apiError.ts`, `session.ts` | RTK-kernen: tags, fejlmodel, "hvem/hvor er jeg" |
| `authApi.ts` + `ProtectedRoute` | Session med live-opdatering og login-guard |
| `organisationApi`, `roleApi`, `privilegeApi` | Tenant- og rettighedsmodellen (klientsiden) |
| `categoryApi` + `DataLayerPage` | Datalageret (items, enheder, lokationer, reservation) |
| `taskApi` + `TaskCard`/`useTaskBoard` | Opgaver, godkendelse, materialer |
| `messageApi`, `notificationApi` | Realtime-kommunikation |
| `statisticApi` + `get_statistics`/`statistics_payload` | Server-side statistik |
| `components/common/*`, `ErrorMessage.ts`, `i18n/*` | Fælles UI, fejlvisning, 14 sprog |
| DB: `auth_profile_org`, `has_privilege_or_admin`, `can_access_task_room` + RLS | Den egentlige adgangskontrol |

## De vigtigste dataflows
1. **Session:** Supabase Auth → `onAuthStateChange` → RTK-cache → invalidering af alle bruger-tags.
2. **Læsning:** komponent → query-hook → `session.ts` → PostgREST `GET` → RLS → mapping → cache → render.
3. **Skrivning:** handling → mutation → insert/update eller RPC (én transaktion) → triggere → tag-invalidering → refetch.
4. **Realtime:** DB-ændring → WAL → Realtime-kanal → `updateCachedData`/`invalidateTags` (beskeder, notifikationer).
5. **Aktiv organisation:** `set_active_organisation` → alle 24 bruger-tags invalideres → RLS ser ny org overalt.
6. **Materialer:** datalager-enheder ↔ opgaver via `reserve_item_units` → status `Reserved/InUse` → afrapportering ved afslutning/godkendelse.
7. **Statistik:** periode i URL → `get_statistics` → aggregeret jsonb → visning; snapshots fryser tallene.

## De største tekniske risici (observeret)
1. **Kontoovertagelse** via `reset_password_prototype` (kendt prototype-forbehold – må ikke deployes).
2. **Interne definer-funktioner kaldbare af anon** uden tilstrækkelige tjek (`apply_task_material_outcomes`, `split_unit_if_needed`).
3. **Admin kan læse alle DM'er** pga. en policy, der ikke tjekker det, dens navn lover.
4. **Regler kun i klienten** (godkendelsespligt, maks. tilmeldte, rum-adgang ved selvtilmelding) og **privilegie-eskalering** via `update_roles`.
5. **Stille dataafkortning** ved klient-aggregering af hele tabeller (`max_rows`).
6. **Ingen tests, ingen CI, ingen Error Boundary** – og dokumentationsdrift mellem `dbSchema.sql` og live-databasen.
7. **Performance ved vækst:** N+1 på opgavetavlen, 1,7 MB initial bundle, ekstra round-trips pr. kald.

## De vigtigste ting en ny developer skal forstå
- **Sikkerhed = RLS + RPC-guards i databasen.** UI-tjek er kun bekvemmelighed.
- **Alt sker i den aktive organisation.**
- **Brug mønstrene:** `injectEndpoints` + tags, `runQuery`/`mapDbError`, `errors:`-nøgler, fælles komponenter/hooks, URL som state, "afled i stedet for at synkronisere".
- **Triggere gør meget "af sig selv"** (notifikationer, chats, historik, medlemskaber) – kig i `docs/dbSchema.sql` og live-skemaet.
- **SQL-ændringer** går gennem `docs/migrations/` og køres manuelt; hold `dbSchema.sql` opdateret.
- **Når noget er uklart:** koden og live-skemaet er sandheden; denne dokumentation markerer eksplicit, hvad der er **observeret**, **anbefalet** og **uklart**.
