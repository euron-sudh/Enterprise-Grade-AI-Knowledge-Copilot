'use client';

import { CheckCircle, AlertCircle, AlertTriangle, Activity, Server, Database, Zap, Globe, Clock, RefreshCw } from 'lucide-react';

const SERVICES = [
  { name: 'API Server', status: 'healthy', latency: '12ms', uptime: '99.99%', icon: Server },
  { name: 'PostgreSQL', status: 'healthy', latency: '2ms', uptime: '100%', icon: Database },
  { name: 'Redis Cache', status: 'healthy', latency: '0.4ms', uptime: '100%', icon: Zap },
  { name: 'Pinecone Vector DB', status: 'healthy', latency: '45ms', uptime: '99.95%', icon: Database },
  { name: 'Elasticsearch', status: 'degraded', latency: '380ms', uptime: '99.8%', icon: Globe },
  { name: 'Celery Workers', status: 'healthy', latency: '—', uptime: '99.97%', icon: Activity },
  { name: 'Kafka', status: 'healthy', latency: '8ms', uptime: '99.99%', icon: Activity },
  { name: 'AWS S3', status: 'healthy', latency: '78ms', uptime: '100%', icon: Server },
  { name: 'WebSocket Server', status: 'healthy', latency: '3ms', uptime: '99.96%', icon: Globe },
  { name: 'Anthropic API', status: 'healthy', latency: '520ms', uptime: '99.9%', icon: Zap },
  { name: 'OpenAI API', status: 'healthy', latency: '610ms', uptime: '99.85%', icon: Zap },
  { name: 'Deepgram STT', status: 'healthy', latency: '210ms', uptime: '99.92%', icon: Activity },
];

const METRICS = [
  { label: 'CPU Usage', value: 34, unit: '%', color: 'bg-green-500' },
  { label: 'Memory', value: 62, unit: '%', color: 'bg-indigo-500' },
  { label: 'Disk I/O', value: 18, unit: '%', color: 'bg-violet-500' },
  { label: 'Network', value: 45, unit: '%', color: 'bg-cyan-500' },
];

const statusConfig = {
  healthy: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Healthy' },
  degraded: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Degraded' },
  down: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Down' },
};

export default function SystemHealthPage() {
  const healthyCount = SERVICES.filter(s => s.status === 'healthy').length;
  const degradedCount = SERVICES.filter(s => s.status === 'degraded').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time status of all platform services and infrastructure</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-xl border border-white/10 transition-colors text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Overall status banner */}
      <div className={`border rounded-2xl p-5 flex items-center gap-4 ${degradedCount === 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
        {degradedCount === 0
          ? <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
          : <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />
        }
        <div>
          <h3 className={`font-bold text-lg ${degradedCount === 0 ? 'text-green-400' : 'text-amber-400'}`}>
            {degradedCount === 0 ? 'All Systems Operational' : `${degradedCount} Service${degradedCount > 1 ? 's' : ''} Degraded`}
          </h3>
          <p className="text-gray-400 text-sm">{healthyCount}/{SERVICES.length} services healthy · Last checked just now</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {METRICS.map(m => (
          <div key={m.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">{m.label}</span>
              <span className="text-white font-bold">{m.value}{m.unit}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICES.map(svc => {
          const cfg = statusConfig[svc.status as keyof typeof statusConfig];
          const Icon = cfg.icon;
          const SvcIcon = svc.icon;
          return (
            <div key={svc.name} className="bg-gray-900 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                    <SvcIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-white font-medium text-sm">{svc.name}</span>
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                  <Icon className="w-3 h-3" /> {cfg.label}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-gray-600 text-xs">Latency</div>
                  <div className="text-white text-sm font-medium">{svc.latency}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-xs">Uptime (30d)</div>
                  <div className="text-green-400 text-sm font-medium">{svc.uptime}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent incidents */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Recent Incidents</h3>
        <div className="space-y-3">
          {[
            { title: 'Elasticsearch latency spike', time: '2 hours ago', status: 'ongoing', desc: 'Response times elevated (350ms vs 50ms target). Investigating shard rebalancing.' },
            { title: 'Celery queue backlog', time: '3 days ago', status: 'resolved', desc: 'Document ingestion queue backed up for 45 minutes. Scaled workers, resolved.' },
            { title: 'Pinecone API timeout', time: '1 week ago', status: 'resolved', desc: 'Vector search timeouts for 12 minutes. Upstream provider incident. Resolved by Pinecone.' },
          ].map(inc => (
            <div key={inc.title} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-xl">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${inc.status === 'ongoing' ? 'bg-amber-400' : 'bg-green-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">{inc.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${inc.status === 'ongoing' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>{inc.status}</span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{inc.desc}</p>
              </div>
              <span className="text-gray-600 text-xs whitespace-nowrap flex items-center gap-1"><Clock className="w-3 h-3" />{inc.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
