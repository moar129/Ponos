// src/components/messages/MemberPicker.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { filterPeople, formatFullName } from '../../utils/personName';
import { Avatar } from '../common/Avatar';
import { Spinner } from '../common/Spinner';
import type { MemberIdentityProps, MemberPickerProps } from '../../types/messages/messagesTypes';

// Avatar + navn (+ rolle) - én række i kontakt- og medlemslisterne.
export function MemberIdentity({
  firstName,
  lastName,
  urlPicture,
  subtitle,
  size = 'sm',
}: MemberIdentityProps) {
  return (
    <>
      <Avatar
        firstName={firstName}
        lastName={lastName}
        urlPicture={urlPicture}
        className={`${size === 'md' ? 'w-10 h-10' : 'w-8 h-8'} bg-secondary text-white`}
        textClassName={size === 'md' ? 'text-sm' : 'text-xs'}
      />
      <div className="min-w-0 flex-1">
        <p className={`text-sm text-primary truncate dark:text-slate-100 ${size === 'md' ? 'font-medium' : ''}`}>
          {formatFullName(firstName, lastName)}
        </p>
        {subtitle && <p className="text-xs text-secondary truncate dark:text-slate-400">{subtitle}</p>}
      </div>
    </>
  );
}

// Søgbar afkrydsningsliste over organisationsmedlemmer - bruges når en
// gruppe oprettes, og når der tilføjes medlemmer til en eksisterende.
export function MemberPicker({ members, selectedIds, onToggle, isLoading, emptyText, label }: MemberPickerProps) {
  const { t } = useTranslation(['messages', 'common']);
  const [searchQuery, setSearchQuery] = useState('');
  const filtered = filterPeople(members, searchQuery);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-secondary uppercase tracking-wide dark:text-slate-400">{label}</p>
        {selectedIds.size > 0 && (
          <span className="text-xs text-accent">{t('common:selectedCount', { count: selectedIds.size })}</span>
        )}
      </div>

      <div className="relative mb-2">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-slate-400" />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
        />
      </div>

      <div className="border border-border-gray rounded-lg max-h-56 overflow-y-auto dark:border-slate-700">
        {isLoading ? (
          <Spinner block />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-secondary text-center py-6 dark:text-slate-400">
            {members.length === 0 ? emptyText : t('noContactsMatch')}
          </p>
        ) : (
          <ul className="divide-y divide-border-gray dark:divide-slate-700">
            {filtered.map((member) => (
              <li key={member.id}>
                <label className="w-full flex items-center gap-3 p-2.5 cursor-pointer hover:bg-bg-gray/50 transition-colors dark:hover:bg-slate-700/50">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(member.id)}
                    onChange={() => onToggle(member.id)}
                    className="w-4 h-4 rounded border-border-gray text-accent focus:ring-accent shrink-0 dark:border-slate-700"
                  />
                  <MemberIdentity
                    firstName={member.firstName}
                    lastName={member.lastName}
                    urlPicture={member.urlPicture}
                    subtitle={member.roleName ?? t('noRole')}
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
