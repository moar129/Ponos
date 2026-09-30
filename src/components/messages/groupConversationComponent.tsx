import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCog, LogOut, ClipboardList, DoorOpen, Lock } from 'lucide-react';
import {
  useSendMessageMutation,
  useLeaveGroupConversationMutation,
  useGetMyConversationsQuery,
  useSetTaskChatChoiceMutation,
} from '../../store/apis/messageApi';
import { useMessageThread } from '../../store/hooks/useMessageThread';
import { ManageGroupMembersComponent } from './manageGroupMembersComponent';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInputComponent } from './formMessageInputComponent';
import type { GroupConversationComponentProps, Message, TaskChatChoice } from '../../types/messages/messagesTypes';
import type { TasksLocationState } from '../../types/Task/Task';

export function GroupConversationComponent({
  conversationId,
  groupName,
  currentUserId,
  onLeft,
}: GroupConversationComponentProps) {
  const { t } = useTranslation(['messages', 'common'])
  const navigate = useNavigate();
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  const thread = useMessageThread(conversationId);
  const { participants } = thread;

  const [sendMessage] = useSendMessageMutation();
  const [leaveGroupConversation, { isLoading: isLeaving, error: leaveError }] =
    useLeaveGroupConversationMutation();

  // Opgave-/rum-chats: medlemskab styres af databasen, så administrér
  // skjules; forlad er tilladt (DB husker fravalget). Summary hentes fra den allerede cachede samtaleliste, så
  // valg/lukning opdaterer sig, når 'Conversation' invalideres.
  const { data: conversations = [] } = useGetMyConversationsQuery();
  const summary = conversations.find((c) => c.conversationId === conversationId);
  const isSystemChat = Boolean(summary?.taskId || summary?.roomId);
  const leaveBodyKey = isSystemChat ? 'systemChat.confirmLeaveBody' : 'group.confirmLeaveBody';
  const [setTaskChatChoice, { isLoading: isSettingChoice, error: choiceError }] =
    useSetTaskChatChoiceMutation();
  const choiceErrorMessage = readableError(choiceError);

  const showChoicePrompt =
    summary?.taskId != null && summary.taskStatus === 'Completed' && summary.completionChoice === null;
  const closedByMe = summary?.taskId != null && summary.completionChoice === 'close';

  function handleChoice(choice: TaskChatChoice) {
    void setTaskChatChoice({ conversationId, choice }).unwrap().catch(() => {
      // Fejlen vises via choiceErrorMessage.
    });
  }

  function goToSource() {
    if (summary?.taskId) {
      navigate(
        summary.taskStatus === 'Completed' ? '/tasks/afsluttede' : `/tasks/mine?task=${summary.taskId}`
      );
    } else if (summary?.roomId) {
      const state: TasksLocationState = { roomId: summary.roomId };
      navigate('/tasks', { state });
    }
  }

  async function handleSend(content: string) {
    await sendMessage({ conversationId, content }).unwrap();
  }

  const handleLeave = async () => {
    try {
      await leaveGroupConversation({ conversationId }).unwrap();
      setConfirmingLeave(false);
      onLeft?.();
    } catch {
      // Fejlen vises i dialogen - den lukkes ikke, så brugeren kan se
      // fejlen og evt. prøve igen.
    }
  };

  // US-B13: viser navnene på hvem der har set beskeden, i stedet for
  // blot et antal - fx "Set af Anna, Bo" i stedet for "Set af 2/3".
  function renderReadStatus(msg: Message) {
    const others = participants.filter((p) => p.userId !== currentUserId);
    const readers = others.filter((p) => p.lastReadAt && new Date(p.lastReadAt) >= new Date(msg.createdAt));
    const text =
      readers.length === 0
        ? t('sent')
        : readers.length === others.length
          ? t('readByAll')
          : t('readBy', { names: readers.map((p) => p.firstName).join(', ') });
    return <span className="text-[10px] font-medium text-accent-text/70">{text}</span>;
  }

  const HeaderIcon = summary?.taskId ? ClipboardList : summary?.roomId ? DoorOpen : Users;

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <ChatHeader
        avatar={
          <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shrink-0">
            <HeaderIcon className="w-5 h-5" />
          </div>
        }
        title={groupName}
        subtitle={t('participantCount', { count: participants.length })}
        actions={
          <>
            {isSystemChat ? (
              <button
                type="button"
                onClick={goToSource}
                className="text-xs font-semibold text-accent hover:text-accent-hover shrink-0"
              >
                {summary?.taskId ? t('systemChat.goToTask') : t('systemChat.goToRoom')} →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsManageMembersOpen(true)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
                title={t('group.manageMembers')}
                aria-label={t('group.manageMembers')}
              >
                <UserCog className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmingLeave(true)}
              className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors shrink-0"
              title={t('group.leave')}
              aria-label={t('group.leave')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <MessageList
          thread={thread}
          currentUserId={currentUserId}
          emptyHint={t('writeFirstToGroup')}
          showSenders
          renderReadStatus={renderReadStatus}
        />
      </div>

      {/* Afsluttet opgave: hver deltager vælger selv, om chatten skal
          forblive aktiv eller lukkes (skrivebeskyttet for dem). */}
      {showChoicePrompt && (
        <div className="border-t border-border-gray bg-bg-gray/60 px-4 py-3 shrink-0 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-primary dark:text-slate-100">{t('systemChat.completedPrompt')}</p>
          {choiceErrorMessage && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{choiceErrorMessage}</p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => handleChoice('keep')}
              disabled={isSettingChoice}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent-hover disabled:opacity-50"
            >
              {t('systemChat.keep')}
            </button>
            <button
              type="button"
              onClick={() => handleChoice('close')}
              disabled={isSettingChoice}
              className="rounded-lg border border-border-gray px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-bg-gray disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              {t('systemChat.close')}
            </button>
          </div>
        </div>
      )}

      {summary?.closed ? (
        <div className="flex items-center justify-center gap-2 border-t border-border-gray p-4 text-sm text-secondary shrink-0 dark:border-slate-700 dark:text-slate-400">
          <Lock className="w-4 h-4" aria-hidden="true" />
          {closedByMe ? (
            <>
              <span>{t('systemChat.closedByMe')}</span>
              {summary.taskStatus === 'Completed' && (
                <button
                  type="button"
                  onClick={() => handleChoice('keep')}
                  disabled={isSettingChoice}
                  className="font-semibold text-accent hover:text-accent-hover disabled:opacity-50"
                >
                  {t('systemChat.reopen')}
                </button>
              )}
            </>
          ) : (
            <span>{t('systemChat.roomClosed')}</span>
          )}
        </div>
      ) : (
        <MessageInputComponent onSend={handleSend} />
      )}

      {isManageMembersOpen && (
        <ManageGroupMembersComponent
          onClose={() => setIsManageMembersOpen(false)}
          conversationId={conversationId}
          groupName={groupName}
        />
      )}

      <ConfirmDialog
        isOpen={confirmingLeave}
        title={t('group.confirmLeave')}
        message={t(leaveBodyKey, { name: groupName })}
        error={readableError(leaveError)}
        confirmLabel={t('group.leaveConfirm')}
        isLoading={isLeaving}
        onConfirm={handleLeave}
        onCancel={() => setConfirmingLeave(false)}
      />
    </div>
  );
}
