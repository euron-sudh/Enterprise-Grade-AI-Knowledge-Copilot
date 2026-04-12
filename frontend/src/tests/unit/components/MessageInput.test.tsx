import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MessageInput } from '@/components/chat/MessageInput';
import { useChatStore } from '@/stores/chatStore';

// Reset streaming state before each test
beforeEach(() => {
  useChatStore.setState({
    streaming: { isStreaming: false, streamingMessageId: null, streamingConversationId: null },
    conversations: [],
    activeConversationId: null,
    messages: {},
    selectedModel: 'gpt-4o',
    sidebarSearchQuery: '',
  });
});

describe('MessageInput', () => {
  it('renders textarea with placeholder', () => {
    render(<MessageInput onSend={vi.fn()} placeholder="Ask anything..." />);
    expect(screen.getByPlaceholderText('Ask anything...')).toBeInTheDocument();
  });

  it('send button is disabled when input is empty', () => {
    render(<MessageInput onSend={vi.fn()} />);
    const button = screen.getByRole('button', { name: /send message/i });
    expect(button).toBeDisabled();
  });

  it('send button becomes enabled when text is entered', async () => {
    const user = userEvent.setup();
    render(<MessageInput onSend={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), 'Hello');
    expect(screen.getByRole('button', { name: /send message/i })).not.toBeDisabled();
  });

  it('calls onSend with content when send button is clicked', async () => {
    const user = userEvent.setup();
    const handleSend = vi.fn();
    render(<MessageInput onSend={handleSend} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Test message');
    await user.click(screen.getByRole('button', { name: /send message/i }));
    expect(handleSend).toHaveBeenCalledWith('Test message', expect.anything());
  });

  it('clears input after sending', async () => {
    const user = userEvent.setup();
    render(<MessageInput onSend={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Send this');
    await user.click(screen.getByRole('button', { name: /send message/i }));
    expect(textarea).toHaveValue('');
  });

  it('submits on Enter key', async () => {
    const user = userEvent.setup();
    const handleSend = vi.fn();
    render(<MessageInput onSend={handleSend} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Enter submit{Enter}');
    expect(handleSend).toHaveBeenCalled();
  });

  it('does not submit on Shift+Enter (allows newlines)', async () => {
    const user = userEvent.setup();
    const handleSend = vi.fn();
    render(<MessageInput onSend={handleSend} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');
    expect(handleSend).not.toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<MessageInput onSend={vi.fn()} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('shows abort button while streaming', () => {
    useChatStore.setState({
      streaming: { isStreaming: true, streamingMessageId: 'msg-1', streamingConversationId: 'conv-1' },
    });
    render(<MessageInput onSend={vi.fn()} onAbort={vi.fn()} />);
    expect(screen.getByRole('button', { name: /stop|abort/i })).toBeInTheDocument();
  });

  it('calls onAbort when abort button clicked', async () => {
    const user = userEvent.setup();
    const handleAbort = vi.fn();
    useChatStore.setState({
      streaming: { isStreaming: true, streamingMessageId: 'msg-1', streamingConversationId: 'conv-1' },
    });
    render(<MessageInput onSend={vi.fn()} onAbort={handleAbort} />);
    await user.click(screen.getByRole('button', { name: /stop|abort/i }));
    expect(handleAbort).toHaveBeenCalled();
  });

  it('shows slash command menu when / is typed', async () => {
    const user = userEvent.setup();
    render(<MessageInput onSend={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), '/');
    expect(screen.getAllByText(/summarize/i).length).toBeGreaterThan(0);
  });
});
