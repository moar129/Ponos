# 13. Configuration og environment

## 13.1 Environment variables

| Variabel | Bruges i | Indhold | Hemmelig? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts` | Supabase-projektets URL | Nej |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts` | Offentlig anon-nøgle (JWT med rolle `anon`) | **Nej** – den er designet til at ligge i browseren; sikkerheden hviler på RLS |

- Ligger i `.env.local` (gitignored via `.env.local`/`.env.*.local`). Der er **ingen** `.env.example` i repoet; navnene står kun i advarslen i `supabase.ts`.
- Vite indlejrer kun variabler med `VITE_`-præfiks i bundlen (`import.meta.env`).
- Mangler de, bruges `https://placeholder-project.supabase.co` + `placeholder-anon-key` og der logges `console.warn` (se `04-kode/01-infrastruktur.md`).
- **Ingen** server-side secrets (fx `service_role`) bruges eller findes i repoet.

> **Anbefaling:** tilføj `.env.example` med de to navne, så en ny udvikler ved, hvad der skal sættes.

## 13.2 Konfigurationsfiler

| Fil | Indhold |
|---|---|
| `package.json` | Scripts: `dev` (vite), `build` (`tsc -b && vite build`), `lint` (`eslint .`), `preview`, `i18n:check`. `"type": "module"`, `"private": true`, version `0.0.0`. |
| `vite.config.ts` | Plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`, `@rolldown/plugin-babel` med `reactCompilerPreset()`. Ingen alias, proxy, `define` eller build-indstillinger (fx `chunkSizeWarningLimit`, `manualChunks`). |
| `tsconfig.json` | Project references til `tsconfig.app.json` (src) og `tsconfig.node.json` (vite.config.ts). |
| `tsconfig.app.json` | `target/lib ES2023 + DOM`, `moduleResolution: bundler`, `jsx: react-jsx`, `noEmit`, `resolveJsonModule` (locale-JSON som typer), `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals/Parameters`, `noFallthroughCasesInSwitch`. `strict` er ikke angivet, men er default i TypeScript 6 (verificeret). |
| `eslint.config.js` | Flat config: `js.recommended`, `tseslint.recommended`, `reactHooks.recommended` (v7, inkl. React Compiler-regler), `reactRefresh.vite`; ignorerer `dist`. |
| `index.html` | Pre-hydration-script (tema + sprog), Google Fonts (Inter), favicon fra `src/assets/logo/ponos_compass.svg`. |
| `src/index.css` | Tailwind v4-import, `@custom-variant dark`, `@theme`-tokens (farver, font), diagramfarver, `.rich-text`-typografi. |
| `src/i18n/config.ts`, `languages.ts` | Sprog/namespaces (se `04-kode/11-…`). |
| `src/lib/contact.ts` | Kontaktemail og lokation (pladsholdere). |
| `.gitignore` | `node_modules`, `dist`, `.env*.local`, editorfiler, ét bestemt CSV-navn – og det fejlbehæftede mønster `.docs/*Supabase*` (se `08-security.md`). |
| `CLAUDE.md` | Instruktioner til AI-assistenten + korte projektnoter (delvist forældet, se `16-teknisk-gaeld.md`). |

Der er **ingen** `tailwind.config.js` (Tailwind v4 konfigureres i CSS), ingen `.prettierrc`, ingen `.editorconfig`, ingen `.nvmrc`/`engines` (Node-version ikke fastlåst; observeret lokalt: Node v25.6.1).

## 13.3 Development vs. production

| | Development (`npm run dev`) | Production (`npm run build` → `dist/`) |
|---|---|---|
| Server | Vite dev-server med HMR | Statiske filer – kræver en statisk host |
| React | `StrictMode` (dobbelt-kørsel af effects) | Optimeret build |
| Backend | **Samme** Supabase-projekt, som `.env.local` peger på | Samme – der er ingen separat staging/production-konfiguration |
| Fejl | Konsol | Ingen fejlrapportering |

- **Deployment:** Der er ingen deploy-konfiguration i repoet (ingen Vercel/Netlify/GitHub Pages-filer, ingen Dockerfile). `docs/Project.md` har et afsnit "Deployment", men koden bekræfter ikke noget mål. `dbSchema.sql` siger "projektet deployes ikke".
- **SPA-routing:** `BrowserRouter` kræver, at hosten serverer `index.html` for ukendte stier (fx `/tasks/mine` ved F5). Ingen sådan konfiguration findes i repoet – **uklart**, hvordan det håndteres, hvis appen deployes.

## 13.4 Database-konfiguration
Alt konfigureres i Supabase-dashboardet og via SQL Editor (se `06-database.md` §6.9). Indstillinger, der påvirker appen, men **ikke kan ses i repoet** (alle **uklare**):
- Auth: "Confirm email", minimum password-længde, lækkede-password-tjek, rate limits.
- PostgREST: `max_rows` (påvirker klient-aggregering, se `10-performance.md`).
- Realtime: hvilke tabeller der er i publikationen `supabase_realtime`.
- CORS/tilladte redirect-URL'er.

## 13.5 Feature flags
Der er ingen feature-flag-mekanisme i frontend. Det nærmeste er:
- **Transaktions-lokale "bypass"-flag i databasen** (`ponos.bypass_*`, `ponos.skip_task_completed_notify`) – ikke feature flags, men midlertidig ophævelse af triggerregler inde i RPC'er (se `06-database.md` §6.5).
- **Prototype-funktionalitet**, der skal skiftes ud før deployment: `reset_password_prototype`.

## 13.6 Hardcodede værdier der bør kendes
| Værdi | Hvor | Bemærkning |
|---|---|---|
| `'Admin'`, `'Medlem'` | `roleApi.ts` + DB-triggere/RPC'er | Systemroller identificeret på navn |
| Privilegienavne | `privilegeApi.ts` + RLS | Fri tekst |
| `MAX_SAVED_COLORS = 12` | `organisationApi.ts` | |
| `limit(20)` i org-søgning, `limit 50` notifikationer | API-filer | |
| `MIN_PASSWORD_LENGTH = 6` | `validatePassword.ts` (+ DB) | |
| `CONTACT_EMAIL = 'info@ponos.dk'` | `lib/contact.ts` | Pladsholder |
| Brand-farver | `index.css`, `orgPalette.ts` | Defaults; overskrives pr. org |
| Ingen API-nøgler/credentials hardcodet | – | ✔ |

Ubrugte filer: `public/favicon.svg` og `public/icons.svg` refereres ikke af `index.html` eller `src/` (sandsynligvis rester fra Vite-skabelonen).
