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

## Statistiksiden pr. periode (get_statistics)

Samme definitioner som `statistics_payload` (docs/dbSchema.sql §15.26):
rullende perioder der slutter 29/9 inkl. (Europe/Copenhagen). Status, prioritet, rum og
mest brugte = opgaver **oprettet** i perioden. *I gang* = `coalesce(start_date, created_at)`
før periodens slut og (InProgress eller Completed med `finished_at` ≥ start). *Relevante*
(teamaktivitet/belastning) = oprettet eller i gang i perioden. Godkendelser tæller
anmodninger efter `requested_at`. Medlemmer = 22 (inkl. dig) i alle perioder.

| Udsagn | Dag | 7 dage | 30 dage | 91 dage | 365 dage | Alt |
|---|---|---|---|---|---|---|
| Oprettede | 3 | 7 | 16 | 27 | 46 | 70 |
| Færdige | 1 | 2 | 5 | 12 | 28 | 49 |
| Færdige til tiden | 100 % (1 af 1) | 50 % (1 af 2) | 60 % (3 af 5) | 66.7 % (8 af 12) | 82.1 % (23 af 28) | 87.8 % (43 af 49) |
| Median gennemløbstid (dage) | 6.1 | 14.2 | 16.3 | 17.9 | 30.8 | 37.1 |
| I gang | 12 | 13 | 16 | 23 | 39 | 60 |
| Forfaldne | 0 | 1 | 5 | 5 | 7 | 8 |
| Med opgaveaktivitet | 13 | 14 | 16 | 18 | 18 | 18 |
| Nye medlemmer (mock) | 0 | 0 | 1 | 1 | 2 | 21 |
| Udmeldte | 0 | 0 | 1 | 1 | 2 | 5 |
| Ventetid før start (median dage) | 5 | 5 | 7 | 6.4 | 12.9 | 13 |
| Tid i gang (median dage) | 1.1 | 9.2 | 9.3 | 9.8 | 13.9 | 17.3 |
| Tab og skader (Mangler + Beskadiget) | 0 | 0 | 0 | 17 | 17 | 45 |
|   heraf Mangler / Beskadiget | 0 / 0 | 0 / 0 | 0 / 0 | 6 / 11 | 6 / 11 | 16 / 29 |
| Forbrugt (Brugt op) | 0 | 0 | 0 | 0 | 0 | 0 |
| Tab og skader: Scene & Teknik | 0 | 0 | 0 | 5 | 5 | 14 |
| Tab og skader: Hegn & Afspærring | 0 | 0 | 0 | 3 | 3 | 5 |
| Tab og skader: Telte & Møbler | 0 | 0 | 0 | 0 | 0 | 4 |
| Tab og skader: Sanitet | 0 | 0 | 0 | 0 | 0 | 1 |
| Tab og skader: Affald & Genbrug | 0 | 0 | 0 | 1 | 1 | 1 |
| Tab og skader: Sikkerhed | 0 | 0 | 0 | 1 | 1 | 12 |
| Tab og skader: Forbrugsvarer | 0 | 0 | 0 | 0 | 0 | 0 |
| Tab og skader: Frivilligudstyr | 0 | 0 | 0 | 7 | 7 | 8 |
| Status: Started | 3 | 6 | 8 | 9 | 10 | 10 |
| Status: InProgress | 0 | 0 | 6 | 9 | 9 | 11 |
| Status: Completed | 0 | 1 | 2 | 9 | 27 | 49 |
| Prioritet: Critical | 0 | 0 | 1 | 1 | 4 | 7 |
| Prioritet: High | 0 | 1 | 4 | 5 | 11 | 19 |
| Prioritet: Medium | 2 | 3 | 7 | 14 | 20 | 29 |
| Prioritet: Low | 1 | 3 | 4 | 7 | 11 | 15 |
| Rum: Planlægning | 0 | 2 | 4 | 4 | 7 | 12 |
| Rum: Opbygning | 0 | 1 | 1 | 1 | 4 | 7 |
| Rum: Scener & Teknik | 1 | 1 | 3 | 4 | 8 | 11 |
| Rum: Affald & Genbrug | 1 | 1 | 2 | 4 | 6 | 8 |
| Rum: Sanitet | 1 | 1 | 2 | 2 | 3 | 5 |
| Rum: Sikkerhed | 0 | 1 | 2 | 3 | 5 | 8 |
| Rum: Frivillige | 0 | 0 | 1 | 2 | 5 | 7 |
| Rum: Nedtagning | 0 | 0 | 1 | 7 | 8 | 12 |
| Belastning 0 | 9 | 8 | 6 | 4 | 4 | 4 |
| Belastning 1-3 | 13 | 14 | 16 | 15 | 6 | 1 |
| Belastning 4-6 | 0 | 0 | 0 | 3 | 11 | 8 |
| Belastning 7+ | 0 | 0 | 0 | 0 | 1 | 9 |
| Anmodninger: Pending | 0 | 4 | 5 | 5 | 5 | 5 |
| Anmodninger: Accepted | 0 | 1 | 2 | 6 | 16 | 28 |
| Anmodninger: Rejected | 0 | 1 | 3 | 4 | 6 | 6 |
| Godkendelsesrate | – | 50 % | 40 % | 60 % | 72.7 % | 82.4 % |
| Median behandlingstid (t) | – | 2.5 | 3 | 3 | 3 | 3 |
| Brugte varer: Scene & Teknik | 2 | 2 | 2 | 3 | 3 | 3 |
| Brugte varer: Hegn & Afspærring | 0 | 0 | 0 | 1 | 1 | 1 |
| Brugte varer: Telte & Møbler | 0 | 0 | 1 | 1 | 1 | 1 |
| Brugte varer: Sanitet | 0 | 0 | 0 | 0 | 0 | 0 |
| Brugte varer: Affald & Genbrug | 0 | 0 | 1 | 1 | 1 | 1 |
| Brugte varer: Sikkerhed | 0 | 0 | 2 | 2 | 2 | 2 |
| Brugte varer: Forbrugsvarer | 0 | 0 | 0 | 0 | 0 | 0 |
| Brugte varer: Frivilligudstyr | 0 | 0 | 0 | 0 | 0 | 0 |
| Enheder ved periodens slut: Available | 736 | 736 | 736 | 736 | 736 | 736 |
| Enheder ved periodens slut: Damaged | 29 | 29 | 29 | 29 | 29 | 29 |
| Enheder ved periodens slut: InUse | 25 | 25 | 25 | 25 | 25 | 25 |
| Enheder ved periodens slut: Maintenance | 21 | 21 | 21 | 21 | 21 | 21 |
| Enheder ved periodens slut: Missing | 16 | 16 | 16 | 16 | 16 | 16 |
| Enheder ved periodens slut: NeedsEmptying | 3 | 3 | 3 | 3 | 3 | 3 |
| Enheder ved periodens slut: NeedsRefilling | 3 | 3 | 3 | 3 | 3 | 3 |
| Enheder ved periodens slut: OutOfStock | 1 | 1 | 1 | 1 | 1 | 1 |
| Enheder ved periodens slut: Reserved | 3 | 3 | 3 | 3 | 3 | 3 |

Enheder ved periodens slut = status på `min(periodens slut, nu)` fra lagerhistorikken. Rullende perioder
slutter i dag, så de er ens her. Til snapshot-test af et afsluttet år (seed-fortid efter 06's historik-fixup):

| Status | 31/12-2024 | 31/12-2025 |
|---|---|---|
| Available | 181 | 563 |
| Damaged | 0 | 18 |
| InUse | 0 | 3 |
| Maintenance | 3 | 11 |
| Missing | 0 | 10 |
| NeedsEmptying | 0 | 3 |
| NeedsRefilling | 2 | 3 |
| OutOfStock | 0 | 0 |
| Reserved | 0 | 0 |

Enheder pr. lager ("Enheder pr. lokation", sektioner talt med i deres lager; samme tidspunkt-regel):

| Lager | Nu (29/9) | 31/12-2024 | 31/12-2025 |
|---|---|---|---|
| Centrallager | 498 | 170 | 368 |
| Orange Scene | 4 | 0 | 3 |
| Arena | 0 | 0 | 0 |
| Avalon | 0 | 0 | 0 |
| Apollo | 0 | 0 | 0 |
| Camp Øst | 10 | 0 | 10 |
| Camp Vest | 10 | 0 | 10 |
| Frivilligcamp | 49 | 0 | 49 |
| Medic-telt | 22 | 13 | 13 |
| Sikkerhedscentral | 244 | 3 | 158 |

KPI-trend (nu / forrige periode af samme længde, fx 7 dage = 23/9–29/9 mod 16/9–22/9). Farver: Færdige ↑ grøn /
↓ rød, Forfaldne ↓ grøn / ↑ rød, øvrige neutrale. Forrige = 0 → absolut tal i stedet for %. Forventet på siden:
7 dage: Oprettede ↑ 250 %, Færdige ↑ 100 % (grøn), Forfaldne ↓ 67 % (grøn), Til tiden ↑ 50 pp (grøn),
Gennemløbstid ↓ 30 % (grøn). 30 dage: Forfaldne ↑ 5 (rød), Til tiden ↑ 10 pp (grøn).

| Periode | Oprettede | Færdige | Forfaldne | Til tiden | Gennemløbstid (dage) | Nye medlemmer | Udmeldte | Tab og skader |
|---|---|---|---|---|---|---|---|---|
| 7 dage | 7 / 2 | 2 / 1 | 1 / 3 | 50 % / 0 % | 14.2 / 20.2 | 0 / 0 | 0 / 1 | 0 / 0 |
| 30 dage | 16 / 7 | 5 / 2 | 5 / 0 | 60 % / 50 % | 16.3 / 30.1 | 1 / 0 | 1 / 0 | 0 / 0 |

Til tiden = færdige med `finished_at <= end_date` blandt færdige i perioden med slutdato (kl. 00:00 UTC = hele
dagen). Gennemløbstid = median `finished_at − created_at` for færdige i perioden. Trend: Til tiden i procentpoint
(↑ grøn), gennemløbstid ↓ grøn.
Tab og skader = enheder der GÅR IND i Mangler/Beskadiget i perioden (seedet: dagen efter RF25/RF26); forbrugt =
Brugt op (seedet: ved oprettelsen). Udmeldte = `membership_departures` (5 i seedet). Ventetid/tid i gang fra
opgave-statushistorikken (første InProgress). "I gang" = en InProgress-periode overlapper perioden.
Nye medlemmer = `memberships.created_at` i perioden, neutral trend. Tallene tæller kun seed-brugerne - dit eget
og andre ikke-seedede medlemskaber kommer oveni, hvis de er oprettet i perioden ("Alt" = alle medlemmer).

### Opsummering (tekst-indsigt, uden rum-filter)

Højst 3 sætninger, vigtigste først (regler i `src/utils/statisticsInsights.ts`). Tallene er formateret som på dansk
side (fx "30,1 dage" dér, "30.1" her).

| Periode | Forventede sætninger |
|---|---|
| 7 dage | Der blev oprettet 7 opgaver, men kun 2 blev færdige – backloggen vokser.<br>Forfaldne opgaver faldt fra 3 til 1.<br>Andelen færdige til tiden steg fra 0 % til 50 %. |
| 30 dage | Forfaldne opgaver steg fra 0 til 5.<br>Flest forfaldne opgaver i Nedtagning (2).<br>Der blev oprettet 16 opgaver, men kun 5 blev færdige – backloggen vokser. |
| 91 dage | Forfaldne opgaver steg fra 1 til 5.<br>Andelen færdige til tiden faldt fra 90 % til 67 %.<br>Flest forfaldne opgaver i Nedtagning (2). |
| 365 dage | Forfaldne opgaver steg fra 1 til 7.<br>Andelen færdige til tiden faldt fra 95 % til 82 %.<br>Flest forfaldne opgaver i Nedtagning (2). |
| Alt | Flest forfaldne opgaver i Nedtagning (3).<br>Lavest andel til tiden i Nedtagning: 63 % (5 af 8). |

### Kategori-filter (stikprøve: Scene & Teknik, "Alt")

Filtrerer kun materialer; opgavetal er uændrede. Kategorikortene viser underkategorierne.

| Udsagn | Værdi |
|---|---|
| Enheder i alt (nu) | 272 |
| Enheder pr. status (nu) | Available 237, Damaged 10, InUse 8, Maintenance 9, Missing 4, NeedsRefilling 1, Reserved 3 |
| Enheder pr. lager (nu) | Centrallager 268, Orange Scene 4 |
| Varer pr. underkategori | Lyd 7, Lys 6, Strøm & Kabler 6, Generatorer & Brændstof 4 |
| Mest brugte (top 5) | 10 Stikdåse 6-vejs IP44, 4 LED-spot 200 W, 2 Kabeltromle 25 m |

Rum-filter (US-55): brug rum-oversigten nedenfor – fx Sanitet ved "Alt": oprettede 5, færdige 3.

### Rum-oversigt ("Alt")

Samme definitioner som nøgletallene, pr. rum. Sorteres på siden efter forfaldne.

| Rum | Oprettede | Færdige | Forfaldne | Til tiden |
|---|---|---|---|---|
| Planlægning | 12 | 8 | 1 | 100 % (8 af 8) |
| Opbygning | 7 | 6 | 0 | 100 % (6 af 6) |
| Scener & Teknik | 11 | 7 | 2 | 85.7 % (6 af 7) |
| Affald & Genbrug | 8 | 6 | 1 | 66.7 % (4 af 6) |
| Sanitet | 5 | 3 | 0 | 100 % (3 af 3) |
| Sikkerhed | 8 | 5 | 1 | 100 % (5 af 5) |
| Frivillige | 7 | 6 | 0 | 100 % (6 af 6) |
| Nedtagning | 12 | 8 | 3 | 62.5 % (5 af 8) |

### Lige nu (pr. 29/9, uafhængigt af periode)

| Udsagn | Værdi |
|---|---|
| Forfaldne åbne opgaver | 8 (High: 2, Medium: 3, Low: 3) |
| Åbne opgaver uden ansvarlige | 3 |
| Enheder Missing | 16 |
| Enheder Damaged | 29 |
| Enheder Maintenance | 21 |
| Enheder OutOfStock | 1 |
| Enheder NeedsEmptying | 3 |
| Enheder NeedsRefilling | 3 |
| Medlemskab: ventende anmodninger / invitationer | 3 / 2 |
| Varer uden ledige enheder | 1 (Solcreme 1 l) |

Mest brugte materialer (top 5):

| Periode | Materialer |
|---|---|
| Dag | 10 Stikdåse 6-vejs IP44, 2 Kabeltromle 25 m |
| 7 dage | 10 Stikdåse 6-vejs IP44, 2 Kabeltromle 25 m |
| 30 dage | 250 Affaldssække 120 l, 40 Scenegulv-element 2x1 m, 10 Stikdåse 6-vejs IP44, 8 Håndradio, 6 Brandslukker 6 kg pulver |
| 91 dage | 250 Affaldssække 120 l, 40 Scenegulv-element 2x1 m, 30 Byggehegn 3,5 m, 10 Stikdåse 6-vejs IP44, 8 Håndradio |
| 365 dage | 250 Affaldssække 120 l, 40 Scenegulv-element 2x1 m, 30 Byggehegn 3,5 m, 10 Stikdåse 6-vejs IP44, 8 Håndradio |
| Alt | 250 Affaldssække 120 l, 40 Scenegulv-element 2x1 m, 30 Byggehegn 3,5 m, 10 Stikdåse 6-vejs IP44, 8 Håndradio |

Varer pr. hovedkategori (nu, uafhængig af periode):

| Kategori | Varer |
|---|---|
| Scene & Teknik | 23 |
| Hegn & Afspærring | 10 |
| Telte & Møbler | 9 |
| Sanitet | 6 |
| Affald & Genbrug | 8 |
| Sikkerhed | 11 |
| Forbrugsvarer | 12 |
| Frivilligudstyr | 11 |

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

-- Hele statistik-payloaden som siden ser den (fx "30 dage"):
select public.statistics_payload('<org>', '2026-08-31 00:00 Europe/Copenhagen',
  '2026-09-30 00:00 Europe/Copenhagen', 'day', 'Europe/Copenhagen');
```
