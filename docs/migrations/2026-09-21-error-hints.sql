-- docs/migrations/2026-09-21-error-hints.sql
--
-- User story: sprogvælger / i18n (Fase 5) - oversættelse af DB-fejl.
-- Status: KØRT 2026-09-21 ("Success. No rows returned").
--
-- MÅ SLETTES, MEN FØRST EFTER DEN ER COMMITTET. Filen er den eneste
-- kilde i repoet til definitionerne på de ni samtale-/besked-funktioner,
-- som aldrig er kommet ind i dbSchema.sql (se drift-noten øverst dér).
-- Slettes den før commit, findes de ikke længere noget sted.
--
-- Tilføjer en stabil fejlkode som `hint` til hver brugervendt
-- raise exception, så frontenden kan oversætte beskeden.
--
-- Den danske tekst i `message` er UÆNDRET. Kender klienten ikke koden,
-- vises den danske tekst som før - derfor kan migrationen køres uden at
-- frontenden er opdateret først, og omvendt.
--
-- 29 funktioner, 108 raise exception, 74 distinkte koder.
-- Genereret ud fra det faktiske skema (docs/exportSchema.sql), ikke fra
-- dbSchema.sql - den var drevet fra virkeligheden.
--
-- RULLES TILBAGE ved at køre samme funktioner fra dbSchema.sql igen;
-- hint er ren tilføjelse og ændrer ingen logik.

begin;

-- public.add_group_participants(p_conversation_id uuid, p_user_ids uuid[])  (8 beskeder)
CREATE OR REPLACE FUNCTION public.add_group_participants(p_conversation_id uuid, p_user_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public, pg_catalog'
AS $function$
declare
  v_caller_id uuid := auth.uid();
  v_caller_org uuid;
  v_conversation_org uuid;
  v_conversation_name text;
  v_is_group boolean;
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

  select c.is_group, c.organisation_id, c.name
    into v_is_group, v_conversation_org, v_conversation_name
  from public.conversations c
  where c.id = p_conversation_id;

  if v_is_group is null then
    raise exception 'Samtalen findes ikke.' using hint = 'CONVERSATION_NOT_FOUND';
  end if;

  if not v_is_group then
    raise exception 'Der kan kun tilføjes medlemmer til gruppesamtaler.' using hint = 'ADD_MEMBERS_GROUP_ONLY';
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

-- public.approve_task_request(p_request_id uuid)  (4 beskeder)
CREATE OR REPLACE FUNCTION public.approve_task_request(p_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid := public.auth_profile_org();
  v_task_id uuid;
  v_status public.e_request_status;
  v_title text;
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not public.has_privilege_or_admin('approve_task') then
    raise exception 'Du har ikke rettigheder til at godkende opgaver.' using errcode = '42501', hint = 'NO_PRIV_APPROVE_TASKS';
  end if;

  select r.task_id, r.status, t.title into v_task_id, v_status, v_title
  from public.task_requests r
  join public.tasks t on t.id = r.task_id
  where r.id = p_request_id and t.organisation_id = v_org_id;

  if v_task_id is null then
    raise exception 'Anmodningen findes ikke i din organisation.' using hint = 'TASK_REQUEST_NOT_FOUND';
  end if;

  if v_status <> 'Pending' then
    raise exception 'Anmodningen er allerede behandlet.' using hint = 'TASK_REQUEST_ALREADY_HANDLED';
  end if;

  update public.task_requests
     set status = 'Accepted', handled_by = auth.uid(), done_at = now()
   where task_id = v_task_id and status = 'Pending';

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
$function$;

-- public.create_group_conversation(p_name text, p_participant_ids uuid[])  (5 beskeder)
CREATE OR REPLACE FUNCTION public.create_group_conversation(p_name text, p_participant_ids uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_my_id uuid := auth.uid();
  v_my_org uuid;
  v_conversation_id uuid;
  v_trimmed_name text := trim(p_name);
  v_invalid_count int;
begin
  if v_my_id is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;

  if v_trimmed_name = '' then
    raise exception 'Gruppen skal have et navn.' using hint = 'GROUP_NAME_REQUIRED';
  end if;

  if array_length(p_participant_ids, 1) is null or array_length(p_participant_ids, 1) < 1 then
    raise exception 'Vælg mindst én kontakt til gruppen.' using hint = 'GROUP_CONTACT_REQUIRED';
  end if;

  select active_organisation_id
    into v_my_org
  from profiles
  where id = v_my_id;

  if v_my_org is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  select count(*)
    into v_invalid_count
  from unnest(p_participant_ids) as pid
  where not exists (
    select 1
    from memberships m
    where m.user_id = pid
      and m.organisation_id = v_my_org
  );

  if v_invalid_count > 0 then
    raise exception 'Alle deltagere skal være medlem af din organisation.' using hint = 'PARTICIPANTS_MUST_BE_IN_ORG';
  end if;

  insert into conversations (organisation_id, is_group, name, created_by)
  values (v_my_org, true, v_trimmed_name, v_my_id)
  returning id into v_conversation_id;

  insert into conversation_participants (conversation_id, user_id)
  select v_conversation_id, pid
  from unnest(p_participant_ids) as pid
  on conflict do nothing;

  insert into conversation_participants (conversation_id, user_id)
  values (v_conversation_id, v_my_id)
  on conflict do nothing;

  return v_conversation_id;
end;
$function$;

-- public.create_organisation(p_name text)  (2 beskeder)
CREATE OR REPLACE FUNCTION public.create_organisation(p_name text)
 RETURNS organisations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  insert into public.privileges (role_id, name)
  values (v_member_role_id, 'read_news'), (v_member_role_id, 'read_tasks');

  insert into public.memberships (user_id, organisation_id, role_id)
  values (v_user_id, v_org.id, v_admin_role_id);

  perform set_config('ponos.bypass_self_role_org_change', 'true', true);

  update public.profiles
    set active_organisation_id = v_org.id
    where id = v_user_id;

  return v_org;
end;
$function$;

-- public.delete_message(p_message_id uuid)  (3 beskeder)
CREATE OR REPLACE FUNCTION public.delete_message(p_message_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_caller_id uuid := auth.uid();
  v_sender_id uuid;
  v_deleted_at timestamptz;
begin
  if v_caller_id is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;

  select sender_id, deleted_at into v_sender_id, v_deleted_at
  from public.messages
  where id = p_message_id;

  if v_sender_id is null then
    raise exception 'Beskeden findes ikke.' using hint = 'MESSAGE_NOT_FOUND';
  end if;

  if v_sender_id is distinct from v_caller_id then
    raise exception 'Du kan kun slette dine egne beskeder.' using hint = 'CAN_ONLY_DELETE_OWN_MESSAGES';
  end if;

  if v_deleted_at is not null then
    return;
  end if;

  update public.messages
    set deleted_at = now()
    where id = p_message_id;
end;
$function$;

-- public.delete_organisation(p_organisation_id uuid)  (3 beskeder)
CREATE OR REPLACE FUNCTION public.delete_organisation(p_organisation_id uuid)
 RETURNS organisations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.edit_message(p_message_id uuid, p_content text)  (6 beskeder)
CREATE OR REPLACE FUNCTION public.edit_message(p_message_id uuid, p_content text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_caller_id uuid := auth.uid();
  v_conversation_id uuid;
  v_sender_id uuid;
  v_deleted_at timestamptz;
  v_latest_message_id uuid;
  v_trimmed text := btrim(p_content);
begin
  if v_caller_id is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;

  if v_trimmed = '' then
    raise exception 'Beskeden kan ikke være tom.' using hint = 'MESSAGE_EMPTY';
  end if;

  select conversation_id, sender_id, deleted_at
    into v_conversation_id, v_sender_id, v_deleted_at
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
end;
$function$;

-- public.get_or_create_direct_conversation(p_other_user_id uuid)  (4 beskeder)
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(p_other_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_my_id uuid := auth.uid();
  v_my_org uuid;
  v_conversation_id uuid;
begin
  if v_my_id is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;
  if p_other_user_id is null or p_other_user_id = v_my_id then
    raise exception 'Du kan ikke oprette en samtale med dig selv.' using hint = 'CANNOT_MESSAGE_SELF';
  end if;

  select p.active_organisation_id
    into v_my_org
  from public.profiles p
  where p.id = v_my_id;

  if v_my_org is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not exists (
    select 1
    from public.memberships m
    where m.user_id = p_other_user_id
      and m.organisation_id = v_my_org
  ) then
    raise exception 'Denne person er ikke medlem af din organisation.' using hint = 'PERSON_NOT_IN_ORG';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      least(v_my_id::text, p_other_user_id::text) || ':' ||
      greatest(v_my_id::text, p_other_user_id::text),
      0
    )
  );

  select cp1.conversation_id
    into v_conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp2.conversation_id = cp1.conversation_id
   and cp2.user_id = p_other_user_id
  join public.conversations c on c.id = cp1.conversation_id
  where cp1.user_id = v_my_id
    and c.is_group = false
    and c.organisation_id = v_my_org
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (organisation_id, is_group, created_by)
  values (v_my_org, false, v_my_id)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conversation_id, v_my_id), (v_conversation_id, p_other_user_id);

  return v_conversation_id;
end;
$function$;

-- public.get_pending_task_requests()  (2 beskeder)
CREATE OR REPLACE FUNCTION public.get_pending_task_requests()
 RETURNS TABLE(id uuid, task_id uuid, task_title text, requested_by uuid, requester_first_name text, requester_last_name text, requested_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    select r.id, r.task_id, t.title, r.requested_by, p.first_name, p.last_name, r.requested_at
    from public.task_requests r
    join public.tasks t on t.id = r.task_id
    left join public.profiles p on p.id = r.requested_by
    where r.status = 'Pending' and t.organisation_id = v_org_id
    order by r.requested_at;
end;
$function$;

-- public.invite_member(p_email text)  (5 beskeder)
CREATE OR REPLACE FUNCTION public.invite_member(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.leave_group_conversation(p_conversation_id uuid)  (5 beskeder)
CREATE OR REPLACE FUNCTION public.leave_group_conversation(p_conversation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_caller_id uuid := auth.uid();
  v_caller_org uuid;
  v_conversation_org uuid;
  v_is_group boolean;
  v_caller_name text;
  v_deleted_count int;
begin
  if v_caller_id is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;

  select c.is_group, c.organisation_id
    into v_is_group, v_conversation_org
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
  end if;
end;
$function$;

-- public.leave_organisation(p_organisation_id uuid)  (3 beskeder)
CREATE OR REPLACE FUNCTION public.leave_organisation(p_organisation_id uuid)
 RETURNS organisations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Lokal til denne transaktion (tredje argument 'true') - nulstilles
  -- automatisk ved commit, påvirker ingen andre requests. Nødvendig
  -- fordi opdateringen nedenfor er brugerens EGEN aktive organisation,
  -- hvilket trg_prevent_self_role_org_change normalt blokerer.
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
$function$;

-- public.mark_conversation_read(p_conversation_id uuid)  (3 beskeder)
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public, pg_catalog'
AS $function$
declare
  v_caller_id uuid := auth.uid();
begin
  if v_caller_id is null then
    raise exception 'Du skal være logget ind.' using hint = 'NOT_LOGGED_IN';
  end if;

  if p_conversation_id is null then
    raise exception 'Der skal angives en samtale.' using hint = 'CONVERSATION_REQUIRED';
  end if;

  if not public.is_conversation_participant(p_conversation_id, v_caller_id) then
    raise exception 'Du er ikke deltager i denne samtale.' using hint = 'NOT_CONVERSATION_PARTICIPANT';
  end if;

  update public.conversation_participants
    set last_read_at = now()
    where conversation_id = p_conversation_id
      and user_id = v_caller_id;
end;
$function$;

-- public.prevent_admin_privilege_change()  (2 beskeder)
CREATE OR REPLACE FUNCTION public.prevent_admin_privilege_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.prevent_admin_role_change()  (2 beskeder)
CREATE OR REPLACE FUNCTION public.prevent_admin_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.prevent_default_role_change()  (2 beskeder)
CREATE OR REPLACE FUNCTION public.prevent_default_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.prevent_default_role_privilege_change()  (3 beskeder)
CREATE OR REPLACE FUNCTION public.prevent_default_role_privilege_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.prevent_non_admin_role_change_on_admin_membership()  (2 beskeder)
CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_change_on_admin_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.prevent_self_membership_role_change()  (1 besked)
CREATE OR REPLACE FUNCTION public.prevent_self_membership_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(current_setting('ponos.bypass_self_membership_role_change', true), 'false') = 'true' then
    return new;
  end if;

  if new.user_id = auth.uid() and new.role_id is distinct from old.role_id then
    raise exception 'Du kan ikke tildele dig selv en rolle.' using hint = 'CANNOT_ASSIGN_OWN_ROLE';
  end if;
  return new;
end;
$function$;

-- public.prevent_self_role_org_change()  (1 besked)
CREATE OR REPLACE FUNCTION public.prevent_self_role_org_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.id = auth.uid()
     and coalesce(current_setting('ponos.bypass_self_role_org_change', true), 'false') <> 'true' then
    if new.active_organisation_id is distinct from old.active_organisation_id then
      raise exception 'Du kan ikke ændre din aktive organisation direkte.' using hint = 'CANNOT_CHANGE_ACTIVE_ORG_DIRECTLY';
    end if;
  end if;
  return new;
end;
$function$;

-- public.reject_task_request(p_request_id uuid)  (4 beskeder)
CREATE OR REPLACE FUNCTION public.reject_task_request(p_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid := public.auth_profile_org();
  v_task_id uuid;
  v_status public.e_request_status;
  v_title text;
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if not public.has_privilege_or_admin('reject_task') then
    raise exception 'Du har ikke rettigheder til at afvise opgaver.' using errcode = '42501', hint = 'NO_PRIV_REJECT_TASKS';
  end if;

  select r.task_id, r.status, t.title into v_task_id, v_status, v_title
  from public.task_requests r
  join public.tasks t on t.id = r.task_id
  where r.id = p_request_id and t.organisation_id = v_org_id;

  if v_task_id is null then
    raise exception 'Anmodningen findes ikke i din organisation.' using hint = 'TASK_REQUEST_NOT_FOUND';
  end if;

  if v_status <> 'Pending' then
    raise exception 'Anmodningen er allerede behandlet.' using hint = 'TASK_REQUEST_ALREADY_HANDLED';
  end if;

  update public.task_requests
     set status = 'Rejected', handled_by = auth.uid(), done_at = now()
   where id = p_request_id;

  insert into public.notifications (user_id, organisation_id, type, title, body, link, reference_id)
  select ta.user_id, v_org_id, 'task_rejected', 'Færdigmelding afvist', v_title, '/tasks?task=' || v_task_id, v_task_id
  from public.task_assignees ta
  where ta.task_id = v_task_id and ta.user_id <> auth.uid();
end;
$function$;

-- public.remove_group_participant(p_conversation_id uuid, p_user_id uuid)  (9 beskeder)
CREATE OR REPLACE FUNCTION public.remove_group_participant(p_conversation_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public, pg_catalog'
AS $function$
declare
  v_caller_id uuid := auth.uid();
  v_caller_org uuid;
  v_conversation_org uuid;
  v_is_group boolean;
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

  select c.is_group, c.organisation_id, c.name
    into v_is_group, v_conversation_org, v_conversation_name
  from public.conversations c
  where c.id = p_conversation_id;

  if v_is_group is null then
    raise exception 'Samtalen findes ikke.' using hint = 'CONVERSATION_NOT_FOUND';
  end if;

  if not v_is_group then
    raise exception 'Der kan kun fjernes medlemmer fra gruppesamtaler.' using hint = 'REMOVE_MEMBERS_GROUP_ONLY';
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

-- public.remove_member(p_user_id uuid)  (6 beskeder)
CREATE OR REPLACE FUNCTION public.remove_member(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.rename_group_conversation(p_conversation_id uuid, p_name text)  (6 beskeder)
CREATE OR REPLACE FUNCTION public.rename_group_conversation(p_conversation_id uuid, p_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_caller_id uuid := auth.uid();
    v_is_group boolean;
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

    select is_group, name, organisation_id
    into v_is_group, v_old_name, v_conversation_org
    from conversations
    where id = p_conversation_id;

    if v_is_group is null then
        raise exception 'Samtalen findes ikke.' using hint = 'CONVERSATION_NOT_FOUND';
    end if;

    if not v_is_group then
        raise exception 'Der kan kun ændres navn på gruppesamtaler.' using hint = 'RENAME_GROUP_ONLY';
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

-- public.reset_password_prototype(p_email text, p_first_name text, p_last_name text, p_new_password text)  (2 beskeder)
CREATE OR REPLACE FUNCTION public.reset_password_prototype(p_email text, p_first_name text, p_last_name text, p_new_password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

-- public.set_active_organisation(p_organisation_id uuid)  (2 beskeder)
CREATE OR REPLACE FUNCTION public.set_active_organisation(p_organisation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.set_task_status(p_task_id uuid, p_status text)  (3 beskeder)
CREATE OR REPLACE FUNCTION public.set_task_status(p_task_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  update public.tasks
     set status = p_status::public.e_task_status,
         finished_at = case when p_status = 'Completed' then now() else null end
   where id = p_task_id;
end;
$function$;

-- public.transfer_admin_role(p_new_admin_user_id uuid)  (6 beskeder)
CREATE OR REPLACE FUNCTION public.transfer_admin_role(p_new_admin_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.validate_location_parent()  (4 beskeder)
CREATE OR REPLACE FUNCTION public.validate_location_parent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_parent_org uuid;
  v_parent_has_parent boolean;
begin
  if new.parent_location_id is null then
    return new;
  end if;

  if new.parent_location_id = new.id then
    raise exception 'En lokation kan ikke være sin egen sektion.' using hint = 'LOCATION_OWN_PARENT';
  end if;

  select organisation_id, (parent_location_id is not null)
    into v_parent_org, v_parent_has_parent
  from public.locations
  where id = new.parent_location_id;

  if not found then
    raise exception 'Det valgte lager findes ikke.' using hint = 'LOCATION_PARENT_NOT_FOUND';
  end if;

  if v_parent_has_parent then
    raise exception 'En sektion kan ikke selv have underlokationer.' using hint = 'LOCATION_SECTION_NO_CHILDREN';
  end if;

  if v_parent_org is distinct from new.organisation_id then
    raise exception 'Sektionen skal høre til samme organisation som lageret.' using hint = 'LOCATION_SECTION_ORG_MISMATCH';
  end if;

  return new;
end;
$function$;

commit;

-- ---------------------------------------------------------------------
-- ROLLBACK
--
-- `hint` er en ren tilføjelse: ingen signatur, ingen logik og ingen
-- returtype er ændret, og `message` er ord for ord den samme. Klienter
-- der ikke læser hint, mærker ingen forskel.
--
-- Skal det alligevel rulles tilbage, køres de 29 funktioner fra
-- docs/dbSchema.sql igen som de står dér (uden hint). De findes ved at
-- søge efter funktionsnavnene i kommentarerne ovenfor.
-- ---------------------------------------------------------------------
