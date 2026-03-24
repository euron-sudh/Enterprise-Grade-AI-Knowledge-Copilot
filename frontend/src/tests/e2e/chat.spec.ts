import { expect, test } from '@playwright/test';

// We need to be authenticated for these tests
test.use({ storageState: 'playwright-report/.auth/user.json' });

const BASE_API = 'http://localhost:8000';

test.describe('Chat flows', () => {
  test.beforeEach(async ({ page }) => {
    // Mock conversations list
    await page.route(`${BASE_API}/conversations*`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'conv-1',
                title: 'Test Conversation',
                userId: 'user-1',
                model: 'gpt-4o',
                isPinned: false,
                isShared: false,
                messageCount: 2,
                lastMessage: 'Hello there',
                lastMessageAt: new Date().toISOString(),
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            total: 1,
            page: 1,
            pageSize: 50,
            hasMore: false,
          }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-conv-1',
            title: 'New Conversation',
            userId: 'user-1',
            model: 'gpt-4o',
            isPinned: false,
            isShared: false,
            messageCount: 0,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      }
    });

    await page.goto('/chat');
  });

  test('shows chat page with conversation list', async ({ page }) => {
    await expect(page.getByText('Conversations')).toBeVisible();
    await expect(page.getByText('Test Conversation')).toBeVisible();
  });

  test('shows empty state when no conversation is selected', async ({ page }) => {
    await expect(page.getByText('Select a conversation')).toBeVisible();
  });

  test('navigates to conversation when clicked', async ({ page }) => {
    // Mock messages
    await page.route(`${BASE_API}/conversations/conv-1/messages*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'msg-1',
              conversationId: 'conv-1',
              role: 'user',
              content: 'Hello',
              sources: [],
              createdAt: new Date().toISOString(),
            },
            {
              id: 'msg-2',
              conversationId: 'conv-1',
              role: 'assistant',
              content: 'Hi! How can I help you?',
              sources: [],
              createdAt: new Date().toISOString(),
            },
          ],
          total: 2,
          page: 1,
          pageSize: 100,
          hasMore: false,
        }),
      });
    });

    await page.getByText('Test Conversation').click();
    await expect(page).toHaveURL('/chat/conv-1');
  });

  test('creates a new conversation', async ({ page }) => {
    const newConvButton = page.getByRole('button', { name: /new conversation/i });
    await newConvButton.click();

    await expect(page).toHaveURL(/\/chat\/new-conv-1/);
  });

  test('searches conversations', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search conversations/i);
    await searchInput.fill('Test');
    await expect(page.getByText('Test Conversation')).toBeVisible();

    await searchInput.fill('nonexistent');
    // Filtered out
    await expect(page.getByText('Test Conversation')).not.toBeVisible();
  });

  test.describe('Conversation view', () => {
    test.beforeEach(async ({ page }) => {
      // Mock conversation detail
      await page.route(`${BASE_API}/conversations/conv-1`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
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
          }),
        });
      });

      await page.route(`${BASE_API}/conversations/conv-1/messages*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 100, hasMore: false }),
        });
      });

      await page.goto('/chat/conv-1');
    });

    test('shows chat interface with message input', async ({ page }) => {
      const textarea = page.getByPlaceholder(/ask anything/i);
      await expect(textarea).toBeVisible();
    });

    test('shows model selector', async ({ page }) => {
      await expect(page.getByText('GPT-4o')).toBeVisible();
    });

    test('can type in message input', async ({ page }) => {
      const textarea = page.getByPlaceholder(/ask anything/i);
      await textarea.fill('What is the company refund policy?');
      await expect(textarea).toHaveValue('What is the company refund policy?');
    });

    test('send button is disabled when input is empty', async ({ page }) => {
      const sendBtn = page.getByRole('button', { name: /send message/i });
      await expect(sendBtn).toBeDisabled();
    });

    test('send button is enabled when input has text', async ({ page }) => {
      await page.getByPlaceholder(/ask anything/i).fill('Hello');
      const sendBtn = page.getByRole('button', { name: /send message/i });
      await expect(sendBtn).not.toBeDisabled();
    });

    test('shows empty state when no messages', async ({ page }) => {
      await expect(page.getByText('Start a conversation')).toBeVisible();
    });

    test('changes model via selector', async ({ page }) => {
      await page.getByText('GPT-4o').click();
      await expect(page.getByText('Claude 3.5 Sonnet')).toBeVisible();
      await page.getByText('Claude 3.5 Sonnet').click();
    });
  });
});
