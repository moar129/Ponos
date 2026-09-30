// src/components/messages/ChatHeader.tsx
import type { ChatHeaderProps } from '../../types/messages/messagesTypes';

// Topbjælken i en åben samtale (1:1 og gruppe).
export function ChatHeader({ avatar, title, subtitle, actions }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border-gray shrink-0 dark:border-slate-700">
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-primary truncate dark:text-slate-100">{title}</p>
        <p className="text-xs text-secondary truncate dark:text-slate-400">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}
