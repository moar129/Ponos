# Mockdata – Roskilde Festival

Realistisk testdata til org'en **Roskilde Festival**. Bruges til demo og til at teste
statistik mod et kendt facit ([FACIT.md](FACIT.md)). Statistik afledes altid af data –
`statistics_snapshots/values` seedes ikke.

## Kørsel

Kør filerne i rækkefølge i Supabase SQL Editor (kopiér hele filen ind, Run):

| Fil | Indhold |
|---|---|
| `01_roles.sql` | 8 roller + privilegier (rører ikke Admin/Medlem) |
| `02_users.sql` | 27 mock-brugere, 21 medlemskaber, ansøgninger, invitationer |
| `03_locations.sql` | 10 lagre, 15 sektioner |
| `04_datalayer.sql` | 32 kategorier, 90 varer, 837 enheder *(genereret)* |
| `05_news.sql` | 20 nyheder |
| `06_tasks.sql` | 8 rum, 70 opgaver, tildelinger, godkendelser, materialer *(genereret)* |
| `99_cleanup.sql` | Nulstil – sletter alt ovenstående igen |

- Org'en skal findes, og du skal være dens admin.
- Hver fil stopper med *"Allerede seedet"*, hvis dens data findes. Rettelser: kør
  `99_cleanup.sql`, og kør derefter 01 → 06 igen.
- `99_cleanup.sql` sletter de 8 seed-roller og **alt** i de øvrige berørte tabeller for org'en, også manuelt oprettet data. Egne roller bevares.

## Login som mock-bruger

Email `<fornavn>.<efternavn>@ponos-mock.test` (æ→ae, ø→oe), password **`Ponos1234!`**.

| Rolle | Brugere |
|---|---|
| Festivalledelse | mette.hansen, lars.boegh |
| Frivilligkoordinator | sofie.andersen, anders.moeller |
| Lagerchef | henrik.dahl |
| Lagermedarbejder | emma.nielsen, jonas.holm |
| Holdleder | camilla.thorsen, rasmus.kristensen, line.vestergaard |
| Teknik & El | mikkel.brandt, peter.skov |
| Sikkerhed & Vagt | nanna.bech, kasper.winther |
| Frivillig | ida.mortensen, oliver.juhl, freja.lassen, mads.poulsen, sara.oestergaard, tobias.krogh |
| Medlem | ahmad.rahimi |
| *Ikke medlem* | julie.svendsen, christian.lauridsen, amalie.koch (ansøgning afventer), nikolaj.berg (afvist), victor.hald, maja.ravn (invitation afventer) |

Statistik: Festivalledelse har `read_statistics` + `create_statistics` (gem snapshots). Frivilligkoordinator har kun `read_statistics` – og hverken `view_completed_tasks` eller `view_all_task_rooms` – så log ind som `sofie.andersen` for at tjekke, at statistikken viser samme tal som admin (den beregnes server-side). Forventede tal pr. periode står i FACIT.md.

## Ændre data

`04_datalayer.sql`, `06_tasks.sql` og `FACIT.md` genereres fra `generate.mjs`, så facit
altid passer til dataene. Ret i generatoren og kør:

```
node docs/seed/generate.mjs
```

01, 02, 03, 05 og 99 er håndskrevne.
