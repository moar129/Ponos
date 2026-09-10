-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- for gen_random_uuid()


-- ---------------------------------------------------------------------
-- 1. ENUMS (ETaskStatus, EItemStatus, EMembershipRequestStatus)
-- ---------------------------------------------------------------------
create type e_task_status as enum ('Started', 'InProgress', 'Completed');

create type e_item_status as enum (
  'Available', 'Reserved', 'OutOfStock', 'InUse', 'Missing', 'Damaged', 'Maintenance'
);

create type e_membership_request_status as enum ('Pending', 'Accepted', 'Rejected');


-- ---------------------------------------------------------------------
-- 2. ORGANISATION
-- ---------------------------------------------------------------------
create table public.organisations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- Organisationsnavne skal være unikke (case-insensitivt, trimmet) -
-- ellers kan to organisationer oprettes med samme navn (US-58).
create unique index organisations_name_unique on public.organisations (lower(trim(name)));


-- ---------------------------------------------------------------------
-- 3. PROFILES (= domænemodellens "User")
-- Navngivet "profiles" i stedet for "users" for ikke at kollidere med
-- Supabase's indbyggede auth.users. id er 1:1 med auth.users.id.
-- active_organisation_id (US-59, tidligere "organisation_id") er IKKE
-- længere brugerens ene organisation - det er den organisation, hvis
-- data brugeren p.t. ser ("aktiv organisation"). Faktisk medlemskab
-- (many-to-many, én rolle pr. organisation) ligger i memberships-tabellen
-- (afsnit 6.5). Må kun ændres via set_active_organisation()/
-- create_organisation() - se prevent_self_role_org_change (15.7).
-- ---------------------------------------------------------------------
create table public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  first_name             text not null,
  last_name              text not null,
  email                  text not null unique,
  description            text,
  note_admin             text,
  url_picture            text,
  active_organisation_id uuid references public.organisations(id) on delete set null,
  created_at             timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 4. ROLE (tilhører én organisation)
-- ---------------------------------------------------------------------
create table public.roles (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  name             text not null,
  created_at       timestamptz not null default now(),
  unique (organisation_id, name)
);


-- ---------------------------------------------------------------------
-- 5. PRIVILEGE (tilhører én rolle)
-- ---------------------------------------------------------------------
create table public.privileges (
  id       uuid primary key default gen_random_uuid(),
  role_id  uuid not null references public.roles(id) on delete cascade,
  name     text not null,
  unique (role_id, name)
);


-- ---------------------------------------------------------------------
-- 6. MEMBERSHIP REQUEST
-- organisation_id er tilføjet ud over diagrammet, da en anmodning i
-- praksis skal pege på hvilken organisation der anmodes om (jf. US-05
-- "vælg org"). requester = user_id, godkender = reviewed_by.
-- ---------------------------------------------------------------------
create table public.membership_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  status           e_membership_request_status not null default 'Pending',
  requested_at     timestamptz not null default now(),
  reviewed_at      timestamptz,
  reviewed_by      uuid references public.profiles(id) on delete set null
);

-- US-05: ingen dubletter af AKTIVE (Pending) anmodninger for samme bruger+org
create unique index membership_requests_unique_pending
  on public.membership_requests (user_id, organisation_id)
  where (status = 'Pending');

create index idx_membership_requests_org on public.membership_requests (organisation_id);
create index idx_membership_requests_user on public.membership_requests (user_id);


-- ---------------------------------------------------------------------
-- 6.5 MEMBERSHIP (US-59 - faktisk organisationsmedlemskab, many-to-many)
-- En bruger kan være medlem af flere organisationer samtidig, med sin
-- egen rolle pr. organisation. profiles.active_organisation_id peger på
-- hvilken af disse medlemskaber, der p.t. er "aktiv" (styrer hvilken
-- organisations data brugeren ser - se auth_profile_org(), afsnit 14).
-- Oprettes af create_organisation() (15.8) og af
-- handle_membership_request_status_change() ved accept (15.3) - aldrig
-- direkte af klienten.
-- ---------------------------------------------------------------------
create table public.memberships (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  role_id          uuid references public.roles(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (user_id, organisation_id)
);

create index idx_memberships_user on public.memberships (user_id);
create index idx_memberships_org on public.memberships (organisation_id);


-- ---------------------------------------------------------------------
-- 6.6 MEMBERSHIP INVITATION (US-67 - mirror af membership_requests, men
-- ADMIN-initieret i stedet for bruger-initieret: invited_by = afsenderen,
-- invited_user_id = modtageren, som selv skal acceptere/afvise).
-- Genbruger e_membership_request_status (samme facon: Pending/Accepted/
-- Rejected), ingen ny enum-type nødvendig.
-- ---------------------------------------------------------------------
create table public.membership_invitations (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  invited_user_id  uuid not null references public.profiles(id) on delete cascade,
  invited_by       uuid references public.profiles(id) on delete set null,
  status           e_membership_request_status not null default 'Pending',
  created_at       timestamptz not null default now(),
  reviewed_at      timestamptz
);

-- Ingen dubletter af AKTIVE (Pending) invitationer for samme bruger+org.
create unique index membership_invitations_unique_pending
  on public.membership_invitations (invited_user_id, organisation_id)
  where (status = 'Pending');

create index idx_membership_invitations_org on public.membership_invitations (organisation_id);
create index idx_membership_invitations_user on public.membership_invitations (invited_user_id);


-- ---------------------------------------------------------------------
-- 7. LOCATION (tilhører én organisation)
-- ---------------------------------------------------------------------
create table public.locations (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  name             text not null,
  description      text,
  address          text
);

create index idx_locations_org on public.locations (organisation_id);


-- ---------------------------------------------------------------------
-- 8. DATA LAYER CATEGORY (kan have subcategories, tilhører organisation)
-- ---------------------------------------------------------------------
create table public.data_layer_categories (
  id                  uuid primary key default gen_random_uuid(),
  organisation_id     uuid not null references public.organisations(id) on delete cascade,
  parent_category_id  uuid references public.data_layer_categories(id) on delete set null,
  title               text not null,
  rank                int not null default 0
);

create index idx_categories_org on public.data_layer_categories (organisation_id);
create index idx_categories_parent on public.data_layer_categories (parent_category_id);


-- ---------------------------------------------------------------------
-- 9. DATA LAYER ITEM
-- Item hører BÅDE til en Category (Items) og direkte til en
-- Organisation (Receives) jf. diagrammet. organisation_id holdes
-- automatisk i sync med kategoriens organisation via trigger nedenfor,
-- så man kun behøver angive category_id ved oprettelse.
-- ---------------------------------------------------------------------
create table public.data_layer_items (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  category_id      uuid not null references public.data_layer_categories(id) on delete cascade,
  location_id      uuid references public.locations(id) on delete set null,
  name             text not null,
  description      text,
  quantity         numeric not null default 0,
  status           e_item_status not null default 'Available'
);

create index idx_items_org on public.data_layer_items (organisation_id);
create index idx_items_category on public.data_layer_items (category_id);
create index idx_items_location on public.data_layer_items (location_id);
create index idx_items_status on public.data_layer_items (status);


-- ---------------------------------------------------------------------
-- 10. TASK (tilhører organisation)
-- ---------------------------------------------------------------------
create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  title            text not null,
  description      text,
  start_date       timestamptz,
  end_date         timestamptz,
  status           e_task_status not null default 'Started'
);

create index idx_tasks_org on public.tasks (organisation_id);
create index idx_tasks_status on public.tasks (status);

-- AssignedTo: mange-til-mange mellem Task og User
create table public.task_assignees (
  task_id  uuid not null references public.tasks(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

-- Participants: mange-til-mange mellem Task og User
create table public.task_participants (
  task_id  uuid not null references public.tasks(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);


-- ---------------------------------------------------------------------
-- 11. TASK MATERIAL (kobler Task til DataLayerItem)
-- ---------------------------------------------------------------------
create table public.task_materials (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid not null references public.tasks(id) on delete cascade,
  item_id   uuid not null references public.data_layer_items(id) on delete cascade,
  quantity  numeric not null default 1
);

create index idx_task_materials_task on public.task_materials (task_id);
create index idx_task_materials_item on public.task_materials (item_id);


-- ---------------------------------------------------------------------
-- 12. STATISTICS SNAPSHOT + STATISTICS VALUE
-- ---------------------------------------------------------------------
create table public.statistics_snapshots (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  period_start     timestamptz not null,
  period_end       timestamptz not null,
  created_at       timestamptz not null default now()
);

create index idx_snapshots_org on public.statistics_snapshots (organisation_id);

create table public.statistics_values (
  id           uuid primary key default gen_random_uuid(),
  snapshot_id  uuid not null references public.statistics_snapshots(id) on delete cascade,
  name         text not null,
  value        numeric not null
);

create index idx_stat_values_snapshot on public.statistics_values (snapshot_id);


-- ---------------------------------------------------------------------
-- 13. NEWS (global – leveres af ekstern API, ikke koblet til organisation)
-- ---------------------------------------------------------------------
create table public.news (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  picture_url   text,
  published_at  timestamptz not null default now()
);


-- =====================================================================
-- 14. HJÆLPEFUNKTIONER (bruges i RLS-policies)
-- =====================================================================

-- Returnerer den nuværende brugers AKTIVE organisation (auth.uid()) -
-- US-59: ikke nødvendigvis brugerens eneste organisation, se memberships
-- (afsnit 6.5). Alle org-scopede RLS-policies i afsnit 16 bruger denne,
-- så et skift af aktiv organisation (set_active_organisation, 15.10)
-- slår automatisk igennem alle steder uden at nogen policy skal ændres.
create or replace function public.auth_profile_org()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select active_organisation_id from public.profiles where id = auth.uid();
$$;

-- Tjekker om nuværende bruger har en given privilege via sin rolle i den
-- AKTIVE organisation (US-59: rollen ligger på memberships, ikke
-- profiles - en bruger kan have forskellige roller/privilegier i sine
-- forskellige organisationer). Konvention: privilegiet "admin" er en
-- superset af alle andre - se has_privilege_or_admin() nedenfor, som er
-- det RLS-policies reelt bruger.
create or replace function public.has_privilege(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles pr
    join public.memberships m on m.user_id = pr.id and m.organisation_id = pr.active_organisation_id
    join public.privileges p on p.role_id = m.role_id
    where pr.id = auth.uid() and p.name = p_name
  );
$$;

-- Fase 1 granulære privilegier: hver CRUD-handling styres af sit eget,
-- uafhængigt tildelelige privilegie (fx "manage_roles",
-- "manage_membership_requests", "manage_organisation") - admin skal
-- altid kunne alt, uanset hvilke granulære privilegier der er tildelt.
create or replace function public.has_privilege_or_admin(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_privilege(p_name) or public.has_privilege('admin');
$$;


-- US-06: en ansøger er endnu IKKE medlem, så der findes ingen
-- memberships-række for dem i organisationen. Policy'en "Se egen profil
-- eller profiler i egen organisation" rammer derfor ikke, og
-- administratoren kunne ikke se ansøgerens navn og email. Funktionen er
-- security definer, så opslaget i membership_requests sker uden RLS -
-- det undgår rekursion mellem de to tabellers policies. Kun ansøgere med
-- status 'Pending' eksponeres.
create or replace function public.is_pending_requester_to_my_org(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_privilege_or_admin('manage_membership_requests') and exists (
    select 1
    from public.membership_requests mr
    where mr.user_id = p_user_id
      and mr.organisation_id = public.auth_profile_org()
      and mr.status = 'Pending'
  );
$$;


-- =====================================================================
-- 15. TRIGGERS
-- =====================================================================

-- 15.1 Opret automatisk en profile-række når en ny bruger oprettes i
-- Supabase Auth (US-01: Opret konto). Forventer first_name/last_name i
-- auth.users.raw_user_meta_data (sættes fra signup-formularen).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 15.2 En bruger må ALDRIG selv ændre sin egen role_id eller
-- organisation_id direkte (US-04: kan ikke ændre egne privilegier,
-- US-11: bruger kan ikke tildele sig selv en rolle). Org-tilknytning
-- sker udelukkende via membership_requests-flowet (se 15.3).
create or replace function public.prevent_self_role_org_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id = auth.uid() then
    if new.role_id is distinct from old.role_id then
      raise exception 'Du kan ikke tildele dig selv en rolle.';
    end if;
    if new.organisation_id is distinct from old.organisation_id then
      raise exception 'Du kan ikke ændre din egen organisationstilknytning direkte.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_self_role_org_change
  before update on public.profiles
  for each row execute function public.prevent_self_role_org_change();


-- 15.3 Når en medlemsanmodning godkendes/afvises, sættes ReviewedAt og
-- ReviewedBy automatisk, og ved godkendelse tilknyttes brugeren
-- organisationen (uden automatisk rolle) – jf. US-07 og US-08.
-- US-59: opretter et memberships-medlemskab i stedet for at overskrive
-- profiles - brugeren kan allerede være medlem/have en aktiv organisation
-- andetsteds, som ikke må påvirkes. Aktiv organisation sættes derfor kun,
-- hvis brugeren ikke allerede har én.
create or replace function public.handle_membership_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Accepted' and old.status is distinct from 'Accepted' then
    new.reviewed_at := coalesce(new.reviewed_at, now());
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());

    insert into public.memberships (user_id, organisation_id)
    values (new.user_id, new.organisation_id)
    on conflict (user_id, organisation_id) do nothing;

    update public.profiles
      set active_organisation_id = new.organisation_id
      where id = new.user_id and active_organisation_id is null;
  elsif new.status = 'Rejected' and old.status is distinct from 'Rejected' then
    new.reviewed_at := coalesce(new.reviewed_at, now());
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_membership_request_status_change
  before update on public.membership_requests
  for each row execute function public.handle_membership_request_status_change();


-- 15.4 Hold data_layer_items.organisation_id automatisk i sync med
-- kategoriens organisation, så man kun skal angive category_id.
create or replace function public.sync_item_organisation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select organisation_id into new.organisation_id
  from public.data_layer_categories
  where id = new.category_id;
  return new;
end;
$$;

create trigger trg_sync_item_organisation
  before insert or update of category_id on public.data_layer_items
  for each row execute function public.sync_item_organisation();


-- 15.5 Beskytter admin-privilegiet PÅ ORGANISATIONENS "Admin"-ROLLE mod
-- omdøb/slet (US-13, roleApi.ts/privilegeApi.ts har en UI-guard for
-- dette, men RLS alene kan ikke skelne "netop denne række" - enhver
-- admin må ellers redigere/slette privilegier i egen organisation).
-- Andre roller må frit have et privilege ved navn 'admin' (fx til test)
-- uden at blive låst - kun kombinationen "Admin"-rollen + admin-
-- privilegiet er beskyttet, da det er den, der reelt ville låse alle
-- administratorer ude, hvis den forsvandt.
-- US-64: respekterer ponos.bypass_admin_protection - uden denne ville
-- delete_organisation (15.13) ikke kunne kaskade-slette Admin-privilegiet
-- sammen med resten af organisationen, selvom hele organisationen (og
-- dermed enhver mening i at beskytte netop dens Admin-rolle) forsvinder.
create or replace function public.prevent_admin_privilege_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_name text;
begin
  if coalesce(current_setting('ponos.bypass_admin_protection', true), 'false') = 'true' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select name into role_name from public.roles where id = old.role_id;

  if old.name = 'admin' and role_name = 'Admin' then
    if tg_op = 'DELETE' then
      raise exception 'Admin-privilegiet på rollen Admin kan ikke slettes.';
    end if;
    if new.name is distinct from old.name then
      raise exception 'Admin-privilegiet på rollen Admin kan ikke omdøbes.';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger trg_prevent_admin_privilege_change
  before update or delete on public.privileges
  for each row execute function public.prevent_admin_privilege_change();


-- 15.6 Beskytter organisationens "Admin"-rolle mod omdøb/slet, når den
-- har admin-privilegiet (US-12) - sletning ville ellers kaskade-slette
-- selve admin-privilegiet (privileges.role_id ... on delete cascade).
-- Andre roller, der måtte have et privilege ved navn 'admin' (fx til
-- test), er IKKE låst - kun rollen ved navn "Admin" specifikt.
-- US-64: respekterer samme ponos.bypass_admin_protection-flag som
-- prevent_admin_privilege_change (15.5) - se dens kommentar for hvorfor.
create or replace function public.prevent_admin_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_role boolean;
begin
  if coalesce(current_setting('ponos.bypass_admin_protection', true), 'false') = 'true' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if old.name <> 'Admin' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  is_admin_role := exists (
    select 1 from public.privileges
    where role_id = old.id and name = 'admin'
  );

  if not is_admin_role then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Rollen Admin har admin-privilegiet og kan ikke slettes.';
  end if;

  if new.name is distinct from old.name then
    raise exception 'Rollen Admin har admin-privilegiet og kan ikke omdøbes.';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_admin_role_change
  before update or delete on public.roles
  for each row execute function public.prevent_admin_role_change();


-- 15.7 US-58: create_organisation (nedenfor) skal kunne sætte den
-- kaldende brugers egen aktive organisation (bruger opretter og bliver
-- selv admin) - trg_prevent_self_role_org_change (15.2) blokerer normalt
-- netop dette. Funktionen sætter et transaktionslokalt flag (bypass),
-- som denne opdaterede version af triggeren respekterer. Almindelige
-- klient-opdateringer sætter aldrig flaget og er derfor stadig blokeret
-- som før. US-59: role_id-grenen er fjernet - rollen ligger nu på
-- memberships (se trg_prevent_self_membership_role_change, 15.9), ikke
-- profiles. set_active_organisation (15.10) bruger samme bypass-flag.
create or replace function public.prevent_self_role_org_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id = auth.uid()
     and coalesce(current_setting('ponos.bypass_self_role_org_change', true), 'false') <> 'true' then
    if new.active_organisation_id is distinct from old.active_organisation_id then
      raise exception 'Du kan ikke ændre din aktive organisation direkte.';
    end if;
  end if;
  return new;
end;
$$;


-- 15.8 US-58/US-60: Opretter en ny organisation, en "Admin"-rolle med
-- admin-privilegiet, og gør den kaldende bruger til admin i den - alt i
-- én atomisk transaktion (fejler hele vejen igennem hvis noget går galt
-- undervejs). security definer, fordi roles/privileges/memberships-
-- inserts og profiles-opdateringen ellers ville blive blokeret af RLS
-- hhv. trg_prevent_self_role_org_change. US-60: en bruger, der allerede
-- har et eller flere medlemskaber, kan også oprette en ny organisation
-- her - eneste guard er login og et udfyldt navn.
create or replace function public.create_organisation(p_name text)
returns public.organisations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org      public.organisations;
  v_role_id  uuid;
  v_user_id  uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Du skal være logget ind for at oprette en organisation.';
  end if;

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Organisationens navn skal udfyldes.';
  end if;

  insert into public.organisations (name)
  values (trim(p_name))
  returning * into v_org;

  insert into public.roles (organisation_id, name)
  values (v_org.id, 'Admin')
  returning id into v_role_id;

  insert into public.privileges (role_id, name)
  values (v_role_id, 'admin');

  insert into public.memberships (user_id, organisation_id, role_id)
  values (v_user_id, v_org.id, v_role_id);

  -- Lokal til denne transaktion (tredje argument 'true') - nulstilles
  -- automatisk ved commit, påvirker ingen andre requests.
  perform set_config('ponos.bypass_self_role_org_change', 'true', true);

  -- US-60: den nyoprettede organisation bliver altid brugerens aktive
  -- organisation med det samme (også ved en 2., 3., ... organisation) -
  -- brugeren kan stadig frit skifte tilbage bagefter via
  -- set_active_organisation (15.10) / "Mine organisationer".
  update public.profiles
    set active_organisation_id = v_org.id
    where id = v_user_id;

  return v_org;
end;
$$;

grant execute on function public.create_organisation(text) to authenticated;


-- 15.9 US-59: en bruger med manage_roles må ikke kunne tildele SIG SELV
-- en rolle via en memberships-opdatering (samme escalation-tanke som
-- prevent_self_role_org_change havde for profiles.role_id før US-59).
create or replace function public.prevent_self_membership_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id = auth.uid() and new.role_id is distinct from old.role_id then
    raise exception 'Du kan ikke tildele dig selv en rolle.';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_self_membership_role_change
  before update on public.memberships
  for each row execute function public.prevent_self_membership_role_change();


-- 15.10 US-59: skifter brugerens aktive organisation. Validerer at
-- brugeren faktisk er medlem, før profiles.active_organisation_id
-- opdateres - klienten må ALDRIG opdatere den kolonne direkte (kun
-- denne funktion og create_organisation sætter den, begge via samme
-- bypass-flag som trg_prevent_self_role_org_change respekterer).
create or replace function public.set_active_organisation(p_organisation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Du skal være logget ind for at skifte organisation.';
  end if;

  if not exists (
    select 1 from public.memberships
    where user_id = v_user_id and organisation_id = p_organisation_id
  ) then
    raise exception 'Du er ikke medlem af denne organisation.';
  end if;

  perform set_config('ponos.bypass_self_role_org_change', 'true', true);

  update public.profiles
    set active_organisation_id = p_organisation_id
    where id = v_user_id;
end;
$$;

grant execute on function public.set_active_organisation(uuid) to authenticated;


-- 15.11 US-61: fjerner brugerens medlemskab af p_organisation_id.
-- Blokerer hvis brugeren er organisationens ENESTE administrator (dvs.
-- eneste medlemskab hvis rolle bærer 'admin'-privilegiet) - organisationen
-- skal altid have mindst én administrator. Hvis den forladte organisation
-- var brugerens aktive, vælges automatisk en anden af de resterende
-- medlemskaber som ny aktiv organisation (vilkårlig - ældste medlemskab),
-- eller ingen hvis ingen er tilbage - samme "automatisk skift + besked"-
-- mønster som create_organisation (15.8/US-60), derfor samme bypass-flag.
-- Returnerer den nye aktive organisation (eller null), så klienten kan
-- vise hvilken organisation brugeren nu er på. Påvirker aldrig brugerens
-- øvrige medlemskaber/roller (kun DELETE på egen række).
create or replace function public.leave_organisation(p_organisation_id uuid)
returns public.organisations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id       uuid := auth.uid();
  v_role_id       uuid;
  v_is_admin      boolean;
  v_other_admins  int;
  v_next_org_id   uuid;
  v_result        public.organisations;
begin
  if v_user_id is null then
    raise exception 'Du skal være logget ind for at forlade en organisation.';
  end if;

  select role_id into v_role_id
  from public.memberships
  where user_id = v_user_id and organisation_id = p_organisation_id;

  if not found then
    raise exception 'Du er ikke medlem af denne organisation.';
  end if;

  v_is_admin := v_role_id is not null and exists (
    select 1 from public.privileges where role_id = v_role_id and name = 'admin'
  );

  if v_is_admin then
    select count(*) into v_other_admins
    from public.memberships m
    join public.privileges p on p.role_id = m.role_id and p.name = 'admin'
    where m.organisation_id = p_organisation_id and m.user_id <> v_user_id;

    if v_other_admins = 0 then
      raise exception 'Du er den eneste administrator i organisationen. Gør et andet medlem til administrator, før du forlader den.';
    end if;
  end if;

  delete from public.memberships
  where user_id = v_user_id and organisation_id = p_organisation_id;

  perform set_config('ponos.bypass_self_role_org_change', 'true', true);

  select organisation_id into v_next_org_id
  from public.memberships
  where user_id = v_user_id
  order by created_at
  limit 1;

  update public.profiles
    set active_organisation_id = v_next_org_id
    where id = v_user_id and active_organisation_id = p_organisation_id;

  if v_next_org_id is not null then
    select * into v_result from public.organisations where id = v_next_org_id;
  end if;

  return v_result;
end;
$$;

grant execute on function public.leave_organisation(uuid) to authenticated;


-- 15.12 US-59 (fix): henter "Mine organisationer"-listen (organisation +
-- rolle + er-aktiv pr. medlemskab) i ét atomisk, security definer-kald.
-- Nødvendig fordi roles-tabellens RLS ("Se roller i egen organisation",
-- 16.3) er scopet til brugerens AKTIVE organisation - et almindeligt
-- klient-opslag kunne derfor ikke se rollenavnet for en organisation, der
-- ikke lige er aktiv, og viste fejlagtigt "Ingen rolle tildelt". At udvide
-- selve roles-RLS'en blev overvejet, men ville lække andre organisationers
-- roller ind i /roller's rolle-STYRINGS-visning for brugere med flere
-- organisationer - denne funktion undgår det helt ved at læse uden om RLS.
-- US-64: udvidet med is_admin (styrer "Slet organisation"-knappen - kun
-- en reel administrator af DEN organisation må slette den) og
-- member_count (til bekræft-teksten "fjerner adgang for N andre
-- medlemmer"). Samme grund som ovenfor til at beregne det her i stedet
-- for et separat klient-opslag: memberships-RLS er også scopet til
-- brugerens aktive organisation, så et opslag på "andre medlemmer i en
-- IKKE-aktiv organisation" ville ramme samme blokering.
create or replace function public.get_my_memberships()
returns table (
  organisation_id    uuid,
  organisation_name  text,
  role_id            uuid,
  role_name          text,
  is_active          boolean,
  is_admin           boolean,
  member_count       bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.organisation_id,
    o.name as organisation_name,
    m.role_id,
    r.name as role_name,
    m.organisation_id = p.active_organisation_id as is_active,
    exists (
      select 1 from public.privileges pr where pr.role_id = m.role_id and pr.name = 'admin'
    ) as is_admin,
    (select count(*) from public.memberships m2 where m2.organisation_id = m.organisation_id) as member_count
  from public.memberships m
  join public.organisations o on o.id = m.organisation_id
  left join public.roles r on r.id = m.role_id
  join public.profiles p on p.id = auth.uid()
  where m.user_id = auth.uid();
$$;

grant execute on function public.get_my_memberships() to authenticated;


-- 15.13 US-64: sletter en organisation permanent. Kun en administrator af
-- DEN organisation (ikke nødvendigvis brugerens aktive) må slette - samme
-- manuelle rolle/privilegie-opslag som leave_organisation (15.11)/
-- get_my_memberships (15.12), da has_privilege_or_admin() kun kan tjekke
-- brugerens AKTIVE organisation. Ingen "sidste medlem"-restriktion (i
-- modsætning til leave_organisation) - begge scenarier (alene tilbage,
-- eller organisationen lukker ned med andre medlemmer tilbage) er
-- tilsigtede og skal begge lykkes; beskyttelsen mod et hændeligt tryk
-- ligger i frontendens bekræft-flow, ikke her.
--
-- Al underliggende data (roller, privilegier, medlemskaber, opgaver,
-- lokationer, kategorier, items, statistik, medlemsanmodninger) cascader
-- automatisk via organisations-tabellens "on delete cascade"-FK'er.
-- profiles.active_organisation_id (on delete set null) rydder samtidig
-- automatisk op for ALLE brugere - også andre medlemmer end den, der
-- sletter - der havde denne organisation som aktiv. Men det er internt en
-- UPDATE på profiles, som rammer trg_prevent_self_role_org_change for
-- netop DEN SLETTENDE BRUGERS egen række, hvis den slettede organisation
-- var deres egen aktive - derfor samme bypass-flag som de tre andre
-- RPC'er, sat FØR delete. Samme grund til at sætte
-- ponos.bypass_admin_protection: kaskaden ned til roller/privilegier
-- rammer ellers trg_prevent_admin_role_change (15.6) og
-- trg_prevent_admin_privilege_change (15.5), som normalt (med god grund)
-- blokerer sletning af organisationens "Admin"-rolle/privilegie - men her
-- forsvinder hele organisationen alligevel, så beskyttelsen giver ikke
-- mening. Returnerer den slettende brugers nye aktive organisation (eller
-- null), udfyldt kun hvis den slettede org var deres egen aktive - samme
-- mønster som leave_organisation.
create or replace function public.delete_organisation(p_organisation_id uuid)
returns public.organisations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_role_id     uuid;
  v_is_admin    boolean;
  v_was_active  boolean;
  v_next_org_id uuid;
  v_result      public.organisations;
begin
  if v_user_id is null then
    raise exception 'Du skal være logget ind for at slette en organisation.';
  end if;

  select role_id into v_role_id
  from public.memberships
  where user_id = v_user_id and organisation_id = p_organisation_id;

  if not found then
    raise exception 'Du er ikke medlem af denne organisation.';
  end if;

  v_is_admin := v_role_id is not null and exists (
    select 1 from public.privileges where role_id = v_role_id and name = 'admin'
  );

  if not v_is_admin then
    raise exception 'Kun en administrator kan slette organisationen.';
  end if;

  select (active_organisation_id = p_organisation_id) into v_was_active
  from public.profiles where id = v_user_id;

  perform set_config('ponos.bypass_self_role_org_change', 'true', true);
  perform set_config('ponos.bypass_admin_protection', 'true', true);

  delete from public.organisations where id = p_organisation_id;

  if v_was_active then
    select organisation_id into v_next_org_id
    from public.memberships
    where user_id = v_user_id
    order by created_at
    limit 1;

    update public.profiles
      set active_organisation_id = v_next_org_id
      where id = v_user_id;

    if v_next_org_id is not null then
      select * into v_result from public.organisations where id = v_next_org_id;
    end if;
  end if;

  return v_result;
end;
$$;

grant execute on function public.delete_organisation(uuid) to authenticated;


-- 15.14 US-66: fjerner et medlem fra ADMINISTRATORENS AKTIVE organisation
-- (modsat leave_organisation, som fjerner den KALDENDE bruger selv).
-- Blokerer selv-fjernelse (brug leave_organisation), og har en
-- escalation-guard: kun en reel administrator må fjerne et medlem, hvis
-- rolle bærer admin-privilegiet. Vælger automatisk en anden aktiv
-- organisation for DEN FJERNEDE bruger, hvis den fjernede organisation
-- var deres aktive - samme mønster som leave_organisation, men rammer
-- profiles.id <> auth.uid(), så trg_prevent_self_role_org_change (som
-- kun tjekker new.id = auth.uid()) ikke rammer her - intet bypass-flag
-- nødvendigt.
create or replace function public.remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_org_id uuid;
  v_target_role_id uuid;
  v_target_is_admin boolean;
  v_next_org_id uuid;
begin
  if v_caller_id is null then
    raise exception 'Du skal være logget ind for at fjerne et medlem.';
  end if;

  if p_user_id = v_caller_id then
    raise exception 'Du kan ikke fjerne dig selv - brug "Forlad organisation" i stedet.';
  end if;

  v_org_id := public.auth_profile_org();
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.';
  end if;

  if not public.has_privilege_or_admin('manage_members') then
    raise exception 'Du har ikke rettigheder til at fjerne medlemmer.';
  end if;

  select role_id into v_target_role_id
  from public.memberships
  where user_id = p_user_id and organisation_id = v_org_id;

  if not found then
    raise exception 'Brugeren er ikke medlem af organisationen.';
  end if;

  v_target_is_admin := v_target_role_id is not null and exists (
    select 1 from public.privileges where role_id = v_target_role_id and name = 'admin'
  );
  if v_target_is_admin and not public.has_privilege('admin') then
    raise exception 'Du skal være administrator for at fjerne en anden administrator.';
  end if;

  delete from public.memberships
  where user_id = p_user_id and organisation_id = v_org_id;

  select organisation_id into v_next_org_id
  from public.memberships
  where user_id = p_user_id
  order by created_at
  limit 1;

  update public.profiles
    set active_organisation_id = v_next_org_id
    where id = p_user_id and active_organisation_id = v_org_id;
end;
$$;

grant execute on function public.remove_member(uuid) to authenticated;


-- 15.15 US-67: når en invitation accepteres/afvises, sættes reviewed_at
-- automatisk, og ved accept tilknyttes den INVITEREDE bruger
-- organisationen (uden automatisk rolle) - mirror af
-- handle_membership_request_status_change (15.3), blot med
-- invited_user_id i stedet for user_id.
--
-- VIGTIG FORSKEL fra membership_requests-varianten (fundet som bug under
-- test): ved en ANMODNING er det altid en ADMIN, der opdaterer en ANDEN
-- brugers status-række, så profiles-opdateringen rammer ikke admins egen
-- række, og intet bypass-flag er nødvendigt. Ved en INVITATION er det
-- derimod MODTAGEREN SELV, der opdaterer sin egen invitations-række for
-- at acceptere - profiles-opdateringen herunder rammer derfor
-- auth.uid()'s EGEN række og udløser ellers
-- trg_prevent_self_role_org_change ("Du kan ikke ændre din egen
-- organisationstilknytning direkte."), som blokerede accept. Samme
-- bypass-flag som create_organisation/set_active_organisation/
-- leave_organisation/delete_organisation bruger er derfor nødvendigt her.
create or replace function public.handle_membership_invitation_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Accepted' and old.status is distinct from 'Accepted' then
    new.reviewed_at := coalesce(new.reviewed_at, now());

    insert into public.memberships (user_id, organisation_id)
    values (new.invited_user_id, new.organisation_id)
    on conflict (user_id, organisation_id) do nothing;

    perform set_config('ponos.bypass_self_role_org_change', 'true', true);

    update public.profiles
      set active_organisation_id = new.organisation_id
      where id = new.invited_user_id and active_organisation_id is null;
  elsif new.status = 'Rejected' and old.status is distinct from 'Rejected' then
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  return new;
end;
$$;

create trigger trg_membership_invitation_status_change
  before update on public.membership_invitations
  for each row execute function public.handle_membership_invitation_status_change();


-- 15.16 US-67: inviterer en EKSISTERENDE Ponos-bruger (via præcis email)
-- til den aktive organisation. Må være en RPC (ikke en ren INSERT-
-- policy), da klienten kun kender en email, ikke et bruger-id.
create or replace function public.invite_member(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
  v_target_id uuid;
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.';
  end if;

  if not public.has_privilege_or_admin('manage_invitations') then
    raise exception 'Du har ikke rettigheder til at invitere medlemmer.';
  end if;

  select id into v_target_id
  from public.profiles
  where lower(email) = lower(trim(p_email));

  if v_target_id is null then
    raise exception 'Ingen bruger findes med denne email.';
  end if;

  if exists (
    select 1 from public.memberships
    where user_id = v_target_id and organisation_id = v_org_id
  ) then
    raise exception 'Brugeren er allerede medlem af organisationen.';
  end if;

  insert into public.membership_invitations (organisation_id, invited_user_id, invited_by)
  values (v_org_id, v_target_id, auth.uid())
  on conflict (invited_user_id, organisation_id) where status = 'Pending' do nothing;

  if not found then
    raise exception 'Brugeren har allerede en ventende invitation til organisationen.';
  end if;
end;
$$;

grant execute on function public.invite_member(text) to authenticated;


-- =====================================================================
-- 16. ROW LEVEL SECURITY (organisations-baseret adgang)
-- =====================================================================

alter table public.organisations           enable row level security;
alter table public.profiles                enable row level security;
alter table public.roles                   enable row level security;
alter table public.privileges              enable row level security;
alter table public.membership_requests     enable row level security;
alter table public.membership_invitations  enable row level security;
alter table public.memberships             enable row level security;
alter table public.locations               enable row level security;
alter table public.data_layer_categories   enable row level security;
alter table public.data_layer_items        enable row level security;
alter table public.tasks                   enable row level security;
alter table public.task_assignees          enable row level security;
alter table public.task_participants       enable row level security;
alter table public.task_materials          enable row level security;
alter table public.statistics_snapshots    enable row level security;
alter table public.statistics_values       enable row level security;
alter table public.news                    enable row level security;


-- ---------------------------------------------------------------------
-- 16.1 ORGANISATIONS
-- ---------------------------------------------------------------------
create policy "Se egen organisation"
  on public.organisations for select
  to authenticated
  using (id = public.auth_profile_org());

create policy "Opret organisation (bootstrap)"
  on public.organisations for insert
  to authenticated
  with check (true);

create policy "Rediger egen organisation"
  on public.organisations for update
  to authenticated
  using (id = public.auth_profile_org() and public.has_privilege_or_admin('manage_organisation'));

-- US-67: lader en inviteret bruger se NAVNET på organisationen, de er
-- inviteret til, selvom det ikke er deres aktive organisation (eller de
-- har ingen) - uden dette ville politikken ovenfor skjule organisationen
-- for netop den bruger, invitationen er tiltænkt.
create policy "Se organisation man er inviteret til"
  on public.organisations for select
  to authenticated
  using (
    exists (
      select 1 from public.membership_invitations mi
      where mi.organisation_id = organisations.id
        and mi.invited_user_id = auth.uid()
        and mi.status = 'Pending'
    )
  );


-- ---------------------------------------------------------------------
-- 16.2 PROFILES
-- ---------------------------------------------------------------------
-- US-59: "egen organisation" betyder her "et medlemskab i MIN aktive
-- organisation" - IKKE "samme active_organisation_id som mig". De to er
-- ikke det samme, når et medlem er del af flere organisationer: en
-- bruger, der p.t. har en ANDEN organisation aktiv, skal stadig kunne
-- ses af administratorer i de(n) organisation(er), vedkommende faktisk
-- er medlem af (fx medlemslisten på /roller). Tjekkes derfor via
-- memberships i stedet for en direkte active_organisation_id-sammenligning.
create policy "Se egen profil eller profiler i egen organisation"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id and m.organisation_id = public.auth_profile_org()
    )
  );

-- US-06: lader administratoren læse navn/email på brugere, der har en
-- ventende anmodning til organisationen - de er endnu ikke medlemmer og
-- fanges derfor ikke af policy'en ovenfor.
create policy "Admin kan se ansøgeres profiler i egen organisation"
  on public.profiles for select
  to authenticated
  using (public.is_pending_requester_to_my_org(id));

-- US-67: lader administratoren læse navn/email på en bruger, de har
-- inviteret - parallelt til policy'en ovenfor, blot for invitationer i
-- stedet for anmodninger (modtageren er endnu ikke medlem).
create policy "Admin kan se inviterede profiler i egen organisation"
  on public.profiles for select
  to authenticated
  using (
    public.has_privilege_or_admin('manage_invitations')
    and exists (
      select 1 from public.membership_invitations mi
      where mi.invited_user_id = profiles.id
        and mi.organisation_id = public.auth_profile_org()
        and mi.status = 'Pending'
    )
  );

create policy "Bruger kan opdatere egen profil"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- US-59: rolletildeling flyttet til memberships (afsnit 16.10) - rollen
-- ligger ikke længere på profiles.


-- ---------------------------------------------------------------------
-- 16.3 ROLES
-- ---------------------------------------------------------------------
create policy "Se roller i egen organisation"
  on public.roles for select
  to authenticated
  using (organisation_id = public.auth_profile_org());

create policy "Opret roller i egen organisation"
  on public.roles for insert
  to authenticated
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_roles')
  );

create policy "Rediger roller i egen organisation"
  on public.roles for update
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_roles')
  );

create policy "Slet roller i egen organisation"
  on public.roles for delete
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_roles')
  );


-- ---------------------------------------------------------------------
-- 16.4 PRIVILEGES
-- ---------------------------------------------------------------------
create policy "Se privilegier i egen organisation"
  on public.privileges for select
  to authenticated
  using (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
  );

-- Escalation-guard (sikkerhed): en bruger med kun manage_roles må ikke
-- kunne oprette/omdøbe et privilegie TIL "admin" - kun en reel admin må.
-- WITH CHECK ser det NYE (post-update) navn.
create policy "Opret privilegier i egen organisation"
  on public.privileges for insert
  to authenticated
  with check (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('manage_roles')
    and (name <> 'admin' or public.has_privilege('admin'))
  );

create policy "Rediger privilegier i egen organisation"
  on public.privileges for update
  to authenticated
  using (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('manage_roles')
  )
  with check (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('manage_roles')
    and (name <> 'admin' or public.has_privilege('admin'))
  );

create policy "Slet privilegier i egen organisation"
  on public.privileges for delete
  to authenticated
  using (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('manage_roles')
  );


-- ---------------------------------------------------------------------
-- 16.5 MEMBERSHIP REQUESTS
-- ---------------------------------------------------------------------
create policy "Bruger kan anmode om medlemskab for sig selv"
  on public.membership_requests for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Se egne anmodninger eller anmodninger i egen org"
  on public.membership_requests for select
  to authenticated
  using (
    user_id = auth.uid()
    or (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('manage_membership_requests'))
  );

create policy "Accepter/afvis anmodninger i egen organisation"
  on public.membership_requests for update
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_membership_requests')
  );


-- ---------------------------------------------------------------------
-- 16.6 LOCATIONS / DATA LAYER CATEGORIES / DATA LAYER ITEMS
-- (Studerende 2's domæne — grundlæggende org-scoped adgang er sat op
-- her som fælles fundament. Skriv-policies kan strammes/udvides af
-- Studerende 2 ift. deres egne user stories.)
-- ---------------------------------------------------------------------
create policy "Se lokationer i egen organisation"
  on public.locations for select
  to authenticated
  using (organisation_id = public.auth_profile_org());

create policy "Medlemmer kan oprette/redigere/slette lokationer i egen organisation"
  on public.locations for all
  to authenticated
  using (organisation_id = public.auth_profile_org())
  with check (organisation_id = public.auth_profile_org());

create policy "Se datalayer-kategorier i egen organisation"
  on public.data_layer_categories for select
  to authenticated
  using (organisation_id = public.auth_profile_org());

create policy "Medlemmer kan oprette/redigere/slette kategorier i egen organisation"
  on public.data_layer_categories for all
  to authenticated
  using (organisation_id = public.auth_profile_org())
  with check (organisation_id = public.auth_profile_org());

create policy "Se datalayer-items i egen organisation"
  on public.data_layer_items for select
  to authenticated
  using (organisation_id = public.auth_profile_org());

create policy "Medlemmer kan oprette/redigere/slette items i egen organisation"
  on public.data_layer_items for all
  to authenticated
  using (organisation_id = public.auth_profile_org())
  with check (organisation_id = public.auth_profile_org());


-- ---------------------------------------------------------------------
-- 16.7 TASKS / TASK_ASSIGNEES / TASK_PARTICIPANTS / TASK_MATERIALS
-- (Studerende 3's domæne — samme princip som ovenfor: org-scoped
-- fundament, som Studerende 3 kan tilpasse/udbygge.)
-- ---------------------------------------------------------------------
create policy "Se opgaver i egen organisation"
  on public.tasks for select
  to authenticated
  using (organisation_id = public.auth_profile_org());

create policy "Medlemmer kan oprette/redigere/slette opgaver i egen organisation"
  on public.tasks for all
  to authenticated
  using (organisation_id = public.auth_profile_org())
  with check (organisation_id = public.auth_profile_org());

create policy "Se task_assignees for opgaver i egen organisation"
  on public.task_assignees for select
  to authenticated
  using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));

create policy "Administrer task_assignees for opgaver i egen organisation"
  on public.task_assignees for all
  to authenticated
  using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()))
  with check (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));

create policy "Se task_participants for opgaver i egen organisation"
  on public.task_participants for select
  to authenticated
  using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));

create policy "Administrer task_participants for opgaver i egen organisation"
  on public.task_participants for all
  to authenticated
  using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()))
  with check (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));

create policy "Se task_materials for opgaver i egen organisation"
  on public.task_materials for select
  to authenticated
  using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));

create policy "Administrer task_materials for opgaver i egen organisation"
  on public.task_materials for all
  to authenticated
  using (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()))
  with check (task_id in (select id from public.tasks where organisation_id = public.auth_profile_org()));


-- ---------------------------------------------------------------------
-- 16.8 STATISTICS SNAPSHOTS / VALUES
-- (Studerende 3's domæne — org-scoped læsning; skrivning sker typisk
-- server-side/via funktion når snapshots genereres.)
-- ---------------------------------------------------------------------
create policy "Se statistik-snapshots i egen organisation"
  on public.statistics_snapshots for select
  to authenticated
  using (organisation_id = public.auth_profile_org());

create policy "Medlemmer kan oprette snapshots i egen organisation"
  on public.statistics_snapshots for insert
  to authenticated
  with check (organisation_id = public.auth_profile_org());

create policy "Se statistik-værdier for egen organisation"
  on public.statistics_values for select
  to authenticated
  using (
    snapshot_id in (select id from public.statistics_snapshots where organisation_id = public.auth_profile_org())
  );

create policy "Medlemmer kan oprette statistik-værdier for egen organisation"
  on public.statistics_values for insert
  to authenticated
  with check (
    snapshot_id in (select id from public.statistics_snapshots where organisation_id = public.auth_profile_org())
  );


-- ---------------------------------------------------------------------
-- 16.9 NEWS (globalt, læses af alle autentificerede brugere)
-- ---------------------------------------------------------------------
create policy "Alle autentificerede brugere kan se nyheder"
  on public.news for select
  to authenticated
  using (true);

-- Ingen insert/update/delete-policy for almindelige brugere:
-- nyheder synkroniseres fra ekstern API via service role (US-57),
-- som ikke er underlagt RLS.


-- ---------------------------------------------------------------------
-- 16.10 MEMBERSHIPS (US-59/US-61)
-- Ingen INSERT/DELETE-policy for almindelige brugere: rækker oprettes
-- kun via create_organisation() (15.8) og
-- handle_membership_request_status_change() (15.3), og fjernes kun via
-- leave_organisation() (15.11) - alle tre security definer, samme mønster
-- som roles/privileges. Ingen klient-facing DELETE-policy er derfor
-- nødvendig; leave_organisation håndhæver selv "sidste admin"-tjekket.
-- ---------------------------------------------------------------------
create policy "Se egne medlemskaber eller medlemskaber i egen organisation"
  on public.memberships for select
  to authenticated
  using (
    user_id = auth.uid()
    or organisation_id = public.auth_profile_org()
  );

-- Escalation-guard (sikkerhed): samme mønster som de øvrige "Tildel
-- rolle"/manage_roles-policies - en bruger med kun manage_roles må ikke
-- kunne give sig selv/andre en rolle, der bærer admin-privilegiet - kun
-- en reel admin må det. WITH CHECK ser den NYE (post-update) role_id.
create policy "Tildel rolle til medlemskaber i egen organisation"
  on public.memberships for update
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_roles')
  )
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_roles')
    and (
      public.has_privilege('admin')
      or role_id is null
      or not exists (
        select 1 from public.privileges p
        where p.role_id = role_id and p.name = 'admin'
      )
    )
  );


-- ---------------------------------------------------------------------
-- 16.11 MEMBERSHIP INVITATIONS (US-67)
-- Ingen INSERT-policy for almindelige brugere: rækker oprettes kun via
-- invite_member() (15.16, security definer, samme konvention som
-- create_organisation). Ingen DELETE-policy for modtageren - de kan kun
-- opdatere status (acceptere/afvise); annullering er forbeholdt
-- afsenderen (organisationen).
-- ---------------------------------------------------------------------
create policy "Se egne invitationer eller invitationer i egen organisation"
  on public.membership_invitations for select
  to authenticated
  using (
    invited_user_id = auth.uid()
    or (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('manage_invitations'))
  );

-- Modtageren accepterer/afviser selv sin egen invitation.
create policy "Modtager kan svare på egen invitation"
  on public.membership_invitations for update
  to authenticated
  using (invited_user_id = auth.uid())
  with check (invited_user_id = auth.uid());

-- Admin kan fortryde en ventende invitation, organisationen selv har sendt.
create policy "Admin kan annullere ventende invitation i egen organisation"
  on public.membership_invitations for delete
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_invitations')
    and status = 'Pending'
  );
