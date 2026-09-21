// src/i18n/i18next.d.ts
//
// Binder t()'s nøgler til de danske ordbøger. Dansk er master: en nøgle
// findes, hvis den findes i locales/da/. Det giver autocomplete i editoren
// og en typefejl ved tastefejl i et nøglenavn - fejl der ellers først
// dukker op som rå nøgletekst i UI'et.
//
// Rent typeniveau, ingen runtime-kost.

import type { daResources } from './config'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof daResources
    // Matcher returnNull: false i config.ts, så t() returnerer string
    // og ikke string | null.
    returnNull: false
  }
}
