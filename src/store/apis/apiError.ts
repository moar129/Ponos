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
// mapDatalayerError og de indlejrede 42501-tjek i privilegeApi/roleApi).

export type QueryError = { status: 'CUSTOM_ERROR'; error: string }

/** Præfiks som getErrorMessage genkender og slår op i errors-namespacet. */
export const ERROR_CODE_PREFIX = 'errors:'

/** Bygger en fejl ud fra en nøgle i errors-namespacet. */
export function errorCode(key: string): QueryError {
  return { status: 'CUSTOM_ERROR', error: `${ERROR_CODE_PREFIX}${key}` }
}

/**
 * 42501 = RLS afviste, fordi brugeren mangler det relevante privilegie.
 * actionKey peger på en fuld sætning under errors:permission.* - ikke et
 * verbum der sættes sammen med en fast indledning. Sammensætning knækker
 * ordstillingen på fx tysk, hvor verbet skal til sidst.
 *
 * Alt andet end 42501 er databasens egen besked. Den er stadig dansk
 * (Postgres raise exception) - håndteres i Fase 5.
 */
export function mapPermissionError(
  error: { code?: string; message: string },
  actionKey: string,
): QueryError {
  if (error.code === '42501') {
    return errorCode(`permission.${actionKey}`)
  }
  return { status: 'CUSTOM_ERROR', error: error.message }
}
