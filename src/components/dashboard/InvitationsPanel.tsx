// src/components/dashboard/InvitationsPanel.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import {
    useCancelInvitationMutation,
    useGetSentInvitationsQuery,
    useInviteMemberMutation,
} from '../../store/apis/invitationApi'

// Udtrækker en læsbar fejlbesked fra RTK Query's error-objekt, som kan
// komme i lidt forskellige former afhængigt af hvor fejlen opstod.
function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

// Invitér en eksisterende Ponos-bruger til den aktive organisation
// (US-67), plus en liste over ventende sendte invitationer med mulighed
// for at fortryde dem. Panelet mountes kun når AdministrationTab
// allerede har bekræftet manage_invitations-privilegiet - selve
// adgangen håndhæves stadig server-side (RPC'en invite_member + RLS).
export function InvitationsPanel() {
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
                    <label className="block text-sm text-secondary mb-1" htmlFor="invite-email">Inviter via email</label>
                    <input
                        id="invite-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="navn@eksempel.dk"
                        className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>
                <button
                    type="submit"
                    disabled={inviting || !email.trim()}
                    className="bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                >
                    {inviting ? 'Sender...' : 'Send invitation'}
                </button>
            </form>

            {sentMessage && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                    {sentMessage}
                </div>
            )}

            {(inviteErrorMessage || cancelErrorMessage) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {inviteErrorMessage ?? cancelErrorMessage}
                </div>
            )}

            <h3 className="text-sm font-medium text-secondary mb-3">Ventende invitationer</h3>

            {sentListError ? (
                <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {sentListError}
                </div>
            ) : loadingInvitations ? (
                <p className="text-secondary">Indlæser invitationer...</p>
            ) : !invitations || invitations.length === 0 ? (
                <p className="text-secondary">Ingen ventende invitationer.</p>
            ) : (
                <ul className="divide-y divide-border-gray border-t border-border-gray">
                    {invitations.map((invitation) => (
                        <li key={invitation.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="font-medium">{invitation.firstName} {invitation.lastName}</p>
                                <p className="text-sm text-secondary">{invitation.email}</p>
                                <p className="text-xs text-secondary mt-1">Inviteret {formatDate(invitation.invitedAt)}</p>
                            </div>

                            {confirmingCancelId === invitation.id ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-secondary">Er du sikker?</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCancel(invitation.id)}
                                        disabled={cancellingId === invitation.id}
                                        className="text-red-700 text-sm font-medium hover:underline disabled:opacity-60"
                                    >
                                        {cancellingId === invitation.id ? 'Annullerer...' : 'Ja, annullér'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingCancelId(null)}
                                        disabled={cancellingId === invitation.id}
                                        className="text-secondary text-sm hover:underline disabled:opacity-60"
                                    >
                                        Fortryd
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirmingCancelId(invitation.id)}
                                    className="rounded-md border border-border-gray px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                                >
                                    Annullér
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
