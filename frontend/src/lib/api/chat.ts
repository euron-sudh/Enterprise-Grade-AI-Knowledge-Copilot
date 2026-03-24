import apiClient, { getToken } from './client';

import type {
  Conversation,
  Message,
  MessageFeedback,
  PaginatedResponse,
  SendMessagePayload,
  StreamingChunk,
} from '@/types';

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8000';

export async function listConversations(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  pinned?: boolean;
}): Promise<PaginatedResponse<Conversation>> {
  const { data } = await apiClient.get<PaginatedResponse<Conversation>>('/conversations', {
    params,
  });
  return data;
}

export async function getConversation(id: string): Promise<Conversation> {
  const { data } = await apiClient.get<Conversation>(`/conversations/${id}`);
  return data;
}

export async function createConversation(payload: {
  title?: string;
  model?: string;
}): Promise<Conversation> {
  const { data } = await apiClient.post<Conversation>('/conversations', payload);
  return data;
}

export async function updateConversation(
  id: string,
  payload: Partial<Pick<Conversation, 'title' | 'isPinned' | 'tags'>>
): Promise<Conversation> {
  const { data } = await apiClient.patch<Conversation>(`/conversations/${id}`, payload);
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  await apiClient.delete(`/conversations/${id}`);
}

export async function getMessages(
  conversationId: string,
  params?: { page?: number; pageSize?: number }
): Promise<PaginatedResponse<Message>> {
  const { data } = await apiClient.get<PaginatedResponse<Message>>(
    `/conversations/${conversationId}/messages`,
    { params }
  );
  return data;
}

export async function sendMessage(
  payload: SendMessagePayload,
  onChunk: (chunk: StreamingChunk) => void,
  onDone: (messageId: string) => void,
  onError: (error: string) => void
): Promise<void> {
  const token = typeof window !== 'undefined' ? await getToken() : null;

  const response = await fetch(
    `${BASE_URL}/conversations/${payload.conversationId}/messages/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        content: payload.content,
        model: payload.model,
        attachmentIds: payload.attachmentIds,
        systemPrompt: payload.systemPrompt,
        images: payload.images,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    onError(errorText || `HTTP error ${response.status}`);
    return;
  }

  if (!response.body) {
    onError('No response body');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          continue;
        }
        try {
          const chunk = JSON.parse(data) as StreamingChunk;
          if (chunk.type === 'done' && chunk.messageId) {
            onDone(chunk.messageId);
          } else {
            onChunk(chunk);
          }
        } catch {
          // ignore malformed SSE frames
        }
      }
    }
  }
}

export async function branchConversation(
  conversationId: string,
  fromMessageId: string
): Promise<Conversation> {
  const { data } = await apiClient.post<Conversation>(
    `/conversations/${conversationId}/branch`,
    { fromMessageId }
  );
  return data;
}

export async function shareConversation(conversationId: string): Promise<{ shareUrl: string }> {
  const { data } = await apiClient.post<{ shareUrl: string }>(
    `/conversations/${conversationId}/share`
  );
  return data;
}

export async function submitFeedback(
  messageId: string,
  feedback: Omit<MessageFeedback, 'submittedAt'>
): Promise<void> {
  await apiClient.post(`/messages/${messageId}/feedback`, feedback);
}
