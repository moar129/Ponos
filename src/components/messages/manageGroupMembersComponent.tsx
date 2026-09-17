// components/messages/manageGroupMembersComponent.tsx
import { useMemo, useState } from 'react';
import { X, Search, Loader2, UserPlus, UserMinus } from 'lucide-react';
import {
  useGetConversationParticipantsQuery,
  useAddGroupParticipantsMutation,
  useRemoveGroupParticipantMutation,
} from '../../store/apis/messageApi';
import { useGetOrganisationMembersQuery } from '../../store/apis/roleApi';
import type { ManageGroupMembersComponentProps } from '../../types/messages/messagesTypes';


function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function readableError(err: unknown): string | null {
  if (!err) return null;
  if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
    return err.error;
  }
  return 'Noget gik galt. Prøv igen.';
}

// US-B9: administrer medlemmer i en gruppesamtale - fjern eksisterende
// deltagere, og tilføj nye fra organisationens medlemmer, der endnu ikke
// er med i gruppen. Åbnes fra GroupConversationComponent's header.
export function ManageGroupMembersComponent({
  isOpen,
  onClose,
  conversationId,
  groupName,
}: ManageGroupMembersComponentProps) {
  const { data: participants = [], isLoading: loadingParticipants } =
    useGetConversationParticipantsQuery(conversationId, { skip: !isOpen });
  const { data: members = [], isLoading: loadingMembers } = useGetOrganisationMembersQuery();

  const [addParticipants, { isLoading: adding, error: addError }] = useAddGroupParticipantsMutation();
  const [removeParticipant, { error: removeError }] = useRemoveGroupParticipantMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const participantIds = useMemo(() => new Set(participants.map((p) => p.userId)), [participants]);

  const availableMembers = useMemo(
    () => members.filter((member) => !participantIds.has(member.id)),
    [members, participantIds]
  );

  const filteredAvailableMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableMembers;
    return availableMembers.filter(
      (m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        (m.roleName ?? '').toLowerCase().includes(q)
    );
  }, [availableMembers, searchQuery]);

  if (!isOpen) return null;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) {
      setFormError('Vælg mindst ét medlem at tilføje.');
      return;
    }
    setFormError(null);

    try {
      await addParticipants({ conversationId, userIds: Array.from(selectedIds) }).unwrap();
      setSelectedIds(new Set());
      setSearchQuery('');
    } catch (err) {
      setFormError(readableError(err));
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    try {
      await removeParticipant({ conversationId, userId }).unwrap();
    } catch {
      // Fejlen vises via removeError.
    } finally {
      setRemovingId(null);
    }
  };

  const errorMessage = formError ?? readableError(addError) ?? readableError(removeError);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-border-gray dark:border-slate-700">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-primary dark:text-slate-100">Medlemmer</h2>
            <p className="text-xs text-secondary mt-0.5 truncate dark:text-slate-400">{groupName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
            title="Luk"
            aria-label="Luk modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          {/* Nuværende medlemmer */}
          <div>
            <label className="block text-xs text-secondary uppercase tracking-wide mb-1.5 dark:text-slate-400">
              Nuværende medlemmer ({participants.length})
            </label>
            {loadingParticipants ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
              </div>
            ) : (
              <ul className="border border-border-gray rounded-lg divide-y divide-border-gray max-h-48 overflow-y-auto dark:border-slate-700 dark:divide-slate-700">
                {participants.map((participant) => (
                  <li key={participant.userId} className="flex items-center gap-3 p-2.5">
                    <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden">
                      {participant.urlPicture ? (
                        <img src={participant.urlPicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(participant.firstName, participant.lastName)
                      )}
                    </div>
                    <p className="text-sm text-primary truncate flex-1 min-w-0 dark:text-slate-100">
                      {participant.firstName} {participant.lastName}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemove(participant.userId)}
                      disabled={removingId === participant.userId}
                      className="p-1.5 rounded-md text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 shrink-0 dark:text-slate-400 dark:hover:text-red-400"
                      title="Fjern fra gruppen"
                      aria-label={`Fjern ${participant.firstName} fra gruppen`}
                    >
                      {removingId === participant.userId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserMinus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tilføj nye medlemmer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-secondary uppercase tracking-wide dark:text-slate-400">Tilføj medlemmer</label>
              {selectedIds.size > 0 && (
                <span className="text-xs text-accent">{selectedIds.size} valgt</span>
              )}
            </div>

            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-slate-400" />
              <input
                type="text"
                placeholder="Søg efter kontakt eller rolle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="border border-border-gray rounded-lg max-h-48 overflow-y-auto dark:border-slate-700">
              {loadingMembers ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                </div>
              ) : filteredAvailableMembers.length === 0 ? (
                <p className="text-sm text-secondary text-center py-6 dark:text-slate-400">
                  {availableMembers.length === 0
                    ? 'Alle organisationens medlemmer er allerede i gruppen.'
                    : 'Ingen kontakter matcher din søgning.'}
                </p>
              ) : (
                <ul className="divide-y divide-border-gray dark:divide-slate-700">
                  {filteredAvailableMembers.map((member) => {
                    const isChecked = selectedIds.has(member.id);
                    return (
                      <li key={member.id}>
                        <label className="w-full flex items-center gap-3 p-2.5 cursor-pointer hover:bg-bg-gray/50 transition-colors dark:hover:bg-slate-700/50">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelected(member.id)}
                            className="w-4 h-4 rounded border-border-gray text-accent focus:ring-accent shrink-0 dark:border-slate-700"
                          />
                          <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden">
                            {member.urlPicture ? (
                              <img src={member.urlPicture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(member.firstName, member.lastName)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-primary truncate dark:text-slate-100">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-xs text-secondary truncate dark:text-slate-400">{member.roleName ?? 'Ingen rolle'}</p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-gray dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
          >
            Luk
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || selectedIds.size === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-60"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Tilføj valgte
          </button>
        </div>
      </div>
    </div>
  );
}
