'use client';

import { useState } from 'react';
import { Search, Download, ArrowLeft, Clock, Users, Filter } from 'lucide-react';
import Link from 'next/link';

const SEGMENTS = [
  { time: '0:04', speaker: 'Alex Kim', text: 'Good morning everyone. Welcome to our Q1 OKR review. Today we\'ll cover results across all four pillars — Engineering, Product, Sales, and Operations.', isHighlight: false },
  { time: '0:28', speaker: 'Sofia Reyes', text: 'Before we dive in, I want to flag that we have a hard stop at 10 AM so let\'s keep each section to 12 minutes max. We have a lot of ground to cover.', isHighlight: false },
  { time: '0:45', speaker: 'James Chen', text: 'Engineering update — we hit 99.8% uptime this quarter, exceeding our 99.5% target. The new circuit breaker implementation and auto-scaling improvements really paid off.', isHighlight: true },
  { time: '1:12', speaker: 'Maya Patel', text: 'The frontend redesign shipped 2 weeks ahead of schedule. User satisfaction scores went from 3.8 to 4.5 out of 5 based on the post-launch survey we ran.', isHighlight: false },
  { time: '1:45', speaker: 'Alex Kim', text: 'That\'s excellent. James, can you touch on the voice assistant infrastructure rollout?', isHighlight: false },
  { time: '1:52', speaker: 'James Chen', text: 'Sure. The Deepgram integration is live and performing well. We\'re seeing p95 latency of 280ms which is well within our 300ms target. ElevenLabs TTS is also stable.', isHighlight: true },
  { time: '2:30', speaker: 'Sofia Reyes', text: 'Quick note — the HIPAA compliance work is blocked pending legal review. We\'ve deprioritized it for Q1 and it\'s now a Q2 initiative.', isHighlight: false },
  { time: '3:15', speaker: 'David Lee', text: 'On the product side, voice assistant beta launched with 18% adoption among pilot users. The biggest friction is discoverability — users don\'t know it exists.', isHighlight: false },
  { time: '3:42', speaker: 'Maya Patel', text: 'We\'re planning an in-app onboarding nudge to address that in Q2. Our hypothesis is we can hit 50% adoption within 4 weeks of launch.', isHighlight: false },
  { time: '18:30', speaker: 'Emma Brooks', text: 'Sales results: Q1 ARR came in at $2.4M, which is 118% of our $2.03M target. We closed 8 new enterprise logos, including Meridian Health and Acme Corp.', isHighlight: true },
  { time: '19:05', speaker: 'Alex Kim', text: 'That\'s incredible — congratulations to the sales team. What drove the outperformance?', isHighlight: false },
  { time: '19:15', speaker: 'Emma Brooks', text: 'Three factors: the new enterprise pricing tier, shorter sales cycles from the case study content we published, and the HIPAA compliance positioning even though the feature isn\'t done yet.', isHighlight: false },
  { time: '44:20', speaker: 'Alex Kim', text: 'For Q2, our three focus areas are: one, mobile app — discovery sprint starts April 5th. Two, API v2 — James is leading scoping. Three, HIPAA compliance — legal review by April 8th.', isHighlight: true },
  { time: '51:10', speaker: 'Sofia Reyes', text: 'One last thing — David, can you make sure the recording and this recap reach everyone who couldn\'t attend? We had 48 out of 65 invited, so there\'s a significant group who missed it.', isHighlight: false },
  { time: '51:42', speaker: 'David Lee', text: 'Will do. I\'ll send it out by end of day Thursday along with the action item list.', isHighlight: false },
  { time: '51:55', speaker: 'Alex Kim', text: 'Perfect. Thanks everyone — great quarter. Let\'s make Q2 even stronger.', isHighlight: false },
];

const SPEAKERS = ['All', ...Array.from(new Set(SEGMENTS.map(s => s.speaker)))];

export default function TranscriptPage() {
  const [search, setSearch] = useState('');
  const [speaker, setSpeaker] = useState('All');
  const [highlightsOnly, setHighlightsOnly] = useState(false);

  const filtered = SEGMENTS.filter(seg =>
    (speaker === 'All' || seg.speaker === speaker) &&
    (!highlightsOnly || seg.isHighlight) &&
    (search === '' || seg.text.toLowerCase().includes(search.toLowerCase()) || seg.speaker.toLowerCase().includes(search.toLowerCase()))
  );

  const speakerColors: Record<string, string> = {
    'Alex Kim': 'text-indigo-400',
    'Sofia Reyes': 'text-violet-400',
    'James Chen': 'text-cyan-400',
    'Maya Patel': 'text-amber-400',
    'David Lee': 'text-green-400',
    'Emma Brooks': 'text-pink-400',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
        <Link href="/meetings/1/recap" className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-white font-bold">Full Transcript</h1>
          <p className="text-gray-500 text-xs flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />52 minutes</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />48 participants</span>
          </p>
        </div>
        <button className="flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-xl border border-white/10 transition-colors">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-white/5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transcript..." className="w-full bg-gray-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
        </div>
        <select value={speaker} onChange={e => setSpeaker(e.target.value)} className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
          {SPEAKERS.map(s => <option key={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={highlightsOnly} onChange={e => setHighlightsOnly(e.target.checked)} className="rounded" />
          <span className="text-gray-400 text-sm">Highlights only</span>
        </label>
        <span className="text-gray-600 text-xs ml-auto">{filtered.length} segments</span>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filtered.map((seg, i) => (
          <div key={i} className={`flex gap-4 group ${seg.isHighlight ? 'bg-indigo-500/5 -mx-2 px-2 py-2 rounded-xl' : ''}`}>
            <button className="text-gray-600 text-xs font-mono w-10 flex-shrink-0 mt-1 hover:text-indigo-400 transition-colors">
              {seg.time}
            </button>
            <div className="flex-1">
              <span className={`text-xs font-semibold ${speakerColors[seg.speaker] || 'text-gray-400'}`}>{seg.speaker}</span>
              <p className="text-gray-300 text-sm mt-0.5 leading-relaxed">
                {search ? (
                  seg.text.split(new RegExp(`(${search})`, 'gi')).map((part, j) =>
                    part.toLowerCase() === search.toLowerCase()
                      ? <mark key={j} className="bg-yellow-400/30 text-yellow-300 rounded px-0.5">{part}</mark>
                      : part
                  )
                ) : seg.text}
              </p>
            </div>
            {seg.isHighlight && <div className="w-1 bg-indigo-500 rounded-full flex-shrink-0" />}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-600">No transcript segments match your filters</div>
        )}
      </div>
    </div>
  );
}
