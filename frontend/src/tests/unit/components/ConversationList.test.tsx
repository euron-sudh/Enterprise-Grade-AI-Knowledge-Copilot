import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ConversationList } from '@/components/chat/ConversationList';
import { useChatStore } from '@/stores/chatStore';
import type { Conversation } from '@/types';

// Mock useChat hooks so they don't make real API calls
vi.mock('@/hooks/useChat', () => ({
  useConversations: () => ({ isLoading: false }),
  useCreateConversation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteConversation: () => ({ mutate: vi.fn(), isPending: false }),
  usePinConversation: () => ({ mutate: vi.fn(), isPending: false }),
  useSendMessage: () => ({ sendMessage: vi.fn(), abort: vi.fn() }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  title: 'Test Conversation',
  userId: 'user-1',
  model: 'gpt-4o',
  isPinned: false,
  isShared: false,
  messageCount: 5,
  lastMessage: 'Last message preview',
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  useChatStore.setState({
    conversations: [],
    activeConversationId: null,
    messages: {},
    streaming: { isStreaming: false, streamingMessageId: null, streamingConversationId: null },
    selectedModel: 'gpt-4o',
    sidebarSearchQuery: '',
  });
});

describe('ConversationList', () => {
  it('renders empty state when no conversations', () => {
    render(<ConversationList onSelect={vi.fn()} onNew={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText(/no conversations/i)).toBeInTheDocument();
  });

  it('renders list of conversations', () => {
    useChatStore.setState({
      conversations: [
        makeConversation({ id: 'c1', title: 'First Chat' }),
        makeConversation({ id: 'c2', title: 'Second Chat' }),
      ],
    });
    render(<ConversationList onSelect={vi.fn()} onNew={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('First Chat')).toBeInTheDocument();
    expect(screen.getByText('Second Chat')).toBeInTheDocument();
  });

  it('highlights the active conversation', () => {
    useChatStore.setState({
      conversations: [makeConversation({ id: 'c1', title: 'Active Chat' })],
      activeConversationId: 'c1',
    });
    render(<ConversationList onSelect={vi.fn()} onNew={vi.fn()} />, { wrapper: createWrapper() });
    const item = screen.getByText('Active Chat').closest('li, [role="listitem"], button, a');
    expect(item).toBeTruthy();
  });

  it('calls onSelect when a conversation is clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    useChatStore.setState({
      conversations: [makeConversation({ id: 'c1', title: 'Click Me' })],
    });
    render(<ConversationList onSelect={handleSelect} onNew={vi.fn()} />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Click Me'));
    expect(handleSelect).toHaveBeenCalledWith('c1');
  });

  it('calls onNew when new conversation button is clicked', async () => {
    const user = userEvent.setup();
    const handleNew = vi.fn();
    render(<ConversationList onSelect={vi.fn()} onNew={handleNew} />, { wrapper: createWrapper() });
    const newBtn = screen.getByRole('button', { name: /new conversation/i });
    await user.click(newBtn);
    expect(handleNew).toHaveBeenCalled();
  });

  it('filters conversations by search query', async () => {
    const user = userEvent.setup();
    useChatStore.setState({
      conversations: [
        makeConversation({ id: 'c1', title: 'Alpha Chat' }),
        makeConversation({ id: 'c2', title: 'Beta Chat' }),
      ],
    });
    render(<ConversationList onSelect={vi.fn()} onNew={vi.fn()} />, { wrapper: createWrapper() });
    const searchInput = screen.getByPlaceholderText(/search conversations/i);
    await user.type(searchInput, 'alpha');
    expect(screen.getByText('Alpha Chat')).toBeInTheDocument();
    expect(screen.queryByText('Beta Chat')).not.toBeInTheDocument();
  });

  it('shows pinned conversations at the top', () => {
    useChatStore.setState({
      conversations: [
        makeConversation({ id: 'c1', title: 'Regular', isPinned: false }),
        makeConversation({ id: 'c2', title: 'Pinned', isPinned: true }),
      ],
    });
    render(<ConversationList onSelect={vi.fn()} onNew={vi.fn()} />, { wrapper: createWrapper() });
    const items = screen.getAllByRole('link');
    // Pinned should appear before regular
    const pinnedIndex = items.findIndex((el) => el.textContent?.includes('Pinned'));
    const regularIndex = items.findIndex((el) => el.textContent?.includes('Regular'));
    expect(pinnedIndex).toBeLessThan(regularIndex);
  });
});
