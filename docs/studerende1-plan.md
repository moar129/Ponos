# Studerende 1 – Fremgangsplan (Adgang, Organisation & Overblik)

Dette er den løbende statusoversigt for de 24 user stories, som Studerende 1 er ansvarlig for (jf. `userStories.md`, afsnit 13 "Arbejdsfordeling"). Filen opdateres efter hver færdig story, så en ny samtale/session altid kan se, hvor langt vi er, og hvad næste skridt er.

## Næste op

**US-59 – Være medlem af flere organisationer**

Se "Anbefalet rækkefølge" nedenfor. Fase 1 af granulære privilegier (US-11/12/13 + US-10) er implementeret og færdig (se status-tabellen). Fase 2 (US-62/US-63) er bevidst udskudt til efter Dashboard-trinnet — fuld implementeringsspec ligger klar i afsnittet "Fase 2-spec" længere nede, så en session (evt. på en anden computer) kan gå direkte i gang uden at skulle genudlede noget.

Mangler desuden: manuel test i browseren af de allerede implementerede Fase 1-adgangsregler (fx en bruger med kun `manage_roles` der ikke kan give admin-rollen væk).

(US-58, US-59, US-60 og US-61 blev tilføjet ad-hoc efter forespørgsel, uden for den planlagte rækkefølge - se noter nedenfor.)

## Status

| # | Story | Prioritet | Status | Note |
|---|---|---|---|---|
| US-01 | Opret konto | Critical | Done | SignUp.tsx + DB trigger komplet |
| US-02 | Login | Critical | Delvist | Login/redirect virker; banner viser nu "ingen organisation" + link til anmodning; `/`-ruten er stadig ikke beskyttet |
| US-58 | Opret organisation | Critical | Delvist | Types (`organisationType.ts`) + RTK Query-mutation (`organisationApi.ts`, `createOrganisation`) klar; mangler `create_organisation`-RPC i Supabase, opret-formular på `/organisation` og opdatering af `dbSchema.sql` |
| US-03 | Se profil | Medium | Done | `/bruger` (ProfilePage.tsx) + profileApi.ts; header viser nu rigtigt navn/rolle |
| US-04 | Rediger profil | Medium | Done | Rediger navn, beskrivelse, billed-URL; email/rolle/org er read-only |
| US-05 | Anmod om medlemskab | Critical | Done | RequestMembership.tsx + membershipApi.ts komplet |
| US-06/07/08 | Se, acceptere og afvise medlemsanmodninger (admin) | Critical | Done | `/medlemsanmodninger` + membershipApi/privilegeApi; ny RLS-policy så admin kan se ansøgeres navn/email; adgang nu granulær via `manage_membership_requests`-privilegie (Fase 1) |
| US-09 | Se organisation | Medium | Done | `/organisation` (OrganisationPage.tsx) + organisationApi.ts |
| US-10 | Rediger organisation | Medium | Done | Kun `name` redigerbar (organisations-tabel har pt. kun denne kolonne); adgang nu granulær via `manage_organisation`-privilegie (Fase 1) |
| US-11 | Tildel rolle | High | Done | `/roller` (RolesPage.tsx) + roleApi.ts (`assignRole`); egen række er skrivebeskyttet, DB-trigger blokerer selv-tildeling; adgang nu granulær via `manage_roles`, med escalation-guard mod at give admin-rolle væk uden selv at være admin (Fase 1) |
| US-12 | Opret rolle | Medium | Done | roleApi.ts (`createRole`); udvidet med `updateRole`/`deleteRole` (fuld CRUD, ikke krævet af story men RLS var allerede klar), UI på `/roller`; adgang nu granulær via `manage_roles` (Fase 1) |
| US-13 | Opret privilege | Medium | Done | privilegeApi.ts udvidet (`getOrganisationPrivileges`, `createPrivilege`, `updatePrivilege`, `deletePrivilege` - fuld CRUD), UI på `/roller`; adgang nu granulær via `manage_roles`, med escalation-guard mod at oprette/omdøbe et privilegie til `admin` uden selv at være admin (Fase 1) |
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
9. ~~**US-02 polish** — vis "ingen organisation"-tilstand i UI~~ ✅ (banner med link til `/request-membership`)
10. **US-56 + US-57** — Nyheder (lavest prioritet, ingen afhængigheder — gøres sidst)

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

