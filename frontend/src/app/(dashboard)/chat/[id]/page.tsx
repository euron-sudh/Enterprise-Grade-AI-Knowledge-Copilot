'use client';

import { useParams, useSearchParams } from 'next/navigation';

import { ConversationList } from '@/components/chat/ConversationList';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function ChatConversationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialMessage = searchParams.get('q') ?? undefined;

  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0 border-r border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-950 overflow-y-auto">
        <ConversationList />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-surface-950">
        <ChatInterface conversationId={id} initialMessage={initialMessage} />
      </div>
    </div>
  );
}
