-- =====================================================================
-- SEED 99 - NULSTIL (sletter mockdata for Roskilde Festival)
-- Bruges når mockdata skal rettes: kør denne, derefter 01 -> 06 igen.
--
-- BEVARER: organisationen, Admin/Medlem og egne roller, dit eget medlemskab.
-- SLETTER i organisationen: de 8 seed-roller samt ALLE opgaver, rum,
-- nyheder, kategorier, varer, enheder, lokationer, statistik-snapshots, lager- og
-- opgavehistorik og udmeldinger - også data
-- du selv har oprettet manuelt (tabellerne skelner ikke mock fra rigtigt).
-- Sletter desuden alle brugere med email @ponos-mock.test.
-- Rækkefølgen skyldes fremmednøgler.
-- =====================================================================
do $$
declare
  v_org uuid;
begin
  select id into v_org from public.organisations where lower(trim(name)) = 'roskilde festival';
  if v_org is null then
    raise exception 'Organisationen "Roskilde Festival" findes ikke.';
  end if;

  -- Notifikationer der peger på seedet data (før målene slettes).
  delete from public.notifications n
  where n.user_id in (select id from public.profiles where email like '%@ponos-mock.test')
     or (n.organisation_id = v_org and n.reference_id in (
          select id from public.tasks where organisation_id = v_org
          union all
          select tr.id from public.task_requests tr join public.tasks t on t.id = tr.task_id where t.organisation_id = v_org
          union all
          select c.id from public.conversations c join public.tasks t on t.id = c.task_id where t.organisation_id = v_org
          union all
          select id from public.membership_requests where organisation_id = v_org
          union all
          select id from public.membership_invitations where organisation_id = v_org
        ));

  -- Opgaver: cascader tildelinger, anmodninger, materialer (trigger
  -- frigiver enhederne) og opgave-chats (conversations.task_id).
  delete from public.tasks where organisation_id = v_org;

  -- Rum: cascader rolle-låse, favoritter og rum-chats.
  delete from public.task_rooms where organisation_id = v_org;

  delete from public.news where organisation_id = v_org;

  -- Statistik-snapshots: cascader statistics_values.
  delete from public.statistics_snapshots where organisation_id = v_org;

  -- Datalager: varer cascader enheder.
  delete from public.data_layer_favorites where organisation_id = v_org;
  delete from public.data_layer_items where organisation_id = v_org;
  delete from public.data_layer_categories where organisation_id = v_org;
  delete from public.locations where organisation_id = v_org;

  -- Lagerhistorik: triggeren har lukket rækkerne for de slettede enheder,
  -- men de overlever sletningen (ingen FK) - fjern dem, så et nyt seed får
  -- en ren historik.
  delete from public.data_layer_item_unit_history where organisation_id = v_org;

  -- Seed-roller (kun dem fra 01 - egne roller bevares): medlemmer flyttes
  -- til Medlem af trigger, privilegier cascader.
  delete from public.roles
  where organisation_id = v_org
    and name in ('Festivalledelse', 'Frivilligkoordinator', 'Lagerchef', 'Lagermedarbejder',
                 'Holdleder', 'Teknik & El', 'Sikkerhed & Vagt', 'Frivillig');

  -- Mock-brugere: cascader profiler, medlemskaber, ansøgninger og invitationer.
  delete from auth.users where email like '%@ponos-mock.test';

  -- Historik der overlever sletningerne (ingen FK til opgave/bruger):
  -- opgave-statushistorik og udmeldinger (også dem trigger'en lige har
  -- lavet for de slettede mock-medlemskaber).
  delete from public.task_status_history where organisation_id = v_org;
  delete from public.membership_departures where organisation_id = v_org;

  raise notice 'Mockdata slettet for Roskilde Festival.';
end $$;
