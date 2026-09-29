# Statistik – plan og status

Progress-tracker for statistiksiden (US-48–54). Afløser `Stat HandmeOff.txt`. Oprindeligt
bygget af Rasmus (Studerende 3) på branch `Statistic`; overtaget af Jens 2026-09-29.

## Næste op

1. Test de øvrige perioder mod tabellen "Statistiksiden pr. periode" i `docs/seed/FACIT.md`.
2. Test som ikke-admin: `sofie.andersen` (kun `read_statistics`) og en frivillig (ingen adgang).
   Kræver at seedet er kørt igen efter 2026-09-29 (roller fik statistik-privilegier).
3. Dark mode + responsive (mobil, laptop, 1920, 2560).

## Arkitektur

- Al beregning sker server-side i `statistics_payload` (intern, SECURITY DEFINER, ingen
  klientadgang). `get_statistics(p_start, p_end, p_granularity, p_tz)` er klientens indgang
  og kræver `read_statistics`. Resultatet indeholder kun aggregater – ingen rækker eller navne.
- Derfor ser alle med `read_statistics` de samme tal, uanset tasks-RLS (`view_completed_tasks`,
  rolle-låste rum) og PostgREST's loft på 1000 rækker.
- Periode: klienten sender lokal midnat som ISO-tidspunkt, `p_end` eksklusiv (dagen efter),
  og browserens tidszone (bruges til bucket-grænser). null/null = "Alt".
- Granularitet (`useStatisticsPeriod`): 1 dag → time, ≤31 → dag, ≤91 → uge, ellers måned.
- Snapshots (US-52/54): `save_statistics_snapshot` gemmer payloaden fladt i `statistics_values`
  som `tasks_created`, `task_status:Completed`, `room:<navn>` … Navne fryses. Ingen
  update-policy, så snapshots er uændrelige. Sletning kræver `delete_statistics`.
- Privilegier: `read_statistics` / `create_statistics` / `delete_statistics`. Ingen backfill –
  kun admin som standard.
- RTK: `statisticApi.ts` (`getStatistics`, `getStatisticsSnapshots`, save/delete). Tags
  `Statistics`/`StatisticsSnapshot` ligger i `USER_SCOPED_TAGS` (nulstilles ved org-skift og login).

## Definitioner

| Tal | Definition |
|---|---|
| Oprettede | `created_at` i perioden |
| Færdige | Completed og `finished_at` i perioden |
| I gang | `coalesce(start_date, created_at)` < slut og (InProgress eller Completed med `finished_at` ≥ start). Der findes intet `started_at` – `start_date` (planlagt) er en tilnærmelse |
| Forfaldne | ikke Completed, `end_date` < nu og i perioden |
| Medlemmer | `memberships` i org'en (uafhængig af periode) |
| Med opgaveaktivitet | medlemmer tildelt ≥ 1 *relevant* opgave (oprettet eller i gang i perioden) |
| Opgaver pr. medlem | anonym fordeling 0 / 1–3 / 4–6 / 7+ relevante opgaver. Ingen navne eller rangering |
| Status / prioritet / rum / mest brugte | opgaver oprettet i perioden |
| Godkendelser | `task_requests` med `requested_at` i perioden (anmodninger, ikke opgaver). Rate = godkendt/(godkendt+afvist). Median behandlingstid = `done_at − requested_at` |
| Enheder pr. status | antal enhedsrækker nu (ikke summeret mængde – den blander stk/kg/m) |
| Varer pr. kategori | varer pr. hovedkategori nu |

## Status

| Del | Status |
|---|---|
| Migration (RPC'er, policies, `label`) | Kørt 2026-09-29, i `dbSchema.sql` §12/§15.26/§16.8, fil slettet |
| `statisticApi.ts` omskrevet til RPC | Færdig |
| `useStatisticsPeriod` (lokal tid, eksklusiv slut, granularitet) | Færdig |
| UI: KPI'er, udvikling (0-fyldt), status, prioritet, rum, belastning, godkendelser, materialer | Færdig |
| Snapshots: gem, sammenlign, slet | Færdig |
| Adgang: header, mobil-nav, Oversigt-link, "ingen adgang"-side | Færdig |
| i18n (`statistics`-namespace, 14 sprog) | Færdig. De 12 maskinoversatte sprog er ikke korrekturlæst |
| Seed: statistik-privilegier på roller, cleanup af snapshots, FACIT pr. periode | Færdig |
| Browser-verifikation mod FACIT | Admin, "Alt" + snapshot: OK 2026-09-29. Medlemmer = 23 (FACIT 22) pga. ét ekstra, ikke-seedet medlem med 0 opgaver – ikke en fejl. Mangler: øvrige perioder, ikke-admin, dark mode, responsive |

## Verifikation

- SQL Editor (som postgres): `select public.statistics_payload('<org>', null, null, 'month', 'Europe/Copenhagen');`
  skal matche FACIT: status 10/11/49, prioritet 7/19/29/15, requests 5/28/6 (82,4 %),
  members 22, aktive 18, 837 enhedsrækker, månedstabellen.
- Browser: hver periodeknap skal matche tabellen "Statistiksiden pr. periode" i FACIT.md.
  91 dage = uge-buckets, dage uden aktivitet vises som 0.
- Log ind som `sofie.andersen@ponos-mock.test` (kun `read_statistics`): samme tal som admin.
- Log ind som en frivillig: intet Statistik-link, siden viser "ingen adgang", RPC afvist (42501).
- Tom org: ingen NaN/undefined, empty states. Org-skift på siden: tallene skifter uden F5.
- Light/dark, org-farve slår igennem i graferne, mobil/laptop/1920/2560.
- Snapshot: gem → vises og kan sammenlignes → slet. Direkte `insert`/`update` fra klienten afvises.

## Senere

- **US-55 – Filtrer statistik**: fx filter på rum/kategori. RPC'en kan udvides med
  valgfrie parametre (`p_room_id`, `p_category_id`) uden at bryde nuværende kald.
- **US-80 – Eksportér statistik** (CSV af snapshot-sammenligning).
- KPI-trend ("vs. forrige periode"): kræver et ekstra kald med den foregående periode.
