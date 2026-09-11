-- =====================================================================
-- FULD SKEMA-EKSPORT (read-only - ændrer intet)
-- Kør i Supabase SQL Editor, tryk derefter "Download CSV" på resultatet.
-- Dækker: enums, kolonner, constraints, indexes, RLS-status, policies,
-- funktioner, triggers, function-grants - altså hele skemaet, inkl. alt
-- det et almindeligt tabel-dump udelader.
--
-- Sammenlign resultatet med dbSchema.sql for at opdage drift. Gem IKKE
-- CSV'en i repoet: den er et øjebliksbillede og bliver misvisende, så
-- snart nogen ændrer noget. Slet den efter brug - denne fil kan altid
-- hente en frisk.
-- =====================================================================
select kind, name, definition
from (

  -- 1) ENUMS ----------------------------------------------------------
  select 1 as sort, 'enum' as kind, t.typname as name,
         'create type public.' || t.typname || ' as enum (' ||
         string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder) ||
         ');' as definition
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  group by t.typname

  union all

  -- 2) KOLONNER (med rigtige enum-navne, ikke "USER-DEFINED") ---------
  select 2, 'columns', c.relname,
         string_agg(
           a.attname || ' ' || format_type(a.atttypid, a.atttypmod) ||
           case when a.attnotnull then ' not null' else '' end ||
           coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), ''),
           E'\n' order by a.attnum)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
  where n.nspname = 'public' and c.relkind = 'r'
  group by c.relname

  union all

  -- 3) CONSTRAINTS (pk, fk, unique, check) ----------------------------
  select 3, 'constraint', c.conrelid::regclass::text || ' :: ' || c.conname,
         pg_get_constraintdef(c.oid)
  from pg_constraint c
  join pg_namespace n on n.oid = c.connamespace
  where n.nspname = 'public'

  union all

  -- 4) INDEXES --------------------------------------------------------
  select 4, 'index', tablename || ' :: ' || indexname, indexdef
  from pg_indexes
  where schemaname = 'public'

  union all

  -- 5) RLS SLÅET TIL/FRA PR. TABEL ------------------------------------
  select 5, 'rls_enabled', c.relname,
         case when c.relrowsecurity then 'ENABLED' else 'DISABLED (!)' end
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'

  union all

  -- 6) RLS-POLICIES (genskrevet som create policy) ---------------------
  select 6, 'policy', tablename || ' :: ' || policyname,
         'create policy ' || quote_ident(policyname) ||
         E'\n  on public.' || tablename ||
         case when permissive = 'PERMISSIVE' then '' else E'\n  as restrictive' end ||
         E'\n  for ' || lower(cmd) ||
         coalesce(E'\n  to ' || array_to_string(roles, ', '), '') ||
         coalesce(E'\n  using (' || qual || ')', '') ||
         coalesce(E'\n  with check (' || with_check || ')', '') || ';'
  from pg_policies
  where schemaname = 'public'

  union all

  -- 7) FUNKTIONER (fuld kildekode) ------------------------------------
  select 7, 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         pg_get_functiondef(p.oid)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'

  union all

  -- 8) TRIGGERS (public + auth - fx handle_new_user på auth.users) ----
  select 8, 'trigger', n.nspname || '.' || c.relname || ' :: ' || t.tgname,
         pg_get_triggerdef(t.oid)
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'auth') and not t.tgisinternal

  union all

  -- 9) EXECUTE-GRANTS PÅ FUNKTIONER (anon / authenticated) ------------
  select 9, 'function_grant', routine_name,
         grantee || ' -> ' || privilege_type
  from information_schema.routine_privileges
  where specific_schema = 'public'
    and grantee in ('anon', 'authenticated', 'service_role', 'public')

) x
order by sort, name;
