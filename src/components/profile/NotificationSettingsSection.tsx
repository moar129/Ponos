import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../i18n/config'
import { getErrorMessage, readableError } from '../../ErrorMessage'
import { ToggleSwitch } from '../common/ToggleSwitch'
import { NOTIFICATION_TYPE_GROUPS, NOTIFICATION_SETTINGS_ANCHOR } from '../../utils/notificationDisplay'
import {
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '../../store/apis/notificationPreferenceApi'
import type { NotificationPreferences, NotificationType } from '../../types/notification/notificationTypes'

// US-79: "Notifikationer"-afsnittet på /bruger. Gemmer med det samme (som
// Visning). Slåede-fra typer oprettes slet ikke - filtreret i databasen
// (skip_muted_notification). Hovedkontakten slukker alt, men de enkelte
// valg huskes, til den tændes igen.
export function NotificationSettingsSection() {
  const { t } = useTranslation(['profile', 'notifications'])
  const td = asDynamic(t)
  const location = useLocation()
  const sectionRef = useRef<HTMLDivElement>(null)

  const { data: preferences, isLoading, error: loadError } = useGetNotificationPreferencesQuery()
  const [updatePreferences] = useUpdateNotificationPreferencesMutation()
  const [saveError, setSaveError] = useState<string | null>(null)

  // Genvej fra /notifikationer (/bruger#notifikationer): indholdet hentes
  // asynkront, så browserens egen hash-scroll rammer ikke.
  useEffect(() => {
    if (!isLoading && location.hash === `#${NOTIFICATION_SETTINGS_ANCHOR}`) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isLoading, location.hash])

  const save = async (next: NotificationPreferences) => {
    setSaveError(null)
    try {
      await updatePreferences(next).unwrap()
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, t('profile:notifications.saveFailed')))
    }
  }

  const toggleType = (type: NotificationType, on: boolean) => {
    if (!preferences) return
    const mutedTypes = on
      ? preferences.mutedTypes.filter((muted) => muted !== type)
      : [...preferences.mutedTypes, type]
    void save({ ...preferences, mutedTypes })
  }

  return (
    <div ref={sectionRef} className="scroll-mt-24">
      {isLoading ? (
        <p className="text-sm text-secondary dark:text-slate-400">{t('profile:notifications.loading')}</p>
      ) : loadError || !preferences ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {readableError(loadError) ?? t('profile:notifications.loadFailed')}
        </p>
      ) : (
        <>
          <div className="py-3 flex items-center justify-between gap-4 border-t border-border-gray dark:border-slate-700">
            <span className="text-sm font-medium text-primary dark:text-slate-100">
              {t('profile:notifications.master')}
            </span>
            <ToggleSwitch
              checked={preferences.enabled}
              onChange={(on) => void save({ ...preferences, enabled: on })}
              label={t('profile:notifications.master')}
            />
          </div>

          <div className={`border-t border-border-gray dark:border-slate-700 ${preferences.enabled ? '' : 'opacity-60'}`}>
            {NOTIFICATION_TYPE_GROUPS.map((group) => (
              <div key={group.key} className="pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-slate-400">
                  {td(`notifications:category.${group.key}`)}
                </p>
                <ul className="divide-y divide-border-gray dark:divide-slate-700">
                  {group.types.map((type) => {
                    const label = td(`notifications:type.${type}`)
                    return (
                      <li key={type} className="py-2.5 pl-3 flex items-center justify-between gap-4">
                        <span className="text-sm text-primary dark:text-slate-100">{label}</span>
                        <ToggleSwitch
                          checked={!preferences.mutedTypes.includes(type)}
                          onChange={(on) => toggleType(type, on)}
                          disabled={!preferences.enabled}
                          label={label}
                        />
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          {saveError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{saveError}</p>}

          <p className="mt-3 text-xs text-secondary dark:text-slate-400">{t('profile:notifications.hint')}</p>
        </>
      )}
    </div>
  )
}
