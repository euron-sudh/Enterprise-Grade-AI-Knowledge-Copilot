import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const services = [
  { name: 'API (chat, search, agents)', status: 'operational' },
  { name: 'AI Chat & Streaming (SSE)', status: 'operational' },
  { name: 'Voice Assistant', status: 'operational' },
  { name: 'Video Processing (Gemini 2.0)', status: 'operational' },
  { name: 'Knowledge Base Ingestion', status: 'operational' },
  { name: 'Enterprise Search', status: 'operational' },
  { name: 'Authentication (OAuth, SAML)', status: 'operational' },
  { name: 'WebSocket (real-time features)', status: 'operational' },
  { name: 'Workflow Automation', status: 'operational' },
  { name: 'Analytics Dashboard', status: 'operational' },
  { name: 'Admin Panel', status: 'operational' },
  { name: 'CDN & Static Assets', status: 'operational' },
];

const incidents: { date: string; title: string; severity: string; duration: string; desc: string }[] = [
  // No recent incidents
];

const uptime = [
  { label: 'Last 24 hours', value: '100%' },
  { label: 'Last 7 days', value: '100%' },
  { label: 'Last 30 days', value: '99.97%' },
  { label: 'Last 90 days', value: '99.94%' },
];

const statusConfig = {
  operational: {
    label: 'Operational',
    icon: CheckCircle2,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  degraded: {
    label: 'Degraded',
    icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  outage: {
    label: 'Outage',
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
};

const allOperational = services.every((s) => s.status === 'operational');

export default function StatusPage() {
  const now = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  return (
    <div className="bg-gray-950 text-white">
      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 mb-6 border ${
            allOperational ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20'
          }`}
        >
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${allOperational ? 'bg-green-400' : 'bg-amber-400'}`} />
          <span className={`text-sm font-semibold ${allOperational ? 'text-green-300' : 'text-amber-300'}`}>
            {allOperational ? 'All systems operational' : 'Some systems degraded'}
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          KnowledgeForge Status
        </h1>
        <p className="text-gray-500 text-sm">Last updated: {now}</p>
      </section>

      {/* Uptime */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {uptime.map((u) => (
              <div key={u.label} className="bg-gray-900 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-extrabold text-green-400 mb-1">{u.value}</div>
                <div className="text-gray-500 text-xs">{u.label}</div>
              </div>
            ))}
          </div>

          {/* Uptime bar (visual) */}
          <div className="mb-12">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>90 days ago</span>
              <span>Today</span>
            </div>
            <div className="flex gap-0.5 h-8">
              {Array.from({ length: 90 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-green-500/60 hover:bg-green-500 transition-colors cursor-default"
                  title={`Day ${90 - i}: Operational`}
                />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500/60 inline-block" /> Operational</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500/60 inline-block" /> Degraded</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500/60 inline-block" /> Outage</span>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Services</h2>
          <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            {services.map((service) => {
              const sc = statusConfig[service.status as keyof typeof statusConfig];
              return (
                <div key={service.name} className="flex items-center justify-between px-5 py-4">
                  <span className="text-gray-300 text-sm">{service.name}</span>
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${sc.color}`}>
                    <sc.icon className="w-4 h-4" />
                    {sc.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Incidents */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Past Incidents</h2>
          {incidents.length === 0 ? (
            <div className="bg-gray-900 border border-white/5 rounded-2xl p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-gray-300 font-semibold mb-1">No incidents in the past 90 days</p>
              <p className="text-gray-500 text-sm">Our systems have been running smoothly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div key={incident.title} className="bg-gray-900 border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500 text-xs">{incident.date}</span>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-gray-500 text-xs">Resolved in {incident.duration}</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">{incident.title}</h3>
                  <p className="text-gray-400 text-sm">{incident.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Subscribe */}
      <section className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8 bg-gray-900/30">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl font-bold mb-3">Get incident notifications</h2>
          <p className="text-gray-400 text-sm mb-5">
            Subscribe to be notified immediately when an incident occurs.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="you@company.com"
              className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
