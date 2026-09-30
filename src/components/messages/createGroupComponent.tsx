// components/messages/createGroupComponent.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { Loader2, Users } from 'lucide-react';
import { useGetOrganisationMembersQuery } from '../../store/apis/roleApi';
import { useGetMyProfileQuery } from '../../store/apis/profileApi';
import { useCreateGroupConversationMutation } from '../../store/apis/messageApi';
import { getErrorMessage } from '../../ErrorMessage';
import { toggleInSet } from '../../utils/toggle';
import { Alert } from '../common/Alert';
import { Modal } from '../common/Modal';
import { MemberPicker } from './MemberPicker';
import type { CreateGroupComponentProps } from '../../types/messages/messagesTypes';

// Mountes kun mens den er åben, så formularen altid starter tom.
export function CreateGroupComponent({ onClose, onCreated }: CreateGroupComponentProps) {
  const { t } = useTranslation(['messages', 'common'])
  const { data: members = [], isLoading: isLoadingMembers } = useGetOrganisationMembersQuery();
  const { data: myProfile } = useGetMyProfileQuery();
  const [createGroupConversation, { isLoading: isCreating }] = useCreateGroupConversationMutation();

  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);

  const contacts = members.filter((member) => member.id !== myProfile?.id);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError(t('group.nameRequired'));
      return;
    }
    if (selectedIds.size < 2) {
      setFormError(t('group.atLeastTwo'));
      return;
    }

    try {
      const conversationId = await createGroupConversation({
        name: name.trim(),
        participantIds: Array.from(selectedIds),
      }).unwrap();

      onCreated(conversationId);
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, t('group.createFailed')));
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={t('group.create')}
      icon={Users}
      closeOnBackdrop={false}
      disableClose={isCreating}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700">
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-text text-sm font-medium disabled:opacity-60"
          >
            {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('group.create')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Alert>{formError}</Alert>

        <label className="block">
          <span className="block text-xs text-secondary uppercase tracking-wide mb-1.5 dark:text-slate-400">{t('group.nameLabel')}</span>
          <input
            type="text"
            placeholder={t('group.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
        </label>

        <MemberPicker
          label={t('group.participants')}
          members={contacts}
          selectedIds={selectedIds}
          onToggle={(id) => setSelectedIds((prev) => toggleInSet(prev, id))}
          isLoading={isLoadingMembers}
          emptyText={t('noOtherMembers')}
        />
      </div>
    </Modal>
  );
}
