import type { OrganisationMember } from '../../types/role/roleType';
import type { ETaskStatus } from '../../types/Task/Task';

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

export interface ConversationParticipant {
  userId: string;
  firstName: string;
  lastName: string;
  urlPicture: string | null;
}

export interface ManageGroupMembersComponentProps {
  isOpen: boolean;
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