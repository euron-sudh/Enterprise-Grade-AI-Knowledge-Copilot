'use client';

import { Shield, CheckCircle, AlertCircle, Clock, Download, ExternalLink } from 'lucide-react';

const FRAMEWORKS = [
  { name: 'SOC 2 Type II', status: 'compliant', lastAudit: 'Jan 15, 2026', nextAudit: 'Jul 15, 2026', score: 98, color: 'from-green-500 to-emerald-600' },
  { name: 'GDPR', status: 'compliant', lastAudit: 'Feb 1, 2026', nextAudit: 'Aug 1, 2026', score: 95, color: 'from-blue-500 to-indigo-600' },
  { name: 'HIPAA', status: 'in_progress', lastAudit: 'Never', nextAudit: 'Jun 1, 2026', score: 72, color: 'from-amber-500 to-orange-600' },
  { name: 'ISO 27001', status: 'compliant', lastAudit: 'Dec 10, 2025', nextAudit: 'Dec 10, 2026', score: 91, color: 'from-violet-500 to-purple-600' },
  { name: 'CCPA', status: 'compliant', lastAudit: 'Jan 28, 2026', nextAudit: 'Jul 28, 2026', score: 97, color: 'from-cyan-500 to-blue-600' },
  { name: 'CSA STAR', status: 'pending', lastAudit: 'Never', nextAudit: 'Sep 1, 2026', score: 45, color: 'from-gray-500 to-slate-600' },
];

const CONTROLS = [
  { category: 'Access Control', total: 24, passed: 24, failed: 0 },
  { category: 'Data Encryption', total: 12, passed: 12, failed: 0 },
  { category: 'Audit Logging', total: 18, passed: 17, failed: 1 },
  { category: 'Incident Response', total: 8, passed: 7, failed: 1 },
  { category: 'Business Continuity', total: 10, passed: 10, failed: 0 },
  { category: 'Vendor Management', total: 6, passed: 5, failed: 1 },
];

const statusConfig = {
  compliant: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Compliant' },
  in_progress: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'In Progress' },
  pending: { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Pending' },
};

export default function CompliancePage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Monitor compliance status across regulatory frameworks and standards</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-xl border border-white/10 transition-colors text-sm">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Framework cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FRAMEWORKS.map(fw => {
          const cfg = statusConfig[fw.status as keyof typeof statusConfig];
          const Icon = cfg.icon;
          return (
            <div key={fw.name} className="bg-gray-900 border border-white/5 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${fw.color} flex items-center justify-center`}>
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                  <Icon className="w-3 h-3" /> {cfg.label}
                </span>
              </div>
              <h3 className="text-white font-bold">{fw.name}</h3>
              <div className="mt-3 mb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Compliance Score</span>
                  <span className={fw.score >= 90 ? 'text-green-400' : fw.score >= 70 ? 'text-amber-400' : 'text-red-400'}>{fw.score}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${fw.score >= 90 ? 'bg-green-500' : fw.score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${fw.score}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 mt-3">
                <span>Last: {fw.lastAudit}</span>
                <span>Next: {fw.nextAudit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Control checks */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Control Summary</h3>
        <div className="space-y-3">
          {CONTROLS.map(ctrl => {
            const pct = Math.round((ctrl.passed / ctrl.total) * 100);
            return (
              <div key={ctrl.category} className="flex items-center gap-4">
                <span className="text-gray-400 text-sm w-48 flex-shrink-0">{ctrl.category}</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${ctrl.failed === 0 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`text-sm font-medium w-16 text-right flex-shrink-0 ${ctrl.failed === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                  {ctrl.passed}/{ctrl.total}
                </span>
                {ctrl.failed > 0 && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full flex-shrink-0">{ctrl.failed} failed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Data governance quick actions */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Compliance Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: 'Data Subject Request (GDPR)', desc: 'Process right-to-access or deletion requests', action: 'Open', color: 'text-blue-400' },
            { title: 'Privacy Impact Assessment', desc: 'Review and update PIA documentation', action: 'Review', color: 'text-indigo-400' },
            { title: 'Incident Report', desc: 'File a security or data breach report', action: 'Report', color: 'text-red-400' },
            { title: 'Vendor Assessment', desc: 'Audit third-party data processors', action: 'View', color: 'text-amber-400' },
          ].map(action => (
            <div key={action.title} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
              <div>
                <div className="text-white text-sm font-medium">{action.title}</div>
                <div className="text-gray-500 text-xs mt-0.5">{action.desc}</div>
              </div>
              <button className={`text-sm font-medium ${action.color} hover:opacity-80 transition-opacity flex items-center gap-1`}>
                {action.action} <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
