'use client';

import { CreditCard, TrendingUp, Users, Zap, Download, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

const INVOICES = [
  { id: 'INV-2026-03', date: 'Mar 1, 2026', amount: '$1,247.00', status: 'Paid', period: 'Mar 2026' },
  { id: 'INV-2026-02', date: 'Feb 1, 2026', amount: '$1,183.00', status: 'Paid', period: 'Feb 2026' },
  { id: 'INV-2026-01', date: 'Jan 1, 2026', amount: '$1,102.00', status: 'Paid', period: 'Jan 2026' },
  { id: 'INV-2025-12', date: 'Dec 1, 2025', amount: '$998.00', status: 'Paid', period: 'Dec 2025' },
  { id: 'INV-2025-11', date: 'Nov 1, 2025', amount: '$875.00', status: 'Paid', period: 'Nov 2025' },
];

const USAGE = [
  { label: 'AI Queries', used: 38_420, limit: 50_000, unit: '' },
  { label: 'Storage', used: 67, limit: 100, unit: 'GB' },
  { label: 'Team Members', used: 47, limit: 100, unit: '' },
  { label: 'Connectors', used: 8, limit: 'Unlimited', unit: '' },
];

export default function BillingPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Subscription</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your plan, usage, and payment details</p>
      </div>

      {/* Current plan */}
      <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-indigo-400 font-bold text-xl">Professional Plan</span>
              <span className="bg-green-500/20 text-green-400 text-xs px-2.5 py-0.5 rounded-full font-medium">Active</span>
            </div>
            <p className="text-gray-400 text-sm">50,000 queries/month · 100GB storage · 100 users · All connectors</p>
            <p className="text-gray-500 text-xs mt-2">Next billing date: <span className="text-gray-400">April 1, 2026</span></p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">$1,299<span className="text-lg text-gray-400 font-normal">/mo</span></div>
            <button className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Upgrade to Enterprise →</button>
          </div>
        </div>
      </div>

      {/* Usage meters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {USAGE.map(u => {
          const pct = typeof u.limit === 'number' ? Math.round((u.used / u.limit) * 100) : 0;
          const isHigh = pct > 80;
          return (
            <div key={u.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">{u.label}</span>
                <span className={`text-sm font-semibold ${isHigh ? 'text-amber-400' : 'text-white'}`}>
                  {u.used.toLocaleString()}{u.unit} {typeof u.limit === 'number' ? `/ ${u.limit.toLocaleString()}${u.unit}` : `/ ${u.limit}`}
                </span>
              </div>
              {typeof u.limit === 'number' && (
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isHigh ? 'bg-amber-500' : 'bg-indigo-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              {typeof u.limit === 'string' && (
                <div className="h-2 bg-green-500/20 rounded-full flex items-center px-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment method */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Payment Method</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <div className="text-white text-sm font-medium">Visa ending in 4242</div>
              <div className="text-gray-500 text-xs">Expires 12/2028</div>
            </div>
          </div>
          <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
            Update <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Invoice history */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-white font-semibold">Invoice History</h3>
          <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <Download className="w-3.5 h-3.5" /> Export All
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Period</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {INVOICES.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-5 py-3 text-white text-sm font-medium">{inv.id}</td>
                <td className="px-5 py-3 text-gray-400 text-sm hidden sm:table-cell">{inv.period}</td>
                <td className="px-5 py-3 text-gray-400 text-sm hidden md:table-cell">{inv.date}</td>
                <td className="px-5 py-3 text-white text-sm font-semibold">{inv.amount}</td>
                <td className="px-5 py-3">
                  <span className="text-xs bg-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full font-medium">{inv.status}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 ml-auto">
                    <Download className="w-3 h-3" /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Plan comparison */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: 'Starter', price: '$99', queries: '5,000', storage: '5GB', users: '10', current: false },
            { name: 'Professional', price: '$1,299', queries: '50,000', storage: '100GB', users: '100', current: true },
            { name: 'Enterprise', price: 'Custom', queries: 'Unlimited', storage: 'Unlimited', users: 'Unlimited', current: false },
          ].map(plan => (
            <div key={plan.name} className={`rounded-xl p-4 border ${plan.current ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-gray-800/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">{plan.name}</span>
                {plan.current && <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">Current</span>}
              </div>
              <div className="text-2xl font-bold text-white mb-3">{plan.price}<span className="text-sm text-gray-400 font-normal">{plan.price !== 'Custom' ? '/mo' : ''}</span></div>
              <ul className="space-y-1.5 text-sm text-gray-400">
                <li>{plan.queries} queries/mo</li>
                <li>{plan.storage} storage</li>
                <li>{plan.users} users</li>
              </ul>
              {!plan.current && (
                <button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                  {plan.name === 'Enterprise' ? 'Contact Sales' : 'Switch Plan'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
