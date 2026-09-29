# Statistik – plan og status

Progress-tracker for statistiksiden (US-48–54). Afløser `Stat HandmeOff.txt`. Oprindeligt
bygget af Rasmus (Studerende 3) på branch `Statistic`; overtaget af Jens 2026-09-29.

## Næste op

1. **Giv Studerende 2 besked** om lagerhistorikken: ny tabel `data_layer_item_unit_history` + trigger
   `trg_record_item_unit_history` på `data_layer_item_units` (`dbSchema.sql` §9b/§15.21d) – kun en tilføjelse,
   intet i datalageret er ændret.
2. Gennemgå **Visuel tjekliste** nedenfor (lys/mørk, alle skærmstørrelser).
3. Derefter: "Senere" (US-80 CSV, lager pr. lokation, medlemmer, tekst-indsigt).

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
- Tidsserie i snapshots: `development:created`/`development:completed` pr. delperiode med
  `period_start`/`period_end` sat (null = hele snapshottets periode). Opløsningen (uge/måned/kvartal)
  vælges ved gem; standard efter periodens længde (≤ 91 d uge, ≤ 366 d måned, ellers kvartal).
  Sammenligningen justeres efter kalender (juli ud for juli på tværs af år); ved blandet opløsning
  eller serier over mere end ét år vises datoer i stedet (`buildDevelopmentComparison`,
  `utils/statisticsSnapshot.ts`). Første/sidste delperiode skæres til snapshottets periode og vises
  med sine faktiske datoer i parentes; opløsningen gemmes i `statistics_snapshots.series_granularity`.
- Snapshots har egen fane (`/statistik?tab=snapshots`), adskilt fra Overbliks periodefilter. Gem-dialogen har
  sin egen periode: kalenderår (standard: sidste år), kvartal, måned, brugerdefineret eller "som visningen"
  (Overbliks periode). Tomt navn gemmes som forslaget ("2025", "Q3 2026", …); opløsningen foreslås ud fra
  periodens længde (`snapshotPeriodRange`, `defaultSnapshotGranularity`). Live-querien kører kun på Overblik.
- Sammenligning (US-54): højst 4 snapshots, kolonner ældste → nyeste; hver senere kolonne viser ændring mod
  den ældste (`+19 (+83 %)`, godkendelsesrate i procentpoint). Grupper foldes (Nøgletal åben); "Enheder pr.
  status"/"Varer pr. kategori" er markeret som status ved gem. Advarsel ved forskellige periodelængder.
  Udvikling vises som graf (én linje pr. snapshot, `--chart-series-1..4`, dataviz-referencepalette slot 1–4,
  valideret mod #FFFFFF/#1E293B – i lys tilstand er aqua/gul < 3:1, derfor legend + tooltip + "Vis som tabel").
- "Opgaver pr. rum" indeholder alle rum, også dem uden opgaver (0), så snapshots viser 0 og ikke "–".
- Privilegier: `read_statistics` / `create_statistics` / `delete_statistics`. Ingen backfill –
  kun admin som standard.
- RTK: `statisticApi.ts` (`getStatistics`, `getStatisticsSnapshots`, save/delete). Tags
  `Statistics`/`StatisticsSnapshot` ligger i `USER_SCOPED_TAGS` (nulstilles ved org-skift og login).
  `refetchOnFocus`/`refetchOnReconnect` (via `setupListeners` i `store.ts`) henter igen når man vender tilbage
  til fanen – så andre brugeres ændringer kommer med. "I dag" i `useStatisticsPeriod` opdateres ved fokus, så en
  side åben over midnat ikke viser gårsdagens rullende periode.
- **Rum-filter (US-55)**: `get_statistics(..., p_room_id)`. Alle opgave-afledte tal (KPI'er, status, prioritet,
  belastning, udvikling, godkendelser, top 5, brugte varer) filtreres; lager og varer pr. kategori er altid hele
  organisationen (markeret på kortene). "Opgaver pr. rum" skjules ved filter. Rum-listen (`rooms`) indeholder alle
  org'ens rum, også rolle-låste – `read_statistics` er betroet. Snapshots gemmes altid uden filter.
- **KPI-trend**: `previousKpis` = samme KPI'er (`statistics_kpis`) for perioden lige før af samme længde; ingen ved
  "Alt". Kortet viser `↑ 40 % fra 5 i perioden 1.–30. aug.` (forrige = 0 → absolut tal). Farve kun hvor retningen betyder noget:
  Færdige ↑ grøn / ↓ rød, Forfaldne ↓ grøn / ↑ rød; øvrige neutrale. Altid pil + tekst.

## Definitioner

| Tal | Definition |
|---|---|
| Oprettede | `created_at` i perioden |
| Færdige | Completed og `finished_at` i perioden |
| I gang | `coalesce(start_date, created_at)` < slut og (InProgress eller Completed med `finished_at` ≥ start). Der findes intet `started_at` – `start_date` (planlagt) er en tilnærmelse |
| Forfaldne | ikke Completed, `end_date` < nu og i perioden |
| Færdige til tiden | færdige i perioden med slutdato, hvor `finished_at <= end_date`. En slutdato kl. 00:00 UTC (dato uden klokkeslæt fra opgave-formularen) gælder hele dagen (`statistics_on_time`). Opgaver uden slutdato tælles ikke med; kortet viser "x af y med slutdato". Trend i procentpoint, ↑ = grøn |
| Gennemløbstid | median `finished_at − created_at` i dage for færdige i perioden. ↓ = grøn |
| Rum-oversigt | KPI-definitionerne pr. rum (oprettede, færdige, forfaldne, til tiden) – en række matcher rum-filterets tal. Alle rum, også 0; sorteres efter forfaldne. Klik = rum-filter. Snapshots: `room:` (oprettede), `room_completed:`, `room_overdue:`, `room_on_time_rate:` |
| Lige nu | nutid, følger ikke perioden og gemmes ikke. Opgaver (følger rum-filteret): åbne forfaldne pr. prioritet (Kritisk/Høj = rød), åbne opgaver uden ansvarlige. Lager (hele org): enhedsrækker med Mangler/Beskadiget/Vedligehold/Udsolgt/Skal tømmes/Skal fyldes op, varer med enheder men ingen Tilgængelig. "Underbemandet" er droppet: `max_assignees` er et loft, ikke et mål |
| Medlemmer | `memberships` i org'en (uafhængig af periode). Vises ikke som KPI – kun i snapshots (`members`) og som total i "Opgaver pr. medlem" |
| Med opgaveaktivitet | medlemmer tildelt ≥ 1 *relevant* opgave (oprettet eller i gang i perioden). KPI-kortet "Medlemmer med opgaveaktivitet" (uden total). Afviger bevidst fra handoff punkt 1 (medlemstal som KPI): KPI-rækken er "tal for den valgte periode", og medlemstallet ændrer sig aldrig med perioden (besluttet 2026-09-29) |
| Opgaver pr. medlem | anonym fordeling 0 / 1–3 / 4–6 / 7+ relevante opgaver. Ingen navne eller rangering |
| Status / prioritet / mest brugte | opgaver oprettet i perioden |
| Godkendelser | `task_requests` med `requested_at` i perioden (anmodninger, ikke opgaver). Rate = godkendt/(godkendt+afvist). Median behandlingstid = `done_at − requested_at` |
| Enheder pr. status | antal enhedsrækker (ikke summeret mængde – den blander stk/kg/m) **ved periodens slutning** (`min(slut, nu)`), fra lagerhistorikken `data_layer_item_unit_history`. Ligger tidspunktet før historikkens start: ukendt ("–"), og snapshots gemmer ingen `item_status:*` |
| Brugte varer pr. kategori | antal forskellige varer i `task_materials` på opgaver oprettet i perioden, pr. hovedkategori (erstatter `category:*` i snapshots) |
| Varer pr. kategori | varer pr. hovedkategori nu |

## Status

| Del | Status |
|---|---|
| Migration (RPC'er, policies, `label`) | Kørt 2026-09-29, i `dbSchema.sql` §12/§15.26/§16.8, fil slettet |
| `statisticApi.ts` omskrevet til RPC | Færdig |
| `useStatisticsPeriod` (lokal tid, eksklusiv slut, granularitet) | Færdig |
| UI: KPI'er, udvikling (0-fyldt), status, prioritet, rum, belastning, godkendelser, materialer | Færdig |
| Snapshots: gem, sammenlign, slet | Færdig |
| Tidsserie i snapshots (`period_start/period_end`) | Kørt + verificeret 2026-09-29 (FACIT 7/365 dage OK) |
| Delvise delperioder + rum med 0 (`series_granularity`) | Kørt + verificeret 2026-09-29 (uge/måned/kvartal-snapshots af "7 dage" OK) |
| Adgang: header, mobil-nav, Oversigt-link, "ingen adgang"-side | Færdig |
| i18n (`statistics`-namespace, 14 sprog) | Færdig. De 12 maskinoversatte sprog er ikke korrekturlæst |
| Seed: statistik-privilegier på roller, cleanup af snapshots, FACIT pr. periode | Færdig |
| Lagerhistorik + brugte varer pr. kategori | Kørt + verificeret mod FACIT 2026-09-30, i `dbSchema.sql` §9b/§15.21d/§16.6d |
| Rum-filter (US-55) + KPI-trend + refetch ved fokus | Kørt + verificeret 2026-09-30, i `dbSchema.sql` §15.26 |
| Leder-overblik: til tiden, gennemløbstid, rum-oversigt, "lige nu" | Kørt + verificeret mod FACIT 2026-09-30, i `dbSchema.sql` §15.26a–e |
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

## Handoff-tjekliste (fra `Stat HandmeOff.txt`, punkt 7–15)

| # | Punkt | Status |
|---|---|---|
| 7 | Siden bruger korrekt organisation | ✅ server-side `auth_profile_org()`; ingen org-id i frontend |
| 7 | Korrekt periode + refetch ved periodeændring | ✅ `apiArgs` i query-nøglen, `refetchOnMountOrArgChange` |
| 7 | Viser ikke gamle cachede data | ✅ `currentData` (undefined under ny periode), tags nulstilles ved org-skift |
| 7 | Loading / error / empty states | ✅ `ChartCard` (loading/error/empty/emptyMessage), `KPICard` skeleton, "ingen adgang"/"ingen org" |
| 7 | Ingen `console.log`, ubrugte imports/state | ✅ gennemgået 2026-09-29 (build + lint rene) |
| 8 | Alle perioder (Dag … Brugerdefineret) | ⏳ kode OK; browser-test mod FACIT's periodetabel mangler |
| 9 | Brugerdefineret: start/slut, slut < start afvises, begge dage inkl., granularitet | ✅ modal-validering + RPC `INVALID_PERIOD`; ⏳ browser-test |
| 10 | Organisation-isolation | ✅ alle forespørgsler filtrerer på `p_org` i SECURITY DEFINER-funktioner, RLS på snapshots/historik; ⏳ test med 2 orgs |
| 11 | Tomme datasæt (0 opgaver/materialer/godkendelser) | ✅ empty states, ingen division med 0 (BarList/ApprovalChart/TaskRoomChart/trend); ⏳ test med tom org |
| 12 | Lys/mørk | ⏳ se visuel tjekliste |
| 13 | Fjern debugging | ✅ |
| 14 | TypeScript / ESLint / build | ✅ `npm run build` + lint rene for statistik-filer (øvrige lint-fejl er i andre domæner) |
| 15 | Endelig UI-gennemgang | ⏳ se visuel tjekliste |

## Visuel tjekliste (brugeren)

Test i **lys og mørk** på **mobil (~375 px), laptop (~1366 px), 1920 og 2560**:

- **Header/faner**: "Overblik | Gem og sammenlign" scroller vandret på mobil uden at knække tekst; aktiv fane har accent-streg.
- **Periodekort**: knapperne ombrydes pænt; rum-dropdown under en tynd linje; valgt knap læsbar i begge temaer.
- **Lige nu**: 3 felter side om side fra md, ét pr. række på mobil; ikon + tal + tekst; rød ved kritiske/høje
  forfaldne, ellers gul; "Intet kræver handling" grøn; links virker.
- **KPI-række** (7 kort): 1 kolonne mobil → 2 → 3 → 4 (xl, 1920 = 4+3) → 7 (≥ 2200 px, 2560); trend-tekst
  grøn/rød kun på Færdige/Til tiden/Gennemløbstid/Forfaldne, ellers grå; ingen overlap ved lange tal.
- **Rum-oversigt**: tabel scroller vandret på mobil; rum-navne er links (klik = filter + scroll til top); forfaldne > 0
  rød; "–" ved rum uden færdige med slutdato.
- **Grafer**: opgaveudvikling (blå oprettede + orange færdige), donut, stolper – akser/labels læsbare i mørk; tooltips
  har mørk baggrund i mørk tilstand.
- **Materialer**: "Enheder pr. status" viser dato i beskrivelsen; ved filter "Hele organisationen …".
- **Tomme tilstande**: vælg en periode uden data (fx "Dag" i en tom org) → tekst, ingen tomme akser.
- **"Gem og sammenlign"-fanen**: chips ombrydes; metadata-linje læsbar; sammenligningstabel scroller vandret på mobil,
  ændring under tallet; foldbare grupper; graf med op til 4 farver + legend.
- **Modaler** (brugerdefineret periode, gem snapshot, slet): passer på mobil (scroll i gem-dialogen), fokus/escape.
- **Org-farve**: skift organisationens farve → aktive knapper følger, graferne beholder deres faste farver.

## Senere

- **US-80 – Eksportér statistik** (CSV af snapshot-sammenligning).
- **Lager pr. lokation** (valgt fra 2026-09-29, "D"): nyt kort under Materialer, "Enheder pr. lokation". Payload
  `materials.byLocation = [{locationId, name, count}]` = antal enhedsrækker pr. `data_layer_item_units.location_id`
  **ved periodens slutning** (lagerhistorikken skal så også have `location_id` – i dag kun status/item; alternativt
  kun "nu" med note som `category`). Top 10 + "Øvrige" + "Uden lokation". Hele org (ikke rum-filter). Snapshots:
  `location:<navn>`.
- **Medlemmer** (valgt fra 2026-09-29, "E"): KPI "Nye medlemmer" = `memberships.created_at` i perioden (trend ↑
  neutral); i "Lige nu": ventende medlemsanmodninger (`membership_requests.status = 'Pending'`) + invitationer, link
  til dashboardets medlemsfane. Snapshots: `members_new`. Kræver ingen nye tabeller.
- **Auto-genereret tekst-indsigt**: 2–3 sætninger øverst ("Forfaldne steg 5 → 8, flest i Nedtagning"), afledt af
  payloaden i frontend – ingen AI, ingen nye data.
- Filter på kategori (materialer) – RPC'en kan få `p_category_id` på samme måde som `p_room_id`.
