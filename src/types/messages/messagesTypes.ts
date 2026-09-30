import type { OrganisationMember } from '../../types/role/roleType';
import type { ETaskStatus } from '../../types/Task/Task';
import type { ReactNode } from 'react';
import type { AvatarProps } from '../common/avatarType';
import type { MessageThread } from '../../store/hooks/useMessageThread';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  messageType: 'user' | 'system';
  editedAt: string | null;
  deletedAt: string | null;
}

export interface ManageGroupMembersComponentProps {
  onClose: () => void;
  conversationId: string;
  groupName: string;
}

// src/types/messages/messagesTypes.ts
export interface ConversationParticipant {
  userId: string;
  firstName: string;
  lastName: string;
  urlPicture: string | null;
  lastReadAt: string | null; // US-B12
}

export interface ConversationComponentProps {
  conversationId: string | null;
  contact: OrganisationMember;
  currentUserId: string;
  onConversationCreated?: (conversationId: string) => void;
}

export interface GroupConversationComponentProps {
  conversationId: string;
  groupName: string;
  currentUserId: string;
  onLeft?: () => void;
}

// src/types/messages/messagesTypes.ts
export interface ConversationSummary {
  conversationId: string;
  isGroup: boolean;
  displayName: string | null;
  otherUserId: string | null;
  urlPicture: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageDeleted: boolean;
  unread: boolean; // NYT
  // System-styrede grupper: koblet til en opgave eller et rolle-låst rum.
  // Medlemskab synkes af databasen, så de kan ikke administreres manuelt.
  taskId: string | null;
  roomId: string | null;
  taskStatus: ETaskStatus | null;
  // Skrivebeskyttet for mig: rummet er ikke længere låst, eller jeg har
  // selv lukket opgave-chatten efter opgaven blev afsluttet.
  closed: boolean;
  completionChoice: TaskChatChoice | null;
}

export type TaskChatChoice = 'keep' | 'close';

export interface TaskChatButtonProps {
  taskId: string;
  // Tilmeldt + 2 eller flere tilmeldte: knappen vises, selvom jeg har
  // forladt chatten, og melder mig ind igen.
  canJoin: boolean;
}

export interface RoomChatButtonProps {
  roomId: string;
}

export interface ConversationListComponentProps {
  selectedConversationId?: string | null;
  onSelectConversation?: (conversationId: string) => void;
}

export interface CreateGroupComponentProps {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

export interface MessageListProps {
  thread: MessageThread;
  currentUserId: string;
  // Undertekst i tom-tilstanden ("Skriv den første besked til ...").
  emptyHint: string;
  // Gruppechats: avatar + navn ved hver ny afsender-klynge.
  showSenders?: boolean;
  // Læse-status på egne beskeder (1:1: sendt/set, gruppe: hvem har set den).
  renderReadStatus: (message: Message) => ReactNode;
}

export interface ChatHeaderProps {
  avatar: ReactNode;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

export interface MessageInputProps {
  // Afvises promiset, bliver teksten stående, så den kan sendes igen.
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export interface MemberPickerProps {
  members: OrganisationMember[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  isLoading: boolean;
  // Vises når der slet ingen medlemmer er at vælge imellem (før søgning).
  emptyText: string;
  label: string;
}

export interface MemberIdentityProps extends Pick<AvatarProps, 'firstName' | 'lastName' | 'urlPicture'> {
  subtitle?: string;
  size?: 'sm' | 'md';
}

export interface ContactListComponentProps {
  selectedContactId?: string | null;
  onSelectContact?: (contact: OrganisationMember) => void;
}
