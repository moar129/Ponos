// components/messaging/ContactListComponent.tsx
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['messages', 'common'])
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
      <div className="p-3 border-b border-border-gray dark:border-slate-700">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-slate-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-3 py-2 text-sm text-primary focus:outline-none focus:border-accent transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : errorMessage ? (
          <div className="m-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
            {errorMessage}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-secondary px-4 dark:text-slate-400">
            <Users className="w-8 h-8 mb-2 stroke-[1.5] text-secondary dark:text-slate-400" />
            <p className="text-sm">
              {searchQuery ? t('noContactsMatch') : t('noOtherMembers')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border-gray dark:divide-slate-700">
            {filteredContacts.map((contact) => {
              const isSelected = selectedContactId === contact.id;
              return (
                <li key={contact.id}>
                  <button
                    type="button"
                    onClick={() => onSelectContact?.(contact)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      isSelected ? 'bg-bg-gray dark:bg-slate-700' : 'hover:bg-bg-gray/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
                      {contact.urlPicture ? (
                        <img src={contact.urlPicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(contact.firstName, contact.lastName)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary truncate dark:text-slate-100">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-xs text-secondary truncate dark:text-slate-400">
                        {contact.roleName ?? t('noRole')}
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