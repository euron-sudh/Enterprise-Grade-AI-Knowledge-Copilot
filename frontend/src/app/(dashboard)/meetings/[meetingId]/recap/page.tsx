'use client';

import { FileText, CheckSquare, Users, Clock, Download, Share2, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const RECAP = {
  title: 'Q1 2026 OKR Review — All Hands',
  date: 'March 25, 2026',
  duration: '52 minutes',
  participants: 48,
  summary: 'The Q1 OKR review covered results across all four pillars: Engineering, Product, Sales, and Operations. Overall performance was strong with 3 of 4 OKR targets met or exceeded. Engineering hit 99.8% uptime (target: 99.5%) and shipped the frontend redesign 2 weeks ahead of schedule. Product launched the voice assistant beta with 18% adoption. Sales hit $2.4M ARR, 118% of target, adding 8 new enterprise logos. Operations achieved 96% of support SLA targets.',
  decisions: [
    'Q2 focus areas confirmed: mobile app, API v2, HIPAA compliance',
    'Voice assistant will exit beta and GA in Q2 Week 3',
    'Engineering to adopt weekly architecture review meetings starting April',
    'Sales to hire 3 additional AEs for enterprise segment in Q2',
  ],
  actionItems: [
    { item: 'Lead API v2 scoping and design document', assignee: 'James Chen', due: 'April 15, 2026', status: 'open' },
    { item: 'Kick off mobile app discovery sprint', assignee: 'Maya Patel', due: 'April 5, 2026', status: 'open' },
    { item: 'Review HIPAA compliance requirements with legal', assignee: 'Sofia Reyes', due: 'April 8, 2026', status: 'open' },
    { item: 'Finalize Q2 OKR definitions and cascade to teams', assignee: 'Alex Kim', due: 'April 1, 2026', status: 'done' },
    { item: 'Send all-hands recording + recap to absentees', assignee: 'David Lee', due: 'March 27, 2026', status: 'done' },
  ],
  topics: [
    { topic: 'Introduction & Agenda', duration: '3m 42s', timestamp: '0:00' },
    { topic: 'Engineering OKR Review', duration: '14m 48s', timestamp: '3:42' },
    { topic: 'Product & Design Update', duration: '12m 45s', timestamp: '18:30' },
    { topic: 'Sales & Revenue Results', duration: '13m 5s', timestamp: '31:15' },
    { topic: 'Q2 Planning & Next Steps', duration: '7m 40s', timestamp: '44:20' },
  ],
};

export default function MeetingRecapPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/meetings" className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">{RECAP.title}</h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-gray-500 text-sm flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{RECAP.date} · {RECAP.duration}</span>
            <span className="text-gray-500 text-sm flex items-center gap-1"><Users className="w-3.5 h-3.5" />{RECAP.participants} participants</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-xl border border-white/10 transition-colors">
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          <button className="flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-xl border border-white/10 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Quick navigation */}
      <div className="flex gap-2 flex-wrap">
        {['Summary', 'Action Items', 'Decisions', 'Topics'].map(tab => (
          <a key={tab} href={`#${tab.toLowerCase().replace(' ', '-')}`} className="px-3 py-1.5 rounded-lg bg-gray-900 border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">
            {tab}
          </a>
        ))}
        <Link href={`/meetings/1/transcript`} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">
          <FileText className="w-3.5 h-3.5" /> View Full Transcript
        </Link>
      </div>

      {/* Summary */}
      <div id="summary" className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-indigo-400" /></div>
          AI Summary
        </h2>
        <p className="text-gray-300 text-sm leading-relaxed">{RECAP.summary}</p>
      </div>

      {/* Action items */}
      <div id="action-items" className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center"><CheckSquare className="w-3.5 h-3.5 text-green-400" /></div>
          Action Items ({RECAP.actionItems.filter(a => a.status === 'open').length} open)
        </h2>
        <div className="space-y-2">
          {RECAP.actionItems.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50">
              <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${item.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
                {item.status === 'done' && <div className="w-2 h-2 bg-white rounded-sm" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>{item.item}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-gray-500 text-xs">{item.assignee}</span>
                  <span className="text-gray-600 text-xs">Due: {item.due}</span>
                </div>
              </div>
              {item.status === 'open' && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full flex-shrink-0">Open</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key decisions */}
      <div id="decisions" className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Key Decisions</h2>
        <ul className="space-y-2">
          {RECAP.decisions.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
              <ChevronRight className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              {d}
            </li>
          ))}
        </ul>
      </div>

      {/* Topics covered */}
      <div id="topics" className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Topics Covered</h2>
        <div className="space-y-2">
          {RECAP.topics.map((t, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer group">
              <span className="text-indigo-400 text-xs font-mono w-10 flex-shrink-0">{t.timestamp}</span>
              <span className="text-white text-sm flex-1">{t.topic}</span>
              <span className="text-gray-500 text-xs">{t.duration}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
