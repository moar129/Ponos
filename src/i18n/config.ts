// src/i18n/config.ts
//
// i18next-opsætningen. Dansk er bundtet statisk, fordi det både er
// standardsproget og den sidste fallback - det skal være der med det
// samme, uden en async-runde. Alle andre sprog hentes som egne chunks,
// første gang de vælges, så bundlen ikke vokser med antallet af sprog.

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, isSupportedLanguage } from './languages'

import daCommon from './locales/da/common.json'
import daNav from './locales/da/nav.json'
import daAuth from './locales/da/auth.json'
import daPublic from './locales/da/public.json'
import daDashboard from './locales/da/dashboard.json'
import daOrganisation from './locales/da/organisation.json'
import daRoles from './locales/da/roles.json'
import daProfile from './locales/da/profile.json'
import daDatalayer from './locales/da/datalayer.json'
import daTasks from './locales/da/tasks.json'
import daNews from './locales/da/news.json'
import daMessages from './locales/da/messages.json'
import daNotifications from './locales/da/notifications.json'
import daErrors from './locales/da/errors.json'

export const NAMESPACES = [
  'common',
  'nav',
  'auth',
  'public',
  'dashboard',
  'organisation',
  'roles',
  'profile',
  'datalayer',
  'tasks',
  'news',
  'messages',
  'notifications',
  'errors',
] as const

export type Namespace = (typeof NAMESPACES)[number]

export const daResources = {
  common: daCommon,
  nav: daNav,
  auth: daAuth,
  public: daPublic,
  dashboard: daDashboard,
  organisation: daOrganisation,
  roles: daRoles,
  profile: daProfile,
  datalayer: daDatalayer,
  tasks: daTasks,
  news: daNews,
  messages: daMessages,
  notifications: daNotifications,
  errors: daErrors,
}

// Vite samler alle locale-filer på byggetidspunktet. import.meta.glob
// klarer sig med at et sprog endnu ikke findes (relevant mens ordbøgerne
// bygges op sprog for sprog) - opslaget giver bare undefined, og i18next
// falder tilbage til engelsk/dansk.
// Dansk er undtaget: det er importeret statisk ovenfor, og at have det
// begge steder gør den dynamiske import virkningsløs (Vite advarer).
const localeModules = import.meta.glob<{ default: Record<string, unknown> }>([
  './locales/*/*.json',
  '!./locales/da/*.json',
])

// Sprog der allerede er lagt ind i i18next. Dansk er bundtet statisk.
const loadedLanguages = new Set<string>([DEFAULT_LANGUAGE])

/**
 * Henter og registrerer alle namespaces for ét sprog. Kaldes af
 * useLanguage før changeLanguage, så teksterne er på plads inden
 * komponenterne rendrer igen. Gentagne kald er gratis.
 */
export async function loadLanguage(code: string): Promise<void> {
  if (loadedLanguages.has(code) || !isSupportedLanguage(code)) return

  await Promise.all(
    NAMESPACES.map(async (ns) => {
      const loader = localeModules[`./locales/${code}/${ns}.json`]
      if (!loader) return
      const module = await loader()
      i18n.addResourceBundle(code, ns, module.default, true, true)
    }),
  )

  loadedLanguages.add(code)
}

// Pre-hydration-scriptet i index.html har allerede afgjort sproget og
// skrevet det på <html lang>, så vi læser det derfra i stedet for at
// gentage localStorage/navigator-logikken her.
function getInitialLanguage(): string {
  const fromDocument = document.documentElement.lang
  return isSupportedLanguage(fromDocument) ? fromDocument : DEFAULT_LANGUAGE
}

const initialLanguage = getInitialLanguage()

i18n.use(initReactI18next).init({
  lng: initialLanguage,
  // Engelsk før dansk: en manglende nøgle på fx tysk er mere brugbar på
  // engelsk end på dansk. Dansk er sidste udvej og er altid komplet.
  fallbackLng: ['en', DEFAULT_LANGUAGE],
  ns: NAMESPACES,
  defaultNS: 'common',
  resources: { da: daResources },
  interpolation: {
    // React escaper selv alt output - dobbelt-escaping ville vise &amp;
    escapeValue: false,
  },
  returnNull: false,
})

// Starter sprogindlæsningen med det samme, hvis brugeren ikke kører
// dansk. Indtil den lander, viser appen dansk fallback.
if (initialLanguage !== DEFAULT_LANGUAGE) {
  void loadLanguage(initialLanguage).then(() => i18n.changeLanguage(initialLanguage))
}

export default i18n

// t() er typet til de kendte nøgler i locales/da (se i18next.d.ts), så
// tastefejl i en litteral nøgle bliver en byggefejl. Nogle nøgler kendes
// dog først ved runtime - fx roles:domain.<domain> bygget af et
// privilegie-domæne, eller en låse-begrundelse et rent modul har
// returneret. asDynamic løsner typningen præcis dér, uden at svække den
// alle andre steder. i18next returnerer selv nøglen uændret, hvis den
// ikke findes.
export type DynamicTFunction = (key: string) => string

export function asDynamic(t: unknown): DynamicTFunction {
  return t as DynamicTFunction
}
