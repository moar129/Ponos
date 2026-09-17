import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, Send, Loader2, MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import {
  useGetMessagesQuery,
  useGetOrCreateDirectConversationMutation,
  useGetConversationParticipantsQuery,
  useMarkConversationReadMutation,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
} from '../../store/apis/messageApi';
import type { ConversationComponentProps, Message } from '../../types/messages/messagesTypes';


function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function readableError(err: unknown): string | null {
  if (err == null) return null;

  if (typeof err === 'string' && err.trim()) {
    return err;
  }

  if (typeof err === 'object' && err !== null) {
    if ('error' in err && typeof err.error === 'string' && err.error.trim()) {
      return err.error;
    }
    if ('message' in err && typeof err.message === 'string' && err.message.trim()) {
      return err.message;
    }
  }

  return 'Noget gik galt. Prøv igen.';
}

export function ConversationComponent({
  conversationId,
  contact,
  currentUserId,
  onConversationCreated,
}: ConversationComponentProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [markConversationRead] = useMarkConversationReadMutation();

  const { data: participants = [], refetch: refetchParticipants } = useGetConversationParticipantsQuery(conversationId!, {
    skip: !conversationId,
  });

  const [getOrCreateDirectConversation, { isLoading: isCreatingConversation }] =
    useGetOrCreateDirectConversationMutation();

  const [sendMessage, { isLoading: isSending }] =
    useSendMessageMutation();

  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useGetMessagesQuery(conversationId!, {
    skip: !conversationId,
  });

  // US-B13: redigér/slet egen besked.
  const [editMessage, { isLoading: isSavingEdit, error: editError }] = useEditMessageMutation();
  const [deleteMessage, { isLoading: isDeleting }] = useDeleteMessageMutation();

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const editErrorMessage = readableError(editError);

  // Kun samtalens seneste ikke-slettede besked kan redigeres - samme
  // regel som edit_message-RPC'en håndhæver server-side. Beregnes
  // klient-side, så knappen ikke vises for beskeder der alligevel ville
  // blive afvist (fx hvis modparten har svaret siden).
  const lastEditableMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].deletedAt) return messages[i].id;
    }
    return null;
  }, [messages]);

  function startEdit(msg: Message) {
    setConfirmingDeleteId(null);
    setEditingMessageId(msg.id);
    setEditDraft(msg.content);
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setEditDraft('');
  }

  async function handleSaveEdit() {
    if (!editingMessageId || !conversationId) return;
    const trimmed = editDraft.trim();
    if (!trimmed) return;

    try {
      await editMessage({ messageId: editingMessageId, conversationId, content: trimmed }).unwrap();
      cancelEdit();
    } catch {
      // Fejlen vises via editError - forbliver i redigerings-tilstand.
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!conversationId) return;
    try {
      await deleteMessage({ messageId, conversationId }).unwrap();
    } catch {
      // Sletning har ingen ekstra betingelser ud over ejerskab, som
      // knappen allerede kun vises ved - en fejl her er usandsynlig.
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  // Scroll kun selve beskedområdet til den nyeste besked.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages]);

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isSending || isCreatingConversation) {
      return;
    }

    try {
      let activeConversationId = conversationId;

      // Opret først samtalen, når den første besked sendes.
      if (!activeConversationId) {
        activeConversationId = await getOrCreateDirectConversation({
          otherUserId: contact.id,
        }).unwrap();

        onConversationCreated?.(activeConversationId);
      }

      await sendMessage({
        conversationId: activeConversationId,
        content: trimmedMessage,
      }).unwrap();

      setMessage('');
    } catch (error) {
      console.error('Kunne ikke sende besked:', error);
    }
  };

  // US-B12: marker samtalen som læst, når den åbnes, og igen hver gang
  // listen af beskeder ændrer sig (nye beskeder ankommer mens samtalen
  // er åben, inkl. mine egne nyligt sendte).
  useEffect(() => {
    if (!conversationId) return;
    markConversationRead({ conversationId });
  }, [conversationId, messages.length, markConversationRead]);

  useEffect(() => {
    if (!conversationId) return;

    function handleFocus() {
      void refetchParticipants();
    }

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [conversationId, refetchParticipants]);

  const otherParticipant = participants.find((p) => p.userId === contact.id);

  function isReadByOther(createdAt: string): boolean {
    if (!otherParticipant?.lastReadAt) return false;
    return new Date(otherParticipant.lastReadAt) >= new Date(createdAt);
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  const isBusy = isSending || isCreatingConversation;

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-gray shrink-0 dark:border-slate-700">
        <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
          {contact.urlPicture ? (
            <img
              src={contact.urlPicture}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials(contact.firstName, contact.lastName)
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-primary truncate dark:text-slate-100">
            {contact.firstName} {contact.lastName}
          </p>

          <p className="text-xs text-secondary truncate dark:text-slate-400">
            {contact.roleName ?? 'Ingen rolle'}
          </p>
        </div>
      </div>

      {/* Beskeder */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {!conversationId ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-secondary dark:text-slate-400">
            <MessageSquareText className="w-10 h-10 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />

            <p className="text-sm">Ingen beskeder endnu</p>

            <p className="text-xs mt-1 text-secondary dark:text-slate-400">
              Skriv den første besked til {contact.firstName}.
            </p>
          </div>
        ) : isLoadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : messagesError ? (
          <div className="flex justify-center">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              Kunne ikke hente beskeder.
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-secondary dark:text-slate-400">
            <MessageSquareText className="w-10 h-10 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />

            <p className="text-sm">Ingen beskeder endnu</p>

            <p className="text-xs mt-1 text-secondary dark:text-slate-400">
              Skriv den første besked til {contact.firstName}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwnMessage = msg.senderId === currentUserId;
              const isEditing = editingMessageId === msg.id;
              const isConfirmingDelete = confirmingDeleteId === msg.id;
              const canEdit = isOwnMessage && !msg.deletedAt && msg.id === lastEditableMessageId;
              const canDelete = isOwnMessage && !msg.deletedAt;

              return (
                <div
                  key={msg.id}
                  className={`group flex items-center gap-1 ${
                    isOwnMessage ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Rediger/slet-knapper: kun for egne beskeder, kun synlige på hover,
                      og skjules mens der allerede redigeres/bekræftes sletning. */}
                  {isOwnMessage && (canEdit || canDelete) && !isEditing && !isConfirmingDelete && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => startEdit(msg)}
                          aria-label="Rediger besked"
                          className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(msg.id)}
                          aria-label="Slet besked"
                          className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] rounded-xl px-3 py-2 ${
                      isOwnMessage
                        ? 'bg-accent text-primary'
                        : 'bg-bg-gray text-primary dark:bg-slate-700 dark:text-slate-100'
                    }`}
                  >
                    {msg.deletedAt ? (
                      <p className="text-sm italic opacity-70">Denne besked er slettet</p>
                    ) : isEditing ? (
                      <div className="flex flex-col gap-2">
                        {editErrorMessage && (
                          <p className="text-xs text-red-800 dark:text-red-400">
                            {editErrorMessage}
                          </p>
                        )}
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              void handleSaveEdit();
                            }
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          rows={2}
                          autoFocus
                          className="w-full resize-none rounded-md bg-black/10 px-2 py-1 text-sm text-inherit placeholder-current focus:outline-none"
                        />
                        <div className="flex items-center gap-3 justify-end">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={isSavingEdit}
                            className="text-xs font-medium hover:underline disabled:opacity-50"
                          >
                            Annuller
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSaveEdit()}
                            disabled={!editDraft.trim() || isSavingEdit}
                            className="text-xs font-semibold hover:underline disabled:opacity-50"
                          >
                            {isSavingEdit ? 'Gemmer...' : 'Gem'}
                          </button>
                        </div>
                      </div>
                    ) : isConfirmingDelete ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm">Slet denne besked?</p>
                        <div className="flex items-center gap-3 justify-end">
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            disabled={isDeleting}
                            className="text-xs font-medium hover:underline disabled:opacity-50"
                          >
                            Annuller
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteMessage(msg.id)}
                            disabled={isDeleting}
                            className="text-xs font-semibold hover:underline disabled:opacity-50"
                          >
                            {isDeleting ? 'Sletter...' : 'Ja, slet'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}

                    <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                      <p className={`text-[10px] ${isOwnMessage ? 'text-primary/60' : 'text-secondary dark:text-slate-400'}`}>
                        {new Date(msg.createdAt).toLocaleString('da-DK', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {msg.editedAt && !msg.deletedAt && ' · redigeret'}
                      </p>

                      {/* US-B12: tydelig læse-status vises kun på egne, ikke-slettede beskeder */}
                      {isOwnMessage && !msg.deletedAt && (
                        <span className={`flex items-center gap-1 text-[10px] font-medium ${
                          isReadByOther(msg.createdAt) ? 'text-primary' : 'text-primary/50'
                        }`}>
                          {isReadByOther(msg.createdAt) ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5" />
                              Set
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Sendt
                            </>
                          )}
                        </span>
                      )}
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
      <div className="border-t border-border-gray p-3 shrink-0 dark:border-slate-700">
        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Skriv en besked til ${contact.firstName}...`}
            rows={1}
            disabled={isBusy}
            className="flex-1 resize-none bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />

          <button
            type="button"
            onClick={() => void handleSendMessage()}
            disabled={!message.trim() || isBusy}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-primary hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send besked"
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <p className="text-[10px] text-secondary mt-1 dark:text-slate-400">
          Tryk Enter for at sende · Shift + Enter for ny linje
        </p>
      </div>
    </div>
  );
}