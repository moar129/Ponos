-- =====================================================================
-- SEED 02 - MOCK-BRUGERE, MEDLEMSKABER, ANSØGNINGER, INVITATIONER
-- Kræver 01_roles.sql. Opretter 27 brugere direkte i auth.users +
-- auth.identities (handle_new_user laver profilen). Alle har emailen
-- <fornavn>.<efternavn>@ponos-mock.test og password Ponos1234!
--   21 medlemmer (fordelt på roller), 6 ikke-medlemmer:
--   3 Pending ansøgninger, 1 Rejected ansøgning, 2 Pending invitationer.
-- =====================================================================
do $$
declare
  v_org     uuid;
  v_admin   uuid;
  v_user    uuid;
  v_role    uuid;
  v_pw      text := crypt('Ponos1234!', gen_salt('bf'));
  r         record;
begin
  select id into v_org from public.organisations where lower(trim(name)) = 'roskilde festival';
  if v_org is null then
    raise exception 'Organisationen "Roskilde Festival" findes ikke.';
  end if;

  if exists (select 1 from auth.users where email like '%@ponos-mock.test') then
    raise exception 'Allerede seedet - kør 99_cleanup.sql først.';
  end if;

  if not exists (select 1 from public.roles where organisation_id = v_org and name = 'Frivillig') then
    raise exception 'Kør 01_roles.sql først.';
  end if;

  select m.user_id into v_admin
  from public.memberships m
  join public.roles ro on ro.id = m.role_id
  where m.organisation_id = v_org and ro.name = 'Admin'
  limit 1;

  -- role_name null = ikke medlem
  for r in
    select * from (values
      ('mette.hansen',        'Mette',     'Kjær Hansen',   'Festivalledelse',      timestamptz '2024-09-02 09:00+02', 'Driftschef. Ansvarlig for festivalens samlede logistik og drift.'),
      ('lars.boegh',          'Lars',      'Bøgh',          'Festivalledelse',      timestamptz '2024-09-02 09:30+02', 'Økonomiansvarlig i festivalledelsen.'),
      ('sofie.andersen',      'Sofie',     'Lund Andersen', 'Frivilligkoordinator', timestamptz '2024-09-16 10:00+02', 'Koordinerer rekruttering og vagtplaner for frivillige.'),
      ('anders.moeller',      'Anders',    'Møller',        'Frivilligkoordinator', timestamptz '2024-10-01 10:00+02', 'Står for frivilligcampen og frivilligudstyr.'),
      ('henrik.dahl',         'Henrik',    'Dahl',          'Lagerchef',            timestamptz '2024-09-09 08:00+02', 'Lagerchef på Centrallageret. Styrer indkøb og optælling.'),
      ('emma.nielsen',        'Emma',      'Friis Nielsen', 'Lagermedarbejder',     timestamptz '2025-01-13 08:00+01', 'Lagermedarbejder, primært hegn og telte.'),
      ('jonas.holm',          'Jonas',     'Holm',          'Lagermedarbejder',     timestamptz '2025-03-03 08:00+01', 'Lagermedarbejder, primært radioer og teknik.'),
      ('camilla.thorsen',     'Camilla',   'Thorsen',       'Holdleder',            timestamptz '2024-09-23 09:00+02', 'Holdleder for scenebyg.'),
      ('rasmus.kristensen',   'Rasmus',    'Kristensen',    'Holdleder',            timestamptz '2025-02-10 09:00+01', 'Holdleder for hegn og campingområder.'),
      ('line.vestergaard',    'Line',      'Vestergaard',   'Holdleder',            timestamptz '2025-04-07 09:00+02', 'Holdleder for sanitet og affald.'),
      ('mikkel.brandt',       'Mikkel',    'Brandt',        'Teknik & El',          timestamptz '2024-10-14 09:00+02', 'Lyd- og lystekniker.'),
      ('peter.skov',          'Peter',     'Skov',          'Teknik & El',          timestamptz '2025-01-20 09:00+01', 'Elektriker. Ansvarlig for strøm og generatorer.'),
      ('nanna.bech',          'Nanna',     'Bech',          'Sikkerhed & Vagt',     timestamptz '2024-11-04 09:00+01', 'Sikkerhedskoordinator.'),
      ('kasper.winther',      'Kasper',    'Winther',       'Sikkerhed & Vagt',     timestamptz '2025-02-24 09:00+01', 'Vagtleder og ansvarlig for radiokommunikation.'),
      ('ida.mortensen',       'Ida',       'Mortensen',     'Frivillig',            timestamptz '2025-03-17 12:00+01', 'Frivillig siden 2019, primært på hegnsholdet.'),
      ('oliver.juhl',         'Oliver',    'Juhl',          'Frivillig',            timestamptz '2025-04-14 12:00+02', 'Frivillig på opbygning og affald.'),
      ('freja.lassen',        'Freja',     'Lassen',        'Frivillig',            timestamptz '2025-05-05 12:00+02', 'Frivillig på sanitet i Camp Vest.'),
      ('mads.poulsen',        'Mads',      'Poulsen',       'Frivillig',            timestamptz '2025-05-19 12:00+02', 'Frivillig på affaldsholdet.'),
      ('sara.oestergaard',    'Sara',      'Østergaard',    'Frivillig',            timestamptz '2025-06-02 12:00+02', 'Frivillig på affald og pant.'),
      ('tobias.krogh',        'Tobias',    'Krogh',         'Frivillig',            timestamptz '2026-05-11 12:00+02', 'Ny frivillig i 2026.'),
      ('ahmad.rahimi',        'Ahmad',     'Rahimi',        'Medlem',               timestamptz '2026-09-15 12:00+02', null),
      ('julie.svendsen',      'Julie',     'Svendsen',      null,                   timestamptz '2026-09-20 18:00+02', 'Vil gerne være frivillig på RF27.'),
      ('christian.lauridsen', 'Christian', 'Lauridsen',     null,                   timestamptz '2026-09-25 18:00+02', null),
      ('amalie.koch',         'Amalie',    'Koch',          null,                   timestamptz '2026-09-27 18:00+02', 'Uddannet elektriker.'),
      ('nikolaj.berg',        'Nikolaj',   'Berg',          null,                   timestamptz '2026-08-10 18:00+02', null),
      ('victor.hald',         'Victor',    'Hald',          null,                   timestamptz '2026-09-01 18:00+02', null),
      ('maja.ravn',           'Maja',      'Ravn',          null,                   timestamptz '2026-09-10 18:00+02', null)
    ) as t(local_part, first_name, last_name, role_name, joined_at, description)
  loop
    v_user := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
      r.local_part || '@ponos-mock.test', v_pw, r.joined_at,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name', r.first_name, 'last_name', r.last_name),
      r.joined_at, r.joined_at,
      '', '', '', '', '', '', ''
    );

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      v_user::text, v_user,
      jsonb_build_object('sub', v_user::text, 'email', r.local_part || '@ponos-mock.test', 'email_verified', true),
      'email', r.joined_at, r.joined_at, r.joined_at
    );

    -- Profilen er lavet af handle_new_user (on_auth_user_created).
    update public.profiles
      set description = r.description,
          created_at  = r.joined_at,
          active_organisation_id = case when r.role_name is null then null else v_org end
      where id = v_user;

    if r.role_name is not null then
      select id into v_role from public.roles where organisation_id = v_org and name = r.role_name;
      insert into public.memberships (user_id, organisation_id, role_id, created_at)
      values (v_user, v_org, v_role, r.joined_at);
    end if;
  end loop;

  -- Ansøgninger (US-05/06): 3 afventer, 1 afvist.
  insert into public.membership_requests (user_id, organisation_id, status, requested_at, reviewed_at, reviewed_by)
  select p.id, v_org, x.status::public.e_request_status, x.requested_at, x.reviewed_at,
         case when x.reviewed_at is null then null else v_admin end
  from (values
    ('julie.svendsen',      'Pending',  timestamptz '2026-09-24 19:12+02', null::timestamptz),
    ('christian.lauridsen', 'Pending',  timestamptz '2026-09-27 08:40+02', null),
    ('amalie.koch',         'Pending',  timestamptz '2026-09-28 21:05+02', null),
    ('nikolaj.berg',        'Rejected', timestamptz '2026-08-12 14:30+02', timestamptz '2026-08-14 10:00+02')
  ) as x(local_part, status, requested_at, reviewed_at)
  join public.profiles p on p.email = x.local_part || '@ponos-mock.test';

  -- Invitationer (US-67): 2 afventer. Trigger laver notifikation til modtager.
  insert into public.membership_invitations (organisation_id, invited_user_id, invited_by, status, created_at)
  select v_org, p.id, coalesce(inv.id, v_admin), 'Pending', x.created_at
  from (values
    ('victor.hald', null,             timestamptz '2026-09-25 11:00+02'),
    ('maja.ravn',   'sofie.andersen', timestamptz '2026-09-28 13:30+02')
  ) as x(local_part, invited_by, created_at)
  join public.profiles p on p.email = x.local_part || '@ponos-mock.test'
  left join public.profiles inv on inv.email = x.invited_by || '@ponos-mock.test';

  raise notice 'Seed 02 færdig: 27 brugere, 21 medlemskaber, 4 ansøgninger, 2 invitationer.';
end $$;
