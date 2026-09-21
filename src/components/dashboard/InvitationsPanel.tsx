// src/components/dashboard/InvitationsPanel.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { FormEvent } from 'react'
import {
    useCancelInvitationMutation,
    useGetSentInvitationsQuery,
    useInviteMemberMutation,
} from '../../store/apis/invitationApi'
import { formatDate } from '../../utils/formatDate'



// Invitér en eksisterende Ponos-bruger til den aktive organisation
// (US-67), plus en liste over ventende sendte invitationer med mulighed
// for at fortryde dem. Panelet mountes kun når AdministrationTab
// allerede har bekræftet manage_invitations-privilegiet - selve
// adgangen håndhæves stadig server-side (RPC'en invite_member + RLS).
export function InvitationsPanel() {
    const { t } = useTranslation('organisation')
    const [inviteMember, { isLoading: inviting, error: inviteError }] = useInviteMemberMutation()
    const { data: invitations, isLoading: loadingInvitations, error: listError } = useGetSentInvitationsQuery()
    const [cancelInvitation, { error: cancelError }] = useCancelInvitationMutation()

    const [email, setEmail] = useState('')
    const [sentMessage, setSentMessage] = useState<string | null>(null)
    const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null)
    const [cancellingId, setCancellingId] = useState<string | null>(null)

    async function handleInvite(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSentMessage(null)

        const trimmed = email.trim()
        if (!trimmed) return

        try {
            await inviteMember({ email: trimmed }).unwrap()
            setSentMessage(`Invitation sendt til ${trimmed}.`)
            setEmail('')
        } catch {
            // Fejlen vises via inviteError.
        }
    }

    async function handleCancel(invitationId: string) {
        setCancellingId(invitationId)
        try {
            await cancelInvitation({ invitationId }).unwrap()
        } catch {
            // Fejlen vises via cancelError.
        } finally {
            setCancellingId(null)
            setConfirmingCancelId(null)
        }
    }

    const inviteErrorMessage = readableError(inviteError)
    const cancelErrorMessage = readableError(cancelError)
    const sentListError = readableError(listError)

    return (
        <div>
            <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3 mb-6">
                <div className="flex-1 min-w-[240px]">
                    <label className="block text-sm text-secondary mb-1 dark:text-slate-400" htmlFor="invite-email">{t('invitations.emailLabel')}</label>
                    <input
                        id="invite-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('invitations.emailPlaceholder')}
                        className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                </div>
                <button
                    type="submit"
                    disabled={inviting || !email.trim()}
                    className="bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                    {inviting ? t('invitations.sending') : t('invitations.send')}
                </button>
            </form>

            {sentMessage && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                    {sentMessage}
                </div>
            )}

            {(inviteErrorMessage || cancelErrorMessage) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                    {inviteErrorMessage ?? cancelErrorMessage}
                </div>
            )}

            <h3 className="text-sm font-medium text-secondary mb-3 dark:text-slate-400">{t('invitations.pendingHeading')}</h3>

            {sentListError ? (
                <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                    {sentListError}
                </div>
            ) : loadingInvitations ? (
                <p className="text-secondary dark:text-slate-400">{t('invitations.loading')}</p>
            ) : !invitations || invitations.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">{t('invitations.empty')}</p>
            ) : (
                <ul className="divide-y divide-border-gray border-t border-border-gray dark:divide-slate-700 dark:border-slate-700">
                    {invitations.map((invitation) => (
                        <li key={invitation.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="font-medium">{invitation.firstName} {invitation.lastName}</p>
                                <p className="text-sm text-secondary dark:text-slate-400">{invitation.email}</p>
                                <p className="text-xs text-secondary mt-1 dark:text-slate-400">{t('invitations.invitedOnDate', { date: formatDate(invitation.invitedAt) })}</p>
                            </div>

                            {confirmingCancelId === invitation.id ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-secondary dark:text-slate-400">{t('invitations.areYouSure')}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCancel(invitation.id)}
                                        disabled={cancellingId === invitation.id}
                                        className="text-red-600 text-sm font-medium hover:underline disabled:opacity-60 dark:text-red-400"
                                    >
                                        {cancellingId === invitation.id ? t('invitations.cancelling') : t('invitations.confirmCancelYes')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingCancelId(null)}
                                        disabled={cancellingId === invitation.id}
                                        className="text-secondary text-sm hover:underline disabled:opacity-60 dark:text-slate-400"
                                    >
                                        {t('invitations.undo')}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirmingCancelId(invitation.id)}
                                    className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                                >
                                    {t('invitations.cancelInvitation')}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
