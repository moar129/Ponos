-- =====================================================================
-- SEED 01 - ROLLER + PRIVILEGIER (Roskilde Festival mockdata)
-- Køres i Supabase SQL Editor. Se docs/seed/README.md for rækkefølge.
-- Rører IKKE Admin/Medlem (beskyttet af triggers) og tildeler aldrig
-- 'admin'-privilegiet (højst én admin pr. organisation).
-- =====================================================================
do $$
declare
  v_org      uuid;
  v_role     uuid;
  v_existing text;
  r          record;
begin
  select id into v_org from public.organisations where lower(trim(name)) = 'roskilde festival';
  if v_org is null then
    raise exception 'Organisationen "Roskilde Festival" findes ikke.';
  end if;

  -- Kun seed-rollernes navne tjekkes - egne, manuelt oprettede roller er ok.
  select string_agg(name, ', ' order by name) into v_existing
  from public.roles
  where organisation_id = v_org
    and name in ('Festivalledelse', 'Frivilligkoordinator', 'Lagerchef', 'Lagermedarbejder',
                 'Holdleder', 'Teknik & El', 'Sikkerhed & Vagt', 'Frivillig');
  if v_existing is not null then
    raise exception 'Rollerne findes allerede: %. Kør 99_cleanup.sql eller slet/omdøb dem først.', v_existing;
  end if;

  for r in
    select * from (values
      ('Festivalledelse', array[
        'read_roles',
        'read_membership_requests', 'update_membership_requests',
        'create_invitations', 'read_invitations',
        'create_news', 'read_news', 'update_news', 'delete_news',
        'read_datalayer',
        'read_tasks', 'approve_task', 'reject_task', 'view_all_task_rooms', 'view_completed_tasks',
        'read_statistics', 'create_statistics'
      ]),
      ('Frivilligkoordinator', array[
        'read_membership_requests', 'update_membership_requests',
        'create_invitations', 'read_invitations', 'delete_invitations',
        'delete_members',
        'read_news', 'create_news',
        'create_tasks', 'read_tasks', 'assign_tasks',
        -- read_statistics UDEN view_completed_tasks/view_all_task_rooms: tester
        -- at statistikken er server-aggregeret (samme tal som admin).
        'read_statistics'
      ]),
      ('Lagerchef', array[
        'create_datalayer', 'read_datalayer', 'update_datalayer', 'delete_datalayer',
        'read_news', 'read_tasks', 'view_completed_tasks'
      ]),
      ('Lagermedarbejder', array[
        'read_datalayer', 'update_datalayer',
        'read_news', 'read_tasks'
      ]),
      ('Holdleder', array[
        'read_datalayer', 'read_news',
        'create_tasks', 'read_tasks', 'update_tasks', 'assign_tasks',
        'approve_task', 'reject_task', 'view_completed_tasks'
      ]),
      ('Teknik & El', array[
        'read_datalayer', 'update_datalayer',
        'read_news', 'read_tasks', 'update_tasks'
      ]),
      ('Sikkerhed & Vagt', array[
        'read_datalayer', 'read_news', 'read_tasks'
      ]),
      ('Frivillig', array[
        'read_datalayer', 'read_news', 'read_tasks'
      ])
    ) as t(role_name, privs)
  loop
    insert into public.roles (organisation_id, name)
    values (v_org, r.role_name)
    returning id into v_role;

    insert into public.privileges (role_id, name)
    select v_role, unnest(r.privs)
    on conflict (role_id, name) do nothing;
  end loop;

  raise notice 'Seed 01 færdig: 8 roller oprettet.';
end $$;
