# Studerende 1 – Fremgangsplan (Adgang, Organisation & Overblik)

Dette er den løbende statusoversigt for de 18 user stories, som Studerende 1 er ansvarlig for (jf. `userStories.md`, afsnit 13 "Arbejdsfordeling"). Filen opdateres efter hver færdig story, så en ny samtale/session altid kan se, hvor langt vi er, og hvad næste skridt er.

## Næste op

**US-09 + US-10 – Se og rediger organisation**

## Status

| # | Story | Prioritet | Status | Note |
|---|---|---|---|---|
| US-01 | Opret konto | Critical | Done | SignUp.tsx + DB trigger komplet |
| US-02 | Login | Critical | Delvist | Login/redirect virker; banner viser nu "ingen organisation" + link til anmodning; `/`-ruten er stadig ikke beskyttet |
| US-03 | Se profil | Medium | Done | `/bruger` (ProfilePage.tsx) + profileApi.ts; header viser nu rigtigt navn/rolle |
| US-04 | Rediger profil | Medium | Done | Rediger navn, beskrivelse, billed-URL; email/rolle/org er read-only |
| US-05 | Anmod om medlemskab | Critical | Done | RequestMembership.tsx + membershipApi.ts komplet |
| US-06/07/08 | Se, acceptere og afvise medlemsanmodninger (admin) | Critical | Done | `/medlemsanmodninger` (kun admin) + membershipApi/privilegeApi; ny RLS-policy så admin kan se ansøgeres navn/email |
| US-09 | Se organisation | Medium | Mangler | RLS klar, ingen side/API |
| US-10 | Rediger organisation | Medium | Mangler | RLS klar; `organisations`-tabel har kun `name`-kolonne |
| US-11 | Tildel rolle | High | Mangler | RLS + selv-ændrings-trigger klar, ingen UI/API |
| US-12 | Opret rolle | Medium | Mangler | RLS + unique constraint klar, ingen UI/API |
| US-13 | Opret privilege | Medium | Mangler | RLS klar, ingen UI/API |
| US-45 | Se dashboard | Critical | Mangler | Nuværende Dashboard.tsx er eksplicit en placeholder |
| US-46 | Se antal items | High | Mangler | Data findes via dataLayerApi, ikke vist noget sted |
| US-47 | Se antal opgaver | High | Mangler | Data findes via taskSlices, intet total-count, ingen auto-opdatering |
| US-56 | Se nyheder | Low | Mangler | `news`-tabel + RLS findes; 0% frontend |
| US-57 | Hent nyheder fra ekstern API | Low | Mangler | Kun DB-scaffold; intet API-kald nogen steder i repoet |

## Anbefalet rækkefølge

1. ~~**US-03 + US-04** — Profile view/edit~~ ✅
2. ~~**US-06/07/08** — Admin: se + acceptere/afvise medlemsanmodninger~~ ✅
3. **US-09 + US-10** — Se/rediger organisation
4. **US-11 + US-12 + US-13** — Roller & privileges (bygger på org-konteksten fra US-09/10, og kræver medlemmer at tildele roller til). `privilegeApi.ts` + tagType `Privilege` er allerede lagt ind og kan genbruges
5. **US-45 + US-46 + US-47** — Rigtigt dashboard (genbruger data-mønstre fra Datalayer/opgaver)
6. ~~**US-02 polish** — vis "ingen organisation"-tilstand i UI~~ ✅ (banner med link til `/request-membership`)
7. **US-56 + US-57** — Nyheder (lavest prioritet, ingen afhængigheder — gøres sidst)

## Konventioner

- Kode (variabelnavne, funktionsnavne, kommentarer) skrives på engelsk.
- UI-tekst til brugeren (labels, knapper, fejlbeskeder) forbliver på dansk.
- Denne fil og øvrig `docs/`-dokumentation forbliver på dansk.
- Git commits laves af brugeren selv.
- DB-ændringer køres manuelt af brugeren i Supabase SQL Editor. `dbSchema.sql` opdateres bagefter som dokumentation.
- `supabaseTables.sql` er et genereret dump af de faktiske tabeller. Det indeholder **ikke** indexes, tabel-niveau constraints, triggers, RLS-policies eller funktioner - fraværet af noget dér beviser derfor ikke, at det mangler i databasen.

## Sådan bruges filen

Efter hver færdig story: opdater status-tabellen og "Næste op"-linjen øverst.
