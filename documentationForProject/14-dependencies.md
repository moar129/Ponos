# 14. Dependencies

Versioner = installerede versioner i `node_modules` (2026-10-01); `package.json` bruger `^`-ranges (`~` for TypeScript), og `package-lock.json` er committet. `npm audit` er bevidst **ikke** kørt (efter aftale) – sårbarhedsstatus er derfor **ikke vurderet**.

## 14.1 Runtime-dependencies (10)

| Pakke | Version | Bruges til | Hvor | Nødvendig? |
|---|---|---|---|---|
| `react`, `react-dom` | 19.2.8 | UI | overalt; `createRoot` i `main.tsx`, `createPortal` i `Modal` | Ja |
| `@supabase/supabase-js` | 2.112.4 | Auth, PostgREST, RPC, Realtime | kun `src/lib/supabase.ts` + `store/apis/*` (+ Login/SignUp) | Ja – eneste backend-adgang |
| `@reduxjs/toolkit` | 2.12.0 | Store, slices, **RTK Query** | `store/*` | Ja |
| `react-redux` | 9.3.0 | `Provider`, `useDispatch/useSelector` | `main.tsx`, `store/hooks/hooks.ts` | Ja |
| `react-router-dom` | 7.18.2 | Routing, `useSearchParams` som URL-state | `App.tsx`, mange sider | Ja |
| `i18next` | 26.4.2 | Oversættelser, flertal, lazy-load | `i18n/config.ts`, `ErrorMessage.ts`, `formatDate.ts` | Ja |
| `react-i18next` | 17.0.14 | `useTranslation`, `I18nextProvider` | overalt | Ja |
| `recharts` | 3.10.1 | Diagrammer | kun 3 filer i `components/statistics/` | Ja, men tung – kandidat til lazy-load med statistiksiden |
| `lucide-react` | 1.34.0 | Ikoner | 91 filer (navngivne imports → tree-shakeable) | Ja |

Ingen dependency ser overflødig ud. Bevidste *fravalg* (dokumenteret i kommentarer): ingen editor-library (egen `RichTextEditor` på `execCommand`), ingen formular-library, ingen dato-library (native `Intl`), ingen typography-plugin til Tailwind, ingen UI-komponentbibliotek.

## 14.2 Dev-dependencies (18)

| Pakke | Version | Formål |
|---|---|---|
| `vite` | 8.2.2 | Dev-server og bundler (Rolldown-baseret i v8) |
| `@vitejs/plugin-react` | ^6.1.0 | React/JSX + `reactCompilerPreset` |
| `@rolldown/plugin-babel` + `@babel/core` + `@types/babel__core` | ^0.2.3 / ^7.29.7 | Kører Babel-pluginet til React Compiler |
| `babel-plugin-react-compiler` | ^1.0.0 | Automatisk memoisering |
| `tailwindcss` + `@tailwindcss/vite` | 4.3.3 | Styling |
| `typescript` | 6.0.3 | Typecheck (`tsc -b`) |
| `@types/react`, `@types/react-dom`, `@types/node` | 19.x / 24.x | Typer |
| `eslint` | ^10.9.0 | Linting |
| `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks` (^7.1.1), `eslint-plugin-react-refresh`, `globals` | | ESLint-regler |

## 14.3 Version- og kompatibilitetsbemærkninger

- **Meget nye major-versioner** overalt: React 19, Vite 8, TypeScript 6, ESLint 10, Tailwind 4, React Router 7, i18next 26, Recharts 3, `lucide-react` 1.x. Fordel: moderne features (React Compiler, TS 6-defaults, Vite 8/Rolldown). Ulempe: færre StackOverflow-svar og større risiko for, at tredjepartsplugins halter bagefter.
- **TypeScript 6** ændrer defaults (bl.a. `strict` slået til som standard). Opgraderes til TypeScript 7 (den native compiler), bør `tsconfig` gøres eksplicit (`"strict": true`), så adfærden ikke afhænger af defaults.
- **`@rolldown/plugin-babel` 0.2.x** er en 0.x-version (API kan ændre sig) og står for 71 % af byggetiden.
- **`document.execCommand`** (browser-API, ikke npm) er deprecated – ingen erstatning planlagt i koden.
- **Node-version** er ikke fastlåst (`engines`/`.nvmrc` mangler); Vite 8 kræver en nyere Node (lokalt observeret v25.6.1).
- `@types/node` ^24 bruges kun til `vite.config.ts` (`tsconfig.node.json`).

## 14.4 Eksterne tjenester (runtime)

| Tjeneste | Brug |
|---|---|
| Supabase (Auth, Postgres/PostgREST, Realtime) | Hele backenden |
| Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) | Skrifttypen Inter (indlæses ved hver sidevisning; lækker besøgendes IP til Google – relevant ift. GDPR) |
| Vilkårlige billed-URL'er | Profilbilleder og nyhedsbilleder (`<img src>`) |
