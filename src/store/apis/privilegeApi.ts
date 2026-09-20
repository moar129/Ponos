// src/store/apis/privilegeApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { CreatePrivilegeInput, Privilege, UpdatePrivilegeInput } from '../../types/role/roleType'

// Navnet på det privilegie, der giver adgang til ALT (superset af alle
// andre privilegier). Konventionen er sat i databasen, hvor RLS-policies
// bruger has_privilege_or_admin(), som altid tillader admin.
export const ADMIN_PRIVILEGE = 'admin'

// Fase 3: granulære CRUD-privilegier - hvert domæne har sit eget sæt af
// create/read/update/delete-privilegier i stedet for ét fælles manage_X.
// Kun de operationer der reelt findes for domænet er oprettet (fx intet
// create_organisation - organisation oprettes via en selvbetjent RPC).
// Se docs/studerende1-plan.md (Fase 3) for domæne-mappingen og
// docs/migrations/fase3-*.sql for de tilhørende RLS-policies.
export const CREATE_ROLES_PRIVILEGE = 'create_roles'
export const READ_ROLES_PRIVILEGE = 'read_roles'
export const UPDATE_ROLES_PRIVILEGE = 'update_roles'
export const DELETE_ROLES_PRIVILEGE = 'delete_roles'

export const UPDATE_ORGANISATION_PRIVILEGE = 'update_organisation'

export const READ_MEMBERSHIP_REQUESTS_PRIVILEGE = 'read_membership_requests'
export const UPDATE_MEMBERSHIP_REQUESTS_PRIVILEGE = 'update_membership_requests'

export const DELETE_MEMBERS_PRIVILEGE = 'delete_members'

export const CREATE_INVITATIONS_PRIVILEGE = 'create_invitations'
export const READ_INVITATIONS_PRIVILEGE = 'read_invitations'
export const DELETE_INVITATIONS_PRIVILEGE = 'delete_invitations'

export const CREATE_NEWS_PRIVILEGE = 'create_news'
export const READ_NEWS_PRIVILEGE = 'read_news'
export const UPDATE_NEWS_PRIVILEGE = 'update_news'
export const DELETE_NEWS_PRIVILEGE = 'delete_news'

// Datalager (Studerende 2's domæne) og Opgaver (Studerende 3's domæne) -
// RLS-policies er skrevet (docs/migrations/fase3-datalayer-privileges.sql
// / fase3-tasks-privileges.sql), men IKKE kørt endnu. Konstanterne findes
// allerede her, så roller kan nå at få tildelt privilegierne, før
// gatingen slås til.
export const CREATE_DATALAYER_PRIVILEGE = 'create_datalayer'
export const READ_DATALAYER_PRIVILEGE = 'read_datalayer'
export const UPDATE_DATALAYER_PRIVILEGE = 'update_datalayer'
export const DELETE_DATALAYER_PRIVILEGE = 'delete_datalayer'

export const CREATE_TASKS_PRIVILEGE = 'create_tasks'
export const READ_TASKS_PRIVILEGE = 'read_tasks'
export const UPDATE_TASKS_PRIVILEGE = 'update_tasks'
export const DELETE_TASKS_PRIVILEGE = 'delete_tasks'
// Tilføje/fjerne ANDRE på en opgave (ledelsesrettighed, US-76) - adskilt
// fra update_tasks (redigere opgavens indhold).
export const ASSIGN_TASKS_PRIVILEGE = 'assign_tasks'

// Medlems seedede privilegier (create_organisation, 15.8) er låst fast -
// kan hverken fjernes fra rollen eller omdøbes (se
// prevent_default_role_privilege_change, docs/dbSchema.sql 15.6d).
// UI-guard kun - selve håndhævelsen sker i databasen.
export const PROTECTED_MEMBER_PRIVILEGE_NAMES: string[] = [READ_NEWS_PRIVILEGE, READ_TASKS_PRIVILEGE]

// Godkend/afvis opgave-færdigmelding (task_requests). Behandles via
// RPC'erne approve_task_request/reject_task_request, som kræver hvert
// sit privilegie.
export const APPROVE_TASK_PRIVILEGE = 'approve_task'
export const REJECT_TASK_PRIVILEGE = 'reject_task'

type PrivilegeOp = 'create' | 'read' | 'update' | 'delete' | 'assign' | 'approve' | 'reject'

interface PrivilegeDomain {
    domain: string
    domainLabel: string
    // Kun de operationer domænet reelt understøtter er til stede.
    ops: Partial<Record<PrivilegeOp, string>>
}

// Domænernes CRUD-privilegier grupperet - bruges til at bygge
// "Tilføj privilegie"-dropdownen pr. domæne i stedet for en flad liste.
export const PRIVILEGE_DOMAINS: PrivilegeDomain[] = [
    {
        domain: 'roles',
        domainLabel: 'Roller og privilegier',
        ops: {
            create: CREATE_ROLES_PRIVILEGE,
            read: READ_ROLES_PRIVILEGE,
            update: UPDATE_ROLES_PRIVILEGE,
            delete: DELETE_ROLES_PRIVILEGE,
        },
    },
    {
        domain: 'organisation',
        domainLabel: 'Organisation',
        ops: { update: UPDATE_ORGANISATION_PRIVILEGE },
    },
    {
        domain: 'membership_requests',
        domainLabel: 'Medlemsanmodninger',
        ops: { read: READ_MEMBERSHIP_REQUESTS_PRIVILEGE, update: UPDATE_MEMBERSHIP_REQUESTS_PRIVILEGE },
    },
    {
        domain: 'members',
        domainLabel: 'Medlemmer',
        ops: { delete: DELETE_MEMBERS_PRIVILEGE },
    },
    {
        domain: 'invitations',
        domainLabel: 'Invitationer',
        ops: {
            create: CREATE_INVITATIONS_PRIVILEGE,
            read: READ_INVITATIONS_PRIVILEGE,
            delete: DELETE_INVITATIONS_PRIVILEGE,
        },
    },
    {
        domain: 'news',
        domainLabel: 'Nyheder',
        ops: {
            create: CREATE_NEWS_PRIVILEGE,
            read: READ_NEWS_PRIVILEGE,
            update: UPDATE_NEWS_PRIVILEGE,
            delete: DELETE_NEWS_PRIVILEGE,
        },
    },
    {
        domain: 'datalayer',
        domainLabel: 'Datalager',
        ops: {
            create: CREATE_DATALAYER_PRIVILEGE,
            read: READ_DATALAYER_PRIVILEGE,
            update: UPDATE_DATALAYER_PRIVILEGE,
            delete: DELETE_DATALAYER_PRIVILEGE,
        },
    },
    {
        domain: 'tasks',
        domainLabel: 'Opgaver',
        ops: {
            create: CREATE_TASKS_PRIVILEGE,
            read: READ_TASKS_PRIVILEGE,
            update: UPDATE_TASKS_PRIVILEGE,
            delete: DELETE_TASKS_PRIVILEGE,
            assign: ASSIGN_TASKS_PRIVILEGE,
        },
    },
    {
        domain: 'task_approval',
        domainLabel: 'Opgavegodkendelse',
        ops: {
            approve: APPROVE_TASK_PRIVILEGE,
            reject: REJECT_TASK_PRIVILEGE,
        },
    },
]

const OP_LABELS: Record<PrivilegeOp, string> = {
    create: 'Opret',
    read: 'Se',
    update: 'Redigér',
    delete: 'Slet',
    assign: 'Tildel',
    approve: 'Godkend',
    reject: 'Afvis',
}

// Kendte systemprivilegier med brugervenlige, danske labels - bruges til
// at vise en dropdown i stedet for et fritekstfelt, når man tilføjer et
// privilegie til en rolle. Afledt af PRIVILEGE_DOMAINS ("Domæne —
// Operation", fx "Nyheder — Opret"). En organisation kan ikke forventes
// at kende eller stave de bogstavelige privilegienavne, RLS-policies
// tjekker. Privileges-tabellen tillader stadig vilkårlige navne (US-13
// er skrevet generisk), så UI'en har også en "Andet"-mulighed med
// fritekst.
export const KNOWN_PRIVILEGES: { name: string; label: string }[] = [
    { name: ADMIN_PRIVILEGE, label: 'Fuld administrator (kan alt)' },
    ...PRIVILEGE_DOMAINS.flatMap((domain) =>
        (Object.entries(domain.ops) as [PrivilegeOp, string][]).map(([op, name]) => ({
            name,
            label: `${domain.domainLabel} — ${OP_LABELS[op]}`,
        })),
    ),
]

// Slår et privilegienavn op i KNOWN_PRIVILEGES og returnerer dets
// brugervenlige label - falder tilbage til det rå navn for
// custom-privilegier, der ikke er i listen.
export function privilegeLabel(name: string): string {
    return KNOWN_PRIVILEGES.find((p) => p.name === name)?.label ?? name
}

// Samme som privilegeLabel, men returnerer kun operations-delen ("Opret",
// "Se", ...) uden domænenavnet foran - bruges når domænet allerede vises
// som en overskrift (fx den grupperede "Tilføj privilegie"-dropdown).
// Falder tilbage til den fulde label for admin/custom-privilegier, der
// ikke hører til noget domæne.
export function privilegeOpLabel(name: string): string {
    for (const domain of PRIVILEGE_DOMAINS) {
        for (const [op, opName] of Object.entries(domain.ops) as [PrivilegeOp, string][]) {
            if (opName === name) return OP_LABELS[op]
        }
    }
    return privilegeLabel(name)
}

// Alle kendte privilegier UNDTAGEN admin - bruges af matrixens "Vælg
// alle/Fjern alle"-knap (MatrixCell.tsx) for roller der ikke er den
// indbyggede Admin-rolle. Det ægte admin-privilegie er en RLS-bypass
// forbeholdt netop den rolle (se docs/migrations/2026-09-19-lock-admin-
// privilege-to-admin-role.sql), så andre roller kan i stedet få tildelt
// alle øvrige privilegier på én gang.
export const NON_ADMIN_KNOWN_PRIVILEGE_NAMES: string[] = KNOWN_PRIVILEGES.filter(
    (p) => p.name !== ADMIN_PRIVILEGE,
).map((p) => p.name)

export const privilegeApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Henter navnene på den indloggede brugers privilegier (via rollen).
        // Bruges KUN til at vise/skjule UI - den reelle adgangskontrol
        // ligger i RLS, som ikke kan omgås fra klienten.
        getMyPrivileges: builder.query<string[], void>({
            queryFn: async () => {
                const { data: userData, error: userError } = await supabase.auth.getUser()

                if (userError) {
                    // Ingen session er ikke en fejl - så har man ingen
                    // privilegier at vise UI efter.
                    if (userError.name === 'AuthSessionMissingError') {
                        return { data: [] }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: userError.message } }
                }

                if (!userData.user) {
                    return { data: [] }
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('active_organisation_id')
                    .eq('id', userData.user.id)
                    .maybeSingle()

                if (profileError) {
                    return { error: { status: 'CUSTOM_ERROR', error: profileError.message } }
                }

                // Uden aktiv organisation (fx nyoprettet bruger) er der
                // ingen privilegier - og intet ekstra opslag at lave.
                if (!profile?.active_organisation_id) {
                    return { data: [] }
                }

                // Rollen ligger på memberships (US-59) - brugerens rolle i
                // DEN AKTIVE organisation, ikke nødvendigvis i alle sine
                // organisationer.
                const { data: membership, error: membershipError } = await supabase
                    .from('memberships')
                    .select('role_id')
                    .eq('user_id', userData.user.id)
                    .eq('organisation_id', profile.active_organisation_id)
                    .maybeSingle()

                if (membershipError) {
                    return { error: { status: 'CUSTOM_ERROR', error: membershipError.message } }
                }

                if (!membership?.role_id) {
                    return { data: [] }
                }

                const { data, error } = await supabase
                    .from('privileges')
                    .select('name')
                    .eq('role_id', membership.role_id)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: (data ?? []).map((privilege) => privilege.name) }
            },

            providesTags: ['Privilege'],
        }),

        // Henter privilegierne for organisationens roller (US-13). RLS
        // ("Se privilegier i egen organisation") afgrænser allerede til
        // roller i egen organisation.
        getOrganisationPrivileges: builder.query<Privilege[], void>({
            queryFn: async () => {
                const { data, error } = await supabase
                    .from('privileges')
                    .select('id, role_id, name')
                    .order('name')

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return {
                    data: (data ?? []).map((privilege) => ({
                        id: privilege.id,
                        roleId: privilege.role_id,
                        name: privilege.name,
                    })),
                }
            },

            providesTags: ['Privilege'],
        }),

        // Tilknytter et privilege til en rolle (US-13). RLS ("Admin kan
        // oprette privilegier i egen organisation") afviser dette
        // server-side for ikke-admins og for roller uden for egen
        // organisation.
        createPrivilege: builder.mutation<Privilege, CreatePrivilegeInput>({
            queryFn: async ({ roleId, name }) => {
                const trimmed = name.trim()

                if (!trimmed) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Privilegiets navn skal udfyldes.' } }
                }

                const { data, error } = await supabase
                    .from('privileges')
                    .insert({ role_id: roleId, name: trimmed })
                    .select('id, role_id, name')
                    .single()

                if (error) {
                    // Postgres-fejlkode 23505 = unique constraint violation
                    // (role_id, name) - rollen har allerede dette privilege.
                    if (error.code === '23505') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Rollen har allerede dette privilegie.' },
                        }
                    }
                    // 42501 = RLS afviste - fx forsøg på at oprette et
                    // privilegie ved navn "admin" uden selv at være admin.
                    if (error.code === '42501') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Du har ikke rettigheder til at oprette dette privilegie.' },
                        }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: { id: data.id, roleId: data.role_id, name: data.name } }
            },

            invalidatesTags: ['Privilege'],
        }),

        // Omdøber et privilege. RLS ("Admin kan redigere/slette
        // privilegier i egen organisation") afviser dette server-side for
        // ikke-admins og for privilegier uden for egen organisation.
        updatePrivilege: builder.mutation<void, UpdatePrivilegeInput>({
            queryFn: async ({ privilegeId, name }) => {
                const trimmed = name.trim()

                if (!trimmed) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Privilegiets navn skal udfyldes.' } }
                }

                const { error } = await supabase
                    .from('privileges')
                    .update({ name: trimmed })
                    .eq('id', privilegeId)

                if (error) {
                    if (error.code === '23505') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Rollen har allerede dette privilegie.' },
                        }
                    }
                    // 42501 = RLS afviste - fx forsøg på at omdøbe et
                    // privilegie til "admin" uden selv at være admin.
                    if (error.code === '42501') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Du har ikke rettigheder til at redigere dette privilegie.' },
                        }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: ['Privilege'],
        }),

        // Fjerner et privilege fra en rolle. RLS ("Admin kan slette
        // privilegier i egen organisation") afviser dette server-side for
        // ikke-admins og for privilegier uden for egen organisation.
        deletePrivilege: builder.mutation<void, string>({
            queryFn: async (privilegeId) => {
                const { error } = await supabase.from('privileges').delete().eq('id', privilegeId)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: ['Privilege'],
        }),
    }),
})

export const {
    useGetMyPrivilegesQuery,
    useGetOrganisationPrivilegesQuery,
    useCreatePrivilegeMutation,
    useUpdatePrivilegeMutation,
    useDeletePrivilegeMutation,
} = privilegeApi

// Generisk hjælper til at gate UI efter et enkelt privilegie. Admin har
// altid alt (samme regel som has_privilege_or_admin() i databasen).
// isLoading returneres med, så UI'en kan undlade at vise "ingen adgang",
// før svaret rent faktisk er hentet.
export function useHasPrivilege(name: string): { hasPrivilege: boolean; isLoading: boolean } {
    const { data: privileges, isLoading } = useGetMyPrivilegesQuery()

    return {
        hasPrivilege: (privileges?.includes(name) || privileges?.includes(ADMIN_PRIVILEGE)) ?? false,
        isLoading,
    }
}

// Samme som useHasPrivilege, men tjekker om brugeren har MINDST ét af
// flere privilegier. Bruges til at afgøre synlighed af en hel fane/
// sektion, hvor et domæne nu kan have op til 4 relevante privilegie-
// navne (Fase 3) i stedet for ét enkelt manage_X.
export function useHasAnyPrivilege(names: string[]): { hasPrivilege: boolean; isLoading: boolean } {
    const { data: privileges, isLoading } = useGetMyPrivilegesQuery()

    return {
        hasPrivilege:
            (privileges?.includes(ADMIN_PRIVILEGE) || names.some((name) => privileges?.includes(name))) ?? false,
        isLoading,
    }
}
