# docs/migrations

Kørselsklare SQL-uddrag. Én fil pr. ændring, beregnet til at blive kopieret direkte ind i **Supabase SQL Editor**.

## Konvention

- **Filnavn:** `<user story>-<kort beskrivelse>.sql`, eller `<ÅÅÅÅ-MM-DD>-<kort beskrivelse>.sql` for rettelser uden en story.
- **Header i hver fil:** hvad den gør, hvilken user story den hører til, og om den er kørt endnu.
- **Rollback nederst** som kommentar — så en ændring altid kan rulles tilbage uden at skulle genudledes.
- **Brugeren kører selv SQL'en** i Supabase SQL Editor. Claude skriver den, kører den aldrig.
- **Efter en fil er kørt og bekræftet:** opdatér `docs/dbSchema.sql` og status-rækken i `docs/studerende1-plan.md` — og **slet så filen her**.

Den sidste regel er bevidst: når ændringen står i `dbSchema.sql`, er filen ren dublet, og git har den, hvis den nogensinde skal frem igen. Mappen indeholder derfor altid kun det, der **mangler** at blive kørt — ikke en voksende bunke historik. Færdigt arbejde dokumenteres i prosa i `studerende1-plan.md`, som resten af projektet allerede gør (se US-59-, US-64- og US-66/67-afsnittene dér).

`docs/dbSchema.sql` er fortsat den samlede, autoritative dokumentation af hele skemaet. Filerne her er kørselsklare uddrag af den — ikke en erstatning.

## Venter på at blive kørt

Ingen.

Kørt og slettet: `2026-09-11-fix-memberships-role-guard.sql` (US-11, Fase 1-bugfix); `fase3-medlem-rolle.sql`, `fase3-roles-organisation-privileges.sql`, `fase3-membership-members-invitations-privileges.sql`, `fase3-news-privileges.sql`, tre Fase 3-bugfixes (privileges-self-read, roles-self-read, migrér gamle privilegienavne), og `fase3-datalayer-privileges.sql` (US-62) — alle 2026-09-15. `2026-09-17-rename-request-status-enum.sql` (rettelse, generaliserer enum-navn), `fase3-tasks-privileges.sql` (Fase 3 trin 6, US-63 — erstatter den tidligere `us-63-tasks-write-privileges.sql`, slettet 2026-09-15, aldrig kørt; oprindelig kørsel tog tilsyneladende ikke - genkørt idempotent 2026-09-17), `2026-09-17-tasks-assignee-privilege-fix.sql` (flytter tilmeld/afmeld-EN-ANDEN fra create_tasks/delete_tasks til update_tasks), og `2026-09-17-set-task-status-enum-cast.sql` (manglende text→enum-cast, fejlede ved "Genåbn") — alle 2026-09-17. `2026-09-18-lock-medlem-privileges.sql` (låser Medlems privilegie-sæt fast mod tilføj/slet/omdøb, se 15.6d; inkl. et idempotent backfill af read_tasks til organisationer, hvis Medlem-rolle ikke var ramt af fase3-tasks-privileges.sql's backfill), `2026-09-18-protect-admin-membership-role-change.sql` (lukker hul hvor en bruger med kun update_roles kunne fjerne admin-status fra en anden administrator via rolle-dropdownen, se 15.6e), `2026-09-18-single-admin-handoff.sql` (håndhæver højst én admin ad gangen pr. organisation; ny RPC transfer_admin_role, 15.14b, til atomisk hand-off — udvider 15.6e og 15.9) — alle 2026-09-18, og `2026-09-19-lock-admin-privilege-to-admin-role.sql` (strammer escalation-guarden på `public.privileges` §16.4 så admin-privilegiet kun kan tildeles rollen "Admin" — bekræftet i live databasen via `pg_policy`) — 2026-09-19. `2026-09-19-task-approval.sql` (US-75: RPC'er approve/reject/get_pending_task_requests, task_requests-policies, finished_at i set_task_status) og `2026-09-19-task-approval-notifications.sql` (task_approved/task_rejected-notifikationer, skip-flag i notify_task_completed) — begge 2026-09-19, testet i browseren. `2026-09-19-task-assignment-rules.sql` (US-76: privilegiet `assign_tasks` + backfill, `task_assignees`-policies splittet — afmeld kun selv-tilmeldt og kun i Started, trigger der tvinger `assigned_by`; testet i browseren) — 2026-09-19. Se `dbSchema.sql` og "Fase 3"-afsnittet i `studerende1-plan.md` for detaljer.

## Drift-tjek

`docs/exportSchema.sql` henter hele det faktiske skema (enums, kolonner, constraints, indexes, RLS-status, policies, funktioner, triggers, grants) ud af Supabase som CSV. Kør den, hvis du er i tvivl om `dbSchema.sql` stadig matcher virkeligheden — det gjorde den ikke 2026-09-11, hvor 7 udokumenterede objekter dukkede op.

CSV-resultatet er et øjebliksbillede og gemmes **ikke** i repoet — det bliver misvisende, så snart nogen ændrer noget. Slet det efter brug.
