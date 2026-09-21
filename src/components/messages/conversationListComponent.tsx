// components/messaging/ConversationListComponent.tsx
import { Loader2, MessageSquareText, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next'
import { useGetMyConversationsQuery } from '../../store/apis/messageApi';
import type { ConversationListComponentProps } from '../../types/messages/messagesTypes';

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length > 1
    ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function ConversationListComponent({ selectedConversationId, onSelectConversation }: ConversationListComponentProps) {
  const { t } = useTranslation(['messages', 'common'])
  const { data: conversations = [], isLoading, error } = useGetMyConversationsQuery();

  const errorMessage =
    error && typeof error === 'object' && 'error' in error
      ? (error as { error: string }).error
      : null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="m-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
        {errorMessage}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-secondary px-4 dark:text-slate-400">
        <MessageSquareText className="w-8 h-8 mb-2 stroke-[1.5] text-secondary dark:text-slate-400" />
        <p className="text-sm">{t('noConversations')}</p>
      </div>
    );
  }

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
                {conv.isGroup ? (
                  <Users className="w-5 h-5" />
                ) : conv.urlPicture ? (
                  <img src={conv.urlPicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(conv.displayName)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-sm truncate ${
                      conv.unread ? 'font-semibold text-primary dark:text-slate-100' : 'font-medium text-primary dark:text-slate-100'
                    }`}
                  >
                    {conv.displayName ?? t('unnamedConversation')}
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
                  {conv.lastMessage ?? t('noMessagesYet')}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}