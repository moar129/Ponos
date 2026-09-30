// src/pages/profile/ProfilePage.tsx
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LogOut } from 'lucide-react'
import { useGetMyProfileQuery, useUpdateMyProfileMutation } from '../../store/apis/profileApi'
import { useSignOutAndRedirect } from '../../store/hooks/useNavItems'
import ChangePasswordForm from '../../components/profile/ChangePasswordForm'
import { PreferencesSection } from '../../components/profile/PreferencesSection'
import { NotificationSettingsSection } from '../../components/profile/NotificationSettingsSection'
import { NOTIFICATION_SETTINGS_ANCHOR } from '../../utils/notificationDisplay'
import { readableError } from '../../ErrorMessage'
import { Avatar } from '../../components/common/Avatar'
import { Alert } from '../../components/common/Alert'
import { DetailList, DetailRow } from '../../components/common/DetailList'
import { formatFullName } from '../../utils/personName'
import type { Profile, UpdateProfileInput } from '../../types/profile/profileType'

// Tom formular-tilstand, indtil brugeren trykker "Rediger profil" og
// felterne fyldes med profilens nuværende værdier.
const emptyForm: UpdateProfileInput = {
    firstName: '',
    lastName: '',
    description: null,
    urlPicture: null,
}

// se profil og rediger profil. Siden viser brugerens egne
// oplysninger og kan skifte til en redigerings-tilstand for de felter,
// brugeren selv må ændre. Rolle, organisation og e-mail vises kun.
export default function ProfilePage() {
    const { t } = useTranslation(['profile', 'common'])
    const { data: profile, isLoading, error: queryError } = useGetMyProfileQuery()
    const [updateMyProfile, { isLoading: saving, error: mutationError }] = useUpdateMyProfileMutation()
    const { signOutAndRedirect: handleSignOut, signingOut } = useSignOutAndRedirect()

    const [isEditing, setIsEditing] = useState(false)
    const [form, setForm] = useState<UpdateProfileInput>(emptyForm)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [savedMessage, setSavedMessage] = useState(false)

    function startEdit(current: Profile) {
        setForm({
            firstName: current.firstName,
            lastName: current.lastName,
            description: current.description,
            urlPicture: current.urlPicture,
        })
        setValidationError(null)
        setSavedMessage(false)
        setIsEditing(true)
    }

    function cancelEdit() {
        setIsEditing(false)
        setValidationError(null)
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSavedMessage(false)

        if (!form.firstName.trim() || !form.lastName.trim()) {
            setValidationError(t('nameRequired'))
            return
        }
        setValidationError(null)

        try {
            // Tomme tekstfelter gemmes som null i stedet for "", så
            // databasen ikke ender med tomme strenge for valgfri felter.
            await updateMyProfile({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                description: form.description?.trim() || null,
                urlPicture: form.urlPicture?.trim() || null,
            }).unwrap()

            // Mutationen invaliderer 'Profile', så visningen nedenfor
            // henter og viser de nye oplysninger automatisk.
            setIsEditing(false)
            setSavedMessage(true)
        } catch {
            // Fejlen vises via mutationError - vi bliver i redigerings-
            // tilstand, så brugerens indtastninger ikke går tabt.
        }
    }

    if (isLoading) {
        return <p className="text-secondary dark:text-slate-400">{t('loading')}</p>
    }

    if (queryError) {
        return <Alert>{readableError(queryError)}</Alert>
    }

    if (!profile) {
        return <p className="text-secondary dark:text-slate-400">{t('notFound')}</p>
    }

    const saveError = readableError(mutationError)

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 lg:p-8 text-primary dark:text-slate-100">
            {/* Overskrift med profilbillede/ikon og navn */}
            <div className="flex items-center gap-4 mb-6">
                <Avatar
                    firstName={profile.firstName}
                    lastName={profile.lastName}
                    urlPicture={profile.urlPicture}
                    className="w-16 h-16 bg-bg-gray dark:bg-slate-800 text-secondary dark:text-slate-400 border border-border-gray dark:border-slate-700"
                    textClassName="text-xl"
                />
                <div>
                    <h1 className="text-xl font-semibold text-primary dark:text-slate-100">
                        {formatFullName(profile.firstName, profile.lastName)}
                    </h1>
                    <p className="text-sm text-secondary dark:text-slate-400">{profile.email}</p>
                </div>
            </div>

            {savedMessage && !isEditing && <Alert tone="success" className="mb-4">{t('saved')}</Alert>}
            <Alert className="mb-4">{validationError ?? saveError}</Alert>

            {isEditing ? (
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="firstName">{t('fields.firstName')}</label>
                        <input
                            id="firstName"
                            type="text"
                            value={form.firstName}
                            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                            className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="lastName">{t('fields.lastName')}</label>
                        <input
                            id="lastName"
                            type="text"
                            value={form.lastName}
                            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                            className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="description">{t('fields.description')}</label>
                        <textarea
                            id="description"
                            rows={3}
                            value={form.description ?? ''}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="urlPicture">{t('fields.pictureUrl')}</label>
                        <input
                            id="urlPicture"
                            type="url"
                            value={form.urlPicture ?? ''}
                            onChange={(e) => setForm({ ...form, urlPicture: e.target.value })}
                            className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                        />
                    </div>

                    {/* E-mail, rolle og organisation kan ikke redigeres her:
                        e-mail hører til Supabase Auth, og rolle/organisation
                        blokeres server-side. */}
                    <p className="mb-6 text-xs text-secondary dark:text-slate-400">
                        {t('readOnlyNote')}
                    </p>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-accent text-accent-text rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                        >
                            {saving ? t('common:saving') : t('saveChanges')}
                        </button>
                        <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="rounded-md border border-border-gray dark:border-slate-700 px-4 py-2 font-medium text-secondary dark:text-slate-400 hover:bg-bg-gray dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                        >
                            {t('common:cancel')}
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <DetailList>
                        <DetailRow label={t('fields.firstName')}>{profile.firstName}</DetailRow>
                        <DetailRow label={t('fields.lastName')}>{profile.lastName}</DetailRow>
                        <DetailRow label={t('fields.email')}>{profile.email}</DetailRow>
                        <DetailRow label={t('fields.organisation')}>{profile.organisationName ?? t('empty.organisation')}</DetailRow>
                        {/* Rolle vises kun, hvis brugeren har en aktiv organisation */}
                        {profile.activeOrganisationId && (
                            <DetailRow label={t('fields.role')}>{profile.roleName ?? t('empty.role')}</DetailRow>
                        )}
                        <DetailRow label={t('fields.description')}>{profile.description ?? t('empty.description')}</DetailRow>
                    </DetailList>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => startEdit(profile)}
                            className="bg-accent text-accent-text rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors"
                        >
                            {t('editProfile')}
                        </button>
                        <button
                            type="button"
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className="flex items-center gap-2 rounded-md border border-border-gray dark:border-slate-700 px-4 py-2 font-medium text-secondary dark:text-slate-400 hover:bg-bg-gray dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                        >
                            <LogOut className="w-4 h-4" />
                            {signingOut ? t('loggingOut') : t('logout')}
                        </button>
                    </div>
                </>
            )}

            {/* Afsnittene nedenfor skjules under redigering, så der ikke
                står to formularer oven på hinanden. */}
            {!isEditing && (
                <>
                    {/* Sprog + tema - gemmes i browseren, ikke i profiles-tabellen. */}
                    <ProfileSection title={t('preferences.title')}>
                        <PreferencesSection />
                    </ProfileSection>

                    {/* US-79: notifikationsindstillinger - gemmes i databasen
                        med det samme (notification_preferences), ingen Gem-knap. */}
                    <ProfileSection title={t('notifications.title')} id={NOTIFICATION_SETTINGS_ANCHOR}>
                        <NotificationSettingsSection />
                    </ProfileSection>

                    {/* US-69 */}
                    <ProfileSection title={t('passwordHeading')}>
                        <ChangePasswordForm />
                    </ProfileSection>
                </>
            )}
        </div>
    )
}

function ProfileSection({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
    return (
        <section id={id} className="mt-8 pt-6 border-t border-border-gray dark:border-slate-700">
            <h2 className="text-lg font-semibold text-primary dark:text-slate-100 mb-4">{title}</h2>
            {children}
        </section>
    )
}
