# 15. Kritiske flows (end-to-end)

Ti flows, der tilsammen dækker hele systemet. Hvert flow viser: **trigger → frontend → API-lag → database (RLS/RPC/triggere) → cache → UI**. Fejlstier og kendte svagheder er nævnt til sidst i hvert flow.

---

## Flow 1 – Appen starter, og en gemt session gendannes

```mermaid
sequenceDiagram
  participant B as Browser
  participant H as index.html-script
  participant M as main.tsx
  participant A as App.tsx
  participant AU as authApi.getSession
  participant SB as supabase-js
  participant PR as ProtectedRoute
  B->>H: indlæs /tasks
  H->>H: data-theme + html lang fra localStorage
  B->>M: /src/main.tsx (store, i18n init, Router)
  M->>A: render
  A->>AU: useGetSessionQuery()
  AU->>SB: auth.getSession() (localStorage, evt. token-refresh)
  SB-->>AU: session
  AU->>AU: onAuthStateChange-lytter startes
  A->>A: useOrganisationTheme → getMyOrganisation → CSS-variabler
  A->>PR: route /tasks
  PR->>PR: isLoading → "Indlæser…", session → Outlet
  PR->>B: TasksPage → useTaskPermissions, useTaskBoard …
```
**Bemærk:** `getMyOrganisation` (for farverne) og alle sidens queries kører `getUser()` + profilopslag hver for sig (se `10-performance.md`). Ugyldig/udløbet refresh token → `session = null` → redirect til `/login` (uden returnTo).

---

## Flow 2 – Ny bruger: signup → første organisation

```mermaid
sequenceDiagram
  actor U as Ny bruger
  participant S as SignUp.tsx
  participant GA as Supabase Auth
  participant DB as Postgres
  participant D as Dashboard
  participant O as OrganisationTab
  U->>S: navn, email, kode
  S->>S: validate() (regex, ≥6 tegn, match)
  S->>GA: auth.signUp({ email, password, options.data: {first_name,last_name} })
  GA->>DB: insert auth.users
  DB->>DB: trigger on_auth_user_created → handle_new_user → insert profiles
  GA-->>S: { session } (eller null hvis email-bekræftelse)
  S->>D: navigate('/dashboard')
  D->>D: resolveDashboardTab: ingen org → fanen "Organisation"
  U->>O: "Opret organisation" (navn)
  O->>DB: rpc create_organisation(p_name)
  DB->>DB: org + rolle Admin(+admin) + rolle Medlem(+read_news,read_tasks) + membership + active_organisation_id
  DB-->>O: organisation
  O->>O: invalidates Organisation, Profile, Privilege, Membership
  O->>D: header viser "PONOS – org", nav viser Opgaver/Nyheder …, farver opdateres
```
**Fejlstier:** email findes → `signup.emailTaken`; navn findes → `errors:duplicateOrganisationName` (unik på `lower(trim(name))`).

---

## Flow 3 – Medlemskab: anmodning → godkendelse (og invitation)

```mermaid
sequenceDiagram
  actor U as Bruger
  actor A as Admin (read/update_membership_requests)
  participant DB as Postgres
  U->>DB: searchOrganisations('rosk') (ilike, limit 20)
  U->>DB: requestMembership → insert membership_requests (Pending)
  Note over U: PendingRequestBanner: "Din anmodning … afventer"
  A->>DB: getPendingMembershipRequests (RLS: aktiv org + privilegie) + fetchProfilesByIds
  A->>DB: reviewMembershipRequest → update status='Accepted' where id and status='Pending' returning id
  DB->>DB: BEFORE UPDATE trigger: reviewed_at/by, insert memberships(rolle Medlem), sæt aktiv org hvis null
  DB-->>A: 1 række (0 → errors:requestAlreadyHandled)
  Note over U: Ved næste refetch (fx fokus/navigation) ser U organisationen
```
**Invitation (US-67) er spejlvendt:** admin → `rpc invite_member(email)` → notifikation (`trg_notify_membership_invitation`) → bruger svarer med `respondToInvitation` → trigger opretter medlemskab og markerer notifikationen læst.

**Svagheder:** brugeren får ingen realtime-besked om accept (kun notifikation ved invitationer); `invite_member` afslører om en email har en konto.

---

## Flow 4 – Skift aktiv organisation

```mermaid
sequenceDiagram
  actor U
  participant OT as OrganisationTab ("Mine organisationer")
  participant API as organisationApi.setActiveOrganisation
  participant DB as Postgres
  participant C as RTK-cache
  U->>OT: "Skift til" Org B
  OT->>API: setActiveOrganisation({ organisationId: B })
  API->>DB: rpc set_active_organisation(B)
  DB->>DB: medlem af B? → bypass-flag → update profiles.active_organisation_id = B
  API->>C: invalidateTags(USER_SCOPED_TAGS) – alle 24 tags
  C->>DB: alle aktive queries refetches (profil, privilegier, opgaver, beskeder, …)
  Note over DB: RLS bruger nu auth_profile_org() = B overalt
```
**Hvorfor dette er centralt:** al tenant-isolation hænger på `active_organisation_id`. Kommentaren i `supabaseApi.ts` beskriver en tidligere bug, hvor en tag manglede i listen og gav forkert rolle indtil F5.

---

## Flow 5 – Rettigheder: admin giver en rolle et privilegie, brugeren får adgang

1. Admin åbner Administration → "Roller & privilegier" (`PrivilegeMatrix`).
2. `cellLockState` afgør om cellen må ændres (spejler triggerne).
3. Klik → `createPrivilege({ roleId, name: 'read_statistics' })` → `POST privileges` → RLS: rolle i aktiv org ∧ `update_roles` ∧ ikke `admin` (medmindre Admin-rollen) → triggere (`prevent_default_role_privilege_change` blokerer Medlem).
4. Invaliderer `Privilege` **i admins klient**.
5. **Hos brugeren med rollen:** intet sker før deres `getMyPrivileges` refetches (ved næste login/org-skift/token-refresh, eller når en mutation invaliderer `Privilege`). Der er ingen realtime på privilegier.
6. Når den er hentet: `useNavItems` viser "Statistik", og `get_statistics` tillader adgangen (RLS/RPC tjekker hver gang, uanset klientens cache).

**Pointe for nye udviklere:** UI-adgang og reel adgang kan midlertidigt være ude af sync – databasen er altid den rigtige.

---

## Flow 6 – Datalager: opret vare med enheder
Se `04-kode/04-datalayer.md` §7 (sekvensdiagram). Kort: `AddItemsComponent` → `addItems` (løkke) → `rpc add_item_with_units` → item + N enheder i én transaktion → historik-trigger pr. enhed → invalidering af `Item/LIST` → `getCategoryTree` + `getUnitLocationCounts` refetches → `DataLayerPage` genberegner placeringer/chips.

---

## Flow 7 – Opret opgave med materialer (reservation)

```mermaid
sequenceDiagram
  actor L as Leder (create_tasks + update_tasks)
  participant CM as CreateTaskModal
  participant TP as TaskItemPicker
  participant API as taskApi / categoryApi
  participant DB as Postgres
  L->>TP: vælg vare (søg i kategoritræ), lager, mængde
  TP->>CM: onStage(material) – kun lokalt (opgaven findes ikke endnu)
  L->>CM: "Opret"
  CM->>API: createTask(...) .unwrap()
  API->>DB: insert tasks (RLS: create_tasks ∧ rum-adgang)
  DB->>DB: triggere: statushistorik + notifikation til favorit-rum-brugere
  CM->>CM: husk createdTaskId
  loop pr. staged materiale
    CM->>API: reserveItemUnits({ taskId, itemId, quantity, locationId })
    API->>DB: rpc reserve_item_units → task_materials + split + Reserved + task_material_units
  end
  CM->>CM: onClose() + invalidering → tavle og datalager opdateres
```
**Fejlsti:** "ikke nok ledigt" på materiale 2 → opgaven og materiale 1 består; listen viser kun de resterende; nyt klik genbruger `createdTaskId`. Har brugeren `create_tasks` men ikke `update_tasks`, oprettes opgaven, men alle reservationer fejler.

---

## Flow 8 – Opgavens livscyklus: tilmeld → påbegynd → meld færdig → godkend

1. **Tilmeld:** `assignToTask` → `insert task_assignees` (RLS: selv eller `assign_tasks`) → `trg_set_task_assignee_assigned_by`, `trg_notify_task_assigned`, `trg_sync_task_conversation` (opgave-chat ved 2+ tilmeldte).
2. **Påbegynd:** `updateTaskStatus('InProgress')` → `set_task_status` → `Reserved → InUse`.
3. **Undervejs:** `changeTaskMaterialStatus` (fx 1 stk. `InUse → Damaged`).
4. **Meld færdig:** materialer uafrapporteret → `ResolveTaskMaterialsModal` → udfald → `requires_approval`?
   - **Ja:** `createTaskRequest({ materialOutcomes })` (gemmes som data).
   - **Nej:** `resolveTaskMaterialUnits` pr. linje → `updateTaskStatus('Completed')`.
5. **Godkend:** godkender (`TaskApprovalsPanel`) → `approve_task_request` → udfald anvendes → `Completed` → notifikation → chat lukkes/arkiveres efter brugernes valg.
6. **Afvis:** `reject_task_request(reason)` → notifikation med begrundelse → opgaven forbliver `InProgress`, materialer urørte.

Fuldt sekvensdiagram: `04-kode/05-opgaver.md` §7. **Kendte huller:** `set_task_status` tjekker ikke `requires_approval`; fejl i `TaskCard` vises ikke.

---

## Flow 9 – Realtime-besked og notifikation
Se `04-kode/06-beskeder-notifikationer.md` §6. Kort: `insert messages` → `trg_notify_new_message` → (evt. droppet af `trg_skip_muted_notification`) → Realtime sender `INSERT messages` til åbne samtaler og `INSERT notifications` til modtagerens klokke → klokken invaliderer `Message/<id>` og `Conversation` → `markConversationRead` → afsenderens "Set"-status opdateres via realtime på `conversation_participants`.

---

## Flow 10 – Statistik: vælg periode → beregn → gem snapshot

```mermaid
sequenceDiagram
  actor U as Bruger (read_statistics)
  participant P as StatisticsPage
  participant H as useStatisticsPeriod
  participant API as statisticApi
  participant DB as Postgres
  U->>P: vælg "Kvartal Q3 2025" + rum
  P->>H: ?periode=kvartal&kvartal=3&aar=2025&rum=:id
  H-->>P: start (lokal midnat), end (eksklusiv), granularity=week, tz
  P->>API: getStatistics(args) (skip hvis ingen org/privilegie/anden fane)
  API->>DB: rpc get_statistics → guards → statistics_payload(...)
  DB-->>API: jsonb (KPI'er, trend, serier, fordelinger, "lige nu")
  API-->>P: currentData → buildInsights, kpiTrend, diagrammer
  U->>P: fanen Snapshots → "Gem snapshot" (create_statistics)
  P->>API: saveStatisticsSnapshot({start, end, label, tz, granularity})
  API->>DB: rpc save_statistics_snapshot → statistics_snapshots + statistics_values (fladt, navne frosset)
  Note over P: refetchOnFocus: tal genberegnes, når brugeren vender tilbage til fanen
```
**Pointe:** Tallene er ens for alle med `read_statistics`, uafhængigt af opgave-RLS, og kan verificeres mod `docs/seed/FACIT.md`.
