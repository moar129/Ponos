import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { Loader2, Send } from 'lucide-react';
import type { MessageInputProps } from '../../types/messages/messagesTypes';

// Beskedfeltet nederst i en samtale (1:1 og gruppe). Enter sender,
// Shift + Enter giver ny linje.
export function MessageInputComponent({ onSend, disabled = false }: MessageInputProps) {
  const { t } = useTranslation(['messages', 'common'])
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const isBusy = disabled || isSending;

  const handleSend = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isBusy) return;

    setIsSending(true);
    try {
      await onSend(trimmedContent);
      setContent('');
    } catch {
      // Teksten bliver stående, så brugeren kan prøve igen.
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSend();
      }}
      className="border-t border-border-gray p-3 shrink-0 dark:border-slate-700"
    >
      <div className="flex items-end gap-2">
        <textarea
          rows={1}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t('inputPlaceholder')}
          disabled={isBusy}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          className="flex-1 resize-none bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
        />
        <button
          type="submit"
          disabled={isBusy || !content.trim()}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label={t('sendMessage')}
        >
          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-[10px] text-secondary mt-1 dark:text-slate-400">{t('enterHint')}</p>
    </form>
  );
}
