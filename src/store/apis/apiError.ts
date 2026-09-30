// src/store/apis/apiError.ts
//
// Fælles fejlhåndtering for alle RTK Query-endpoints.
//
// Endpoints kører uden for React, så de kan ikke kalde useTranslation().
// I stedet returnerer de en NØGLE ('errors:permission.createTask'), og
// getErrorMessage() i src/ErrorMessage.ts oversætter den, når fejlen
// vises. Det betyder også, at en fejl der allerede står på skærmen,
// skifter sprog sammen med resten af UI'et.
//
// Afløser fire næsten identiske mappers (mapTaskError, mapNewsError,
// mapDatalayerError) og de indlejrede 23505/42501-tjek i endpoints.

export type QueryError = { status: 'CUSTOM_ERROR'; error: string }

/** Præfiks som getErrorMessage genkender og slår op i errors-namespacet. */
export const ERROR_CODE_PREFIX = 'errors:'

/** Bygger en fejl ud fra en nøgle i errors-namespacet. */
export function errorCode(key: string): QueryError {
  return { status: 'CUSTOM_ERROR', error: `${ERROR_CODE_PREFIX}${key}` }
}

type DbError = { code?: string; hint?: string | null; message: string }

/**
 * Postgres-koder med fast betydning på tværs af tabeller, som det enkelte
 * endpoint giver sin egen fejlnøgle:
 * - unique:     23505, fx "der findes allerede en rolle med dette navn"
 * - check:      23514, fx en ugyldig farvekode
 * - permission: 42501 = RLS afviste, fordi brugeren mangler privilegiet.
 *   Peger på en fuld sætning under errors:permission.* - ikke et verbum
 *   der sættes sammen med en fast indledning. Sammensætning knækker
 *   ordstillingen på fx tysk, hvor verbet skal til sidst.
 */
export type DbErrorKeys = { unique?: string; check?: string; permission?: string }

/**
 * En fejl fra databasen. Postgres' raise exception sætter en stabil kode
 * i `hint` (se docs/migrations/2026-09-21-error-hints.sql), mens `message`
 * fortsat er den danske tekst.
 *
 * Kender vi koden, oversættes den. Gør vi ikke - fordi migrationen ikke er
 * kørt endnu, eller fordi en ny raise exception er kommet til siden - vises
 * databasens egen besked. Den er stadig en forklaring brugeren kan bruge,
 * og bedre end en generisk fejl.
 *
 * Bruges også til fejl der ikke kommer fra Postgres (fx supabase.auth).
 * De har intet hint og falder derfor bare igennem til message.
 */
export function mapDbError(error: DbError, keys: DbErrorKeys = {}): QueryError {
  if (keys.unique && error.code === '23505') return errorCode(keys.unique)
  if (keys.check && error.code === '23514') return errorCode(keys.check)
  if (keys.permission && error.code === '42501') return errorCode(`permission.${keys.permission}`)
  if (error.hint) return errorCode(`db.${error.hint}`)
  return { status: 'CUSTOM_ERROR', error: error.message }
}

/** Genvej til det hyppigste tilfælde: kun 42501 har en egen nøgle. */
export function mapPermissionError(error: DbError, actionKey: string): QueryError {
  return mapDbError(error, { permission: actionKey })
}

export type QueryResult<T> = { data: T; error?: undefined } | { error: QueryError; data?: undefined }

/**
 * Bærer en færdig QueryError gennem et throw. Hjælperne i session.ts
 * kaster den, så et endpoint kan kalde dem uden at tjekke hvert trin -
 * runQuery fanger den og returnerer fejlen.
 */
export class QueryFailure extends Error {
  readonly queryError: QueryError

  constructor(queryError: QueryError) {
    super(queryError.error)
    this.queryError = queryError
  }
}

export function toQueryError(err: unknown): QueryError {
  if (err instanceof QueryFailure) return err.queryError
  if (err instanceof Error) return { status: 'CUSTOM_ERROR', error: err.message }
  return errorCode('generic')
}

/** Kører et queryFn-body og gør alt der kastes til en QueryError. */
export async function runQuery<T>(fn: () => Promise<QueryResult<T>>): Promise<QueryResult<T>> {
  try {
    return await fn()
  } catch (err) {
    return { error: toQueryError(err) }
  }
}
