-- =====================================================================
-- SEED 03 - LOKATIONER (lager -> sektion, højst 2 niveauer)
-- En sektion kan ikke selv have underlokationer (validate_location_parent).
-- =====================================================================
do $$
declare
  v_org uuid;
begin
  select id into v_org from public.organisations where lower(trim(name)) = 'roskilde festival';
  if v_org is null then
    raise exception 'Organisationen "Roskilde Festival" findes ikke.';
  end if;

  if exists (select 1 from public.locations where organisation_id = v_org) then
    raise exception 'Allerede seedet - kør 99_cleanup.sql først.';
  end if;

  -- Lagre (topniveau)
  insert into public.locations (organisation_id, name, description, address)
  values
    (v_org, 'Centrallager',               'Helårslager for udstyr mellem festivalerne.',          'Darupvej 19, 4000 Roskilde'),
    (v_org, 'Orange Scene',               'Festivalens største scene.',                           'Dyrskuepladsen, 4000 Roskilde'),
    (v_org, 'Arena',                      'Teltscene.',                                           'Dyrskuepladsen, 4000 Roskilde'),
    (v_org, 'Avalon',                     'Teltscene.',                                           'Dyrskuepladsen, 4000 Roskilde'),
    (v_org, 'Apollo',                     'Scene til elektronisk musik.',                         'Dyrskuepladsen, 4000 Roskilde'),
    (v_org, 'Camp Øst',                   'Campingområde øst.',                                   null),
    (v_org, 'Camp Vest',                  'Campingområde vest.',                                  null),
    (v_org, 'Frivilligcamp',              'Camp og depot for frivillige.',                        null),
    (v_org, 'Medic-telt',                 'Førstehjælp og sundhed.',                              'Dyrskuepladsen, 4000 Roskilde'),
    (v_org, 'Sikkerhedscentral',          'Vagtcentral og radiodepot.',                           'Dyrskuepladsen, 4000 Roskilde');

  -- Sektioner
  insert into public.locations (organisation_id, name, description, parent_location_id)
  select v_org, s.name, s.description, p.id
  from (values
    ('Centrallager',      'Hal 1 – Scene & teknik', 'Lyd, lys, kabler og generatorer.'),
    ('Centrallager',      'Hal 2 – Hegn & telte',   'Hegn, barrierer, telte og møbler.'),
    ('Centrallager',      'Hal 3 – Forbrugsvarer',  'Tape, kabelbindere, sække og rengøring.'),
    ('Centrallager',      'Værksted',               'Reparation og service.'),
    ('Centrallager',      'Containerplads',         'Udendørs plads til containere og tanke.'),
    ('Orange Scene',      'Backstage Orange',       null),
    ('Orange Scene',      'FOH-tårn',               'Front of house - lyd- og lyspult.'),
    ('Orange Scene',      'Scenelager Orange',      null),
    ('Arena',             'Backstage Arena',        null),
    ('Camp Øst',          'Toiletområde Øst',       null),
    ('Camp Øst',          'Affaldsstation Øst',     null),
    ('Camp Vest',         'Toiletområde Vest',      null),
    ('Camp Vest',         'Affaldsstation Vest',    null),
    ('Frivilligcamp',     'Frivilligdepot',         'Udlevering af veste, armbånd og værktøj.'),
    ('Sikkerhedscentral', 'Radiodepot',             'Ladestationer og udlevering af radioer.')
  ) as s(parent_name, name, description)
  join public.locations p on p.organisation_id = v_org and p.name = s.parent_name;

  raise notice 'Seed 03 færdig: 10 lagre, 15 sektioner.';
end $$;
