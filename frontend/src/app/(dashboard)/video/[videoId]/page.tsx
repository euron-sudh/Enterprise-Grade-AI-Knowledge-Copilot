'use client';

import { useState } from 'react';
import { Play, Pause, Volume2, Maximize2, Download, BookOpen, MessageSquare, Clock, ChevronRight, Share2, MoreHorizontal } from 'lucide-react';

const CHAPTERS = [
  { id: 1, title: 'Introduction & Agenda', start: '0:00', end: '3:42', summary: 'Overview of Q1 OKR review format and participants.' },
  { id: 2, title: 'Engineering OKR Review', start: '3:42', end: '18:30', summary: 'Backend performance: 99.8% uptime achieved. Frontend redesign shipped 2 weeks ahead.' },
  { id: 3, title: 'Product & Design Update', start: '18:30', end: '31:15', summary: 'Launched voice assistant beta. 3 features deferred to Q2.' },
  { id: 4, title: 'Sales & Revenue', start: '31:15', end: '44:20', summary: 'Q1 ARR: $2.4M (118% of target). 8 new enterprise logos.' },
  { id: 5, title: 'Q2 Planning', start: '44:20', end: '52:00', summary: 'Key themes: mobile app, API v2, and HIPAA compliance.' },
];

const TRANSCRIPT = [
  { time: '0:04', speaker: 'Alex Kim', text: 'Good morning everyone. Welcome to our Q1 OKR review. Today we\'ll cover results across all four pillars.' },
  { time: '0:28', speaker: 'Sofia Reyes', text: 'Before we dive in, I want to flag that we have a hard stop at 10 AM so let\'s keep each section to 12 minutes.' },
  { time: '0:45', speaker: 'James Chen', text: 'Engineering update — we hit 99.8% uptime this quarter, exceeding our 99.5% target. The new circuit breaker implementation really paid off.' },
  { time: '1:12', speaker: 'Maya Patel', text: 'The frontend redesign shipped 2 weeks ahead of schedule. User satisfaction scores went from 3.8 to 4.5 out of 5.' },
];

export default function VideoPlayerPage() {
  const [playing, setPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'chapters' | 'transcript' | 'qa'>('chapters');
  const [question, setQuestion] = useState('');

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden">
      {/* Video player column */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Video */}
        <div className="relative bg-black aspect-video">
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="text-center">
              <span className="text-6xl">🎬</span>
              <p className="text-gray-500 text-sm mt-2">Q1 2026 OKR Review</p>
            </div>
          </div>
          {/* Controls overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="h-1 bg-gray-600 rounded-full mb-3 cursor-pointer">
              <div className="h-full w-1/3 bg-indigo-500 rounded-full" />
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setPlaying(!playing)} className="text-white hover:text-indigo-300 transition-colors">
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <span className="text-white text-sm font-mono">17:22 / 52:00</span>
              <div className="flex-1" />
              <Volume2 className="w-4 h-4 text-gray-400" />
              <Download className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white transition-colors" />
              <Share2 className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white transition-colors" />
              <Maximize2 className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        {/* Video info */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-white font-bold text-lg">Q1 2026 OKR Review — All Hands</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-gray-500 text-sm flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 52:00</span>
                <span className="text-gray-500 text-sm">Mar 25, 2026</span>
                <span className="text-gray-500 text-sm">48 participants</span>
              </div>
            </div>
            <button className="text-gray-500 hover:text-white transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
          </div>
        </div>

        {/* AI Q&A box */}
        <div className="p-5 bg-indigo-500/5 border-b border-white/5">
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-indigo-400" /> Ask about this video</h3>
          <div className="flex gap-2">
            <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="What were the Q1 revenue results?" className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-1">Ask <ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Side panel */}
      <div className="w-full lg:w-96 border-l border-white/5 flex flex-col bg-gray-950/30">
        <div className="flex gap-1 p-3 border-b border-white/5">
          {[['chapters', 'Chapters'], ['transcript', 'Transcript'], ['qa', 'Notes']].map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>{label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'chapters' && (
            <div className="space-y-2">
              {CHAPTERS.map(ch => (
                <button key={ch.id} className="w-full text-left p-3 rounded-xl hover:bg-gray-800/50 transition-colors group border border-transparent hover:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-400 text-xs font-mono">{ch.start}</span>
                    <span className="text-white text-sm font-medium flex-1 truncate">{ch.title}</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">{ch.summary}</p>
                </button>
              ))}
            </div>
          )}
          {activeTab === 'transcript' && (
            <div className="space-y-3">
              {TRANSCRIPT.map((seg, i) => (
                <div key={i} className="flex gap-2">
                  <button className="text-indigo-400 text-xs font-mono flex-shrink-0 mt-0.5 hover:text-indigo-300">{seg.time}</button>
                  <div>
                    <span className="text-gray-400 text-xs font-medium">{seg.speaker}: </span>
                    <span className="text-gray-300 text-sm">{seg.text}</span>
                  </div>
                </div>
              ))}
              <p className="text-gray-600 text-xs text-center py-4">Full transcript — 52 minutes</p>
            </div>
          )}
          {activeTab === 'qa' && (
            <div className="space-y-3">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                <p className="text-gray-400 text-xs font-medium mb-1">AI Summary</p>
                <p className="text-gray-300 text-sm">Q1 OKR review shows strong performance: Engineering hit 99.8% uptime, product shipped ahead of schedule, and Sales hit 118% of ARR target ($2.4M). Q2 focus areas: mobile app, API v2, HIPAA.</p>
              </div>
              <div className="bg-gray-900 border border-white/5 rounded-xl p-3">
                <p className="text-gray-400 text-xs font-medium mb-2">Key Action Items</p>
                <ul className="space-y-1.5">
                  {['James to lead API v2 scoping (due Apr 15)', 'Maya to kick off mobile app discovery sprint', 'Legal to review HIPAA requirements'].map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-gray-300"><span className="text-indigo-400 mt-0.5">→</span>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
