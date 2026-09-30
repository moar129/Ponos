# Statistik – plan og status

Progress-tracker for statistiksiden (US-48–54). Afløser `Stat HandmeOff.txt`. Oprindeligt
bygget af Rasmus (Studerende 3) på branch `Statistic`; overtaget af Jens 2026-09-29.

## Næste op

1. **Giv Studerende 3 besked** (hvis ikke gjort): ny tabel `task_status_history` + trigger `trg_record_task_status_history`
   på `tasks` (`dbSchema.sql` §9c/§15.21e) – kun en tilføjelse, intet i opgave-koden er ændret.
2. Ellers intet åbent – statistikken er færdig, kørt og verificeret 2026-09-30.

## Arkitektur

- Al beregning sker server-side i `statistics_payload` (intern, SECURITY DEFINER, ingen
  klientadgang). `get_statistics(p_start, p_end, p_granularity, p_tz)` er klientens indgang
  og kræver `read_statistics`. Resultatet indeholder kun aggregater – ingen rækker eller navne.
- Derfor ser alle med `read_statistics` de samme tal, uanset tasks-RLS (`view_completed_tasks`,
  rolle-låste rum) og PostgREST's loft på 1000 rækker.
- Periode: klienten sender lokal midnat som ISO-tidspunkt, `p_end` eksklusiv (dagen efter),
  og browserens tidszone (bruges til bucket-grænser). null/null = "Alt".
- Perioder følger kalenderen (`useStatisticsPeriod`): Dag = i dag, Uge = mandag–i dag, Måned = 1.–i dag, År = 1. jan–i dag,
  Kvartal = valgt kalenderkvartal (dropdown Q1–Q4 + år, 10 år bagud; igangværende kun til i dag; ikke-begyndte kan ikke vælges),
  Alt, Brugerdefineret. Standard: Måned. Adressen: `?periode=dag|uge|maaned|aar|kvartal|alt|egen`, kvartal med `&kvartal=3&aar=2025`
  (`aar` udeladt = i år); ukendte værdier (fx gamle `7d`) → standard. KPI-trend sammenligner stadig med samme antal dage lige
  før (server) – kortet viser den faktiske forrige periode.
- Granularitet: 1 dag → time, ≤31 → dag, ≤92 → uge (et kvartal har op til 92 dage), ellers måned.
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
| Nye medlemmer | `memberships.created_at` i perioden – kun nuværende medlemmer (udmeldte slettes og kan ikke tælles). Hele org (ikke rum-filter; kortet noterer det ved filter). Neutral trend. Snapshots: `members_new` |
| Medlemskab (lige nu) | `membership_requests` + `membership_invitations` med status Pending, hele org. Link til `/dashboard?tab=administration` |
| Opsummering | højst 3 regel-baserede sætninger (ingen AI) fra payloaden, vigtigste først: forfaldne ±≥ 2 (90/60), til tiden ±≥ 10 pp (80/50), rum med flest forfaldne ≥ 2 (75), gennemløbstid ±≥ 25 % (70/40), backlog vokser/skrumper (forskel ≥ 5 og ≥ 1,5×; 65/45), rum med lavest til tiden < 70 % (≥ 3 med slutdato; 55), afviste færdigmeldinger ≥ 25 % (≥ 4 afgjort; 50), enheder ude af drift ≥ 10 % (45). Rum-regler kun uden filter; trend-regler kun med forrige periode. Uafgjort → rumnavn. Reglerne findes også i `generate.mjs` (FACIT) – hold dem i takt |
| I gang | en InProgress-periode i `task_status_history` overlapper perioden (backfill = tidligere tilnærmelse; præcis fremover). Samme regel for "relevante" opgaver (teamaktivitet/belastning) |
| Ventetid / tid i gang | median `created_at` → første InProgress, og første InProgress → `finished_at`, for færdige i perioden med en InProgress-periode. Vises i gennemløbstid-kortets detaljelinje |
| Udmeldte | rækker i `membership_departures` i perioden (trigger på `memberships`; reason left/removed/deleted; intet bruger-id; ikke ved sletning af hele org'en). Vises i Nye medlemmer-kortet som "Udmeldte: n · netto ±m" |
| Tab og skader / forbrugt | historik-rækker der GÅR IND i Missing/Damaged (tab og skader) hhv. Consumed (forbrugt) i perioden (`statistics_loss`) – split-rækker tæller med, fortsættelse i samme status (fx flytning) ikke. Enhedsrækker. Følger kategori-filteret. Ændring mod forrige periode: ↑ rød. Snapshots `loss:*`, `loss_category:*` |
| Varer pr. kategori | varer pr. hovedkategori nu |
| Kategori-filter | `p_category_id` = hovedkategori (+ alle underkategorier). Filtrerer KUN materialer: enheder pr. status/lokation, top 5, lager i "Lige nu" (og dermed opsummeringens "ude af drift"). Varer/brugte varer pr. kategori viser da underkategorierne (varer direkte i hovedkategorien under dens navn). Opgaver/KPI'er uændrede (note under Nøgletal). Snapshots altid uden filtre. `CATEGORY_NOT_FOUND` hvis ikke en hovedkategori i org'en |
| Enheder pr. lokation | antal enhedsrækker pr. lager (topniveau; sektioner via `parent_location_id` tælles med i deres lager) **ved periodens slutning** fra lagerhistorikken (`location_id` logges af triggeren). Alle lagre (også 0) + "Uden lokation" hvis nogen; "–" før historikkens start. Hele org (ikke rum-filter). Snapshots: `location:<lager>` |

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
| US-80 CSV-eksport af snapshot-sammenligning | Færdig 2026-09-30 (frontend, ingen migration) – ⏳ browser-test |
| Enheder pr. lokation | Kørt + verificeret mod FACIT 2026-09-30, i `dbSchema.sql` §9b/§15.21d/§15.26 |
| Nye medlemmer + ventende medlemskab | Kørt + verificeret 2026-09-30, i `dbSchema.sql` §15.26 |
| Opsummering (tekst-indsigt) | Færdig + verificeret i browser 2026-09-30 (frontend, `utils/statisticsInsights.ts`) |
| Kategori-filter | Kørt + verificeret mod FACIT 2026-09-30, i `dbSchema.sql` §15.26a/b |
| Tab/skader, udmeldte, opgave-statushistorik, delbart link, tabel under opgaveudvikling | Kørt + verificeret mod FACIT 2026-09-30, i `dbSchema.sql` §9c/§9d/§15.21e/f/§15.26/§16.6e/f |
| Kalender-perioder (Uge/Måned/År/Kvartal-dropdown) | Færdig 2026-09-30 (frontend, FACIT regenereret) – ⏳ browser-test |
| Browser-verifikation mod FACIT | Admin, "Alt" + snapshot: OK 2026-09-29. Medlemmer = 23 (FACIT 22) pga. ét ekstra, ikke-seedet medlem med 0 opgaver – ikke en fejl. Mangler: øvrige perioder, ikke-admin, dark mode, responsive |

## Verifikation

- SQL Editor (som postgres): `select public.statistics_payload('<org>', null, null, 'month', 'Europe/Copenhagen');`
  skal matche FACIT: status 10/11/49, prioritet 7/19/29/15, requests 5/28/6 (82,4 %),
  members 22, aktive 18, 837 enhedsrækker, månedstabellen.
- Browser: hver periodeknap skal matche tabellen "Statistiksiden pr. periode" i FACIT.md.
  Kvartal = uge-buckets, År = måned-buckets, dage uden aktivitet vises som 0.
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
- **Periodekort**: knapperne ombrydes pænt; Kvartal-knap + 2 dropdowns holdes samlet (dæmpet når kvartal ikke er valgt, Q4 i år kan ikke vælges); rum- og kategori-dropdown under en tynd linje (side om side, ombrydes på mobil); valgt knap læsbar i begge temaer.
- **Opsummering**: øverst under periodekortet; ikon + tekst pr. sætning (rød/grøn/grå), skelet under indlæsning;
  "Ingen markante ændringer" når intet rammer en tærskel; lange sætninger ombrydes pænt på mobil.
- **Lige nu**: 4 felter – 1 pr. række mobil, 2+2 fra md, 4 fra xl; ikon + tal + tekst; rød ved kritiske/høje
  forfaldne, ellers gul; "Intet kræver handling" grøn; links virker.
- **KPI-række** (8 kort): 1 kolonne mobil → 2 → 3 → 4 (xl, 1920 = 4+4) → 8 (≥ 2200 px, 2560); trend-tekst
  grøn/rød kun på Færdige/Til tiden/Gennemløbstid/Forfaldne, ellers grå; ingen overlap ved lange tal.
- **Tab og skader**: fuld bredde under Materialer; tal + Mangler/Beskadiget, ændring (rød ↑/grøn ↓), forbrugt for sig,
  stolper pr. kategori; "–" før lagerhistorikken.
- **Delbart link**: periode, datoer, rum og kategori står i adressen; kopiér til ny fane → samme visning; tilbage-knap
  forlader siden (ingen historik pr. klik).
- **Opgaveudvikling**: "Vis som tabel" under grafen (scroller ved mange rækker).
- **Rum-oversigt**: tabel scroller vandret på mobil; rum-navne er links (klik = filter + scroll til top); forfaldne > 0
  rød; "–" ved rum uden færdige med slutdato.
- **Grafer**: opgaveudvikling (blå oprettede + orange færdige), donut, stolper – akser/labels læsbare i mørk; tooltips
  har mørk baggrund i mørk tilstand.
- **Materialer**: "Enheder pr. status" viser dato i beskrivelsen; ved filter "Hele organisationen …". "Enheder pr.
  lokation" fylder hele bredden fra xl, 10 lagre inkl. 0.
- **Tomme tilstande**: vælg en periode uden data (fx "Dag" i en tom org) → tekst, ingen tomme akser.
- **CSV-eksport**: "Eksportér CSV" over sammenligningen downloader `statistik-sammenligning-<dato>.csv`; åbner med
  æøå i Google Sheets/Numbers og i Excel via Data → Fra tekst/CSV; tal med punktum; samme rækker/navne som tabellen.
- **"Gem og sammenlign"-fanen**: chips ombrydes; metadata-linje læsbar; sammenligningstabel scroller vandret på mobil,
  ændring under tallet; foldbare grupper; graf med op til 4 farver + legend.
- **Modaler** (brugerdefineret periode, gem snapshot, slet): passer på mobil (scroll i gem-dialogen), fokus/escape.
- **Org-farve**: skift organisationens farve → aktive knapper følger, graferne beholder deres faste farver.

## Senere

Intet planlagt.
