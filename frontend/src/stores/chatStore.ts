import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { AIModel, Conversation, Message, SourceCitation } from '@/types';

interface StreamingState {
  isStreaming: boolean;
  streamingMessageId: string | null;
  streamingConversationId: string | null;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  streaming: StreamingState;
  selectedModel: AIModel;
  sidebarSearchQuery: string;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  createConversation: (conversation: Conversation) => void;

  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;

  startStreaming: (conversationId: string, messageId: string) => void;
  updateStreamingMessage: (
    conversationId: string,
    messageId: string,
    delta: string,
    sources?: SourceCitation[]
  ) => void;
  finishStreaming: () => void;

  setModel: (model: AIModel) => void;
  setSidebarSearch: (query: string) => void;
  pinConversation: (id: string, pinned: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      immer((set) => ({
        conversations: [],
        activeConversationId: null,
        messages: {},
        streaming: {
          isStreaming: false,
          streamingMessageId: null,
          streamingConversationId: null,
        },
        selectedModel: 'gpt-4o',
        sidebarSearchQuery: '',

        setConversations: (conversations) =>
          set((state) => {
            state.conversations = conversations;
          }),

        addConversation: (conversation) =>
          set((state) => {
            state.conversations.unshift(conversation);
          }),

        updateConversation: (id, updates) =>
          set((state) => {
            const idx = state.conversations.findIndex((c) => c.id === id);
            if (idx !== -1) {
              Object.assign(state.conversations[idx]!, updates);
            }
          }),

        removeConversation: (id) =>
          set((state) => {
            state.conversations = state.conversations.filter((c) => c.id !== id);
            if (state.activeConversationId === id) {
              state.activeConversationId = null;
            }
            delete state.messages[id];
          }),

        setActiveConversation: (id) =>
          set((state) => {
            state.activeConversationId = id;
          }),

        createConversation: (conversation) =>
          set((state) => {
            state.conversations.unshift(conversation);
            state.activeConversationId = conversation.id;
            state.messages[conversation.id] = [];
          }),

        setMessages: (conversationId, messages) =>
          set((state) => {
            state.messages[conversationId] = messages;
          }),

        addMessage: (conversationId, message) =>
          set((state) => {
            if (!state.messages[conversationId]) {
              state.messages[conversationId] = [];
            }
            state.messages[conversationId]!.push(message);

            // Update conversation last message
            const convIdx = state.conversations.findIndex((c) => c.id === conversationId);
            if (convIdx !== -1) {
              state.conversations[convIdx]!.lastMessage = message.content.slice(0, 100);
              state.conversations[convIdx]!.lastMessageAt = message.createdAt;
              state.conversations[convIdx]!.messageCount += 1;
            }
          }),

        updateMessage: (conversationId, messageId, updates) =>
          set((state) => {
            const msgs = state.messages[conversationId];
            if (!msgs) return;
            const idx = msgs.findIndex((m) => m.id === messageId);
            if (idx !== -1) {
              Object.assign(msgs[idx]!, updates);
            }
          }),

        startStreaming: (conversationId, messageId) =>
          set((state) => {
            state.streaming = {
              isStreaming: true,
              streamingMessageId: messageId,
              streamingConversationId: conversationId,
            };
          }),

        updateStreamingMessage: (conversationId, messageId, delta, sources) =>
          set((state) => {
            const msgs = state.messages[conversationId];
            if (!msgs) return;
            const idx = msgs.findIndex((m) => m.id === messageId);
            if (idx !== -1) {
              msgs[idx]!.content += delta;
              if (sources) {
                msgs[idx]!.sources = sources;
              }
            }
          }),

        finishStreaming: () =>
          set((state) => {
            const { streamingConversationId, streamingMessageId } = state.streaming;
            if (streamingConversationId && streamingMessageId) {
              const msgs = state.messages[streamingConversationId];
              if (msgs) {
                const idx = msgs.findIndex((m) => m.id === streamingMessageId);
                if (idx !== -1) {
                  msgs[idx]!.isStreaming = false;
                }
              }
            }
            state.streaming = {
              isStreaming: false,
              streamingMessageId: null,
              streamingConversationId: null,
            };
          }),

        setModel: (model) =>
          set((state) => {
            state.selectedModel = model;
          }),

        setSidebarSearch: (query) =>
          set((state) => {
            state.sidebarSearchQuery = query;
          }),

        pinConversation: (id, pinned) =>
          set((state) => {
            const idx = state.conversations.findIndex((c) => c.id === id);
            if (idx !== -1) {
              state.conversations[idx]!.isPinned = pinned;
            }
          }),
      })),
      {
        name: 'kf-chat-store',
        partialize: (state) => ({
          activeConversationId: state.activeConversationId,
          selectedModel: state.selectedModel,
        }),
      }
    )
  )
);
