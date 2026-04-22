import { ChatMessage } from './chat.model';

export interface Conversation {
  id: string;
  userName: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type ConversationBucket = 'today' | 'yesterday' | 'earlier';

export interface BucketedConversation {
  bucket: ConversationBucket;
  conversations: Conversation[];
}
