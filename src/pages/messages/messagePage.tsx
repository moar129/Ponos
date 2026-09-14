// pages/messages/messagePage.tsx
import { useState } from 'react';
import { Loader2, MessageSquareText } from 'lucide-react';
import { ConversationListComponent } from '../../components/messages/conversationListComponent';
import { ContactListComponent } from '../../components/messages/contactListComponent';
import { MessageInputComponent } from '../../components/messages/formMessageInputComponent';
import {
  useGetMessagesQuery,
  useGetOrCreateDirectConversationMutation,
  useSendMessageMutation,
} from '../../store/apis/messageApi';
import { useGetSessionQuery } from '../../store/apis/authApi';
import type { OrganisationMember } from '../../types/role/roleType';

type Tab = 'conversations' | 'contacts';

export function MessagesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('conversations');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<OrganisationMember | null>(null);

  const { data: session } = useGetSessionQuery();
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    isFetching: isFetchingMessages,
    error: messagesError,
  } = useGetMessagesQuery(selectedConversationId ?? '', { skip: !selectedConversationId });
  const [getOrCreateDirectConversation] = useGetOrCreateDirectConversationMutation();
  const [sendMessage, { isLoading: isSendingMessage }] = useSendMessageMutation();

  const handleSelectContact = (contact: OrganisationMember) => {
    setSelectedContact(contact);
    setSelectedConversationId(null);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    try {
        let conversationId = selectedConversationId;

        // Hvis der ikke allerede findes en conversation,
        // skal den først oprettes ved første besked.
        if (!conversationId && selectedContact) {
          conversationId = await getOrCreateDirectConversation({
            otherUserId: selectedContact.id,
          }).unwrap();
        }

        if (!conversationId) return;

        await sendMessage({ conversationId, content }).unwrap();

        // Nu eksisterer conversationen
        setSelectedConversationId(conversationId);
        setSelectedContact(null);
        setActiveTab('conversations');
    } catch (error) {
      console.error('Kunne ikke sende besked:', error);
    }
  };

  const messageError =
    messagesError && typeof messagesError === 'object' && 'error' in messagesError
      ? (messagesError as { error: string }).error
      : 'Beskederne kunne ikke hentes.';

  const hasActiveThread = Boolean(selectedConversationId || selectedContact);
  const threadTitle = selectedContact
    ? `${selectedContact.firstName} ${selectedContact.lastName}`
    : selectedConversationId
      ? 'Samtale'
      : null;


  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 h-[calc(100vh-220px)] min-h-[500px]">
      <div className="md:col-span-4 lg:col-span-3 bg-[#0B132A] rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="flex border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'conversations'
                ? 'text-[#C7975D] border-b-2 border-[#C7975D]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Samtaler
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'contacts'
                ? 'text-[#C7975D] border-b-2 border-[#C7975D]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Alle kontakter
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'conversations' ? (
            <ConversationListComponent
              selectedConversationId={selectedConversationId}
              onSelectConversation={(conversationId) => {
                setSelectedContact(null);
                setSelectedConversationId(conversationId);
              }}
            />
          ) : (
            <ContactListComponent onSelectContact={handleSelectContact} />
          )}
        </div>
      </div>

      <div className="md:col-span-8 lg:col-span-9 bg-[#0B132A] rounded-xl border border-slate-800 shadow-sm flex min-h-0 flex-col">
        {!hasActiveThread ? (
          <div className="flex flex-col items-center text-center text-slate-400 px-4">
            <MessageSquareText className="w-10 h-10 mb-3 stroke-[1.5] text-slate-500" />
            <p className="text-sm">Vælg en samtale, eller find en kollega under "Alle kontakter"</p>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-800 px-5 py-4">
              <p className="text-sm font-semibold text-slate-100">{threadTitle}</p>
              {selectedContact && <p className="mt-1 text-xs text-slate-400">Ny samtale</p>}
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              {selectedContact && !selectedConversationId ? (
                <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
                  Skriv den første besked til {selectedContact.firstName}.
                </div>
              ) : isLoadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#C7975D]" />
                </div>
              ) : messagesError ? (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {messageError}
                </p>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Ingen beskeder endnu. Skriv den første besked.
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.senderId === session?.user.id;
                  return (
                    <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          isOwnMessage
                            ? 'rounded-br-sm bg-[#C7975D] text-[#0B132A]'
                            : 'rounded-bl-sm bg-slate-800 text-slate-100'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <time className="mt-1 block text-[11px] opacity-60">
                          {new Date(message.createdAt).toLocaleString('da-DK', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                    </div>
                  );
                })
              )}
              {isFetchingMessages && !isLoadingMessages && (
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-slate-500" />
              )}
            </div>

            <MessageInputComponent onSend={handleSendMessage} disabled={isSendingMessage} />
          </>
        )}
      </div>
    </div>
  );
}