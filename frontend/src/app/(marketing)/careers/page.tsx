import Link from 'next/link';
import { ArrowRight, Globe, Zap, Heart } from 'lucide-react';

const openings = [
  {
    dept: 'Engineering',
    color: 'bg-cyan-500/20 text-cyan-400',
    roles: [
      { title: 'Senior Backend Engineer (AI Infrastructure)', location: 'San Francisco / Remote', type: 'Full-time' },
      { title: 'Senior Frontend Engineer (Next.js)', location: 'San Francisco / Remote', type: 'Full-time' },
      { title: 'ML Engineer (RAG & Embeddings)', location: 'San Francisco / Remote', type: 'Full-time' },
      { title: 'Staff Engineer (Platform)', location: 'San Francisco', type: 'Full-time' },
    ],
  },
  {
    dept: 'Product',
    color: 'bg-indigo-500/20 text-indigo-400',
    roles: [
      { title: 'Product Manager (Enterprise)', location: 'San Francisco / Remote', type: 'Full-time' },
      { title: 'Product Designer (UX)', location: 'Remote', type: 'Full-time' },
    ],
  },
  {
    dept: 'Sales & Customer Success',
    color: 'bg-green-500/20 text-green-400',
    roles: [
      { title: 'Enterprise Account Executive', location: 'New York / Remote', type: 'Full-time' },
      { title: 'Customer Success Manager (Enterprise)', location: 'San Francisco / Remote', type: 'Full-time' },
      { title: 'Sales Development Representative', location: 'San Francisco', type: 'Full-time' },
    ],
  },
  {
    dept: 'Marketing',
    color: 'bg-pink-500/20 text-pink-400',
    roles: [
      { title: 'Head of Marketing', location: 'San Francisco', type: 'Full-time' },
      { title: 'Developer Relations Engineer', location: 'Remote', type: 'Full-time' },
    ],
  },
];

const perks = [
  { icon: '💰', title: 'Competitive compensation', desc: 'Top-of-market salary + meaningful equity. We share success with our team.' },
  { icon: '🏥', title: 'Full health coverage', desc: 'Medical, dental, and vision for you and your dependents — 100% covered.' },
  { icon: '🌎', title: 'Remote-friendly', desc: 'Work from anywhere. We have hubs in SF, NYC, and London — but most of the team is remote.' },
  { icon: '🎓', title: 'Learning & development', desc: '$3,000/year for conferences, books, courses, and anything that makes you better.' },
  { icon: '🏖️', title: 'Unlimited PTO', desc: 'Real, encouraged PTO. We track nothing. We care about output, not hours.' },
  { icon: '⚡', title: 'Top-tier equipment', desc: 'MacBook Pro M4, 4K monitor, standing desk, and anything else you need to do your best work.' },
  { icon: '🍔', title: 'Team offsites', desc: 'Twice-yearly company retreats. Past locations: Cabo, Lisbon, Bali.' },
  { icon: '👶', title: 'Parental leave', desc: '16 weeks fully paid parental leave for all parents — birth, adoption, or fostering.' },
];

export default function CareersPage() {
  return (
    <div className="bg-gray-950 text-white">
      {/* Hero */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8">
          <Heart className="w-4 h-4 text-indigo-400" />
          <span className="text-indigo-300 text-sm font-medium">We're hiring</span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6">
          Build the future of{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            enterprise intelligence.
          </span>
        </h1>
        <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed mb-10">
          We're a small, fast-moving team tackling one of the hardest problems in enterprise software.
          If you love building things that people actually use, we'd love to meet you.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-10">
          {[
            { value: '45', label: 'Team members' },
            { value: '$26M', label: 'Raised' },
            { value: '500+', label: 'Customers' },
            { value: '3', label: 'Offices' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-extrabold text-white mb-1">{s.value}</div>
              <div className="text-gray-500 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-white/5 bg-gray-900/30 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'We ship fast', desc: 'We release multiple times per week. Speed is one of our core values — and hiring principles.' },
              { icon: Globe, title: 'Remote first', desc: 'Time zones are just a number. Our best ideas come from wherever you happen to be.' },
              { icon: Heart, title: 'We care deeply', desc: 'About our customers, each other, and the impact of what we build. No politics. No bullshit.' },
            ].map((v) => (
              <div key={v.title} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                  <v.icon className="w-7 h-7 text-indigo-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{v.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Roles */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-extrabold mb-12 text-center">Open positions</h2>
          <div className="space-y-8">
            {openings.map((dept) => (
              <div key={dept.dept}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${dept.color}`}>
                    {dept.dept}
                  </span>
                </div>
                <div className="space-y-2">
                  {dept.roles.map((role) => (
                    <div
                      key={role.title}
                      className="group flex items-center justify-between bg-gray-900 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all cursor-pointer"
                    >
                      <div>
                        <div className="text-white font-semibold text-sm group-hover:text-indigo-300 transition-colors">
                          {role.title}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {role.location} · {role.type}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 bg-gray-900 border border-white/5 rounded-2xl text-center">
            <p className="text-gray-400 text-sm mb-3">
              Don't see a perfect fit? We love hearing from exceptional people.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
            >
              Send us your resume → <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="bg-gray-900/30 border-t border-white/5 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">Benefits & perks</h2>
            <p className="text-gray-400 text-lg">We invest in our team the same way we invest in our product.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {perks.map((perk) => (
              <div key={perk.title} className="bg-gray-900 border border-white/5 rounded-2xl p-5">
                <div className="text-3xl mb-3">{perk.icon}</div>
                <h3 className="text-white font-bold mb-1.5 text-sm">{perk.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
