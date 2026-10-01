# 4.9 Kodegennemgang – Dashboard, layout og offentlige sider

Dækker: `src/pages/dashboard/Dashboard.tsx`, `src/components/dashboard/*` (de dele, der ikke er organisation/roller – se `04-kode/03-…`), `src/components/headerComponent.tsx`, `src/components/footerComponent.tsx`, `src/store/hooks/{useNavItems,useFitText,useDismissable}.ts`, `src/utils/dashboardTab.ts`, `src/pages/landing/*`, `src/components/landing/*`, `src/pages/public/*`, `src/components/public/*`, `src/components/auth/AuthCard.tsx`, `src/lib/contact.ts`.

---

## 1. App-skallen

```
┌──────────────────────────── Header (headerComponent.tsx) ───────────────────────────┐
│ PONOS – <org> (useFitText)   [nav-links fra useNavItems]  🔔  🌐  ☾  [Avatar ▾]    │
├──────────────────────── PendingRequestBanner (kun ved behov) ──────────────────────┤
│ <main> … <Routes> …   (padding undtagen FULL_WIDTH_ROUTES)                          │
├──────────────────────────── Footer (footerComponent.tsx) ──────────────────────────┤
│ samme nav-links (useNavItems) · kontakt (lib/contact.ts)                            │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### `headerComponent.tsx` (304 linjer)
- **Navigation:** `useNavItems()` – én kilde for header (desktop + mobil) og footer. Kommentaren nævner, at footeren tidligere havde mistet privilegie-tjekket, da listen lå tre steder.
- **Organisationsnavn:** `useFitText(deps)` skalerer skriftstørrelsen ned, så "PONOS – <org>" aldrig afkortes med "…" (afhænger også af sproget, fordi labels fylder forskelligt).
- **Bruger-dropdown:** "Se profil" + "Log ud" (`useSignOutAndRedirect`); lukkes ved klik udenfor/Escape via `useDismissable`.
- **Mobil:** hamburger-menu, lukkes automatisk ved `resize` ≥ 1024 px.
- `NotificationBellComponent`, `LanguageSelector` (to varianter), `ThemeToggleButton` (lokal komponent i filen).

### `useFitText.ts`
Måler elementets `scrollWidth` vs. `clientWidth` og sænker `font-size` trinvist ned til et minimum; passer det stadig ikke, må teksten ombrydes – aldrig afkortes. Har én `eslint-disable-next-line react-hooks/exhaustive-deps` (afhængighederne gives som parameter).

### `useDismissable(ref, open, onClose)`
Fælles "luk ved klik udenfor/Escape" for dropdowns.

---

## 2. Fil: `src/pages/dashboard/Dashboard.tsx` (`/dashboard`)

Tre topfaner i URL'en (`?tab=oversigt|organisation|administration`):

| Fane | Synlig for | Indhold |
|---|---|---|
| Oversigt | alle | `OverviewTab` |
| Organisation | alle | `OrganisationTab` (se `04-kode/03-…`) |
| Administration | kun hvis `useAdministrationTabs().length > 0` | `AdministrationTab` |

`resolveDashboardTab(tabParam, hasOrganisation)` (`src/utils/dashboardTab.ts`): ugyldig/ingen parameter → Oversigt med organisation, ellers Organisation. Mens organisationen hentes, antages der en, så siden ikke "hopper". Er Administration valgt, men ikke længere synlig, vises Oversigt – *afledt ved render*, ingen effect. Mønstret "afled i stedet for at synkronisere med `useEffect`" går igen i hele kodebasen og hænger sammen med React Compiler og `eslint-plugin-react-hooks` v7.

### `OverviewTab.tsx`
Uden organisation: opfordring til at oprette/anmode. Med organisation:
- `MyTasksWidget` – brugerens ikke-afsluttede opgaver (`getTasks` ∩ `getMyTaskIds`), sorteret med `compareTasks('priority')`; fane "Favoritrum" (`FavoriteRoomsList`). Valgt fane huskes i `localStorage` (bekvemmelighed).
- `NotificationsWidget` – seneste notifikationer (Alle/Ulæst).
- Genveje (`QuickLinkCard`): Datalager (kræver `read_datalayer`), Opgaver (**altid vist**), Statistik (kræver `read_statistics`).
- `NewsSlider` (kræver `read_news`).

> **Observeret – lille inkonsistens:** Genvejen til `/tasks` vises uden `read_tasks`-tjek, mens hovednavigationen skjuler Opgaver uden privilegiet. (Standardrollen Medlem har altid `read_tasks`, så det rammer kun brugerdefinerede roller.)

### Administration-paneler for opgaver
| Komponent | Ansvar |
|---|---|
| `TaskApprovalsPanel.tsx` (260) | Liste over ventende færdigmeldinger (`getPendingTaskRequests`), rum-filter, "Afvist n gange"-mærke, godkend/afvis (`TaskApprovalActions` + `RejectReasonInput`, begrundelse påkrævet) |
| `TaskApprovalDetailsModal.tsx` | `getTaskRequestDetails`: opgave, tilmeldte, materialer med *foreslåede* udfald (anvendes først ved godkendelse), tidligere afvisninger |
| `CompletedTasksPanel.tsx` (295) | Afsluttede opgaver (`getCompletedTasks`) med søgning (titel, rum, tilmeldte), sortering og periode; "Genåbn" via `updateTaskStatus` |

### Øvrige
`DashboardWidget.tsx` (kort med ikon/titel/"Se alle"/pille-faner), `QuickLinkCard.tsx`, `OrganisationHeader.tsx`.

---

## 3. Offentlige sider

| Rute | Fil | Bemærkning |
|---|---|---|
| `/` | `pages/landing/LandingPage.tsx` + `components/landing/*` | Hero, problem, tre hovedområder, data-flow, partner (CORO – indhold "faktuelt gengivet fra corolab.dk" ifølge kommentaren), CTA. Viser login/opret-knapper afhængigt af session. Kant-til-kant (`FULL_WIDTH_ROUTES`). |
| `/om-os` | `pages/public/AboutPage.tsx` | Hvorfor Ponos findes |
| `/kontakt` | `pages/public/ContactPage.tsx` | **Bevidst uden formular** ("der findes ingen modtager-tabel og ingen mail-backend"). Email/lokation fra `lib/contact.ts` (pladsholder). |
| `/hjaelp` | `pages/public/HelpPage.tsx` + `FaqItem`/`HelpStep` | FAQ på native `<details>/<summary>` (tilgængelighed og Ctrl+F gratis). Kommentaren siger svarene er skrevet ud fra koden – retter man adfærden, skal teksten følge med. |
| `*` | `pages/public/NotFoundPage.tsx` | Link til dashboard eller forside afhængigt af session |
| `/login`, `/signup`, `/glemt-adgangskode` | se `04-kode/02-…` | `AuthCard.tsx` er den fælles kort-ramme |

---

## 4. Responsivt design (observeret)

Tailwind-breakpoints bruges konsekvent (`sm:`, `md:`, `lg:`, `xl:`). Eksempler: dashboard-fanerne scroller vandret på telefon (`overflow-x-auto no-scrollbar`), opgavetavlens to kolonner bliver til faner under `lg` (`TaskColumnTabs`), beskedsiden viser ét panel ad gangen under `md`, header-navigationen bliver en hamburger under `lg`.
