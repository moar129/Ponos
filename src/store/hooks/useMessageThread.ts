// src/store/hooks/useMessageThread.ts
import { useEffect, useMemo, useState } from 'react';
import { readableError } from '../../ErrorMessage';
import {
  useDeleteMessageMutation,
  useEditMessageMutation,
  useGetConversationParticipantsQuery,
  useGetMessagesQuery,
  useMarkConversationReadMutation,
} from '../apis/messageApi';
import type { Message } from '../../types/messages/messagesTypes';

// Alt hvad en åben samtale (1:1 eller gruppe) har brug for: beskeder,
// deltagere, markér-som-læst og redigér/slet egen besked
// (US-B12/B13). Lå før som to næsten ens kopier.
export function useMessageThread(conversationId: string | null) {
  const skip = !conversationId;
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useGetMessagesQuery(conversationId ?? '', { skip });
  const { data: participants = [], refetch: refetchParticipants } =
    useGetConversationParticipantsQuery(conversationId ?? '', { skip });

  const [markConversationRead] = useMarkConversationReadMutation();
  const [editMessage, { isLoading: isSavingEdit, error: editError }] = useEditMessageMutation();
  const [deleteMessage, { isLoading: isDeleting }] = useDeleteMessageMutation();

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

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

  // US-B12: marker samtalen som læst, når den åbnes, og igen hver gang
  // listen af beskeder ændrer sig (nye beskeder ankommer mens samtalen
  // er åben, inkl. mine egne nyligt sendte).
  useEffect(() => {
    if (!conversationId) return;
    markConversationRead({ conversationId });
  }, [conversationId, messages.length, markConversationRead]);

  // Læse-status hos de andre opdateres, når vinduet får fokus igen.
  useEffect(() => {
    if (!conversationId) return;
    const handleFocus = () => void refetchParticipants();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [conversationId, refetchParticipants]);

  function startEdit(msg: Message) {
    setConfirmingDeleteId(null);
    setEditingMessageId(msg.id);
    setEditDraft(msg.content);
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setEditDraft('');
  }

  async function saveEdit() {
    const content = editDraft.trim();
    if (!editingMessageId || !conversationId || !content) return;
    try {
      await editMessage({ messageId: editingMessageId, conversationId, content }).unwrap();
      cancelEdit();
    } catch {
      // Fejlen vises via editErrorMessage - forbliver i redigerings-tilstand.
    }
  }

  async function confirmDelete(messageId: string) {
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

  return {
    messages,
    isLoadingMessages,
    messagesError,
    participants,
    lastEditableMessageId,
    editingMessageId,
    editDraft,
    setEditDraft,
    editErrorMessage: readableError(editError),
    isSavingEdit,
    startEdit,
    cancelEdit,
    saveEdit,
    confirmingDeleteId,
    setConfirmingDeleteId,
    isDeleting,
    confirmDelete,
  };
}

export type MessageThread = ReturnType<typeof useMessageThread>;
