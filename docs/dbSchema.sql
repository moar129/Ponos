-- ---------------------------------------------------------------------
-- KENDT DRIFT (konstateret 2026-09-21 via docs/exportSchema.sql)
-- ---------------------------------------------------------------------
-- Beskedsystemet og notifikationerne står IKKE i denne fil. Live-skemaet
-- har tabellerne conversations, conversation_participants, messages og
-- notifications med tilhørende RLS, policies, triggers og RPC'er - intet
-- af det er dokumenteret her.
--
-- Konkret mangler disse funktioner, som findes i databasen:
--   add_group_participants, create_group_conversation, delete_message,
--   edit_message, leave_group_conversation, mark_conversation_read,
--   remove_group_participant, rename_group_conversation
-- samt validate_location_parent. (get_or_create_direct_conversation
-- genskrevet og dokumenteret 2026-09-29, §15.25.)
--
-- Det svarer til 51 af databasens 108 raise exception. De 57 der ER
-- dokumenteret her, er opdaterede og korrekte.
--
-- Hører til Studerende 3 (beskeder/notifikationer) og Studerende 2
-- (lokationer). Udestår.
--
-- Ændret 2026-09-25 (sletning må ikke lække indhold):
--   - delete_message sætter også content = '' og sætter body på
--     beskedens notifikationer til sentinel 'Denne besked er slettet'
--     (oversættes i src/utils/notificationDisplay.ts). Match:
--     type='message', reference_id = conversation_id, created_at =
--     messages.created_at (triggeren kører i samme transaktion).
--   - edit_message opdaterer også notifikationernes body (left(.., 140)).
--   - get_my_conversations: ny kolonne last_message_deleted boolean;
--     last_message er null for slettet besked. Grants: authenticated,
--     service_role.
--   - messages_content_check:
--     CHECK (((deleted_at IS NOT NULL) OR (btrim(content) <> ''::text)))
--     (før: CHECK ((btrim(content) <> ''::text))).
--
-- Ændret 2026-09-27 (opgave- og rum-chats, §15.24): conversations fik
-- task_id/room_id/closed_at, conversation_participants fik
-- completion_choice; edit_message, notify_new_message, gruppe-RPC'erne
-- (add/remove/rename/leave) og get_my_conversations er genskabt i §15.24
-- og står dér i deres nuværende, fulde form.
-- Samme dag: ny tabel conversation_opt_outs + RPC join_task_conversation;
-- opgave-/rum-chats kan forlades (§15.24).
--
-- Ændret 2026-09-29 (§15.25): samtaler, beskeder og notifikationer
-- scopes til aktiv org - get_my_conversations-filter, DM pr. org,
-- restriktiv RLS på conversations/messages/notifications.
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- for gen_random_uuid()


-- ---------------------------------------------------------------------
-- 1. ENUMS (ETaskStatus, EItemStatus, EMembershipRequestStatus)
-- ---------------------------------------------------------------------
create type e_task_status as enum ('Started', 'InProgress', 'Completed');

-- 'Consumed' tilføjet 2026-09-23 (US-42): forbrugsvarer der bruges
-- endeligt op ved en opgaves afrapportering, se resolve_task_material_units
-- (§15.21). 'NeedsEmptying' tilføjet 2026-09-23: generisk "fuld,
-- skal tømmes"-status til enheder der fyldes op (fx en skraldespand/
-- opsamlingsbeholder) i stedet for at blive brugt op - se
-- sync_status_from_contents (§15.21). 'NeedsRefilling' tilføjet 2026-09-23:
-- symmetrisk modpart til 'NeedsEmptying' - "tom beholder, kræver
-- påfyldning" (fx en dieseltank), da hverken 'OutOfStock' (detailbegreb)
-- eller 'Consumed' (antyder selve beholderen er væk) passede.
create type e_item_status as enum (
  'Available', 'Reserved', 'OutOfStock', 'InUse', 'Missing', 'Damaged', 'Maintenance', 'Consumed', 'NeedsEmptying', 'NeedsRefilling'
);

create type e_request_status as enum ('Pending', 'Accepted', 'Rejected');

-- Studerende 3's tilføjelse - dokumenteret her fra DB-eksport
-- 2026-09-11, ikke ændret af os. Bruges af tasks.priority (afsnit 10).
create type e_task_priority as enum ('Low', 'Medium', 'High', 'Critical');


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
  status           e_request_status not null default 'Pending',
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
-- Genbruger e_request_status (samme facon: Pending/Accepted/
-- Rejected), ingen ny enum-type nødvendig.
-- ---------------------------------------------------------------------
create table public.membership_invitations (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  invited_user_id  uuid not null references public.profiles(id) on delete cascade,
  invited_by       uuid references public.profiles(id) on delete set null,
  status           e_request_status not null default 'Pending',
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
--
-- US-42 (2026-09-23): item er nu en "item-definition", ikke længere en
-- selvstændig lagerbeholdning. quantity/status er droppet herfra og
-- flyttet til data_layer_item_units (§9a) - en item-definition kan nu
-- have flere fysiske enheder/batches, hver med egen status, så
-- lagerbeholdning altid er en afledt sum, aldrig manuelt indtastet.
-- packaging (fri tekst, fx "6-pack") og unit_of_measurement (fri tekst,
-- fx "stk"/"kg"/"liter", default 'stk') er nye, rent generiske felter.
--
-- amount_per_unit/amount_unit (2026-09-23, "vægt pr. enhed på Enkelt
-- enhed") blev tilføjet og SAMME DAG rullet fuldt tilbage igen - virkede
-- kun for tællelige varer (jernplader), ikke for ægte kontinuerte Mængde-
-- varer (sand, kabel på rulle). Erstattet af package_size nedenfor.
--
-- package_size (2026-09-23, docs/migrations/README.md, 2026-09-23-
-- package-size-replaces-amount-per-unit.sql): valgfrit, kun meningsfuldt
-- for Mængde-varer (isDiscrete=false, ingen kapacitets-sporing) - "1
-- [packaging] = package_size [unit_of_measurement]", fx "1 big bag = 500
-- kg". Genbruger de EKSISTERENDE packaging/unit_of_measurement-felter som
-- label/enhed - intet ekstra enheds-felt nødvendigt (i modsætning til det
-- rullede-tilbage forsøg ovenfor). Bruges i frontend til at udlede/udfylde
-- den faktiske lagrede mængde ud fra et "antal emballager"-hjælpefelt ved
-- opret/genopfyldning - se docs/migrations/README.md. Item-egenskab.
-- ---------------------------------------------------------------------
create table public.data_layer_items (
  id                   uuid primary key default gen_random_uuid(),
  organisation_id      uuid not null references public.organisations(id) on delete cascade,
  category_id          uuid not null references public.data_layer_categories(id) on delete cascade,
  location_id          uuid references public.locations(id) on delete set null,
  name                 text not null,
  description          text,
  packaging            text,
  unit_of_measurement  text not null default 'stk',
  package_size         numeric,
  constraint package_size_positive check (package_size is null or package_size > 0)
);

create index idx_items_org on public.data_layer_items (organisation_id);
create index idx_items_category on public.data_layer_items (category_id);
create index idx_items_location on public.data_layer_items (location_id);


-- ---------------------------------------------------------------------
-- 9a. DATA LAYER ITEM UNIT (US-42, 2026-09-23)
-- Én række pr. fysisk enhed (serial_number sat, quantity altid 1,
-- håndhævet af constraint) ELLER pr. målt batch (serial_number null,
-- quantity kan være > 1, fx "10" ved unit_of_measurement='kg'). En
-- serienummereret række kan derfor aldrig splittes - kun batches kan.
-- serial_number er unikt pr. item (ikke pr. organisation - to
-- forskellige items må gerne dele et serienummer). organisation_id
-- holdes i sync med item'et via sync_item_unit_organisation (§15.21).
--
-- contents_total/contents_remaining (2026-09-23, rettet fra en tidligere
-- fejlslagen "delt pakke"-model - se docs/migrations/README.md,
-- 2026-09-23-item-contents-not-shared-pack.sql): en enkelt enhed kan
-- selv være en beholder med internt indhold (fx ÉN 12-pack sodavand, der
-- selv rummer 12 dåser) - sporet PR. ENHED, ikke som en delt pulje
-- mellem flere enheder. null (begge felter) = enheden har ikke sporet
-- indhold (langt de fleste enheder).
--
-- contents_empty_status/contents_partial_status/contents_full_status
-- (2026-09-23, generaliserer den tidligere hårdkodede "forbrugs-retning"
-- - se docs/migrations/README.md, 2026-09-23-configurable-contents-
-- status.sql): hver enhed angiver selv hvilken status den automatisk
-- skal skifte til ved hhv. tomt/delvist/fuldt indhold. null = ingen
-- automatisk ændring ved den tærskel. Se sync_status_from_contents
-- (§15.21).
--
-- contents_total UDEN contents_remaining (2026-09-23, docs/migrations/
-- README.md, 2026-09-23-measured-item-capacity-status.sql): en Målt
-- mængde-batch (serial_number null, quantity kan være > 1) kan sætte
-- contents_total som KAPACITET (fx en 200-liters tank) - niveauet er så
-- quantity selv, ikke et separat contents_remaining. Det er netop
-- forskellen fra Enkeltstyk+indhold ovenfor (begge felter sat): kun en
-- Målt mængde-batch kan splittes/forbruges delvist af en opgave (§15.21,
-- reserve_item_units), så kun DEN kan tappes/påfyldes af en opgave - en
-- Enkeltstyk-"tønde" (quantity altid 1) kan det ikke, kun manuelt.
-- ---------------------------------------------------------------------
create table public.data_layer_item_units (
  id                      uuid primary key default gen_random_uuid(),
  organisation_id         uuid not null references public.organisations(id) on delete cascade,
  item_id                 uuid not null references public.data_layer_items(id) on delete cascade,
  location_id             uuid references public.locations(id) on delete set null,
  serial_number           text,
  quantity                numeric not null default 1,
  status                  e_item_status not null default 'Available',
  created_at              timestamptz not null default now(),
  contents_total          numeric,
  contents_remaining      numeric,
  contents_empty_status   e_item_status,
  contents_partial_status e_item_status,
  contents_full_status    e_item_status,
  constraint serial_requires_single_quantity check (serial_number is null or quantity = 1),
  constraint contents_range check (
    (contents_total is null and contents_remaining is null)
    or (contents_total is not null and contents_remaining is null)
    or (contents_total is not null and contents_remaining is not null
        and contents_remaining >= 0 and contents_remaining <= contents_total)
  ),
  -- Rettet 2026-09-23 (docs/migrations/README.md, 2026-09-23-container-
  -- count-and-split-fix.sql): var oprindeligt en inline `check (quantity >
  -- 0)` - løsnet til at tillade quantity=0 for kapacitets-sporede rækker
  -- (en tom container er en gyldig tilstand), mens ordinære rækker (intet
  -- contents_total) stadig aldrig må ramme 0.
  constraint quantity_positive_unless_capacity check (
    (contents_total is not null and quantity >= 0)
    or (contents_total is null and quantity > 0)
  )
);

create index idx_item_units_item on public.data_layer_item_units (item_id);
create index idx_item_units_org on public.data_layer_item_units (organisation_id);
create index idx_item_units_status on public.data_layer_item_units (status);
create unique index idx_item_units_serial_item
  on public.data_layer_item_units (item_id, serial_number)
  where serial_number is not null;

-- Aggregeret status-fordeling pr. item - bruges af frontend (getCategoryTree)
-- i stedet for at hente alle rå enheds-rækker. security_invoker=true er
-- kritisk: uden den ville RLS på den underliggende tabel blive tjekket
-- som view-ejeren, ikke den kaldende bruger.
-- Rettet 2026-09-23 (docs/migrations/README.md, 2026-09-23-container-
-- count-and-split-fix.sql): en kapacitets-sporet række (contents_total sat)
-- tæller altid som 1 mod "Antal", uanset dens niveau (quantity) - en tank
-- med niveau 200 er stadig kun ÉN beholder, ikke "200". Ordinære rækker
-- (intet contents_total) summeres som før.
-- Udvidet 2026-09-23 (docs/migrations/README.md, 2026-09-23-item-status-
-- counts-capacity-flag.sql): has_capacity_units (bool_or) lader frontend
-- undlade at vise unitOfMeasurement ved siden af "Antal" for en Beholder-
-- vare - "1 liter" ville ellers være misvisende, da "1" er antal
-- beholdere. Se formatItemQuantity i datalayerTypes.ts.
create view public.data_layer_item_status_counts
with (security_invoker = true)
as
select item_id, status,
  sum(case when contents_total is not null then 1 else quantity end) as total_quantity,
  bool_or(contents_total is not null and contents_remaining is null) as has_capacity_units
from public.data_layer_item_units
group by item_id, status;

grant select on public.data_layer_item_status_counts to authenticated;


-- ---------------------------------------------------------------------
-- 9b DATA LAYER ITEM UNIT HISTORY (lagerhistorik, 2026-09-29)
-- Én række pr. enhed pr. periode med samme status (valid_from/valid_to;
-- valid_to null = aktuel). Skrives KUN af triggeren §15.21d. unit_id har
-- bevidst ingen FK - historikken overlever at enheden slettes/forbruges.
-- Bruges af statistikken (§15.26a: enheder pr. status ved periodens slut).
-- data_layer_item_units er Studerende 2's domæne; her kun en tilføjelse.
-- Ved oprettelse blev eksisterende enheder backfillet med valid_from = now().
-- ---------------------------------------------------------------------
create table public.data_layer_item_unit_history (
  id               bigint generated always as identity primary key,
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  unit_id          uuid not null,
  item_id          uuid not null,
  status           public.e_item_status not null,
  -- 2026-09-30: lokationen i perioden (statistik: enheder pr. lager).
  location_id      uuid references public.locations(id) on delete set null,
  valid_from       timestamptz not null,
  valid_to         timestamptz,
  constraint item_unit_history_valid_range check (valid_to is null or valid_to >= valid_from)
);

create index idx_item_unit_history_org_from
  on public.data_layer_item_unit_history (organisation_id, valid_from);
create index idx_item_unit_history_open
  on public.data_layer_item_unit_history (unit_id) where valid_to is null;


-- ---------------------------------------------------------------------
-- 9.1 DATA LAYER FAVORITES (ad-hoc, 2026-09-25)
-- Personlige stjernemarkeringer på /datalager: præcis én kategori ELLER
-- ét lager/sektion pr. række. Undergrupper gemmes ikke - frontend viser
-- dem foldbart under favoritten. Cascade fjerner favoritten, når målet,
-- brugeren eller organisationen slettes.
-- ---------------------------------------------------------------------
create table public.data_layer_favorites (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  category_id      uuid references public.data_layer_categories(id) on delete cascade,
  location_id      uuid references public.locations(id) on delete cascade,
  created_at       timestamptz not null default now(),
  constraint data_layer_favorites_one_target check (num_nonnulls(category_id, location_id) = 1),
  constraint data_layer_favorites_user_category_key unique (user_id, category_id),
  constraint data_layer_favorites_user_location_key unique (user_id, location_id)
);

create index idx_data_layer_favorites_user_org on public.data_layer_favorites (user_id, organisation_id);


-- ---------------------------------------------------------------------
-- 9.5 TASK ROOM (Studerende 3's tilføjelse)
-- Dokumenteret her fra DB-eksport 2026-09-11 - IKKE oprettet eller
-- ændret af Studerende 1. Tabellen stod indtil da slet ikke i denne fil,
-- selvom den har eksisteret i databasen et stykke tid.
--
-- Et "rum" er en gruppering af opgaver inden for en organisation
-- (tasks.room_id, afsnit 10). Placeret her - FØR tasks - fordi tasks'
-- FK peger på den.
--
-- Rolle-begrænsning (2026-09-25): et rum kan begrænses til en eller
-- flere roller via task_room_roles. Ingen rækker = åbent for alle med
-- read_tasks. Se can_access_task_room (§15.22) og policies §16.7/16.7b.
-- Erstattede den ubrugte enkelt-rolle-kolonne required_role_id (droppet).
-- ---------------------------------------------------------------------
create table public.task_rooms (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.organisations(id) on delete cascade,
  name              text not null,
  created_at        timestamptz not null default now()
);

create index idx_task_rooms_org on public.task_rooms (organisation_id);

-- Hvilke roller har adgang til et rum. Slettes en rolle, cascader den ud;
-- står rummet derefter uden roller, bliver det åbent (bevidst accepteret).
create table public.task_room_roles (
  room_id  uuid not null references public.task_rooms(id) on delete cascade,
  role_id  uuid not null references public.roles(id) on delete cascade,
  primary key (room_id, role_id)
);

create index idx_task_room_roles_role on public.task_room_roles (role_id);


-- ---------------------------------------------------------------------
-- 9.5b TASK ROOM FAVORITES (ad-hoc, 2026-09-26)
-- Personlige stjernemarkerede rum på /tasks - samme mønster som
-- data_layer_favorites (§9.1). Toggle = insert/delete. Cascade fjerner
-- favoritten, når rummet, brugeren eller organisationen slettes. Mister
-- brugeren adgang til et rolle-låst rum, bliver rækken liggende, men
-- rummet returneres ikke af task_rooms-policyen -> skjult i UI.
-- ---------------------------------------------------------------------
create table public.task_room_favorites (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  room_id          uuid not null references public.task_rooms(id) on delete cascade,
  created_at       timestamptz not null default now(),
  constraint task_room_favorites_user_room_key unique (user_id, room_id)
);

create index idx_task_room_favorites_user_org on public.task_room_favorites (user_id, organisation_id);


-- ---------------------------------------------------------------------
-- 9.9 NOTIFICATION PREFERENCES (US-79, 2026-09-27)
-- Brugerens notifikationsindstillinger på /bruger: hovedkontakt (enabled)
-- + fravalgte typer (muted_types). Én række pr. bruger, global (gælder
-- alle organisationer). Ingen række = alt slået til. Håndhæves af
-- triggeren skip_muted_notification på notifications (§15.20c).
-- ---------------------------------------------------------------------
create table public.notification_preferences (
  user_id      uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  enabled      boolean not null default true,
  muted_types  text[]  not null default '{}',
  updated_at   timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 10. TASK (tilhører organisation)
-- De tre sidste kolonner (room_id, priority, max_assignees) og
-- idx_tasks_room er Studerende 3's tilføjelser - dokumenteret her fra
-- DB-eksport 2026-09-11, ikke ændret af os.
-- ---------------------------------------------------------------------
create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  title            text not null,
  description      text,
  start_date       timestamptz,
  end_date         timestamptz,
  status           e_task_status not null default 'Started',
  room_id          uuid references public.task_rooms(id) on delete set null,
  priority         e_task_priority,
  max_assignees    int,
  -- Studerende 3's tilføjelser (dokumenteret fra DB-eksport 2026-09-19):
  -- created_at findes også i live (timestamptz not null default now()).
  -- finished_at sættes af approve_task_request (15.19) og set_task_status
  -- (15.18), nulstilles ved genåbn. requires_approval: kræver opgaven
  -- godkendelse (task_requests) før den bliver Completed.
  finished_at      timestamptz,
  requires_approval boolean not null default true
);

create index idx_tasks_org on public.tasks (organisation_id);
create index idx_tasks_status on public.tasks (status);
create index idx_tasks_room on public.tasks (room_id);

-- AssignedTo: mange-til-mange mellem Task og User
-- assigned_by (not null, sættes af trigger trg_set_task_assignee_assigned_by,
-- 16.7) og assigned_at findes i live men stod ikke her (drift, fundet 2026-09-17).
create table public.task_assignees (
  task_id      uuid not null references public.tasks(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  assigned_by  uuid not null references public.profiles(id),
  assigned_at  timestamptz default now(),
  primary key (task_id, user_id)
);

-- Participants: mange-til-mange mellem Task og User
create table public.task_participants (
  task_id  uuid not null references public.tasks(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

-- Færdigmeldinger der afventer godkendelse (US-75). En tilmeldt melder en
-- opgave med requires_approval færdig -> Pending. Behandles KUN via RPC'erne
-- approve_task_request/reject_task_request (15.19), ikke ved direkte UPDATE.
-- material_outcomes (US-42, 2026-09-23): den tildeltes valgte udfald for
-- opgavens uafrapporterede materialer på anmodningstidspunktet - kun DATA,
-- udføres først i approve_task_request ved godkendelse (se 15.19/15.21b).
-- Afvises anmodningen i stedet, bruges kolonnen aldrig - materialerne
-- forbliver urørt.
-- rejection_reason (2026-09-24): godkenderens påkrævede begrundelse ved
-- afvisning, sat af reject_task_request (15.19). Vises for de tilmeldte på
-- opgavekortet, indtil opgaven meldes færdig igen.
create table public.task_requests (
  id                 uuid primary key default gen_random_uuid(),
  task_id            uuid not null references public.tasks(id) on delete cascade,
  requested_by       uuid not null references public.profiles(id),
  requested_at       timestamptz not null default now(),
  status             e_request_status not null default 'Pending',
  handled_by         uuid references public.profiles(id),
  done_at            timestamptz,
  material_outcomes  jsonb,
  rejection_reason   text
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
-- 11a. TASK MATERIAL UNITS (US-42, 2026-09-23)
-- Kobler en task_materials-linje til de konkrete data_layer_item_units-
-- rækker den har reserveret (inkl. delvist forbrugte batches efter en
-- split, se split_unit_if_needed §15.21). Ingen unique(unit_id) - en
-- batch-række kan splittes, så flere task_material_units-rækker aldrig
-- deler samme unit_id, men det håndhæves af RPC-logikken, ikke af et
-- constraint. on delete cascade (ikke restrict!) på unit_id: ellers ville
-- delete_organisation/kategori-sletning (§15.13), som i dag cascader
-- ubetinget, blive blokeret af en aktiv reservation. Rækker
-- oprettes/slettes udelukkende via RPC'erne i §15.21 eller cascade -
-- ingen client-facing insert/update/delete-policy, se §16.7c.
-- ---------------------------------------------------------------------
create table public.task_material_units (
  task_material_id  uuid not null references public.task_materials(id) on delete cascade,
  unit_id           uuid not null references public.data_layer_item_units(id) on delete cascade,
  primary key (task_material_id, unit_id)
);

create index idx_task_material_units_material on public.task_material_units (task_material_id);
create index idx_task_material_units_unit on public.task_material_units (unit_id);


-- ---------------------------------------------------------------------
-- 12. STATISTICS SNAPSHOT + STATISTICS VALUE
-- ---------------------------------------------------------------------
create table public.statistics_snapshots (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  period_start     timestamptz not null,
  period_end       timestamptz not null,
  created_at       timestamptz not null default now(),
  -- Valgfrit navn, fx "Roskilde 2026" (2026-09-29, statistik-migrationen).
  label            text,
  -- Tidsseriens opløsning (week/month/quarter), valgt ved gem. null =
  -- snapshot gemt før 2026-09-29-clip-rooms (frontend gætter ud fra længden).
  series_granularity text,
  constraint statistics_snapshots_series_granularity_check
    check (series_granularity is null or series_granularity in ('week', 'month', 'quarter'))
);

create index idx_snapshots_org on public.statistics_snapshots (organisation_id);

-- Rækker skrives KUN af save_statistics_snapshot (§15.26c) som flade
-- "<gruppe>:<nøgle>"-navne (tasks_created, task_status:Completed,
-- room:<navn> ...). period_start/period_end (fundet som udokumenteret
-- drift i skema-eksporten 2026-09-29, nu i brug): null = værdien gælder
-- hele snapshottets periode; sat = en delperiode i snapshottets tidsserie
-- (development:created / development:completed pr. uge/måned/kvartal,
-- valgt af brugeren ved gem).
create table public.statistics_values (
  id           uuid primary key default gen_random_uuid(),
  snapshot_id  uuid not null references public.statistics_snapshots(id) on delete cascade,
  name         text not null,
  value        numeric not null,
  period_start timestamptz,
  period_end   timestamptz,
  constraint statistics_values_period_check check (period_end >= period_start)
);

create index idx_stat_values_snapshot on public.statistics_values (snapshot_id);


-- ---------------------------------------------------------------------
-- 13. NEWS (US-56 - org-scoped opslagstavle, ikke længere global)
-- Oprindeligt global+service-role-only; ændret efter afklaring med
-- bruger til at være organisationens egne nyheder, oprettet manuelt af
-- en admin (Fase 3: create_news/read_news/update_news/delete_news).
-- US-57 (import fra en ekstern nyheds-API) er udgået 2026-09-11, og
-- tabellen news_sources samt kolonnerne source/external_ref er droppet
-- igen - se userStories.md US-57 for begrundelsen.
-- ---------------------------------------------------------------------
create table public.news (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  title            text not null,
  description      text,
  picture_url      text,
  published_at     timestamptz not null default now(),
  url              text                               -- link til en original-artikel, valgfri (indtastes af admin)
);

create index idx_news_organisation on public.news (organisation_id);


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
-- Fase 3 (2026-09-15) splitter hvert af disse domæne-privilegier videre
-- op i create/read/update/delete_X - se afsnit 16 for de aktuelle navne;
-- funktionen selv er uændret, kun hvilke navne der sendes ind.
create or replace function public.has_privilege_or_admin(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_privilege(p_name) or public.has_privilege('admin');
$$;

-- Bugfix 2026-09-15: tjekker om en VILKÅRLIG rolle (ikke nødvendigvis
-- kaldeprofilens egen) bærer et givent privilegie, uden om RLS på
-- privileges-tabellen. Nødvendig fordi escalation-guarden i "Tildel rolle
-- til medlemskaber"-policyen (16.10) læser privileges direkte i en
-- subquery - en bruger med update_roles men UDEN read_roles ville ellers
-- få den subquery tavst RLS-filtreret til 0 rækker, så guarden aldrig
-- kunne se om målrollen bar admin-privilegiet.
create or replace function public.role_has_privilege(p_role_id uuid, p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.privileges where role_id = p_role_id and name = p_name
  );
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
  select public.has_privilege_or_admin('read_membership_requests') and exists (
    select 1
    from public.membership_requests mr
    where mr.user_id = p_user_id
      and mr.organisation_id = public.auth_profile_org()
      and mr.status = 'Pending'
  );
$$;


-- =====================================================================
-- 15. TRIGGERS OG RPC-FUNKTIONER
-- =====================================================================
--
-- OM `grant execute ... to authenticated` NEDENFOR (fundet ved
-- skema-eksport 2026-09-11): de linjer er reelt REDUNDANTE og giver et
-- falsk indtryk af, at anon er lukket ude. Postgres giver som default
-- `execute` på en ny funktion til rollen PUBLIC, som både `anon` og
-- `authenticated` arver - alle funktionerne i denne fil er derfor
-- kaldbare af en UDLOGGET klient med anon-nøglen (som ligger i
-- browser-bundtet).
--
-- Det er ikke udnytteligt i dag: hver RPC afviser selv en udlogget
-- kalder, enten med en eksplicit `if auth.uid() is null`-guard eller ved
-- at auth_profile_org() returnerer null. Eneste funktion uden eksplicit
-- guard er invite_member (15.16), som reddes af det sidste - held frem
-- for design.
--
-- reset_password_prototype (15.17) SKAL være anon-tilgængelig, jf.
-- US-68. Resten kunne lukkes som forsvar i dybden med et par linjer pr.
-- funktion - mønsteret er:
--
--     revoke execute on function public.<navn>(<argtyper>) from anon, public;
--     grant  execute on function public.<navn>(<argtyper>) to authenticated;
--
-- Begge linjer er nødvendige: `revoke ... from public` fjerner også den
-- rettighed, authenticated arvede derfra, så den skal gives igen direkte.
-- Effekten for en udlogget kalder er 42501 i stedet for den danske
-- fejlbesked - ellers ingen ændring. Ikke gjort: der er ingen kendt
-- sårbarhed at lukke, og hver RPC forsvarer sig allerede selv.

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
      raise exception 'Du kan ikke tildele dig selv en rolle.' using hint = 'CANNOT_ASSIGN_OWN_ROLE';
    end if;
    if new.organisation_id is distinct from old.organisation_id then
      raise exception 'Du kan ikke ændre din aktive organisation direkte.' using hint = 'CANNOT_CHANGE_ACTIVE_ORG_DIRECTLY';
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
-- Fase 3: tildeler nu organisationens "Medlem"-standardrolle i stedet
-- for at lade role_id stå null - se 15.6b.
create or replace function public.handle_membership_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_default_role_id uuid;
begin
  if new.status = 'Accepted' and old.status is distinct from 'Accepted' then
    new.reviewed_at := coalesce(new.reviewed_at, now());
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());

    select id into v_default_role_id
    from public.roles
    where organisation_id = new.organisation_id and name = 'Medlem';

    insert into public.memberships (user_id, organisation_id, role_id)
    values (new.user_id, new.organisation_id, v_default_role_id)
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
-- Andre roller er IKKE låst af denne trigger (kun kombinationen
-- "Admin"-rollen + admin-privilegiet er beskyttet, da det er den, der
-- reelt ville låse alle administratorer ude, hvis den forsvandt) - men
-- siden 2026-09-19 kan andre roller heller ikke længere FÅ admin-
-- privilegiet tildelt (se §16.4's escalation-guard). En eventuel
-- eksisterende ikke-Admin-række fra før den dato er derfor kun urørt af
-- DENNE trigger, ikke beskyttet af den - den kan fortsat frit slettes.
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
      raise exception 'Admin-privilegiet på rollen Admin kan ikke slettes.' using hint = 'ADMIN_PRIVILEGE_LOCKED_DELETE';
    end if;
    if new.name is distinct from old.name then
      raise exception 'Admin-privilegiet på rollen Admin kan ikke omdøbes.' using hint = 'ADMIN_PRIVILEGE_LOCKED_RENAME';
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
    raise exception 'Rollen Admin har admin-privilegiet og kan ikke slettes.' using hint = 'ADMIN_ROLE_LOCKED_DELETE';
  end if;

  if new.name is distinct from old.name then
    raise exception 'Rollen Admin har admin-privilegiet og kan ikke omdøbes.' using hint = 'ADMIN_ROLE_LOCKED_RENAME';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_admin_role_change
  before update or delete on public.roles
  for each row execute function public.prevent_admin_role_change();


-- 15.6b Fase 3 (granulære CRUD-privilegier, 2026-09-15): Read blev et
-- rigtigt, tildelbart privilegie i stedet for åbent for alle organisations-
-- medlemmer. Et medlem UDEN rolle ville derved miste al læseadgang, så
-- hver organisation får nu en beskyttet standardrolle "Medlem" (parallelt
-- til "Admin"), som memberships falder tilbage til - se create_organisation
-- (15.8), handle_membership_request_status_change (15.3) og
-- handle_membership_invitation_status_change (15.15), som alle tildeler
-- "Medlem" i stedet for at lade role_id stå null. "Medlem" starter bevidst
-- med minimal adgang (kun read_news) - alt andet skal en admin eksplicit
-- tildele via en anden rolle.
--
-- Beskytter rollen "Medlem" mod omdøb/slet, ubetinget af hvilke
-- privilegier den bærer (modsat prevent_admin_role_change, som kun låser
-- "Admin" når den rent faktisk har admin-privilegiet) - "Medlem" er
-- organisationens "gulv", og skal altid findes. Respekterer samme
-- ponos.bypass_admin_protection-flag som 15.5/15.6, så delete_organisation
-- (15.13) stadig kan kaskade-slette den sammen med resten af organisationen.
create or replace function public.prevent_default_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('ponos.bypass_admin_protection', true), 'false') = 'true' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if old.name <> 'Medlem' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Standardrollen Medlem kan ikke slettes.' using hint = 'MEMBER_ROLE_LOCKED_DELETE';
  end if;

  if new.name is distinct from old.name then
    raise exception 'Standardrollen Medlem kan ikke omdøbes.' using hint = 'MEMBER_ROLE_LOCKED_RENAME';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_default_role_change
  before update or delete on public.roles
  for each row execute function public.prevent_default_role_change();


-- 15.6c Fase 3: når en (ikke-beskyttet) rolle slettes, overføres dens
-- medlemmer til organisationens "Medlem"-rolle i stedet for at blive
-- rolleløse. Kører BEFORE DELETE, så memberships.role_id (fk ... on
-- delete set null, se afsnit 6.5) er peget væk fra rollen, inden selve
-- sletningen sker - FK'ens `set null` rammer derfor kun, hvis "Medlem"
-- selv skulle mangle (forsvarsnet, bør aldrig ske i praksis).
create or replace function public.reassign_members_before_role_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_default_role_id uuid;
begin
  select id into v_default_role_id
  from public.roles
  where organisation_id = old.organisation_id and name = 'Medlem';

  update public.memberships
    set role_id = v_default_role_id
    where role_id = old.id;

  return old;
end;
$$;

create trigger trg_reassign_members_before_role_delete
  before delete on public.roles
  for each row execute function public.reassign_members_before_role_delete();


-- 15.6d 2026-09-18: Låser standardrollen "Medlems" privilegie-sæt
-- fuldstændigt fast, parallelt til prevent_admin_privilege_change (15.5)
-- for "Admin"-rollens admin-privilegie, men som separat funktion (samme
-- princip som prevent_admin_role_change/prevent_default_role_change,
-- 15.6/15.6b, er to adskilte funktioner for den analoge rolle-
-- beskyttelse). read_news og read_tasks (Medlems seedede privilegier,
-- se 15.8) kan hverken slettes eller omdøbes, og INGEN nye privilegier
-- kan tilføjes til Medlem overhovedet - rollen er organisationens
-- "gulv" og skal have et forudsigeligt, fast privilegie-sæt.
-- Respekterer samme ponos.bypass_admin_protection-flag som 15.5/15.6/
-- 15.6b, så delete_organisation (15.13) fortsat kan kaskade-slette
-- Medlems privilegier sammen med resten af organisationen.
-- (Kørt sammen med et engangs-backfill af read_tasks til eksisterende
-- organisationers Medlem-rolle, som viste sig ikke at være ramt af det
-- tidligere fase3-tasks-privileges.sql-backfill for alle organisationer
-- - se docs/migrations/README.md.)
create or replace function public.prevent_default_role_privilege_change()
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

  if tg_op = 'INSERT' then
    select name into role_name from public.roles where id = new.role_id;

    if role_name = 'Medlem' then
      raise exception 'Standardrollen Medlem kan ikke tildeles nye privilegier.' using hint = 'MEMBER_ROLE_NOT_EXTENDABLE';
    end if;

    return new;
  end if;

  select name into role_name from public.roles where id = old.role_id;

  if role_name = 'Medlem' and old.name in ('read_news', 'read_tasks') then
    if tg_op = 'DELETE' then
      raise exception 'Standardrollen Medlems privilegier er faste og kan ikke fjernes.' using hint = 'MEMBER_ROLE_PRIVILEGES_FIXED_REMOVE';
    end if;
    if new.name is distinct from old.name then
      raise exception 'Standardrollen Medlems privilegier er faste og kan ikke omdøbes.' using hint = 'MEMBER_ROLE_PRIVILEGES_FIXED_RENAME';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger trg_prevent_default_role_privilege_change
  before insert or update or delete on public.privileges
  for each row execute function public.prevent_default_role_privilege_change();


-- 15.6e 2026-09-18: Lukker et hul - en bruger med kun update_roles-
-- privilegiet (IKKE selve admin-privilegiet) kunne ændre en anden
-- brugers rolle VÆK fra Admin (nedgradere/fjerne admin-status fra en
-- anden administrator), selvom de ikke kan TILDELE admin-privilegiet
-- (det er allerede korrekt spærret af RLS-policyen "Tildel rolle til
-- medlemskaber i egen organisation", 16.10 - dens with check ser kun
-- den NYE role_id, ikke den gamle). Samme asymmetri findes ikke ved
-- fjernelse af medlemmer (remove_member, 15.x, tjekker allerede
-- eksplicit: "Du skal være administrator for at fjerne en anden
-- administrator.") - kun rolle-SKIFT manglede den spejlvendte
-- beskyttelse. auth.uid() i en security definer-funktion afspejler
-- stadig den faktisk kaldende bruger (samme konvention som alle øvrige
-- trigger-funktioner her), så has_privilege('admin') korrekt tjekker
-- AKTØRENS egne privilegier. Selv-rolleskift er uafhængigt allerede
-- blokeret af trg_prevent_self_membership_role_change (15.9).
--
-- 2026-09-18: udvidet med en ny retning - højst én admin ad gangen pr.
-- organisation. Blokerer også at TILDELE en admin-bærende rolle til et
-- medlem, hvis et ANDET medlem allerede har admin-adgang, medmindre
-- ponos.bypass_admin_protection er sat (den nye transfer_admin_role,
-- 15.14b, bruger dette til det atomiske "giv admin-rollen videre"-
-- hand-off: den ene admin nedgraderes til Medlem, samtidig med at den
-- anden forfremmes).
create or replace function public.prevent_non_admin_role_change_on_admin_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('ponos.bypass_admin_protection', true), 'false') = 'true' then
    return new;
  end if;

  if old.role_id is not null
     and public.role_has_privilege(old.role_id, 'admin')
     and not public.has_privilege('admin')
  then
    raise exception 'Du skal være administrator for at ændre en anden administrators rolle.' using hint = 'ADMIN_REQUIRED_CHANGE_ADMIN_ROLE';
  end if;

  if new.role_id is not null and public.role_has_privilege(new.role_id, 'admin') then
    if exists (
      select 1
      from public.memberships m
      where m.organisation_id = new.organisation_id
        and m.user_id <> new.user_id
        and m.role_id is not null
        and public.role_has_privilege(m.role_id, 'admin')
    ) then
      raise exception 'Organisationen har allerede en administrator - brug "Giv admin-rollen videre" i stedet.' using hint = 'ORG_ALREADY_HAS_ADMIN';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_prevent_non_admin_role_change_on_admin_membership
  before update of role_id on public.memberships
  for each row execute function public.prevent_non_admin_role_change_on_admin_membership();


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
      raise exception 'Du kan ikke ændre din aktive organisation direkte.' using hint = 'CANNOT_CHANGE_ACTIVE_ORG_DIRECTLY';
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
-- Fase 3: seeder nu ÉN organisations-standardrolle "Medlem" (med
-- read_news) samtidig med "Admin" - se 15.6b for beskyttelsen af den.
-- Fase 3 trin 6 (2026-09-17): "Medlem" får nu også read_tasks, så
-- menige medlemmer kan se opgaver/Afsluttede opgaver fra dag ét (uden
-- den ville de miste al opgave-adgang, når 16.7's SELECT-policy blev
-- privilegie-gated). Eksisterende organisationers "Medlem"-rolle fik
-- privilegiet ved et engangs-backfill (docs/migrations/
-- fase3-tasks-privileges.sql, del F) - ingen ny kode nødvendig her,
-- kun denne funktion for NYE organisationer.
create or replace function public.create_organisation(p_name text)
returns public.organisations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org            public.organisations;
  v_admin_role_id  uuid;
  v_member_role_id uuid;
  v_user_id        uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Du skal være logget ind for at oprette en organisation.' using hint = 'NOT_LOGGED_IN_CREATE_ORG';
  end if;

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Organisationens navn skal udfyldes.' using hint = 'ORG_NAME_REQUIRED';
  end if;

  insert into public.organisations (name)
  values (trim(p_name))
  returning * into v_org;

  insert into public.roles (organisation_id, name)
  values (v_org.id, 'Admin')
  returning id into v_admin_role_id;

  insert into public.privileges (role_id, name)
  values (v_admin_role_id, 'admin');

  insert into public.roles (organisation_id, name)
  values (v_org.id, 'Medlem')
  returning id into v_member_role_id;

  -- Medlems faste privilegie-sæt seedes her - trg_prevent_default_role_
  -- privilege_change (15.6d) blokerer ellers insert på "Medlem". Rettet
  -- 2026-09-29: uden flaget fejlede al oprettelse af nye organisationer.
  perform set_config('ponos.bypass_admin_protection', 'true', true);

  insert into public.privileges (role_id, name)
  values (v_member_role_id, 'read_news'), (v_member_role_id, 'read_tasks');

  perform set_config('ponos.bypass_admin_protection', 'false', true);

  insert into public.memberships (user_id, organisation_id, role_id)
  values (v_user_id, v_org.id, v_admin_role_id);

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


-- 15.9 US-59: en bruger med update_roles (Fase 3, tidligere manage_roles)
-- må ikke kunne tildele SIG SELV en rolle via en memberships-opdatering
-- (samme escalation-tanke som
-- prevent_self_role_org_change havde for profiles.role_id før US-59).
--
-- 2026-09-18: hidtil ubetinget - fik nu et dedikeret bypass-flag
-- (ponos.bypass_self_membership_role_change, eget flag adskilt fra
-- bypass_admin_protection, samme princip som bypass_self_role_org_change
-- er sit eget flag), så transfer_admin_role (15.14b) kan nedgradere den
-- afgivende admin til Medlem som del af samme transaktion.
create or replace function public.prevent_self_membership_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('ponos.bypass_self_membership_role_change', true), 'false') = 'true' then
    return new;
  end if;

  if new.user_id = auth.uid() and new.role_id is distinct from old.role_id then
    raise exception 'Du kan ikke tildele dig selv en rolle.' using hint = 'CANNOT_ASSIGN_OWN_ROLE';
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
    raise exception 'Du skal være logget ind for at skifte organisation.' using hint = 'NOT_LOGGED_IN_SWITCH_ORG';
  end if;

  if not exists (
    select 1 from public.memberships
    where user_id = v_user_id and organisation_id = p_organisation_id
  ) then
    raise exception 'Du er ikke medlem af denne organisation.' using hint = 'NOT_MEMBER_OF_ORG';
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
    raise exception 'Du skal være logget ind for at forlade en organisation.' using hint = 'NOT_LOGGED_IN_LEAVE_ORG';
  end if;

  select role_id into v_role_id
  from public.memberships
  where user_id = v_user_id and organisation_id = p_organisation_id;

  if not found then
    raise exception 'Du er ikke medlem af denne organisation.' using hint = 'NOT_MEMBER_OF_ORG';
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
      raise exception 'Du er den eneste administrator i organisationen. Gør et andet medlem til administrator, før du forlader den.' using hint = 'ONLY_ADMIN_CANNOT_LEAVE';
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
    raise exception 'Du skal være logget ind for at slette en organisation.' using hint = 'NOT_LOGGED_IN_DELETE_ORG';
  end if;

  select role_id into v_role_id
  from public.memberships
  where user_id = v_user_id and organisation_id = p_organisation_id;

  if not found then
    raise exception 'Du er ikke medlem af denne organisation.' using hint = 'NOT_MEMBER_OF_ORG';
  end if;

  v_is_admin := v_role_id is not null and exists (
    select 1 from public.privileges where role_id = v_role_id and name = 'admin'
  );

  if not v_is_admin then
    raise exception 'Kun en administrator kan slette organisationen.' using hint = 'ONLY_ADMIN_CAN_DELETE_ORG';
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
    raise exception 'Du skal være logget ind for at fjerne et medlem.' using hint = 'NOT_LOGGED_IN_REMOVE_MEMBER';
  end if;

  if p_user_id = v_caller_id then
    raise exception 'Du kan ikke fjerne dig selv - brug "Forlad organisation" i stedet.' using hint = 'CANNOT_REMOVE_SELF';
  end if;

  v_org_id := public.auth_profile_org();
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not public.has_privilege_or_admin('delete_members') then
    raise exception 'Du har ikke rettigheder til at fjerne medlemmer.' using hint = 'NO_PRIV_REMOVE_MEMBERS';
  end if;

  select role_id into v_target_role_id
  from public.memberships
  where user_id = p_user_id and organisation_id = v_org_id;

  if not found then
    raise exception 'Brugeren er ikke medlem af organisationen.' using hint = 'USER_NOT_MEMBER';
  end if;

  v_target_is_admin := v_target_role_id is not null and exists (
    select 1 from public.privileges where role_id = v_target_role_id and name = 'admin'
  );
  if v_target_is_admin and not public.has_privilege('admin') then
    raise exception 'Du skal være administrator for at fjerne en anden administrator.' using hint = 'ADMIN_REQUIRED_REMOVE_ADMIN';
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


-- 15.14b 2026-09-18: giver admin-rollen videre til et andet medlem -
-- højst én admin ad gangen pr. organisation (se
-- prevent_non_admin_role_change_on_admin_membership, 15.6e). Atomisk:
-- modtageren forfremmes til Admin, OG den kaldende admin nedgraderes
-- selv til Medlem, i samme transaktion. Sætter
-- ponos.bypass_admin_protection (15.6e's invariant-tjek) og
-- ponos.bypass_self_membership_role_change (15.9's selv-rolle-lås), så
-- begge opdateringer kan gennemføres - ingen anden vej (rå
-- klient-opdatering, uden om denne RPC) kan opnå det samme, da ingen af
-- flagene er sat udenfor denne transaktion.
create or replace function public.transfer_admin_role(p_new_admin_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_org_id uuid;
  v_admin_role_id uuid;
  v_member_role_id uuid;
  v_target_membership_exists boolean;
begin
  if v_caller_id is null then
    raise exception 'Du skal være logget ind for at give admin-rollen videre.' using hint = 'NOT_LOGGED_IN_TRANSFER_ADMIN';
  end if;

  if p_new_admin_user_id = v_caller_id then
    raise exception 'Du er allerede administrator.' using hint = 'ALREADY_ADMIN';
  end if;

  v_org_id := public.auth_profile_org();
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not public.has_privilege('admin') then
    raise exception 'Du skal være administrator for at give admin-rollen videre.' using hint = 'ADMIN_REQUIRED_TRANSFER_ADMIN';
  end if;

  select exists (
    select 1 from public.memberships
    where user_id = p_new_admin_user_id and organisation_id = v_org_id
  ) into v_target_membership_exists;

  if not v_target_membership_exists then
    raise exception 'Brugeren er ikke medlem af organisationen.' using hint = 'USER_NOT_MEMBER';
  end if;

  select id into v_admin_role_id from public.roles where organisation_id = v_org_id and name = 'Admin';
  select id into v_member_role_id from public.roles where organisation_id = v_org_id and name = 'Medlem';

  if v_admin_role_id is null or v_member_role_id is null then
    raise exception 'Organisationens standardroller mangler.' using hint = 'ORG_DEFAULT_ROLES_MISSING';
  end if;

  perform set_config('ponos.bypass_admin_protection', 'true', true);
  perform set_config('ponos.bypass_self_membership_role_change', 'true', true);

  update public.memberships
    set role_id = v_admin_role_id
    where user_id = p_new_admin_user_id and organisation_id = v_org_id;

  update public.memberships
    set role_id = v_member_role_id
    where user_id = v_caller_id and organisation_id = v_org_id;
end;
$$;

grant execute on function public.transfer_admin_role(uuid) to authenticated;


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
-- Fase 3: tildeler nu organisationens "Medlem"-standardrolle i stedet
-- for at lade role_id stå null - se 15.6b.
create or replace function public.handle_membership_invitation_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_default_role_id uuid;
begin
  if new.status = 'Accepted' and old.status is distinct from 'Accepted' then
    new.reviewed_at := coalesce(new.reviewed_at, now());

    select id into v_default_role_id
    from public.roles
    where organisation_id = new.organisation_id and name = 'Medlem';

    insert into public.memberships (user_id, organisation_id, role_id)
    values (new.invited_user_id, new.organisation_id, v_default_role_id)
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
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not public.has_privilege_or_admin('create_invitations') then
    raise exception 'Du har ikke rettigheder til at invitere medlemmer.' using hint = 'NO_PRIV_INVITE_MEMBERS';
  end if;

  select id into v_target_id
  from public.profiles
  where lower(email) = lower(trim(p_email));

  if v_target_id is null then
    raise exception 'Ingen bruger findes med denne email.' using hint = 'NO_USER_WITH_EMAIL';
  end if;

  if exists (
    select 1 from public.memberships
    where user_id = v_target_id and organisation_id = v_org_id
  ) then
    raise exception 'Brugeren er allerede medlem af organisationen.' using hint = 'USER_ALREADY_MEMBER';
  end if;

  insert into public.membership_invitations (organisation_id, invited_user_id, invited_by)
  values (v_org_id, v_target_id, auth.uid())
  on conflict (invited_user_id, organisation_id) where status = 'Pending' do nothing;

  if not found then
    raise exception 'Brugeren har allerede en ventende invitation til organisationen.' using hint = 'USER_ALREADY_INVITED';
  end if;
end;
$$;

grant execute on function public.invite_member(text) to authenticated;


-- ---------------------------------------------------------------------
-- 15.16b US-67-udvidelse (2026-09-29): notifikation ved invitation.
-- Ny invitation -> 'membership_invitation'-notifikation til den inviterede
-- (title er fast dansk etiket, oversættes via type i frontend; body =
-- organisationens navn; link åbner Dashboard -> Organisation ->
-- Invitationer). Trigger frem for kode i invite_member, så enhver
-- insert-vej dækkes. Besvaret (Accepted/Rejected) -> markeret læst;
-- slettet (annulleret, eller org slettet) -> notifikationen slettes.
-- skip_muted_notification (§15.20c) gælder. Kørt og testet 2026-09-29.
-- ---------------------------------------------------------------------
create or replace function public.notify_membership_invitation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into notifications (user_id, organisation_id, type, title, body, link, reference_id)
  select
    new.invited_user_id,
    new.organisation_id,
    'membership_invitation',
    'Invitation til organisation',
    o.name,
    '/dashboard?tab=organisation&section=invitations',
    new.id
  from organisations o
  where o.id = new.organisation_id;

  return new;
end;
$function$;

create trigger trg_notify_membership_invitation
  after insert on public.membership_invitations
  for each row
  execute function public.notify_membership_invitation();

create or replace function public.sync_membership_invitation_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' then
    delete from notifications
    where type = 'membership_invitation' and reference_id = old.id;
    return old;
  end if;

  if new.status <> 'Pending' and old.status = 'Pending' then
    update notifications
      set is_read = true
      where type = 'membership_invitation' and reference_id = new.id;
  end if;

  return new;
end;
$function$;

create trigger trg_sync_membership_invitation_notification
  after update of status or delete on public.membership_invitations
  for each row
  execute function public.sync_membership_invitation_notification();


-- 15.17 US-68: nulstiller en glemt adgangskode UDEN mailbekræftelse.
-- Skrives til auth.users direkte, da den der har glemt sin kode per
-- definition ikke er logget ind og derfor ikke kan bruge GoTrues
-- updateUser. Derfor også grant til anon, ikke kun authenticated.
--
-- PROTOTYPE-FORBEHOLD (bevidst beslutning, projektet deployes ikke):
-- email + fornavn + efternavn er hele identitetskontrollen. Enhver der
-- kender de tre ting - og anon-nøglen ligger i browser-bundtet, så
-- funktionen kan kaldes uden om vores egen side - kan overtage kontoen.
-- Som et lille værn (ikke rigtig sikkerhed) svarer funktionen med én og
-- samme fejl uanset hvad der ikke passede, så den ikke kan bruges til at
-- afprøve hvilke emails der findes. Skal erstattes af
-- resetPasswordForEmail/verifyOtp, hvis systemet nogensinde deployes.
--
-- gen_salt('bf', 10) er samme bcrypt-cost som GoTrue selv skriver, så
-- hashet kan læses af login bagefter. search_path udvides med
-- extensions, fordi crypt/gen_salt bor der på et Supabase-projekt.
-- Bevidst udeladt: sletning af auth.sessions (ville logge brugeren ud på
-- andre enheder) - en ekstra rørelse ved GoTrues tabeller som prototypen
-- ikke har brug for.
create or replace function public.reset_password_prototype(
  p_email text, p_first_name text, p_last_name text, p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_user_id uuid;
begin
  if length(p_new_password) < 6 then
    raise exception 'Adgangskoden skal være mindst 6 tegn.' using hint = 'PASSWORD_TOO_SHORT';
  end if;

  select id into v_user_id
  from public.profiles
  where lower(email)      = lower(trim(p_email))
    and lower(first_name) = lower(trim(p_first_name))
    and lower(last_name)  = lower(trim(p_last_name));

  -- Én samlet fejl: afslører hverken om emailen findes, eller hvilket
  -- felt der ikke passede.
  if v_user_id is null then
    raise exception 'Oplysningerne passer ikke på en konto.' using hint = 'RESET_DETAILS_NO_MATCH';
  end if;

  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
      updated_at = now()
  where id = v_user_id;
end;
$$;

grant execute on function public.reset_password_prototype(text, text, text, text) to anon, authenticated;


-- 15.18 Fase 3 trin 6 (2026-09-17): selvbetjent statusskift på opgaver.
-- En rå UPDATE på tasks.status kræver update_tasks (16.7), hvilket ville
-- blokere en almindelig tilmeldts "markér som færdig"/"genåbn" - RLS kan
-- ikke kolonne-begrænse en almindelig UPDATE-policy. Denne security
-- definer-RPC tillader ENTEN en, der selv er tilmeldt opgaven (uanset
-- privilegier), ELLER update_tasks/admin. Kaldes fra taskApi.ts'
-- updateTaskStatus i stedet for et direkte .update(). Rettet 2026-09-17:
-- manglede et eksplicit ::e_task_status-cast (p_status er text, kolonnen
-- er enum'en) - Postgres caster ikke automatisk text->enum i en UPDATE.
-- Fejlede med "column status is of type e_task_status but expression is
-- of type text" ved "Genåbn" i CompletedTasksPanel.tsx.
-- Udvidet 2026-09-19 (US-75): sætter finished_at ved Completed og nulstiller
-- den ved alle andre statusser (også "Genåbn"). Udvidet 2026-09-23 (US-42):
-- blokerer Completed hvis opgaven har uafrapporterede materialer, se
-- assert_task_materials_resolved (§15.21). Udvidet igen 2026-09-23: ved
-- overgang til InProgress sættes opgavens reserverede (Reserved) materialer
-- automatisk til InUse - "I brug" er mere retvisende mens arbejdet rent
-- faktisk er i gang. Bruger en transaktions-lokal bypass af guard-triggeren
-- trg_prevent_direct_status_change_on_reserved_unit (se den, samme afsnit
-- ovenfor).
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
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not exists (select 1 from public.tasks where id = p_task_id and organisation_id = v_org_id) then
    raise exception 'Opgaven findes ikke i din organisation.' using hint = 'TASK_NOT_FOUND';
  end if;

  v_is_assignee := exists (
    select 1 from public.task_assignees where task_id = p_task_id and user_id = auth.uid()
  );

  if not (v_is_assignee or public.has_privilege_or_admin('update_tasks')) then
    raise exception 'Du har ikke rettigheder til at ændre denne opgaves status.' using hint = 'NO_PRIV_SET_TASK_STATUS';
  end if;

  if p_status = 'Completed' then
    perform public.assert_task_materials_resolved(p_task_id);
  end if;

  update public.tasks
     set status = p_status::public.e_task_status,
         finished_at = case when p_status = 'Completed' then now() else null end
   where id = p_task_id;

  if p_status = 'InProgress' then
    perform set_config('ponos.bypass_unit_status_guard', 'on', true);

    update public.data_layer_item_units u
       set status = 'InUse'
     where u.status = 'Reserved'
       and u.id in (
         select tmu.unit_id
         from public.task_material_units tmu
         join public.task_materials tm on tm.id = tmu.task_material_id
         where tm.task_id = p_task_id
       );

    perform set_config('ponos.bypass_unit_status_guard', 'off', true);
  end if;
end;
$$;

grant execute on function public.set_task_status(uuid, text) to authenticated;


-- 15.19 US-75 (2026-09-19): godkend/afvis opgave-færdigmelding.
-- task_requests behandles udelukkende via disse security definer-RPC'er
-- (de gamle løse UPDATE-policies "Accepter/Afvis task requests" er droppet -
-- de tillod enhver ændring). approve_task_request kræver approve_task/admin:
-- alle ventende anmodninger på opgaven -> Accepted, opgaven -> Completed +
-- finished_at, og alle nuværende tilmeldte (undtagen behandleren) får
-- notifikationen task_approved. reject_task_request kræver reject_task/admin:
-- kun den ene anmodning -> Rejected, opgaven forbliver InProgress, tilmeldte
-- får task_rejected. Notifikationslink: /tasks?task=<id> (param TaskPage.tsx
-- læser). get_pending_task_requests leverer panelets liste og virker uden
-- read_tasks. 42501 ved manglende privilegie (mappes i taskApi.ts).
-- Udvidet 2026-09-23 (US-42, retter en bug): materialernes status blev
-- tidligere ændret allerede ved selve færdigmeldingen - blev anmodningen
-- AFVIST, stod materialerne så med en status der reelt ikke var sket endnu.
-- Statusændringen sker derfor nu FØRST her, ved godkendelse, ud fra de
-- gemte material_outcomes (se task_requests, §11) - se
-- apply_task_material_outcomes (§15.21b). reject_task_request rører
-- fortsat slet ikke materialerne.
-- 2026-09-27: alle fire godkendelses-RPC'er (også get_pending_task_requests
-- og get_task_request_details, §15.19b) respekterer rum-adgang via
-- can_access_task_room(t.room_id) (§15.22, kører som godkenderen): en
-- godkender ser/behandler kun anmodninger i rum, de har adgang til (åbne
-- rum, rolle i rummet, view_all_task_rooms/admin). Låst rum = samme fejl
-- som ukendt anmodning. Kræver stadig ikke read_tasks. Bruges også af fanen
-- "Til godkendelse" (/tasks/godkend). Egen færdigmelding må godkendes
-- (bevidst, bruger-valg 2026-09-27).
create or replace function public.approve_task_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
  v_task_id uuid;
  v_status public.e_request_status;
  v_title text;
  v_material_outcomes jsonb;
  v_material_outcome jsonb;
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not public.has_privilege_or_admin('approve_task') then
    raise exception 'Du har ikke rettigheder til at godkende opgaver.' using errcode = '42501', hint = 'NO_PRIV_APPROVE_TASKS';
  end if;

  select r.task_id, r.status, t.title, r.material_outcomes into v_task_id, v_status, v_title, v_material_outcomes
  from public.task_requests r
  join public.tasks t on t.id = r.task_id
  where r.id = p_request_id and t.organisation_id = v_org_id
    and public.can_access_task_room(t.room_id);

  if v_task_id is null then
    raise exception 'Anmodningen findes ikke i din organisation.' using hint = 'TASK_REQUEST_NOT_FOUND';
  end if;

  if v_status <> 'Pending' then
    raise exception 'Anmodningen er allerede behandlet.' using hint = 'TASK_REQUEST_ALREADY_HANDLED';
  end if;

  for v_material_outcome in select * from jsonb_array_elements(coalesce(v_material_outcomes, '[]'::jsonb))
  loop
    perform public.apply_task_material_outcomes(
      (v_material_outcome->>'taskMaterialId')::uuid,
      v_material_outcome->'outcomes'
    );
  end loop;

  -- Sikkerhedsnet: fanger materialer der ikke havde en gemt outcome (fx
  -- tilføjet til opgaven efter anmodningen blev sendt), se §15.21.
  perform public.assert_task_materials_resolved(v_task_id);

  update public.task_requests
     set status = 'Accepted', handled_by = auth.uid(), done_at = now()
   where task_id = v_task_id and status = 'Pending';

  -- Undertryk den generiske "afsluttet"-notifikation (15.20), transaktionslokalt.
  perform set_config('ponos.skip_task_completed_notify', 'on', true);

  update public.tasks
     set status = 'Completed', finished_at = coalesce(finished_at, now())
   where id = v_task_id;

  perform set_config('ponos.skip_task_completed_notify', 'off', true);

  insert into public.notifications (user_id, organisation_id, type, title, body, link, reference_id)
  select ta.user_id, v_org_id, 'task_approved', 'Din opgave er godkendt', v_title, '/tasks?task=' || v_task_id, v_task_id
  from public.task_assignees ta
  where ta.task_id = v_task_id and ta.user_id <> auth.uid();
end;
$$;

-- 2026-09-24: påkrævet begrundelse (p_reason, maks. 500 tegn) - gemmes i
-- task_requests.rejection_reason og sendes med i notifikationens body.
-- Den gamle signatur reject_task_request(uuid) er droppet.
create or replace function public.reject_task_request(p_request_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
  v_task_id uuid;
  v_status public.e_request_status;
  v_title text;
  v_reason text := nullif(trim(p_reason), '');
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not public.has_privilege_or_admin('reject_task') then
    raise exception 'Du har ikke rettigheder til at afvise opgaver.' using errcode = '42501', hint = 'NO_PRIV_REJECT_TASKS';
  end if;

  if v_reason is null then
    raise exception 'Du skal skrive en begrundelse for afvisningen.' using hint = 'REJECTION_REASON_REQUIRED';
  end if;

  if length(v_reason) > 500 then
    raise exception 'Begrundelsen må højst være 500 tegn.' using hint = 'REJECTION_REASON_TOO_LONG';
  end if;

  select r.task_id, r.status, t.title into v_task_id, v_status, v_title
  from public.task_requests r
  join public.tasks t on t.id = r.task_id
  where r.id = p_request_id and t.organisation_id = v_org_id
    and public.can_access_task_room(t.room_id);

  if v_task_id is null then
    raise exception 'Anmodningen findes ikke i din organisation.' using hint = 'TASK_REQUEST_NOT_FOUND';
  end if;

  if v_status <> 'Pending' then
    raise exception 'Anmodningen er allerede behandlet.' using hint = 'TASK_REQUEST_ALREADY_HANDLED';
  end if;

  -- Opgaven røres ikke - den forbliver InProgress. Materialerne røres
  -- heller ikke (2026-09-23) - de gemte material_outcomes bruges aldrig,
  -- enhederne forbliver Reserved/InUse, klar til en ny færdigmelding.
  update public.task_requests
     set status = 'Rejected', handled_by = auth.uid(), done_at = now(), rejection_reason = v_reason
   where id = p_request_id;

  insert into public.notifications (user_id, organisation_id, type, title, body, link, reference_id)
  select ta.user_id, v_org_id, 'task_rejected', 'Færdigmelding afvist', v_title || ': ' || v_reason, '/tasks?task=' || v_task_id, v_task_id
  from public.task_assignees ta
  where ta.task_id = v_task_id and ta.user_id <> auth.uid();
end;
$$;

-- 2026-09-24: + rejection_count (antal tidligere afviste færdigmeldinger
-- på opgaven, til "Afvist n gange"-mærket i listen). Returtypen ændret -
-- blev kørt som drop + create.
-- 2026-09-28: + room_id, room_name, priority, end_date (søg/sortering/
-- rum-filter i godkendelseslisten). Også drop + create.
create or replace function public.get_pending_task_requests()
returns table (
  id uuid,
  task_id uuid,
  task_title text,
  requested_by uuid,
  requester_first_name text,
  requester_last_name text,
  requested_at timestamptz,
  rejection_count integer,
  room_id uuid,
  room_name text,
  priority e_task_priority,
  end_date timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not (public.has_privilege_or_admin('approve_task') or public.has_privilege_or_admin('reject_task')) then
    raise exception 'Du har ikke rettigheder til at se opgavegodkendelser.' using errcode = '42501', hint = 'NO_PRIV_READ_TASK_APPROVALS';
  end if;

  return query
    select r.id, r.task_id, t.title, r.requested_by, p.first_name, p.last_name, r.requested_at,
      (select count(*)::integer from public.task_requests pr
        where pr.task_id = r.task_id and pr.status = 'Rejected') as rejection_count,
      t.room_id, tr.name, t.priority, t.end_date
    from public.task_requests r
    join public.tasks t on t.id = r.task_id
    left join public.task_rooms tr on tr.id = t.room_id
    left join public.profiles p on p.id = r.requested_by
    where r.status = 'Pending' and t.organisation_id = v_org_id
      and public.can_access_task_room(t.room_id)
    order by r.requested_at;
end;
$$;

revoke execute on function public.approve_task_request(uuid) from public, anon;
revoke execute on function public.reject_task_request(uuid, text) from public, anon;
revoke execute on function public.get_pending_task_requests() from public, anon;
grant execute on function public.approve_task_request(uuid) to authenticated;
grant execute on function public.reject_task_request(uuid, text) to authenticated;
grant execute on function public.get_pending_task_requests() to authenticated;


-- 15.19b US-75-udvidelse (2026-09-24): detaljer for én færdigmelding til
-- godkenderens detalje-modal (TaskApprovalDetailsModal.tsx): opgave, rum,
-- tilmeldte, materialer (reserveret mængde, nuværende status-fordeling,
-- lokationer) + den tildeltes foreslåede udfald fra material_outcomes.
-- Security definer, da en godkender (approve_task/reject_task) ikke
-- nødvendigvis har read_tasks - samme begrundelse som
-- get_pending_task_requests. Org-isoleret via tasks.organisation_id.
-- 2026-09-24: + previous_rejections (opgavens afviste færdigmeldinger m.
-- begrundelse, afvist af/tidspunkt, meldt færdig af), nyeste først.
create or replace function public.get_task_request_details(p_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
  v_task_id uuid;
  v_result jsonb;
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not (public.has_privilege_or_admin('approve_task') or public.has_privilege_or_admin('reject_task')) then
    raise exception 'Du har ikke rettigheder til at se opgavegodkendelser.' using errcode = '42501', hint = 'NO_PRIV_READ_TASK_APPROVALS';
  end if;

  select r.task_id into v_task_id
  from public.task_requests r
  join public.tasks t on t.id = r.task_id
  where r.id = p_request_id and t.organisation_id = v_org_id
    and public.can_access_task_room(t.room_id);

  if v_task_id is null then
    raise exception 'Anmodningen findes ikke i din organisation.' using hint = 'TASK_REQUEST_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'task', jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'description', t.description,
      'priority', t.priority,
      'status', t.status,
      'start_date', t.start_date,
      'end_date', t.end_date,
      'requires_approval', t.requires_approval,
      'room_name', tr.name
    ),
    'requester_name', trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
    'requested_at', r.requested_at,
    'assignees', coalesce((
      select jsonb_agg(trim(coalesce(ap.first_name, '') || ' ' || coalesce(ap.last_name, '')) order by ap.first_name, ap.last_name)
      from public.task_assignees ta
      left join public.profiles ap on ap.id = ta.user_id
      where ta.task_id = t.id
    ), '[]'::jsonb),
    'materials', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', tm.id,
        'item_name', i.name,
        'unit_of_measurement', i.unit_of_measurement,
        'quantity', tm.quantity,
        'linked_groups', coalesce((
          select jsonb_agg(jsonb_build_object('status', g.status, 'quantity', g.quantity))
          from (
            select u.status, sum(u.quantity) as quantity
            from public.task_material_units tmu
            join public.data_layer_item_units u on u.id = tmu.unit_id
            where tmu.task_material_id = tm.id
            group by u.status
          ) g
        ), '[]'::jsonb),
        'location_labels', coalesce((
          select jsonb_agg(distinct case when pl.id is null then l.name else pl.name || ' > ' || l.name end)
          from public.task_material_units tmu
          join public.data_layer_item_units u on u.id = tmu.unit_id
          join public.locations l on l.id = u.location_id
          left join public.locations pl on pl.id = l.parent_location_id
          where tmu.task_material_id = tm.id
        ), '[]'::jsonb),
        'has_units_without_location', exists (
          select 1
          from public.task_material_units tmu
          join public.data_layer_item_units u on u.id = tmu.unit_id
          where tmu.task_material_id = tm.id and u.location_id is null
        ),
        'proposed_outcomes', (
          select mo->'outcomes'
          from jsonb_array_elements(coalesce(r.material_outcomes, '[]'::jsonb)) mo
          where (mo->>'taskMaterialId')::uuid = tm.id
          limit 1
        )
      ) order by i.name)
      from public.task_materials tm
      join public.data_layer_items i on i.id = tm.item_id
      where tm.task_id = t.id
    ), '[]'::jsonb),
    'previous_rejections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reason', pr.rejection_reason,
        'rejected_at', pr.done_at,
        'rejected_by_name', trim(coalesce(hp.first_name, '') || ' ' || coalesce(hp.last_name, '')),
        'requester_name', trim(coalesce(rp.first_name, '') || ' ' || coalesce(rp.last_name, '')),
        'requested_at', pr.requested_at
      ) order by pr.done_at desc nulls last)
      from public.task_requests pr
      left join public.profiles hp on hp.id = pr.handled_by
      left join public.profiles rp on rp.id = pr.requested_by
      where pr.task_id = t.id and pr.status = 'Rejected'
    ), '[]'::jsonb)
  ) into v_result
  from public.task_requests r
  join public.tasks t on t.id = r.task_id
  left join public.task_rooms tr on tr.id = t.room_id
  left join public.profiles p on p.id = r.requested_by
  where r.id = p_request_id;

  return v_result;
end;
$$;

revoke execute on function public.get_task_request_details(uuid) from public, anon;
grant execute on function public.get_task_request_details(uuid) to authenticated;


-- 15.20 US-75 (2026-09-19): notify_task_completed (notifikationsfeaturen,
-- Rasmus' funktion - kun denne ene er dokumenteret her fordi vi ændrede den).
-- Springer over, når approve_task_request (15.19) har sat det transaktions-
-- lokale flag ponos.skip_task_completed_notify, ellers ville tilmeldte få både
-- "godkendt" og "afsluttet". notifications-tabellen og de to øvrige
-- notify_task_*-triggere mangler stadig i dette dokument. Tabellens
-- type-constraint (notifications_type_check, type er text) tillader
-- pr. 2026-09-29 ('membership_invitation' tilføjet, se §15.16b):
--   check (type = any (array['message','task_assigned','task_updated',
--                            'task_completed','task_approved','task_rejected',
--                            'news','task_favorite_room',
--                            'membership_invitation']))
create or replace function public.notify_task_completed()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if coalesce(current_setting('ponos.skip_task_completed_notify', true), '') = 'on' then
    return new;
  end if;

  if new.status = 'Completed' and old.status is distinct from 'Completed' then
    insert into notifications (user_id, organisation_id, type, title, body, link, reference_id)
    select
      ta.user_id,
      new.organisation_id,
      'task_completed',
      'En opgave er afsluttet',
      new.title,
      '/tasks?taskId=' || new.id,
      new.id
    from task_assignees ta
    where ta.task_id = new.id
      and ta.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  end if;

  return new;
end;
$function$;

-- create trigger trg_notify_task_completed after update of status on public.tasks
--   for each row execute function notify_task_completed();   (findes allerede i live)


-- ---------------------------------------------------------------------
-- 15.20b US-78 (2026-09-27): notify_task_created_in_favorite_room
-- Ny opgave i et rum -> notifikation 'task_favorite_room' til brugere med
-- rummet som favorit (task_room_favorites, §9.5b), ekskl. opretteren. Kun
-- ved insert (ikke når en opgave flyttes ind i et rum); ingen opt-out.
-- Rettigheder tjekkes for MODTAGEREN via memberships.role_id +
-- role_has_privilege: can_access_task_room/has_privilege_or_admin bruger
-- auth.uid() (= opretteren i triggeren) og kan ikke genbruges.
-- Body "Rum: Opgavetitel", link /tasks?taskId=. Kørt og testet 2026-09-27.
-- ---------------------------------------------------------------------
create or replace function public.notify_task_created_in_favorite_room()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into notifications (user_id, organisation_id, type, title, body, link, reference_id)
  select
    f.user_id,
    new.organisation_id,
    'task_favorite_room',
    'Ny opgave i et favoritrum',
    tr.name || ': ' || new.title,
    '/tasks?taskId=' || new.id,
    new.id
  from task_room_favorites f
  join task_rooms tr on tr.id = f.room_id
  join memberships m on m.user_id = f.user_id and m.organisation_id = new.organisation_id
  where f.room_id = new.room_id
    and f.organisation_id = new.organisation_id
    and f.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    and m.role_id is not null
    and (role_has_privilege(m.role_id, 'read_tasks') or role_has_privilege(m.role_id, 'admin'))
    and (
      role_has_privilege(m.role_id, 'admin')
      or role_has_privilege(m.role_id, 'view_all_task_rooms')
      or not exists (select 1 from task_room_roles trr where trr.room_id = new.room_id)
      or exists (select 1 from task_room_roles trr where trr.room_id = new.room_id and trr.role_id = m.role_id)
    );

  return new;
end;
$function$;

create trigger trg_notify_task_created_in_favorite_room
  after insert on public.tasks
  for each row
  when (new.room_id is not null)
  execute function public.notify_task_created_in_favorite_room();


-- ---------------------------------------------------------------------
-- 15.20c US-79 (2026-09-27): skip_muted_notification
-- before insert-trigger på notifications (Rasmus' tabel - hans notify_*-
-- triggere er ikke ændret): dropper rækken (return null), hvis modtageren
-- har slået alt eller typen fra i notification_preferences (§9.9). Virker
-- derfor for alle eksisterende og fremtidige notify-triggere. Slåede-fra
-- notifikationer oprettes slet ikke. Kørt og testet 2026-09-27.
-- ---------------------------------------------------------------------
create or replace function public.skip_muted_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if exists (
    select 1
    from notification_preferences p
    where p.user_id = new.user_id
      and (not p.enabled or new.type = any(p.muted_types))
  ) then
    return null;
  end if;

  return new;
end;
$function$;

create trigger trg_skip_muted_notification
  before insert on public.notifications
  for each row
  execute function public.skip_muted_notification();


-- ---------------------------------------------------------------------
-- 15.21 US-42 (2026-09-23): ITEM-ENHEDER OG TASK-MATERIALE-RESERVATION
-- Hele kredsløbet mellem Datalager og Task: en opgave RESERVERER
-- automatisk N ledige enheder af et item (reserve_item_units), frigiver
-- dem ved annullering (release_item_units), og AFRAPPORTERER det
-- faktiske udfald ved færdiggørelse (resolve_task_material_units) -
-- kræves før set_task_status/approve_task_request tillader Completed
-- (assert_task_materials_resolved, kaldt fra §15.18/§15.19). split_unit_if_needed
-- er en delt hjælpefunktion, så splitning af en batch-række (fx "5 af 20
-- liter") kun er implementeret ét sted. Alle funktioner er samlet her
-- (ikke fordelt ved deres respektive tabeller i §9a/§11a), samme
-- struktur som resten af filen (fx sync_item_organisation, §15.4, for
-- tabellen i §9).
-- ---------------------------------------------------------------------

-- Sync organisation_id fra item, samme mønster som sync_item_organisation (§15.4).
create or replace function public.sync_item_unit_organisation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select organisation_id into new.organisation_id
  from public.data_layer_items
  where id = new.item_id;
  return new;
end;
$$;

create trigger trg_sync_item_unit_organisation
  before insert or update of item_id on public.data_layer_item_units
  for each row execute function public.sync_item_unit_organisation();

-- Automatisk status ud fra en enheds indhold (2026-09-23), når "-1"/"+1"
-- i itemsDetailComponent.tsx opdaterer contents_remaining. Generaliseret
-- samme dag (docs/migrations/README.md, 2026-09-23-configurable-contents-
-- status.sql) fra en hårdkodet "forbrugs-retning" til fuldt konfigurerbar
-- pr. enhed: tom/delvis/fuld mapper til enhedens EGNE
-- contents_empty_status/contents_partial_status/contents_full_status
-- (§9a) - null ved en tærskel = ingen automatisk ændring der. Frontendens
-- default (uændret) er tom=Consumed, delvis=Missing, fuld=Available.
-- Fyrer kun ved UPDATE af contents_remaining/quantity, ikke ved
-- oprettelse (så den valgte startstatus fra opret-/tilføj-formularen
-- respekteres) og ikke ved almindelige statusskift via dropdown'en
-- (rører ikke contents_remaining/quantity - ingen konflikt med
-- guard-triggeren nedenfor, som er scopet til "update of status":
-- SQL-kaldet herfra sætter aldrig status i sin egen SET-klausul, så
-- guard-triggeren fyrer slet ikke).
--
-- To grene, samme diskriminator som §9a (2026-09-23, docs/migrations/
-- README.md, 2026-09-23-measured-item-capacity-status.sql): begge
-- contents_total/contents_remaining sat -> Enkeltstyk+indhold, niveauet
-- er contents_remaining (fx 12-pack). Kun contents_total sat -> Målt
-- mængde+kapacitet, niveauet er quantity selv (fx en tank) - dermed
-- udløser split_unit_if_needed's quantity-reduktion på den
-- tilbageværende/oprindelige række (§15.21, reserve_item_units/
-- resolve_task_material_units) automatisk et statustjek ved hver
-- opgave-reservation/afrapportering, uden ændringer i selve de
-- funktioner.
create or replace function public.sync_status_from_contents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.contents_total is not null and new.contents_remaining is not null then
    -- Enkeltstyk+indhold (fx 12-pack): niveauet er contents_remaining.
    if new.contents_remaining <= 0 then
      if new.contents_empty_status is not null then
        new.status := new.contents_empty_status;
      end if;
    elsif new.contents_remaining < new.contents_total then
      if new.contents_partial_status is not null then
        new.status := new.contents_partial_status;
      end if;
    else
      if new.contents_full_status is not null then
        new.status := new.contents_full_status;
      end if;
    end if;
  elsif new.contents_total is not null and new.contents_remaining is null then
    -- Målt mængde+kapacitet (fx en tank): niveauet er quantity.
    if new.quantity <= 0 then
      if new.contents_empty_status is not null then
        new.status := new.contents_empty_status;
      end if;
    elsif new.quantity < new.contents_total then
      if new.contents_partial_status is not null then
        new.status := new.contents_partial_status;
      end if;
    else
      if new.contents_full_status is not null then
        new.status := new.contents_full_status;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_sync_status_from_contents
  before update of contents_remaining, quantity on public.data_layer_item_units
  for each row execute function public.sync_status_from_contents();

-- Guard mod desync: blokerer direkte statusændring (fx via updateItemUnit)
-- på en enhed der pt. er linket til en aktiv opgave-reservation - skal
-- ske via release_item_units/resolve_task_material_units i stedet.
-- Udvidet 2026-09-23: en betroet funktion (set_task_status, ved overgang
-- til InProgress - se §15.18) kan sætte en transaktions-lokal bypass-flag
-- for legitimt at ændre Reserved -> InUse uden at unlinke først.
create or replace function public.prevent_direct_status_change_on_reserved_unit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and exists (select 1 from public.task_material_units where unit_id = old.id)
     and coalesce(current_setting('ponos.bypass_unit_status_guard', true), 'off') <> 'on' then
    raise exception 'Enheden er reserveret til en opgave og kan ikke ændres direkte - brug opgavens frigivelse/afrapportering.'
      using hint = 'UNIT_LOCKED_BY_TASK_RESERVATION';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_direct_status_change_on_reserved_unit
  before update of status on public.data_layer_item_units
  for each row execute function public.prevent_direct_status_change_on_reserved_unit();

-- Sikkerhedsnet: frigiv enheder hvis task_materials slettes uden om
-- release_item_units med udfald (fx sletning af et rum med opgaver, eller
-- release_item_units uden p_outcomes). BEFORE DELETE (ikke AFTER!):
-- task_material_units-rækkerne skal stadig eksistere når vi læser dem, og
-- guard-triggeren ovenfor kræver at linket er væk FØR status ændres.
-- Rettet 2026-09-24: fallback-regel - kun Reserved/InUse -> Available,
-- andre statusser (fx Damaged sat undervejs, §15.21c) beholdes.
create or replace function public.release_units_on_task_material_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit_ids uuid[];
begin
  select array_agg(unit_id) into v_unit_ids
  from public.task_material_units
  where task_material_id = old.id;

  delete from public.task_material_units where task_material_id = old.id;

  update public.data_layer_item_units
     set status = 'Available'
   where id = any(v_unit_ids)
     and status in ('Reserved', 'InUse');

  return old;
end;
$$;

create trigger trg_release_units_on_task_material_delete
  before delete on public.task_materials
  for each row execute function public.release_units_on_task_material_delete();

-- Delt hjælpefunktion: splitter en batch-række (uden serienummer,
-- quantity > 1) i to, så en reservation/afrapportering kan tage en
-- præcis del-mængde. En serienummereret række (altid quantity=1, jf.
-- constraint i §9a) rammes aldrig af split-grenen.
-- Rettet 2026-09-23 (docs/migrations/README.md, 2026-09-23-container-
-- count-and-split-fix.sql): genvejen (ingen splitning, returnér samme
-- række) gjaldt tidligere også ved 100%-forbrug af en kapacitets-sporet
-- beholder (fx en tank) - så beholder-RÆKKEN selv (med dens contents_total/
-- status-konfiguration) blev omdøbt til afrapporteringens udfaldsstatus, og
-- tanken forsvandt fra "Beholdere" i stedet for at blive tilbage som en tom
-- (0/kapacitet) beholder. Genvejen gælder nu kun rækker UDEN
-- kapacitets-sporing - en kapacitets-række splittes altid, også ved 100%.
create or replace function public.split_unit_if_needed(p_unit_id uuid, p_needed numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit public.data_layer_item_units;
  v_new_id uuid;
begin
  select * into v_unit from public.data_layer_item_units where id = p_unit_id;

  if v_unit.id is null then
    raise exception 'Enheden findes ikke.' using hint = 'UNIT_NOT_FOUND';
  end if;

  if v_unit.organisation_id <> public.auth_profile_org() then
    raise exception 'Enheden tilhører ikke din organisation.' using hint = 'UNIT_ORG_MISMATCH';
  end if;

  if v_unit.quantity = p_needed and v_unit.contents_total is null then
    return v_unit.id;
  end if;

  update public.data_layer_item_units
     set quantity = quantity - p_needed
   where id = p_unit_id;

  insert into public.data_layer_item_units
    (organisation_id, item_id, location_id, quantity, status)
  values
    (v_unit.organisation_id, v_unit.item_id, v_unit.location_id, p_needed, v_unit.status)
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- Forbrug, Datalager -> Task: vælger/splitter N ledige enheder atomisk
-- (FIFO, for update skip locked), Available -> Reserved, opretter+linker
-- task_materials-linjen. Udvidet 2026-09-23: reserveres et materiale på en
-- opgave der allerede er InProgress, sættes enhederne direkte til InUse i
-- stedet for Reserved - der er intet "vente"-trin tilbage for den opgave.
-- Udvidet 2026-09-24: valgfri p_location_id/p_restrict_location - med
-- p_restrict_location = true tages kun enheder hvor location_id IS NOT
-- DISTINCT FROM p_location_id (null = "Uden lager"), så en opgave kun
-- reserverer fra det lager brugeren valgte. Default = alle lagre.
create or replace function public.reserve_item_units(
  p_task_id uuid,
  p_item_id uuid,
  p_quantity numeric,
  p_location_id uuid default null,
  p_restrict_location boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
  v_task_status public.e_task_status;
  v_task_material_id uuid;
  v_unit record;
  v_remaining numeric := p_quantity;
  v_take numeric;
  v_unit_id uuid;
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Mængden skal være større end 0.' using hint = 'INVALID_QUANTITY';
  end if;

  select status into v_task_status
  from public.tasks
  where id = p_task_id and organisation_id = v_org_id;

  if v_task_status is null then
    raise exception 'Opgaven findes ikke i din organisation.' using hint = 'TASK_NOT_FOUND';
  end if;

  if not exists (select 1 from public.data_layer_items where id = p_item_id and organisation_id = v_org_id) then
    raise exception 'Item findes ikke i din organisation.' using hint = 'ITEM_NOT_FOUND';
  end if;

  if not public.has_privilege_or_admin('update_tasks') then
    raise exception 'Du har ikke rettigheder til at reservere materialer på opgaver.'
      using errcode = '42501', hint = 'NO_PRIV_RESERVE_MATERIALS';
  end if;

  insert into public.task_materials (task_id, item_id, quantity)
  values (p_task_id, p_item_id, p_quantity)
  returning id into v_task_material_id;

  for v_unit in
    select id, quantity
    from public.data_layer_item_units
    where item_id = p_item_id
      and status = 'Available'
      and (not p_restrict_location or location_id is not distinct from p_location_id)
    order by created_at
    for update skip locked
  loop
    exit when v_remaining <= 0;

    v_take := least(v_unit.quantity, v_remaining);
    v_unit_id := public.split_unit_if_needed(v_unit.id, v_take);

    update public.data_layer_item_units
       set status = (case when v_task_status = 'InProgress' then 'InUse' else 'Reserved' end)::public.e_item_status
     where id = v_unit_id;

    insert into public.task_material_units (task_material_id, unit_id)
    values (v_task_material_id, v_unit_id);

    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'Der er ikke nok ledigt lager (mangler %).', v_remaining
      using hint = 'INSUFFICIENT_AVAILABLE_QUANTITY';
  end if;

  return v_task_material_id;
end;
$$;

grant execute on function public.reserve_item_units(uuid, uuid, numeric, uuid, boolean) to authenticated;

-- Annullering/fjernelse før færdiggørelse. Udvidet 2026-09-24 med
-- valgfri p_outcomes (samme format som afrapportering): brugeren vælger
-- slutstatus pr. mængde (Reserved/InUse afvises - RELEASE_STATUS_NOT_
-- ALLOWED), anvendt via apply_task_material_outcomes (§15.21b). Uden
-- p_outcomes anvender triggeren release_units_on_task_material_delete
-- fallback-reglen. Linjen slettes altid til sidst.
create or replace function public.release_item_units(p_task_material_id uuid, p_outcomes jsonb default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
  v_task_id uuid;
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  select task_id into v_task_id
  from public.task_materials
  where id = p_task_material_id;

  if v_task_id is null or not exists (
    select 1 from public.tasks where id = v_task_id and organisation_id = v_org_id
  ) then
    raise exception 'Materiale-linjen findes ikke i din organisation.' using hint = 'TASK_MATERIAL_NOT_FOUND';
  end if;

  if not public.has_privilege_or_admin('update_tasks') then
    raise exception 'Du har ikke rettigheder til at frigive materialer på opgaver.'
      using errcode = '42501', hint = 'NO_PRIV_RELEASE_MATERIALS';
  end if;

  if p_outcomes is not null then
    if exists (
      select 1 from jsonb_array_elements(p_outcomes) as elem
      where elem->>'status' in ('Reserved', 'InUse')
    ) then
      raise exception 'Et frigivet materiale kan ikke have status Reserveret eller I brug.'
        using hint = 'RELEASE_STATUS_NOT_ALLOWED';
    end if;

    perform public.apply_task_material_outcomes(p_task_material_id, p_outcomes);
  end if;

  -- Uden udfald anvender triggeren release_units_on_task_material_delete
  -- fallback-reglen på de stadig linkede enheder.
  delete from public.task_materials where id = p_task_material_id;
end;
$$;

grant execute on function public.release_item_units(uuid, jsonb) to authenticated;

-- 15.21b (2026-09-23): delt kerne bag afrapportering - splitter/unlinker/
-- sætter status for de linkede enheder på ÉN task_materials-linje, ud fra
-- p_outcomes (fx '[{"status":"Available","quantity":8},{"status":"Damaged",
-- "quantity":1}]' - fuldt generisk, enhver e_item_status-værdi kan bruges).
-- Ingen egne privilegie/org-tjek - kaldes kun fra betroede funktioner der
-- allerede har valideret adgang (resolve_task_material_units nedenfor, og
-- approve_task_request, §15.19, for de gemte material_outcomes).
create or replace function public.apply_task_material_outcomes(p_task_material_id uuid, p_outcomes jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outcome jsonb;
  v_status text;
  v_total_outcome numeric;
  v_total_linked numeric;
  v_unit record;
  v_remaining numeric;
  v_take numeric;
  v_unit_id uuid;
begin
  -- Lås linkede rækker (samme concurrency-beskyttelse som reservation) -
  -- forhindrer dobbelt-afrapportering ved to samtidige kald.
  perform 1 from public.data_layer_item_units
   where id in (select unit_id from public.task_material_units where task_material_id = p_task_material_id)
   for update;

  select coalesce(sum(u.quantity), 0) into v_total_linked
  from public.task_material_units tmu
  join public.data_layer_item_units u on u.id = tmu.unit_id
  where tmu.task_material_id = p_task_material_id;

  select coalesce(sum((elem->>'quantity')::numeric), 0) into v_total_outcome
  from jsonb_array_elements(p_outcomes) as elem;

  if v_total_outcome <> v_total_linked then
    raise exception 'Afrapporteringen (%) matcher ikke den reserverede mængde (%).', v_total_outcome, v_total_linked
      using hint = 'OUTCOME_QUANTITY_MISMATCH';
  end if;

  for v_outcome in select * from jsonb_array_elements(p_outcomes)
  loop
    v_status := v_outcome->>'status';

    if not exists (select 1 from unnest(enum_range(null::public.e_item_status)) s where s::text = v_status) then
      raise exception 'Ugyldig status i afrapportering: %', v_status using hint = 'INVALID_OUTCOME_STATUS';
    end if;

    v_remaining := (v_outcome->>'quantity')::numeric;

    for v_unit in
      select u.id, u.quantity
      from public.task_material_units tmu
      join public.data_layer_item_units u on u.id = tmu.unit_id
      where tmu.task_material_id = p_task_material_id
      order by u.created_at
    loop
      exit when v_remaining <= 0;

      v_take := least(v_unit.quantity, v_remaining);
      v_unit_id := public.split_unit_if_needed(v_unit.id, v_take);

      -- Link fjernes FØR status ændres - guard-triggeren ovenfor
      -- blokerer ellers statusændring på en stadig-linket enhed.
      delete from public.task_material_units
       where task_material_id = p_task_material_id and unit_id = v_unit_id;

      update public.data_layer_item_units
         set status = v_status::public.e_item_status
       where id = v_unit_id;

      v_remaining := v_remaining - v_take;
    end loop;
  end loop;
end;
$$;

grant execute on function public.apply_task_material_outcomes(uuid, jsonb) to authenticated;

-- Afrapportering, Task -> Datalager, kaldt DIREKTE (uden godkendelses-trin
-- at vente på) - kun validering + kald af den delte kerne ovenfor. Kan
-- kaldes flere gange pr. linje (delvis afrapportering over tid). Udvidet
-- 2026-09-23: krop reduceret ved udtrækning af apply_task_material_outcomes,
-- ingen ændring i ydre adfærd/signatur.
create or replace function public.resolve_task_material_units(p_task_material_id uuid, p_outcomes jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
  v_task_id uuid;
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  select task_id into v_task_id
  from public.task_materials
  where id = p_task_material_id;

  if v_task_id is null or not exists (
    select 1 from public.tasks where id = v_task_id and organisation_id = v_org_id
  ) then
    raise exception 'Materiale-linjen findes ikke i din organisation.' using hint = 'TASK_MATERIAL_NOT_FOUND';
  end if;

  if not public.has_privilege_or_admin('update_tasks') then
    raise exception 'Du har ikke rettigheder til at afrapportere materialer på opgaver.'
      using errcode = '42501', hint = 'NO_PRIV_RESOLVE_MATERIALS';
  end if;

  perform public.apply_task_material_outcomes(p_task_material_id, p_outcomes);
end;
$$;

grant execute on function public.resolve_task_material_units(uuid, jsonb) to authenticated;

-- 15.21c (2026-09-24): manuel statusændring på opgave-materiale MENS opgaven
-- er InProgress (fx 2 kg InUse -> Damaged). Ændrer kun enheder med
-- p_from_status på ÉN task_materials-linje, UDEN at aflinke - materialet
-- skal stadig afrapporteres ved færdiggørelse. Guard-triggeren omgås med
-- samme bypass-flag som set_task_status (§15.18). Hel enhed ændres direkte
-- (ingen split - split_unit_if_needed splitter ellers altid kapacitets-
-- beholdere); delmængde splittes, og den NYE split-række re-linkes til
-- samme linje (modsat apply_task_material_outcomes, §15.21b).
create or replace function public.update_task_material_status(
  p_task_material_id uuid,
  p_from_status text,
  p_quantity numeric,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
  v_task_id uuid;
  v_task_status public.e_task_status;
  v_total_linked numeric;
  v_unit record;
  v_remaining numeric;
  v_take numeric;
  v_unit_id uuid;
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Mængden skal være større end 0.' using hint = 'INVALID_QUANTITY';
  end if;

  if not exists (select 1 from unnest(enum_range(null::public.e_item_status)) s where s::text = p_status)
     or not exists (select 1 from unnest(enum_range(null::public.e_item_status)) s where s::text = p_from_status) then
    raise exception 'Ugyldig status: %', p_status using hint = 'INVALID_OUTCOME_STATUS';
  end if;

  if p_status = p_from_status then
    raise exception 'Den nye status er den samme som den nuværende.' using hint = 'STATUS_UNCHANGED';
  end if;

  select tm.task_id, t.status into v_task_id, v_task_status
  from public.task_materials tm
  join public.tasks t on t.id = tm.task_id
  where tm.id = p_task_material_id and t.organisation_id = v_org_id;

  if v_task_id is null then
    raise exception 'Materiale-linjen findes ikke i din organisation.' using hint = 'TASK_MATERIAL_NOT_FOUND';
  end if;

  if v_task_status <> 'InProgress' then
    raise exception 'Materialets status kan kun ændres, mens opgaven er i gang.' using hint = 'TASK_NOT_IN_PROGRESS';
  end if;

  if not public.has_privilege_or_admin('update_tasks') then
    raise exception 'Du har ikke rettigheder til at ændre status på et materiale.'
      using errcode = '42501', hint = 'NO_PRIV_UPDATE_MATERIAL_STATUS';
  end if;

  -- Lås linkede rækker (samme mønster som apply_task_material_outcomes).
  perform 1 from public.data_layer_item_units
   where id in (select unit_id from public.task_material_units where task_material_id = p_task_material_id)
   for update;

  select coalesce(sum(u.quantity), 0) into v_total_linked
  from public.task_material_units tmu
  join public.data_layer_item_units u on u.id = tmu.unit_id
  where tmu.task_material_id = p_task_material_id
    and u.status::text = p_from_status;

  if p_quantity > v_total_linked then
    raise exception 'Mængden (%) overstiger hvad der er tilbage med denne status på materiale-linjen (%).', p_quantity, v_total_linked
      using hint = 'QUANTITY_EXCEEDS_LINKED_QUANTITY';
  end if;

  v_remaining := p_quantity;

  for v_unit in
    select u.id, u.quantity
    from public.task_material_units tmu
    join public.data_layer_item_units u on u.id = tmu.unit_id
    where tmu.task_material_id = p_task_material_id
      and u.status::text = p_from_status
    order by u.created_at
  loop
    exit when v_remaining <= 0;

    v_take := least(v_unit.quantity, v_remaining);

    if v_take = v_unit.quantity then
      v_unit_id := v_unit.id;
    else
      v_unit_id := public.split_unit_if_needed(v_unit.id, v_take);

      -- Ny, endnu ulinket split-række (resten beholder det oprindelige
      -- link) - link DENNE til samme materiale-linje, så den forbliver
      -- sporet til opgaven; kun status ændres.
      insert into public.task_material_units (task_material_id, unit_id)
      values (p_task_material_id, v_unit_id);
    end if;

    perform set_config('ponos.bypass_unit_status_guard', 'on', true);

    update public.data_layer_item_units
       set status = p_status::public.e_item_status
     where id = v_unit_id;

    perform set_config('ponos.bypass_unit_status_guard', 'off', true);

    v_remaining := v_remaining - v_take;
  end loop;
end;
$$;

grant execute on function public.update_task_material_status(uuid, text, numeric, text) to authenticated;

-- Item + enheder atomisk. p_is_discrete=true -> N rækker à quantity=1
-- (evt. serienummer pr. række); false -> én batch-række med
-- quantity=p_quantity. Erstatter en rå to-trins insert (item, så
-- enheder), som ellers kunne efterlade et item uden enheder ved fejl.
-- Rettet 2026-09-23 (dåse/flaske): p_is_discrete er en eksplicit
-- parameter, sat af et separat "Enkeltstyk/Målt mængde"-valg i frontend-
-- formularen, uafhængigt af det frie unit_of_measurement-tekstfelt.
-- Rettet 2026-09-23 (contents_total/contents_remaining, §9a): en
-- tidligere "delt pakke"-model (data_layer_item_packs/pack_id, nu
-- fjernet igen) modellerede det forkerte forhold - flere enheder delte
-- én pulje. p_contents_total (nullable) giver nu HVER af de p_quantity
-- oprettede enheder sit EGET contents_total/contents_remaining - fx 5
-- selvstændige 12-pack-enheder, hver startende for sig selv på 12/12.
-- Udvidet 2026-09-23 (docs/migrations/README.md, 2026-09-23-
-- configurable-contents-status.sql): tre nye, valgfrie parametre sætter
-- enhedens egne contents_empty_status/contents_partial_status/
-- contents_full_status (§9a/sync_status_from_contents, §15.21) - text,
-- castet til e_item_status internt, tom streng/null = ingen automatisk
-- ændring ved den tærskel.
-- Udvidet igen 2026-09-23 (docs/migrations/README.md, 2026-09-23-
-- measured-item-capacity-status.sql): den ikke-diskrete (Målt mængde)
-- gren sætter nu også p_contents_total (som KAPACITET, fx en tank) og de
-- tre status-parametre på batch-rækken - contents_remaining sættes IKKE,
-- niveauet er quantity selv, så en opgave kan tappe/påfylde en delmængde
-- (§15.21, reserve_item_units) i modsætning til Enkeltstyk-grenen ovenfor.
-- Rettet igen 2026-09-23 (docs/migrations/README.md, 2026-09-23-measured-
-- container-count.sql): p_quantity blev fejlagtigt brugt DIREKTE som
-- niveauet på den ene batch-række der blev oprettet ved kapacitets-sporing
-- - en "1 tønde à 200L" endte som "1 liter, 1/200 tilbage". Rettet: når
-- p_contents_total er sat betyder p_quantity nu ANTAL BEHOLDERE (som
-- Enkeltstyk-grenen) - hver får sin EGEN række med kapacitet + startniveau
-- (nyt, nullable p_contents_start - null = start fuld, = p_contents_total).
-- Ordinær pooled Målt mængde (intet kapacitets-total) er uændret: ÉN
-- række med quantity=p_quantity.
-- Udvidet 2026-09-23 (docs/migrations/README.md, 2026-09-23-amount-per-
-- unit.sql), SAMME DAG rullet tilbage igen (docs/migrations/README.md,
-- 2026-09-23-package-size-replaces-amount-per-unit.sql): p_amount_per_unit/
-- p_amount_unit (vægt pr. Enkelt enhed) virkede kun for tællelige varer.
-- Erstattet af ét p_package_size-parameter (kun for Mængde, se package_size
-- ovenfor) - sættes på data_layer_items-rækken (item-egenskab, sættes ÉN
-- gang ved oprettelse - ikke pr. enhed).
-- Rettet 2026-09-23 (docs/migrations/README.md, 2026-09-23-package-count-
-- separate-units.sql): "Antal emballager" gangede fejlagtigt ind i ÉT
-- pooled Mængde-tal - rettet til at oprette N separate rækker (én pr.
-- emballage), se p_package_size-grenen nedenfor. Ingen signaturændring.
create or replace function public.add_item_with_units(
  p_category_id uuid,
  p_location_id uuid,
  p_name text,
  p_description text,
  p_packaging text,
  p_unit_of_measurement text,
  p_quantity numeric,
  p_status text,
  p_serial_numbers text[],
  p_is_discrete boolean,
  p_contents_total numeric,
  p_contents_empty_status text,
  p_contents_partial_status text,
  p_contents_full_status text,
  p_contents_start numeric,
  p_package_size numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_item_id uuid;
  v_unit_of_measurement text := coalesce(nullif(trim(p_unit_of_measurement), ''), 'stk');
  v_i int;
begin
  select organisation_id into v_org_id
  from public.data_layer_categories
  where id = p_category_id;

  if v_org_id is null or v_org_id <> public.auth_profile_org() then
    raise exception 'Kategorien findes ikke i din organisation.' using hint = 'CATEGORY_NOT_FOUND';
  end if;

  if not public.has_privilege_or_admin('create_datalayer') then
    raise exception 'Du har ikke rettigheder til at oprette items.'
      using errcode = '42501', hint = 'NO_PRIV_CREATE_DATALAYER';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Antal skal være større end 0.' using hint = 'INVALID_QUANTITY';
  end if;

  insert into public.data_layer_items
    (organisation_id, category_id, location_id, name, description, packaging, unit_of_measurement,
     package_size)
  values
    (v_org_id, p_category_id, p_location_id, p_name, p_description, p_packaging, v_unit_of_measurement,
     p_package_size)
  returning id into v_item_id;

  if p_is_discrete then
    for v_i in 1..p_quantity::int loop
      insert into public.data_layer_item_units
        (organisation_id, item_id, location_id, serial_number, quantity, status,
         contents_total, contents_remaining,
         contents_empty_status, contents_partial_status, contents_full_status)
      values
        (v_org_id, v_item_id, p_location_id,
         case when p_serial_numbers is not null and array_length(p_serial_numbers, 1) >= v_i
              then nullif(trim(p_serial_numbers[v_i]), '') else null end,
         1, coalesce(p_status, 'Available')::public.e_item_status,
         p_contents_total, p_contents_total,
         nullif(p_contents_empty_status, '')::public.e_item_status,
         nullif(p_contents_partial_status, '')::public.e_item_status,
         nullif(p_contents_full_status, '')::public.e_item_status);
    end loop;
  elsif p_contents_total is not null then
    -- Målt mængde + kapacitet (fx en tank): p_quantity er ANTAL BEHOLDERE,
    -- hver får sin egen række med kapacitet + startniveau (default fuld).
    for v_i in 1..p_quantity::int loop
      insert into public.data_layer_item_units
        (organisation_id, item_id, location_id, quantity, status,
         contents_total,
         contents_empty_status, contents_partial_status, contents_full_status)
      values
        (v_org_id, v_item_id, p_location_id,
         coalesce(p_contents_start, p_contents_total),
         coalesce(p_status, 'Available')::public.e_item_status,
         p_contents_total,
         nullif(p_contents_empty_status, '')::public.e_item_status,
         nullif(p_contents_partial_status, '')::public.e_item_status,
         nullif(p_contents_full_status, '')::public.e_item_status);
    end loop;
  elsif p_package_size is not null then
    -- Rettet 2026-09-23 (docs/migrations/README.md, 2026-09-23-package-
    -- count-separate-units.sql): Mængde + pakke-faktor (fx "1 big bag =
    -- 500 kg") - p_quantity er ANTAL EMBALLAGER, hver får sin egen række
    -- med quantity = p_package_size (ikke ét pooled tal, samme mønster
    -- som Beholder-grenen ovenfor).
    for v_i in 1..p_quantity::int loop
      insert into public.data_layer_item_units
        (organisation_id, item_id, location_id, quantity, status)
      values
        (v_org_id, v_item_id, p_location_id, p_package_size, coalesce(p_status, 'Available')::public.e_item_status);
    end loop;
  else
    -- Ordinær pooled Målt mængde (ingen kapacitets-sporing/pakke-faktor):
    -- uændret, ÉN række med quantity=p_quantity (fx "150 kg jernplader").
    insert into public.data_layer_item_units
      (organisation_id, item_id, location_id, quantity, status)
    values
      (v_org_id, v_item_id, p_location_id, p_quantity, coalesce(p_status, 'Available')::public.e_item_status);
  end if;

  return v_item_id;
end;
$$;

grant execute on function public.add_item_with_units(uuid, uuid, text, text, text, text, numeric, text, text[], boolean, numeric, text, text, text, numeric, numeric) to authenticated;

-- Kaldes fra set_task_status (§15.18) og approve_task_request (§15.19)
-- før en opgave må blive Completed. Org-scoped defensivt (selvom kun
-- kaldet internt fra allerede org-validerede RPC'er).
create or replace function public.assert_task_materials_resolved(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
  v_unresolved text;
begin
  if not exists (select 1 from public.tasks where id = p_task_id and organisation_id = v_org_id) then
    raise exception 'Opgaven findes ikke i din organisation.' using hint = 'TASK_NOT_FOUND';
  end if;

  select string_agg(coalesce(di.name, tm.item_id::text), ', ')
    into v_unresolved
  from public.task_materials tm
  join public.data_layer_items di on di.id = tm.item_id
  where tm.task_id = p_task_id
    and exists (
      select 1 from public.task_material_units tmu where tmu.task_material_id = tm.id
    );

  if v_unresolved is not null then
    raise exception 'Alle materialer skal afrapporteres, før opgaven kan færdiggøres.'
      using hint = 'MATERIALS_NOT_RESOLVED', detail = v_unresolved;
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 15.21d (2026-09-29): LAGERHISTORIK - trigger på data_layer_item_units
-- Logger status-perioder i data_layer_item_unit_history (§9b) ved insert,
-- update af status/item_id/organisation_id/location_id (2026-09-30) og
-- delete - fanger alle flows
-- (oprettelse, reservation, afrapportering, split, cascade-sletning).
-- Kvantitetsændringer logges ikke (statistikken tæller enhedsrækker).
-- ---------------------------------------------------------------------
create or replace function public.record_item_unit_history()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'UPDATE'
     and new.status is not distinct from old.status
     and new.item_id is not distinct from old.item_id
     and new.organisation_id is not distinct from old.organisation_id
     and new.location_id is not distinct from old.location_id then
    return new;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    update public.data_layer_item_unit_history
    set valid_to = now()
    where unit_id = old.id and valid_to is null;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    insert into public.data_layer_item_unit_history (organisation_id, unit_id, item_id, status, location_id, valid_from)
    values (new.organisation_id, new.id, new.item_id, new.status, new.location_id, now());
  end if;

  return coalesce(new, old);
end;
$$;

revoke execute on function public.record_item_unit_history() from public, anon, authenticated;

create trigger trg_record_item_unit_history
  after insert or update of status, item_id, organisation_id, location_id or delete
  on public.data_layer_item_units
  for each row execute function public.record_item_unit_history();


-- ---------------------------------------------------------------------
-- 15.22 (2026-09-25): ROLLE-BEGRÆNSEDE OPGAVERUM
-- can_access_task_room: true hvis rummet er null, kalderen har
-- view_all_task_rooms/admin, rummet ingen roller har, eller kalderens
-- rolle i den aktive org er blandt rummets roller. is_task_assignee:
-- tilmeldte ser altid egne opgaver. Begge security definer, så tasks-
-- policyen ikke rekursivt rammer task_assignees' policy (som slår op i
-- tasks). create_task_room/update_task_room er eneste skrivevej til
-- task_room_roles (kun select-policy, §16.7b).
-- ---------------------------------------------------------------------
create or replace function public.can_access_task_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_room_id is null
    or public.has_privilege_or_admin('view_all_task_rooms')
    or not exists (select 1 from public.task_room_roles where room_id = p_room_id)
    or exists (
      select 1
      from public.task_room_roles trr
      join public.memberships m on m.role_id = trr.role_id
      join public.profiles pr on pr.id = m.user_id and pr.active_organisation_id = m.organisation_id
      where trr.room_id = p_room_id and pr.id = auth.uid()
    );
$$;

create or replace function public.is_task_assignee(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.task_assignees where task_id = p_task_id and user_id = auth.uid()
  );
$$;

grant execute on function public.can_access_task_room(uuid) to authenticated;
grant execute on function public.is_task_assignee(uuid) to authenticated;

create or replace function public.create_task_room(p_name text, p_role_ids uuid[])
returns public.task_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  uuid := public.auth_profile_org();
  v_room public.task_rooms;
begin
  if v_org is null or not public.has_privilege_or_admin('create_tasks') then
    raise exception 'Du har ikke rettigheder til at oprette rum.' using errcode = '42501';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Rummet skal have et navn.';
  end if;

  if exists (
    select 1 from unnest(coalesce(p_role_ids, '{}')) r(id)
    where not exists (select 1 from public.roles where id = r.id and organisation_id = v_org)
  ) then
    raise exception 'En eller flere roller tilhører ikke organisationen.';
  end if;

  insert into public.task_rooms (organisation_id, name)
  values (v_org, trim(p_name))
  returning * into v_room;

  insert into public.task_room_roles (room_id, role_id)
  select distinct v_room.id, r.id from unnest(coalesce(p_role_ids, '{}')) r(id);

  -- §15.24: opret/genåbn/luk rummets chat.
  perform public.sync_room_conversation(v_room.id);

  return v_room;
end;
$$;

create or replace function public.update_task_room(p_room_id uuid, p_name text, p_role_ids uuid[])
returns public.task_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  uuid := public.auth_profile_org();
  v_room public.task_rooms;
begin
  if v_org is null
    or not public.has_privilege_or_admin('update_tasks')
    or not public.can_access_task_room(p_room_id)
    or not exists (select 1 from public.task_rooms where id = p_room_id and organisation_id = v_org)
  then
    raise exception 'Du har ikke rettigheder til at redigere rummet.' using errcode = '42501';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Rummet skal have et navn.';
  end if;

  if exists (
    select 1 from unnest(coalesce(p_role_ids, '{}')) r(id)
    where not exists (select 1 from public.roles where id = r.id and organisation_id = v_org)
  ) then
    raise exception 'En eller flere roller tilhører ikke organisationen.';
  end if;

  update public.task_rooms set name = trim(p_name)
  where id = p_room_id
  returning * into v_room;

  delete from public.task_room_roles where room_id = p_room_id;

  insert into public.task_room_roles (room_id, role_id)
  select distinct p_room_id, r.id from unnest(coalesce(p_role_ids, '{}')) r(id);

  -- §15.24: opret/genåbn/luk rummets chat.
  perform public.sync_room_conversation(p_room_id);

  return v_room;
end;
$$;

grant execute on function public.create_task_room(text, uuid[]) to authenticated;
grant execute on function public.update_task_room(uuid, text, uuid[]) to authenticated;


-- ---------------------------------------------------------------------
-- 15.23 (2026-09-25): HURTIG ROLLE-OPRETTELSE MED PRIVILEGIER
-- Bruges af QuickCreateRoleModal.tsx (opret/rediger rum). Opretter rolle
-- + privilegier atomisk. Kræver kun create_roles - en almindelig insert i
-- privileges kræver update_roles (§16.4). Eskalerings-guard: man kan kun
-- give privilegier, man selv har (admin: alle), og aldrig 'admin'.
-- Dublet-navn giver 23505 via unique (organisation_id, name).
-- ---------------------------------------------------------------------
create or replace function public.create_role_with_privileges(p_name text, p_privilege_names text[])
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org     uuid := public.auth_profile_org();
  v_role_id uuid;
  v_name    text := trim(coalesce(p_name, ''));
  v_priv    text;
begin
  if v_org is null or not public.has_privilege_or_admin('create_roles') then
    raise exception 'Du har ikke rettigheder til at oprette roller.'
      using errcode = '42501', hint = 'NO_PRIV_CREATE_ROLES';
  end if;

  if v_name = '' then
    raise exception 'Rollen skal have et navn.' using hint = 'ROLE_NAME_REQUIRED';
  end if;

  foreach v_priv in array coalesce(p_privilege_names, '{}') loop
    if v_priv = 'admin' or not (public.has_privilege('admin') or public.has_privilege(v_priv)) then
      raise exception 'Du kan kun give privilegier, du selv har.'
        using errcode = '42501', hint = 'NO_PRIV_GRANT_PRIVILEGE';
    end if;
  end loop;

  -- Unik (organisation_id, name) giver 23505 ved dublet - mappes i roleApi.ts.
  insert into public.roles (organisation_id, name)
  values (v_org, v_name)
  returning roles.id into v_role_id;

  insert into public.privileges (role_id, name)
  select distinct v_role_id, p from unnest(coalesce(p_privilege_names, '{}')) p;

  return query select v_role_id, v_name;
end;
$$;

grant execute on function public.create_role_with_privileges(text, text[]) to authenticated;


-- ---------------------------------------------------------------------
-- 15.24 (2026-09-27): OPGAVE- OG RUM-CHATS (ad-hoc, Studerende 3's domæne)
-- Auto-beskedgrupper: opgave med >= 2 tilmeldte, og rolle-låste rum.
-- conversations.task_id/room_id kobler samtalen; closed_at gør hele
-- chatten skrivebeskyttet (rum gjort åbent); completion_choice er den
-- enkelte deltagers valg efter afsluttet opgave ('close' = kun læsning for
-- vedkommende). Systembeskedernes tekst er faste danske sentinels, som
-- frontend oversætter i src/utils/systemMessageDisplay.ts.
-- Beskedtabellerne selv er stadig udokumenterede (se KENDT DRIFT øverst);
-- her står kun det, denne ændring rørte - inkl. de fulde, nuværende
-- definitioner af edit_message, notify_new_message, gruppe-RPC'erne og
-- get_my_conversations. RLS-policies for samtaler/beskeder står også her,
-- ikke i §16, fordi resten af beskedernes policies heller ikke står dér.
-- Kørt 2026-09-27 (docs/migrations/2026-09-27-task-room-conversations.sql,
-- inkl. et engangs-backfill for eksisterende rolle-låste rum og ikke-
-- afsluttede opgaver med >= 2 tilmeldte).
-- Opfølgning 2026-09-27 (2026-09-27-task-chat-archive-when-all-closed.sql):
-- en opgave-chat arkiveres (archived_at), når ALLE deltagere har valgt
-- 'close', og skjules i get_my_conversations; af-arkiveres når en deltager
-- ikke har valgt 'close' (genåbnet opgave nulstiller valg, ny tilmeldt).
-- Styres af sync_task_conversation_archive. Beskederne bevares.
-- Opfølgning 2026-09-27 (2026-09-27-system-chat-leave.sql): opgave-/rum-
-- chats kan forlades (leave_group_conversation); fravalget huskes i
-- conversation_opt_outs. Genindtræden via Chat-knap (join_task_conversation /
-- get_or_join_room_conversation). Tilføj/fjern/omdøb er stadig låst.
-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------
-- 1. Kolonner
-- ---------------------------------------------------------------------
alter table public.conversations
  add column task_id uuid unique references public.tasks(id) on delete cascade,
  add column room_id uuid unique references public.task_rooms(id) on delete cascade,
  add column closed_at timestamptz,
  add constraint conversations_single_source_check check (num_nonnulls(task_id, room_id) <= 1),
  add constraint conversations_system_is_group_check check ((task_id is null and room_id is null) or is_group);

alter table public.conversation_participants
  add column completion_choice text
    constraint conversation_participants_completion_choice_check check (completion_choice in ('keep', 'close'));

-- Brugere, der selv har forladt en opgave-/rum-chat. sync_task_conversation/
-- sync_room_conversation springer dem over; fravalget slettes ved
-- genindtræden (join_task_conversation/get_or_join_room_conversation), ved
-- afmelding af opgaven og ved mistet rum-adgang.
create table public.conversation_opt_outs (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- Kun security definer-funktionerne rører tabellen.
alter table public.conversation_opt_outs enable row level security;

-- ---------------------------------------------------------------------
-- 2. Hjælpefunktioner
-- ---------------------------------------------------------------------

-- Har en given bruger (ikke nødvendigvis auth.uid()) adgang til rummet?
-- Spejler can_access_task_room, men pr. bruger og uafhængigt af aktiv org.
create or replace function public.member_can_access_room(p_user_id uuid, p_room_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.task_rooms r
    join public.memberships m on m.organisation_id = r.organisation_id and m.user_id = p_user_id
    where r.id = p_room_id
      and m.role_id is not null
      and (
        public.role_has_privilege(m.role_id, 'admin')
        or (
          public.role_has_privilege(m.role_id, 'read_tasks')
          and (
            public.role_has_privilege(m.role_id, 'view_all_task_rooms')
            or not exists (select 1 from public.task_room_roles trr where trr.room_id = r.id)
            or exists (select 1 from public.task_room_roles trr where trr.room_id = r.id and trr.role_id = m.role_id)
          )
        )
      )
  );
$function$;

-- RLS-hjælper (læs): rum-chats kræver rum-adgang. Andre samtaler: true.
create or replace function public.conversation_room_access_ok(p_conversation_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select coalesce((
    select c.room_id is null or public.can_access_task_room(c.room_id)
    from public.conversations c
    where c.id = p_conversation_id
  ), true);
$function$;

-- RLS-hjælper (skriv): kalderen er deltager, chatten er ikke lukket, kalderen
-- har ikke selv lukket den, og for rum-chats: rummet er stadig rolle-låst og
-- kalderen har adgang.
create or replace function public.can_write_conversation(p_conversation_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.conversations c
    join public.conversation_participants cp
      on cp.conversation_id = c.id and cp.user_id = auth.uid()
    where c.id = p_conversation_id
      and c.closed_at is null
      and cp.completion_choice is distinct from 'close'
      and (
        c.room_id is null
        or (
          public.can_access_task_room(c.room_id)
          and exists (select 1 from public.task_room_roles trr where trr.room_id = c.room_id)
        )
      )
  );
$function$;

-- ---------------------------------------------------------------------
-- 3. Opgave-chat
-- ---------------------------------------------------------------------
-- Opgave-chat er arkiveret, netop når den har deltagere og ALLE har valgt
-- 'close'. Ingen deltagere: røres ikke (archive_empty_group_conversation).
create or replace function public.sync_task_conversation_archive(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from public.conversation_participants where conversation_id = p_conversation_id
  ) then
    return;
  end if;

  if not exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id
      and completion_choice is distinct from 'close'
  ) then
    update public.conversations
       set archived_at = coalesce(archived_at, now()),
           archived_by = coalesce(archived_by, auth.uid())
     where id = p_conversation_id
       and task_id is not null;
  else
    update public.conversations
       set archived_at = null, archived_by = null
     where id = p_conversation_id
       and task_id is not null
       and archived_at is not null;
  end if;
end;
$function$;

revoke execute on function public.sync_task_conversation_archive(uuid) from public, anon, authenticated;

create or replace function public.sync_task_conversation(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_task public.tasks;
  v_conversation_id uuid;
  v_actor uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('task_conversation:' || p_task_id::text, 0));

  select * into v_task from public.tasks where id = p_task_id;
  if v_task.id is null then
    return; -- opgaven slettes (cascade) - chatten følger med via FK.
  end if;

  select id into v_conversation_id from public.conversations where task_id = p_task_id;

  if v_conversation_id is null then
    if (select count(*) from public.task_assignees where task_id = p_task_id) < 2 then
      return;
    end if;

    v_actor := coalesce(
      auth.uid(),
      (select user_id from public.task_assignees where task_id = p_task_id order by assigned_at limit 1)
    );

    insert into public.conversations (organisation_id, is_group, name, created_by, task_id)
    values (v_task.organisation_id, true, v_task.title, v_actor, p_task_id)
    returning id into v_conversation_id;

    -- Beskeden indsættes før deltagerne, så ingen får notifikation for den.
    insert into public.messages (conversation_id, sender_id, content, message_type)
    values (v_conversation_id, v_actor, 'Gruppe oprettet for opgaven', 'system');
  end if;

  -- Tilmeldte, undtagen dem der selv har forladt chatten.
  insert into public.conversation_participants (conversation_id, user_id)
  select v_conversation_id, ta.user_id
  from public.task_assignees ta
  where ta.task_id = p_task_id
    and not exists (
      select 1 from public.conversation_opt_outs o
      where o.conversation_id = v_conversation_id and o.user_id = ta.user_id
    )
  on conflict (conversation_id, user_id) do nothing;

  delete from public.conversation_participants cp
  where cp.conversation_id = v_conversation_id
    and not exists (
      select 1 from public.task_assignees ta
      where ta.task_id = p_task_id and ta.user_id = cp.user_id
    );

  -- Afmeldt opgaven: fravalget glemmes, så en ny tilmelding melder ind igen.
  delete from public.conversation_opt_outs o
  where o.conversation_id = v_conversation_id
    and not exists (
      select 1 from public.task_assignees ta
      where ta.task_id = p_task_id and ta.user_id = o.user_id
    );

  -- Arkivering følger deltagernes valg (alle 'close' = arkiveret).
  perform public.sync_task_conversation_archive(v_conversation_id);
end;
$function$;

create or replace function public.sync_task_conversation_on_assignee_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.sync_task_conversation(old.task_id);
  else
    perform public.sync_task_conversation(new.task_id);
  end if;
  return null;
end;
$function$;

create trigger trg_sync_task_conversation
  after insert or delete on public.task_assignees
  for each row execute function public.sync_task_conversation_on_assignee_change();

create or replace function public.handle_task_conversation_changes()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_conversation_id uuid;
  v_created_by uuid;
  v_actor uuid;
begin
  select id, created_by into v_conversation_id, v_created_by
  from public.conversations
  where task_id = new.id;

  if v_conversation_id is null then
    return new;
  end if;

  v_actor := coalesce(auth.uid(), v_created_by);

  if new.title is distinct from old.title then
    update public.conversations set name = new.title where id = v_conversation_id;
  end if;

  if new.status = 'Completed' and old.status is distinct from 'Completed' then
    insert into public.messages (conversation_id, sender_id, content, message_type)
    values (v_conversation_id, v_actor, 'Opgaven er afsluttet', 'system');
  elsif old.status = 'Completed' and new.status is distinct from 'Completed' then
    update public.conversation_participants
       set completion_choice = null
     where conversation_id = v_conversation_id;

    -- Valgene er nulstillet -> chatten af-arkiveres og dukker op igen.
    perform public.sync_task_conversation_archive(v_conversation_id);

    insert into public.messages (conversation_id, sender_id, content, message_type)
    values (v_conversation_id, v_actor, 'Opgaven er genåbnet', 'system');
  end if;

  return new;
end;
$function$;

create trigger trg_task_conversation_changes
  after update of title, status on public.tasks
  for each row execute function public.handle_task_conversation_changes();

create or replace function public.set_task_chat_choice(p_conversation_id uuid, p_choice text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_task_id uuid;
  v_task_status public.e_task_status;
begin
  if auth.uid() is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;

  if p_choice is null or p_choice not in ('keep', 'close') then
    raise exception 'Ugyldigt valg.' using hint = 'INVALID_CHAT_CHOICE';
  end if;

  select c.task_id, t.status into v_task_id, v_task_status
  from public.conversations c
  left join public.tasks t on t.id = c.task_id
  where c.id = p_conversation_id;

  if v_task_id is null then
    raise exception 'Samtalen er ikke en opgave-chat.' using hint = 'NOT_TASK_CHAT';
  end if;

  if not public.is_conversation_participant(p_conversation_id, auth.uid()) then
    raise exception 'Du er ikke deltager i denne samtale.' using hint = 'NOT_CONVERSATION_PARTICIPANT';
  end if;

  if v_task_status is distinct from 'Completed' then
    raise exception 'Du kan først vælge, når opgaven er afsluttet.' using hint = 'TASK_NOT_COMPLETED';
  end if;

  update public.conversation_participants
     set completion_choice = p_choice
   where conversation_id = p_conversation_id
     and user_id = auth.uid();

  perform public.sync_task_conversation_archive(p_conversation_id);
end;
$function$;

-- ---------------------------------------------------------------------
-- 4. Rum-chat
-- ---------------------------------------------------------------------
create or replace function public.sync_room_conversation(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_room public.task_rooms;
  v_conversation_id uuid;
  v_closed_at timestamptz;
  v_created_by uuid;
  v_actor uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('room_conversation:' || p_room_id::text, 0));

  select * into v_room from public.task_rooms where id = p_room_id;
  if v_room.id is null then
    return;
  end if;

  select id, closed_at, created_by into v_conversation_id, v_closed_at, v_created_by
  from public.conversations
  where room_id = p_room_id;

  -- Åbent rum (ingen roller): ingen chat; en eksisterende bliver skrivebeskyttet.
  if not exists (select 1 from public.task_room_roles where room_id = p_room_id) then
    if v_conversation_id is not null and v_closed_at is null then
      update public.conversations set closed_at = now() where id = v_conversation_id;

      insert into public.messages (conversation_id, sender_id, content, message_type)
      values (v_conversation_id, coalesce(auth.uid(), v_created_by),
              'Rummet er ikke længere rolle-låst - chatten er lukket', 'system');
    end if;
    return;
  end if;

  if v_conversation_id is null then
    v_actor := coalesce(
      auth.uid(),
      (select m.user_id
       from public.memberships m
       join public.task_room_roles trr on trr.role_id = m.role_id
       where trr.room_id = p_room_id and m.organisation_id = v_room.organisation_id
       order by m.created_at
       limit 1)
    );

    if v_actor is null then
      return; -- ingen at oprette chatten for endnu.
    end if;

    insert into public.conversations (organisation_id, is_group, name, created_by, room_id)
    values (v_room.organisation_id, true, v_room.name, v_actor, p_room_id)
    returning id into v_conversation_id;

    insert into public.messages (conversation_id, sender_id, content, message_type)
    values (v_conversation_id, v_actor, 'Gruppe oprettet for rummet', 'system');
  else
    v_actor := coalesce(auth.uid(), v_created_by);

    if v_closed_at is not null then
      update public.conversations set closed_at = null where id = v_conversation_id;

      insert into public.messages (conversation_id, sender_id, content, message_type)
      values (v_conversation_id, v_actor, 'Rummet er rolle-låst igen - chatten er genåbnet', 'system');
    end if;

    update public.conversations
       set name = v_room.name
     where id = v_conversation_id
       and name is distinct from v_room.name;
  end if;

  -- Medlemmer med en af rummets roller, undtagen dem der selv har forladt
  -- chatten. Admins/view_all_task_rooms tilføjes ikke automatisk, men kan
  -- selv melde sig ind (get_or_join_room_conversation) og fjernes ikke
  -- herunder, da de stadig har adgang.
  insert into public.conversation_participants (conversation_id, user_id)
  select distinct v_conversation_id, m.user_id
  from public.memberships m
  join public.task_room_roles trr on trr.role_id = m.role_id
  where trr.room_id = p_room_id
    and m.organisation_id = v_room.organisation_id
    and (public.role_has_privilege(m.role_id, 'read_tasks') or public.role_has_privilege(m.role_id, 'admin'))
    and not exists (
      select 1 from public.conversation_opt_outs o
      where o.conversation_id = v_conversation_id and o.user_id = m.user_id
    )
  on conflict (conversation_id, user_id) do nothing;

  delete from public.conversation_participants cp
  where cp.conversation_id = v_conversation_id
    and not public.member_can_access_room(cp.user_id, p_room_id);

  -- Mistet rum-adgang: fravalget glemmes, så ny adgang melder ind igen.
  delete from public.conversation_opt_outs o
  where o.conversation_id = v_conversation_id
    and not public.member_can_access_room(o.user_id, p_room_id);

  update public.conversations c
     set archived_at = null, archived_by = null
   where c.id = v_conversation_id
     and c.archived_at is not null
     and exists (select 1 from public.conversation_participants cp where cp.conversation_id = c.id);
end;
$function$;

create or replace function public.get_or_join_room_conversation(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid := public.auth_profile_org();
  v_conversation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;

  if v_org is null
     or not public.has_privilege_or_admin('read_tasks')
     or not exists (select 1 from public.task_rooms where id = p_room_id and organisation_id = v_org)
     or not public.can_access_task_room(p_room_id)
  then
    raise exception 'Rummet findes ikke, eller du har ikke adgang til det.' using hint = 'ROOM_NOT_ACCESSIBLE';
  end if;

  if not exists (select 1 from public.task_room_roles where room_id = p_room_id) then
    raise exception 'Rummet er ikke rolle-låst og har ingen chat.' using hint = 'ROOM_NOT_ROLE_LOCKED';
  end if;

  select id into v_conversation_id from public.conversations where room_id = p_room_id;

  if v_conversation_id is null then
    perform public.sync_room_conversation(p_room_id);
    select id into v_conversation_id from public.conversations where room_id = p_room_id;
  end if;

  delete from public.conversation_opt_outs
  where conversation_id = v_conversation_id
    and user_id = auth.uid();

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conversation_id, auth.uid())
  on conflict (conversation_id, user_id) do nothing;

  update public.conversations
     set archived_at = null, archived_by = null
   where id = v_conversation_id and archived_at is not null;

  return v_conversation_id;
end;
$function$;

-- Tilmeldt bruger melder sig (ind) igen via Chat-knappen på opgavekortet.
create or replace function public.join_task_conversation(p_task_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid := public.auth_profile_org();
  v_conversation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;

  if v_org is null
     or not exists (
       select 1
       from public.tasks t
       join public.task_assignees ta on ta.task_id = t.id and ta.user_id = auth.uid()
       where t.id = p_task_id and t.organisation_id = v_org
     )
  then
    raise exception 'Opgave-chatten er ikke tilgængelig for dig.' using hint = 'TASK_CHAT_NOT_AVAILABLE';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('task_conversation:' || p_task_id::text, 0));

  select id into v_conversation_id from public.conversations where task_id = p_task_id;

  if v_conversation_id is null then
    perform public.sync_task_conversation(p_task_id);
    select id into v_conversation_id from public.conversations where task_id = p_task_id;

    if v_conversation_id is null then
      raise exception 'Opgave-chatten er ikke tilgængelig for dig.' using hint = 'TASK_CHAT_NOT_AVAILABLE';
    end if;
  end if;

  delete from public.conversation_opt_outs
  where conversation_id = v_conversation_id
    and user_id = auth.uid();

  -- Stadig deltager, men chatten er arkiveret (alle lukkede): Chat-klik
  -- fortryder mit 'close', så den dukker op igen.
  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conversation_id, auth.uid())
  on conflict (conversation_id, user_id) do update
    set completion_choice = null
    where conversation_participants.completion_choice = 'close';

  perform public.sync_task_conversation_archive(v_conversation_id);

  return v_conversation_id;
end;
$function$;

revoke execute on function public.join_task_conversation(uuid) from public, anon;
grant execute on function public.join_task_conversation(uuid) to authenticated;

-- create_task_room / update_task_room kalder sync_room_conversation - se §15.22.

-- Interne funktioner (ingen egne adgangstjek) må ikke kaldes som RPC.
revoke execute on function public.sync_task_conversation(uuid) from public, anon, authenticated;
revoke execute on function public.sync_room_conversation(uuid) from public, anon, authenticated;
revoke execute on function public.member_can_access_room(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.sync_task_conversation_on_assignee_change() from public, anon, authenticated;
revoke execute on function public.handle_task_conversation_changes() from public, anon, authenticated;
revoke execute on function public.set_task_chat_choice(uuid, text) from public, anon;
revoke execute on function public.get_or_join_room_conversation(uuid) from public, anon;
grant execute on function public.set_task_chat_choice(uuid, text) to authenticated;
grant execute on function public.get_or_join_room_conversation(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. RLS (restriktive - AND'es med de eksisterende permissive policies)
-- ---------------------------------------------------------------------
create policy "Rum-chat kræver rum-adgang (samtaler)"
  on public.conversations
  as restrictive
  for select
  to authenticated
  using (room_id is null or public.can_access_task_room(room_id));

create policy "Rum-chat kræver rum-adgang (beskeder)"
  on public.messages
  as restrictive
  for select
  to authenticated
  using (public.conversation_room_access_ok(conversation_id));

create policy "Kun skriv i åbne samtaler"
  on public.messages
  as restrictive
  for insert
  to authenticated
  with check (public.can_write_conversation(conversation_id));

-- edit_message: uændret bortset fra can_write_conversation-tjekket.
create or replace function public.edit_message(p_message_id uuid, p_content text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid := auth.uid();
  v_conversation_id uuid;
  v_sender_id uuid;
  v_deleted_at timestamptz;
  v_created_at timestamptz;
  v_latest_message_id uuid;
  v_trimmed text := btrim(p_content);
begin
  if v_caller_id is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;

  if v_trimmed = '' then
    raise exception 'Beskeden kan ikke være tom.' using hint = 'MESSAGE_EMPTY';
  end if;

  select conversation_id, sender_id, deleted_at, created_at
    into v_conversation_id, v_sender_id, v_deleted_at, v_created_at
  from public.messages
  where id = p_message_id;

  if v_conversation_id is null then
    raise exception 'Beskeden findes ikke.' using hint = 'MESSAGE_NOT_FOUND';
  end if;

  if v_sender_id is distinct from v_caller_id then
    raise exception 'Du kan kun redigere dine egne beskeder.' using hint = 'CAN_ONLY_EDIT_OWN_MESSAGES';
  end if;

  if v_deleted_at is not null then
    raise exception 'Denne besked er slettet.' using hint = 'MESSAGE_DELETED';
  end if;

  if not public.can_write_conversation(v_conversation_id) then
    raise exception 'Chatten er lukket - kun læsning.' using hint = 'CONVERSATION_CLOSED';
  end if;

  select id into v_latest_message_id
  from public.messages
  where conversation_id = v_conversation_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  if v_latest_message_id is distinct from p_message_id then
    raise exception 'Kun den seneste besked i samtalen kan redigeres.' using hint = 'ONLY_LAST_MESSAGE_EDITABLE';
  end if;

  update public.messages
    set content = v_trimmed,
        edited_at = now()
    where id = p_message_id;

  update public.notifications
    set body = left(v_trimmed, 140)
    where type = 'message'
      and reference_id = v_conversation_id
      and created_at = v_created_at;
end;
$function$;

-- ---------------------------------------------------------------------
-- 6. Notifikationer
-- ---------------------------------------------------------------------
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sender_name text;
  v_task_id uuid;
  v_room_id uuid;
begin
  select task_id, room_id
    into v_task_id, v_room_id
  from conversations
  where id = new.conversation_id;

  -- System-chats: kun "Opgaven er afsluttet" giver notifikation, fordi den
  -- beder deltagerne om at vælge Hold aktiv / Luk chat.
  if new.message_type = 'system'
     and (v_task_id is not null or v_room_id is not null)
     and new.content <> 'Opgaven er afsluttet' then
    return new;
  end if;

  select concat_ws(' ', first_name, last_name)
    into v_sender_name
  from profiles
  where id = new.sender_id;

  insert into notifications (user_id, organisation_id, type, title, body, link, reference_id)
  select
    cp.user_id,
    c.organisation_id,
    'message',
    case when c.is_group then coalesce(c.name, 'Gruppe') else coalesce(v_sender_name, 'Ny besked') end,
    left(new.content, 140),
    '/beskeder?conversation=' || new.conversation_id,
    new.conversation_id
  from conversation_participants cp
  join conversations c on c.id = cp.conversation_id
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id
    and cp.completion_choice is distinct from 'close'
    and (c.room_id is null or public.member_can_access_room(cp.user_id, c.room_id));

  return new;
end;
$function$;

-- ---------------------------------------------------------------------
-- 7. Gruppe-RPC'er afviser system-chats (ellers uændrede)
-- ---------------------------------------------------------------------
create or replace function public.add_group_participants(p_conversation_id uuid, p_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_caller_id uuid := auth.uid();
  v_caller_org uuid;
  v_conversation_org uuid;
  v_conversation_name text;
  v_is_group boolean;
  v_is_system boolean;
  v_caller_name text;
  v_added record;
begin
  if v_caller_id is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;

  if p_conversation_id is null then
    raise exception 'Der skal angives en samtale.' using hint = 'CONVERSATION_REQUIRED';
  end if;

  if p_user_ids is null or cardinality(p_user_ids) = 0 then
    raise exception 'Der skal angives mindst ét medlem.' using hint = 'MEMBERS_REQUIRED';
  end if;

  select c.is_group, c.organisation_id, c.name, (c.task_id is not null or c.room_id is not null)
    into v_is_group, v_conversation_org, v_conversation_name, v_is_system
  from public.conversations c
  where c.id = p_conversation_id;

  if v_is_group is null then
    raise exception 'Samtalen findes ikke.' using hint = 'CONVERSATION_NOT_FOUND';
  end if;

  if not v_is_group then
    raise exception 'Der kan kun tilføjes medlemmer til gruppesamtaler.' using hint = 'ADD_MEMBERS_GROUP_ONLY';
  end if;

  if v_is_system then
    raise exception 'Gruppen styres automatisk af opgaven/rummet og kan ikke ændres manuelt.' using hint = 'SYSTEM_GROUP_LOCKED';
  end if;

  select p.active_organisation_id
    into v_caller_org
  from public.profiles p
  where p.id = v_caller_id;

  if v_caller_org is null or v_caller_org <> v_conversation_org then
    raise exception 'Du har ikke adgang til denne organisation.' using hint = 'NO_ORG_ACCESS';
  end if;

  if not public.is_conversation_participant(p_conversation_id, v_caller_id) then
    raise exception 'Du er ikke deltager i denne samtale.' using hint = 'NOT_CONVERSATION_PARTICIPANT';
  end if;

  if exists (
    select 1
    from unnest(p_user_ids) as u(user_id)
    where u.user_id is null
       or not exists (
         select 1
         from public.memberships m
         where m.user_id = u.user_id
           and m.organisation_id = v_caller_org
       )
  ) then
    raise exception 'Alle nye medlemmer skal være medlem af din organisation.' using hint = 'NEW_MEMBERS_MUST_BE_IN_ORG';
  end if;

  select concat_ws(' ', p.first_name, p.last_name)
    into v_caller_name
  from public.profiles p
  where p.id = v_caller_id;

  for v_added in
    insert into public.conversation_participants (conversation_id, user_id)
    select p_conversation_id, u.user_id
    from (
      select distinct user_id
      from unnest(p_user_ids) as x(user_id)
    ) u
    on conflict (conversation_id, user_id) do nothing
    returning user_id
  loop
    insert into public.messages (conversation_id, sender_id, content, message_type)
    select
      p_conversation_id,
      v_caller_id,
      coalesce(concat_ws(' ', p.first_name, p.last_name), 'Et medlem')
        || ' blev tilføjet til gruppen "'
        || coalesce(v_conversation_name, 'Ukendt gruppe')
        || '" af '
        || coalesce(v_caller_name, 'et medlem') || '.',
      'system'
    from public.profiles p
    where p.id = v_added.user_id;
  end loop;
end;
$function$;

create or replace function public.remove_group_participant(p_conversation_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_caller_id uuid := auth.uid();
  v_caller_org uuid;
  v_conversation_org uuid;
  v_is_group boolean;
  v_is_system boolean;
  v_caller_name text;
  v_removed_name text;
  v_conversation_name text;
  v_deleted_count int;
begin
  if v_caller_id is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;

  if p_conversation_id is null then
    raise exception 'Der skal angives en samtale.' using hint = 'CONVERSATION_REQUIRED';
  end if;

  if p_user_id is null then
    raise exception 'Der skal angives et medlem.' using hint = 'MEMBER_REQUIRED';
  end if;

  if p_user_id = v_caller_id then
    raise exception 'Du kan ikke fjerne dig selv fra gruppen.' using hint = 'CANNOT_REMOVE_SELF_FROM_GROUP';
  end if;

  select c.is_group, c.organisation_id, c.name, (c.task_id is not null or c.room_id is not null)
    into v_is_group, v_conversation_org, v_conversation_name, v_is_system
  from public.conversations c
  where c.id = p_conversation_id;

  if v_is_group is null then
    raise exception 'Samtalen findes ikke.' using hint = 'CONVERSATION_NOT_FOUND';
  end if;

  if not v_is_group then
    raise exception 'Der kan kun fjernes medlemmer fra gruppesamtaler.' using hint = 'REMOVE_MEMBERS_GROUP_ONLY';
  end if;

  if v_is_system then
    raise exception 'Gruppen styres automatisk af opgaven/rummet og kan ikke ændres manuelt.' using hint = 'SYSTEM_GROUP_LOCKED';
  end if;

  select p.active_organisation_id
    into v_caller_org
  from public.profiles p
  where p.id = v_caller_id;

  if v_caller_org is null or v_caller_org <> v_conversation_org then
    raise exception 'Du har ikke adgang til denne organisation.' using hint = 'NO_ORG_ACCESS';
  end if;

  if not public.is_conversation_participant(p_conversation_id, v_caller_id) then
    raise exception 'Du er ikke deltager i denne samtale.' using hint = 'NOT_CONVERSATION_PARTICIPANT';
  end if;

  if not public.is_conversation_participant(p_conversation_id, p_user_id) then
    raise exception 'Brugeren er ikke deltager i denne samtale.' using hint = 'USER_NOT_PARTICIPANT';
  end if;

  select concat_ws(' ', p.first_name, p.last_name)
    into v_removed_name
  from public.profiles p
  where p.id = p_user_id;

  select concat_ws(' ', p.first_name, p.last_name)
    into v_caller_name
  from public.profiles p
  where p.id = v_caller_id;

  delete from public.conversation_participants
  where conversation_id = p_conversation_id
    and user_id = p_user_id;

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count > 0 then
    insert into public.messages (conversation_id, sender_id, content, message_type)
    values (
      p_conversation_id,
      v_caller_id,
      coalesce(v_removed_name, 'Et medlem')
        || ' blev fjernet fra gruppen "'
        || coalesce(v_conversation_name, 'Ukendt gruppe')
        || '" af '
        || coalesce(v_caller_name, 'et medlem') || '.',
      'system'
    );

    insert into public.notifications (user_id, organisation_id, type, title, body, link, reference_id)
    values (
      p_user_id,
      v_conversation_org,
      'message',
      coalesce(v_conversation_name, 'Gruppe'),
      'Du blev fjernet fra gruppen "'
        || coalesce(v_conversation_name, 'Ukendt gruppe')
        || '" af '
        || coalesce(v_caller_name, 'et medlem') || '.',
      '/beskeder',
      p_conversation_id
    );
  end if;
end;
$function$;

create or replace function public.rename_group_conversation(p_conversation_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_caller_id uuid := auth.uid();
    v_is_group boolean;
    v_is_system boolean;
    v_old_name text;
    v_new_name text := btrim(p_name);
    v_caller_org uuid;
    v_conversation_org uuid;
begin
    if v_caller_id is null then
        raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
    end if;

    if v_new_name is null or v_new_name = '' then
        raise exception 'Gruppen skal have et navn.' using hint = 'GROUP_NAME_REQUIRED';
    end if;

    select is_group, name, organisation_id, (task_id is not null or room_id is not null)
    into v_is_group, v_old_name, v_conversation_org, v_is_system
    from conversations
    where id = p_conversation_id;

    if v_is_group is null then
        raise exception 'Samtalen findes ikke.' using hint = 'CONVERSATION_NOT_FOUND';
    end if;

    if not v_is_group then
        raise exception 'Der kan kun ændres navn på gruppesamtaler.' using hint = 'RENAME_GROUP_ONLY';
    end if;

    if v_is_system then
        raise exception 'Gruppen styres automatisk af opgaven/rummet og kan ikke ændres manuelt.' using hint = 'SYSTEM_GROUP_LOCKED';
    end if;

    if not exists (
        select 1
        from conversation_participants
        where conversation_id = p_conversation_id
          and user_id = v_caller_id
    ) then
        raise exception 'Du er ikke deltager i denne samtale.' using hint = 'NOT_CONVERSATION_PARTICIPANT';
    end if;

    select active_organisation_id
    into v_caller_org
    from profiles
    where id = v_caller_id;

    if v_caller_org is null or v_caller_org is distinct from v_conversation_org then
        raise exception 'Du har ikke adgang til denne samtale.' using hint = 'NO_CONVERSATION_ACCESS';
    end if;

    if v_old_name is not distinct from v_new_name then
        return;
    end if;

    update conversations
    set name = v_new_name
    where id = p_conversation_id;

    insert into messages (conversation_id, sender_id, content, message_type)
    values (
        p_conversation_id,
        v_caller_id,
        'Gruppens navn blev ændret til ''' || v_new_name || '''.',
        'system'
    );
end;
$function$;

create or replace function public.leave_group_conversation(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid := auth.uid();
  v_caller_org uuid;
  v_conversation_org uuid;
  v_is_group boolean;
  v_task_id uuid;
  v_room_id uuid;
  v_caller_name text;
  v_deleted_count int;
begin
  if v_caller_id is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;

  select c.is_group, c.organisation_id, c.task_id, c.room_id
    into v_is_group, v_conversation_org, v_task_id, v_room_id
  from public.conversations c
  where c.id = p_conversation_id;

  if v_is_group is null then
    raise exception 'Samtalen findes ikke.' using hint = 'CONVERSATION_NOT_FOUND';
  end if;
  if not v_is_group then
    raise exception 'Du kan kun forlade gruppesamtaler.' using hint = 'LEAVE_GROUP_ONLY';
  end if;

  select p.active_organisation_id
    into v_caller_org
  from public.profiles p
  where p.id = v_caller_id;

  if v_caller_org is null or v_caller_org <> v_conversation_org then
    raise exception 'Du har ikke adgang til denne organisation.' using hint = 'NO_ORG_ACCESS';
  end if;
  if not public.is_conversation_participant(p_conversation_id, v_caller_id) then
    raise exception 'Du er ikke deltager i denne samtale.' using hint = 'NOT_CONVERSATION_PARTICIPANT';
  end if;

  -- System-chat: samme lås som sync-funktionerne, og fravalget huskes, så
  -- automatikken ikke melder mig ind igen.
  if v_task_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('task_conversation:' || v_task_id::text, 0));
  elsif v_room_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('room_conversation:' || v_room_id::text, 0));
  end if;

  if v_task_id is not null or v_room_id is not null then
    insert into public.conversation_opt_outs (conversation_id, user_id)
    values (p_conversation_id, v_caller_id)
    on conflict (conversation_id, user_id) do nothing;
  end if;

  select concat_ws(' ', p.first_name, p.last_name)
    into v_caller_name
  from public.profiles p
  where p.id = v_caller_id;

  delete from public.conversation_participants
  where conversation_id = p_conversation_id
    and user_id = v_caller_id;

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count > 0 then
    insert into public.messages (conversation_id, sender_id, content, message_type)
    values (
      p_conversation_id,
      v_caller_id,
      coalesce(v_caller_name, 'Et medlem') || ' forlod gruppen.',
      'system'
    );

    -- Resten har måske alle valgt 'close' -> arkivér.
    if v_task_id is not null then
      perform public.sync_task_conversation_archive(p_conversation_id);
    end if;
  end if;
end;
$function$;

-- ---------------------------------------------------------------------
-- 8. get_my_conversations (drop + create - returtypen ændres)
-- ---------------------------------------------------------------------
drop function public.get_my_conversations();

create function public.get_my_conversations()
returns table(
  conversation_id uuid,
  is_group boolean,
  display_name text,
  other_user_id uuid,
  url_picture text,
  last_message text,
  last_message_at timestamptz,
  last_message_deleted boolean,
  unread boolean,
  task_id uuid,
  room_id uuid,
  task_status public.e_task_status,
  closed boolean,
  completion_choice text
)
language sql
stable security definer
set search_path = public, pg_catalog
as $function$
  select
    c.id,
    c.is_group,
    case
      when c.is_group then c.name
      else concat_ws(' ', other_profile.first_name, other_profile.last_name)
    end,
    case when c.is_group then null else other.user_id end,
    case when c.is_group then null else other_profile.url_picture end,
    case when lm.deleted_at is null then lm.content end,
    lm.created_at,
    coalesce(lm.deleted_at is not null, false),
    (
      lm.created_at is not null
      and lm.created_at > coalesce(me.last_read_at, '-infinity'::timestamptz)
      and lm.sender_id is distinct from auth.uid()
    ) as unread,
    c.task_id,
    c.room_id,
    t.status,
    (
      c.closed_at is not null
      or me.completion_choice = 'close'
      or (c.room_id is not null and not exists (
        select 1 from public.task_room_roles trr where trr.room_id = c.room_id
      ))
    ) as closed,
    me.completion_choice
  from public.conversations c
  join public.conversation_participants me
    on me.conversation_id = c.id
   and me.user_id = auth.uid()
  left join public.conversation_participants other
    on other.conversation_id = c.id
   and other.user_id <> auth.uid()
   and not c.is_group
  left join public.profiles other_profile on other_profile.id = other.user_id
  left join public.tasks t on t.id = c.task_id
  left join lateral (
    select m.content, m.created_at, m.sender_id, m.deleted_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where auth.uid() is not null
    -- Kun samtaler i min AKTIVE organisation (2026-09-29, §15.25).
    and c.organisation_id = public.auth_profile_org()
    and (c.room_id is null or public.can_access_task_room(c.room_id))
    -- Opgave-chat arkiveret, fordi alle har valgt "Luk chat".
    and (c.task_id is null or c.archived_at is null)
  order by coalesce(lm.created_at, c.created_at) desc;
$function$;

revoke execute on function public.get_my_conversations() from public, anon;
grant execute on function public.get_my_conversations() to authenticated, service_role;


-- ---------------------------------------------------------------------
-- 15.25 (2026-09-29): beskeder + notifikationer scopes til AKTIV org
-- ---------------------------------------------------------------------
-- Bug: bruger med flere medlemskaber så alle samtaler/notifikationer
-- uanset aktiv org. get_my_conversations fik org-filter (ovenfor). DM'er
-- findes/oprettes nu pr. aktiv org (to brugere i org A+B får to separate
-- DM'er). Restriktiv RLS (AND'es med eksisterende permissive policies)
-- på conversations/messages/notifications. Invitationer undtaget: deres
-- organisation_id er den inviterende org, modtageren ikke er medlem af.
-- Intet slettes - org B's data vises igen, når B gøres aktiv. Frontend:
-- ingen ændring (USER_SCOPED_TAGS invaliderer ved org-skift).
-- Kørt og testet 2026-09-29.
create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid := auth.uid();
  v_org_id uuid := public.auth_profile_org();
  v_conversation_id uuid;
begin
  if v_caller_id is null or v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if p_other_user_id is null or p_other_user_id = v_caller_id then
    raise exception 'Du kan ikke oprette en samtale med dig selv.' using hint = 'CANNOT_MESSAGE_SELF';
  end if;

  if not exists (
    select 1 from public.memberships m
    where m.user_id = p_other_user_id and m.organisation_id = v_org_id
  ) then
    raise exception 'Denne person er ikke medlem af din organisation.' using hint = 'PERSON_NOT_IN_ORG';
  end if;

  -- Samme brugerpar + org må ikke få to DM'er ved samtidige klik.
  perform pg_advisory_xact_lock(hashtextextended(
    'direct_conversation:' || v_org_id::text || ':'
      || least(v_caller_id, p_other_user_id)::text || ':'
      || greatest(v_caller_id, p_other_user_id)::text, 0));

  select c.id into v_conversation_id
  from public.conversations c
  where c.organisation_id = v_org_id
    and not c.is_group
    and c.task_id is null
    and c.room_id is null
    and exists (select 1 from public.conversation_participants cp
                where cp.conversation_id = c.id and cp.user_id = v_caller_id)
    and exists (select 1 from public.conversation_participants cp
                where cp.conversation_id = c.id and cp.user_id = p_other_user_id)
  order by c.created_at
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (organisation_id, is_group, created_by)
  values (v_org_id, false, v_caller_id)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conversation_id, v_caller_id), (v_conversation_id, p_other_user_id);

  return v_conversation_id;
end;
$function$;

revoke execute on function public.get_or_create_direct_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

-- RLS-hjælper: samtalen hører til kalderens aktive organisation.
create or replace function public.conversation_in_active_org(p_conversation_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and c.organisation_id = public.auth_profile_org()
  );
$function$;

revoke execute on function public.conversation_in_active_org(uuid) from public, anon;
grant execute on function public.conversation_in_active_org(uuid) to authenticated;

create policy "Samtaler kun i aktiv organisation"
  on public.conversations
  as restrictive
  for select
  to authenticated
  using (organisation_id = public.auth_profile_org());

create policy "Beskeder kun i aktiv organisation (læs)"
  on public.messages
  as restrictive
  for select
  to authenticated
  using (public.conversation_in_active_org(conversation_id));

create policy "Beskeder kun i aktiv organisation (skriv)"
  on public.messages
  as restrictive
  for insert
  to authenticated
  with check (public.conversation_in_active_org(conversation_id));

-- Insert sker kun i security definer-triggere/RPC'er og røres ikke.
create policy "Notifikationer kun i aktiv organisation (læs)"
  on public.notifications
  as restrictive
  for select
  to authenticated
  using (organisation_id = public.auth_profile_org() or type = 'membership_invitation');

create policy "Notifikationer kun i aktiv organisation (opdater)"
  on public.notifications
  as restrictive
  for update
  to authenticated
  using (organisation_id = public.auth_profile_org() or type = 'membership_invitation');

create policy "Notifikationer kun i aktiv organisation (slet)"
  on public.notifications
  as restrictive
  for delete
  to authenticated
  using (organisation_id = public.auth_profile_org() or type = 'membership_invitation');


-- ---------------------------------------------------------------------
-- 15.26 (2026-09-29): STATISTIK (US-48–54) - server-side aggregering
-- ---------------------------------------------------------------------
-- Afløser klientberegningen i statisticApi.ts, som gav forkerte tal:
-- tasks-RLS skjuler Completed-opgaver (view_completed_tasks) og rolle-
-- låste rum, PostgREST giver højst 1000 rækker, og datofiltre brugte UTC.
-- Alle med read_statistics ser nu samme tal. Kun aggregater returneres -
-- ingen rækker, ingen medlemsnavne. Definitionerne er beskrevet i
-- docs/statistik-plan.md; docs/seed/FACIT.md har forventede værdier.
-- Privilegier: read_statistics / create_statistics / delete_statistics
-- (fri tekst i privileges, ingen backfill - kun admin som standard).
-- Policies: §16.8. Kørt og verificeret mod FACIT 2026-09-29. Udvidet
-- 2026-09-29/30 med lagerhistorik (§9b/§15.21d), rum-filter (US-55),
-- KPI-trend, til tiden/gennemløbstid, rum-oversigt og "lige nu" - kørt og
-- verificeret mod FACIT 2026-09-30.
-- ---------------------------------------------------------------------
-- 15.26d statistics_on_time + 15.26e statistics_kpis - interne hjælpere
-- (2026-09-30). Står før 15.26a, som bruger dem (sql-funktioner valideres
-- ved oprettelse).
--   statistics_on_time: finished_at <= end_date; en slutdato kl. 00:00 UTC
--     (dato uden klokkeslæt fra opgave-formularen) gælder hele dagen.
--   statistics_kpis: nøgletallene for [p_s, p_e), valgfrit ét rum. Kaldes
--     for perioden og for perioden lige før af samme længde (trend).
-- ---------------------------------------------------------------------
create or replace function public.statistics_on_time(p_finished timestamptz, p_end timestamptz)
returns boolean
language sql
immutable
set search_path to 'public'
as $$
  select p_finished <= case
    when (p_end at time zone 'UTC')::time = '00:00' then p_end + interval '1 day'
    else p_end
  end;
$$;

revoke execute on function public.statistics_on_time(timestamptz, timestamptz) from public, anon, authenticated;


create or replace function public.statistics_kpis(
  p_org uuid,
  p_room_id uuid,
  p_s timestamptz,
  p_e timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with t as (
    select * from public.tasks where organisation_id = p_org and (p_room_id is null or room_id = p_room_id)
  ),
  relevant as (
    select id from t
    where (created_at >= p_s and created_at < p_e)
       or (coalesce(start_date, created_at) < p_e
           and (status = 'InProgress' or (status = 'Completed' and finished_at >= p_s)))
  ),
  active_members as (
    select distinct ta.user_id
    from public.task_assignees ta
    join relevant r on r.id = ta.task_id
    join public.memberships m on m.user_id = ta.user_id and m.organisation_id = p_org
  ),
  done as (
    select
      count(*) as n,
      count(*) filter (where end_date is not null) as with_deadline,
      count(*) filter (where end_date is not null and public.statistics_on_time(finished_at, end_date)) as on_time,
      percentile_cont(0.5) within group (order by extract(epoch from finished_at - created_at)) as median_lead_seconds
    from t
    where status = 'Completed' and finished_at >= p_s and finished_at < p_e
  )
  select jsonb_build_object(
    'created',   (select count(*) from t where created_at >= p_s and created_at < p_e),
    'completed', d.n,
    'active',    (select count(*) from t
                  where coalesce(start_date, created_at) < p_e
                    and (status = 'InProgress' or (status = 'Completed' and finished_at >= p_s))),
    'overdue',   (select count(*) from t
                  where status <> 'Completed' and end_date < now()
                    and end_date >= p_s and end_date < p_e),
    'members',   (select count(*) from public.memberships where organisation_id = p_org),
    -- Medlemskaber oprettet i perioden (nuværende medlemmer - et medlem der
    -- forlader org'en slettes, så udmeldte kan ikke tælles). Ikke rum-filter.
    'newMembers', (select count(*) from public.memberships
                   where organisation_id = p_org and created_at >= p_s and created_at < p_e),
    'membersWithTaskActivity', (select count(*) from active_members),
    'completedWithDeadline', d.with_deadline,
    'completedOnTime', d.on_time,
    'onTimeRate', case when d.with_deadline > 0 then round(d.on_time::numeric * 100 / d.with_deadline, 1) end,
    'medianLeadDays', case when d.median_lead_seconds is not null
                           then round((d.median_lead_seconds / 86400)::numeric, 1) end
  )
  from done d;
$$;

revoke execute on function public.statistics_kpis(uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 15.26a statistics_payload - selve beregningen (intern)
--
-- p_start/p_end: [p_start, p_end), null = ubegrænset ("Alt").
-- p_granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' (buckets).
-- p_tz: IANA-tidszone (fx 'Europe/Copenhagen'), bruges til bucket-grænser.
-- p_room_id: US-55 rum-filter (null = alle). Filtrerer alle opgave-afledte
--   tal; lager (byStatus, byCategory) er altid hele organisationen.
--
-- Definitioner (se også docs/statistik-plan.md):
--   kpis (15.26e): created = created_at i perioden; completed = Completed
--     og finished_at i perioden; active = coalesce(start_date, created_at)
--     < slut og (InProgress eller Completed med finished_at >= start);
--     overdue = ikke Completed, end_date < now() og i perioden;
--     membersWithTaskActivity = medlemmer tildelt >= 1 relevant opgave
--     (oprettet eller aktiv i perioden); completedOnTime/-WithDeadline/
--     onTimeRate (15.26d); medianLeadDays = median finished_at - created_at;
--     newMembers = memberships.created_at i perioden (ikke rum-filter).
--   previousKpis = kpis for perioden lige før (samme længde); null ved "Alt"
--   taskRooms  = kpi-definitionerne pr. rum, alle org'ens rum (også 0)
--   memberLoad = antal medlemmer pr. interval af relevante opgaver
--   approvals  = task_requests med requested_at i perioden
--   attention  = "lige nu" (ikke periode): åbne forfaldne pr. prioritet,
--                åbne uden ansvarlige (følger rum), lager-advarsler og
--                varer uden ledige enheder + ventende medlemsanmodninger/
--                invitationer (hele org)
--   materials.byStatus = enhedsrækker pr. status ved min(slut, nu) fra
--                lagerhistorikken §9b; null før historikkens start
--   materials.byLocation = enhedsrækker pr. lager (sektioner talt med) ved
--                min(slut, nu) fra lagerhistorikken; null før dens start
--   materials.usedByCategory = forskellige varer brugt på opgaver oprettet
--                i perioden, pr. hovedkategori
--   rooms      = alle org'ens rum til filteret
--
-- SECURITY DEFINER og derfor UDEN RLS - hver forespørgsel filtrerer selv
-- på p_org. Må derfor ikke kunne kaldes direkte (se revoke nedenfor).
-- ---------------------------------------------------------------------
create or replace function public.statistics_payload(
  p_org uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_granularity text,
  p_tz text,
  p_room_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_s timestamptz := coalesce(p_start, '-infinity'::timestamptz);
  v_e timestamptz := coalesce(p_end, 'infinity'::timestamptz);
  v_step interval;
  v_from timestamp;
  v_to timestamp;
  v_kpis jsonb;
  v_previous_kpis jsonb;
  v_rooms jsonb;
  v_task_status jsonb;
  v_task_priority jsonb;
  v_task_rooms jsonb;
  v_member_load jsonb;
  v_development jsonb := '[]'::jsonb;
  v_approvals jsonb;
  v_by_status jsonb;
  v_by_location jsonb;
  v_status_as_of timestamptz := least(coalesce(p_end, now()), now());
  v_history_start timestamptz;
  v_by_category jsonb;
  v_used_by_category jsonb;
  v_top_used jsonb;
  v_attention jsonb;
begin
  if p_granularity not in ('hour', 'day', 'week', 'month', 'quarter') then
    raise exception 'Ugyldig granularitet: %', p_granularity using hint = 'INVALID_GRANULARITY';
  end if;

  -- Fejler med en tydelig fejl, hvis tidszonen er ugyldig.
  perform now() at time zone p_tz;

  -- '1 quarter' er ikke et gyldigt interval - date_trunc('quarter') er.
  v_step := case when p_granularity = 'quarter' then interval '3 months'
                 else ('1 ' || p_granularity)::interval end;

  -- KPI'er (statistics_kpis) + samme længde lige før, til trend. "Alt"
  -- har ingen forrige periode.
  v_kpis := public.statistics_kpis(p_org, p_room_id, v_s, v_e);
  if p_start is not null and p_end is not null then
    v_previous_kpis := public.statistics_kpis(p_org, p_room_id, p_start - (p_end - p_start), p_start);
  end if;

  -- Status for opgaver oprettet i perioden (alle enum-værdier, også 0) -
  select coalesce(jsonb_agg(jsonb_build_object('status', s.status, 'count', coalesce(c.n, 0)) order by s.ord), '[]'::jsonb)
  into v_task_status
  from unnest(enum_range(null::public.e_task_status)) with ordinality as s(status, ord)
  left join (
    select status, count(*) as n
    from public.tasks
    where organisation_id = p_org and created_at >= v_s and created_at < v_e
      and (p_room_id is null or room_id = p_room_id)
    group by status
  ) c on c.status = s.status;

  -- Prioritet (null = ingen prioritet) --------------------------------
  select coalesce(jsonb_agg(jsonb_build_object('priority', p.priority, 'count', coalesce(c.n, 0)) order by p.ord), '[]'::jsonb)
  into v_task_priority
  from (
    select priority, ord from unnest(enum_range(null::public.e_task_priority)) with ordinality as e(priority, ord)
    union all
    select null::public.e_task_priority, 1000
  ) p
  left join (
    select priority, count(*) as n
    from public.tasks
    where organisation_id = p_org and created_at >= v_s and created_at < v_e
      and (p_room_id is null or room_id = p_room_id)
    group by priority
  ) c on c.priority is not distinct from p.priority
  where p.priority is not null or coalesce(c.n, 0) > 0;

  -- Rum-oversigt: samme definitioner som KPI'erne (statistics_kpis), pr.
  -- rum. ALLE org'ens rum, også rolle-låste og dem uden opgaver (0 - så et
  -- snapshot viser 0 og ikke "mangler"). "Uden rum" kun når der er noget.
  -- total = oprettede (navnet bevaret for snapshots' room:*).
  with t as (
    select room_id,
      (created_at >= v_s and created_at < v_e) as is_created,
      (status = 'Completed' and finished_at >= v_s and finished_at < v_e) as is_done,
      (status <> 'Completed' and end_date < now() and end_date >= v_s and end_date < v_e) as is_overdue,
      (end_date is not null) as has_deadline,
      (end_date is not null and public.statistics_on_time(finished_at, end_date)) as on_time
    from public.tasks
    where organisation_id = p_org
  ),
  agg as (
    select r.id as room_id, r.name,
      count(*) filter (where t.is_created) as total,
      count(*) filter (where t.is_done) as completed,
      count(*) filter (where t.is_overdue) as overdue,
      count(*) filter (where t.is_done and t.has_deadline) as with_deadline,
      count(*) filter (where t.is_done and t.on_time) as on_time
    from public.task_rooms r
    left join t on t.room_id = r.id
    where r.organisation_id = p_org
    group by r.id, r.name

    union all

    select null, null,
      count(*) filter (where is_created),
      count(*) filter (where is_done),
      count(*) filter (where is_overdue),
      count(*) filter (where is_done and has_deadline),
      count(*) filter (where is_done and on_time)
    from t
    where room_id is null
    having count(*) filter (where is_created or is_done or is_overdue) > 0
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'roomId', room_id,
           'name', name,
           'total', total,
           'completed', completed,
           'overdue', overdue,
           'completedWithDeadline', with_deadline,
           'completedOnTime', on_time,
           'onTimeRate', case when with_deadline > 0 then round(on_time::numeric * 100 / with_deadline, 1) end
         ) order by total desc, name), '[]'::jsonb)
  into v_task_rooms
  from agg;

  -- Anonym belastning: medlemmer pr. interval af relevante opgaver -----
  with relevant as (
    select id from public.tasks
    where organisation_id = p_org
      and (p_room_id is null or room_id = p_room_id)
      and ((created_at >= v_s and created_at < v_e)
        or (coalesce(start_date, created_at) < v_e
            and (status = 'InProgress' or (status = 'Completed' and finished_at >= v_s))))
  ),
  per_member as (
    select m.user_id, count(r.id) as n
    from public.memberships m
    left join public.task_assignees ta on ta.user_id = m.user_id
    left join relevant r on r.id = ta.task_id
    where m.organisation_id = p_org
    group by m.user_id
  ),
  buckets(bucket, lo, hi, ord) as (
    values ('0', 0, 0, 1), ('1-3', 1, 3, 2), ('4-6', 4, 6, 3), ('7+', 7, null, 4)
  )
  select jsonb_agg(jsonb_build_object(
           'bucket', b.bucket,
           'count', (select count(*) from per_member pm where pm.n >= b.lo and (b.hi is null or pm.n <= b.hi))
         ) order by b.ord)
  into v_member_load
  from buckets b;

  -- Tidsserie (0-fyldt) -----------------------------------------------
  if p_start is not null and p_end is not null then
    v_from := date_trunc(p_granularity, p_start at time zone p_tz);
    v_to   := date_trunc(p_granularity, (p_end - interval '1 microsecond') at time zone p_tz);
  else
    select date_trunc(p_granularity, min(least(created_at, coalesce(finished_at, created_at))) at time zone p_tz)
    into v_from
    from public.tasks
    where organisation_id = p_org and (p_room_id is null or room_id = p_room_id);

    v_to := date_trunc(p_granularity, coalesce(p_end, now()) at time zone p_tz);

    if p_start is not null then
      v_from := date_trunc(p_granularity, p_start at time zone p_tz);
    end if;
  end if;

  if v_from is not null and v_from <= v_to then
    select coalesce(jsonb_agg(jsonb_build_object(
             'bucket', to_char(g.b, 'YYYY-MM-DD"T"HH24:MI'),
             'created', coalesce(c.n, 0),
             'completed', coalesce(f.n, 0)
           ) order by g.b), '[]'::jsonb)
    into v_development
    from generate_series(v_from, v_to, v_step) as g(b)
    left join (
      select date_trunc(p_granularity, created_at at time zone p_tz) as b, count(*) as n
      from public.tasks
      where organisation_id = p_org and created_at >= v_s and created_at < v_e
        and (p_room_id is null or room_id = p_room_id)
      group by 1
    ) c on c.b = g.b
    left join (
      select date_trunc(p_granularity, finished_at at time zone p_tz) as b, count(*) as n
      from public.tasks
      where organisation_id = p_org and status = 'Completed'
        and (p_room_id is null or room_id = p_room_id)
        and finished_at >= v_s and finished_at < v_e
      group by 1
    ) f on f.b = g.b;
  end if;

  -- Godkendelser --------------------------------------------------------
  with r as (
    select tr.status, tr.requested_at, tr.done_at
    from public.task_requests tr
    join public.tasks t on t.id = tr.task_id
    where t.organisation_id = p_org
      and tr.requested_at >= v_s and tr.requested_at < v_e
      and (p_room_id is null or t.room_id = p_room_id)
  ),
  agg as (
    select
      count(*) filter (where status = 'Pending')  as pending,
      count(*) filter (where status = 'Accepted') as accepted,
      count(*) filter (where status = 'Rejected') as rejected,
      percentile_cont(0.5) within group (order by extract(epoch from done_at - requested_at))
        filter (where status <> 'Pending' and done_at is not null) as median_seconds
    from r
  )
  select jsonb_build_object(
    'pending', pending,
    'accepted', accepted,
    'rejected', rejected,
    'rate', case when accepted + rejected > 0
                 then round(accepted::numeric * 100 / (accepted + rejected), 1)
            end,
    'medianHours', case when median_seconds is not null
                        then round((median_seconds / 3600)::numeric, 1)
                   end
  ) into v_approvals
  from agg;

  -- Materialer: enhedsrækker pr. status VED PERIODENS SLUTNING (eller nu),
  -- fra lagerhistorikken (§9b). Ligger tidspunktet før org'ens første
  -- historik-række, er lageret ukendt -> null (frontend viser "–").
  select min(valid_from) into v_history_start
  from public.data_layer_item_unit_history
  where organisation_id = p_org;

  if v_history_start is null or v_status_as_of >= v_history_start then
    select coalesce(jsonb_agg(jsonb_build_object('status', s.status, 'count', coalesce(c.n, 0)) order by s.ord), '[]'::jsonb)
    into v_by_status
    from unnest(enum_range(null::public.e_item_status)) with ordinality as s(status, ord)
    left join (
      select status, count(*) as n
      from public.data_layer_item_unit_history
      where organisation_id = p_org
        and valid_from <= v_status_as_of
        and (valid_to is null or valid_to > v_status_as_of)
      group by status
    ) c on c.status = s.status;
  end if;

  -- Materialer: enhedsrækker pr. lager (topniveau - sektioner tælles med i
  -- deres lager) VED PERIODENS SLUTNING, fra lagerhistorikken. Samme regel
  -- som byStatus: null før historikkens start. Alle lagre (også 0);
  -- "Uden lokation" kun når der er nogen.
  if v_history_start is null or v_status_as_of >= v_history_start then
    with at_end as (
      select coalesce(l.parent_location_id, l.id) as top_id
      from public.data_layer_item_unit_history h
      left join public.locations l on l.id = h.location_id
      where h.organisation_id = p_org
        and h.valid_from <= v_status_as_of
        and (h.valid_to is null or h.valid_to > v_status_as_of)
    )
    select coalesce(jsonb_agg(x order by (x->>'count')::int desc, x->>'name'), '[]'::jsonb)
    into v_by_location
    from (
      select jsonb_build_object(
        'locationId', top.id,
        'name', top.name,
        'count', (select count(*) from at_end a where a.top_id = top.id)
      ) as x
      from public.locations top
      where top.organisation_id = p_org and top.parent_location_id is null

      union all

      select jsonb_build_object('locationId', null, 'name', null, 'count', count(*))
      from at_end
      where top_id is null
      having count(*) > 0
    ) loc;
  end if;

  -- Materialer: items pr. topkategori (nutid) ---------------------------
  with recursive tree as (
    select id, id as root_id
    from public.data_layer_categories
    where organisation_id = p_org and parent_category_id is null
    union all
    select c.id, tree.root_id
    from public.data_layer_categories c
    join tree on c.parent_category_id = tree.id
    where c.organisation_id = p_org
  )
  select coalesce(jsonb_agg(jsonb_build_object('categoryId', x.id, 'title', x.title, 'count', x.n)
                            order by x.n desc, x.rank, x.title), '[]'::jsonb)
  into v_by_category
  from (
    select root.id, root.title, root.rank, count(i.id) as n
    from public.data_layer_categories root
    left join tree on tree.root_id = root.id
    left join public.data_layer_items i on i.category_id = tree.id and i.organisation_id = p_org
    where root.organisation_id = p_org and root.parent_category_id is null
    group by root.id, root.title, root.rank
  ) x;

  -- Materialer: forskellige varer brugt på opgaver oprettet i perioden,
  -- pr. topkategori (alle topkategorier, også 0). Kan beregnes bagud -
  -- modsat varer pr. kategori, som kun kendes nu.
  with recursive tree as (
    select id, id as root_id
    from public.data_layer_categories
    where organisation_id = p_org and parent_category_id is null
    union all
    select c.id, tree.root_id
    from public.data_layer_categories c
    join tree on c.parent_category_id = tree.id
    where c.organisation_id = p_org
  ),
  used as (
    select distinct tm.item_id
    from public.task_materials tm
    join public.tasks t on t.id = tm.task_id
    where t.organisation_id = p_org
      and t.created_at >= v_s and t.created_at < v_e
      and (p_room_id is null or t.room_id = p_room_id)
  )
  select coalesce(jsonb_agg(jsonb_build_object('categoryId', x.id, 'title', x.title, 'count', x.n)
                            order by x.n desc, x.rank, x.title), '[]'::jsonb)
  into v_used_by_category
  from (
    select root.id, root.title, root.rank, count(u.item_id) as n
    from public.data_layer_categories root
    left join tree on tree.root_id = root.id
    left join public.data_layer_items i on i.category_id = tree.id and i.organisation_id = p_org
    left join used u on u.item_id = i.id
    where root.organisation_id = p_org and root.parent_category_id is null
    group by root.id, root.title, root.rank
  ) x;

  -- Materialer: top 5 mest brugte på opgaver oprettet i perioden -------
  select coalesce(jsonb_agg(x order by (x->>'quantity')::numeric desc, x->>'name'), '[]'::jsonb)
  into v_top_used
  from (
    select jsonb_build_object(
      'itemId', i.id,
      'name', i.name,
      'unit', i.unit_of_measurement,
      'quantity', sum(tm.quantity)
    ) as x
    from public.task_materials tm
    join public.tasks t on t.id = tm.task_id
    join public.data_layer_items i on i.id = tm.item_id
    where t.organisation_id = p_org
      and i.organisation_id = p_org
      and (p_room_id is null or t.room_id = p_room_id)
      and t.created_at >= v_s and t.created_at < v_e
    group by i.id, i.name, i.unit_of_measurement
    order by sum(tm.quantity) desc, i.name
    limit 5
  ) top;

  -- "Lige nu" - nutid, uafhængigt af perioden. Opgave-punkter følger
  -- rum-filteret; lager er hele organisationen. Gemmes ikke i snapshots.
  with open_tasks as (
    select id, priority, end_date
    from public.tasks
    where organisation_id = p_org and status <> 'Completed'
      and (p_room_id is null or room_id = p_room_id)
  ),
  units as (
    select item_id, status
    from public.data_layer_item_units
    where organisation_id = p_org
  )
  select jsonb_build_object(
    'overdueByPriority', (
      select coalesce(jsonb_agg(jsonb_build_object('priority', p.priority, 'count', coalesce(c.n, 0)) order by p.ord), '[]'::jsonb)
      from (
        select priority, ord from unnest(enum_range(null::public.e_task_priority)) with ordinality as e(priority, ord)
        union all
        select null::public.e_task_priority, 1000
      ) p
      left join (
        select priority, count(*) as n from open_tasks where end_date < now() group by priority
      ) c on c.priority is not distinct from p.priority
      where coalesce(c.n, 0) > 0
    ),
    'unassigned', (
      select count(*) from open_tasks o
      where not exists (select 1 from public.task_assignees ta where ta.task_id = o.id)
    ),
    'stockAlerts', (
      select coalesce(jsonb_agg(jsonb_build_object('status', s.status, 'count', coalesce(c.n, 0)) order by s.ord), '[]'::jsonb)
      from unnest(array['Missing', 'Damaged', 'Maintenance', 'OutOfStock', 'NeedsEmptying', 'NeedsRefilling']::public.e_item_status[])
           with ordinality as s(status, ord)
      left join (select status, count(*) as n from units group by status) c on c.status = s.status
    ),
    'itemsWithoutAvailable', (
      select count(*) from (
        select item_id from units group by item_id having not bool_or(status = 'Available')
      ) x
    ),
    -- Medlemskab (hele org): ventende anmodninger og invitationer.
    'pendingRequests', (
      select count(*) from public.membership_requests
      where organisation_id = p_org and status = 'Pending'
    ),
    'pendingInvitations', (
      select count(*) from public.membership_invitations
      where organisation_id = p_org and status = 'Pending'
    )
  ) into v_attention;

  -- Alle org'ens rum til filter-dropdown (også rolle-låste - read_statistics er betroet).
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name), '[]'::jsonb)
  into v_rooms
  from public.task_rooms
  where organisation_id = p_org;

  return jsonb_build_object(
    'kpis', v_kpis,
    'previousKpis', v_previous_kpis,
    'rooms', v_rooms,
    'taskStatus', v_task_status,
    'taskPriority', v_task_priority,
    'taskRooms', v_task_rooms,
    'memberLoad', v_member_load,
    'taskDevelopment', v_development,
    'approvals', v_approvals,
    'attention', v_attention,
    'materials', jsonb_build_object(
      'byStatus', v_by_status,
      'byLocation', v_by_location,
      'statusAsOf', v_status_as_of,
      'historyStart', v_history_start,
      'byCategory', v_by_category,
      'usedByCategory', v_used_by_category,
      'topUsed', v_top_used
    )
  );
end;
$$;

-- Intern: omgår RLS og tager org som parameter - må aldrig kaldes fra klienten.
revoke execute on function public.statistics_payload(uuid, timestamptz, timestamptz, text, text, uuid) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 15.26b get_statistics - klientens indgang (kræver read_statistics)
-- p_room_id skal tilhøre org'en (ROOM_NOT_FOUND).
-- ---------------------------------------------------------------------
create or replace function public.get_statistics(
  p_start timestamptz,
  p_end timestamptz,
  p_granularity text,
  p_tz text,
  p_room_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.auth_profile_org();
begin
  if v_org is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not public.has_privilege_or_admin('read_statistics') then
    raise exception 'Du har ikke rettigheder til at se statistik.' using errcode = '42501', hint = 'NO_PRIV_READ_STATISTICS';
  end if;

  if p_start is not null and p_end is not null and p_end <= p_start then
    raise exception 'Slutdatoen skal ligge efter startdatoen.' using hint = 'INVALID_PERIOD';
  end if;

  if p_room_id is not null and not exists (
    select 1 from public.task_rooms where id = p_room_id and organisation_id = v_org
  ) then
    raise exception 'Rummet findes ikke i din organisation.' using hint = 'ROOM_NOT_FOUND';
  end if;

  return public.statistics_payload(v_org, p_start, p_end, p_granularity, p_tz, p_room_id);
end;
$$;

revoke execute on function public.get_statistics(timestamptz, timestamptz, text, text, uuid) from public, anon;
grant  execute on function public.get_statistics(timestamptz, timestamptz, text, text, uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 15.26c save_statistics_snapshot - gemmer et uændreligt snapshot (US-52)
--
-- Værdierne gemmes fladt i statistics_values som "<gruppe>:<nøgle>"
-- (fx task_status:Completed, room:Sanitet, room: = uden rum). Navne på
-- rum/kategorier/items gemmes som de så ud nu, så et gammelt snapshot
-- ikke ændrer sig, når noget omdøbes. Tidsserien gemmes som
-- development:created/development:completed pr. delperiode med
-- statistics_values.period_start/period_end; opløsningen (p_granularity:
-- week/month/quarter) vælges af brugeren ved gem og gemmes i
-- statistics_snapshots.series_granularity. Første/sidste delperiode skæres
-- til snapshottets periode (fx Q3 = 23.-29. sep. i et 7-dages snapshot).
-- "Alt" (null-periode) gemmes med første opgaves dato som start og nu som slut.
-- Snapshots gælder altid hele organisationen (intet rum-filter). item_status:*
-- gemmes kun når lagerhistorikken rækker tilbage til periodens slut;
-- used_category:* erstatter category:* (som kun var "nu"). Rum gemmes som
-- room:/room_completed:/room_overdue:/room_on_time_rate:; "lige nu"
-- (attention) gemmes ikke. location:<lager> gemmes som item_status:*.
-- ---------------------------------------------------------------------
create or replace function public.save_statistics_snapshot(
  p_start timestamptz,
  p_end timestamptz,
  p_label text,
  p_tz text,
  p_granularity text default 'month'
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.auth_profile_org();
  v_payload jsonb;
  v_start timestamptz;
  v_end timestamptz;
  v_id uuid;
  v_step interval;
begin
  if v_org is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not public.has_privilege_or_admin('create_statistics') then
    raise exception 'Du har ikke rettigheder til at gemme statistik.' using errcode = '42501', hint = 'NO_PRIV_CREATE_STATISTICS';
  end if;

  if p_start is not null and p_end is not null and p_end <= p_start then
    raise exception 'Slutdatoen skal ligge efter startdatoen.' using hint = 'INVALID_PERIOD';
  end if;

  -- Tidsseriens opløsning vælges af brugeren ved gem.
  if p_granularity not in ('week', 'month', 'quarter') then
    raise exception 'Ugyldig granularitet: %', p_granularity using hint = 'INVALID_GRANULARITY';
  end if;

  v_step := case when p_granularity = 'quarter' then interval '3 months'
                 else ('1 ' || p_granularity)::interval end;

  v_payload := public.statistics_payload(v_org, p_start, p_end, p_granularity, p_tz);

  v_end := coalesce(p_end, now());
  v_start := coalesce(
    p_start,
    (select min(created_at) from public.tasks where organisation_id = v_org),
    v_end
  );

  insert into public.statistics_snapshots (organisation_id, period_start, period_end, label, series_granularity)
  values (v_org, v_start, v_end, nullif(trim(p_label), ''), p_granularity)
  returning id into v_id;

  insert into public.statistics_values (snapshot_id, name, value)
  -- KPI'er
  select v_id, 'tasks_created', (v_payload->'kpis'->>'created')::numeric
  union all select v_id, 'tasks_completed', (v_payload->'kpis'->>'completed')::numeric
  union all select v_id, 'tasks_active', (v_payload->'kpis'->>'active')::numeric
  union all select v_id, 'tasks_overdue', (v_payload->'kpis'->>'overdue')::numeric
  union all select v_id, 'members', (v_payload->'kpis'->>'members')::numeric
  union all select v_id, 'members_with_task_activity', (v_payload->'kpis'->>'membersWithTaskActivity')::numeric
  union all select v_id, 'members_new', (v_payload->'kpis'->>'newMembers')::numeric
  union all select v_id, 'tasks_completed_with_deadline', (v_payload->'kpis'->>'completedWithDeadline')::numeric
  union all select v_id, 'tasks_completed_on_time', (v_payload->'kpis'->>'completedOnTime')::numeric
  union all
  select v_id, 'tasks_on_time_rate', (v_payload->'kpis'->>'onTimeRate')::numeric
  where v_payload->'kpis'->>'onTimeRate' is not null
  union all
  select v_id, 'tasks_median_lead_days', (v_payload->'kpis'->>'medianLeadDays')::numeric
  where v_payload->'kpis'->>'medianLeadDays' is not null
  -- Fordelinger
  union all
  select v_id, 'task_status:' || (x->>'status'), (x->>'count')::numeric
  from jsonb_array_elements(v_payload->'taskStatus') x
  union all
  select v_id, 'task_priority:' || coalesce(x->>'priority', ''), (x->>'count')::numeric
  from jsonb_array_elements(v_payload->'taskPriority') x
  union all
  select v_id, 'room:' || coalesce(x->>'name', ''), (x->>'total')::numeric
  from jsonb_array_elements(v_payload->'taskRooms') x
  union all
  select v_id, 'room_completed:' || coalesce(x->>'name', ''), (x->>'completed')::numeric
  from jsonb_array_elements(v_payload->'taskRooms') x
  union all
  select v_id, 'room_overdue:' || coalesce(x->>'name', ''), (x->>'overdue')::numeric
  from jsonb_array_elements(v_payload->'taskRooms') x
  union all
  select v_id, 'room_on_time_rate:' || coalesce(x->>'name', ''), (x->>'onTimeRate')::numeric
  from jsonb_array_elements(v_payload->'taskRooms') x
  where x->>'onTimeRate' is not null
  union all
  select v_id, 'member_load:' || (x->>'bucket'), (x->>'count')::numeric
  from jsonb_array_elements(v_payload->'memberLoad') x
  -- Godkendelser
  union all select v_id, 'approvals:pending', (v_payload->'approvals'->>'pending')::numeric
  union all select v_id, 'approvals:accepted', (v_payload->'approvals'->>'accepted')::numeric
  union all select v_id, 'approvals:rejected', (v_payload->'approvals'->>'rejected')::numeric
  union all
  select v_id, 'approvals_rate', (v_payload->'approvals'->>'rate')::numeric
  where v_payload->'approvals'->>'rate' is not null
  union all
  select v_id, 'approvals_median_hours', (v_payload->'approvals'->>'medianHours')::numeric
  where v_payload->'approvals'->>'medianHours' is not null
  -- Materialer
  union all
  -- Lager ved periodens slutning - udelades når historikken ikke rækker
  -- så langt tilbage (byStatus = null).
  select v_id, 'item_status:' || (x->>'status'), (x->>'count')::numeric
  from jsonb_array_elements(coalesce(nullif(v_payload->'materials'->'byStatus', 'null'::jsonb), '[]'::jsonb)) x
  union all
  -- Enheder pr. lager ved periodens slutning (samme regel; location: = uden lokation).
  select v_id, 'location:' || coalesce(x->>'name', ''), (x->>'count')::numeric
  from jsonb_array_elements(coalesce(nullif(v_payload->'materials'->'byLocation', 'null'::jsonb), '[]'::jsonb)) x
  union all
  -- Brugte varer pr. kategori i perioden (erstatter category:*, som kun
  -- var "nu" og derfor ens i alle snapshots).
  select v_id, 'used_category:' || (x->>'title'), (x->>'count')::numeric
  from jsonb_array_elements(v_payload->'materials'->'usedByCategory') x
  union all
  select v_id, 'top_material:' || (x->>'name'), (x->>'quantity')::numeric
  from jsonb_array_elements(v_payload->'materials'->'topUsed') x;

  -- Tidsserie: én række pr. delperiode og nøgletal, med delperiodens
  -- grænser i period_start/period_end (ovenstående rækker har null =
  -- hele snapshottets periode). Buckets er lokale tidspunkter i p_tz og
  -- skæres til snapshottets periode, så en delvis første/sidste
  -- delperiode (fx Q3 for 23.-29. sep.) har sine faktiske grænser.
  insert into public.statistics_values (snapshot_id, name, value, period_start, period_end)
  select v_id,
         'development:' || k.metric,
         (x->>k.metric)::numeric,
         greatest(b.bucket_start, v_start),
         least(b.bucket_end, v_end)
  from jsonb_array_elements(v_payload->'taskDevelopment') x
  cross join lateral (
    select (x->>'bucket')::timestamp at time zone p_tz as bucket_start,
           ((x->>'bucket')::timestamp + v_step) at time zone p_tz as bucket_end
  ) b
  cross join (values ('created'), ('completed')) as k(metric);

  return v_id;
end;
$$;

revoke execute on function public.save_statistics_snapshot(timestamptz, timestamptz, text, text, text) from public, anon;
grant  execute on function public.save_statistics_snapshot(timestamptz, timestamptz, text, text, text) to authenticated;


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
alter table public.data_layer_item_units   enable row level security;
alter table public.data_layer_item_unit_history enable row level security;
alter table public.data_layer_favorites    enable row level security;
alter table public.tasks                   enable row level security;
alter table public.task_rooms              enable row level security;
alter table public.task_room_roles         enable row level security;
alter table public.task_room_favorites     enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.task_assignees          enable row level security;
alter table public.task_participants       enable row level security;
alter table public.task_requests           enable row level security;
alter table public.task_materials          enable row level security;
alter table public.task_material_units     enable row level security;
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

-- Dokumenteret fra DB-eksport 2026-09-11: policyen fandtes i databasen,
-- men stod ikke i denne fil. Den er forudsætningen for at en bruger UDEN
-- (eller med en anden) aktiv organisation kan vælge en organisation i
-- "Anmod om medlemskab"-dropdownen på Organisation-fanen - "Se egen
-- organisation" ovenfor ville ellers skjule hele listen for netop den
-- bruger, der har brug for den.
--
-- Konsekvens: navn og id på ALLE organisationer er læsbare for enhver
-- indlogget bruger. Bevidst afvejning - en organisation skal kunne findes
-- for at man kan anmode om at blive medlem. Ingen data BAG organisationen
-- eksponeres: alle øvrige tabeller er stadig scopet til
-- auth_profile_org().
create policy "Alle autentificerede kan se organisationsliste"
  on public.organisations for select
  to authenticated
  using (true);

create policy "Opret organisation (bootstrap)"
  on public.organisations for insert
  to authenticated
  with check (true);

create policy "Rediger egen organisation"
  on public.organisations for update
  to authenticated
  using (id = public.auth_profile_org() and public.has_privilege_or_admin('update_organisation'));

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
    public.has_privilege_or_admin('read_invitations')
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
-- 16.3 ROLES (Fase 3: create/read/update/delete_roles erstatter
-- manage_roles - se studerende1-plan.md "Fase 3" for domæne-mappingen.
-- update_roles dækker OGSÅ at redigere en rolles privilegier, se 16.4.)
-- ---------------------------------------------------------------------
-- Bugfix 2026-09-15 #1 (samme rodårsag som privileges-fixet ovenfor): den
-- oprindelige Fase 3-version gated ALLE læsninger bag read_roles/admin,
-- hvilket også blokerede profileApi.ts's lookupName('roles', roleId) -
-- brugt til at vise EGET rollenavn på profilsiden (/bruger). Uden
-- read_roles blev opslaget tavst RLS-filtreret til ingen række, så
-- profilsiden viste "Ingen rolle tildelt", selvom brugeren havde en
-- rolle. Først rettet med en gren for at se SIN EGEN rolle-række.
--
-- Bugfix 2026-09-15 #2 (fundet ved merge med origin/main): en ny
-- besked-funktions kontaktliste (contactListComponent.tsx) bruger
-- roleApi.ts's getOrganisationMembers() til at vise ALLE medlemmers
-- rollenavne, ikke kun ens eget - egen-rolle-grenen fra #1 var derfor
-- ikke nok. roles-tabellen indeholder kun id/name/organisation_id -
-- intet følsomt (det følsomme er PRIVILEGE-LISTEN pr. rolle, stadig
-- gated i 16.4 nedenfor) - så SELECT er åbnet helt for org-medlemmer
-- igen, samme adfærd som før Fase 3. read_roles bevarer sin betydning
-- for privileges-tabellen.
create policy "Se roller i egen organisation"
  on public.roles for select
  to authenticated
  using (organisation_id = public.auth_profile_org());

create policy "Opret roller i egen organisation"
  on public.roles for insert
  to authenticated
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('create_roles')
  );

create policy "Rediger roller i egen organisation"
  on public.roles for update
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('update_roles')
  );

create policy "Slet roller i egen organisation"
  on public.roles for delete
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('delete_roles')
  );


-- ---------------------------------------------------------------------
-- 16.4 PRIVILEGES (Fase 3: at ændre en rolles privilegie-sæt er en
-- update af rollen, derfor update_roles - ikke splittet yderligere)
-- ---------------------------------------------------------------------
-- Bugfix 2026-09-15 (fundet under browser-test): den oprindelige Fase
-- 3-version gated ALLE læsninger bag read_roles/admin, hvilket også
-- blokerede getMyPrivileges() - hver brugers egen læsning af SIN EGEN
-- rolles privilegier (til useHasPrivilege/client-side UI-gating). Tilføjet
-- en gren, der altid tillader en bruger at se privilegierne på egen
-- aktuelle rolle, uanset read_roles. Den org-brede administrative læsning
-- (alle roller) forbliver gated af read_roles/admin.
create policy "Se privilegier i egen organisation"
  on public.privileges for select
  to authenticated
  using (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
    and (
      public.has_privilege_or_admin('read_roles')
      or role_id in (
        select role_id from public.memberships
        where user_id = auth.uid() and organisation_id = public.auth_profile_org()
      )
    )
  );

-- Escalation-guard (sikkerhed): en bruger med kun update_roles må ikke
-- kunne oprette/omdøbe et privilegie TIL "admin" - kun en reel admin må.
-- WITH CHECK ser det NYE (post-update) navn.
-- 2026-09-19: strammet yderligere - "admin" må nu kun ligge på rollen der
-- reelt hedder "Admin" (tidligere kunne enhver admin give admin-
-- privilegiet til en VILKÅRLIG rolle). Frontend-matrixen tilbyder derfor nu
-- en "Vælg alle/Fjern alle"-knap for andre roller i stedet for at kunne
-- tildele selve admin-privilegiet - se MatrixCell.tsx og
-- NON_ADMIN_KNOWN_PRIVILEGE_NAMES (privilegeApi.ts). Ingen datamigrering af
-- evt. eksisterende ikke-Admin-roller, der allerede havde privilegiet før
-- denne stramning - kun fremadrettet lås.
create policy "Opret privilegier i egen organisation"
  on public.privileges for insert
  to authenticated
  with check (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('update_roles')
    and (
      name <> 'admin'
      or (
        public.has_privilege('admin')
        and exists (select 1 from public.roles r where r.id = role_id and r.name = 'Admin')
      )
    )
  );

create policy "Rediger privilegier i egen organisation"
  on public.privileges for update
  to authenticated
  using (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('update_roles')
  )
  with check (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('update_roles')
    and (
      name <> 'admin'
      or (
        public.has_privilege('admin')
        and exists (select 1 from public.roles r where r.id = role_id and r.name = 'Admin')
      )
    )
  );

create policy "Slet privilegier i egen organisation"
  on public.privileges for delete
  to authenticated
  using (
    role_id in (select id from public.roles where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('update_roles')
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
    or (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('read_membership_requests'))
  );

create policy "Accepter/afvis anmodninger i egen organisation"
  on public.membership_requests for update
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('update_membership_requests')
  );


-- ---------------------------------------------------------------------
-- 16.6 LOCATIONS / DATA LAYER CATEGORIES / DATA LAYER ITEMS
-- (Studerende 2's domæne. Fase 3 (2026-09-15): create/read/update/
-- delete_datalayer erstatter den tidligere åbne adgang for alle org-
-- medlemmer - LÆSNING gates nu også, ikke kun skrivning. Frontend-
-- gating bygget og godkendt af Studerende 2 samtidig, se
-- docs/studerende1-plan.md "Fase 3".)
-- ---------------------------------------------------------------------
create policy "Se lokationer i egen organisation"
  on public.locations for select
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('read_datalayer'));

create policy "Opret lokationer i egen organisation"
  on public.locations for insert
  to authenticated
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('create_datalayer'));

create policy "Rediger lokationer i egen organisation"
  on public.locations for update
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_datalayer'))
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_datalayer'));

create policy "Slet lokationer i egen organisation"
  on public.locations for delete
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('delete_datalayer'));

create policy "Se datalayer-kategorier i egen organisation"
  on public.data_layer_categories for select
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('read_datalayer'));

create policy "Opret datalayer-kategorier i egen organisation"
  on public.data_layer_categories for insert
  to authenticated
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('create_datalayer'));

create policy "Rediger datalayer-kategorier i egen organisation"
  on public.data_layer_categories for update
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_datalayer'))
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_datalayer'));

create policy "Slet datalayer-kategorier i egen organisation"
  on public.data_layer_categories for delete
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('delete_datalayer'));

create policy "Se datalayer-items i egen organisation"
  on public.data_layer_items for select
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('read_datalayer'));

create policy "Opret datalayer-items i egen organisation"
  on public.data_layer_items for insert
  to authenticated
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('create_datalayer'));

create policy "Rediger datalayer-items i egen organisation"
  on public.data_layer_items for update
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_datalayer'))
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_datalayer'));

create policy "Slet datalayer-items i egen organisation"
  on public.data_layer_items for delete
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('delete_datalayer'));


-- ---------------------------------------------------------------------
-- 16.6b DATA LAYER ITEM UNITS (US-42, 2026-09-23)
-- Spejler 16.6's data_layer_items-policies 1:1, genbruger samme
-- granulære privilegier.
-- ---------------------------------------------------------------------
create policy "Se item-enheder i egen organisation"
  on public.data_layer_item_units for select
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('read_datalayer'));

create policy "Opret item-enheder i egen organisation"
  on public.data_layer_item_units for insert
  to authenticated
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('create_datalayer'));

create policy "Rediger item-enheder i egen organisation"
  on public.data_layer_item_units for update
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_datalayer'))
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_datalayer'));

create policy "Slet item-enheder i egen organisation"
  on public.data_layer_item_units for delete
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('delete_datalayer'));


-- ---------------------------------------------------------------------
-- 16.6c DATA LAYER FAVORITES (ad-hoc, 2026-09-25)
-- Kun egne rækker i aktiv org; read_datalayer er nok (en favorit ændrer
-- ikke data). Insert kræver desuden, at målet tilhører egen org. Ingen
-- update-policy - toggle = insert/delete.
-- ---------------------------------------------------------------------
create policy "Se egne datalager-favoritter"
  on public.data_layer_favorites for select
  to authenticated
  using (
    user_id = auth.uid()
    and organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('read_datalayer')
  );

create policy "Opret egne datalager-favoritter"
  on public.data_layer_favorites for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('read_datalayer')
    and (category_id is null or exists (
      select 1 from public.data_layer_categories c
      where c.id = category_id and c.organisation_id = public.auth_profile_org()
    ))
    and (location_id is null or exists (
      select 1 from public.locations l
      where l.id = location_id and l.organisation_id = public.auth_profile_org()
    ))
  );

create policy "Slet egne datalager-favoritter"
  on public.data_layer_favorites for delete
  to authenticated
  using (
    user_id = auth.uid()
    and organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('read_datalayer')
  );


-- ---------------------------------------------------------------------
-- 16.6d DATA LAYER ITEM UNIT HISTORY (2026-09-29)
-- Kun læsning, med read_datalayer eller read_statistics. Ingen skrive-
-- policies - kun triggeren §15.21d (security definer) skriver.
-- ---------------------------------------------------------------------
create policy "Se lagerhistorik i egen organisation"
  on public.data_layer_item_unit_history for select
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and (public.has_privilege_or_admin('read_datalayer') or public.has_privilege_or_admin('read_statistics'))
  );


-- ---------------------------------------------------------------------
-- 16.7 TASKS / TASK_ASSIGNEES / TASK_PARTICIPANTS / TASK_MATERIALS
-- (Studerende 3's domæne. Fase 3 trin 6 (2026-09-17, docs/migrations/
-- fase3-tasks-privileges.sql): create/read/update/delete_tasks erstatter
-- den tidligere åbne adgang for alle org-medlemmer - LÆSNING gates nu
-- også. Godkendt af bruger 2026-09-17 i forbindelse med CRUD på
-- Afsluttede opgaver (US-70, CompletedTasksPanel.tsx). task_assignees'
-- selvbetjening (til-/afmeld sig selv) er bevaret uafhængigt af
-- privilegier; tilmelde/afmelde EN ANDEN kræver assign_tasks (US-76,
-- 2026-09-19; før update_tasks, rettet
-- 2026-09-17, oprindeligt split på create_tasks/delete_tasks - se
-- kommentaren ved task_assignees' insert/delete-policies nedenfor).
-- "Medlem"-standardrollen (15.6b) har read_tasks som udgangspunkt (se
-- 15.8). Rolle-begrænsede rum (2026-09-25): select kræver desuden
-- can_access_task_room(room_id) eller is_task_assignee(id); insert/update
-- kan ikke placere en opgave i et rum, man ikke har adgang til.)
-- Afsluttede opgaver (2026-09-27): status 'Completed' kræver desuden
-- view_completed_tasks ("Opgaver — Se afsluttede") eller admin - ELLER at
-- man er tilmeldt (is_task_assignee), så egne afsluttede opgaver og
-- notifikations-links virker. Privilegiet blev backfillet til alle roller
-- med update_tasks eller delete_tasks (ikke Medlem, 15.6d). Bruges af
-- fanen "Afsluttede" (/tasks/afsluttede) og dashboardets panel. Før var
-- afsluttede opgaver kun UI-gated på update/delete_tasks.
-- ---------------------------------------------------------------------
create policy "Se opgaver i egen organisation"
  on public.tasks for select
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('read_tasks')
    and (public.can_access_task_room(room_id) or public.is_task_assignee(id))
    and (
      status <> 'Completed'
      or public.has_privilege_or_admin('view_completed_tasks')
      or public.is_task_assignee(id)
    )
  );

create policy "Opret opgaver i egen organisation"
  on public.tasks for insert
  to authenticated
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('create_tasks')
    and public.can_access_task_room(room_id)
  );

create policy "Rediger opgaver i egen organisation"
  on public.tasks for update
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('update_tasks')
  )
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('update_tasks')
    and public.can_access_task_room(room_id)
  );

create policy "Slet opgaver i egen organisation"
  on public.tasks for delete
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('delete_tasks'));

create policy "Se task_assignees for opgaver i egen organisation"
  on public.task_assignees for select
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('read_tasks')
  );

-- US-76 (2026-09-19): regler for tilmelding/afmelding. Selv-tilmelding er
-- frivillig og uafhængig af privilegier: man kan se sine egne rækker, tilmelde
-- sig selv (assigned_by = egen id) og afmelde sig selv - men KUN hvis man selv
-- tilmeldte sig (ikke hvis en anden tilføjede en) og KUN mens opgaven er
-- Started. Ingen update. Tilføjet af en anden = tildeling: kan ikke afmelde
-- sig, men kan stadig påbegynde/melde færdig (UI, TaskCard.tsx).
create policy "Se egne task_assignees-rækker"
  on public.task_assignees for select
  to authenticated
  using (
    user_id = auth.uid()
    and task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
  );

create policy "Tilmeld sig selv til opgaver i egen organisation"
  on public.task_assignees for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and assigned_by = auth.uid()
    and task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
  );

create policy "Afmeld sig selv fra opgaver i egen organisation"
  on public.task_assignees for delete
  to authenticated
  using (
    user_id = auth.uid()
    and assigned_by = auth.uid()
    and task_id in (
      select id from public.tasks
      where organisation_id = public.auth_profile_org() and status = 'Started'
    )
  );

-- Tilmelde/afmelde EN ANDEN (tilføj/fjern medarbejder i TaskCard.tsx) kræver
-- assign_tasks ("Opgaver — Tildel", US-76, 2026-09-19). Før: update_tasks
-- (2026-09-17). Migrationen backfillede assign_tasks til alle roller med
-- update_tasks. Også muligt mens opgaven er InProgress (nødudgang).
create policy "Tilmeld andre til opgaver i egen organisation"
  on public.task_assignees for insert
  to authenticated
  with check (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('assign_tasks')
  );

create policy "Afmeld andre fra opgaver i egen organisation"
  on public.task_assignees for delete
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('assign_tasks')
  );

-- assigned_by kan ikke forfalskes: sættes altid til auth.uid() ved insert.
create or replace function public.set_task_assignee_assigned_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.assigned_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger trg_set_task_assignee_assigned_by
  before insert on public.task_assignees
  for each row execute function public.set_task_assignee_assigned_by();

create policy "Se task_participants for opgaver i egen organisation"
  on public.task_participants for select
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('read_tasks')
  );

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

create policy "Se task_materials for opgaver i egen organisation"
  on public.task_materials for select
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('read_tasks')
  );

-- US-42 (2026-09-23): den tidligere "for all"-policy er erstattet af kun
-- delete - insert/opdatering af reservationer sker udelukkende via
-- reserve_item_units/release_item_units/resolve_task_material_units
-- (§15.21, SECURITY DEFINER, omgår RLS), ellers kunne en rå insert skabe
-- en linje uden linkede enheder og bryde reservationsgarantien. Samme
-- mønster som §15.19 brugte for task_requests.
create policy "Slet task_materials for opgaver i egen organisation"
  on public.task_materials for delete
  to authenticated
  using (
    task_id in (select id from public.tasks where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('update_tasks')
  );


-- ---------------------------------------------------------------------
-- 16.7a TASK_REQUESTS (US-75)
-- Ingen UPDATE-policy: behandling sker udelukkende via 15.19's RPC'er.
-- Godkendere (approve_task/reject_task) kan læse uden read_tasks.
-- ---------------------------------------------------------------------
create policy "Se task requests i egen organisation"
  on public.task_requests for select
  to authenticated
  using (
    task_id in (select t.id from public.tasks t where t.organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('read_tasks')
  );

create policy "Se task requests som godkender"
  on public.task_requests for select
  to authenticated
  using (
    task_id in (select t.id from public.tasks t where t.organisation_id = public.auth_profile_org())
    and (public.has_privilege_or_admin('approve_task') or public.has_privilege_or_admin('reject_task'))
  );

create policy "Opret completion request for egne tasks"
  on public.task_requests for insert
  to authenticated
  with check (
    requested_by = auth.uid()
    and task_id in (select ta.task_id from public.task_assignees ta where ta.user_id = auth.uid())
    and task_id in (select t.id from public.tasks t where t.organisation_id = public.auth_profile_org())
  );


-- ---------------------------------------------------------------------
-- 16.7b TASK_ROOMS (Studerende 3's domæne)
-- Fase 3 trin 6 (2026-09-17): samme create/read/update/delete_tasks-
-- gating som 16.7. De to engelske dubletpolicies fra den oprindelige
-- DB-eksport ("Users can view/create task rooms in their organisation")
-- er droppet samtidig med at "Medlemmer kan administrere ..." blev
-- splittet op - ellers ville RLS-policies OR'es og gøre gatingen af
-- INSERT/SELECT virkningsløs. 2026-09-25: select/update/delete kræver
-- desuden can_access_task_room(id) (§15.22).
-- ---------------------------------------------------------------------
create policy "Se task rooms i egen organisation"
  on public.task_rooms for select
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('read_tasks')
    and public.can_access_task_room(id)
  );

create policy "Rediger task rooms i egen organisation"
  on public.task_rooms for update
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('update_tasks')
    and public.can_access_task_room(id)
  )
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('update_tasks')
  );

create policy "Slet task rooms i egen organisation"
  on public.task_rooms for delete
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('delete_tasks')
    and public.can_access_task_room(id)
  );

-- task_room_roles: kun select. Skrivning sker udelukkende via
-- create_task_room/update_task_room (§15.22, security definer) eller
-- cascade - samme mønster som task_material_units (§16.7c).
create policy "Se task_room_roles for rum i egen organisation"
  on public.task_room_roles for select
  to authenticated
  using (room_id in (select id from public.task_rooms));


-- ---------------------------------------------------------------------
-- 16.7d TASK_ROOM_FAVORITES (ad-hoc, 2026-09-26)
-- Kun egne rækker i aktiv org; read_tasks er nok (en favorit ændrer ikke
-- data). Insert kræver desuden, at rummet tilhører egen org og at
-- brugeren må se det (can_access_task_room, §15.22). Ingen update-policy.
-- ---------------------------------------------------------------------
create policy "Se egne favoritrum"
  on public.task_room_favorites for select
  to authenticated
  using (
    user_id = auth.uid()
    and organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('read_tasks')
  );

create policy "Opret egne favoritrum"
  on public.task_room_favorites for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('read_tasks')
    and exists (
      select 1 from public.task_rooms r
      where r.id = room_id and r.organisation_id = public.auth_profile_org()
    )
    and public.can_access_task_room(room_id)
  );

create policy "Slet egne favoritrum"
  on public.task_room_favorites for delete
  to authenticated
  using (
    user_id = auth.uid()
    and organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('read_tasks')
  );


-- ---------------------------------------------------------------------
-- 16.7e NOTIFICATION_PREFERENCES (US-79, 2026-09-27)
-- Kun egen række; intet privilegie (personlig indstilling). Ingen
-- delete-policy - frontend upserter.
-- ---------------------------------------------------------------------
create policy "Se egne notifikationsindstillinger"
  on public.notification_preferences for select
  to authenticated
  using (user_id = auth.uid());

create policy "Opret egne notifikationsindstillinger"
  on public.notification_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Rediger egne notifikationsindstillinger"
  on public.notification_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- 16.7c TASK_MATERIAL_UNITS (US-42, 2026-09-23)
-- Kun select - rækker oprettes/slettes udelukkende via RPC'erne i §15.21
-- (SECURITY DEFINER, omgår RLS) eller via cascade (omgår også RLS).
-- ---------------------------------------------------------------------
create policy "Se task_material_units for opgaver i egen organisation"
  on public.task_material_units for select
  to authenticated
  using (
    task_material_id in (
      select tm.id from public.task_materials tm
      join public.tasks t on t.id = tm.task_id
      where t.organisation_id = public.auth_profile_org()
    )
    and public.has_privilege_or_admin('read_tasks')
  );


-- ---------------------------------------------------------------------
-- 16.8 STATISTICS SNAPSHOTS / VALUES
-- Læsning kræver read_statistics, sletning delete_statistics (values
-- cascader). Ingen insert-policy: snapshots skrives KUN via
-- save_statistics_snapshot (§15.26c, create_statistics). Ingen
-- update-policy: et gemt snapshot ændres aldrig (US-52).
-- 2026-09-29: de dublerede "Users can view own organisation statistics
-- snapshots/values"-policies (to public, drift) og de gamle "Medlemmer kan
-- oprette ..."-insert-policies er droppet.
-- ---------------------------------------------------------------------
create policy "Se statistik-snapshots i egen organisation"
  on public.statistics_snapshots for select
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('read_statistics')
  );

create policy "Se statistik-værdier for egen organisation"
  on public.statistics_values for select
  to authenticated
  using (
    snapshot_id in (select id from public.statistics_snapshots where organisation_id = public.auth_profile_org())
    and public.has_privilege_or_admin('read_statistics')
  );

create policy "Slet statistik-snapshots i egen organisation"
  on public.statistics_snapshots for delete
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('delete_statistics')
  );


-- ---------------------------------------------------------------------
-- 16.9 NEWS (US-56 - org-scoped. Fase 3: create/read/update/delete_news
-- erstatter manage_news, inkl. LÆSNING som nu også gates - "Medlem"-
-- standardrollen (15.6b) har read_news som udgangspunkt. Oprindeligt
-- global+select-only+service-role-sync; ændret efter afklaring med
-- bruger, se 13. news_sources-policyen er fjernet igen sammen med
-- tabellen, da US-57 udgik.)
-- ---------------------------------------------------------------------
create policy "Se nyheder i egen organisation"
  on public.news for select
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('read_news'));

create policy "Opret nyheder i egen organisation"
  on public.news for insert
  to authenticated
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('create_news'));

create policy "Rediger nyheder i egen organisation"
  on public.news for update
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_news'))
  with check (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('update_news'));

create policy "Slet nyheder i egen organisation"
  on public.news for delete
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('delete_news'));


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
-- rolle"/update_roles-policies (Fase 3, tidligere manage_roles) - en
-- bruger med kun update_roles må ikke kunne give sig selv/andre en
-- rolle, der bærer admin-privilegiet - kun en reel admin må det. WITH
-- CHECK ser den NYE (post-update) role_id.
--
-- BUGFIX 2026-09-11 (fundet ved en skema-eksport, ikke under test):
-- subqueryen stod oprindeligt som `where p.role_id = role_id`. Et
-- ukvalificeret kolonnenavn opløses til den INDERSTE tabel, så Postgres
-- gemte udtrykket som `p.role_id = p.role_id` - altid sandt.
-- `not exists (...)` blev dermed altid falsk, og guarden ramte alt for
-- bredt: en bruger med manage_roles men uden admin kunne ikke tildele
-- NOGEN rolle overhovedet, kun "ingen rolle" (role_id = null).
-- Aldrig opdaget under test, fordi en fuld administrator kortslutter
-- OR-udtrykket på public.has_privilege('admin') og derfor er upåvirket.
-- Rettet til en eksplicit `memberships.role_id`-kvalificering nedenfor.
-- SQL'en er kørt og testet i browseren 2026-09-11.
create policy "Tildel rolle til medlemskaber i egen organisation"
  on public.memberships for update
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('update_roles')
  )
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('update_roles')
    and (
      public.has_privilege('admin')
      or memberships.role_id is null
      or not public.role_has_privilege(memberships.role_id, 'admin')
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
    or (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('read_invitations'))
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
    and public.has_privilege_or_admin('delete_invitations')
    and status = 'Pending'
  );
