// components/messaging/ConversationListComponent.tsx
import { Loader2, MessageSquareText, Users } from 'lucide-react';
import { useGetMyConversationsQuery } from '../../store/apis/messageApi';

interface ConversationListComponentProps {
  selectedConversationId?: string | null;
  onSelectConversation?: (conversationId: string) => void;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length > 1
    ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function ConversationListComponent({ selectedConversationId, onSelectConversation }: ConversationListComponentProps) {
  const { data: conversations = [], isLoading, error } = useGetMyConversationsQuery();

  const errorMessage =
    error && typeof error === 'object' && 'error' in error
      ? (error as { error: string }).error
      : null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#C7975D]" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="m-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
        {errorMessage}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 px-4">
        <MessageSquareText className="w-8 h-8 mb-2 stroke-[1.5] text-slate-500" />
        <p className="text-sm">Ingen samtaler endnu. Find en kollega under "Alle kontakter" for at starte en.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-800">
      {conversations.map((conv) => {
        const isSelected = selectedConversationId === conv.conversationId;
        return (
          <li key={conv.conversationId}>
            <button
              type="button"
              onClick={() => onSelectConversation?.(conv.conversationId)}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                isSelected ? 'bg-slate-800' : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-700 text-slate-100 flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
                {conv.isGroup ? (
                  <Users className="w-5 h-5" />
                ) : conv.urlPicture ? (
                  <img src={conv.urlPicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(conv.displayName)
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">
                  {conv.displayName ?? 'Unavngivet samtale'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {conv.lastMessage ?? 'Ingen beskeder endnu'}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}