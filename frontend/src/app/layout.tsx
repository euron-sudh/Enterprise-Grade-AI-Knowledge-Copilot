import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'KnowledgeForge — Enterprise AI Knowledge Copilot',
    template: '%s | KnowledgeForge',
  },
  description:
    'The enterprise-grade AI Knowledge Copilot. Eliminate information silos and access your organization\'s collective intelligence instantly.',
  keywords: [
    'AI knowledge base',
    'enterprise AI',
    'knowledge management',
    'RAG',
    'document AI',
  ],
  authors: [{ name: 'KnowledgeForge' }],
  creator: 'KnowledgeForge',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
  ),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'KnowledgeForge — Enterprise AI Knowledge Copilot',
    description:
      'Access your organization\'s collective intelligence. Instantly.',
    siteName: 'KnowledgeForge',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KnowledgeForge',
    description: 'Enterprise AI Knowledge Copilot',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-surface-50 dark:bg-surface-950 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
