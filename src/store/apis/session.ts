// src/store/apis/session.ts
//
// Ét sted til "hvem er logget ind, og hvilken organisation er aktiv".
// Opslaget lå før i 10+ endpoints med hver sin fejlnøgle for samme
// tilstand. Hjælperne kaster QueryFailure, så endpoints kører dem inde i
// runQuery (apiError.ts) og ikke skal tjekke hvert trin.

import { supabase } from '../../lib/supabase'
import { errorCode, mapDbError, QueryFailure } from './apiError'

/**
 * Den indloggede brugers id, eller null uden session. Til queries der
 * bare skal vise tomt, når ingen er logget ind (fx lige efter logout).
 */
export async function getOptionalUserId(): Promise<string | null> {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
        if (error.name === 'AuthSessionMissingError') return null
        throw new QueryFailure(mapDbError(error))
    }

    return data.user?.id ?? null
}

/** Den indloggede brugers id. Kaster errors:loginRequired uden session. */
export async function getCurrentUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw new QueryFailure(errorCode('loginRequired'))
    return data.user.id
}

/** En brugers aktive organisation (profiles.active_organisation_id), eller null. */
export async function getActiveOrganisationIdOf(userId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('active_organisation_id')
        .eq('id', userId)
        .maybeSingle()

    if (error) throw new QueryFailure(mapDbError(error))
    return data?.active_organisation_id ?? null
}

/**
 * Den indloggede brugers aktive organisation (US-59). Alt organisations-
 * data skal ske inden for den - aldrig i en anden af brugerens
 * organisationer. Kaster errors:loginRequired / errors:noOrganisation.
 */
export async function getActiveOrganisationId(): Promise<string> {
    const organisationId = await getActiveOrganisationIdOf(await getCurrentUserId())
    if (!organisationId) throw new QueryFailure(errorCode('noOrganisation'))
    return organisationId
}

/** Brugerens rolle i en organisation. Rollen ligger på memberships (US-59), ikke profiles. */
export async function getMembershipRoleId(userId: string, organisationId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('memberships')
        .select('role_id')
        .eq('user_id', userId)
        .eq('organisation_id', organisationId)
        .maybeSingle()

    if (error) throw new QueryFailure(mapDbError(error))
    return data?.role_id ?? null
}
