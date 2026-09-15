-- =====================================================================
-- Fase 3, trin 5: Granulære CRUD-privilegier - Datalayer
-- Status: IKKE KØRT - VENT MED AT KØRE
-- Skrevet: 2026-09-15
-- Forudsætning: fase3-medlem-rolle.sql er kørt.
-- Erstatter: den slettede us-62-datalayer-write-privileges.sql (designet
-- om fra ét manage_datalayer til fuldt CRUD - aldrig kørt, så ingen
-- dobbelt-migrering).
-- =====================================================================
--
-- HVAD DEN GØR
-- Fuldt CRUD på locations/data_layer_categories/data_layer_items:
-- create_datalayer/read_datalayer/update_datalayer/delete_datalayer.
-- LÆSNING GATES NU OGSÅ (var åben for alle org-medlemmer, ligesom
-- skrivning var det før Fase 2).
--
-- sync_item_organisation-triggeren (BEFORE INSERT på data_layer_items,
-- dbSchema.sql §15.4) er uproblematisk: WITH CHECK evalueres EFTER
-- BEFORE-triggere, så organisation_id er allerede sat når policyen
-- tjekker den.
--
-- VENT MED AT KØRE denne fil til frontend-gatingen i
-- src/pages/dataLayer/DataLayerPage.tsx (+ kategori/item-komponenter) og
-- src/store/apis/categoryApi.ts er på plads - ellers mister alle menige
-- medlemmer al adgang (også LÆSNING nu) uden at UI'et forklarer hvorfor.
-- Disse filer tilhører Studerende 2 - aftalt før der skrives kode i dem
-- (se docs/studerende1-plan.md, Fase 3-checkpoint).
--
-- FØR DU KØRER: se "HVEM MISTER ADGANG"-queryen nederst, og tildel
-- create/read/update/delete_datalayer til de relevante roller.
-- =====================================================================


-- ---------------------------------------------------------------------
-- LOCATIONS
-- ---------------------------------------------------------------------
drop policy "Se lokationer i egen organisation" on public.locations;
create policy "Se lokationer i egen organisation"
  on public.locations for select
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('read_datalayer'));

drop policy "Medlemmer kan oprette/redigere/slette lokationer i egen organisation" on public.locations;

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


-- ---------------------------------------------------------------------
-- DATA LAYER CATEGORIES
-- ---------------------------------------------------------------------
drop policy "Se datalayer-kategorier i egen organisation" on public.data_layer_categories;
create policy "Se datalayer-kategorier i egen organisation"
  on public.data_layer_categories for select
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('read_datalayer'));

drop policy "Medlemmer kan oprette/redigere/slette kategorier i egen organisation" on public.data_layer_categories;

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


-- ---------------------------------------------------------------------
-- DATA LAYER ITEMS
-- ---------------------------------------------------------------------
drop policy "Se datalayer-items i egen organisation" on public.data_layer_items;
create policy "Se datalayer-items i egen organisation"
  on public.data_layer_items for select
  to authenticated
  using (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('read_datalayer'));

drop policy "Medlemmer kan oprette/redigere/slette items i egen organisation" on public.data_layer_items;

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


-- =====================================================================
-- "HVEM MISTER ADGANG" - KØR DENNE FØR MIGRATIONEN (read-only)
-- =====================================================================
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
--     and pv.name in ('create_datalayer', 'read_datalayer', 'update_datalayer', 'delete_datalayer', 'admin')
-- )
-- order by o.name, medlem;


-- =====================================================================
-- FRONTEND (Studerende 2's filer - se checkpoint i studerende1-plan.md)
-- =====================================================================
--  - src/pages/dataLayer/DataLayerPage.tsx: gate "Tilføj kategori",
--    "Tilføj items", "Slet items" efter create/delete_datalayer; tom-
--    tilstand hvis ikke read_datalayer.
--  - kategori/item-rediger/slet-knapper i de indlejrede komponenter
--    (CategoriTreeNodeComponent.tsx m.fl.).
--  - locationsManagerComponent.tsx / locationsPickerComponent.tsx.
--  - 42501-fejlbeskeder i de 9 mutations i
--    src/store/apis/categoryApi.ts (kategori/item/lokation x3).


-- =====================================================================
-- ROLLBACK (gendanner den åbne adgang for alle medlemmer)
-- =====================================================================
-- drop policy "Se lokationer i egen organisation" on public.locations;
-- drop policy "Opret lokationer i egen organisation" on public.locations;
-- drop policy "Rediger lokationer i egen organisation" on public.locations;
-- drop policy "Slet lokationer i egen organisation" on public.locations;
-- create policy "Se lokationer i egen organisation"
--   on public.locations for select to authenticated
--   using (organisation_id = public.auth_profile_org());
-- create policy "Medlemmer kan oprette/redigere/slette lokationer i egen organisation"
--   on public.locations for all to authenticated
--   using (organisation_id = public.auth_profile_org())
--   with check (organisation_id = public.auth_profile_org());
--
-- drop policy "Se datalayer-kategorier i egen organisation" on public.data_layer_categories;
-- drop policy "Opret datalayer-kategorier i egen organisation" on public.data_layer_categories;
-- drop policy "Rediger datalayer-kategorier i egen organisation" on public.data_layer_categories;
-- drop policy "Slet datalayer-kategorier i egen organisation" on public.data_layer_categories;
-- create policy "Se datalayer-kategorier i egen organisation"
--   on public.data_layer_categories for select to authenticated
--   using (organisation_id = public.auth_profile_org());
-- create policy "Medlemmer kan oprette/redigere/slette kategorier i egen organisation"
--   on public.data_layer_categories for all to authenticated
--   using (organisation_id = public.auth_profile_org())
--   with check (organisation_id = public.auth_profile_org());
--
-- drop policy "Se datalayer-items i egen organisation" on public.data_layer_items;
-- drop policy "Opret datalayer-items i egen organisation" on public.data_layer_items;
-- drop policy "Rediger datalayer-items i egen organisation" on public.data_layer_items;
-- drop policy "Slet datalayer-items i egen organisation" on public.data_layer_items;
-- create policy "Se datalayer-items i egen organisation"
--   on public.data_layer_items for select to authenticated
--   using (organisation_id = public.auth_profile_org());
-- create policy "Medlemmer kan oprette/redigere/slette items i egen organisation"
--   on public.data_layer_items for all to authenticated
--   using (organisation_id = public.auth_profile_org())
--   with check (organisation_id = public.auth_profile_org());
