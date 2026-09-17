import type { OrganisationMember } from '../../types/role/roleType';

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
  unread: boolean; // NYT
}

export interface ConversationListComponentProps {
  selectedConversationId?: string | null;
  onSelectConversation?: (conversationId: string) => void;
}