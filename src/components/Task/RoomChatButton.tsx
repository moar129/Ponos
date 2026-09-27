import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquareText } from 'lucide-react';
import { useGetMyConversationsQuery, useGetOrJoinRoomConversationMutation } from '../../store/apis/messageApi';
import { readableError } from '../../ErrorMessage';
import type { RoomChatButtonProps } from '../../types/messages/messagesTypes';

// Rum-chat for et rolle-låst rum. Kalder get_or_join_room_conversation, som
// tjekker rum-adgang server-side og tilføjer mig, hvis jeg ikke allerede er
// deltager (nyt medlem / ny rolle siden rummet blev oprettet).
export function RoomChatButton({ roomId }: RoomChatButtonProps) {
  const { t } = useTranslation(['tasks', 'messages'])
  const navigate = useNavigate();
  const { data: conversations = [] } = useGetMyConversationsQuery();
  const [getOrJoinRoomConversation, { isLoading, error }] = useGetOrJoinRoomConversationMutation();

  const unread = conversations.some((c) => c.roomId === roomId && c.unread);
  const errorMessage = readableError(error);

  const handleClick = async () => {
    try {
      const conversationId = await getOrJoinRoomConversation({ roomId }).unwrap();
      navigate(`/beskeder?conversation=${conversationId}`);
    } catch {
      // Fejlen vises via errorMessage.
    }
  };

  return (
    <div className="flex flex-shrink-0 items-center gap-2">
      {errorMessage && (
        <span className="text-xs text-red-600 dark:text-red-400">{errorMessage}</span>
      )}
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isLoading}
        className="relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-secondary transition hover:bg-bg-gray hover:text-primary disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />}
        {t('rooms.chat')}
        {unread && (
          <span
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent"
            aria-label={t('messages:unreadMessages')}
          />
        )}
      </button>
    </div>
  );
}
