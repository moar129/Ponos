// src/components/messages/MessageList.tsx
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import { formatDayMonthTime } from '../../utils/formatDate';
import { formatFullName } from '../../utils/personName';
import { useDisplayName } from '../../store/hooks/useDisplayName';
import { systemMessageText } from '../../utils/systemMessageDisplay';
import { asDynamic } from '../../i18n/config';
import { Alert } from '../common/Alert';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';
import { Spinner } from '../common/Spinner';
import type { MessageThread } from '../../store/hooks/useMessageThread';
import type { Message, MessageListProps } from '../../types/messages/messagesTypes';

const TEXT_BUTTON = 'text-xs hover:underline disabled:opacity-50';

// Beskedområdet i en samtale (1:1 og gruppe): indlæsning, fejl, tom
// tilstand, system-beskeder og bobler med redigér/slet af egne beskeder.
export function MessageList({ thread, currentUserId, emptyHint, showSenders = false, renderReadStatus }: MessageListProps) {
  const { t } = useTranslation(['messages', 'common']);
  const displayName = useDisplayName();
  const { messages } = thread;
  const endRef = useRef<HTMLDivElement | null>(null);

  // Scroll kun selve beskedområdet til den nyeste besked.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  if (thread.isLoadingMessages) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (thread.messagesError) {
    return (
      <div className="flex justify-center">
        <Alert>{t('loadFailed')}</Alert>
      </div>
    );
  }

  if (messages.length === 0) {
    return <EmptyState icon={MessageSquareText} title={t('noMessagesYet')} hint={emptyHint} className="h-full" />;
  }

  const participantById = new Map(thread.participants.map((p) => [p.userId, p]));

  return (
    <div className="space-y-3">
      {messages.map((msg, index) => {
        if (msg.messageType === 'system') {
          return (
            <div key={msg.id} className="flex justify-center">
              <p className="text-[11px] text-secondary bg-bg-gray rounded-full px-3 py-1 dark:text-slate-400 dark:bg-slate-700">
                {systemMessageText(msg.content, asDynamic(t))}
              </p>
            </div>
          );
        }

        const isOwn = msg.senderId === currentUserId;
        const sender = participantById.get(msg.senderId);
        // Navnet vises kun ved en ny "klynge" (forrige besked var fra en
        // anden afsender), så tætte beskeder ikke gentager det.
        const showSenderName = showSenders && !isOwn && messages[index - 1]?.senderId !== msg.senderId;

        return (
          <div key={msg.id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {showSenders && !isOwn && (
              <Avatar
                firstName={sender?.firstName}
                lastName={sender?.lastName}
                urlPicture={sender?.urlPicture}
                className="w-7 h-7 bg-secondary text-white self-end"
                textClassName="text-[10px]"
              />
            )}

            <div className="max-w-[85%] sm:max-w-[75%] xl:max-w-2xl">
              {showSenderName && (
                <p className="text-[11px] text-secondary mb-0.5 ml-1 dark:text-slate-400">
                  {displayName(formatFullName(sender?.firstName, sender?.lastName))}
                </p>
              )}
              <MessageBubble thread={thread} message={msg} isOwn={isOwn} readStatus={isOwn && !msg.deletedAt ? renderReadStatus(msg) : null} />
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function MessageBubble({
  thread,
  message: msg,
  isOwn,
  readStatus,
}: {
  thread: MessageThread;
  message: Message;
  isOwn: boolean;
  readStatus: ReactNode;
}) {
  const { t } = useTranslation(['messages', 'common']);
  const isEditing = thread.editingMessageId === msg.id;
  const isConfirmingDelete = thread.confirmingDeleteId === msg.id;
  const canEdit = isOwn && !msg.deletedAt && msg.id === thread.lastEditableMessageId;
  const canDelete = isOwn && !msg.deletedAt;

  return (
    <div className={`group/msg flex items-center gap-1 ${isOwn ? 'justify-end' : ''}`}>
      {/* Rediger/slet-knapper: kun for egne beskeder, kun synlige på hover,
          og skjules mens der allerede redigeres/bekræftes sletning. */}
      {(canEdit || canDelete) && !isEditing && !isConfirmingDelete && (
        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover/msg:opacity-100 transition-opacity">
          {canEdit && (
            <button
              type="button"
              onClick={() => thread.startEdit(msg)}
              aria-label={t('editMessage')}
              className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => thread.setConfirmingDeleteId(msg.id)}
              aria-label={t('deleteMessage')}
              className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <div
        className={`rounded-xl px-3 py-2 ${
          isOwn ? 'bg-accent text-accent-text' : 'bg-bg-gray text-primary dark:bg-slate-700 dark:text-slate-100'
        }`}
      >
        {msg.deletedAt ? (
          <p className="text-sm italic opacity-70">{t('messageDeleted')}</p>
        ) : isEditing ? (
          <div className="flex flex-col gap-2">
            {thread.editErrorMessage && (
              <p className="text-xs text-red-800 dark:text-red-400">{thread.editErrorMessage}</p>
            )}
            <textarea
              value={thread.editDraft}
              onChange={(e) => thread.setEditDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void thread.saveEdit();
                }
                if (e.key === 'Escape') thread.cancelEdit();
              }}
              rows={2}
              autoFocus
              className="w-full resize-none rounded-md bg-black/10 px-2 py-1 text-sm text-inherit placeholder-current focus:outline-none"
            />
            <div className="flex items-center gap-3 justify-end">
              <button type="button" onClick={thread.cancelEdit} disabled={thread.isSavingEdit} className={`${TEXT_BUTTON} font-medium`}>
                {t('common:cancel')}
              </button>
              <button
                type="button"
                onClick={() => void thread.saveEdit()}
                disabled={!thread.editDraft.trim() || thread.isSavingEdit}
                className={`${TEXT_BUTTON} font-semibold`}
              >
                {thread.isSavingEdit ? t('common:saving') : t('common:save')}
              </button>
            </div>
          </div>
        ) : isConfirmingDelete ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">{t('confirmDeleteMessage')}</p>
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => thread.setConfirmingDeleteId(null)}
                disabled={thread.isDeleting}
                className={`${TEXT_BUTTON} font-medium`}
              >
                {t('common:cancel')}
              </button>
              <button
                type="button"
                onClick={() => void thread.confirmDelete(msg.id)}
                disabled={thread.isDeleting}
                className={`${TEXT_BUTTON} font-semibold`}
              >
                {thread.isDeleting ? t('common:deleting') : t('common:confirmDeleteYes')}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
        )}

        <div className={`mt-1 flex items-center gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <p className={`text-[10px] ${isOwn ? 'text-accent-text/60' : 'text-secondary dark:text-slate-400'}`}>
            {formatDayMonthTime(msg.createdAt)}
            {msg.editedAt && !msg.deletedAt && ` · ${t('edited')}`}
          </p>
          {readStatus}
        </div>
      </div>
    </div>
  );
}
