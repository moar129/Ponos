
import { useState } from 'react';
import { Send } from 'lucide-react';

type Props = {
  onSend: (content: string) => void | Promise<void>;
  disabled?: boolean;
};

export function MessageInputComponent({ onSend, disabled = false }: Props) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || disabled || isSending) return;

    setIsSending(true);
    try {
      await onSend(trimmedContent);
      setContent('');
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
      className="flex items-end gap-2 border-t border-border-gray p-3"
    >
      <textarea
        rows={1}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Skriv en besked..."
        disabled={disabled || isSending}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        className="min-h-10 flex-1 resize-none rounded-lg border border-border-gray bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />

      <button
        type="submit"
        disabled={disabled || isSending || !content.trim()}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-primary transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {isSending ? 'Sender...' : 'Send'}
      </button>
    </form>
  );
}
