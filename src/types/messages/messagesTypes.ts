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

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ConversationParticipant {
  userId: string;
  firstName: string;
  lastName: string;
  urlPicture: string | null;
}