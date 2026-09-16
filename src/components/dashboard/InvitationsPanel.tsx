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
                    <label className="block text-sm text-slate-400 mb-1" htmlFor="invite-email">Inviter via email</label>
                    <input
                        id="invite-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="navn@eksempel.dk"
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent"
                    />
                </div>
                <button
                    type="submit"
                    disabled={inviting || !email.trim()}
                    className="bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                    {inviting ? 'Sender...' : 'Send invitation'}
                </button>
            </form>

            {sentMessage && (
                <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-3 py-2">
                    {sentMessage}
                </div>
            )}

            {(inviteErrorMessage || cancelErrorMessage) && (
                <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                    {inviteErrorMessage ?? cancelErrorMessage}
                </div>
            )}

            <h3 className="text-sm font-medium text-slate-400 mb-3">Ventende invitationer</h3>

            {sentListError ? (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                    {sentListError}
                </div>
            ) : loadingInvitations ? (
                <p className="text-slate-400">Indlæser invitationer...</p>
            ) : !invitations || invitations.length === 0 ? (
                <p className="text-slate-400">Ingen ventende invitationer.</p>
            ) : (
                <ul className="divide-y divide-slate-800 border-t border-slate-800">
                    {invitations.map((invitation) => (
                        <li key={invitation.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="font-medium">{invitation.firstName} {invitation.lastName}</p>
                                <p className="text-sm text-slate-400">{invitation.email}</p>
                                <p className="text-xs text-slate-400 mt-1">Inviteret {formatDate(invitation.invitedAt)}</p>
                            </div>

                            {confirmingCancelId === invitation.id ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-400">Er du sikker?</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCancel(invitation.id)}
                                        disabled={cancellingId === invitation.id}
                                        className="text-red-400 text-sm font-medium hover:underline disabled:opacity-60"
                                    >
                                        {cancellingId === invitation.id ? 'Annullerer...' : 'Ja, annullér'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingCancelId(null)}
                                        disabled={cancellingId === invitation.id}
                                        className="text-slate-400 text-sm hover:underline disabled:opacity-60"
                                    >
                                        Fortryd
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirmingCancelId(invitation.id)}
                                    className="rounded-md border border-red-900/40 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-950/40 transition-colors"
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
