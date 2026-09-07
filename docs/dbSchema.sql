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


-- ---------------------------------------------------------------------
-- 3. PROFILES (= domænemodellens "User")
-- Navngivet "profiles" i stedet for "users" for ikke at kollidere med
-- Supabase's indbyggede auth.users. id er 1:1 med auth.users.id.
-- role_id-kolonnen tilføjes efter roles-tabellen (cirkulær reference).
-- ---------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  first_name       text not null,
  last_name        text not null,
  email            text not null unique,
  description      text,
  note_admin       text,
  url_picture      text,
  organisation_id  uuid references public.organisations(id) on delete set null,
  role_id          uuid, -- FK tilføjes nedenfor
  created_at       timestamptz not null default now()
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

-- Nu kan profiles.role_id's FK oprettes
alter table public.profiles
  add constraint profiles_role_id_fkey
  foreign key (role_id) references public.roles(id) on delete set null;


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

-- Returnerer organisation_id for den nuværende bruger (auth.uid())
create or replace function public.auth_profile_org()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organisation_id from public.profiles where id = auth.uid();
$$;

-- Tjekker om nuværende bruger har en given privilege (via sin rolle)
-- Konvention: privilegiet "admin" bruges til organisations-administration
-- (medlemmer, roller, privilegier, org-indstillinger). Kan udvides frit.
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
    join public.privileges p on p.role_id = pr.role_id
    where pr.id = auth.uid() and p.name = p_name
  );
$$;


-- US-06: en ansøger er endnu IKKE medlem, så deres profiles.organisation_id
-- er null. Policy'en "Se egen profil eller profiler i egen organisation"
-- rammer derfor ikke, og administratoren kunne ikke se ansøgerens navn og
-- email. Funktionen er security definer, så opslaget i membership_requests
-- sker uden RLS - det undgår rekursion mellem de to tabellers policies.
-- Kun ansøgere med status 'Pending' eksponeres.
create or replace function public.is_pending_requester_to_my_org(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_privilege('admin') and exists (
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
    update public.profiles
      set organisation_id = new.organisation_id
      where id = new.user_id;
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


-- =====================================================================
-- 16. ROW LEVEL SECURITY (organisations-baseret adgang)
-- =====================================================================

alter table public.organisations           enable row level security;
alter table public.profiles                enable row level security;
alter table public.roles                   enable row level security;
alter table public.privileges              enable row level security;
alter table public.membership_requests     enable row level security;
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

create policy "Admin kan redigere egen organisation"
  on public.organisations for update
  to authenticated
  using (id = public.auth_profile_org() and public.has_privilege('admin'));


-- ---------------------------------------------------------------------
-- 16.2 PROFILES
-- ---------------------------------------------------------------------
create policy "Se egen profil eller profiler i egen organisation"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or organisation_id = public.auth_profile_org()
  );

-- US-06: lader administratoren læse navn/email på brugere, der har en
-- ventende anmodning til organisationen - de er endnu ikke medlemmer og
-- fanges derfor ikke af policy'en ovenfor.
create policy "Admin kan se ansøgeres profiler i egen organisation"
  on public.profiles for select
  to authenticated
  using (public.is_pending_requester_to_my_org(id));

create policy "Bruger kan opdatere egen profil"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

create policy "Admin kan opdatere profiler i egen organisation (fx tildele rolle)"
  on public.profiles for update
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege('admin')
  );


-- ---------------------------------------------------------------------
-- 16.3 ROLES
-- ---------------------------------------------------------------------
create policy "Se roller i egen organisation"
  on public.roles for select
  to authenticated
  using (organisation_id = public.auth_profile_org());

create policy "Admin kan oprette roller i egen organisation"
  on public.roles for insert
  to authenticated
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege('admin')
  );

create policy "Admin kan redigere/slette roller i egen organisation"
  on public.roles for update
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege('admin')
  );

create policy "Admin kan slette roller i egen organisation"
  on public.roles for delete
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege('admin')
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

create policy "Admin kan oprette privilegier i egen organisation"
  on public.privileges for insert
  to authenticated
  with check (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
    and public.has_privilege('admin')
  );

create policy "Admin kan redigere/slette privilegier i egen organisation"
  on public.privileges for update
  to authenticated
  using (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
    and public.has_privilege('admin')
  );

create policy "Admin kan slette privilegier i egen organisation"
  on public.privileges for delete
  to authenticated
  using (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
    and public.has_privilege('admin')
  );


-- ---------------------------------------------------------------------
-- 16.5 MEMBERSHIP REQUESTS
-- ---------------------------------------------------------------------
create policy "Bruger kan anmode om medlemskab for sig selv"
  on public.membership_requests for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Se egne anmodninger eller (som admin) anmodninger i egen org"
  on public.membership_requests for select
  to authenticated
  using (
    user_id = auth.uid()
    or (organisation_id = public.auth_profile_org() and public.has_privilege('admin'))
  );

create policy "Admin kan acceptere/afvise anmodninger i egen organisation"
  on public.membership_requests for update
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege('admin')
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
