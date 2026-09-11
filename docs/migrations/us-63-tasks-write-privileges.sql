-- =====================================================================
-- US-63: Granulære skriverettigheder i Opgaver (Fase 2)
--
--        *** MÅ IKKE KØRES ENDNU ***
--
-- Status:  BLOKERET - 3 ubesvarede spørgsmål (se nedenfor) + Studerende 3
--          arbejder aktivt i Tasks-domænet (seneste commit 2026-09-11).
-- Skrevet: 2026-09-11, ud fra en fuld skema-eksport af den FAKTISKE
--          database - ikke ud fra dbSchema.sql, som var forældet.
-- =====================================================================
--
-- UBESVAREDE SPØRGSMÅL - afklar FØR kørsel
--
-- 1) task_assignees: "Tilmeld/Afmeld" er i dag SELVBETJENING.
--    src/store/apis/taskApi.ts's assignToTask/unassignFromTask inserter
--    og sletter med auth.uid() - enhver kan til-/afmelde SIG SELV.
--    Gates task_assignees blankt bag manage_tasks, kan menige medlemmer
--    ikke længere tilmelde sig en opgave. Det ville ÆNDRE eksisterende
--    adfærd, ikke bare stramme den.
--    Forslaget nedenfor (afsnit D) splitter i to policies:
--    selvbetjening for egen række, manage_tasks for andres. Skal
--    bekræftes med bruger/Studerende 3.
--
-- 2) Opgavestatus: updateTaskStatus skriver til `tasks`, så gating af
--    tasks bag manage_tasks blokerer også en tilmeldt menig bruger i at
--    markere sin egen opgave færdig. Skal det være muligt, kræver det en
--    ekstra, kolonne-begrænset policy (RLS kan ikke begrænse til
--    bestemte kolonner alene - det kræver enten en column-grant eller en
--    security definer-RPC à la set_task_status()).
--
-- 3) task_rooms.required_role_id (FK -> roles, on delete set null)
--    findes i skemaet og i src/types/Task/Task.ts, men bruges ingen
--    steder - hverken i query eller UI. Det er Studerende 3's eget
--    rolle-gate-koncept på rum-niveau. Et fladt `manage_tasks` og et
--    rum-niveau `required_role_id` er to forskellige adgangsmodeller.
--    Skal afklares med Studerende 3, ikke besluttes af os.
--
-- ÅBENT, MEN IKKE BLOKERENDE
-- 4) Hvem laver frontend-gatingen i TaskPage.tsx / CreateTaskModal.tsx /
--    EditTaskModal.tsx / RoomBar.tsx - Studerende 3 efter vores note,
--    eller os? Besluttes når Tasks-domænet er stabilt.
-- 5) `tasks` har ingen created_by-kolonne. En "opret-ejeren må redigere
--    sin egen opgave"-regel ville kræve en ny kolonne først.
--
-- FÆLDE - LÆS FØR DU KØRER AFSNIT C
-- task_rooms har FIRE policies i databasen, ikke to. Ud over de to
-- danske findes to engelske duplikater fra Studerende 3:
--   "Users can view task rooms in their organisation"   (select)
--   "Users can create task rooms in their organisation" (insert)
-- De inliner profiles.active_organisation_id i stedet for at kalde
-- auth_profile_org(). Fordi RLS-policies OR'es, er det IKKE nok at gate
-- `for all`-policyen: INSERT slipper stadig igennem via den engelske
-- policy. Begge duplikater skal droppes. De tilhører Studerende 3, så
-- det kræver aftale med dem.
-- =====================================================================


-- ---------------------------------------------------------------------
-- A) TASKS
-- ---------------------------------------------------------------------
-- OBS spørgsmål 2 ovenfor: denne policy gater også updateTaskStatus.
drop policy "Medlemmer kan oprette/redigere/slette opgaver i egen organisation" on public.tasks;

create policy "Administrer opgaver i egen organisation"
  on public.tasks for all
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_tasks')
  )
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_tasks')
  );


-- ---------------------------------------------------------------------
-- B) TASK_PARTICIPANTS + TASK_MATERIALS
-- ---------------------------------------------------------------------
drop policy "Administrer task_participants for opgaver i egen organisation" on public.task_participants;

create policy "Administrer task_participants for opgaver i egen organisation"
  on public.task_participants for all
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('manage_tasks')
  )
  with check (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('manage_tasks')
  );

drop policy "Administrer task_materials for opgaver i egen organisation" on public.task_materials;

create policy "Administrer task_materials for opgaver i egen organisation"
  on public.task_materials for all
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('manage_tasks')
  )
  with check (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('manage_tasks')
  );


-- ---------------------------------------------------------------------
-- C) TASK_ROOMS - kræver at duplikaterne droppes først (se FÆLDE)
-- ---------------------------------------------------------------------
drop policy "Users can create task rooms in their organisation" on public.task_rooms;
drop policy "Users can view task rooms in their organisation" on public.task_rooms;

-- "Se task rooms i egen organisation" (select) bevares uændret -
-- læseadgang forbliver åben for alle organisationsmedlemmer.

drop policy "Medlemmer kan administrere task rooms i egen organisation" on public.task_rooms;

create policy "Administrer task rooms i egen organisation"
  on public.task_rooms for all
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_tasks')
  )
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_tasks')
  );


-- ---------------------------------------------------------------------
-- D) TASK_ASSIGNEES - FORSLAG, afhænger af spørgsmål 1
-- ---------------------------------------------------------------------
-- Variant (a) - ANBEFALET: selvbetjening bevares.
-- Enhver i organisationen må til-/afmelde SIG SELV; manage_tasks kræves
-- kun for at til-/afmelde ANDRE. To policies, som OR'es.
drop policy "Administrer task_assignees for opgaver i egen organisation" on public.task_assignees;

create policy "Til- og afmeld sig selv fra opgaver i egen organisation"
  on public.task_assignees for all
  to authenticated
  using (
    user_id = auth.uid()
    and task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
  )
  with check (
    user_id = auth.uid()
    and task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
  );

create policy "Administrer andres tilmeldinger i egen organisation"
  on public.task_assignees for all
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('manage_tasks')
  )
  with check (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('manage_tasks')
  );

-- Variant (b) - hvis selvbetjening bevidst skal lukkes: drop begge
-- policies ovenfor og brug i stedet én enkelt, gated som B).
-- Bemærk at TaskCard.tsx's "Tilmeld"-knap så skal gates i frontenden,
-- ellers får menige brugere en 42501-fejl når de trykker.


-- =====================================================================
-- "HVEM MISTER ADGANG" - KØR FØR MIGRATIONEN (read-only)
-- =====================================================================
-- select
--   o.name                                as organisation,
--   p.first_name || ' ' || p.last_name    as medlem,
--   p.email,
--   coalesce(r.name, '(ingen rolle)')     as rolle
-- from public.memberships m
-- join public.organisations o on o.id = m.organisation_id
-- join public.profiles      p on p.id = m.user_id
-- left join public.roles    r on r.id = m.role_id
-- where not exists (
--   select 1 from public.privileges pv
--   where pv.role_id = m.role_id
--     and pv.name in ('manage_tasks', 'admin')
-- )
-- order by o.name, medlem;


-- =====================================================================
-- FRONTEND (når SQL'en køres)
-- =====================================================================
-- MANAGE_TASKS_PRIVILEGE findes allerede i
-- src/store/apis/privilegeApi.ts (tilføjet 2026-09-11, så privilegiet
-- kan tildeles FØR denne SQL køres).
--
-- Mangler - alt sammen Studerende 3's filer:
--  - src/pages/Task/TaskPage.tsx: "Opret opgave"-knap + RoomBar's
--    opret-rum (useCreateRoomMutation)
--  - src/components/Task/CreateTaskModal.tsx
--  - src/components/Task/EditTaskModal.tsx: gem + slet
--  - src/components/Task/TaskCard.tsx: RØRES IKKE hvis variant (a)
--    vælges - tilmeld/afmeld forbliver selvbetjening
--  - 42501-fejlbeskeder i src/store/apis/taskApi.ts's mutations


-- =====================================================================
-- ROLLBACK (gendanner den åbne adgang for alle medlemmer)
-- =====================================================================
-- drop policy "Administrer opgaver i egen organisation" on public.tasks;
-- create policy "Medlemmer kan oprette/redigere/slette opgaver i egen organisation"
--   on public.tasks for all to authenticated
--   using (organisation_id = public.auth_profile_org())
--   with check (organisation_id = public.auth_profile_org());
--
-- drop policy "Administrer task_participants for opgaver i egen organisation" on public.task_participants;
-- create policy "Administrer task_participants for opgaver i egen organisation"
--   on public.task_participants for all to authenticated
--   using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()))
--   with check (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));
--
-- drop policy "Administrer task_materials for opgaver i egen organisation" on public.task_materials;
-- create policy "Administrer task_materials for opgaver i egen organisation"
--   on public.task_materials for all to authenticated
--   using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()))
--   with check (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));
--
-- drop policy "Administrer task rooms i egen organisation" on public.task_rooms;
-- create policy "Medlemmer kan administrere task rooms i egen organisation"
--   on public.task_rooms for all to authenticated
--   using (organisation_id = public.auth_profile_org())
--   with check (organisation_id = public.auth_profile_org());
-- create policy "Users can create task rooms in their organisation"
--   on public.task_rooms for insert to authenticated
--   with check (organisation_id = (select active_organisation_id from public.profiles where id = auth.uid()));
-- create policy "Users can view task rooms in their organisation"
--   on public.task_rooms for select to authenticated
--   using (organisation_id = (select active_organisation_id from public.profiles where id = auth.uid()));
--
-- drop policy "Til- og afmeld sig selv fra opgaver i egen organisation" on public.task_assignees;
-- drop policy "Administrer andres tilmeldinger i egen organisation" on public.task_assignees;
-- create policy "Administrer task_assignees for opgaver i egen organisation"
--   on public.task_assignees for all to authenticated
--   using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()))
--   with check (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));
