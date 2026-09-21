# i18n

Ponos kører på [react-i18next](https://react.i18next.com/). Dansk er master;
alt brugervendt tekst lever i `locales/<sprog>/<namespace>.json`.

## Sådan tilføjes en ny tekst

1. Skriv nøglen i `locales/da/<namespace>.json` — dansk er facit.
2. Brug den i komponenten: `const { t } = useTranslation('news')` → `t('news:heading')`.
   Nøglen er typecheck'et (se `i18next.d.ts`), så en tastefejl fejler i `npm run build`.
3. Tilføj den samme nøgle i de 13 øvrige sprogmapper.
4. `npm run i18n:check` — fejler hvis et sprog mangler nøglen eller har en,
   dansk ikke har.

Tekst der hentes **uden for** React (`taskDisplay.ts`, `privilegeLocking.ts`,
`store/apis/*`) skal returnere en **nøgle**, ikke en færdig streng. Ellers
bliver teksten ikke gengivet når brugeren skifter sprog. Fejl fra API-laget
bruger `errorCode()` fra `store/apis/apiError.ts` og oversættes først i
`ErrorMessage.ts`.

## Fejl fra databasen

Postgres' `raise exception` sætter en stabil kode i `hint` (fx
`ONLY_ADMIN_CANNOT_LEAVE`), mens `message` fortsat er den danske tekst.
`mapDbError()` i `store/apis/apiError.ts` oversætter koden til
`errors:db.<KODE>`; kender vi den ikke, vises databasens egen besked.

Derfor kan migrationen og frontenden udrulles i hver sin rækkefølge uden
at noget knækker. Tilføjes en ny `raise exception` i databasen, giver den
sig selv til kende ved at vise dansk tekst på et andet sprog — så mangler
der en `db.*`-nøgle.

Sammensæt aldrig sætninger i JSX (`"Du har " + n + " opgaver"`) — ordstillingen
holder ikke på tysk og finsk. Brug interpolation (`{{count}}`) eller `<Trans>`.

## Flertal

i18next bruger CLDR-kategorier som nøglesuffiks: `_one`, `_few`, `_many`,
`_other`. Dansk har kun `_one`/`_other`, men polsk og tjekkisk har fire og
rumænsk tre. `i18n:check` slår de krævede former op via `Intl.PluralRules`
og fejler hvis én mangler — en manglende polsk `_few` ville ellers falde
tilbage på `_other` og give grammatisk forkert polsk uden nogen fejl.

## Sprogene

| | |
|---|---|
| **Dansk** (`da`) | Master. Al ny tekst skrives her først. |
| **Engelsk** (`en`) | Håndskrevet. Første fallback, og den reference de øvrige er oversat fra. |
| **12 øvrige** | `de fr es it nl sv pt pl fi hu cs ro` |

**Kvalitetsforbehold:** de 12 øvrige sprog er maskinoversat og **ikke**
korrekturlæst af en modersmålstaler. De store europæiske sprog
(`de fr es it nl sv pt`) er pålidelige; `pl fi hu cs ro` er svagere,
især i den lange marketing-tekst i `public`-namespacet. Nøgleparitet og
flertalsformer er maskinelt verificeret — ordvalg og tone er ikke.

Ti af EU's 24 officielle sprog er bevidst udeladt af samme grund — se
kommentaren øverst i `languages.ts`. Et sprog tilføjes med én linje der
plus en mappe under `locales/`.

## Filer

| Fil | Rolle |
|---|---|
| `languages.ts` | Registret. Eneste sted et sprog tilføjes/fjernes. |
| `config.ts` | i18next-init. Dansk bundles; øvrige sprog lazy-loades. |
| `i18next.d.ts` | Type-augmentation — binder `t()` til de danske ordbøger. |
| `locales/<kode>/*.json` | 14 namespaces pr. sprog. |
| `../../scripts/i18n-check.mjs` | `npm run i18n:check` — nøgleparitet + flertal. |
| `../../scripts/i18n-split.mjs` | Splitter én samlet JSON ud i de 14 namespace-filer. |

Sprogvalget bor i `localStorage` (`ponos-language`), ikke i databasen — samme
mønster som temaet. `index.html` har et pre-hydration-script der sætter
`<html lang>` før React mounter, så der ikke er et sprog-glimt ved load.
Scriptet dublerer sproglisten, fordi det ikke kan importere fra `src/`.
