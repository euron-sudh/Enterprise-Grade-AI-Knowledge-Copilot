'use client';

import { TrendingUp, MessageSquare, Users, Zap, Download } from 'lucide-react';

const DAILY = [
  { day: 'Mon', queries: 1240, users: 38 },
  { day: 'Tue', queries: 1890, users: 44 },
  { day: 'Wed', queries: 2100, users: 51 },
  { day: 'Thu', queries: 1750, users: 47 },
  { day: 'Fri', queries: 2340, users: 55 },
  { day: 'Sat', queries: 820, users: 22 },
  { day: 'Sun', queries: 640, users: 18 },
];

const maxQ = Math.max(...DAILY.map(d => d.queries));

const TOP_USERS = [
  { name: 'James Chen', email: 'james@company.com', queries: 284, avatar: 'JC', color: 'from-pink-500 to-rose-600' },
  { name: 'Maya Patel', email: 'maya@company.com', queries: 231, avatar: 'MP', color: 'from-amber-500 to-orange-600' },
  { name: 'Sofia Reyes', email: 'sofia@company.com', queries: 198, avatar: 'SR', color: 'from-violet-500 to-purple-600' },
  { name: 'David Lee', email: 'david@company.com', queries: 167, avatar: 'DL', color: 'from-teal-500 to-emerald-600' },
  { name: 'Emma Brooks', email: 'emma@company.com', queries: 142, avatar: 'EB', color: 'from-cyan-500 to-blue-600' },
];

const FEATURE_USAGE = [
  { feature: 'AI Chat', pct: 68, color: 'bg-indigo-500' },
  { feature: 'Knowledge Search', pct: 54, color: 'bg-violet-500' },
  { feature: 'Document Upload', pct: 32, color: 'bg-blue-500' },
  { feature: 'Voice Assistant', pct: 18, color: 'bg-cyan-500' },
  { feature: 'AI Agents', pct: 12, color: 'bg-green-500' },
  { feature: 'Workflows', pct: 8, color: 'bg-amber-500' },
];

export default function UsagePage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usage Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Track platform usage, active users, and feature adoption</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
            {['Last 7 days', 'Last 30 days', 'Last 90 days', 'This year'].map(o => <option key={o}>{o}</option>)}
          </select>
          <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-xl border border-white/10 transition-colors text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Queries', value: '10,780', change: '+14%', icon: MessageSquare, color: 'text-indigo-400' },
          { label: 'Active Users', value: '43', change: '+3', icon: Users, color: 'text-green-400' },
          { label: 'Avg Queries/User', value: '251', change: '+8%', icon: TrendingUp, color: 'text-violet-400' },
          { label: 'Tokens Used', value: '2.4M', change: '+12%', icon: Zap, color: 'text-amber-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span className="text-green-400 text-xs font-medium">{kpi.change}</span>
            </div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="text-gray-500 text-xs mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-5">Daily Query Volume</h3>
        <div className="flex items-end gap-3 h-40">
          {DAILY.map(d => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-gray-600 text-xs">{d.queries.toLocaleString()}</span>
              <div
                className="w-full bg-indigo-500/30 hover:bg-indigo-500/50 rounded-t-lg transition-colors cursor-pointer relative group"
                style={{ height: `${(d.queries / maxQ) * 100}%` }}
              >
                <div className="w-full bg-indigo-500 rounded-t-lg" style={{ height: '40%', position: 'absolute', bottom: 0 }} />
              </div>
              <span className="text-gray-500 text-xs">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top users */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Top Users (this week)</h3>
          <div className="space-y-3">
            {TOP_USERS.map((user, i) => (
              <div key={user.email} className="flex items-center gap-3">
                <span className="text-gray-600 text-sm w-5 text-right">{i + 1}</span>
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${user.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{user.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{user.name}</div>
                  <div className="h-1 bg-gray-800 rounded-full mt-1">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(user.queries / TOP_USERS[0].queries) * 100}%` }} />
                  </div>
                </div>
                <span className="text-gray-400 text-sm font-medium flex-shrink-0">{user.queries}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature adoption */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Feature Adoption</h3>
          <div className="space-y-4">
            {FEATURE_USAGE.map(f => (
              <div key={f.feature}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-gray-400 text-sm">{f.feature}</span>
                  <span className="text-white text-sm font-medium">{f.pct}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${f.color} rounded-full`} style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
