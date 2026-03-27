'use client';

import { useState } from 'react';
import { Globe, Plus, Play, Pause, Trash2, RefreshCw, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';

const CRAWLERS = [
  { id: '1', name: 'Company Docs Site', url: 'https://docs.company.com', status: 'active', pages: 342, lastRun: '1 hour ago', nextRun: 'In 23 hours', frequency: 'Daily', depth: 3, color: 'from-blue-500 to-cyan-600' },
  { id: '2', name: 'Engineering Blog', url: 'https://blog.company.com/engineering', status: 'active', pages: 87, lastRun: '2 days ago', nextRun: 'In 5 days', frequency: 'Weekly', depth: 2, color: 'from-indigo-500 to-violet-600' },
  { id: '3', name: 'Support KB', url: 'https://support.company.com/kb', status: 'paused', pages: 215, lastRun: '1 week ago', nextRun: 'Paused', frequency: 'Weekly', depth: 4, color: 'from-amber-500 to-orange-600' },
  { id: '4', name: 'Product Changelog', url: 'https://company.com/changelog', status: 'error', pages: 0, lastRun: '3 days ago', nextRun: 'Retry pending', frequency: 'Daily', depth: 1, color: 'from-red-500 to-rose-600' },
];

const statusConfig = {
  active: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Active' },
  paused: { icon: Pause, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Paused' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Error' },
  running: { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Running' },
};

export default function CrawlersPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Web Crawlers</h1>
          <p className="text-gray-400 text-sm mt-1">Automatically crawl and index web content into your knowledge base</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
          <Plus className="w-4 h-4" /> New Crawler
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Crawlers', value: CRAWLERS.length.toString(), color: 'text-white' },
          { label: 'Active', value: CRAWLERS.filter(c => c.status === 'active').length.toString(), color: 'text-green-400' },
          { label: 'Pages Indexed', value: CRAWLERS.reduce((a, c) => a + c.pages, 0).toLocaleString(), color: 'text-indigo-400' },
          { label: 'Errors', value: CRAWLERS.filter(c => c.status === 'error').length.toString(), color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {CRAWLERS.map(crawler => {
          const cfg = statusConfig[crawler.status as keyof typeof statusConfig];
          const StatusIcon = cfg.icon;
          return (
            <div key={crawler.id} className="bg-gray-900 border border-white/5 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${crawler.color} flex items-center justify-center flex-shrink-0`}>
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{crawler.name}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                      <StatusIcon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm font-mono mt-0.5 truncate">{crawler.url}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-gray-600 text-xs">Pages: <span className="text-gray-400">{crawler.pages.toLocaleString()}</span></span>
                    <span className="text-gray-600 text-xs">Depth: <span className="text-gray-400">{crawler.depth}</span></span>
                    <span className="text-gray-600 text-xs">Freq: <span className="text-gray-400">{crawler.frequency}</span></span>
                    <span className="text-gray-600 text-xs">Last: <span className="text-gray-400">{crawler.lastRun}</span></span>
                    <span className="text-gray-600 text-xs">Next: <span className="text-gray-400">{crawler.nextRun}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Run now">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title={crawler.status === 'paused' ? 'Resume' : 'Pause'}>
                    {crawler.status === 'paused' ? <RefreshCw className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">New Web Crawler</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Crawler Name</label>
                <input type="text" placeholder="e.g. Company Help Center" className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Start URL</label>
                <input type="url" placeholder="https://docs.example.com" className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Crawl Depth</label>
                  <select className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                    {['1', '2', '3', '4', '5'].map(d => <option key={d}>{d} level{d !== '1' ? 's' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Frequency</label>
                  <select className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                    {['Once', 'Hourly', 'Daily', 'Weekly', 'Monthly'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
                <button onClick={() => setShowCreate(false)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">Create & Run</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
