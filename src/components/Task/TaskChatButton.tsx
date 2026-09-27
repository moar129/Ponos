import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquareText } from 'lucide-react';
import { useGetMyConversationsQuery, useJoinTaskConversationMutation } from '../../store/apis/messageApi';
import { readableError } from '../../ErrorMessage';
import type { TaskChatButtonProps } from '../../types/messages/messagesTypes';

// Genvej til opgavens auto-oprettede gruppechat. Chatten oprettes af DB,
// når opgaven får 2+ tilmeldte. Er den ikke i MINE samtaler (jeg har
// forladt den, eller den er arkiveret), kan en tilmeldt melde sig ind igen
// via join_task_conversation; ellers vises knappen ikke.
export function TaskChatButton({ taskId, canJoin }: TaskChatButtonProps) {
  const { t } = useTranslation(['tasks', 'messages'])
  const navigate = useNavigate();
  const { data: conversations = [] } = useGetMyConversationsQuery();
  const [joinTaskConversation, { isLoading, error }] = useJoinTaskConversationMutation();

  const conversation = conversations.find((c) => c.taskId === taskId);
  const errorMessage = readableError(error);

  if (!conversation && !canJoin) return null;

  const handleClick = async () => {
    if (conversation) {
      navigate(`/beskeder?conversation=${conversation.conversationId}`);
      return;
    }

    try {
      const conversationId = await joinTaskConversation({ taskId }).unwrap();
      navigate(`/beskeder?conversation=${conversationId}`);
    } catch {
      // Fejlen vises via errorMessage.
    }
  };

  return (
    <div className="flex items-center gap-2">
      {errorMessage && (
        <span className="text-xs text-red-600 dark:text-red-400">{errorMessage}</span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void handleClick();
        }}
        disabled={isLoading}
        className="relative flex items-center gap-2 rounded border-2 border-border-gray px-6 py-2 text-xs font-bold uppercase tracking-widest text-secondary transition-all hover:border-accent hover:text-accent disabled:opacity-50 dark:border-slate-700 dark:text-slate-400"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
        {t('card.chat')}
        {conversation?.unread && (
          <span
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent"
            aria-label={t('messages:unreadMessages')}
          />
        )}
      </button>
    </div>
  );
}
