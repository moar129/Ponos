// components/messages/manageGroupMembersComponent.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import {
  useGetConversationParticipantsQuery,
  useAddGroupParticipantsMutation,
  useRemoveGroupParticipantMutation,
} from '../../store/apis/messageApi';
import { useGetOrganisationMembersQuery } from '../../store/apis/roleApi';
import type { ManageGroupMembersComponentProps } from '../../types/messages/messagesTypes';
import { toggleInSet } from '../../utils/toggle';
import { Alert } from '../common/Alert';
import { Modal } from '../common/Modal';
import { Spinner } from '../common/Spinner';
import { MemberIdentity, MemberPicker } from './MemberPicker';

// US-B9: administrer medlemmer i en gruppesamtale - fjern eksisterende
// deltagere, og tilføj nye fra organisationens medlemmer, der endnu ikke
// er med i gruppen. Åbnes fra GroupConversationComponent's header.
export function ManageGroupMembersComponent({
  onClose,
  conversationId,
  groupName,
}: ManageGroupMembersComponentProps) {
  const { t } = useTranslation(['messages', 'common'])
  const { data: participants = [], isLoading: loadingParticipants } =
    useGetConversationParticipantsQuery(conversationId);
  const { data: members = [], isLoading: loadingMembers } = useGetOrganisationMembersQuery();

  const [addParticipants, { isLoading: adding, error: addError }] = useAddGroupParticipantsMutation();
  const [removeParticipant, { error: removeError }] = useRemoveGroupParticipantMutation();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const participantIds = new Set(participants.map((p) => p.userId));
  const availableMembers = members.filter((member) => !participantIds.has(member.id));

  const handleAdd = async () => {
    if (selectedIds.size === 0) {
      setFormError(t('group.selectAtLeastOne'));
      return;
    }
    setFormError(null);

    try {
      await addParticipants({ conversationId, userIds: Array.from(selectedIds) }).unwrap();
      setSelectedIds(new Set());
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
    <Modal
      onClose={onClose}
      title={t('group.members')}
      subtitle={groupName}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {t('common:close')}
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || selectedIds.size === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-text text-sm font-medium disabled:opacity-60"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {t('group.addSelected')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert>{errorMessage}</Alert>

        {/* Nuværende medlemmer */}
        <div>
          <p className="text-xs text-secondary uppercase tracking-wide mb-1.5 dark:text-slate-400">
            {t('group.currentMembers', { count: participants.length })}
          </p>
          {loadingParticipants ? (
            <Spinner block />
          ) : (
            <ul className="border border-border-gray rounded-lg divide-y divide-border-gray max-h-48 overflow-y-auto dark:border-slate-700 dark:divide-slate-700">
              {participants.map((participant) => (
                <li key={participant.userId} className="flex items-center gap-3 p-2.5">
                  <MemberIdentity
                    firstName={participant.firstName}
                    lastName={participant.lastName}
                    urlPicture={participant.urlPicture}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemove(participant.userId)}
                    disabled={removingId === participant.userId}
                    className="p-1.5 rounded-md text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 shrink-0 dark:text-slate-400 dark:hover:text-red-400"
                    title={t('group.removeFromGroup')}
                    aria-label={t('group.removeFromGroup')}
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

        <MemberPicker
          label={t('group.addMembers')}
          members={availableMembers}
          selectedIds={selectedIds}
          onToggle={(id) => setSelectedIds((prev) => toggleInSet(prev, id))}
          isLoading={loadingMembers}
          emptyText={t('group.allAlreadyMembers')}
        />
      </div>
    </Modal>
  );
}
