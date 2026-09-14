// components/messaging/ContactListComponent.tsx
import { useMemo, useState } from 'react';
import { Search, Loader2, Users } from 'lucide-react';
import { useGetOrganisationMembersQuery } from '../../store/apis/roleApi';
import { useGetMyProfileQuery } from '../../store/apis/profileApi';
import type { OrganisationMember } from '../../types/role/roleType';

interface ContactListComponentProps {
  selectedContactId?: string | null;
  onSelectContact?: (contact: OrganisationMember) => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function ContactListComponent({ selectedContactId, onSelectContact }: ContactListComponentProps) {
  const { data: members = [], isLoading, error } = useGetOrganisationMembersQuery();
  const { data: myProfile } = useGetMyProfileQuery();
  const [searchQuery, setSearchQuery] = useState('');

  // Ekskluder mig selv - jeg skal ikke kunne "skrive til mig selv" fra kontaktlisten.
  const contacts = useMemo(
    () => members.filter((member) => member.id !== myProfile?.id),
    [members, myProfile?.id]
  );

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.roleName ?? '').toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  const errorMessage =
    error && typeof error === 'object' && 'error' in error
      ? (error as { error: string }).error
      : null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Søg efter kontakt eller rolle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#C7975D]" />
          </div>
        ) : errorMessage ? (
          <div className="m-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {errorMessage}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 px-4">
            <Users className="w-8 h-8 mb-2 stroke-[1.5] text-slate-500" />
            <p className="text-sm">
              {searchQuery ? 'Ingen kontakter matcher din søgning.' : 'Ingen andre medlemmer i din organisation endnu.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {filteredContacts.map((contact) => {
              const isSelected = selectedContactId === contact.id;
              return (
                <li key={contact.id}>
                  <button
                    type="button"
                    onClick={() => onSelectContact?.(contact)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      isSelected ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-700 text-slate-100 flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
                      {contact.urlPicture ? (
                        <img src={contact.urlPicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(contact.firstName, contact.lastName)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {contact.roleName ?? 'Ingen rolle'}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}