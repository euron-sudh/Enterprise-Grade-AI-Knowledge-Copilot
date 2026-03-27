'use client';

import { MessageSquare, Lock, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const SHARED_MESSAGES = [
  { role: 'user', content: 'What is our current uptime SLA and how have we performed against it this quarter?' },
  { role: 'assistant', content: 'Based on the Engineering OKR Review document and the Q1 System Health Report, here\'s your SLA performance:\n\n**Current SLA Target:** 99.5% uptime\n\n**Q1 2026 Actual Performance:** 99.8% uptime ✅\n\nThis represents 0.3 percentage points above target — in practice, that means roughly 21 fewer minutes of downtime than your SLA allows per month.\n\n**Breakdown by service:**\n- API Server: 99.99%\n- PostgreSQL: 100%\n- Redis: 100%\n- Elasticsearch: 99.8% (one degradation incident in week 11)\n- WebSocket: 99.96%\n\n**Sources:**\n1. Q1 Engineering OKR Review — System Reliability section\n2. System Health Dashboard — March 2026\n3. Incident Log — Week 11 Elasticsearch degradation', citations: ['Q1 Engineering OKR Review', 'System Health Dashboard', 'Incident Log'] },
  { role: 'user', content: 'What caused the Elasticsearch degradation?' },
  { role: 'assistant', content: 'The Elasticsearch degradation in Week 11 (March 12-13, 2026) was caused by a **shard rebalancing event** triggered by a node replacement.\n\n**Root cause:** A spot instance running one of the Elasticsearch data nodes was reclaimed by AWS. The auto-replacement triggered a shard rebalancing across the cluster, which temporarily increased query latency from ~50ms to ~380ms for about 4 hours.\n\n**Impact:** Search queries were slower but functional. No data loss occurred.\n\n**Resolution:** The cluster self-healed once rebalancing completed. A follow-up action item was created to migrate Elasticsearch to reserved instances to prevent spot reclamation.\n\n**Source:** Incident Log — INC-2026-0312', citations: ['Incident Log — INC-2026-0312'] },
];

export default function SharedChatPage() {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Shared Conversation</div>
              <div className="text-gray-500 text-xs flex items-center gap-1"><Lock className="w-3 h-3" /> Read-only · KnowledgeForge</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyLink} className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors">
              {copied ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <Link href="/login" className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
              <ExternalLink className="w-3 h-3" /> Open in app
            </Link>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-white font-bold text-lg">Q1 SLA & Uptime Analysis</h1>
          <p className="text-gray-500 text-sm mt-1">Shared by Alex Kim · March 26, 2026</p>
        </div>

        {SHARED_MESSAGES.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-800 border border-white/10 text-gray-400'}`}>
              {msg.role === 'user' ? 'AK' : 'AI'}
            </div>
            <div className={`flex-1 max-w-2xl ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block text-left rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-gray-900 border border-white/5 text-gray-300 rounded-tl-sm'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {'citations' in msg && msg.citations && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-gray-500 text-xs mb-1">Sources</p>
                    <div className="flex flex-wrap gap-1">
                      {msg.citations.map((c: string) => (
                        <span key={c} className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-white/5 py-6">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-sm mb-3">Want to ask your own questions across your organization's knowledge?</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            Get started free <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
