-- =====================================================================
-- SEED 05 - NYHEDER (org-opslagstavle, US-56)
-- 20 nyheder spredt okt 2024 -> sep 2026. Placeholder-billeder fra
-- picsum.photos (fast seed pr. nyhed), url = null.
-- =====================================================================
do $$
declare
  v_org uuid;
begin
  select id into v_org from public.organisations where lower(trim(name)) = 'roskilde festival';
  if v_org is null then
    raise exception 'Organisationen "Roskilde Festival" findes ikke.';
  end if;

  if exists (select 1 from public.news where organisation_id = v_org) then
    raise exception 'Allerede seedet - kør 99_cleanup.sql først.';
  end if;

  insert into public.news (organisation_id, title, description, picture_url, published_at, url)
  select v_org, n.title, n.description,
         'https://picsum.photos/seed/rf-news-' || n.nr || '/800/450',
         n.published_at, null
  from (values
    (1,  timestamptz '2024-10-14 10:00+02', 'Planlægningen af RF25 er skudt i gang',
         'Festivalledelsen har holdt kick-off for RF25. Holdlederne får deres budgetrammer inden 1. december.'),
    (2,  timestamptz '2024-11-18 09:00+01', 'Rekruttering af frivillige til RF25 åbner',
         'Frivilligtilmeldingen er åben. Del gerne opslaget med venner, der vil være en del af holdet.'),
    (3,  timestamptz '2025-02-03 12:00+01', 'Ny procedure for udlån af udstyr',
         'Alt udstyr fra Centrallageret skal nu registreres i Ponos ved udlån. Spørg Henrik på lageret, hvis du er i tvivl.'),
    (4,  timestamptz '2025-04-22 08:30+02', 'Opbygningen starter 26. maj',
         'Første hold møder ind på Dyrskuepladsen 26. maj kl. 07.00. Husk sikkerhedssko og arbejdshandsker.'),
    (5,  timestamptz '2025-06-10 15:00+02', 'Husk førstehjælpskurset',
         'Alle holdledere skal have gennemført førstehjælpskurset inden festivalen. Tilmelding via Nanna.'),
    (6,  timestamptz '2025-06-27 07:00+02', 'Varmebølge: Drik vand og hold pauser',
         'DMI varsler høje temperaturer de næste dage. Der er ekstra vandposter ved alle scener og i campingområderne.'),
    (7,  timestamptz '2025-07-01 11:00+02', 'Sådan sorterer vi affald i år',
         'Pant, restaffald og genbrug skal i hver sin fraktion. Affaldsholdet står klar ved alle affaldsstationer.'),
    (8,  timestamptz '2025-07-08 10:00+02', 'Tak for en fantastisk festival',
         'Tusind tak til alle frivillige og holdledere. Nedtagningen er i gang - se opgaverne under Nedtagning.'),
    (9,  timestamptz '2025-08-25 09:00+02', 'Evalueringen af RF25 er i gang',
         'Alle hold bedes udfylde evalueringsskemaet inden 12. september.'),
    (10, timestamptz '2025-10-06 10:00+02', 'Kick-off for RF26',
         'Planlægningen af RF26 er startet. Nye opgaver er oprettet i rummet Planlægning.'),
    (11, timestamptz '2025-11-10 09:00+01', 'Frivilligtilmelding til RF26 er åben',
         'Vi søger især frivillige til affald, sanitet og hegn. Tilmelding er åben til 1. marts.'),
    (12, timestamptz '2026-01-15 12:00+01', 'Opdaterede frivilligkontrakter',
         'Frivilligkontrakterne er opdateret med nye regler for vagtbytte. Læs dem igennem inden du tager vagter.'),
    (13, timestamptz '2026-03-16 09:00+01', 'Generatorer er klar efter service',
         'Alle generatorer har været til service og er klar til RF26.'),
    (14, timestamptz '2026-05-18 08:00+02', 'Opbygningen starter 25. maj',
         'Første hold møder ind 25. maj kl. 07.00. Parkering foregår på P-plads Vest.'),
    (15, timestamptz '2026-06-24 16:00+02', 'Sikkerhedsbriefing for alle vagter',
         'Obligatorisk briefing for alle på sikkerhedsholdet fredag kl. 18.00 i Sikkerhedscentralen.'),
    (16, timestamptz '2026-06-29 07:30+02', 'Regnvejr: Ekstra flis på vejene',
         'Der er udlagt ekstra flis i Camp Øst og Vest. Meld om oversvømmede områder til Sikkerhedscentralen.'),
    (17, timestamptz '2026-07-06 10:00+02', 'Tak for RF26',
         'Endnu en festival er slut. Tak for indsatsen - nedtagningen er i fuld gang.'),
    (18, timestamptz '2026-08-17 09:00+02', 'Lageroptællingen er afsluttet',
         'Beskadiget udstyr er registreret i datalageret. Reparationer planlægges i løbet af efteråret.'),
    (19, timestamptz '2026-09-14 09:00+02', 'Planlægningen af RF27 er i gang',
         'Budgetudkast og tilbudsindhentning for RF27 er startet. Holdlederne kontaktes i oktober.'),
    (20, timestamptz '2026-09-28 12:00+02', 'Frivilligfest i oktober',
         'Vi holder fest for alle frivillige i oktober. Mere info følger - hold øje med opgaven "Planlæg frivilligfest".')
  ) as n(nr, published_at, title, description);

  raise notice 'Seed 05 færdig: 20 nyheder.';
end $$;
