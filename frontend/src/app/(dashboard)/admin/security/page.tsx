'use client';

import { useState } from 'react';
import { Shield, Lock, Key, Globe, AlertTriangle, CheckCircle, ToggleLeft, ToggleRight, Eye, EyeOff } from 'lucide-react';

export default function SecurityPage() {
  const [mfaEnforced, setMfaEnforced] = useState(true);
  const [ssoOnly, setSsoOnly] = useState(false);
  const [ipAllowlist, setIpAllowlist] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('8');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Security Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Configure authentication, access controls, and security policies</p>
      </div>

      {/* Security score */}
      <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#166534" strokeWidth="8" />
              <circle cx="40" cy="40" r="34" fill="none" stroke="#22c55e" strokeWidth="8" strokeDasharray="213.6" strokeDashoffset="42.7" strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">80</span>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Security Score: Good</h3>
            <p className="text-gray-400 text-sm mt-1">Enable IP allowlisting to reach 95+</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> MFA Enforced</span>
              <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> TLS 1.3</span>
              <span className="text-amber-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> IP Allowlist Off</span>
            </div>
          </div>
        </div>
      </div>

      {/* Authentication */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5 space-y-5">
        <h3 className="text-white font-semibold flex items-center gap-2"><Lock className="w-4 h-4 text-indigo-400" /> Authentication</h3>

        {[
          { label: 'Enforce MFA for all users', desc: 'Require multi-factor authentication on every login', state: mfaEnforced, set: setMfaEnforced },
          { label: 'SSO-only login', desc: 'Disable email/password login — only allow SSO providers', state: ssoOnly, set: setSsoOnly },
          { label: 'IP Allowlisting', desc: 'Restrict access to specific IP ranges only', state: ipAllowlist, set: setIpAllowlist },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div>
              <div className="text-white text-sm font-medium">{item.label}</div>
              <div className="text-gray-500 text-xs mt-0.5">{item.desc}</div>
            </div>
            <button onClick={() => item.set(!item.state)}>
              {item.state
                ? <ToggleRight className="w-8 h-8 text-indigo-400" />
                : <ToggleLeft className="w-8 h-8 text-gray-600" />
              }
            </button>
          </div>
        ))}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Session Timeout (hours)</label>
            <select value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
              {['1', '4', '8', '24', '48', '168'].map(h => <option key={h} value={h}>{h === '168' ? '1 week' : `${h} hour${h !== '1' ? 's' : ''}`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Max Failed Login Attempts</label>
            <select className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
              {['3', '5', '10', '20'].map(n => <option key={n}>{n} attempts</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Password policy */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><Key className="w-4 h-4 text-indigo-400" /> Password Policy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Minimum Length</label>
            <select className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
              {['8', '10', '12', '16'].map(n => <option key={n}>{n} characters</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Password Expiry</label>
            <select className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
              <option>Never</option>
              <option>30 days</option>
              <option>60 days</option>
              <option>90 days</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['Uppercase letters', 'Lowercase letters', 'Numbers', 'Special characters'].map(req => (
            <label key={req} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-gray-400 text-xs">{req}</span>
            </label>
          ))}
        </div>
      </div>

      {/* IP Allowlist */}
      <div className={`bg-gray-900 border border-white/5 rounded-2xl p-5 space-y-4 ${!ipAllowlist ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="text-white font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-indigo-400" /> IP Allowlist</h3>
        <textarea
          rows={4}
          placeholder="Enter IP addresses or CIDR ranges (one per line)&#10;e.g. 192.168.1.0/24&#10;10.0.0.1"
          className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono resize-none"
        />
        <p className="text-gray-600 text-xs">Supports IPv4, IPv6, and CIDR notation. Users outside these ranges will be denied access.</p>
      </div>

      {/* Data encryption */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5 space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-400" /> Encryption</h3>
        {[
          { label: 'Data at rest', value: 'AES-256', status: 'enabled' },
          { label: 'Data in transit', value: 'TLS 1.3', status: 'enabled' },
          { label: 'Database encryption', value: 'AWS RDS encryption', status: 'enabled' },
          { label: 'Client-side encryption', value: 'Optional per document', status: 'available' },
          { label: 'Key management', value: 'AWS KMS', status: 'enabled' },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-gray-400 text-sm">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">{item.value}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'enabled' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>{item.status}</span>
            </div>
          </div>
        ))}
      </div>

      <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Save Security Settings</button>
    </div>
  );
}
