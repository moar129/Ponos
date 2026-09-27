import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { useGetMyConversationsQuery } from '../../store/apis/messageApi';
import type { TaskChatButtonProps } from '../../types/messages/messagesTypes';

// Genvej til opgavens auto-oprettede gruppechat. Chatten oprettes af DB,
// når opgaven får 2+ tilmeldte - findes den ikke i MINE samtaler (ikke
// oprettet endnu, eller jeg er ikke deltager), vises knappen ikke.
export function TaskChatButton({ taskId }: TaskChatButtonProps) {
  const { t } = useTranslation(['tasks', 'messages'])
  const navigate = useNavigate();
  const { data: conversations = [] } = useGetMyConversationsQuery();

  const conversation = conversations.find((c) => c.taskId === taskId);
  if (!conversation) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/beskeder?conversation=${conversation.conversationId}`);
      }}
      className="relative flex items-center gap-2 rounded border-2 border-border-gray px-6 py-2 text-xs font-bold uppercase tracking-widest text-secondary transition-all hover:border-accent hover:text-accent dark:border-slate-700 dark:text-slate-400"
    >
      <MessageSquareText className="h-4 w-4" />
      {t('card.chat')}
      {conversation.unread && (
        <span
          className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent"
          aria-label={t('messages:unreadMessages')}
        />
      )}
    </button>
  );
}
