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
      <div className="bg-[#0B132A] border border-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-100">Medlemmer</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{groupName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Luk"
            aria-label="Luk modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Nuværende medlemmer */}
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wide mb-1.5">
              Nuværende medlemmer ({participants.length})
            </label>
            {loadingParticipants ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-[#C7975D]" />
              </div>
            ) : (
              <ul className="border border-slate-800 rounded-lg divide-y divide-slate-800 max-h-48 overflow-y-auto">
                {participants.map((participant) => (
                  <li key={participant.userId} className="flex items-center gap-3 p-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-100 flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden">
                      {participant.urlPicture ? (
                        <img src={participant.urlPicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(participant.firstName, participant.lastName)
                      )}
                    </div>
                    <p className="text-sm text-slate-100 truncate flex-1 min-w-0">
                      {participant.firstName} {participant.lastName}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemove(participant.userId)}
                      disabled={removingId === participant.userId}
                      className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 shrink-0"
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
              <label className="block text-xs text-slate-400 uppercase tracking-wide">Tilføj medlemmer</label>
              {selectedIds.size > 0 && (
                <span className="text-xs text-[#C7975D]">{selectedIds.size} valgt</span>
              )}
            </div>

            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Søg efter kontakt eller rolle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D]"
              />
            </div>

            <div className="border border-slate-800 rounded-lg max-h-48 overflow-y-auto">
              {loadingMembers ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[#C7975D]" />
                </div>
              ) : filteredAvailableMembers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  {availableMembers.length === 0
                    ? 'Alle organisationens medlemmer er allerede i gruppen.'
                    : 'Ingen kontakter matcher din søgning.'}
                </p>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {filteredAvailableMembers.map((member) => {
                    const isChecked = selectedIds.has(member.id);
                    return (
                      <li key={member.id}>
                        <label className="w-full flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-800/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelected(member.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-[#C7975D] focus:ring-[#C7975D] shrink-0"
                          />
                          <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-100 flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden">
                            {member.urlPicture ? (
                              <img src={member.urlPicture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(member.firstName, member.lastName)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-slate-100 truncate">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{member.roleName ?? 'Ingen rolle'}</p>
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

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
          >
            Luk
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || selectedIds.size === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C7975D] hover:bg-[#b5854b] text-white text-sm font-medium disabled:opacity-60"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Tilføj valgte
          </button>
        </div>
      </div>
    </div>
  );
}