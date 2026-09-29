-- =====================================================================
-- SEED 06 - OPGAVERUM, OPGAVER, TILDELINGER, GODKENDELSER, MATERIALER
-- GENERERET af docs/seed/generate.mjs - ret dér, ikke her.
-- Kræver 01, 02 og 04. 8 rum, 70 opgaver spredt okt 2024 -> sep 2026.
-- Opgave-chats oprettes automatisk af trg_sync_task_conversation, når en
-- opgave får 2+ tildelte. Materialer: enhedernes status sættes FØR de
-- linkes (guard-triggeren blokerer statusskift på linkede enheder).
-- =====================================================================
do $$
declare
  v_org   uuid;
  v_admin uuid;
  v_task  uuid;
  v_item  uuid;
  v_tm    uuid;
  v_unit  uuid;
  v_ids   uuid[];
begin
  select id into v_org from public.organisations where lower(trim(name)) = 'roskilde festival';
  if v_org is null then
    raise exception 'Organisationen "Roskilde Festival" findes ikke.';
  end if;

  if exists (select 1 from public.task_rooms where organisation_id = v_org)
     or exists (select 1 from public.tasks where organisation_id = v_org) then
    raise exception 'Allerede seedet - kør 99_cleanup.sql først.';
  end if;

  if not exists (select 1 from public.profiles where email like '%@ponos-mock.test') then
    raise exception 'Kør 02_users.sql først.';
  end if;

  if not exists (select 1 from public.data_layer_items where organisation_id = v_org) then
    raise exception 'Kør 04_datalayer.sql først.';
  end if;

  select m.user_id into v_admin
  from public.memberships m
  join public.roles ro on ro.id = m.role_id
  where m.organisation_id = v_org and ro.name = 'Admin'
  limit 1;

  -- Rum
  insert into public.task_rooms (organisation_id, name, created_at)
  values
    (v_org, 'Planlægning', '2024-10-01 09:00 Europe/Copenhagen'::timestamptz),
    (v_org, 'Opbygning', '2024-10-01 09:05 Europe/Copenhagen'::timestamptz),
    (v_org, 'Scener & Teknik', '2024-10-01 09:10 Europe/Copenhagen'::timestamptz),
    (v_org, 'Affald & Genbrug', '2024-10-01 09:15 Europe/Copenhagen'::timestamptz),
    (v_org, 'Sanitet', '2024-10-01 09:20 Europe/Copenhagen'::timestamptz),
    (v_org, 'Sikkerhed', '2024-10-01 09:25 Europe/Copenhagen'::timestamptz),
    (v_org, 'Frivillige', '2024-10-01 09:30 Europe/Copenhagen'::timestamptz),
    (v_org, 'Nedtagning', '2024-10-01 09:35 Europe/Copenhagen'::timestamptz);

  -- Rolle-låste rum
  insert into public.task_room_roles (room_id, role_id)
  select r.id, ro.id
  from (values
    ('Planlægning', 'Festivalledelse'),
    ('Planlægning', 'Frivilligkoordinator'),
    ('Planlægning', 'Lagerchef'),
    ('Planlægning', 'Holdleder'),
    ('Sikkerhed', 'Sikkerhed & Vagt'),
    ('Sikkerhed', 'Festivalledelse')
  ) as x(room_name, role_name)
  join public.task_rooms r on r.organisation_id = v_org and r.name = x.room_name
  join public.roles ro on ro.organisation_id = v_org and ro.name = x.role_name;

  -- #1 Budget for sceneteknik RF25
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Budget for sceneteknik RF25', 'Udarbejd budget for lyd, lys og strøm til alle scener.', '2024-10-14 08:00 Europe/Copenhagen'::timestamptz, '2024-11-15 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Planlægning'), 'High', null, '2024-10-07 09:00 Europe/Copenhagen'::timestamptz, '2024-11-12 14:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), v_admin, '2024-10-08 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), v_admin, '2024-10-08 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2024-11-12 11:00 Europe/Copenhagen'::timestamptz, 'Accepted', v_admin, '2024-11-12 14:00 Europe/Copenhagen'::timestamptz, null);

  -- #2 Indhent tilbud på toiletvogne
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Indhent tilbud på toiletvogne', 'Mindst tre tilbud på leje af toiletvogne.', '2024-10-28 08:00 Europe/Copenhagen'::timestamptz, '2024-12-01 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Planlægning'), 'Medium', null, '2024-10-21 09:00 Europe/Copenhagen'::timestamptz, '2024-11-25 11:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'henrik.dahl@ponos-mock.test'), v_admin, '2024-10-22 09:00 Europe/Copenhagen'::timestamptz);

  -- #3 Rekrutteringskampagne frivillige RF25
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Rekrutteringskampagne frivillige RF25', 'Plan for opslag, infomøder og tilmelding.', '2024-11-11 08:00 Europe/Copenhagen'::timestamptz, '2025-02-28 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Planlægning'), 'High', null, '2024-11-04 09:00 Europe/Copenhagen'::timestamptz, '2025-02-20 15:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'sofie.andersen@ponos-mock.test'), v_admin, '2024-11-05 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'anders.moeller@ponos-mock.test'), v_admin, '2024-11-05 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'sofie.andersen@ponos-mock.test'), '2025-02-20 12:00 Europe/Copenhagen'::timestamptz, 'Accepted', v_admin, '2025-02-20 15:00 Europe/Copenhagen'::timestamptz, null);

  -- #4 Opdater sikkerhedsplan RF25
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opdater sikkerhedsplan RF25', 'Gennemgå og opdater sikkerheds- og beredskabsplanen.', '2024-12-01 08:00 Europe/Copenhagen'::timestamptz, '2025-03-01 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Sikkerhed'), 'Critical', null, '2024-11-18 09:00 Europe/Copenhagen'::timestamptz, '2025-02-26 13:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'nanna.bech@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2024-11-19 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'kasper.winther@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2024-11-19 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'nanna.bech@ponos-mock.test'), '2025-02-26 10:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2025-02-26 13:00 Europe/Copenhagen'::timestamptz, null);

  -- #5 Planlæg layout for frivilligcamp
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Planlæg layout for frivilligcamp', 'Placering af telte, depot og toiletter i frivilligcampen.', '2025-01-06 08:00 Europe/Copenhagen'::timestamptz, '2025-02-15 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Frivillige'), 'Low', null, '2024-12-09 09:00 Europe/Copenhagen'::timestamptz, '2025-02-10 12:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'anders.moeller@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2024-12-10 09:00 Europe/Copenhagen'::timestamptz);

  -- #6 Bestil hegn og mobilhegn
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Bestil hegn og mobilhegn', 'Opgør behov og bestil manglende hegn.', '2025-01-20 08:00 Europe/Copenhagen'::timestamptz, '2025-03-15 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Opbygning'), 'Medium', null, '2025-01-13 09:00 Europe/Copenhagen'::timestamptz, '2025-03-10 10:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'henrik.dahl@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-01-14 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'emma.nielsen@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-01-14 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'henrik.dahl@ponos-mock.test'), '2025-03-10 07:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-03-10 10:00 Europe/Copenhagen'::timestamptz, null);

  -- #7 Serviceeftersyn af generatorer
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Serviceeftersyn af generatorer', 'Årligt eftersyn af alle generatorer.', '2025-03-01 08:00 Europe/Copenhagen'::timestamptz, '2025-04-30 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Scener & Teknik'), 'High', null, '2025-02-03 09:00 Europe/Copenhagen'::timestamptz, '2025-04-22 15:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-02-04 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'peter.skov@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-02-04 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), '2025-04-22 12:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-04-22 15:00 Europe/Copenhagen'::timestamptz, null);

  -- #8 Test af radioer og ladestationer
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Test af radioer og ladestationer', 'Test alle håndradioer og ladestationer før sæsonen.', '2025-04-01 08:00 Europe/Copenhagen'::timestamptz, '2025-05-15 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Sikkerhed'), 'Medium', null, '2025-03-03 09:00 Europe/Copenhagen'::timestamptz, '2025-05-09 14:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'kasper.winther@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2025-03-04 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'nanna.bech@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2025-03-04 09:00 Europe/Copenhagen'::timestamptz);

  -- #9 Opstil hegn omkring Camp Øst
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opstil hegn omkring Camp Øst', 'Byggehegn langs hele Camp Østs yderkant.', '2025-06-02 07:00 Europe/Copenhagen'::timestamptz, '2025-06-13 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Opbygning'), 'High', 6, '2025-04-07 09:00 Europe/Copenhagen'::timestamptz, '2025-06-12 17:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-04-08 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'ida.mortensen@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-04-08 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'oliver.juhl@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-04-08 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mads.poulsen@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-04-08 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-06-12 14:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-06-12 17:00 Europe/Copenhagen'::timestamptz, null);

  -- #10 Rejs Orange Scene – stålkonstruktion
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Rejs Orange Scene – stålkonstruktion', 'Opbygning af scenens stålkonstruktion og tag.', '2025-05-26 07:00 Europe/Copenhagen'::timestamptz, '2025-06-20 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Opbygning'), 'Critical', null, '2025-04-14 09:00 Europe/Copenhagen'::timestamptz, '2025-06-19 18:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-04-15 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-04-15 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'peter.skov@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-04-15 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-06-19 15:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-06-19 18:00 Europe/Copenhagen'::timestamptz, null);

  -- #11 Placer toiletvogne i campingområderne
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Placer toiletvogne i campingområderne', 'Placering efter layoutplanen.', '2025-06-16 07:00 Europe/Copenhagen'::timestamptz, '2025-06-24 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Sanitet'), 'Medium', null, '2025-05-05 09:00 Europe/Copenhagen'::timestamptz, '2025-06-23 15:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2025-05-06 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'freja.lassen@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2025-05-06 09:00 Europe/Copenhagen'::timestamptz);

  -- #12 Opstil pantstationer
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opstil pantstationer', 'Opstil mobile pantstationer ved alle scener.', '2025-06-18 07:00 Europe/Copenhagen'::timestamptz, '2025-06-26 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Affald & Genbrug'), 'Medium', null, '2025-05-12 09:00 Europe/Copenhagen'::timestamptz, '2025-06-25 16:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2025-05-13 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'sara.oestergaard@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2025-05-13 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2025-06-25 13:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-06-25 16:00 Europe/Copenhagen'::timestamptz, null);

  -- #13 Opsæt frivilligcamp og depot
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opsæt frivilligcamp og depot', 'Telte, strøm og depot til udlevering.', '2025-06-10 07:00 Europe/Copenhagen'::timestamptz, '2025-06-20 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Frivillige'), 'Low', null, '2025-05-19 09:00 Europe/Copenhagen'::timestamptz, '2025-06-19 17:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'anders.moeller@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2025-05-20 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'ida.mortensen@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2025-05-20 09:00 Europe/Copenhagen'::timestamptz);

  -- #14 Lydcheck Arena
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Lydcheck Arena', null, '2025-06-26 10:00 Europe/Copenhagen'::timestamptz, '2025-06-27 18:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Scener & Teknik'), 'High', null, '2025-06-02 09:00 Europe/Copenhagen'::timestamptz, '2025-06-27 16:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-06-03 09:00 Europe/Copenhagen'::timestamptz);

  -- #15 Brandsyn af scener
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Brandsyn af scener', 'Gennemgang med brandvæsenet.', '2025-06-25 09:00 Europe/Copenhagen'::timestamptz, '2025-06-27 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Sikkerhed'), 'Critical', null, '2025-06-09 09:00 Europe/Copenhagen'::timestamptz, '2025-06-27 12:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'nanna.bech@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2025-06-10 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'nanna.bech@ponos-mock.test'), '2025-06-27 09:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2025-06-27 12:00 Europe/Copenhagen'::timestamptz, null);

  -- #16 Daglig tømning af affaldsstationer RF25
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Daglig tømning af affaldsstationer RF25', 'Tøm og sortér ved alle affaldsstationer.', '2025-06-28 08:00 Europe/Copenhagen'::timestamptz, '2025-07-05 20:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Affald & Genbrug'), 'Medium', null, '2025-06-16 09:00 Europe/Copenhagen'::timestamptz, '2025-07-05 19:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'sara.oestergaard@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2025-06-17 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'oliver.juhl@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2025-06-17 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mads.poulsen@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2025-06-17 09:00 Europe/Copenhagen'::timestamptz);

  -- #17 Påfyld vandtanke i Camp Vest
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Påfyld vandtanke i Camp Vest', null, '2025-06-28 08:00 Europe/Copenhagen'::timestamptz, '2025-07-05 20:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Sanitet'), 'High', null, '2025-06-23 09:00 Europe/Copenhagen'::timestamptz, '2025-07-04 18:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'freja.lassen@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2025-06-24 09:00 Europe/Copenhagen'::timestamptz);

  -- #18 Nedtag hegn Camp Øst RF25
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Nedtag hegn Camp Øst RF25', null, '2025-07-07 07:00 Europe/Copenhagen'::timestamptz, '2025-07-18 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Nedtagning'), 'Medium', null, '2025-07-01 09:00 Europe/Copenhagen'::timestamptz, '2025-07-17 15:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-07-02 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'oliver.juhl@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-07-02 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'ida.mortensen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-07-02 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-07-17 12:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-07-17 15:00 Europe/Copenhagen'::timestamptz, null);

  -- #19 Returner lejede generatorer RF25
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Returner lejede generatorer RF25', null, '2025-07-08 08:00 Europe/Copenhagen'::timestamptz, '2025-07-15 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Nedtagning'), 'High', null, '2025-07-02 09:00 Europe/Copenhagen'::timestamptz, '2025-07-14 13:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'peter.skov@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-07-03 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'peter.skov@ponos-mock.test'), '2025-07-14 10:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-07-14 13:00 Europe/Copenhagen'::timestamptz, null);

  -- #20 Lageroptælling efter RF25
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Lageroptælling efter RF25', 'Optæl og registrer alt udstyr i datalageret.', '2025-07-21 08:00 Europe/Copenhagen'::timestamptz, '2025-08-15 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Nedtagning'), 'Medium', null, '2025-07-14 09:00 Europe/Copenhagen'::timestamptz, '2025-08-20 12:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'henrik.dahl@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-07-15 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'emma.nielsen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-07-15 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'jonas.holm@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-07-15 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'henrik.dahl@ponos-mock.test'), '2025-08-20 09:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-08-20 12:00 Europe/Copenhagen'::timestamptz, null);

  -- #21 Evaluering RF25 – frivilligområdet
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Evaluering RF25 – frivilligområdet', null, '2025-08-11 08:00 Europe/Copenhagen'::timestamptz, '2025-09-12 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Planlægning'), 'Low', null, '2025-08-04 09:00 Europe/Copenhagen'::timestamptz, '2025-09-10 11:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'sofie.andersen@ponos-mock.test'), v_admin, '2025-08-05 09:00 Europe/Copenhagen'::timestamptz);

  -- #22 Opdater registrering af beskadiget hegn
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opdater registrering af beskadiget hegn', 'Registrér beskadigede hegnselementer i datalageret.', '2025-08-18 08:00 Europe/Copenhagen'::timestamptz, '2025-09-01 16:00 Europe/Copenhagen'::timestamptz, 'InProgress', (select id from public.task_rooms where organisation_id = v_org and name = 'Nedtagning'), 'Low', null, '2025-08-11 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'emma.nielsen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2025-08-12 09:00 Europe/Copenhagen'::timestamptz);

  -- #23 Reparer beskadigede lyskabler
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Reparer beskadigede lyskabler', null, '2025-09-01 08:00 Europe/Copenhagen'::timestamptz, '2025-10-31 16:00 Europe/Copenhagen'::timestamptz, 'InProgress', (select id from public.task_rooms where organisation_id = v_org and name = 'Scener & Teknik'), 'Medium', null, '2025-08-25 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'peter.skov@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-08-26 09:00 Europe/Copenhagen'::timestamptz);

  -- #24 Budget og scenetekniske behov RF26
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Budget og scenetekniske behov RF26', null, '2025-10-01 08:00 Europe/Copenhagen'::timestamptz, '2025-11-14 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Planlægning'), 'High', null, '2025-09-15 09:00 Europe/Copenhagen'::timestamptz, '2025-11-10 14:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), v_admin, '2025-09-16 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-11-10 11:00 Europe/Copenhagen'::timestamptz, 'Accepted', v_admin, '2025-11-10 14:00 Europe/Copenhagen'::timestamptz, null);

  -- #25 Kontrakt med affaldsleverandør
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Kontrakt med affaldsleverandør', 'Forhandl og underskriv kontrakt for RF26.', '2025-10-13 08:00 Europe/Copenhagen'::timestamptz, '2025-12-01 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Planlægning'), 'Medium', null, '2025-10-06 09:00 Europe/Copenhagen'::timestamptz, '2025-11-28 10:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), v_admin, '2025-10-07 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2025-11-19 15:00 Europe/Copenhagen'::timestamptz, 'Rejected', v_admin, '2025-11-20 09:00 Europe/Copenhagen'::timestamptz, 'Mangler underskrevet kontrakt fra leverandøren.');
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2025-11-28 07:00 Europe/Copenhagen'::timestamptz, 'Accepted', v_admin, '2025-11-28 10:00 Europe/Copenhagen'::timestamptz, null);

  -- #26 Rekrutteringskampagne frivillige RF26
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Rekrutteringskampagne frivillige RF26', null, '2025-11-03 08:00 Europe/Copenhagen'::timestamptz, '2026-03-01 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Frivillige'), 'High', null, '2025-10-20 09:00 Europe/Copenhagen'::timestamptz, '2026-02-25 15:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'sofie.andersen@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2025-10-21 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'anders.moeller@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2025-10-21 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'sofie.andersen@ponos-mock.test'), '2026-02-25 12:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-02-25 15:00 Europe/Copenhagen'::timestamptz, null);

  -- #27 Opdater beredskabsplan RF26
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opdater beredskabsplan RF26', null, '2025-12-01 08:00 Europe/Copenhagen'::timestamptz, '2026-02-28 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Sikkerhed'), 'Critical', null, '2025-11-10 09:00 Europe/Copenhagen'::timestamptz, '2026-02-27 11:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'nanna.bech@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2025-11-11 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'kasper.winther@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2025-11-11 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'nanna.bech@ponos-mock.test'), '2026-02-27 08:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-02-27 11:00 Europe/Copenhagen'::timestamptz, null);

  -- #28 Vinteropbevaring – tjek af lysudstyr
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Vinteropbevaring – tjek af lysudstyr', null, '2026-01-05 08:00 Europe/Copenhagen'::timestamptz, '2026-02-15 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Scener & Teknik'), 'Low', null, '2025-12-01 09:00 Europe/Copenhagen'::timestamptz, '2026-02-12 14:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2025-12-02 09:00 Europe/Copenhagen'::timestamptz);

  -- #29 Opdater frivilligkontrakter
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opdater frivilligkontrakter', null, '2026-01-19 08:00 Europe/Copenhagen'::timestamptz, '2026-03-01 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Planlægning'), 'Low', null, '2026-01-12 09:00 Europe/Copenhagen'::timestamptz, '2026-02-27 10:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'anders.moeller@ponos-mock.test'), v_admin, '2026-01-13 09:00 Europe/Copenhagen'::timestamptz);

  -- #30 Service af generatorer før RF26
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Service af generatorer før RF26', null, '2026-03-02 08:00 Europe/Copenhagen'::timestamptz, '2026-04-30 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Scener & Teknik'), 'High', null, '2026-02-02 09:00 Europe/Copenhagen'::timestamptz, '2026-04-28 15:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-02-03 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'peter.skov@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-02-03 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), '2026-04-28 12:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-04-28 15:00 Europe/Copenhagen'::timestamptz, null);

  -- #31 Førstehjælpskursus for holdledere
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Førstehjælpskursus for holdledere', null, '2026-04-06 17:00 Europe/Copenhagen'::timestamptz, '2026-04-30 21:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Frivillige'), 'Medium', null, '2026-02-16 09:00 Europe/Copenhagen'::timestamptz, '2026-04-24 21:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'nanna.bech@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-02-17 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-02-17 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-02-17 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-02-17 09:00 Europe/Copenhagen'::timestamptz);

  -- #32 Opmåling af campingområder
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opmåling af campingområder', null, '2026-04-13 08:00 Europe/Copenhagen'::timestamptz, '2026-05-08 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Opbygning'), 'Medium', null, '2026-03-09 09:00 Europe/Copenhagen'::timestamptz, '2026-05-06 13:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-03-10 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-05-06 10:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-05-06 13:00 Europe/Copenhagen'::timestamptz, null);

  -- #33 Opstil hegn omkring Camp Øst og Vest
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opstil hegn omkring Camp Øst og Vest', null, '2026-06-01 07:00 Europe/Copenhagen'::timestamptz, '2026-06-12 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Opbygning'), 'High', 6, '2026-04-06 09:00 Europe/Copenhagen'::timestamptz, '2026-06-11 18:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-04-07 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'ida.mortensen@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-04-07 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'oliver.juhl@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-04-07 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mads.poulsen@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-04-07 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'freja.lassen@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-04-07 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-06-10 17:00 Europe/Copenhagen'::timestamptz, 'Rejected', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-06-10 19:00 Europe/Copenhagen'::timestamptz, 'Hegnet ved indgang C mangler stadig.');
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-06-11 15:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-06-11 18:00 Europe/Copenhagen'::timestamptz, null);

  -- #34 Rejs Orange Scene – RF26
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Rejs Orange Scene – RF26', null, '2026-05-25 07:00 Europe/Copenhagen'::timestamptz, '2026-06-19 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Opbygning'), 'Critical', null, '2026-04-13 09:00 Europe/Copenhagen'::timestamptz, '2026-06-18 17:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-04-14 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-04-14 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'peter.skov@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-04-14 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-06-18 14:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-06-18 17:00 Europe/Copenhagen'::timestamptz, null);

  -- #35 Placer toiletvogne og håndvask
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Placer toiletvogne og håndvask', null, '2026-06-15 07:00 Europe/Copenhagen'::timestamptz, '2026-06-23 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Sanitet'), 'Medium', null, '2026-05-04 09:00 Europe/Copenhagen'::timestamptz, '2026-06-22 16:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-05-05 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'freja.lassen@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-05-05 09:00 Europe/Copenhagen'::timestamptz);

  -- #36 Opstil affalds- og pantstationer
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opstil affalds- og pantstationer', null, '2026-06-17 07:00 Europe/Copenhagen'::timestamptz, '2026-06-20 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Affald & Genbrug'), 'Medium', null, '2026-05-11 09:00 Europe/Copenhagen'::timestamptz, '2026-06-24 15:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'sara.oestergaard@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-05-12 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'oliver.juhl@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-05-12 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'sara.oestergaard@ponos-mock.test'), '2026-06-24 12:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-06-24 15:00 Europe/Copenhagen'::timestamptz, null);

  -- #37 Opsæt frivilligcamp RF26
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opsæt frivilligcamp RF26', null, '2026-06-08 07:00 Europe/Copenhagen'::timestamptz, '2026-06-19 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Frivillige'), 'Low', null, '2026-05-18 09:00 Europe/Copenhagen'::timestamptz, '2026-06-18 17:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'anders.moeller@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-05-19 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'ida.mortensen@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-05-19 09:00 Europe/Copenhagen'::timestamptz);

  -- #38 Uddel radioer til vagtholdene
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Uddel radioer til vagtholdene', null, '2026-06-26 08:00 Europe/Copenhagen'::timestamptz, '2026-06-27 12:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Sikkerhed'), 'High', null, '2026-06-01 09:00 Europe/Copenhagen'::timestamptz, '2026-06-26 18:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'kasper.winther@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-06-02 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'nanna.bech@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-06-02 09:00 Europe/Copenhagen'::timestamptz);

  -- #39 Lydcheck Orange Scene
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Lydcheck Orange Scene', null, '2026-06-26 10:00 Europe/Copenhagen'::timestamptz, '2026-06-27 18:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Scener & Teknik'), 'High', null, '2026-06-08 09:00 Europe/Copenhagen'::timestamptz, '2026-06-27 17:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-06-09 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), '2026-06-27 14:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-06-27 17:00 Europe/Copenhagen'::timestamptz, null);

  -- #40 Påfyld diesel i generatorer under festivalen
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Påfyld diesel i generatorer under festivalen', null, '2026-06-27 06:00 Europe/Copenhagen'::timestamptz, '2026-07-04 23:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Scener & Teknik'), 'Critical', null, '2026-06-15 09:00 Europe/Copenhagen'::timestamptz, '2026-07-04 22:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'peter.skov@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-06-16 09:00 Europe/Copenhagen'::timestamptz);

  -- #41 Daglig tømning af affaldsstationer RF26
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Daglig tømning af affaldsstationer RF26', null, '2026-06-27 08:00 Europe/Copenhagen'::timestamptz, '2026-07-04 20:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Affald & Genbrug'), 'Medium', null, '2026-06-22 09:00 Europe/Copenhagen'::timestamptz, '2026-07-04 19:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'sara.oestergaard@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-06-23 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'oliver.juhl@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-06-23 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mads.poulsen@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-06-23 09:00 Europe/Copenhagen'::timestamptz);

  -- #42 Nedtag Orange Scene
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Nedtag Orange Scene', null, '2026-07-05 07:00 Europe/Copenhagen'::timestamptz, '2026-07-20 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Nedtagning'), 'High', null, '2026-06-29 09:00 Europe/Copenhagen'::timestamptz, '2026-07-23 16:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-06-30 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-06-30 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'peter.skov@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-06-30 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-07-23 13:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-07-23 16:00 Europe/Copenhagen'::timestamptz, null);

  -- #43 Nedtag hegn og mobilhegn
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Nedtag hegn og mobilhegn', null, '2026-07-06 07:00 Europe/Copenhagen'::timestamptz, '2026-07-17 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Nedtagning'), 'Medium', null, '2026-07-01 09:00 Europe/Copenhagen'::timestamptz, '2026-07-16 15:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-07-02 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'ida.mortensen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-07-02 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'oliver.juhl@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-07-02 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'freja.lassen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-07-02 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-07-16 12:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-07-16 15:00 Europe/Copenhagen'::timestamptz, null);

  -- #44 Returner lejede toiletvogne
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Returner lejede toiletvogne', null, '2026-07-07 08:00 Europe/Copenhagen'::timestamptz, '2026-07-14 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Nedtagning'), 'Medium', null, '2026-07-06 09:00 Europe/Copenhagen'::timestamptz, '2026-07-13 12:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-07-07 09:00 Europe/Copenhagen'::timestamptz);

  -- #45 Lageroptælling efter RF26
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Lageroptælling efter RF26', null, '2026-07-20 08:00 Europe/Copenhagen'::timestamptz, '2026-08-07 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Nedtagning'), 'Medium', null, '2026-07-13 09:00 Europe/Copenhagen'::timestamptz, '2026-08-12 14:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'henrik.dahl@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-07-14 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'emma.nielsen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-07-14 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'jonas.holm@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-07-14 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'henrik.dahl@ponos-mock.test'), '2026-08-10 15:00 Europe/Copenhagen'::timestamptz, 'Rejected', (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-08-10 17:00 Europe/Copenhagen'::timestamptz, 'Hal 2 er ikke optalt endnu.');
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'henrik.dahl@ponos-mock.test'), '2026-08-12 11:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-08-12 14:00 Europe/Copenhagen'::timestamptz, null);

  -- #46 Opgørelse af affaldsmængder RF26
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opgørelse af affaldsmængder RF26', null, '2026-07-27 08:00 Europe/Copenhagen'::timestamptz, '2026-08-21 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Affald & Genbrug'), 'Low', null, '2026-07-20 09:00 Europe/Copenhagen'::timestamptz, '2026-08-19 11:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'sara.oestergaard@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-07-21 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'sara.oestergaard@ponos-mock.test'), '2026-08-19 08:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-08-19 11:00 Europe/Copenhagen'::timestamptz, null);

  -- #47 Evaluering RF26 – sikkerhed
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Evaluering RF26 – sikkerhed', null, '2026-08-10 08:00 Europe/Copenhagen'::timestamptz, '2026-09-11 16:00 Europe/Copenhagen'::timestamptz, 'InProgress', (select id from public.task_rooms where organisation_id = v_org and name = 'Sikkerhed'), 'High', null, '2026-08-03 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'nanna.bech@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-08-04 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'nanna.bech@ponos-mock.test'), '2026-09-10 16:00 Europe/Copenhagen'::timestamptz, 'Pending', null, null::timestamptz, null);

  -- #48 Reparer beskadigede hegnselementer
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Reparer beskadigede hegnselementer', null, '2026-08-17 08:00 Europe/Copenhagen'::timestamptz, '2026-09-18 16:00 Europe/Copenhagen'::timestamptz, 'InProgress', (select id from public.task_rooms where organisation_id = v_org and name = 'Nedtagning'), 'Medium', null, '2026-08-10 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'emma.nielsen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-08-11 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'jonas.holm@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-08-11 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'emma.nielsen@ponos-mock.test'), '2026-09-14 15:00 Europe/Copenhagen'::timestamptz, 'Rejected', (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-09-15 09:00 Europe/Copenhagen'::timestamptz, 'Der mangler billeder af de reparerede elementer.');
  select id into v_item from public.data_layer_items where organisation_id = v_org and name = 'Byggehegn 3,5 m';
  insert into public.task_materials (task_id, item_id, quantity) values (v_task, v_item, 30) returning id into v_tm;
  select id into v_unit from public.data_layer_item_units
  where item_id = v_item and status = 'Available' and serial_number is null and contents_total is null and quantity > 30
  order by quantity desc limit 1;
  update public.data_layer_item_units set quantity = quantity - 30 where id = v_unit;
  insert into public.data_layer_item_units (organisation_id, item_id, location_id, quantity, status, created_at)
  select organisation_id, item_id, location_id, 30, 'InUse', '2026-08-11 09:00 Europe/Copenhagen'::timestamptz from public.data_layer_item_units where id = v_unit
  returning id into v_unit;
  insert into public.task_material_units (task_material_id, unit_id) values (v_tm, v_unit);

  -- #49 Service af lysudstyr før vinteropbevaring
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Service af lysudstyr før vinteropbevaring', null, '2026-08-24 08:00 Europe/Copenhagen'::timestamptz, '2026-09-25 16:00 Europe/Copenhagen'::timestamptz, 'InProgress', (select id from public.task_rooms where organisation_id = v_org and name = 'Scener & Teknik'), 'Medium', null, '2026-08-17 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-08-18 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), '2026-09-24 15:00 Europe/Copenhagen'::timestamptz, 'Pending', null, null::timestamptz, null);
  select id into v_item from public.data_layer_items where organisation_id = v_org and name = 'LED-spot 200 W';
  insert into public.task_materials (task_id, item_id, quantity) values (v_task, v_item, 4) returning id into v_tm;
  select array_agg(id) into v_ids from (
    select id from public.data_layer_item_units
    where item_id = v_item and status = 'Available' and serial_number is not null
    order by serial_number desc limit 4
  ) s;
  update public.data_layer_item_units set status = 'InUse' where id = any(v_ids);
  insert into public.task_material_units (task_material_id, unit_id) select v_tm, unnest(v_ids);

  -- #50 Sorter returneret frivilligudstyr
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Sorter returneret frivilligudstyr', 'Veste, armbånd og værktøj sorteres og registreres.', '2026-09-01 08:00 Europe/Copenhagen'::timestamptz, '2026-09-20 16:00 Europe/Copenhagen'::timestamptz, 'Started', (select id from public.task_rooms where organisation_id = v_org and name = 'Nedtagning'), 'Low', null, '2026-08-24 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'ida.mortensen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-08-25 09:00 Europe/Copenhagen'::timestamptz);

  -- #51 Evaluering RF26 – frivilligområdet
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Evaluering RF26 – frivilligområdet', null, '2026-09-07 08:00 Europe/Copenhagen'::timestamptz, '2026-10-09 16:00 Europe/Copenhagen'::timestamptz, 'InProgress', (select id from public.task_rooms where organisation_id = v_org and name = 'Planlægning'), 'Medium', null, '2026-08-31 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'sofie.andersen@ponos-mock.test'), v_admin, '2026-09-01 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'sofie.andersen@ponos-mock.test'), '2026-09-28 10:00 Europe/Copenhagen'::timestamptz, 'Pending', null, null::timestamptz, null);

  -- #52 Tøm og rengør affaldscontainere
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Tøm og rengør affaldscontainere', null, '2026-09-07 08:00 Europe/Copenhagen'::timestamptz, '2026-09-22 16:00 Europe/Copenhagen'::timestamptz, 'InProgress', (select id from public.task_rooms where organisation_id = v_org and name = 'Affald & Genbrug'), 'High', null, '2026-09-01 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'sara.oestergaard@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-09-02 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mads.poulsen@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-09-02 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'sara.oestergaard@ponos-mock.test'), '2026-09-21 14:00 Europe/Copenhagen'::timestamptz, 'Rejected', (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-09-21 16:00 Europe/Copenhagen'::timestamptz, 'Tre containere i Camp Øst er stadig fulde.');
  select id into v_item from public.data_layer_items where organisation_id = v_org and name = 'Affaldssække 120 l';
  insert into public.task_materials (task_id, item_id, quantity) values (v_task, v_item, 250) returning id into v_tm;
  select id into v_unit from public.data_layer_item_units
  where item_id = v_item and status = 'Available' and serial_number is null and contents_total is null and quantity > 250
  order by quantity desc limit 1;
  update public.data_layer_item_units set quantity = quantity - 250 where id = v_unit;
  insert into public.data_layer_item_units (organisation_id, item_id, location_id, quantity, status, created_at)
  select organisation_id, item_id, location_id, 250, 'InUse', '2026-09-02 09:00 Europe/Copenhagen'::timestamptz from public.data_layer_item_units where id = v_unit
  returning id into v_unit;
  insert into public.task_material_units (task_material_id, unit_id) values (v_tm, v_unit);

  -- #53 Rengør og opbevar vandtanke
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Rengør og opbevar vandtanke', null, '2026-09-14 08:00 Europe/Copenhagen'::timestamptz, '2026-10-02 16:00 Europe/Copenhagen'::timestamptz, 'InProgress', (select id from public.task_rooms where organisation_id = v_org and name = 'Sanitet'), 'Medium', null, '2026-09-07 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'freja.lassen@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-09-08 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'oliver.juhl@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-09-08 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'freja.lassen@ponos-mock.test'), '2026-09-27 12:00 Europe/Copenhagen'::timestamptz, 'Pending', null, null::timestamptz, null);

  -- #54 Vinteropbevaring af scenegulve
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Vinteropbevaring af scenegulve', null, '2026-09-21 08:00 Europe/Copenhagen'::timestamptz, '2026-10-16 16:00 Europe/Copenhagen'::timestamptz, 'InProgress', (select id from public.task_rooms where organisation_id = v_org and name = 'Nedtagning'), 'Medium', null, '2026-09-08 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-09-09 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'peter.skov@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-09-09 09:00 Europe/Copenhagen'::timestamptz);
  select id into v_item from public.data_layer_items where organisation_id = v_org and name = 'Scenegulv-element 2x1 m';
  insert into public.task_materials (task_id, item_id, quantity) values (v_task, v_item, 40) returning id into v_tm;
  select id into v_unit from public.data_layer_item_units
  where item_id = v_item and status = 'Available' and serial_number is null and contents_total is null and quantity > 40
  order by quantity desc limit 1;
  update public.data_layer_item_units set quantity = quantity - 40 where id = v_unit;
  insert into public.data_layer_item_units (organisation_id, item_id, location_id, quantity, status, created_at)
  select organisation_id, item_id, location_id, 40, 'InUse', '2026-09-09 09:00 Europe/Copenhagen'::timestamptz from public.data_layer_item_units where id = v_unit
  returning id into v_unit;
  insert into public.task_material_units (task_material_id, unit_id) values (v_tm, v_unit);

  -- #55 Budgetudkast RF27
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Budgetudkast RF27', null, '2026-10-01 08:00 Europe/Copenhagen'::timestamptz, '2026-11-13 16:00 Europe/Copenhagen'::timestamptz, 'Started', (select id from public.task_rooms where organisation_id = v_org and name = 'Planlægning'), 'High', null, '2026-09-14 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), v_admin, '2026-09-15 09:00 Europe/Copenhagen'::timestamptz);

  -- #56 Kontrol af brandslukkere
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Kontrol af brandslukkere', 'Årligt eftersyn af pulverslukkere.', '2026-09-21 08:00 Europe/Copenhagen'::timestamptz, '2026-10-09 16:00 Europe/Copenhagen'::timestamptz, 'InProgress', (select id from public.task_rooms where organisation_id = v_org and name = 'Sikkerhed'), 'Critical', null, '2026-09-15 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'kasper.winther@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-09-16 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'kasper.winther@ponos-mock.test'), '2026-09-28 14:00 Europe/Copenhagen'::timestamptz, 'Pending', null, null::timestamptz, null);
  select id into v_item from public.data_layer_items where organisation_id = v_org and name = 'Brandslukker 6 kg pulver';
  insert into public.task_materials (task_id, item_id, quantity) values (v_task, v_item, 6) returning id into v_tm;
  select array_agg(id) into v_ids from (
    select id from public.data_layer_item_units
    where item_id = v_item and status = 'Available' and serial_number is not null
    order by serial_number desc limit 6
  ) s;
  update public.data_layer_item_units set status = 'InUse' where id = any(v_ids);
  insert into public.task_material_units (task_material_id, unit_id) select v_tm, unnest(v_ids);

  -- #57 Test og opladning af radioer
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Test og opladning af radioer', null, '2026-09-28 08:00 Europe/Copenhagen'::timestamptz, '2026-10-05 16:00 Europe/Copenhagen'::timestamptz, 'InProgress', (select id from public.task_rooms where organisation_id = v_org and name = 'Scener & Teknik'), 'Medium', null, '2026-09-21 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'jonas.holm@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-09-22 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'jonas.holm@ponos-mock.test'), '2026-09-28 15:00 Europe/Copenhagen'::timestamptz, 'Rejected', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-09-28 17:00 Europe/Copenhagen'::timestamptz, 'Batterierne er ikke testet.');
  select id into v_item from public.data_layer_items where organisation_id = v_org and name = 'Håndradio';
  insert into public.task_materials (task_id, item_id, quantity) values (v_task, v_item, 8) returning id into v_tm;
  select array_agg(id) into v_ids from (
    select id from public.data_layer_item_units
    where item_id = v_item and status = 'Available' and serial_number is not null
    order by serial_number desc limit 8
  ) s;
  update public.data_layer_item_units set status = 'InUse' where id = any(v_ids);
  insert into public.task_material_units (task_material_id, unit_id) select v_tm, unnest(v_ids);

  -- #58 Planlæg frivilligfest
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Planlæg frivilligfest', null, '2026-10-05 08:00 Europe/Copenhagen'::timestamptz, '2026-10-31 16:00 Europe/Copenhagen'::timestamptz, 'Started', (select id from public.task_rooms where organisation_id = v_org and name = 'Frivillige'), 'Low', 4, '2026-09-22 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, false)
  returning id into v_task;

  -- #59 Indhent tilbud på hegn til RF27
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Indhent tilbud på hegn til RF27', null, '2026-10-12 08:00 Europe/Copenhagen'::timestamptz, '2026-12-01 16:00 Europe/Copenhagen'::timestamptz, 'Started', (select id from public.task_rooms where organisation_id = v_org and name = 'Planlægning'), 'Medium', null, '2026-09-24 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'henrik.dahl@ponos-mock.test'), v_admin, '2026-09-25 09:00 Europe/Copenhagen'::timestamptz);

  -- #60 Opdater kort over campingområder
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opdater kort over campingområder', null, '2026-10-05 08:00 Europe/Copenhagen'::timestamptz, '2026-11-06 16:00 Europe/Copenhagen'::timestamptz, 'Started', (select id from public.task_rooms where organisation_id = v_org and name = 'Opbygning'), 'Low', null, '2026-09-26 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, false)
  returning id into v_task;

  -- #61 Gennemgå hændelsesrapporter fra RF26
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Gennemgå hændelsesrapporter fra RF26', null, '2026-09-29 08:00 Europe/Copenhagen'::timestamptz, '2026-10-23 16:00 Europe/Copenhagen'::timestamptz, 'Started', (select id from public.task_rooms where organisation_id = v_org and name = 'Sikkerhed'), 'High', null, '2026-09-28 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'nanna.bech@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-09-28 11:00 Europe/Copenhagen'::timestamptz);

  -- #62 Udskift defekte stikdåser
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Udskift defekte stikdåser', null, '2026-09-30 08:00 Europe/Copenhagen'::timestamptz, '2026-10-10 16:00 Europe/Copenhagen'::timestamptz, 'Started', (select id from public.task_rooms where organisation_id = v_org and name = 'Scener & Teknik'), 'Medium', 2, '2026-09-29 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-09-29 11:00 Europe/Copenhagen'::timestamptz);
  select id into v_item from public.data_layer_items where organisation_id = v_org and name = 'Stikdåse 6-vejs IP44';
  insert into public.task_materials (task_id, item_id, quantity) values (v_task, v_item, 10) returning id into v_tm;
  select id into v_unit from public.data_layer_item_units
  where item_id = v_item and status = 'Available' and serial_number is null and contents_total is null and quantity > 10
  order by quantity desc limit 1;
  update public.data_layer_item_units set quantity = quantity - 10 where id = v_unit;
  insert into public.data_layer_item_units (organisation_id, item_id, location_id, quantity, status, created_at)
  select organisation_id, item_id, location_id, 10, 'Reserved', '2026-09-29 11:00 Europe/Copenhagen'::timestamptz from public.data_layer_item_units where id = v_unit
  returning id into v_unit;
  insert into public.task_material_units (task_material_id, unit_id) values (v_tm, v_unit);
  select id into v_item from public.data_layer_items where organisation_id = v_org and name = 'Kabeltromle 25 m';
  insert into public.task_materials (task_id, item_id, quantity) values (v_task, v_item, 2) returning id into v_tm;
  select array_agg(id) into v_ids from (
    select id from public.data_layer_item_units
    where item_id = v_item and status = 'Available' and serial_number is not null
    order by serial_number desc limit 2
  ) s;
  update public.data_layer_item_units set status = 'Reserved' where id = any(v_ids);
  insert into public.task_material_units (task_material_id, unit_id) select v_tm, unnest(v_ids);

  -- #63 Bestil nye pantstationer
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Bestil nye pantstationer', null, '2026-10-06 08:00 Europe/Copenhagen'::timestamptz, '2026-10-30 16:00 Europe/Copenhagen'::timestamptz, 'Started', (select id from public.task_rooms where organisation_id = v_org and name = 'Affald & Genbrug'), 'Low', null, '2026-09-29 09:30 Europe/Copenhagen'::timestamptz, null::timestamptz, false)
  returning id into v_task;

  -- #64 Tjek toiletvogne for skader
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Tjek toiletvogne for skader', null, '2026-10-01 08:00 Europe/Copenhagen'::timestamptz, '2026-10-15 16:00 Europe/Copenhagen'::timestamptz, 'Started', (select id from public.task_rooms where organisation_id = v_org and name = 'Sanitet'), 'Medium', null, '2026-09-29 10:00 Europe/Copenhagen'::timestamptz, null::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-09-29 12:00 Europe/Copenhagen'::timestamptz);

  -- #65 Opdater frivillighåndbog
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opdater frivillighåndbog', null, '2026-03-02 08:00 Europe/Copenhagen'::timestamptz, '2026-04-30 16:00 Europe/Copenhagen'::timestamptz, 'Started', (select id from public.task_rooms where organisation_id = v_org and name = 'Planlægning'), 'Low', null, '2026-02-23 09:00 Europe/Copenhagen'::timestamptz, null::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'anders.moeller@ponos-mock.test'), v_admin, '2026-02-24 09:00 Europe/Copenhagen'::timestamptz);

  -- #66 Returner lejede telte
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Returner lejede telte', null, '2026-08-31 08:00 Europe/Copenhagen'::timestamptz, '2026-09-11 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Nedtagning'), 'Medium', null, '2026-08-20 09:00 Europe/Copenhagen'::timestamptz, '2026-09-04 14:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'oliver.juhl@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-08-21 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'freja.lassen@ponos-mock.test'), (select id from public.profiles where email = 'rasmus.kristensen@ponos-mock.test'), '2026-08-21 09:00 Europe/Copenhagen'::timestamptz);

  -- #67 Rengør frivilligcamp efter RF26
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Rengør frivilligcamp efter RF26', null, '2026-09-01 08:00 Europe/Copenhagen'::timestamptz, '2026-09-15 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Frivillige'), 'Low', null, '2026-08-25 09:00 Europe/Copenhagen'::timestamptz, '2026-09-10 15:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'anders.moeller@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-08-26 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mads.poulsen@ponos-mock.test'), (select id from public.profiles where email = 'mette.hansen@ponos-mock.test'), '2026-08-26 09:00 Europe/Copenhagen'::timestamptz);

  -- #68 Afregning med affaldsleverandør
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Afregning med affaldsleverandør', null, '2026-09-07 08:00 Europe/Copenhagen'::timestamptz, '2026-09-15 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Affald & Genbrug'), 'Medium', null, '2026-08-28 09:00 Europe/Copenhagen'::timestamptz, '2026-09-17 13:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-08-29 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'line.vestergaard@ponos-mock.test'), '2026-09-17 10:00 Europe/Copenhagen'::timestamptz, 'Accepted', (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-09-17 13:00 Europe/Copenhagen'::timestamptz, null);

  -- #69 Evaluering RF26 – scener og teknik
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Evaluering RF26 – scener og teknik', null, '2026-09-07 08:00 Europe/Copenhagen'::timestamptz, '2026-09-22 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Scener & Teknik'), 'High', null, '2026-09-02 09:00 Europe/Copenhagen'::timestamptz, '2026-09-24 16:00 Europe/Copenhagen'::timestamptz, true)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-09-03 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'mikkel.brandt@ponos-mock.test'), (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-09-03 09:00 Europe/Copenhagen'::timestamptz);
  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, (select id from public.profiles where email = 'camilla.thorsen@ponos-mock.test'), '2026-09-24 13:00 Europe/Copenhagen'::timestamptz, 'Accepted', v_admin, '2026-09-24 16:00 Europe/Copenhagen'::timestamptz, null);

  -- #70 Opdater kontaktliste for holdledere
  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, 'Opdater kontaktliste for holdledere', null, '2026-09-28 08:00 Europe/Copenhagen'::timestamptz, '2026-10-02 16:00 Europe/Copenhagen'::timestamptz, 'Completed', (select id from public.task_rooms where organisation_id = v_org and name = 'Planlægning'), 'Low', null, '2026-09-23 09:00 Europe/Copenhagen'::timestamptz, '2026-09-29 11:00 Europe/Copenhagen'::timestamptz, false)
  returning id into v_task;
  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, (select id from public.profiles where email = 'sofie.andersen@ponos-mock.test'), v_admin, '2026-09-24 09:00 Europe/Copenhagen'::timestamptz);

  -- Lagerhistorik (data_layer_item_unit_history): triggeren har logget alle
  -- enheder med tidspunktet for denne kørsel. Mockdata skal have en
  -- realistisk fortid, så statistik for fx 2025 kan testes:
  -- a) første række pr. enhed starter ved enhedens created_at,
  -- b) statusskift (reserveret af en opgave) ved opgavens første
  --    tildeling - dog tidligst enhedens oprettelse.
  update public.data_layer_item_unit_history h
  set valid_from = u.created_at
  from public.data_layer_item_units u
  where h.unit_id = u.id
    and h.organisation_id = v_org
    and h.id = (select min(h2.id) from public.data_layer_item_unit_history h2 where h2.unit_id = u.id);

  with changed as (
    select tmu.unit_id, greatest(min(ta.assigned_at), min(u.created_at)) as changed_at
    from public.task_material_units tmu
    join public.task_materials tm on tm.id = tmu.task_material_id
    join public.tasks t on t.id = tm.task_id and t.organisation_id = v_org
    join public.task_assignees ta on ta.task_id = tm.task_id
    join public.data_layer_item_units u on u.id = tmu.unit_id
    group by tmu.unit_id
  )
  update public.data_layer_item_unit_history h
  set valid_from = case when h.valid_to is null then c.changed_at else h.valid_from end,
      valid_to   = case when h.valid_to is null then null else c.changed_at end
  from changed c
  where h.unit_id = c.unit_id
    and (h.valid_to is not null
         or h.id <> (select min(h2.id) from public.data_layer_item_unit_history h2 where h2.unit_id = h.unit_id));

  raise notice 'Seed 06 færdig: 70 opgaver.';
end $$;
