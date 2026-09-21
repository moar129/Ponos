import { useTranslation } from 'react-i18next'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../store/hooks/useTheme'
import { LanguageSelector } from '../common/LanguageSelector'

// "Visning"-afsnittet på /bruger. Bevidst uden Gem-knap: både sprog og
// tema ligger i localStorage, ikke i profiles-tabellen, så der er intet
// at gemme og ingen server-rundtur. Det holder afsnittet adskilt fra
// profilformularens "Gem ændringer", som faktisk skriver til databasen.
export function PreferencesSection() {
  const { t } = useTranslation(['profile', 'common'])
  const { mode, setTheme } = useTheme()

  const themeButtonClass = (isActive: boolean) =>
    `flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-accent text-white'
        : 'border border-border-gray dark:border-slate-700 text-secondary dark:text-slate-400 hover:bg-bg-gray dark:hover:bg-slate-700'
    }`

  return (
    <>
      <dl className="divide-y divide-border-gray dark:divide-slate-700 border-t border-border-gray dark:border-slate-700">
        <div className="py-3 flex flex-wrap items-center justify-between gap-4">
          <dt className="text-sm text-secondary dark:text-slate-400">
            {t('common:language.label')}
          </dt>
          <dd>
            <LanguageSelector variant="select" />
          </dd>
        </div>

        <div className="py-3 flex flex-wrap items-center justify-between gap-4">
          <dt className="text-sm text-secondary dark:text-slate-400">
            {t('common:theme.label')}
          </dt>
          <dd className="flex gap-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              aria-pressed={mode === 'light'}
              className={themeButtonClass(mode === 'light')}
            >
              <Sun className="w-4 h-4 shrink-0" />
              {t('common:theme.light')}
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              aria-pressed={mode === 'dark'}
              className={themeButtonClass(mode === 'dark')}
            >
              <Moon className="w-4 h-4 shrink-0" />
              {t('common:theme.dark')}
            </button>
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-secondary dark:text-slate-400">
        {t('profile:preferences.hint')}
      </p>
    </>
  )
}
