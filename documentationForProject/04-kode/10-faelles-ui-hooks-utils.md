# 4.10 Kodegennemgang – Fælles UI-primitiver, hooks, utils og typer

Mange filer her er resultatet af bevidste DRY-oprydninger – kommentarerne nævner typisk, hvor mange kopier de erstattede ("Lå før som ~70 kopier i 4 varianter"). **Tjek altid denne liste, før du skriver en ny dialog, hook eller formatteringsfunktion.**

---

## 1. `src/components/common/` – UI-primitiver

| Komponent | Ansvar | Detaljer |
|---|---|---|
| `Modal.tsx` (+ `ModalFooter`) | Den eneste modal-ramme: portal til `document.body`, backdrop, header med luk-knap, `role="dialog"`, `aria-modal`, `aria-labelledby` | **Modal-stak** (`openStack: symbol[]` på modulniveau): kun den øverste modal reagerer på Escape, så en bekræftelse oven på en detalje-modal ikke lukker begge. `closeOnBackdrop`, `disableClose` (fx under gem), `onSubmit` gør panelet til en `<form>`. Størrelser `sm`–`3xl`. |
| `ConfirmDialog.tsx` | "Er du sikker?" oven på `Modal` | `isLoading`, `error`, valgfri `children` (fx liste over det, der slettes) |
| `InlineConfirm.tsx` | "Ja / Fortryd" direkte i en listerække | Bruges ved fjern medlem, annuller invitation, forlad org |
| `DecisionActions.tsx` | Godkend/afvis med bekræft-trin | Medlemsanmodninger, invitationer, opgavegodkendelser |
| `Alert.tsx` | Fejl/succes/info-boks (`tone`) | Renderer intet, hvis `children` er tom → `<Alert>{error}</Alert>` er sikkert |
| `Spinner.tsx`, `EmptyState.tsx` | Loading og tom liste | |
| `Avatar.tsx` | Billede eller initialer (`getInitials`) | `url_picture` rendres som `<img src>` (se sikkerhedsnote i `04-kode/02-…`) |
| `SideNavLayout.tsx` | Lodret fane-nav (vandret under `md`) | Administration-fanen, Organisation-fanen |
| `DetailList.tsx` (`DetailList`, `DetailRow`) | "Etiket … værdi"-lister | Profil, organisation |
| `FavoriteStarButton.tsx` | Stjerne til favoritter | Datalager og opgaverum |
| `LanguageSelector.tsx` | Sprogvælger (`variant: 'select' \| …`), sorteret på sprogets eget navn | Bruger `useLanguage` + `useDismissable` |
| `NumberInput.tsx` | Tekstfelt til tal (kan være tomt mens man skriver) | Fejl fra `numberInputError` (`utils/numberInput.ts`) |
| `ToggleSwitch.tsx` | `role="switch"` | Opret opgave (kræver godkendelse), notifikationsindstillinger |

> **Observeret – tilgængelighed:** `Modal` har ingen fokusfælde (focus trap), flytter ikke fokus ind i dialogen ved åbning og giver det ikke tilbage ved lukning, og låser ikke baggrundsscroll. Tastaturbrugere kan derfor tabbe ud bag modalen. (Escape og ARIA-roller er håndteret.)

---

## 2. Hooks (`src/store/hooks/`)

| Hook | Returnerer | Hvor beskrevet |
|---|---|---|
| `hooks.ts` – `useAppDispatch`, `useAppSelector` | Typede Redux-hooks | `04-kode/01-…` |
| `useNavItems`, `useHasOrganisation`, `useSignOutAndRedirect` (alle i `useNavItems.ts`) | Navigation, "har aktiv org?", log ud | `04-kode/02-…` |
| `useAdministrationTabs` | Synlige admin-underfaner | `04-kode/03-…` |
| `orgHook.ts` – `useOrganisationTheme` | Skriver org-farver som CSS-variabler | `04-kode/11-…` |
| `useTheme`, `useLanguage` | Tema/sprog + persistens | `04-kode/11-…` |
| `useDeleteMany` | Parallel sletning med fælles state | `04-kode/04-…` |
| `useTaskBoard`, `useTaskFilters`, `useTaskPermissions`, `useApplyMaterialOutcomes`, `useTaskRoomFavorites` | Opgavetavle | `04-kode/05-…` |
| `useMessageThread`, `useOpenNotification` | Beskeder/notifikationer | `04-kode/06-…` |
| `useStatisticsPeriod` | Statistikperiode i URL | `04-kode/08-…` |
| `useDismissable(ref, open, onClose)` | Luk ved klik udenfor/Escape (erstattede 4 kopier, hvoraf 2 manglede Escape) | – |
| `useDisplayName()` | `(name) => name \|\| t('assignees.unknownUser')` – API'et returnerer bevidst `''` frem for dansk tekst | – |
| `useTimeAgo()` | "Lige nu" / "for 5 min siden" / timer / dage (i18n med plural) | – |
| `useFitText(deps)` | Skalerer skrift ned i stedet for afkortning | `04-kode/09-…` |

**Mønster i hooks:** "latest ref"-tricket (`closeRef.current = onClose` i en effect uden deps-array) bruges i `Modal` og `useDismissable`, så event-listeneren kun registreres én gang, men altid kalder den nyeste callback.

> **Observeret – placering:** Ikke alle hooks bor i `src/store/hooks/`: `useActiveMembership` ligger i `organisationApi.ts`, `useHasPrivilege`/`useHasAnyPrivilege` i `privilegeApi.ts`. CLAUDE.md nævner `useHasOrganisation` som en fælles hook – den ligger i `useNavItems.ts`.

---

## 3. Rene hjælpefunktioner (`src/utils/`)

| Fil | Indhold |
|---|---|
| `personName.ts` | `formatFullName`, `getInitials`, `getInitialsFromName`, `filterPeople` (navn/email/rolle) – erstattede ~15 `${first} ${last}`-kopier, hvoraf nogle kunne give "null null" |
| `formatDate.ts` | `formatDate`, `formatDateTime`, `formatNumericDate`, … via `Intl` med **aktuelt i18n-sprog** som locale (erstattede 14 hardkodede `'da-DK'`) |
| `calendar.ts` | Lokale datoberegninger (`toDateKey`, uge-/kvartalsstart) – advarer mod `toISOString()` (UTC) |
| `toggle.ts` | `toggleInArray`, `toggleInSet` (returnerer altid ny samling → klar til `setState`) |
| `numberInput.ts`, `itemUnitForm.ts`, `locationForm.ts` | Formular-parsing/-validering |
| `locationPathLabel.ts` | "Lager › Sektion"-stier |
| `taskDisplay.ts`, `taskFilters.ts`, `taskMaterials.ts`, `splitFavoriteRooms.ts` | Opgaver |
| `notificationDisplay.ts`, `systemMessageDisplay.ts`, `conversationPath.ts` | Notifikationer/beskeder (oversættelse af DB-sentinels) |
| `statistics*.ts` | Statistik |
| `orgPalette.ts` | Farvepalet med kontrastberegning |
| `dashboardTab.ts` | `resolveDashboardTab` |
| `organisationExitMessage.ts` | Besked efter forlad/slet organisation |
| `validatePassword.ts` | `passwordProblem` |

**Princip (observeret, `src/i18n/README.md`):** Moduler uden for React returnerer i18n-**nøgler**, ikke færdig tekst (fx `privilegeLocking.ts` → `reasonKey`), eller tager `t` som parameter (`privilegeLabel(name, t)`, `notificationTitle(n, t)`). Ellers ville teksten ikke skifte sprog.

---

## 4. Typer (`src/types/<domæne>/`)

Konventionen (CLAUDE.md): prop-typer og domænetyper ligger i `src/types/<domæne>/…Type(s).ts`, ikke i komponentfilen. Mapper: `auth`, `common` (10 filer, én pr. fælles komponent), `dashboard`, `dataLayer`, `landing`, `membership`, `messages`, `news`, `notification`, `organisation`, `profile`, `public`, `role`, `statistics`, `Task`, `textEditor`.

> **Observeret – konventionen følges ikke overalt:** 8 komponentfiler deklarerer selv `…Props`-typer (fx `TaskItemPicker.tsx`, `FilterPanel.tsx`, `AttentionPanel.tsx`, `globalSearchComponent.tsx`), og flere interne underkomponenter har inline prop-typer (`ProfileSection` i `ProfilePage.tsx`, `RowGroup` i `PrivilegeMatrix.tsx`, `ItemKindRadios` i `ItemUnitFields.tsx`). Typefilerne indeholder til gengæld runtime-kode flere steder (`formatItemQuantity`, `ITEM_STATUS_STYLES` i `datalayerTypes.ts`). Mappenavnet `Task` (stort T) bryder også med de øvrige små bogstaver.

---

## 5. Navngivning af filer (observeret)

Der bruges flere konventioner side om side:
- `PascalCase.tsx` (fx `TaskCard.tsx`, `ItemListPanel.tsx`) – de fleste nyere komponenter.
- `camelCaseComponent.tsx` (fx `itemsDetailComponent.tsx`, `conversationListComponent.tsx`, `headerComponent.tsx`, `organisationPickerComponent.tsx`).
- Stavevarianter: `CategoriTreeNodeComponent.tsx`, `locationThreeNodeComponent.tsx` ("Three" for "Tree").
- Mapper: `pages/statistik/` (dansk) vs. `pages/dataLayer/`; `pages/logIn/` vs. kommentaren `// src/pages/login/Login.tsx`.

Det er kosmetisk, men gør filsøgning sværere for nye udviklere.
