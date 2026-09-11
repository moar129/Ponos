-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.organisations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organisations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  description text,
  note_admin text,
  url_picture text,
  active_organisation_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_organisation_id_fkey FOREIGN KEY (active_organisation_id) REFERENCES public.organisations(id)
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id),
  CONSTRAINT roles_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id)
);
CREATE TABLE public.privileges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL,
  name text NOT NULL,
  CONSTRAINT privileges_pkey PRIMARY KEY (id),
  CONSTRAINT privileges_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.membership_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organisation_id uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'Pending'::e_membership_request_status,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  CONSTRAINT membership_requests_pkey PRIMARY KEY (id),
  CONSTRAINT membership_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT membership_requests_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id),
  CONSTRAINT membership_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  address text,
  CONSTRAINT locations_pkey PRIMARY KEY (id),
  CONSTRAINT locations_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id)
);
CREATE TABLE public.data_layer_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL,
  parent_category_id uuid,
  title text NOT NULL,
  rank integer NOT NULL DEFAULT 0,
  CONSTRAINT data_layer_categories_pkey PRIMARY KEY (id),
  CONSTRAINT data_layer_categories_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id),
  CONSTRAINT data_layer_categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.data_layer_categories(id)
);
CREATE TABLE public.data_layer_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL,
  category_id uuid NOT NULL,
  location_id uuid,
  name text NOT NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 0,
  status USER-DEFINED NOT NULL DEFAULT 'Available'::e_item_status,
  CONSTRAINT data_layer_items_pkey PRIMARY KEY (id),
  CONSTRAINT data_layer_items_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id),
  CONSTRAINT data_layer_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.data_layer_categories(id),
  CONSTRAINT data_layer_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  status USER-DEFINED NOT NULL DEFAULT 'Started'::e_task_status,
  room_id uuid,
  priority USER-DEFINED,
  max_assignees integer,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id),
  CONSTRAINT tasks_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.task_rooms(id)
);
CREATE TABLE public.task_assignees (
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT task_assignees_pkey PRIMARY KEY (task_id, user_id),
  CONSTRAINT task_assignees_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.task_participants (
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT task_participants_pkey PRIMARY KEY (task_id, user_id),
  CONSTRAINT task_participants_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.task_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  CONSTRAINT task_materials_pkey PRIMARY KEY (id),
  CONSTRAINT task_materials_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_materials_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.data_layer_items(id)
);
CREATE TABLE public.statistics_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT statistics_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT statistics_snapshots_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id)
);
CREATE TABLE public.statistics_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  name text NOT NULL,
  value numeric NOT NULL,
  CONSTRAINT statistics_values_pkey PRIMARY KEY (id),
  CONSTRAINT statistics_values_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.statistics_snapshots(id)
);
CREATE TABLE public.news (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  picture_url text,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  organisation_id uuid NOT NULL,
  url text,
  CONSTRAINT news_pkey PRIMARY KEY (id),
  CONSTRAINT news_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id)
);
CREATE TABLE public.task_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL,
  name text NOT NULL,
  required_role_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT task_rooms_pkey PRIMARY KEY (id),
  CONSTRAINT task_rooms_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id),
  CONSTRAINT task_rooms_required_role_id_fkey FOREIGN KEY (required_role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organisation_id uuid NOT NULL,
  role_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT memberships_pkey PRIMARY KEY (id),
  CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT memberships_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id),
  CONSTRAINT memberships_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.membership_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL,
  invited_user_id uuid NOT NULL,
  invited_by uuid,
  status USER-DEFINED NOT NULL DEFAULT 'Pending'::e_membership_request_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  CONSTRAINT membership_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT membership_invitations_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id),
  CONSTRAINT membership_invitations_invited_user_id_fkey FOREIGN KEY (invited_user_id) REFERENCES public.profiles(id),
  CONSTRAINT membership_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id)
);