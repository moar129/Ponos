// components/messaging/ContactListComponent.tsx
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next'
import { Search, Users } from 'lucide-react';
import { useGetOrganisationMembersQuery } from '../../store/apis/roleApi';
import { useGetMyProfileQuery } from '../../store/apis/profileApi';
import { readableError } from '../../ErrorMessage';
import { filterPeople } from '../../utils/personName';
import { Alert } from '../common/Alert';
import { EmptyState } from '../common/EmptyState';
import { Spinner } from '../common/Spinner';
import { MemberIdentity } from './MemberPicker';
import type { ContactListComponentProps } from '../../types/messages/messagesTypes';

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

  const filteredContacts = filterPeople(contacts, searchQuery);
  const errorMessage = readableError(error);

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
          <Spinner block />
        ) : errorMessage ? (
          <Alert className="m-3">{errorMessage}</Alert>
        ) : filteredContacts.length === 0 ? (
          <EmptyState icon={Users} title={searchQuery ? t('noContactsMatch') : t('noOtherMembers')} />
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
                    <MemberIdentity
                      firstName={contact.firstName}
                      lastName={contact.lastName}
                      urlPicture={contact.urlPicture}
                      subtitle={contact.roleName ?? t('noRole')}
                      size="md"
                    />
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