import { Check, Clock, Zap, Circle } from 'lucide-react';

const quarters = [
  {
    label: 'Q1 2026',
    status: 'completed',
    items: [
      { title: 'Gemini 2.0 Flash video analysis', done: true },
      { title: 'Multi-model API key management', done: true },
      { title: 'Google & Microsoft OAuth', done: true },
      { title: 'JWT auto-refresh (30-day sessions)', done: true },
      { title: 'Research Agent with live web search', done: true },
      { title: 'File & image attachments in all agents', done: true },
      { title: 'Workflow automation builder redesign', done: true },
    ],
  },
  {
    label: 'Q2 2026',
    status: 'in-progress',
    items: [
      { title: 'SAML 2.0 / OIDC SSO', done: false, inProgress: true },
      { title: 'Real-time meeting transcription with speaker labels', done: false, inProgress: true },
      { title: 'Document-level permissions (ABAC)', done: false },
      { title: 'Knowledge graph visualization', done: false },
      { title: 'Custom AI model configuration per org', done: false },
      { title: 'Slack & Teams notifications', done: false },
      { title: 'Advanced analytics with custom reports', done: false },
      { title: 'Bulk document import via API', done: false },
    ],
  },
  {
    label: 'Q3 2026',
    status: 'planned',
    items: [
      { title: 'Mobile app (iOS + Android)', done: false },
      { title: 'Collaborative document editing with AI assist', done: false },
      { title: 'Web crawler for public knowledge sources', done: false },
      { title: 'On-premise deployment option', done: false },
      { title: 'Stripe billing & subscription management', done: false },
      { title: 'SOC 2 Type II audit (public report)', done: false },
      { title: 'Multi-language UI (10+ languages)', done: false },
    ],
  },
  {
    label: 'Q4 2026',
    status: 'planned',
    items: [
      { title: 'Voice biometric authentication', done: false },
      { title: 'AI-generated meeting briefings', done: false },
      { title: 'Pinecone vector database integration', done: false },
      { title: 'Kafka event streaming for connectors', done: false },
      { title: 'GraphQL API', done: false },
      { title: 'AWS Bedrock model support', done: false },
      { title: 'eDiscovery & legal hold support', done: false },
    ],
  },
];

const statusConfig = {
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'in-progress': { label: 'In Progress', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  planned: { label: 'Planned', color: 'bg-gray-700/50 text-gray-400 border-gray-600/30' },
};

export default function RoadmapPage() {
  return (
    <div className="bg-gray-950 text-white">
      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-6">
          <Zap className="w-4 h-4 text-indigo-400" />
          <span className="text-indigo-300 text-sm font-medium">What's coming</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Product Roadmap</h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-6">
          Our public roadmap. We ship every week — here's what we're focused on in 2026.
        </p>
        <p className="text-gray-500 text-sm">
          Last updated: March 26, 2026 · Have a feature request?{' '}
          <a href="mailto:feedback@knowledgeforge.ai" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Let us know →
          </a>
        </p>
      </section>

      {/* Legend */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          {Object.entries(statusConfig).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${val.color}`}>{val.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quarters */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {quarters.map((quarter) => {
            const sc = statusConfig[quarter.status as keyof typeof statusConfig];
            return (
              <div key={quarter.label} className="bg-gray-900 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-white font-extrabold text-xl">{quarter.label}</h2>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>
                <ul className="space-y-3">
                  {quarter.items.map((item) => (
                    <li key={item.title} className="flex items-center gap-3">
                      {item.done ? (
                        <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-green-400" />
                        </div>
                      ) : (item as any).inProgress ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-3 h-3 text-indigo-400" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
                          <Circle className="w-2.5 h-2.5 text-gray-600" />
                        </div>
                      )}
                      <span className={`text-sm ${item.done ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                        {item.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature request CTA */}
      <section className="border-t border-white/5 py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold mb-4">Missing something?</h2>
          <p className="text-gray-400 mb-6">
            Feature requests from customers directly shape our roadmap. Tell us what would make
            KnowledgeForge a must-have for your team.
          </p>
          <a
            href="mailto:feedback@knowledgeforge.ai"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition-all"
          >
            Submit a feature request →
          </a>
        </div>
      </section>
    </div>
  );
}
