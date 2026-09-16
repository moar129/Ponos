export interface ConversationSummary {
  conversationId: string;
  isGroup: boolean;
  displayName: string | null;
  otherUserId: string | null;
  urlPicture: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  messageType: 'user' | 'system';
}

export interface ConversationSummary {
  conversationId: string;
  isGroup: boolean;
  displayName: string | null;
  otherUserId: string | null;
  urlPicture: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
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

export interface GroupConversationComponentProps {
  conversationId: string;
  groupName: string;
  currentUserId: string;
  onLeft?: () => void;
}

export interface GroupConversationComponentProps {
  conversationId: string;
  groupName: string;
  currentUserId: string;
  onLeft?: () => void;
}