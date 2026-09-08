# Studerende 1 – Fremgangsplan (Adgang, Organisation & Overblik)

Dette er den løbende statusoversigt for de 22 user stories, som Studerende 1 er ansvarlig for (jf. `userStories.md`, afsnit 13 "Arbejdsfordeling"). Filen opdateres efter hver færdig story, så en ny samtale/session altid kan se, hvor langt vi er, og hvad næste skridt er.

## Næste op

**US-59 – Være medlem af flere organisationer**

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
| US-06/07/08 | Se, acceptere og afvise medlemsanmodninger (admin) | Critical | Done | `/medlemsanmodninger` (kun admin) + membershipApi/privilegeApi; ny RLS-policy så admin kan se ansøgeres navn/email |
| US-09 | Se organisation | Medium | Done | `/organisation` (OrganisationPage.tsx) + organisationApi.ts |
| US-10 | Rediger organisation | Medium | Done | Kun `name` redigerbar (organisations-tabel har pt. kun denne kolonne) |
| US-11 | Tildel rolle | High | Done | `/roller` (RolesPage.tsx, kun admin) + roleApi.ts (`assignRole`); egen række er skrivebeskyttet, DB-trigger blokerer selv-tildeling |
| US-12 | Opret rolle | Medium | Done | roleApi.ts (`createRole`), UI på `/roller` |
| US-13 | Opret privilege | Medium | Done | privilegeApi.ts udvidet (`getOrganisationPrivileges`, `createPrivilege`), UI på `/roller` |
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
4. ~~**US-11 + US-12 + US-13** — Roller & privileges~~ ✅
5. **US-59** — Være medlem af flere organisationer (stor migration: erstatter `profiles.organisation_id`/`role_id` med en medlemskabsmodel + "aktiv organisation"-koncept). Gøres efter US-11-13, så rolle/privilege-UI'en bygges og testes på den simple model først i stedet for at skulle tilpasses midt i migrationen
6. **US-60 + US-61** — Oprette flere organisationer / Forlade en organisation (bygger direkte på US-59's medlemskabsmodel, gøres derfor lige efter)
7. **US-45 + US-46 + US-47** — Rigtigt dashboard (genbruger data-mønstre fra Datalayer/opgaver; bygges efter US-59 så den fra start regner med "aktiv organisation" i stedet for at skulle rettes til bagefter)
8. ~~**US-02 polish** — vis "ingen organisation"-tilstand i UI~~ ✅ (banner med link til `/request-membership`)
9. **US-56 + US-57** — Nyheder (lavest prioritet, ingen afhængigheder — gøres sidst)

## Konventioner

- Kode (variabelnavne, funktionsnavne, kommentarer) skrives på engelsk.
- UI-tekst til brugeren (labels, knapper, fejlbeskeder) forbliver på dansk.
- Denne fil og øvrig `docs/`-dokumentation forbliver på dansk.
- Git commits laves af brugeren selv.
- DB-ændringer køres manuelt af brugeren og skal derfor have sql kode til at kunne bruges i Supabase SQL Editor. `dbSchema.sql` opdateres bagefter som dokumentation.
- `supabaseTables.sql` er et genereret dump af de faktiske tabeller. Det indeholder **ikke** indexes, tabel-niveau constraints, triggers, RLS-policies eller funktioner - fraværet af noget dér beviser derfor ikke, at det mangler i databasen.

## Sådan bruges filen

Efter hver færdig story: opdater status-tabellen og "Næste op"-linjen øverst.
