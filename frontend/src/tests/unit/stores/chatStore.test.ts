import { beforeEach, describe, expect, it } from 'vitest';

import { useChatStore } from '@/stores/chatStore';
import type { Conversation, Message } from '@/types';

const mockConversation: Conversation = {
  id: 'conv-1',
  title: 'Test Conversation',
  userId: 'user-1',
  model: 'gpt-4o',
  isPinned: false,
  isShared: false,
  messageCount: 0,
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockMessage: Message = {
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user',
  content: 'Hello world',
  sources: [],
  createdAt: new Date().toISOString(),
};

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
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
    });
  });

  describe('conversations', () => {
    it('sets conversations', () => {
      useChatStore.getState().setConversations([mockConversation]);
      expect(useChatStore.getState().conversations).toHaveLength(1);
      expect(useChatStore.getState().conversations[0]?.id).toBe('conv-1');
    });

    it('adds a conversation at the beginning', () => {
      const conv2: Conversation = { ...mockConversation, id: 'conv-2', title: 'Conv 2' };
      useChatStore.getState().setConversations([mockConversation]);
      useChatStore.getState().addConversation(conv2);
      const convs = useChatStore.getState().conversations;
      expect(convs).toHaveLength(2);
      expect(convs[0]?.id).toBe('conv-2');
    });

    it('updates a conversation', () => {
      useChatStore.getState().setConversations([mockConversation]);
      useChatStore.getState().updateConversation('conv-1', { title: 'Updated Title' });
      expect(useChatStore.getState().conversations[0]?.title).toBe('Updated Title');
    });

    it('removes a conversation', () => {
      useChatStore.getState().setConversations([mockConversation]);
      useChatStore.getState().removeConversation('conv-1');
      expect(useChatStore.getState().conversations).toHaveLength(0);
    });

    it('clears active conversation when removing it', () => {
      useChatStore.getState().setConversations([mockConversation]);
      useChatStore.getState().setActiveConversation('conv-1');
      useChatStore.getState().removeConversation('conv-1');
      expect(useChatStore.getState().activeConversationId).toBeNull();
    });

    it('sets active conversation', () => {
      useChatStore.getState().setActiveConversation('conv-1');
      expect(useChatStore.getState().activeConversationId).toBe('conv-1');
    });

    it('creates a conversation and sets it active', () => {
      useChatStore.getState().createConversation(mockConversation);
      expect(useChatStore.getState().activeConversationId).toBe('conv-1');
      expect(useChatStore.getState().conversations).toHaveLength(1);
      expect(useChatStore.getState().messages['conv-1']).toEqual([]);
    });

    it('pins and unpins a conversation', () => {
      useChatStore.getState().setConversations([mockConversation]);
      useChatStore.getState().pinConversation('conv-1', true);
      expect(useChatStore.getState().conversations[0]?.isPinned).toBe(true);
      useChatStore.getState().pinConversation('conv-1', false);
      expect(useChatStore.getState().conversations[0]?.isPinned).toBe(false);
    });
  });

  describe('messages', () => {
    it('sets messages for a conversation', () => {
      useChatStore.getState().setMessages('conv-1', [mockMessage]);
      expect(useChatStore.getState().messages['conv-1']).toHaveLength(1);
    });

    it('adds a message', () => {
      useChatStore.getState().setMessages('conv-1', []);
      useChatStore.getState().addMessage('conv-1', mockMessage);
      expect(useChatStore.getState().messages['conv-1']).toHaveLength(1);
      expect(useChatStore.getState().messages['conv-1']?.[0]?.id).toBe('msg-1');
    });

    it('updates a message', () => {
      useChatStore.getState().setMessages('conv-1', [mockMessage]);
      useChatStore.getState().updateMessage('conv-1', 'msg-1', { content: 'Updated' });
      expect(useChatStore.getState().messages['conv-1']?.[0]?.content).toBe('Updated');
    });
  });

  describe('streaming', () => {
    it('starts streaming', () => {
      useChatStore.getState().startStreaming('conv-1', 'msg-1');
      const { streaming } = useChatStore.getState();
      expect(streaming.isStreaming).toBe(true);
      expect(streaming.streamingMessageId).toBe('msg-1');
      expect(streaming.streamingConversationId).toBe('conv-1');
    });

    it('updates streaming message content', () => {
      useChatStore.getState().setMessages('conv-1', [
        { ...mockMessage, id: 'msg-2', role: 'assistant', content: '' },
      ]);
      useChatStore.getState().startStreaming('conv-1', 'msg-2');
      useChatStore.getState().updateStreamingMessage('conv-1', 'msg-2', 'Hello');
      useChatStore.getState().updateStreamingMessage('conv-1', 'msg-2', ' world');
      expect(useChatStore.getState().messages['conv-1']?.[0]?.content).toBe('Hello world');
    });

    it('finishes streaming', () => {
      useChatStore.getState().setMessages('conv-1', [
        { ...mockMessage, id: 'msg-2', role: 'assistant', content: 'done', isStreaming: true },
      ]);
      useChatStore.getState().startStreaming('conv-1', 'msg-2');
      useChatStore.getState().finishStreaming();
      expect(useChatStore.getState().streaming.isStreaming).toBe(false);
      expect(useChatStore.getState().messages['conv-1']?.[0]?.isStreaming).toBe(false);
    });
  });

  describe('model', () => {
    it('sets the selected model', () => {
      useChatStore.getState().setModel('claude-3-5-sonnet');
      expect(useChatStore.getState().selectedModel).toBe('claude-3-5-sonnet');
    });
  });

  describe('sidebar search', () => {
    it('sets sidebar search query', () => {
      useChatStore.getState().setSidebarSearch('hello');
      expect(useChatStore.getState().sidebarSearchQuery).toBe('hello');
    });
  });
});
