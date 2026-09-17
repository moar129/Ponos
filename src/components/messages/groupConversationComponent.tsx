// components/messages/groupConversationComponent.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Loader2, MessageSquareText, Users } from 'lucide-react';
import {
  useGetMessagesQuery,
  useGetConversationParticipantsQuery,
  useSendMessageMutation,
} from '../../store/apis/messageApi';

interface GroupConversationComponentProps {
  conversationId: string;
  groupName: string;
  currentUserId: string;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function GroupConversationComponent({
  conversationId,
  groupName,
  currentUserId,
}: GroupConversationComponentProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { data: messages = [], isLoading: isLoadingMessages, error: messagesError } =
    useGetMessagesQuery(conversationId);

  const { data: participants = [] } = useGetConversationParticipantsQuery(conversationId);

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const participantById = useMemo(
    () => new Map(participants.map((p) => [p.userId, p])),
    [participants]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) return;

    try {
      await sendMessage({ conversationId, content: trimmedMessage }).unwrap();
      setMessage('');
    } catch (error) {
      console.error('Kunne ikke sende besked:', error);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-gray shrink-0">
        <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary truncate">{groupName}</p>
          <p className="text-xs text-secondary truncate">
            {participants.length} deltager{participants.length !== 1 ? 'e' : ''}
          </p>
        </div>
      </div>

      {/* Beskeder */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {isLoadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : messagesError ? (
          <div className="flex justify-center">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              Kunne ikke hente beskeder.
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-secondary">
            <MessageSquareText className="w-10 h-10 mb-3 stroke-[1.5] text-secondary" />
            <p className="text-sm">Ingen beskeder endnu</p>
            <p className="text-xs mt-1 text-secondary">Skriv den første besked til gruppen.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, index) => {
              const isOwnMessage = msg.senderId === currentUserId;
              const sender = participantById.get(msg.senderId);

              // Vis kun afsendernavn, hvis det er en ny "klynge" (forrige
              // besked var fra en anden afsender), så tætte beskeder fra
              // samme person ikke gentager navnet unødigt.
              const previousMessage = messages[index - 1];
              const showSenderName = !isOwnMessage && previousMessage?.senderId !== msg.senderId;

              return (
                <div key={msg.id} className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  {!isOwnMessage && (
                    <div className="w-7 h-7 rounded-full bg-secondary text-white flex items-center justify-center font-semibold text-[10px] shrink-0 overflow-hidden self-end">
                      {sender?.urlPicture ? (
                        <img src={sender.urlPicture} alt="" className="w-full h-full object-cover" />
                      ) : sender ? (
                        getInitials(sender.firstName, sender.lastName)
                      ) : (
                        '?'
                      )}
                    </div>
                  )}

                  <div className="max-w-[75%]">
                    {showSenderName && (
                      <p className="text-[11px] text-secondary mb-0.5 ml-1">
                        {sender ? `${sender.firstName} ${sender.lastName}` : 'Ukendt bruger'}
                      </p>
                    )}
                    <div
                      className={`rounded-xl px-3 py-2 ${
                        isOwnMessage ? 'bg-accent text-primary' : 'bg-bg-gray text-primary'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isOwnMessage ? 'text-primary/60' : 'text-secondary'}`}>
                        {new Date(msg.createdAt).toLocaleString('da-DK', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Beskedfelt */}
      <div className="border-t border-border-gray p-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Skriv en besked til ${groupName}...`}
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleSendMessage()}
            disabled={!message.trim() || isSending}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-primary hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send besked"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-secondary mt-1">Tryk Enter for at sende · Shift + Enter for ny linje</p>
      </div>
    </div>
  );
}