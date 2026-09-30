import { useTranslation } from 'react-i18next'
import { Check, CheckCheck } from 'lucide-react';
import {
  useGetOrCreateDirectConversationMutation,
  useSendMessageMutation,
} from '../../store/apis/messageApi';
import { useMessageThread } from '../../store/hooks/useMessageThread';
import { formatFullName } from '../../utils/personName';
import { Avatar } from '../common/Avatar';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInputComponent } from './formMessageInputComponent';
import type { ConversationComponentProps, Message } from '../../types/messages/messagesTypes';

export function ConversationComponent({
  conversationId,
  contact,
  currentUserId,
  onConversationCreated,
}: ConversationComponentProps) {
  const { t } = useTranslation(['messages', 'common'])
  const thread = useMessageThread(conversationId);
  const [getOrCreateDirectConversation] = useGetOrCreateDirectConversationMutation();
  const [sendMessage] = useSendMessageMutation();

  async function handleSend(content: string) {
    let activeConversationId = conversationId;

    // Opret først samtalen, når den første besked sendes.
    if (!activeConversationId) {
      activeConversationId = await getOrCreateDirectConversation({ otherUserId: contact.id }).unwrap();
      onConversationCreated?.(activeConversationId);
    }

    await sendMessage({ conversationId: activeConversationId, content }).unwrap();
  }

  const otherParticipant = thread.participants.find((p) => p.userId === contact.id);

  // US-B12: tydelig læse-status på egne beskeder.
  function renderReadStatus(msg: Message) {
    const isSeen =
      !!otherParticipant?.lastReadAt && new Date(otherParticipant.lastReadAt) >= new Date(msg.createdAt);
    return (
      <span className={`flex items-center gap-1 text-[10px] font-medium ${isSeen ? 'text-accent-text' : 'text-accent-text/50'}`}>
        {isSeen ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
        {isSeen ? t('seen') : t('sent')}
      </span>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <ChatHeader
        avatar={
          <Avatar
            firstName={contact.firstName}
            lastName={contact.lastName}
            urlPicture={contact.urlPicture}
            className="w-10 h-10 bg-secondary text-white"
            textClassName="text-sm"
          />
        }
        title={formatFullName(contact.firstName, contact.lastName)}
        subtitle={contact.roleName ?? t('noRole')}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <MessageList
          thread={thread}
          currentUserId={currentUserId}
          emptyHint={t('writeFirstTo', { name: contact.firstName })}
          renderReadStatus={renderReadStatus}
        />
      </div>

      <MessageInputComponent onSend={handleSend} />
    </div>
  );
}
