// components/messages/createGroupComponent.tsx
import { useMemo, useState } from 'react';
import { X, Search, Loader2, Users } from 'lucide-react';
import { useGetOrganisationMembersQuery } from '../../store/apis/roleApi';
import { useGetMyProfileQuery } from '../../store/apis/profileApi';
import { useCreateGroupConversationMutation } from '../../store/apis/messageApi';

interface CreateGroupComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function CreateGroupComponent({ isOpen, onClose, onCreated }: CreateGroupComponentProps) {
  const { data: members = [], isLoading: isLoadingMembers } = useGetOrganisationMembersQuery();
  const { data: myProfile } = useGetMyProfileQuery();
  const [createGroupConversation, { isLoading: isCreating }] = useCreateGroupConversationMutation();

  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);

  const contacts = useMemo(
    () => members.filter((member) => member.id !== myProfile?.id),
    [members, myProfile?.id]
  );

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.roleName ?? '').toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  if (!isOpen) return null;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetAndClose = () => {
    setName('');
    setSearchQuery('');
    setSelectedIds(new Set());
    setFormError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError('Gruppen skal have et navn.');
      return;
    }
    if (selectedIds.size < 2) {
      setFormError('Vælg mindst to kontakter til gruppen.');
      return;
    }

    try {
      const conversationId = await createGroupConversation({
        name: name.trim(),
        participantIds: Array.from(selectedIds),
      }).unwrap();

      onCreated(conversationId);
      resetAndClose();
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'error' in err
          ? (err as { error: string }).error
          : 'Kunne ikke oprette gruppen. Prøv igen.';
      setFormError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0B132A] border border-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C7975D]" />
            <h2 className="text-lg font-semibold text-slate-100">Opret gruppe</h2>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Luk"
            aria-label="Luk modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wide mb-1.5">Gruppenavn</label>
            <input
              type="text"
              placeholder="F.eks. Elektriker eller Frontend"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-slate-400 uppercase tracking-wide">Deltagere</label>
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

            <div className="border border-slate-800 rounded-lg max-h-64 overflow-y-auto">
              {isLoadingMembers ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[#C7975D]" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Ingen kontakter matcher din søgning.</p>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {filteredContacts.map((contact) => {
                    const isChecked = selectedIds.has(contact.id);
                    return (
                      <li key={contact.id}>
                        <label className="w-full flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-800/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelected(contact.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-[#C7975D] focus:ring-[#C7975D] shrink-0"
                          />
                          <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-100 flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden">
                            {contact.urlPicture ? (
                              <img src={contact.urlPicture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(contact.firstName, contact.lastName)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-slate-100 truncate">
                              {contact.firstName} {contact.lastName}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{contact.roleName ?? 'Ingen rolle'}</p>
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
          <button type="button" onClick={resetAndClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">
            Annullér
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C7975D] hover:bg-[#b5854b] text-white text-sm font-medium disabled:opacity-60"
          >
            {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
            Opret gruppe
          </button>
        </div>
      </div>
    </div>
  );
}