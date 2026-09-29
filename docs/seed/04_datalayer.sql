-- =====================================================================
-- SEED 04 - DATALAGER (kategorier -> varer -> enheder)
-- GENERERET af docs/seed/generate.mjs - ret dér, ikke her.
-- Kræver 03_locations.sql. 8 hovedkategorier, 24 underkategorier,
-- 90 varer, 833 enhedsrækker.
-- Enhedstyper: serienummereret (quantity 1), batch (serial null),
-- kapacitet (contents_total, niveau = quantity), enkeltstyk m. indhold.
-- =====================================================================
do $$
declare
  v_org uuid;
begin
  select id into v_org from public.organisations where lower(trim(name)) = 'roskilde festival';
  if v_org is null then
    raise exception 'Organisationen "Roskilde Festival" findes ikke.';
  end if;

  if exists (select 1 from public.data_layer_categories where organisation_id = v_org) then
    raise exception 'Allerede seedet - kør 99_cleanup.sql først.';
  end if;

  if not exists (select 1 from public.locations where organisation_id = v_org and name = 'Centrallager') then
    raise exception 'Kør 03_locations.sql først.';
  end if;

  -- Hovedkategorier
  insert into public.data_layer_categories (organisation_id, parent_category_id, title, rank)
  values
    (v_org, null, 'Scene & Teknik', 1),
    (v_org, null, 'Hegn & Afspærring', 2),
    (v_org, null, 'Telte & Møbler', 3),
    (v_org, null, 'Sanitet', 4),
    (v_org, null, 'Affald & Genbrug', 5),
    (v_org, null, 'Sikkerhed', 6),
    (v_org, null, 'Forbrugsvarer', 7),
    (v_org, null, 'Frivilligudstyr', 8);

  -- Underkategorier
  insert into public.data_layer_categories (organisation_id, parent_category_id, title, rank)
  select v_org, p.id, c.title, c.rank
  from (values
    ('Scene & Teknik', 'Lyd', 1),
    ('Scene & Teknik', 'Lys', 2),
    ('Scene & Teknik', 'Strøm & Kabler', 3),
    ('Scene & Teknik', 'Generatorer & Brændstof', 4),
    ('Hegn & Afspærring', 'Byggehegn', 1),
    ('Hegn & Afspærring', 'Barrierer', 2),
    ('Hegn & Afspærring', 'Skilte & Afmærkning', 3),
    ('Telte & Møbler', 'Telte', 1),
    ('Telte & Møbler', 'Borde & Bænke', 2),
    ('Telte & Møbler', 'Scenegulve & Podier', 3),
    ('Sanitet', 'Toiletter', 1),
    ('Sanitet', 'Vand & Håndvask', 2),
    ('Affald & Genbrug', 'Containere', 1),
    ('Affald & Genbrug', 'Sække & Poser', 2),
    ('Affald & Genbrug', 'Pant', 3),
    ('Sikkerhed', 'Brandslukning', 1),
    ('Sikkerhed', 'Førstehjælp', 2),
    ('Sikkerhed', 'Kommunikation', 3),
    ('Forbrugsvarer', 'Tape & Fastgørelse', 1),
    ('Forbrugsvarer', 'Rengøring', 2),
    ('Forbrugsvarer', 'Kontor & Print', 3),
    ('Frivilligudstyr', 'Beklædning', 1),
    ('Frivilligudstyr', 'Adgang & Armbånd', 2),
    ('Frivilligudstyr', 'Værktøj', 3)
  ) as c(parent_title, title, rank)
  join public.data_layer_categories p
    on p.organisation_id = v_org and p.title = c.parent_title and p.parent_category_id is null;

  -- Varer (item-definitioner)
  insert into public.data_layer_items (organisation_id, category_id, location_id, name, description, packaging, unit_of_measurement, package_size)
  select v_org, c.id, l.id, i.name, i.description, i.packaging, i.uom, i.package_size
  from (values
    ('Lyd', 'Hal 1 – Scene & teknik', 'Line array-højttaler', 'Hovedhøjttaler til store scener.', null, 'stk', null::numeric),
    ('Lyd', 'Hal 1 – Scene & teknik', 'Subwoofer 2x18"', null, null, 'stk', null::numeric),
    ('Lyd', 'Hal 1 – Scene & teknik', 'Mikrofon SM58', 'Dynamisk vokalmikrofon.', null, 'stk', null::numeric),
    ('Lyd', 'Hal 1 – Scene & teknik', 'Trådløst mikrofonsæt', null, 'kuffert', 'stk', null::numeric),
    ('Lyd', 'Hal 1 – Scene & teknik', 'Digital mixerpult', null, 'flightcase', 'stk', null::numeric),
    ('Lyd', 'Hal 1 – Scene & teknik', 'Monitorhøjttaler', null, null, 'stk', null::numeric),
    ('Lyd', 'Hal 1 – Scene & teknik', 'DI-boks', null, null, 'stk', null::numeric),
    ('Lys', 'Hal 1 – Scene & teknik', 'LED-spot 200 W', null, null, 'stk', null::numeric),
    ('Lys', 'Hal 1 – Scene & teknik', 'Moving head', null, 'flightcase à 2', 'stk', null::numeric),
    ('Lys', 'Hal 1 – Scene & teknik', 'Truss 3 m', 'Aluminium-truss, firkantet.', null, 'stk', null::numeric),
    ('Lys', 'Hal 1 – Scene & teknik', 'Røgmaskine', null, null, 'stk', null::numeric),
    ('Lys', 'Hal 1 – Scene & teknik', 'Lyspult', null, 'flightcase', 'stk', null::numeric),
    ('Lys', 'Hal 1 – Scene & teknik', 'Arbejdslampe LED', null, null, 'stk', null::numeric),
    ('Strøm & Kabler', 'Hal 1 – Scene & teknik', 'Kabeltromle 25 m', null, null, 'stk', null::numeric),
    ('Strøm & Kabler', 'Hal 1 – Scene & teknik', 'Stikdåse 6-vejs IP44', null, null, 'stk', null::numeric),
    ('Strøm & Kabler', 'Hal 1 – Scene & teknik', 'Powercon-kabel 10 m', null, null, 'stk', null::numeric),
    ('Strøm & Kabler', 'Hal 1 – Scene & teknik', 'Strømkabel 5x16 mm²', null, 'tromle', 'meter', null::numeric),
    ('Strøm & Kabler', 'Hal 1 – Scene & teknik', 'Eltavle 63 A', null, null, 'stk', null::numeric),
    ('Strøm & Kabler', 'Hal 1 – Scene & teknik', 'Kabelbro', 'Kabelbeskytter til gangarealer.', null, 'stk', null::numeric),
    ('Generatorer & Brændstof', 'Containerplads', 'Generator 100 kVA', null, null, 'stk', null::numeric),
    ('Generatorer & Brændstof', 'Containerplads', 'Generator 20 kVA', null, null, 'stk', null::numeric),
    ('Generatorer & Brændstof', 'Containerplads', 'Dieseltank 1000 l', 'Mobil dieseltank til generatorer.', null, 'liter', null::numeric),
    ('Generatorer & Brændstof', 'Containerplads', 'AdBlue', null, 'dunk', 'liter', 10::numeric),
    ('Byggehegn', 'Hal 2 – Hegn & telte', 'Byggehegn 3,5 m', null, null, 'stk', null::numeric),
    ('Byggehegn', 'Hal 2 – Hegn & telte', 'Hegnsfod beton', null, null, 'stk', null::numeric),
    ('Byggehegn', 'Hal 2 – Hegn & telte', 'Hegnsklemme', null, 'kasse à 50', 'stk', null::numeric),
    ('Byggehegn', 'Hal 2 – Hegn & telte', 'Hegnsdug med print', 'Afskærmning 3,5x1,8 m.', null, 'stk', null::numeric),
    ('Barrierer', 'Hal 2 – Hegn & telte', 'Scenebarriere', 'Crowd barrier foran scener.', null, 'stk', null::numeric),
    ('Barrierer', 'Hal 2 – Hegn & telte', 'Mobilhegn 2,5 m', null, null, 'stk', null::numeric),
    ('Barrierer', 'Hal 2 – Hegn & telte', 'Kegle', null, null, 'stk', null::numeric),
    ('Skilte & Afmærkning', 'Hal 2 – Hegn & telte', 'Retningsskilt', null, null, 'stk', null::numeric),
    ('Skilte & Afmærkning', 'Hal 2 – Hegn & telte', 'Nødudgangsskilt belyst', null, null, 'stk', null::numeric),
    ('Skilte & Afmærkning', 'Hal 3 – Forbrugsvarer', 'Afspærringsbånd', null, null, 'rulle', null::numeric),
    ('Telte', 'Hal 2 – Hegn & telte', 'Pagodetelt 5x5 m', null, null, 'stk', null::numeric),
    ('Telte', 'Hal 2 – Hegn & telte', 'Lagertelt 10x20 m', null, null, 'stk', null::numeric),
    ('Telte', 'Hal 2 – Hegn & telte', 'Pop-up telt 3x3 m', null, null, 'stk', null::numeric),
    ('Borde & Bænke', 'Hal 2 – Hegn & telte', 'Ølbordsæt', 'Bord + 2 bænke.', null, 'sæt', null::numeric),
    ('Borde & Bænke', 'Hal 2 – Hegn & telte', 'Klapstol', null, null, 'stk', null::numeric),
    ('Borde & Bænke', 'Hal 2 – Hegn & telte', 'Cafébord', null, null, 'stk', null::numeric),
    ('Scenegulve & Podier', 'Hal 2 – Hegn & telte', 'Scenegulv-element 2x1 m', null, null, 'stk', null::numeric),
    ('Scenegulve & Podier', 'Hal 2 – Hegn & telte', 'Podieben justerbart', null, null, 'stk', null::numeric),
    ('Scenegulve & Podier', 'Hal 2 – Hegn & telte', 'Kørestolsrampe', null, null, 'stk', null::numeric),
    ('Toiletter', 'Containerplads', 'Toiletvogn 8 kabiner', null, null, 'stk', null::numeric),
    ('Toiletter', 'Containerplads', 'Pissoir-rondel', null, null, 'stk', null::numeric),
    ('Toiletter', 'Hal 3 – Forbrugsvarer', 'Toiletpapir', null, 'pakke à 48', 'rulle', null::numeric),
    ('Vand & Håndvask', 'Containerplads', 'Vandtank 1000 l', 'Drikkevandstank.', null, 'liter', null::numeric),
    ('Vand & Håndvask', 'Containerplads', 'Håndvaskestation', null, null, 'stk', null::numeric),
    ('Vand & Håndvask', 'Hal 3 – Forbrugsvarer', 'Vandslange 25 m', null, null, 'stk', null::numeric),
    ('Containere', 'Affaldsstation Øst', 'Affaldscontainer 660 l', null, null, 'liter', null::numeric),
    ('Containere', 'Containerplads', 'Komprimatorcontainer 20 m³', null, null, 'stk', null::numeric),
    ('Containere', 'Containerplads', 'Glascontainer', null, null, 'stk', null::numeric),
    ('Sække & Poser', 'Hal 3 – Forbrugsvarer', 'Affaldssække 120 l', null, 'rulle à 25', 'stk', null::numeric),
    ('Sække & Poser', 'Hal 3 – Forbrugsvarer', 'Pantsække', null, 'rulle à 25', 'stk', null::numeric),
    ('Pant', 'Hal 3 – Forbrugsvarer', 'Mobil pantstation', null, null, 'stk', null::numeric),
    ('Pant', 'Hal 3 – Forbrugsvarer', 'Pantkrus 40 cl', null, 'kasse à 500', 'stk', null::numeric),
    ('Pant', 'Hal 3 – Forbrugsvarer', 'Solcreme 1 l', 'Restlager - genbestilles til RF27.', 'pumpeflaske', 'stk', null::numeric),
    ('Brandslukning', 'Sikkerhedscentral', 'Brandslukker 6 kg pulver', null, null, 'stk', null::numeric),
    ('Brandslukning', 'Sikkerhedscentral', 'CO2-slukker 5 kg', null, null, 'stk', null::numeric),
    ('Brandslukning', 'Sikkerhedscentral', 'Brandtæppe', null, null, 'stk', null::numeric),
    ('Førstehjælp', 'Medic-telt', 'Hjertestarter', null, null, 'stk', null::numeric),
    ('Førstehjælp', 'Medic-telt', 'Førstehjælpskasse', 'Indhold tælles i dele.', null, 'stk', null::numeric),
    ('Førstehjælp', 'Medic-telt', 'Båre', null, null, 'stk', null::numeric),
    ('Førstehjælp', 'Medic-telt', 'Plaster', null, 'æske', 'æske', null::numeric),
    ('Kommunikation', 'Radiodepot', 'Håndradio', 'Digital håndradio med headset.', null, 'stk', null::numeric),
    ('Kommunikation', 'Radiodepot', 'Radiobatteri', null, null, 'stk', null::numeric),
    ('Kommunikation', 'Radiodepot', 'Ladestation 6-slot', null, null, 'stk', null::numeric),
    ('Kommunikation', 'Radiodepot', 'Megafon', null, null, 'stk', null::numeric),
    ('Tape & Fastgørelse', 'Hal 3 – Forbrugsvarer', 'Gaffatape sort 50 mm', null, 'kasse à 24', 'rulle', null::numeric),
    ('Tape & Fastgørelse', 'Hal 3 – Forbrugsvarer', 'Kabelbindere 300 mm', null, 'pose à 100', 'stk', null::numeric),
    ('Tape & Fastgørelse', 'Hal 3 – Forbrugsvarer', 'Strips 500 mm', null, 'pose à 100', 'stk', null::numeric),
    ('Tape & Fastgørelse', 'Hal 3 – Forbrugsvarer', 'Spændbånd 5 m', null, null, 'stk', null::numeric),
    ('Tape & Fastgørelse', 'Containerplads', 'Sand', 'Til hegnsfødder og ballast.', 'big bag', 'kg', 500::numeric),
    ('Tape & Fastgørelse', 'Containerplads', 'Træflis', 'Til mudrede gangarealer.', null, 'm³', null::numeric),
    ('Rengøring', 'Hal 3 – Forbrugsvarer', 'Nitrilhandsker', null, 'æske à 100', 'æske', null::numeric),
    ('Rengøring', 'Hal 3 – Forbrugsvarer', 'Håndsprit', null, 'dunk', 'liter', 5::numeric),
    ('Rengøring', 'Hal 3 – Forbrugsvarer', 'Kost og skovl', null, 'sæt', 'sæt', null::numeric),
    ('Kontor & Print', 'Sikkerhedscentral', 'Laserprinter A4', null, null, 'stk', null::numeric),
    ('Kontor & Print', 'Hal 3 – Forbrugsvarer', 'Printerpapir A4', null, 'pakke à 500', 'pakke', null::numeric),
    ('Kontor & Print', 'Hal 3 – Forbrugsvarer', 'Clipboard', null, null, 'stk', null::numeric),
    ('Beklædning', 'Frivilligdepot', 'Frivilligvest orange', null, null, 'stk', null::numeric),
    ('Beklædning', 'Frivilligdepot', 'Regnslag', null, null, 'stk', null::numeric),
    ('Beklædning', 'Frivilligdepot', 'Arbejdshandsker', null, null, 'par', null::numeric),
    ('Adgang & Armbånd', 'Frivilligdepot', 'Frivilligarmbånd RF27', null, 'pose à 100', 'stk', null::numeric),
    ('Adgang & Armbånd', 'Frivilligdepot', 'Billetscanner', null, null, 'stk', null::numeric),
    ('Adgang & Armbånd', 'Frivilligdepot', 'Adgangskort crew', null, null, 'stk', null::numeric),
    ('Værktøj', 'Værksted', 'Akku-skruemaskine', null, 'kuffert', 'stk', null::numeric),
    ('Værktøj', 'Værksted', 'Hammer', null, null, 'stk', null::numeric),
    ('Værktøj', 'Værksted', 'Palleløfter', null, null, 'stk', null::numeric),
    ('Værktøj', 'Værksted', 'Teleskoplæsser', null, null, 'stk', null::numeric),
    ('Værktøj', 'Værksted', 'Trillebør', null, null, 'stk', null::numeric)
  ) as i(category_title, location_name, name, description, packaging, uom, package_size)
  join public.data_layer_categories c on c.organisation_id = v_org and c.title = i.category_title
  left join public.locations l on l.organisation_id = v_org and l.name = i.location_name;

  -- Serienummererede enheder
  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'LA-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 22) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Line array-højttaler'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'LA-' || lpad(n::text, 3, '0'), 1, 'Maintenance'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(23, 24) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Line array-højttaler'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'SUB-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2024-10-15 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 14) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Subwoofer 2x18"'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'SUB-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2024-10-15 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(15, 15) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Subwoofer 2x18"'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'MIC-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2024-11-20 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 36) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Mikrofon SM58'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'MIC-' || lpad(n::text, 3, '0'), 1, 'Missing'::public.e_item_status, '2024-11-20 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(37, 39) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Mikrofon SM58'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'MIC-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2024-11-20 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(40, 40) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Mikrofon SM58'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'WMIC-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 10) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Trådløst mikrofonsæt'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'WMIC-' || lpad(n::text, 3, '0'), 1, 'InUse'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(11, 12) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Trådløst mikrofonsæt'
  left join public.locations l on l.organisation_id = v_org and l.name = 'FOH-tårn';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'MIX-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-02-12 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 3) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Digital mixerpult'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'MIX-' || lpad(n::text, 3, '0'), 1, 'InUse'::public.e_item_status, '2025-02-12 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(4, 4) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Digital mixerpult'
  left join public.locations l on l.organisation_id = v_org and l.name = 'FOH-tårn';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'MON-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-03-18 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 18) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Monitorhøjttaler'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'MON-' || lpad(n::text, 3, '0'), 1, 'Maintenance'::public.e_item_status, '2025-03-18 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(19, 20) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Monitorhøjttaler'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'SPOT-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-05-27 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 40) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'LED-spot 200 W'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'SPOT-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2025-05-27 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(41, 43) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'LED-spot 200 W'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'SPOT-' || lpad(n::text, 3, '0'), 1, 'Maintenance'::public.e_item_status, '2025-05-27 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(44, 45) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'LED-spot 200 W'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'MH-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-08-19 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 24) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Moving head'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'MH-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2025-08-19 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(25, 25) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Moving head'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'FOG-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2026-01-13 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 6) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Røgmaskine'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'FOG-' || lpad(n::text, 3, '0'), 1, 'Maintenance'::public.e_item_status, '2026-01-13 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(7, 7) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Røgmaskine'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'LP-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2026-03-10 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 2) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Lyspult'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'LP-' || lpad(n::text, 3, '0'), 1, 'InUse'::public.e_item_status, '2026-03-10 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(3, 3) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Lyspult'
  left join public.locations l on l.organisation_id = v_org and l.name = 'FOH-tårn';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'KT-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2026-05-26 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 30) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Kabeltromle 25 m'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'KT-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2026-05-26 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(31, 32) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Kabeltromle 25 m'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'ET-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2024-11-20 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 12) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Eltavle 63 A'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'ET-' || lpad(n::text, 3, '0'), 1, 'Maintenance'::public.e_item_status, '2024-11-20 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(13, 13) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Eltavle 63 A'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 1 – Scene & teknik';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'GEN-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-02-12 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 6) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Generator 100 kVA'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Containerplads';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'GEN-' || lpad(n::text, 3, '0'), 1, 'Maintenance'::public.e_item_status, '2025-02-12 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(7, 7) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Generator 100 kVA'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Containerplads';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'GENS-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-03-18 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 10) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Generator 20 kVA'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Containerplads';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'GENS-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2025-03-18 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(11, 11) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Generator 20 kVA'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Containerplads';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'NU-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2024-10-15 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 40) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Nødudgangsskilt belyst'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 2 – Hegn & telte';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'NU-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2024-10-15 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(41, 42) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Nødudgangsskilt belyst'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 2 – Hegn & telte';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'PT-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 30) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Pagodetelt 5x5 m'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 2 – Hegn & telte';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'PT-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(31, 32) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Pagodetelt 5x5 m'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 2 – Hegn & telte';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'LT-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-02-12 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 4) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Lagertelt 10x20 m'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 2 – Hegn & telte';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'RMP-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2026-03-10 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 6) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Kørestolsrampe'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 2 – Hegn & telte';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'TV-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2026-04-21 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 10) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Toiletvogn 8 kabiner'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Containerplads';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'TV-' || lpad(n::text, 3, '0'), 1, 'Maintenance'::public.e_item_status, '2026-04-21 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(11, 12) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Toiletvogn 8 kabiner'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Containerplads';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'HV-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2024-10-15 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 24) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Håndvaskestation'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Containerplads';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'HV-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2024-10-15 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(25, 25) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Håndvaskestation'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Containerplads';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'KC-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-02-12 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 2) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Komprimatorcontainer 20 m³'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Containerplads';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'PS-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-08-19 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 12) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Mobil pantstation'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 3 – Forbrugsvarer';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'PS-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2025-08-19 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(13, 13) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Mobil pantstation'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Hal 3 – Forbrugsvarer';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'BS-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2026-03-10 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 60) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Brandslukker 6 kg pulver'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Sikkerhedscentral';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'BS-' || lpad(n::text, 3, '0'), 1, 'Maintenance'::public.e_item_status, '2026-03-10 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(61, 64) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Brandslukker 6 kg pulver'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Sikkerhedscentral';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'BS-' || lpad(n::text, 3, '0'), 1, 'Missing'::public.e_item_status, '2026-03-10 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(65, 65) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Brandslukker 6 kg pulver'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Sikkerhedscentral';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'CO2-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2026-04-21 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 20) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'CO2-slukker 5 kg'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Sikkerhedscentral';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'AED-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2026-08-18 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 8) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Hjertestarter'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Medic-telt';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'AED-' || lpad(n::text, 3, '0'), 1, 'Maintenance'::public.e_item_status, '2026-08-18 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(9, 9) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Hjertestarter'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Medic-telt';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'BAR-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2024-10-15 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 6) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Båre'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Medic-telt';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'RAD-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 110) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Håndradio'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Radiodepot';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'RAD-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(111, 114) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Håndradio'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Radiodepot';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'RAD-' || lpad(n::text, 3, '0'), 1, 'Missing'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(115, 120) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Håndradio'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Radiodepot';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'RAD-' || lpad(n::text, 3, '0'), 1, 'Maintenance'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(121, 123) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Håndradio'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Radiodepot';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'LS-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-03-18 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 20) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Ladestation 6-slot'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Radiodepot';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'MEG-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-04-22 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 10) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Megafon'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Radiodepot';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'PR-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2024-10-15 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 3) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Laserprinter A4'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Sikkerhedscentral';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'HS-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2025-08-19 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 40) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Billetscanner'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Frivilligdepot';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'HS-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2025-08-19 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(41, 42) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Billetscanner'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Frivilligdepot';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'HS-' || lpad(n::text, 3, '0'), 1, 'Missing'::public.e_item_status, '2025-08-19 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(43, 43) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Billetscanner'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Frivilligdepot';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'ASK-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2026-01-13 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 30) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Akku-skruemaskine'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Værksted';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'ASK-' || lpad(n::text, 3, '0'), 1, 'Damaged'::public.e_item_status, '2026-01-13 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(31, 32) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Akku-skruemaskine'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Værksted';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'ASK-' || lpad(n::text, 3, '0'), 1, 'Missing'::public.e_item_status, '2026-01-13 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(33, 34) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Akku-skruemaskine'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Værksted';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'PL-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2026-04-21 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 8) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Palleløfter'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Værksted';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'PL-' || lpad(n::text, 3, '0'), 1, 'Maintenance'::public.e_item_status, '2026-04-21 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(9, 9) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Palleløfter'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Værksted';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'TL-' || lpad(n::text, 3, '0'), 1, 'Available'::public.e_item_status, '2026-05-26 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(1, 2) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Teleskoplæsser'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Værksted';

  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, 'TL-' || lpad(n::text, 3, '0'), 1, 'Maintenance'::public.e_item_status, '2026-05-26 10:00 Europe/Copenhagen'::timestamptz
  from generate_series(3, 3) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = 'Teleskoplæsser'
  left join public.locations l on l.organisation_id = v_org and l.name = 'Værksted';

  -- Batches, kapacitets-enheder og enheder med indhold
  insert into public.data_layer_item_units (
    organisation_id, item_id, location_id, serial_number, quantity, status, created_at,
    contents_total, contents_remaining, contents_empty_status, contents_partial_status, contents_full_status
  )
  select v_org, i.id, l.id, u.serial_number, u.quantity, u.status, u.created_at,
         u.contents_total, u.contents_remaining, u.empty_status, u.partial_status, u.full_status
  from (values
    ('DI-boks', 'Hal 1 – Scene & teknik', null, 40::numeric, 'Available'::public.e_item_status, '2025-04-22 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Truss 3 m', 'Hal 1 – Scene & teknik', null, 60::numeric, 'Available'::public.e_item_status, '2025-10-07 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Truss 3 m', 'Værksted', null, 4::numeric, 'Damaged'::public.e_item_status, '2025-10-07 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Arbejdslampe LED', 'Hal 1 – Scene & teknik', null, 80::numeric, 'Available'::public.e_item_status, '2026-04-21 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Arbejdslampe LED', 'Hal 1 – Scene & teknik', null, 10::numeric, 'Missing'::public.e_item_status, '2026-04-21 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Stikdåse 6-vejs IP44', 'Hal 1 – Scene & teknik', null, 60::numeric, 'Available'::public.e_item_status, '2026-08-18 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Powercon-kabel 10 m', 'Hal 1 – Scene & teknik', null, 120::numeric, 'Available'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Strømkabel 5x16 mm²', 'Hal 1 – Scene & teknik', null, 1200::numeric, 'Available'::public.e_item_status, '2024-10-15 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Kabelbro', 'Hal 1 – Scene & teknik', null, 150::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Dieseltank 1000 l', 'Containerplads', null, 1000::numeric, 'Available'::public.e_item_status, '2025-04-22 10:00 Europe/Copenhagen'::timestamptz, 1000::numeric, null::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('Dieseltank 1000 l', 'Containerplads', null, 350::numeric, 'Available'::public.e_item_status, '2025-04-22 10:00 Europe/Copenhagen'::timestamptz, 1000::numeric, null::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('Dieseltank 1000 l', 'Containerplads', null, 0::numeric, 'NeedsRefilling'::public.e_item_status, '2025-04-22 10:00 Europe/Copenhagen'::timestamptz, 1000::numeric, null::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('AdBlue', 'Containerplads', null, 240::numeric, 'Available'::public.e_item_status, '2025-05-27 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Byggehegn 3,5 m', 'Hal 2 – Hegn & telte', null, 800::numeric, 'Available'::public.e_item_status, '2025-08-19 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Byggehegn 3,5 m', 'Værksted', null, 40::numeric, 'Damaged'::public.e_item_status, '2025-08-19 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Hegnsfod beton', 'Hal 2 – Hegn & telte', null, 900::numeric, 'Available'::public.e_item_status, '2025-10-07 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Hegnsklemme', 'Hal 2 – Hegn & telte', null, 1500::numeric, 'Available'::public.e_item_status, '2026-01-13 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Hegnsklemme', 'Hal 2 – Hegn & telte', null, 120::numeric, 'Missing'::public.e_item_status, '2026-01-13 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Hegnsdug med print', 'Hal 2 – Hegn & telte', null, 120::numeric, 'Available'::public.e_item_status, '2026-03-10 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Scenebarriere', 'Hal 2 – Hegn & telte', null, 300::numeric, 'Available'::public.e_item_status, '2026-04-21 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Mobilhegn 2,5 m', 'Hal 2 – Hegn & telte', null, 400::numeric, 'Available'::public.e_item_status, '2026-05-26 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Mobilhegn 2,5 m', 'Værksted', null, 30::numeric, 'Damaged'::public.e_item_status, '2026-05-26 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Kegle', 'Hal 2 – Hegn & telte', null, 200::numeric, 'Available'::public.e_item_status, '2026-08-18 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Retningsskilt', 'Hal 2 – Hegn & telte', null, 150::numeric, 'Available'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Afspærringsbånd', 'Hal 3 – Forbrugsvarer', null, 60::numeric, 'Available'::public.e_item_status, '2024-11-20 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Pop-up telt 3x3 m', 'Hal 2 – Hegn & telte', null, 50::numeric, 'Available'::public.e_item_status, '2025-03-18 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Pop-up telt 3x3 m', 'Værksted', null, 6::numeric, 'Damaged'::public.e_item_status, '2025-03-18 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Ølbordsæt', 'Hal 2 – Hegn & telte', null, 600::numeric, 'Available'::public.e_item_status, '2025-04-22 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Klapstol', 'Hal 2 – Hegn & telte', null, 400::numeric, 'Available'::public.e_item_status, '2025-05-27 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Klapstol', 'Hal 2 – Hegn & telte', null, 25::numeric, 'Damaged'::public.e_item_status, '2025-05-27 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Cafébord', 'Hal 2 – Hegn & telte', null, 80::numeric, 'Available'::public.e_item_status, '2025-08-19 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Scenegulv-element 2x1 m', 'Hal 2 – Hegn & telte', null, 120::numeric, 'Available'::public.e_item_status, '2025-10-07 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Podieben justerbart', 'Hal 2 – Hegn & telte', null, 480::numeric, 'Available'::public.e_item_status, '2026-01-13 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Pissoir-rondel', 'Containerplads', null, 40::numeric, 'Available'::public.e_item_status, '2026-05-26 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Toiletpapir', 'Hal 3 – Forbrugsvarer', null, 3000::numeric, 'Available'::public.e_item_status, '2026-08-18 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Vandtank 1000 l', 'Containerplads', null, 1000::numeric, 'Available'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, 1000::numeric, null::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('Vandtank 1000 l', 'Containerplads', null, 1000::numeric, 'Available'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, 1000::numeric, null::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('Vandtank 1000 l', 'Containerplads', null, 600::numeric, 'Available'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, 1000::numeric, null::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('Vandtank 1000 l', 'Containerplads', null, 0::numeric, 'NeedsRefilling'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, 1000::numeric, null::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('Vandslange 25 m', 'Hal 3 – Forbrugsvarer', null, 60::numeric, 'Available'::public.e_item_status, '2024-11-20 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Øst', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Øst', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Øst', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Øst', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Øst', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Øst', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Øst', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Øst', null, 330::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Øst', null, 660::numeric, 'NeedsEmptying'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Øst', null, 660::numeric, 'NeedsEmptying'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Vest', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Vest', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Vest', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Vest', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Vest', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Vest', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Vest', null, 0::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Vest', null, 330::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Vest', null, 330::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Affaldscontainer 660 l', 'Affaldsstation Vest', null, 660::numeric, 'NeedsEmptying'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, 660::numeric, null::numeric, 'Available'::public.e_item_status, 'Available'::public.e_item_status, 'NeedsEmptying'::public.e_item_status),
    ('Glascontainer', 'Containerplads', null, 12::numeric, 'Available'::public.e_item_status, '2025-03-18 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Affaldssække 120 l', 'Hal 3 – Forbrugsvarer', null, 1500::numeric, 'Available'::public.e_item_status, '2025-04-22 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Pantsække', 'Hal 3 – Forbrugsvarer', null, 2000::numeric, 'Available'::public.e_item_status, '2025-05-27 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Pantkrus 40 cl', 'Hal 3 – Forbrugsvarer', null, 25000::numeric, 'Available'::public.e_item_status, '2025-10-07 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Solcreme 1 l', 'Hal 3 – Forbrugsvarer', null, 2::numeric, 'OutOfStock'::public.e_item_status, '2026-01-13 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Brandtæppe', 'Sikkerhedscentral', null, 40::numeric, 'Available'::public.e_item_status, '2026-05-26 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Førstehjælpskasse', 'Medic-telt', 'FHK-001', 1::numeric, 'Available'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, 30::numeric, 30::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('Førstehjælpskasse', 'Medic-telt', 'FHK-002', 1::numeric, 'Available'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, 30::numeric, 30::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('Førstehjælpskasse', 'Medic-telt', 'FHK-003', 1::numeric, 'Available'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, 30::numeric, 30::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('Førstehjælpskasse', 'Medic-telt', 'FHK-004', 1::numeric, 'Available'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, 30::numeric, 22::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('Førstehjælpskasse', 'Medic-telt', 'FHK-005', 1::numeric, 'Available'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, 30::numeric, 12::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('Førstehjælpskasse', 'Medic-telt', 'FHK-006', 1::numeric, 'NeedsRefilling'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, 30::numeric, 0::numeric, 'NeedsRefilling'::public.e_item_status, 'Available'::public.e_item_status, 'Available'::public.e_item_status),
    ('Plaster', 'Medic-telt', null, 200::numeric, 'Available'::public.e_item_status, '2024-11-20 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Radiobatteri', 'Radiodepot', null, 180::numeric, 'Available'::public.e_item_status, '2025-02-12 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Radiobatteri', 'Radiodepot', null, 20::numeric, 'Damaged'::public.e_item_status, '2025-02-12 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Gaffatape sort 50 mm', 'Hal 3 – Forbrugsvarer', null, 240::numeric, 'Available'::public.e_item_status, '2025-05-27 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Kabelbindere 300 mm', 'Hal 3 – Forbrugsvarer', null, 20000::numeric, 'Available'::public.e_item_status, '2025-08-19 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Strips 500 mm', 'Hal 3 – Forbrugsvarer', null, 5000::numeric, 'Available'::public.e_item_status, '2025-10-07 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Spændbånd 5 m', 'Hal 3 – Forbrugsvarer', null, 150::numeric, 'Available'::public.e_item_status, '2026-01-13 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Sand', 'Containerplads', null, 12000::numeric, 'Available'::public.e_item_status, '2026-03-10 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Træflis', 'Containerplads', null, 40::numeric, 'Available'::public.e_item_status, '2026-04-21 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Nitrilhandsker', 'Hal 3 – Forbrugsvarer', null, 80::numeric, 'Available'::public.e_item_status, '2026-05-26 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Håndsprit', 'Hal 3 – Forbrugsvarer', null, 150::numeric, 'Available'::public.e_item_status, '2026-08-18 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Kost og skovl', 'Hal 3 – Forbrugsvarer', null, 60::numeric, 'Available'::public.e_item_status, '2024-09-10 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Printerpapir A4', 'Hal 3 – Forbrugsvarer', null, 40::numeric, 'Available'::public.e_item_status, '2024-11-20 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Clipboard', 'Hal 3 – Forbrugsvarer', null, 50::numeric, 'Available'::public.e_item_status, '2025-01-08 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Frivilligvest orange', 'Frivilligdepot', null, 1800::numeric, 'Available'::public.e_item_status, '2025-02-12 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Frivilligvest orange', 'Frivilligdepot', null, 150::numeric, 'Missing'::public.e_item_status, '2025-02-12 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Regnslag', 'Frivilligdepot', null, 600::numeric, 'Available'::public.e_item_status, '2025-03-18 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Arbejdshandsker', 'Frivilligdepot', null, 900::numeric, 'Available'::public.e_item_status, '2025-04-22 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Frivilligarmbånd RF27', 'Frivilligdepot', null, 3000::numeric, 'Available'::public.e_item_status, '2025-05-27 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Adgangskort crew', 'Frivilligdepot', null, 500::numeric, 'Available'::public.e_item_status, '2025-10-07 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Hammer', 'Værksted', null, 80::numeric, 'Available'::public.e_item_status, '2026-03-10 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status),
    ('Trillebør', 'Værksted', null, 25::numeric, 'Available'::public.e_item_status, '2026-08-18 10:00 Europe/Copenhagen'::timestamptz, null::numeric, null::numeric, null::public.e_item_status, null::public.e_item_status, null::public.e_item_status)
  ) as u(item_name, location_name, serial_number, quantity, status, created_at,
         contents_total, contents_remaining, empty_status, partial_status, full_status)
  join public.data_layer_items i on i.organisation_id = v_org and i.name = u.item_name
  left join public.locations l on l.organisation_id = v_org and l.name = u.location_name;

  raise notice 'Seed 04 færdig: 90 varer, 833 enhedsrækker.';
end $$;
