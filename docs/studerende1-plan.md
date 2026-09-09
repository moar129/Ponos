# Studerende 1 – Fremgangsplan (Adgang, Organisation & Overblik)

Dette er den løbende statusoversigt for de 24 user stories, som Studerende 1 er ansvarlig for (jf. `userStories.md`, afsnit 13 "Arbejdsfordeling"). Filen opdateres efter hver færdig story, så en ny samtale/session altid kan se, hvor langt vi er, og hvad næste skridt er.

## Næste op

**US-59 – Være medlem af flere organisationer**

US-58 er nu Done (se status-tabel). Stor migration: erstatter `profiles.organisation_id`/`role_id` med en medlemskabsmodel (many-to-many) + "aktiv organisation"-koncept. Fuld spec er nu skrevet på forhånd, se "US-59-spec" nedenfor - en session kan gå direkte i gang uden at skulle genudlede noget. Beslutninger taget (2026-09-09, se spec for detaljer): `profiles.organisation_id` omdøbes til `active_organisation_id`; org-vælger UI lægges som ny fane på `/organisation`; denne omgang dækker KUN US-59 (se organisationer, skifte aktiv, blive medlem af flere via accepteret anmodning) - US-60 (opret flere organisationer) og US-61 (forlad organisation) er bevidst udskudt til lige efter (se "Anbefalet rækkefølge"), men databasedesignet understøtter dem uden yderligere migration.

Fase 1 af granulære privilegier (US-11/12/13 + US-10) er implementeret, manuelt testet i browseren og bekræftet virkende (se status-tabellen). Fase 2 (US-62/US-63) er bevidst udskudt til efter Dashboard-trinnet — fuld implementeringsspec ligger klar i afsnittet "Fase 2-spec" længere nede, så en session (evt. på en anden computer) kan gå direkte i gang uden at skulle genudlede noget.

(US-58, US-59, US-60 og US-61 blev tilføjet ad-hoc efter forespørgsel, uden for den planlagte rækkefølge - se noter nedenfor.)

## Status

| # | Story | Prioritet | Status | Note |
|---|---|---|---|---|
| US-01 | Opret konto | Critical | Done | SignUp.tsx + DB trigger komplet |
| US-02 | Login | Critical | Delvist | Login/redirect virker; banner viser nu "ingen organisation" + link til anmodning; `/`-ruten er stadig ikke beskyttet |
| US-58 | Opret organisation | Critical | Done | `create_organisation`-RPC (`dbSchema.sql` §15.7-15.8) + case-insensitivt unikt navn (`organisations_name_unique`) kørt og testet i Supabase; opret-formular på `/organisation`, slået sammen med US-05's anmod-flow i samme UI (faner) |
| US-03 | Se profil | Medium | Done | `/bruger` (ProfilePage.tsx) + profileApi.ts; header viser nu rigtigt navn/rolle |
| US-04 | Rediger profil | Medium | Done | Rediger navn, beskrivelse, billed-URL; email/rolle/org er read-only |
| US-05 | Anmod om medlemskab | Critical | Done | Flyttet fra egen side (`RequestMembership.tsx`/`/request-membership`, nu slettet) ind i `OrganisationPage.tsx` som en fane ved siden af "Opret organisation"; membershipApi.ts uændret |
| US-06/07/08 | Se, acceptere og afvise medlemsanmodninger (admin) | Critical | Done | `/medlemsanmodninger` + membershipApi/privilegeApi; ny RLS-policy så admin kan se ansøgeres navn/email; adgang nu granulær via `manage_membership_requests`-privilegie (Fase 1) |
| US-09 | Se organisation | Medium | Done | `/organisation` (OrganisationPage.tsx) + organisationApi.ts |
| US-10 | Rediger organisation | Medium | Done | Kun `name` redigerbar (organisations-tabel har pt. kun denne kolonne); adgang nu granulær via `manage_organisation`-privilegie (Fase 1) |
| US-11 | Tildel rolle | High | Done | `/roller` (RolesPage.tsx) + roleApi.ts (`assignRole`); egen række er skrivebeskyttet, DB-trigger blokerer selv-tildeling; adgang nu granulær via `manage_roles`, med escalation-guard mod at give admin-rolle væk uden selv at være admin (Fase 1) |
| US-12 | Opret rolle | Medium | Done | roleApi.ts (`createRole`); udvidet med `updateRole`/`deleteRole` (fuld CRUD, ikke krævet af story men RLS var allerede klar), UI på `/roller`; adgang nu granulær via `manage_roles` (Fase 1) |
| US-13 | Opret privilege | Medium | Done | privilegeApi.ts udvidet (`getOrganisationPrivileges`, `createPrivilege`, `updatePrivilege`, `deletePrivilege` - fuld CRUD), UI på `/roller`; adgang nu granulær via `manage_roles`, med escalation-guard mod at oprette/omdøbe et privilegie til `admin` uden selv at være admin (Fase 1). "Tilføj privilegie" er en dropdown af kendte privilegier (`KNOWN_PRIVILEGES`/`privilegeLabel` i privilegeApi.ts) + "Andet"-fritekst, i stedet for rent fritekstfelt — undgår tastefejl på de bogstavelige RLS-privilegienavne |
| US-62 | Granulære skriverettigheder i Datalayer | Medium | Mangler | Tilhører nu Studerende 1 (ikke Studerende 2); bevidst udskudt til efter US-59/60/61/Dashboard (trin 8) - fuld spec klar, se "Fase 2-spec" nedenfor |
| US-63 | Granulære skriverettigheder i Opgaver | Medium | Mangler | Tilhører nu Studerende 1 (ikke Studerende 3); bevidst udskudt til efter US-59/60/61/Dashboard (trin 8) - fuld spec klar, se "Fase 2-spec" nedenfor |
| US-45 | Se dashboard | Critical | Mangler | Nuværende Dashboard.tsx er eksplicit en placeholder |
| US-46 | Se antal items | High | Mangler | Data findes via dataLayerApi, ikke vist noget sted |
| US-47 | Se antal opgaver | High | Mangler | Data findes via taskSlices, intet total-count, ingen auto-opdatering |
| US-56 | Se nyheder | Low | Mangler | `news`-tabel + RLS findes; 0% frontend |
| US-57 | Hent nyheder fra ekstern API | Low | Mangler | Kun DB-scaffold; intet API-kald nogen steder i repoet |
| US-59 | Være medlem af flere organisationer | High | Mangler | Kræver ny medlemskabsmodel (many-to-many) + "aktiv organisation"-koncept; erstatter `profiles.organisation_id`/`role_id` og rammer stort set alle RLS-policies. Ikke startet. |
| US-60 | Oprette flere organisationer | Medium | Mangler | Afhænger af US-59's medlemskabsmodel; udvider `create_organisation`-RPC'en (US-58) til ikke at blokere når brugeren allerede er medlem et sted. |
| US-61 | Forlade en organisation | Medium | Mangler | Afhænger af US-59; kræver tjek for "sidste admin" før forladelse tillades. |

## Anbefalet rækkefølge

1. ~~**US-03 + US-04** — Profile view/edit~~ ✅
2. ~~**US-06/07/08** — Admin: se + acceptere/afvise medlemsanmodninger~~ ✅
3. ~~**US-09 + US-10** — Se/rediger organisation~~ ✅
4. ~~**US-11 + US-12 + US-13** — Roller & privileges (Fase 1: granulære privilegier)~~ ✅
5. **US-59** — Være medlem af flere organisationer (stor migration: erstatter `profiles.organisation_id`/`role_id` med en medlemskabsmodel + "aktiv organisation"-koncept). Gøres efter Fase 1, så rolle/privilege-UI'en bygges og testes på den simple model først i stedet for at skulle tilpasses midt i migrationen
6. **US-60 + US-61** — Oprette flere organisationer / Forlade en organisation (bygger direkte på US-59's medlemskabsmodel, gøres derfor lige efter)
7. **US-45 + US-46 + US-47** — Rigtigt dashboard (genbruger data-mønstre fra Datalayer/opgaver; bygges efter US-59 så den fra start regner med "aktiv organisation" i stedet for at skulle rettes til bagefter)
8. **US-62 + US-63** — Granulære skriverettigheder i Datalayer/Opgaver (Fase 2, samme mønster som US-11-13 - tilhører Studerende 1, ikke Studerende 2/3). Bevidst rykket til her, EFTER US-59/60/61: undgår at RLS-policies på Datalayer/Opgave-tabellerne skal rettes til igen når US-59 ændrer medlemskabsmodellen, og reducerer risikoen for at kollidere med Studerende 2/3's igangværende arbejde i de tabeller/komponenter. Fuld spec: se "Fase 2-spec" nedenfor.
9. ~~**US-02 polish** — vis "ingen organisation"-tilstand i UI~~ ✅ (banner med link til `/organisation`, som nu rummer både opret- og anmod-flow)
10. **US-56 + US-57** — Nyheder (lavest prioritet, ingen afhængigheder — gøres sidst)

## US-59-spec — klar til udførelse ved trin 5

Skrevet på forhånd (2026-09-09), så en fremtidig session (evt. på en anden computer) kan gå direkte i gang uden at skulle genudlede noget. Dækker KUN US-59's acceptkriterier (se, blive medlem af flere, skifte aktiv organisation) - US-60/US-61 er bevidst udenfor scope her, se note i bunden.

**Kerneidé:** `profiles.organisation_id` omdøbes til `active_organisation_id` og betyder herefter "den organisation, hvis data brugeren p.t. ser" - IKKE længere "den ene organisation brugeren er medlem af". Faktisk medlemskab (many-to-many, én rolle pr. organisation) flyttes til en ny `memberships`-tabel. Fordi `auth_profile_org()` (bruges af stort set alle RLS-policies i afsnit 16) beholder samme signatur og bare læser `active_organisation_id` i stedet for `organisation_id`, skal INGEN af de eksisterende org-scopede RLS-policies (organisations, locations, categories, items, tasks, task_*, statistics_*) ændres - kun de policies/funktioner der direkte rører `role_id` eller selve medlemskabet.

**SQL - nye/ændrede DB-objekter (dbSchema.sql):**

1. Ny tabel `memberships`: `id uuid pk`, `user_id uuid references profiles(id) on delete cascade`, `organisation_id uuid references organisations(id) on delete cascade`, `role_id uuid references roles(id) on delete set null`, `created_at timestamptz default now()`. `unique (user_id, organisation_id)`, index på begge FK-kolonner.
2. Backfill (kør FØR omdøbning): `insert into memberships (user_id, organisation_id, role_id) select id, organisation_id, role_id from profiles where organisation_id is not null;`
3. `alter table profiles rename column organisation_id to active_organisation_id;`
4. Drop `profiles_role_id_fkey` + drop kolonnen `profiles.role_id` (rollen findes nu kun på `memberships`).
5. `auth_profile_org()`: eneste ændring er `select active_organisation_id from profiles ...` (kolonnenavn).
6. `has_privilege(p_name)`: join skal nu gå `profiles pr join memberships m on m.user_id = pr.id and m.organisation_id = pr.active_organisation_id join privileges p on p.role_id = m.role_id where pr.id = auth.uid() and p.name = p_name` (i stedet for `p.role_id = pr.role_id`).
7. `prevent_self_role_org_change()`: fjern role_id-grenen (kolonnen findes ikke længere på profiles), behold active_organisation_id-grenen + `ponos.bypass_self_role_org_change`-flaget uændret (genbruges af `create_organisation` og den nye `set_active_organisation` nedenfor).
8. Ny trigger på `memberships`, fx `prevent_self_membership_role_change`: blokerer at en bruger selv ændrer sit eget `role_id` i en `memberships`-række (samme escalation-tanke som den gamle profiles-trigger havde for rolle - forhindrer at man tildeler sig selv en rolle). Rammer kun UPDATE, ikke INSERT (INSERT sker udelukkende via security-definer-funktionerne nedenfor).
9. `handle_membership_request_status_change()` (kører ved Accept af en `membership_requests`-række): i stedet for `update profiles set organisation_id = new.organisation_id ...` skal den nu `insert into memberships (user_id, organisation_id) values (new.user_id, new.organisation_id) on conflict do nothing;` og derefter `update profiles set active_organisation_id = new.organisation_id where id = new.user_id and active_organisation_id is null;` (kun sæt aktiv, hvis brugeren ikke allerede har en aktiv organisation - jf. AC "påvirkes brugerens medlemskab eller rolle i de øvrige organisationer ikke").
10. `create_organisation(p_name)`: guard-tjekket `exists (select 1 from profiles where id = v_user_id and organisation_id is not null)` erstattes af `exists (select 1 from memberships where user_id = v_user_id)` (samme opførsel som i dag - blokerer stadig en 2. organisation, det er US-60's opgave at løsne). Selve tildelingen `update profiles set organisation_id = v_org.id, role_id = v_role_id` erstattes af `insert into memberships (user_id, organisation_id, role_id) values (v_user_id, v_org.id, v_role_id)` + `update profiles set active_organisation_id = v_org.id where id = v_user_id` (stadig under samme bypass-flag).
11. Ny RPC `set_active_organisation(p_organisation_id uuid)` (security definer, `grant execute ... to authenticated`): tjekker `exists (select 1 from memberships where user_id = auth.uid() and organisation_id = p_organisation_id)` (fejl hvis ikke), sætter bypass-flaget, og `update profiles set active_organisation_id = p_organisation_id where id = auth.uid()`. Klienten må ALDRIG opdatere `active_organisation_id` direkte - kun via denne funktion.
12. RLS: `drop policy "Tildel rolle til profiler i egen organisation" on profiles` (rammer ikke længere noget, role_id er væk fra profiles) og opret i stedet samme escalation-guard-mønster som ny UPDATE-policy på `memberships`: `using (organisation_id = auth_profile_org() and has_privilege_or_admin('manage_roles'))`, `with check (samme + (has_privilege('admin') or role_id is null or not exists (select 1 from privileges where role_id = memberships.role_id and name = 'admin')))`.
13. RLS på `memberships` (enable row level security + ny SELECT-policy): `using (user_id = auth.uid() or organisation_id = auth_profile_org())` - dækker både "se mine egne medlemskaber" (US-59 AC "liste over alle organisationer brugeren er medlem af") og "se medlemmer i min aktive organisation" (US-11's medlemsliste, som i dag læste `profiles`). Ingen INSERT/DELETE-policy for almindelige brugere - inserts sker kun via `create_organisation`/`handle_membership_request_status_change` (security definer, samme mønster som allerede bruges for `roles`/`privileges`), DELETE hører til US-61.

**Frontend:**

- `profileApi.ts`, `organisationApi.ts`, `roleApi.ts` (`getMyOrganisationId`-helper), `categoryApi.ts`, `taskApi.ts` (`getAuthenticatedOrganisationId`-helpere): omdøb `.select('organisation_id')`/feltnavn fra `profiles` til `active_organisation_id` alle steder.
- `profileApi.ts` `getMyProfile`: rolle-navn kan ikke længere slås op via `profiles.role_id` - hent i stedet brugerens `memberships`-række for `(auth.uid(), active_organisation_id)`, brug dens `role_id` til `lookupName('roles', ...)`.
- `privilegeApi.ts` `getMyPrivileges`: samme omlægning - slå `role_id` op via `memberships` (self + active org) i stedet for `profiles.role_id`, derefter uændret privileges-opslag.
- `roleApi.ts`: `getOrganisationMembers` skal query'e `memberships` (filtreret på aktiv org) joinet med `profiles` for navn/email, i stedet for at query'e `profiles` direkte. `assignRole` skal `update memberships set role_id = ... where user_id = X and organisation_id = activeOrgId` i stedet for `update profiles set role_id = ...`.
- Ny fil ELLER nye endpoints i `organisationApi.ts`: `getMyMemberships` (liste af `{organisationId, organisationName, roleName}` for alle brugerens medlemskaber - bruges af US-59 AC "se liste over alle organisationer") + `setActiveOrganisation`-mutation (kalder RPC'en fra punkt 11).
- Ny UI: fane "Mine organisationer" på `/organisation` (`OrganisationPage.tsx`, ved siden af de eksisterende "Opret organisation"/"Anmod om medlemskab"-faner) - viser listen fra `getMyMemberships`, fremhæver aktiv org, lader brugeren vælge en anden som aktiv.
- `supabaseApi.ts`: tilføj tag `'Membership'`. `setActiveOrganisation` skal invalidere ALLE org-scopede tags, samme liste som `authApi.ts`'s login/logout-invalidering plus datalag/opgave-tags: `'Profile', 'Privilege', 'Organisation', 'Role', 'Membership', 'MembershipRequest', 'PendingRequest', 'Category', 'Item', 'ItemLocation', 'Task', 'TaskRoom', 'MyTasks'`.
- Typer: `profileType.ts` (`organisationId`→`activeOrganisationId`), `roleType.ts` (`OrganisationMember` får nu sin `roleId` fra en membership-række, ikke en profil-række) - opdatér efter behov.
- `PendingRequestBanner.tsx`: `profile.organisationId` → `profile.activeOrganisationId` (uændret logik ellers).

**Eksplicit UDENFOR scope her (hører til US-60/US-61, næste skridt jf. "Anbefalet rækkefølge"):** at løsne `create_organisation`s blokering af en 2. organisation (US-60), og at forlade en organisation - DELETE-policy på `memberships` + "sidste admin"-tjek + genvalg af aktiv org (US-61). Skemaet ovenfor (`memberships`-tabellen, bypass-flag-mønsteret) er lagt til rette så de kan bygges ovenpå uden endnu en migration.

**Efter SQL er kørt af bruger og bekræftet:** opdatér `dbSchema.sql` og status-tabellens US-59-række til "Done".

## Fase 2-spec (US-62 + US-63) — klar til udførelse ved trin 8

Skrevet på forhånd, så en fremtidig session (evt. på en anden computer) kan gå direkte i gang uden at skulle genudlede noget. Samme mønster som Fase 1 (US-11-13), oven på det allerede eksisterende `has_privilege_or_admin()` (dbSchema.sql afsnit 14) — ingen ny SQL-infrastruktur nødvendig, kun nye privilegienavne og opdaterede policies.

**Privilegienavne:**
- `manage_datalayer` (US-62 — dækker `locations` + `data_layer_categories` + `data_layer_items` samlet, ligesom `manage_roles` dækker US-11+12+13 samlet)
- `manage_tasks` (US-63 — dækker `tasks` + `task_assignees` + `task_participants` + `task_materials` samlet)

**SQL (dbSchema.sql afsnit 16.6 og 16.7):** De nuværende policies dér er `for all` (select+insert+update+delete i én policy) og tjekker kun `organisation_id = auth_profile_org()` — ingen skelnen mellem læse- og skriveadgang. Der findes desuden allerede separate, åbne SELECT-policies for hver tabel (fx "Se lokationer i egen organisation") — de skal IKKE ændres, læseadgang forbliver åben for alle organisationsmedlemmer. For hver af de 7 `for all`-policies (lokationer, kategorier, items, tasks, task_assignees, task_participants, task_materials): `drop policy` + `create policy` med samme navn/struktur, men tilføj `and public.has_privilege_or_admin('manage_datalayer')` (Datalayer-tabellerne) hhv. `and public.has_privilege_or_admin('manage_tasks')` (Opgave-tabellerne) til både `using` og `with check`. Ingen escalation-guard nødvendig her (modsat Fase 1) — der er ingen vej til at eskalere til admin via Datalayer/Opgave-data.

**Frontend:**
- `privilegeApi.ts`: tilføj `MANAGE_DATALAYER_PRIVILEGE = 'manage_datalayer'` og `MANAGE_TASKS_PRIVILEGE = 'manage_tasks'`-konstanter (samme mønster som de tre eksisterende fra Fase 1).
- Gate opret/rediger/slet-knapper i Datalayer- og Opgave-UI'en med `useHasPrivilege(MANAGE_DATALAYER_PRIVILEGE)` hhv. `useHasPrivilege(MANAGE_TASKS_PRIVILEGE)`.
- **VIGTIGT:** check `src/pages/`s aktuelle Datalayer-/Tasks-mapper og de tilsvarende API-filer først — de tilhører Studerende 2/3 og kan se helt anderledes ud end nu, da US-14 til US-44 slet ikke var startet, da denne spec blev skrevet (jf. status i `userStories.md`).
- 42501-fejlbesked-mapping i de relevante mutations, samme mønster som `roleApi.ts`/`privilegeApi.ts` fra Fase 1.

**Efter SQL er kørt af bruger og bekræftet:** opdatér `dbSchema.sql` (som med Fase 1) og status-tabellens US-62/US-63-rækker til "Done".

## Konventioner

- Kode (variabelnavne, funktionsnavne, kommentarer) skrives på engelsk.
- UI-tekst til brugeren (labels, knapper, fejlbeskeder) forbliver på dansk.
- Denne fil og øvrig `docs/`-dokumentation forbliver på dansk.
- Git commits laves af brugeren selv.
- DB-ændringer køres manuelt af brugeren og skal derfor have sql kode til at kunne bruges i Supabase SQL Editor. `dbSchema.sql` opdateres bagefter som dokumentation.
- `supabaseTables.sql` er et genereret dump af de faktiske tabeller. Det indeholder **ikke** indexes, tabel-niveau constraints, triggers, RLS-policies eller funktioner - fraværet af noget dér beviser derfor ikke, at det mangler i databasen.

## Sådan bruges filen

Efter hver færdig story: opdater status-tabellen og "Næste op"-linjen øverst.

