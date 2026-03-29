'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Building2, Phone, CheckCircle2 } from 'lucide-react';

const reasons = [
  { value: 'sales', label: 'Talk to Sales' },
  { value: 'support', label: 'Technical Support' },
  { value: 'enterprise', label: 'Enterprise Inquiry' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'press', label: 'Press & Media' },
  { value: 'other', label: 'Other' },
];

const offices = [
  {
    city: 'San Francisco',
    address: '340 Pine Street, Suite 800\nSan Francisco, CA 94104',
    email: 'hello@knowledgeforge.ai',
    phone: '+1 (415) 555-0192',
    flag: '🇺🇸',
  },
  {
    city: 'New York',
    address: '350 Fifth Avenue, 59th Floor\nNew York, NY 10118',
    email: 'nyc@knowledgeforge.ai',
    phone: '+1 (212) 555-0134',
    flag: '🇺🇸',
  },
  {
    city: 'London',
    address: '30 St Mary Axe\nLondon EC3A 8EP',
    email: 'london@knowledgeforge.ai',
    phone: '+44 20 7946 0958',
    flag: '🇬🇧',
  },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    reason: 'sales',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="bg-gray-950 text-white">
      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-6">
          <span className="text-indigo-300 text-sm font-medium">Get in touch</span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-4">
          We'd love to hear from you.
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto">
          Tell us about your team and we'll find the right solution for you.
        </p>
      </section>

      {/* Form + Info */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Form */}
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-8">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-white font-bold text-2xl">Message sent!</h3>
                <p className="text-gray-400">
                  Thanks for reaching out. Our team will get back to you within one business day.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-xl font-bold mb-6">Send us a message</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Full name</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Alex Kim"
                      className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Work email</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="alex@company.com"
                      className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Company</label>
                  <input
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="Acme Corp"
                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">How can we help?</label>
                  <select
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {reasons.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Message</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    required
                    placeholder="Tell us about your team size, current challenges, and what you're hoping to achieve with KnowledgeForge..."
                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? 'Sending...' : 'Send message'}
                </button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Talk to our team</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Whether you're evaluating KnowledgeForge for the first time or ready to roll it
                out to your entire organization, we're here to help.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gray-900 border border-white/5 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm mb-1">Sales</div>
                  <p className="text-gray-400 text-sm">Get a personalized demo and pricing quote for your team.</p>
                  <a href="mailto:sales@knowledgeforge.ai" className="text-indigo-400 hover:text-indigo-300 text-sm mt-1 block transition-colors">
                    sales@knowledgeforge.ai
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-900 border border-white/5 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm mb-1">Support</div>
                  <p className="text-gray-400 text-sm">Technical help for existing customers. Response within 4 hours.</p>
                  <a href="mailto:support@knowledgeforge.ai" className="text-indigo-400 hover:text-indigo-300 text-sm mt-1 block transition-colors">
                    support@knowledgeforge.ai
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-900 border border-white/5 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm mb-1">Enterprise</div>
                  <p className="text-gray-400 text-sm">Custom contracts, SSO, compliance, and dedicated support.</p>
                  <a href="mailto:enterprise@knowledgeforge.ai" className="text-indigo-400 hover:text-indigo-300 text-sm mt-1 block transition-colors">
                    enterprise@knowledgeforge.ai
                  </a>
                </div>
              </div>
            </div>

            {/* Offices */}
            <div>
              <h3 className="text-white font-semibold mb-4">Our offices</h3>
              <div className="space-y-4">
                {offices.map((office) => (
                  <div key={office.city} className="p-4 bg-gray-900 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span>{office.flag}</span>
                      <span className="text-white font-semibold text-sm">{office.city}</span>
                    </div>
                    <p className="text-gray-500 text-xs whitespace-pre-line mb-2">{office.address}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <a href={`mailto:${office.email}`} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                        <Mail className="w-3 h-3" /> {office.email}
                      </a>
                      <a href={`tel:${office.phone}`} className="text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors">
                        <Phone className="w-3 h-3" /> {office.phone}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
