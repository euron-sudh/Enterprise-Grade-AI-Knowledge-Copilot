export type MessageRole = 'user' | 'assistant' | 'system';

export type AIModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'claude-3-5-sonnet'
  | 'claude-3-haiku'
  | 'gemini-pro'
  | 'llama-3-70b';

export interface AIModelInfo {
  id: AIModel;
  name: string;
  provider: string;
  contextWindow: number;
  supportsVision: boolean;
  supportsCode: boolean;
  costPerToken: number;
}

export interface SourceCitation {
  id: string;
  documentId: string;
  documentName: string;
  documentType: string;
  pageNumber?: number;
  chunkText: string;
  relevanceScore: number;
  url?: string;
  connectorType?: string;
  sourceType?: 'knowledge_base' | 'web';
}

export interface MessageFeedback {
  rating: 'up' | 'down';
  comment?: string;
  submittedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  model?: AIModel;
  sources: SourceCitation[];
  feedback?: MessageFeedback;
  tokenCount?: number;
  processingTimeMs?: number;
  isStreaming?: boolean;
  attachments?: MessageAttachment[];
  createdAt: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  model: AIModel;
  isPinned: boolean;
  isShared: boolean;
  shareUrl?: string;
  messageCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationBranch {
  id: string;
  parentConversationId: string;
  branchFromMessageId: string;
  title: string;
  createdAt: string;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  model?: AIModel;
  attachmentIds?: string[];
  systemPrompt?: string;
  images?: string[]; // base64 data URIs for vision (e.g. "data:image/png;base64,...")
}

export interface StreamingChunk {
  type: 'delta' | 'done' | 'error' | 'sources';
  delta?: string;
  messageId?: string;
  sources?: SourceCitation[];
  error?: string;
}
