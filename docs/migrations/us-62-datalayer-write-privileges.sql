-- =====================================================================
-- US-62: Granulære skriverettigheder i Datalayer (Fase 2)
-- Status: IKKE KØRT - klar til kørsel, ingen åbne spørgsmål
-- Skrevet: 2026-09-11
-- =====================================================================
--
-- HVAD DEN GØR
-- Gater skrivning (insert/update/delete) på locations,
-- data_layer_categories og data_layer_items bag det nye privilegie
-- `manage_datalayer`. Samme mønster som news-policyen (dbSchema.sql
-- §16.9) og som Fase 1's manage_roles/manage_members/manage_invitations.
--
-- LÆSNING FORBLIVER ÅBEN for alle organisationsmedlemmer. Hver tabel har
-- allerede sin egen "Se ..."-SELECT-policy, og RLS-policies OR'es - så
-- selvom den brede `for all`-policy nedenfor strammes, kan alle stadig
-- læse. SELECT-policierne må derfor IKKE røres.
--
-- Policy-navnene ændres fra "Medlemmer kan oprette/redigere/slette X ..."
-- til "Administrer X i egen organisation" - navnet skal afspejle at det
-- ikke længere er alle medlemmer. Samme navngivning som news.
--
-- sync_item_organisation-triggeren (BEFORE INSERT på data_layer_items,
-- dbSchema.sql §15.4) er uproblematisk: WITH CHECK evalueres EFTER
-- BEFORE-triggere, så organisation_id er allerede sat når policyen
-- tjekker den.
--
-- FØR DU KØRER: se "HVEM MISTER ADGANG"-queryen nederst. Kør den først
-- og tildel `manage_datalayer` til de roller der skal beholde skrive-
-- adgang - ellers mister alle menige medlemmer (inkl. de andre
-- studerendes testbrugere) skriveadgang i samme øjeblik.
-- =====================================================================


-- ---------------------------------------------------------------------
-- LOCATIONS
-- ---------------------------------------------------------------------
drop policy "Medlemmer kan oprette/redigere/slette lokationer i egen organisation" on public.locations;

create policy "Administrer lokationer i egen organisation"
  on public.locations for all
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_datalayer')
  )
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_datalayer')
  );


-- ---------------------------------------------------------------------
-- DATA LAYER CATEGORIES
-- ---------------------------------------------------------------------
drop policy "Medlemmer kan oprette/redigere/slette kategorier i egen organisation" on public.data_layer_categories;

create policy "Administrer datalayer-kategorier i egen organisation"
  on public.data_layer_categories for all
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_datalayer')
  )
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_datalayer')
  );


-- ---------------------------------------------------------------------
-- DATA LAYER ITEMS
-- ---------------------------------------------------------------------
drop policy "Medlemmer kan oprette/redigere/slette items i egen organisation" on public.data_layer_items;

create policy "Administrer datalayer-items i egen organisation"
  on public.data_layer_items for all
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_datalayer')
  )
  with check (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_datalayer')
  );


-- =====================================================================
-- "HVEM MISTER ADGANG" - KØR DENNE FØR MIGRATIONEN (read-only)
-- =====================================================================
-- Lister alle medlemmer, der EFTER migrationen ikke længere kan skrive i
-- Datalayer, fordi deres rolle hverken har `manage_datalayer` eller
-- `admin`. Tildel privilegiet til de relevante roller først.
--
-- select
--   o.name                                as organisation,
--   p.first_name || ' ' || p.last_name    as medlem,
--   p.email,
--   coalesce(r.name, '(ingen rolle)')     as rolle
-- from public.memberships m
-- join public.organisations o on o.id = m.organisation_id
-- join public.profiles      p on p.id = m.user_id
-- left join public.roles    r on r.id = m.role_id
-- where not exists (
--   select 1 from public.privileges pv
--   where pv.role_id = m.role_id
--     and pv.name in ('manage_datalayer', 'admin')
-- )
-- order by o.name, medlem;


-- =====================================================================
-- FRONTEND (gøres i samme ombæring som SQL'en køres)
-- =====================================================================
-- Konstanterne findes allerede i src/store/apis/privilegeApi.ts
-- (MANAGE_DATALAYER_PRIVILEGE + post i KNOWN_PRIVILEGES, tilføjet
-- 2026-09-11 netop for at privilegiet kan tildeles FØR denne SQL køres).
--
-- Mangler:
--  - Gate opret/rediger/slet i src/pages/dataLayer/DataLayerPage.tsx med
--    useHasPrivilege(MANAGE_DATALAYER_PRIVILEGE). Knapperne "Tilføj
--    kategori", "Tilføj items" og "Slet items" ligger i DataLayerPage;
--    rediger/slet kategori sendes videre til
--    CategoriTreeNodeComponent.tsx; lokationer i
--    locationsManagerComponent.tsx og locationsPickerComponent.tsx.
--  - 42501-fejlbeskeder i de 9 mutations i
--    src/store/apis/categoryApi.ts (kategori x3, item x3, lokation x3),
--    samme mønster som roleApi.ts/privilegeApi.ts fra Fase 1.
--
-- OBS: begge filer tilhører Studerende 2 og ændres aktivt - koordinér
-- før der redigeres, så der ikke opstår merge-konflikter.


-- =====================================================================
-- ROLLBACK (gendanner den åbne adgang for alle medlemmer)
-- =====================================================================
-- drop policy "Administrer lokationer i egen organisation" on public.locations;
-- create policy "Medlemmer kan oprette/redigere/slette lokationer i egen organisation"
--   on public.locations for all
--   to authenticated
--   using (organisation_id = public.auth_profile_org())
--   with check (organisation_id = public.auth_profile_org());
--
-- drop policy "Administrer datalayer-kategorier i egen organisation" on public.data_layer_categories;
-- create policy "Medlemmer kan oprette/redigere/slette kategorier i egen organisation"
--   on public.data_layer_categories for all
--   to authenticated
--   using (organisation_id = public.auth_profile_org())
--   with check (organisation_id = public.auth_profile_org());
--
-- drop policy "Administrer datalayer-items i egen organisation" on public.data_layer_items;
-- create policy "Medlemmer kan oprette/redigere/slette items i egen organisation"
--   on public.data_layer_items for all
--   to authenticated
--   using (organisation_id = public.auth_profile_org())
--   with check (organisation_id = public.auth_profile_org());
