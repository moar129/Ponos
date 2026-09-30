// components/messaging/ConversationListComponent.tsx
import { ClipboardList, DoorOpen, Lock, MessageSquareText, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next'
import { useGetMyConversationsQuery } from '../../store/apis/messageApi';
import { readableError } from '../../ErrorMessage';
import { systemMessageText } from '../../utils/systemMessageDisplay';
import { getInitialsFromName } from '../../utils/personName';
import { asDynamic } from '../../i18n/config';
import { Alert } from '../common/Alert';
import { EmptyState } from '../common/EmptyState';
import { Spinner } from '../common/Spinner';
import type { ConversationListComponentProps } from '../../types/messages/messagesTypes';

export function ConversationListComponent({ selectedConversationId, onSelectConversation }: ConversationListComponentProps) {
  const { t } = useTranslation(['messages', 'common'])
  const { data: conversations = [], isLoading, error } = useGetMyConversationsQuery();

  const errorMessage = readableError(error);

  if (isLoading) return <Spinner block />;
  if (errorMessage) return <Alert className="m-3">{errorMessage}</Alert>;
  if (conversations.length === 0) return <EmptyState icon={MessageSquareText} title={t('noConversations')} />;

  return (
    <ul className="divide-y divide-border-gray dark:divide-slate-700">
      {conversations.map((conv) => {
        const isSelected = selectedConversationId === conv.conversationId;
        return (
          <li key={conv.conversationId}>
            <button
              type="button"
              onClick={() => onSelectConversation?.(conv.conversationId)}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                isSelected ? 'bg-bg-gray dark:bg-slate-700' : 'hover:bg-bg-gray/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
                {conv.taskId ? (
                  <ClipboardList className="w-5 h-5" aria-label={t('systemChat.taskChat')} />
                ) : conv.roomId ? (
                  <DoorOpen className="w-5 h-5" aria-label={t('systemChat.roomChat')} />
                ) : conv.isGroup ? (
                  <Users className="w-5 h-5" />
                ) : conv.urlPicture ? (
                  <img src={conv.urlPicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitialsFromName(conv.displayName)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`flex items-center gap-1 text-sm truncate ${
                      conv.unread ? 'font-semibold text-primary dark:text-slate-100' : 'font-medium text-primary dark:text-slate-100'
                    } ${conv.closed ? 'opacity-60' : ''}`}
                  >
                    {/* Skrivebeskyttet for mig (lukket opgave-chat / rum ikke længere låst). */}
                    {conv.closed && <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />}
                    <span className="truncate">{conv.displayName ?? t('unnamedConversation')}</span>
                  </p>
                  {/* Ulæst-prik - vises kun når der er nyt siden jeg sidst læste samtalen. */}
                  {conv.unread && (
                    <span
                      className="w-2 h-2 rounded-full bg-accent shrink-0"
                      aria-label={t('unreadMessages')}
                    />
                  )}
                </div>
                <p className="text-xs text-secondary truncate dark:text-slate-400">
                  {conv.lastMessageDeleted ? (
                    <span className="italic">{t('messageDeleted')}</span>
                  ) : (
                    conv.lastMessage ? systemMessageText(conv.lastMessage, asDynamic(t)) : t('noMessagesYet')
                  )}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}