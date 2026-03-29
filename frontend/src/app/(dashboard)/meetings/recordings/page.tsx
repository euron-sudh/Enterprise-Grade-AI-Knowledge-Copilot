'use client';

import { useState } from 'react';
import { Play, Download, Search, Clock, Users, Calendar, Mic, MoreHorizontal, FileText } from 'lucide-react';

const RECORDINGS = [
  { id: '1', title: 'Q1 Engineering All-Hands', date: 'Mar 25, 2026', duration: '1h 12m', participants: 48, size: '1.2 GB', hasTranscript: true, hasRecap: true, thumbnail: '🏗️' },
  { id: '2', title: 'Product Roadmap Review', date: 'Mar 24, 2026', duration: '45m', participants: 12, size: '680 MB', hasTranscript: true, hasRecap: true, thumbnail: '🗺️' },
  { id: '3', title: 'Design System Sync', date: 'Mar 22, 2026', duration: '28m', participants: 6, size: '390 MB', hasTranscript: true, hasRecap: false, thumbnail: '🎨' },
  { id: '4', title: 'Customer Onboarding — Acme Corp', date: 'Mar 20, 2026', duration: '1h 3m', participants: 8, size: '890 MB', hasTranscript: true, hasRecap: true, thumbnail: '🤝' },
  { id: '5', title: 'Weekly Sales Standup', date: 'Mar 17, 2026', duration: '18m', participants: 9, size: '220 MB', hasTranscript: false, hasRecap: false, thumbnail: '📊' },
  { id: '6', title: 'Infrastructure Migration Planning', date: 'Mar 15, 2026', duration: '52m', participants: 5, size: '720 MB', hasTranscript: true, hasRecap: true, thumbnail: '☁️' },
];

export default function RecordingsPage() {
  const [search, setSearch] = useState('');
  const filtered = RECORDINGS.filter(r => search === '' || r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Meeting Recordings</h1>
          <p className="text-gray-400 text-sm mt-1">Browse and search through your recorded meetings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Recordings', value: RECORDINGS.length.toString(), color: 'text-white' },
          { label: 'Total Duration', value: '4h 58m', color: 'text-indigo-400' },
          { label: 'Storage Used', value: '4.1 GB', color: 'text-violet-400' },
          { label: 'With Transcripts', value: RECORDINGS.filter(r => r.hasTranscript).length.toString(), color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recordings..." className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(rec => (
          <div key={rec.id} className="bg-gray-900 border border-white/5 hover:border-white/15 rounded-2xl overflow-hidden transition-colors group">
            {/* Thumbnail */}
            <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
              <span className="text-5xl">{rec.thumbnail}</span>
              <button className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-5 h-5 text-white ml-0.5" />
                </div>
              </button>
              <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md">{rec.duration}</span>
            </div>
            {/* Info */}
            <div className="p-4">
              <h3 className="text-white font-semibold text-sm truncate">{rec.title}</h3>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-gray-500 text-xs flex items-center gap-1"><Calendar className="w-3 h-3" />{rec.date}</span>
                <span className="text-gray-500 text-xs flex items-center gap-1"><Users className="w-3 h-3" />{rec.participants}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {rec.hasTranscript && (
                  <button className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-2.5 py-1 rounded-lg transition-colors">
                    <Mic className="w-3 h-3" /> Transcript
                  </button>
                )}
                {rec.hasRecap && (
                  <button className="flex items-center gap-1 text-xs bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 px-2.5 py-1 rounded-lg transition-colors">
                    <FileText className="w-3 h-3" /> Recap
                  </button>
                )}
                <div className="flex-1" />
                <button className="p-1 text-gray-500 hover:text-white transition-colors"><Download className="w-3.5 h-3.5" /></button>
                <button className="p-1 text-gray-500 hover:text-white transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
