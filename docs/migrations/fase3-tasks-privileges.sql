-- =====================================================================
-- Fase 3, trin 6: Granulære CRUD-privilegier - Opgaver
-- Status: IKKE KØRT - VENT MED AT KØRE
-- Skrevet: 2026-09-15
-- Forudsætning: fase3-medlem-rolle.sql er kørt.
-- Erstatter: den slettede us-63-tasks-write-privileges.sql (designet om
-- fra ét manage_tasks til fuldt CRUD - aldrig kørt).
-- =====================================================================
--
-- HVAD DEN GØR
-- Fuldt CRUD på tasks/task_participants/task_materials/task_rooms:
-- create_tasks/read_tasks/update_tasks/delete_tasks. LÆSNING GATES NU
-- OGSÅ (var åben for alle org-medlemmer).
--
-- Løser de to første blokerings-spørgsmål fra den gamle US-63-fil:
--
-- 1) task_assignees SELVBETJENING BEVARES uafhængigt af privilegier -
--    enhver må til-/afmelde SIG SELV. At tilmelde/afmelde EN ANDEN
--    kræver hhv. create_tasks/delete_tasks (semantisk: tilmelding er en
--    insert, afmelding en delete - ikke en "opdatering").
--
-- 2) Opgavestatus: RLS kan ikke begrænse til én kolonne, så en tilmeldt
--    brugers "markér som færdig" (som skriver direkte til tasks.status)
--    ville blive blokeret af den generelle tasks-UPDATE-policy (kræver
--    update_tasks). Løst med en ny, snæver security definer-RPC
--    `set_task_status(p_task_id, p_status)`: tillader ENTEN en, der selv
--    er tilmeldt opgaven, ELLER update_tasks/admin. Kun denne RPC (ikke
--    en rå UPDATE) kan ændre status uden update_tasks.
--
-- 3) task_rooms.required_role_id (ubrugt kolonne, konkurrerende
--    rum-niveau adgangskoncept) RØRES IKKE - stadig uafklaret, kræver
--    Studerende 3's input. Ikke en del af denne fil.
--
-- FÆLDE (uændret fra den gamle fil): task_rooms har FIRE policies, to
-- danske + to engelske dubletter fra Studerende 3 ("Users can view/
-- create task rooms in their organisation"), som inliner
-- profiles.active_organisation_id. RLS-policies OR'es, så begge
-- dubletter SKAL droppes samtidig, ellers er gatingen af INSERT
-- virkningsløs.
--
-- VENT MED AT KØRE denne fil OG med at skrive frontend-koden til
-- følgende er aftalt med Studerende 3 (aktivt i domænet):
--  - Må vi ændre TaskPage.tsx/TaskCard.tsx/EditTaskModal.tsx/taskApi.ts?
--  - Holdning til task_rooms.required_role_id - ryddes op, eller
--    ignoreres fortsat?
-- Se docs/studerende1-plan.md, Fase 3-checkpoint, for de præcise
-- spørgsmål.
--
-- FØR DU KØRER: se "HVEM MISTER ADGANG"-queryen nederst.
-- =====================================================================


-- ---------------------------------------------------------------------
-- A) TASKS
-- ---------------------------------------------------------------------
drop policy "Se opgaver i egen organisation" on public.tasks;
create policy "Se opgaver i egen organisation"
  on public.tasks for select
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('read_tasks'));

drop policy "Medlemmer kan oprette/redigere/slette opgaver i egen organisation" on public.tasks;

create policy "Opret opgaver i egen organisation"
  on public.tasks for insert
  to authenticated
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('create_tasks'));

create policy "Rediger opgaver i egen organisation"
  on public.tasks for update
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_tasks'))
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_tasks'));

create policy "Slet opgaver i egen organisation"
  on public.tasks for delete
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('delete_tasks'));


-- ---------------------------------------------------------------------
-- B) selvbetjent statusskift - løser spørgsmål 2
-- ---------------------------------------------------------------------
create or replace function public.set_task_status(p_task_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
  v_is_assignee boolean;
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.';
  end if;

  if not exists (select 1 from public.tasks where id = p_task_id and organisation_id = v_org_id) then
    raise exception 'Opgaven findes ikke i din organisation.';
  end if;

  v_is_assignee := exists (
    select 1 from public.task_assignees where task_id = p_task_id and user_id = auth.uid()
  );

  if not (v_is_assignee or public.has_privilege_or_admin('update_tasks')) then
    raise exception 'Du har ikke rettigheder til at ændre denne opgaves status.';
  end if;

  update public.tasks set status = p_status where id = p_task_id;
end;
$$;

grant execute on function public.set_task_status(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- C) TASK_PARTICIPANTS + TASK_MATERIALS
-- ---------------------------------------------------------------------
drop policy "Se task_participants for opgaver i egen organisation" on public.task_participants;
create policy "Se task_participants for opgaver i egen organisation"
  on public.task_participants for select
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('read_tasks')
  );

drop policy "Administrer task_participants for opgaver i egen organisation" on public.task_participants;

create policy "Administrer task_participants for opgaver i egen organisation"
  on public.task_participants for all
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('update_tasks')
  )
  with check (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('update_tasks')
  );

drop policy "Se task_materials for opgaver i egen organisation" on public.task_materials;
create policy "Se task_materials for opgaver i egen organisation"
  on public.task_materials for select
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('read_tasks')
  );

drop policy "Administrer task_materials for opgaver i egen organisation" on public.task_materials;

create policy "Administrer task_materials for opgaver i egen organisation"
  on public.task_materials for all
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('update_tasks')
  )
  with check (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('update_tasks')
  );


-- ---------------------------------------------------------------------
-- D) TASK_ROOMS - drop dubletterne først (se FÆLDE ovenfor)
-- ---------------------------------------------------------------------
drop policy "Users can create task rooms in their organisation" on public.task_rooms;
drop policy "Users can view task rooms in their organisation" on public.task_rooms;

drop policy "Se task rooms i egen organisation" on public.task_rooms;
create policy "Se task rooms i egen organisation"
  on public.task_rooms for select
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('read_tasks'));

drop policy "Medlemmer kan administrere task rooms i egen organisation" on public.task_rooms;

create policy "Opret task rooms i egen organisation"
  on public.task_rooms for insert
  to authenticated
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('create_tasks'));

create policy "Rediger task rooms i egen organisation"
  on public.task_rooms for update
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_tasks'))
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_tasks'));

create policy "Slet task rooms i egen organisation"
  on public.task_rooms for delete
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('delete_tasks'));


-- ---------------------------------------------------------------------
-- E) TASK_ASSIGNEES - selvbetjening bevares (løser spørgsmål 1)
-- ---------------------------------------------------------------------
drop policy "Se task_assignees for opgaver i egen organisation" on public.task_assignees;
create policy "Se task_assignees for opgaver i egen organisation"
  on public.task_assignees for select
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('read_tasks')
  );

drop policy "Administrer task_assignees for opgaver i egen organisation" on public.task_assignees;

-- Enhver må til-/afmelde SIG SELV, uafhængigt af privilegier.
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

-- Tilmelde EN ANDEN = insert af en ny række = create_tasks.
create policy "Tilmeld andre til opgaver i egen organisation"
  on public.task_assignees for insert
  to authenticated
  with check (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('create_tasks')
  );

-- Afmelde EN ANDEN = delete af en række = delete_tasks.
create policy "Afmeld andre fra opgaver i egen organisation"
  on public.task_assignees for delete
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('delete_tasks')
  );


-- =====================================================================
-- "HVEM MISTER ADGANG" - KØR DENNE FØR MIGRATIONEN (read-only)
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
--     and pv.name in ('create_tasks', 'read_tasks', 'update_tasks', 'delete_tasks', 'admin')
-- )
-- order by o.name, medlem;


-- =====================================================================
-- FRONTEND (Studerende 3's filer - se checkpoint i studerende1-plan.md)
-- =====================================================================
--  - src/pages/Task/TaskPage.tsx: "Opret opgave"-knap, RoomBar's opret-
--    rum, tom-tilstand uden read_tasks.
--  - src/components/Task/CreateTaskModal.tsx.
--  - src/components/Task/EditTaskModal.tsx: gem + slet.
--  - src/components/Task/TaskCard.tsx: RØRES IKKE for tilmeld/afmeld sig
--    selv (forbliver selvbetjening) - kun rediger/slet-knapper gates.
--  - src/store/apis/taskApi.ts: 42501-fejlbeskeder i mutationerne, OG
--    updateTaskStatus omlægges fra en direkte .update() til at kalde den
--    nye set_task_status-RPC.


-- =====================================================================
-- ROLLBACK (gendanner den åbne adgang for alle medlemmer)
-- =====================================================================
-- drop policy "Se opgaver i egen organisation" on public.tasks;
-- drop policy "Opret opgaver i egen organisation" on public.tasks;
-- drop policy "Rediger opgaver i egen organisation" on public.tasks;
-- drop policy "Slet opgaver i egen organisation" on public.tasks;
-- create policy "Se opgaver i egen organisation"
--   on public.tasks for select to authenticated
--   using (organisation_id = public.auth_profile_org());
-- create policy "Medlemmer kan oprette/redigere/slette opgaver i egen organisation"
--   on public.tasks for all to authenticated
--   using (organisation_id = public.auth_profile_org())
--   with check (organisation_id = public.auth_profile_org());
--
-- drop function public.set_task_status(uuid, text);
--
-- drop policy "Se task_participants for opgaver i egen organisation" on public.task_participants;
-- drop policy "Administrer task_participants for opgaver i egen organisation" on public.task_participants;
-- create policy "Se task_participants for opgaver i egen organisation"
--   on public.task_participants for select to authenticated
--   using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));
-- create policy "Administrer task_participants for opgaver i egen organisation"
--   on public.task_participants for all to authenticated
--   using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()))
--   with check (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));
--
-- drop policy "Se task_materials for opgaver i egen organisation" on public.task_materials;
-- drop policy "Administrer task_materials for opgaver i egen organisation" on public.task_materials;
-- create policy "Se task_materials for opgaver i egen organisation"
--   on public.task_materials for select to authenticated
--   using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));
-- create policy "Administrer task_materials for opgaver i egen organisation"
--   on public.task_materials for all to authenticated
--   using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()))
--   with check (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));
--
-- drop policy "Se task rooms i egen organisation" on public.task_rooms;
-- drop policy "Opret task rooms i egen organisation" on public.task_rooms;
-- drop policy "Rediger task rooms i egen organisation" on public.task_rooms;
-- drop policy "Slet task rooms i egen organisation" on public.task_rooms;
-- create policy "Se task rooms i egen organisation"
--   on public.task_rooms for select to authenticated
--   using (organisation_id = public.auth_profile_org());
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
-- drop policy "Se task_assignees for opgaver i egen organisation" on public.task_assignees;
-- drop policy "Til- og afmeld sig selv fra opgaver i egen organisation" on public.task_assignees;
-- drop policy "Tilmeld andre til opgaver i egen organisation" on public.task_assignees;
-- drop policy "Afmeld andre fra opgaver i egen organisation" on public.task_assignees;
-- create policy "Se task_assignees for opgaver i egen organisation"
--   on public.task_assignees for select to authenticated
--   using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));
-- create policy "Administrer task_assignees for opgaver i egen organisation"
--   on public.task_assignees for all to authenticated
--   using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()))
--   with check (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));
