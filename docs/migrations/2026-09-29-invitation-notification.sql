-- 2026-09-29: notifikation ved invitation til organisation (US-67-udvidelse).
-- Den inviterede bruger får en 'membership_invitation'-notifikation, når
-- en række indsættes i membership_invitations (invite_member, §15.16).
-- Besvaret invitation (Accepted/Rejected) -> notifikationen markeres læst.
-- Slettet invitation (annulleret af admin, eller organisationen slettet)
-- -> notifikationen slettes, så den ikke peger på noget der ikke findes.
-- skip_muted_notification (§15.20c) gælder automatisk.
--
-- Status: IKKE KØRT.
--
-- ---------------------------------------------------------------------
-- PREFLIGHT (read-only) - kør først, og tjek:
--   1) typelisten matcher den nedenfor (ellers skal den rettes før kørsel)
--   2) SELECT-policyen på notifications filtrerer på user_id, ikke på
--      organisation (modtageren er jo endnu ikke medlem af organisationen)
--
-- select pg_get_constraintdef(oid)
-- from pg_constraint
-- where conname = 'notifications_type_check';
--
-- select policyname, cmd, qual
-- from pg_policies
-- where schemaname = 'public' and tablename = 'notifications';
-- ---------------------------------------------------------------------


-- 1. Ny notifikationstype
alter table public.notifications drop constraint notifications_type_check;

alter table public.notifications add constraint notifications_type_check
  check (type = any (array[
    'message', 'task_assigned', 'task_updated', 'task_completed',
    'task_approved', 'task_rejected', 'news', 'task_favorite_room',
    'membership_invitation'
  ]));


-- 2. Notifikation til den inviterede ved ny invitation. title er en fast
-- dansk etiket (frontend oversætter via type), body er organisationens navn.
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


-- 3. Oprydning: besvaret -> læst, slettet -> notifikationen slettes.
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


-- ---------------------------------------------------------------------
-- ROLLBACK:
-- drop trigger if exists trg_sync_membership_invitation_notification on public.membership_invitations;
-- drop trigger if exists trg_notify_membership_invitation on public.membership_invitations;
-- drop function if exists public.sync_membership_invitation_notification();
-- drop function if exists public.notify_membership_invitation();
-- delete from public.notifications where type = 'membership_invitation';
-- alter table public.notifications drop constraint notifications_type_check;
-- alter table public.notifications add constraint notifications_type_check
--   check (type = any (array[
--     'message', 'task_assigned', 'task_updated', 'task_completed',
--     'task_approved', 'task_rejected', 'news', 'task_favorite_room'
--   ]));
-- ---------------------------------------------------------------------
