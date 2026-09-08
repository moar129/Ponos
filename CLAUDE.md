# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- In all interactions and commit messages, be extremely concise and sacrifice grammer for the sake of concision.

## Project overview

Ponos is a multi-tenant platform for organizational data/resource tracking, task coordination, and auto-generated insight, built generically (not tied to its pilot case, Roskilde Festival). It answers three questions: "What do we have?" (Datalayer), "Who does what?" (Tasks), "What does the data tell us?" (Dashboard/Statistics).

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — `tsc -b && vite build` (this is also the typecheck; there is no separate typecheck script)
- `npm run lint` — eslint
- `npm run preview` — preview the production build

There is no test framework configured in this repo (no vitest/jest, no `*.test.*` files).

## Architecture

- Vite + React 19 + TypeScript. Tailwind v4 is wired in purely via the `@tailwindcss/vite` plugin — there is no `tailwind.config.js`. The React Compiler is enabled via `babel-plugin-react-compiler` in `vite.config.ts`.
- Frontend-only repo. The backend is Supabase (Postgres + Auth), called directly from the client via the singleton in `src/lib/supabase.ts`. `docs/dbSchema.sql` documents the schema.
- **State**: Redux Toolkit + RTK Query, built around one shared API instance, `supabaseApi` (`src/store/apis/supabaseApi.ts`, `createApi` + `fakeBaseQuery`, with the app's `tagTypes` declared there). Feature API files (`authApi.ts`, `membershipApi.ts`, `dataLayerApi.ts`) call `supabaseApi.injectEndpoints(...)` rather than creating separate `createApi` instances — follow this pattern for new server-state features.
  - Endpoints use `queryFn` (not `query:`) to call the Supabase client directly, since there's no REST base URL.
  - `dataLayerApi.ts` also has a client-side `buildCategoryTree` helper that turns flat category/item rows into a nested tree.
  - `src/store/slices/taskSlices.ts` is an older `createSlice`/`createAsyncThunk` pattern that predates the RTK Query migration. New server-state work should use the RTK Query pattern above, not this one.
  - Typed hooks: `src/store/hooks/hooks.ts` (`useAppDispatch`/`useAppSelector`).
- **Routing**: react-router-dom v7, routes declared in `src/App.tsx`. `src/routes/ProtectedRoute/ProtectedRoute.tsx` gates authenticated routes using `useGetSessionQuery` (RTK Query), not local auth state.
- **Component organization**: feature folders under both `src/components/<feature>/` and `src/pages/<feature>/`. Prop types are extracted into the matching `src/types/<domain>/` file rather than declared inline in the component file — follow this split for new components.
- **Domain model** (multi-tenant): `Organization → Users/Roles/Permissions`, `Categories → Items → Locations`, `Tasks → Users/Items`. All data must be scoped to an organization, and that isolation must be enforced server-side via Supabase Row Level Security — frontend/UI checks alone are not sufficient.

## Project-specific development principles

(condensed from `docs/Project.md` — read it directly for full detail)

- Stay generic: Roskilde Festival is a pilot case, not the data model. Don't hardcode logic that only makes sense for it.
- Reuse data across features instead of duplicating it (Datalayer → Items → Tasks → Statistics should reference existing records, not copy them).
- Statistics/dashboard values must be derived automatically from existing data, never manually entered.
- Strong typing throughout; avoid `any` unless technically unavoidable.
- Use RTK Query (`injectEndpoints` on `supabaseApi`) for all server/database state; use Redux Toolkit slices only for genuine global client state.
- Keep UI, business logic, and data access separated; keep components small and focused.
- Security and organization-isolation must be enforced server-side (Supabase RLS) — frontend permission checks are UX convenience only, never the actual access control.
- Before adding new code, check for existing components/hooks/endpoints/patterns to reuse rather than introducing a new approach without a concrete reason.
- Before considering a change done: verify it builds/lints/typechecks cleanly, and that loading, error, and empty states, permissions, and organization-isolation are all handled.

## Notes

- `docs/` (`Project.md`, `userStories.md`, `dbSchema.sql`) is tracked in git — consult it for the full product spec, user stories, and DB schema when deeper context is needed.
- `docs/studerende1-plan.md` — progress tracker for Student 1's user stories (Access, Organisation & Overview). Check "Næste op" at the top for the current task; update it after finishing a story.
- Code (identifiers, comments) is written in English. UI-facing text (labels, buttons, errors) stays Danish — the product is for Danish speakers.
- Git commits are made by the user, not Claude.
- No CI and no Docker setup exist in this repo.

## Plans
- At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise. Sacrifice grammer for the sake of concision.
- At the end of a planing session dont go to code, ask me if iam ready to code.