import i18n from './i18n/config';
import { ERROR_CODE_PREFIX } from './store/apis/apiError';

// Ét sted til at gøre en fejl fra RTK Query/Supabase læsbar.
//
// Endpoints returnerer en nøgle ('errors:permission.createTask'), fordi
// de kører uden for React og ikke kan kalde useTranslation(). Her slås
// nøglen op, så beskeden kommer på brugerens sprog - og skifter sprog
// sammen med resten af UI'et, hvis den allerede står på skærmen.
//
// Alt der ikke er en nøgle, returneres uændret. Det gælder blandt andet
// Postgres' egne raise exception-beskeder, som stadig er danske
// (håndteres i Fase 5) - de skal vises, ikke skjules bag en generisk
// fejl, fordi de ofte er den eneste forklaring brugeren får.

// t() er typet til de kendte nøgler i locales/da (se i18n/i18next.d.ts),
// så komponenter får autocomplete og fejl ved tastefejl. Her kommer
// nøglen derimod fra et endpoint som en almindelig streng og kan ikke
// kontrolleres på forhånd. Dette er det ENESTE sted den begrænsning
// løsnes; i18next returnerer selv nøglen uændret, hvis den ikke findes.
const translateKey = i18n.t as (key: string) => string;

function extractRawMessage(err: unknown): string | null {
  if (typeof err === 'string') return err.trim() || null;

  if (err && typeof err === 'object') {
    const error = err as {
      data?: { error?: unknown };
      error?: unknown;
      message?: unknown;
    };

    if (typeof error.data?.error === 'string' && error.data.error.trim()) return error.data.error;
    if (typeof error.error === 'string' && error.error.trim()) return error.error;
    if (typeof error.message === 'string' && error.message.trim()) return error.message;
  }

  return null;
}

/**
 * @param fallback Valgfri egen besked, hvis fejlen ikke kunne læses.
 *                 Udelades den, bruges den oversatte standardbesked.
 */
export function getErrorMessage(err: unknown, fallback?: string): string {
  if (err == null) return fallback ?? i18n.t('errors:generic');

  const raw = extractRawMessage(err);
  if (raw) {
    return raw.startsWith(ERROR_CODE_PREFIX) ? translateKey(raw) : raw;
  }

  return fallback ?? i18n.t('errors:generic');
}

/**
 * Samme som getErrorMessage, men returnerer null for "ingen fejl".
 * Afløser de 20 lokale readableError()-funktioner, der hver især
 * gentog den samme udpakning med hver sin danske standardbesked.
 */
export function readableError(err: unknown): string | null {
  if (err == null) return null;
  return getErrorMessage(err);
}
