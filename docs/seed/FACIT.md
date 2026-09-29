# Facit for mockdata (Roskilde Festival)

GENERERET af `docs/seed/generate.mjs`. Tallene gælder pr. **2026-09-29** (forfaldne og
"i dag/denne uge" ændrer sig, når datoen flytter sig). Admin-brugeren (dig) er ikke
tildelt nogen opgaver og ikke talt med i mock-brugerne nedenfor.

## Opgaver – overblik

| Udsagn | Værdi |
|---|---|
| Oprettet i alt | 70 |
| Completed | 49 |
| InProgress | 11 |
| Started | 10 |
| Startet, ikke færdige (Started + InProgress) | 21 |
| Forfaldne (ikke Completed, end_date < nu) | 8 |
| Oprettet i dag (29/9) | 3 |
| Oprettet denne uge (fra man 28/9) | 4 |
| Færdige i dag / denne uge / sidste 30 dage | 1 / 1 / 5 |
| Uden tildelte | 3 |
| requires_approval = true | 43 |
| requires_approval = false | 27 |

Forfaldne: #22 Opdater registrering af beskadiget hegn (InProgress, slut 2025-09-01); #23 Reparer beskadigede lyskabler (InProgress, slut 2025-10-31); #47 Evaluering RF26 – sikkerhed (InProgress, slut 2026-09-11); #48 Reparer beskadigede hegnselementer (InProgress, slut 2026-09-18); #49 Service af lysudstyr før vinteropbevaring (InProgress, slut 2026-09-25); #50 Sorter returneret frivilligudstyr (Started, slut 2026-09-20); #52 Tøm og rengør affaldscontainere (InProgress, slut 2026-09-22); #65 Opdater frivillighåndbog (Started, slut 2026-04-30).

## Fordeling

| Prioritet | Antal |
|---|---|
| Critical | 7 |
| High | 19 |
| Medium | 29 |
| Low | 15 |

| Rum | Antal | Completed | Åbne |
|---|---|---|---|
| Planlægning | 12 | 8 | 4 |
| Opbygning | 7 | 6 | 1 |
| Scener & Teknik | 11 | 7 | 4 |
| Affald & Genbrug | 8 | 6 | 2 |
| Sanitet | 5 | 3 | 2 |
| Sikkerhed | 8 | 5 | 3 |
| Frivillige | 7 | 6 | 1 |
| Nedtagning | 12 | 8 | 4 |

Rolle-låste rum: Planlægning (Festivalledelse, Frivilligkoordinator, Lagerchef, Holdleder); Sikkerhed (Sikkerhed & Vagt, Festivalledelse).

## Godkendelser (task_requests)

| Udsagn | Værdi |
|---|---|
| Anmodninger i alt | 39 |
| Accepted | 28 |
| Rejected | 6 |
| Pending | 5 |
| Opgaver der afventer godkendelse | 5 |
| Godkendelsesrate (accepted / (accepted + rejected)) | 82.4 % |

Opgaver afvist og senere godkendt: #25, #33, #45.

## Medarbejdere / teamaktivitet

| Udsagn | Værdi |
|---|---|
| Medlemmer i org (inkl. dig) | 22 |
| Mock-medlemmer | 21 |
| Mock-medlemmer med mindst én opgave (Maks) | 18 |
| Mock-medlemmer uden opgaver | 3 (lars.boegh, tobias.krogh, ahmad.rahimi) |
| Tildelt en opgave siden 1/7-2026 | 18 |
| Tildelinger i alt | 119 |
| Ikke-medlemmer: Pending ansøgninger / Rejected / Pending invitationer | 3 / 1 / 2 |

| Medlem | Opgaver |
|---|---|
| mikkel.brandt | 11 |
| peter.skov | 9 |
| oliver.juhl | 9 |
| camilla.thorsen | 8 |
| anders.moeller | 8 |
| nanna.bech | 8 |
| line.vestergaard | 8 |
| ida.mortensen | 7 |
| freja.lassen | 7 |
| rasmus.kristensen | 6 |
| mads.poulsen | 6 |
| sara.oestergaard | 6 |
| henrik.dahl | 5 |
| sofie.andersen | 5 |
| kasper.winther | 5 |
| emma.nielsen | 5 |
| jonas.holm | 4 |
| mette.hansen | 2 |

## Materialer (data_layer_item_units, efter reservationer i 06)

"Rækker" = antal enhedsrækker. "Mængde" = som viewet `data_layer_item_status_counts`
(kapacitets-rækker tæller 1, ellers `quantity` – blander stk/kg/meter).

| Status | Rækker | Mængde |
|---|---|---|
| Available | 736 | 85212 |
| Damaged | 29 | 148 |
| InUse | 25 | 342 |
| Maintenance | 21 | 21 |
| Missing | 16 | 293 |
| NeedsEmptying | 3 | 3 |
| NeedsRefilling | 3 | 3 |
| OutOfStock | 1 | 2 |
| Reserved | 3 | 12 |
| **I alt** | **837** | **86036** |

Varer: 90. Kategorier: 8 + 24 underkategorier.
Linkede materialer: #48 (30 Byggehegn 3,5 m); #49 (4 LED-spot 200 W); #52 (250 Affaldssække 120 l); #54 (40 Scenegulv-element 2x1 m); #56 (6 Brandslukker 6 kg pulver); #57 (8 Håndradio); #62 (10 Stikdåse 6-vejs IP44, 2 Kabeltromle 25 m).

## Udvikling over tid

| Måned | Oprettet | Færdige |
|---|---|---|
| 2024-10 | 2 | 0 |
| 2024-11 | 2 | 2 |
| 2024-12 | 1 | 0 |
| 2025-01 | 1 | 0 |
| 2025-02 | 1 | 3 |
| 2025-03 | 1 | 1 |
| 2025-04 | 2 | 1 |
| 2025-05 | 3 | 1 |
| 2025-06 | 4 | 7 |
| 2025-07 | 3 | 4 |
| 2025-08 | 3 | 1 |
| 2025-09 | 1 | 1 |
| 2025-10 | 2 | 0 |
| 2025-11 | 1 | 2 |
| 2025-12 | 1 | 0 |
| 2026-01 | 1 | 0 |
| 2026-02 | 3 | 4 |
| 2026-03 | 1 | 0 |
| 2026-04 | 2 | 2 |
| 2026-05 | 3 | 1 |
| 2026-06 | 5 | 7 |
| 2026-07 | 4 | 5 |
| 2026-08 | 8 | 2 |
| 2026-09 | 15 | 5 |

| Kvartal | Oprettet | Færdige |
|---|---|---|
| 2024-Q4 | 5 | 2 |
| 2025-Q1 | 3 | 4 |
| 2025-Q2 | 9 | 9 |
| 2025-Q3 | 7 | 6 |
| 2025-Q4 | 4 | 2 |
| 2026-Q1 | 5 | 4 |
| 2026-Q2 | 10 | 10 |
| 2026-Q3 | 27 | 12 |

| År | Oprettet | Færdige |
|---|---|---|
| 2024 | 5 | 2 |
| 2025 | 23 | 21 |
| 2026 | 42 | 26 |

## Kontrol-queries (kør som postgres i SQL Editor)

```sql
-- org-id
select id from organisations where lower(trim(name)) = 'roskilde festival';

select status, count(*) from tasks where organisation_id = '<org>' group by 1;
select priority, count(*) from tasks where organisation_id = '<org>' group by 1;
select count(*) from tasks where organisation_id = '<org>' and status <> 'Completed' and end_date < now();
select tr.status, count(*) from task_requests tr join tasks t on t.id = tr.task_id
  where t.organisation_id = '<org>' group by 1;
select status, count(*), sum(case when contents_total is not null then 1 else quantity end)
  from data_layer_item_units where organisation_id = '<org>' group by 1;
select to_char(created_at at time zone 'Europe/Copenhagen', 'YYYY-MM') m, count(*)
  from tasks where organisation_id = '<org>' group by 1 order by 1;
```
