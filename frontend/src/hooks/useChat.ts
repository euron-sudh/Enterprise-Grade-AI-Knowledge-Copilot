'use client';

import { useCallback, useRef } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

import * as chatApi from '@/lib/api/chat';
import { useChatStore } from '@/stores/chatStore';
import type { AIModel, Message, SendMessagePayload } from '@/types';

export function useConversations() {
  const { setConversations } = useChatStore();

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await chatApi.listConversations({ pageSize: 50 });
      setConversations(response.items);
      return response;
    },
    staleTime: 30_000,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => chatApi.getConversation(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useMessages(conversationId: string | null) {
  const { setMessages } = useChatStore();

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const response = await chatApi.getMessages(conversationId!, { pageSize: 100 });
      setMessages(conversationId!, response.items);
      return response;
    },
    enabled: !!conversationId,
    staleTime: 10_000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { createConversation } = useChatStore();

  return useMutation({
    mutationFn: (payload: { title?: string; model?: AIModel }) =>
      chatApi.createConversation(payload),
    onSuccess: (conversation) => {
      createConversation(conversation);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error('Failed to create conversation');
    },
  });
}

export function useStreamingMessage() {
  const abortRef = useRef<(() => void) | null>(null);
  const {
    addMessage,
    startStreaming,
    updateStreamingMessage,
    finishStreaming,
    updateConversation,
  } = useChatStore();

  const sendMessage = useCallback(
    async (payload: SendMessagePayload) => {
      // Add optimistic user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        conversationId: payload.conversationId,
        role: 'user',
        content: payload.content,
        sources: [],
        createdAt: new Date().toISOString(),
        attachments: [],
      };
      addMessage(payload.conversationId, userMessage);

      // Add placeholder assistant message
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        conversationId: payload.conversationId,
        role: 'assistant',
        content: '',
        model: payload.model,
        sources: [],
        isStreaming: true,
        createdAt: new Date().toISOString(),
      };
      addMessage(payload.conversationId, assistantMessage);
      startStreaming(payload.conversationId, assistantMessageId);

      let cancelled = false;
      abortRef.current = () => {
        cancelled = true;
      };

      await chatApi.sendMessage(
        payload,
        (chunk) => {
          if (cancelled) return;
          if (chunk.type === 'delta' && chunk.delta) {
            updateStreamingMessage(
              payload.conversationId,
              assistantMessageId,
              chunk.delta
            );
          } else if (chunk.type === 'sources' && chunk.sources) {
            updateStreamingMessage(
              payload.conversationId,
              assistantMessageId,
              '',
              chunk.sources
            );
          }
        },
        (_messageId) => {
          finishStreaming();
          updateConversation(payload.conversationId, {
            lastMessageAt: new Date().toISOString(),
          });
        },
        (error) => {
          finishStreaming();
          toast.error(`Error: ${error}`);
        }
      );
    },
    [addMessage, startStreaming, updateStreamingMessage, finishStreaming, updateConversation]
  );

  const abort = useCallback(() => {
    abortRef.current?.();
    finishStreaming();
  }, [finishStreaming]);

  return { sendMessage, abort };
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { removeConversation } = useChatStore();

  return useMutation({
    mutationFn: chatApi.deleteConversation,
    onSuccess: (_, id) => {
      removeConversation(id);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversation deleted');
    },
    onError: () => {
      toast.error('Failed to delete conversation');
    },
  });
}

export function usePinConversation() {
  const queryClient = useQueryClient();
  const { pinConversation } = useChatStore();

  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      chatApi.updateConversation(id, { isPinned: pinned }),
    onSuccess: (_, { id, pinned }) => {
      pinConversation(id, pinned);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error('Failed to update conversation');
    },
  });
}
