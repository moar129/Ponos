// components/messages/groupConversationComponent.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Loader2, MessageSquareText, Users, UserCog, LogOut } from 'lucide-react';
import {
  useGetMessagesQuery,
  useGetConversationParticipantsQuery,
  useSendMessageMutation,
  useLeaveGroupConversationMutation,
} from '../../store/apis/messageApi';
import { ManageGroupMembersComponent } from './manageGroupMembersComponent';
import { ConfirmDialogComponent } from '../dataLayer/confirmDialogComponent';

interface GroupConversationComponentProps {
  conversationId: string;
  groupName: string;
  currentUserId: string;
  onLeft?: () => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function GroupConversationComponent({
  conversationId,
  groupName,
  currentUserId,
  onLeft,
}: GroupConversationComponentProps) {
  const [message, setMessage] = useState('');
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { data: messages = [], isLoading: isLoadingMessages, error: messagesError } =
    useGetMessagesQuery(conversationId);

  const { data: participants = [] } = useGetConversationParticipantsQuery(conversationId);

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [leaveGroupConversation, { isLoading: isLeaving, error: leaveError }] =
    useLeaveGroupConversationMutation();

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

  const handleLeave = async () => {
    try {
      await leaveGroupConversation({ conversationId }).unwrap();
      setConfirmingLeave(false);
      onLeft?.();
    } catch {
      // Fejlen vises i dialogen via readableLeaveError() - den lukkes ikke,
      // så brugeren kan se fejlen og evt. prøve igen.
    }
  };

  function readableLeaveError(): string | null {
    if (!leaveError) return null;
    if (
      typeof leaveError === 'object' &&
      leaveError !== null &&
      'error' in leaveError &&
      typeof leaveError.error === 'string'
    ) {
      return leaveError.error;
    }
    return 'Noget gik galt. Prøv igen.';
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 shrink-0">
        <div className="w-10 h-10 rounded-full bg-slate-700 text-slate-100 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-100 truncate">{groupName}</p>
          <p className="text-xs text-slate-400 truncate">
            {participants.length} deltager{participants.length !== 1 ? 'e' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsManageMembersOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
          title="Administrer medlemmer"
          aria-label="Administrer medlemmer"
        >
          <UserCog className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setConfirmingLeave(true)}
          className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors shrink-0"
          title="Forlad gruppen"
          aria-label="Forlad gruppen"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Beskeder */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {isLoadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#C7975D]" />
          </div>
        ) : messagesError ? (
          <div className="flex justify-center">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              Kunne ikke hente beskeder.
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
            <MessageSquareText className="w-10 h-10 mb-3 stroke-[1.5] text-slate-500" />
            <p className="text-sm">Ingen beskeder endnu</p>
            <p className="text-xs mt-1 text-slate-500">Skriv den første besked til gruppen.</p>
          </div>
        ) : (
          <div className="space-y-3">
                        {messages.map((msg, index) => {
              if (msg.messageType === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <p className="text-[11px] text-slate-500 bg-slate-900/60 rounded-full px-3 py-1">
                      {msg.content}
                    </p>
                  </div>
                );
              }

              const isOwnMessage = msg.senderId === currentUserId;
              const sender = participantById.get(msg.senderId);

              // Vis kun afsendernavn, hvis det er en ny "klynge" (forrige
              // besked var fra en anden afsender), så tætte beskeder fra
              // samme person ikke gentager navnet unødigt.
              const previousMessage = messages[index - 1];
              const showSenderName = !isOwnMessage && previousMessage?.senderId !== msg.senderId;

              return (
                <div key={msg.id} className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  {/* ... resten af den eksisterende gren er uændret ... */}
                  {!isOwnMessage && (
                    <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-100 flex items-center justify-center font-semibold text-[10px] shrink-0 overflow-hidden self-end">
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
                      <p className="text-[11px] text-slate-400 mb-0.5 ml-1">
                        {sender ? `${sender.firstName} ${sender.lastName}` : 'Ukendt bruger'}
                      </p>
                    )}
                    <div
                      className={`rounded-xl px-3 py-2 ${
                        isOwnMessage ? 'bg-[#C7975D] text-[#071B33]' : 'bg-slate-800 text-slate-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isOwnMessage ? 'text-[#071B33]/60' : 'text-slate-500'}`}>
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
      <div className="border-t border-slate-800 p-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Skriv en besked til ${groupName}...`}
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleSendMessage()}
            disabled={!message.trim() || isSending}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#C7975D] text-[#071B33] hover:bg-[#B5854B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send besked"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">Tryk Enter for at sende · Shift + Enter for ny linje</p>
      </div>

      <ManageGroupMembersComponent
        isOpen={isManageMembersOpen}
        onClose={() => setIsManageMembersOpen(false)}
        conversationId={conversationId}
        groupName={groupName}
      />

      <ConfirmDialogComponent
        isOpen={confirmingLeave}
        title="Forlad gruppen?"
        message={
          readableLeaveError()
            ? `Er du sikker på, at du vil forlade "${groupName}"? ${readableLeaveError()}`
            : `Er du sikker på, at du vil forlade "${groupName}"? Du kan blive tilføjet igen af et andet medlem senere.`
        }
        confirmLabel="Forlad"
        isLoading={isLeaving}
        onConfirm={handleLeave}
        onCancel={() => setConfirmingLeave(false)}
      />
    </div>
  );
}