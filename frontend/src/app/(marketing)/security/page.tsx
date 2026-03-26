import { Shield, Lock, Eye, Server, FileCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const certifications = [
  { name: 'SOC 2 Type II', desc: 'Annual third-party audit of security, availability, and confidentiality controls.', id: 'soc2' },
  { name: 'ISO 27001', desc: 'Internationally recognized information security management standard.' },
  { name: 'GDPR', desc: 'Full compliance with EU General Data Protection Regulation.' },
  { name: 'HIPAA', desc: 'Healthcare-grade data protection for organizations handling PHI.', id: 'hipaa' },
  { name: 'CCPA', desc: 'California Consumer Privacy Act compliance for California residents.' },
  { name: 'CSA STAR', desc: 'Cloud Security Alliance STAR certification for cloud security controls.' },
];

const pillars = [
  {
    icon: Lock,
    title: 'Encryption',
    items: [
      'AES-256 encryption for all data at rest',
      'TLS 1.3 for all data in transit',
      'End-to-end encrypted document storage',
      'Customer-managed encryption keys (Enterprise)',
      'Encrypted database backups with separate key management',
    ],
  },
  {
    icon: Shield,
    title: 'Access Control',
    items: [
      'Role-based access control (RBAC) with custom roles',
      'Multi-factor authentication (TOTP, WebAuthn, SMS)',
      'SAML 2.0 / OIDC single sign-on',
      'IP allowlisting and device trust policies',
      'Session management with configurable timeouts',
      'Principle of least privilege enforcement',
    ],
  },
  {
    icon: Eye,
    title: 'Monitoring & Audit',
    items: [
      'Immutable audit logs for all user and admin actions',
      '24/7 real-time threat detection',
      'Anomaly detection and automated alerting',
      'SIEM integration for enterprise security teams',
      'Regular third-party penetration testing',
      'Vulnerability disclosure program (VDP)',
    ],
  },
  {
    icon: Server,
    title: 'Infrastructure',
    items: [
      'AWS multi-region deployment (US, EU, APAC)',
      'Private VPC with no public database access',
      'Web Application Firewall (WAF) with DDoS protection',
      'Automated security patching within 24 hours',
      'Container image scanning for vulnerabilities',
      'Zero-trust network architecture',
    ],
  },
  {
    icon: FileCheck,
    title: 'Data Governance',
    items: [
      'Data residency controls (store data in specific regions)',
      'Configurable data retention policies',
      'Right to erasure (GDPR Article 17) within 30 days',
      'Data export in standard formats (GDPR Article 20)',
      'Legal hold and eDiscovery support (Enterprise)',
      'PII detection and automatic redaction',
    ],
  },
  {
    icon: AlertCircle,
    title: 'Incident Response',
    items: [
      'Documented incident response plan',
      'Breach notification within 72 hours (GDPR requirement)',
      'Dedicated security team on call 24/7',
      '99.9% uptime SLA with status page',
      'Automated failover and disaster recovery',
      'Annual tabletop exercises and DR testing',
    ],
  },
];

export default function SecurityPage() {
  return (
    <div className="bg-gray-950 text-white">
      {/* Hero */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span className="text-indigo-300 text-sm font-medium">Enterprise security</span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6">
          Your data is{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            safe with us.
          </span>
        </h1>
        <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed">
          KnowledgeForge is built from the ground up for enterprise-grade security, compliance,
          and data governance. We protect your most sensitive organizational knowledge.
        </p>
      </section>

      {/* Certifications */}
      <section className="border-y border-white/5 bg-gray-900/30 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-3">Certifications & Compliance</h2>
            <p className="text-gray-400">Independent verification of our security controls.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certifications.map((cert) => (
              <div
                key={cert.name}
                id={cert.id}
                className="bg-gray-900 border border-white/5 rounded-2xl p-6 flex gap-4 items-start"
              >
                <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">{cert.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{cert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Pillars */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">Security at every layer</h2>
            <p className="text-gray-400 text-lg">Defense-in-depth across infrastructure, application, and data layers.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="bg-gray-900 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <pillar.icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-white font-bold text-lg">{pillar.title}</h3>
                </div>
                <ul className="space-y-2">
                  {pillar.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsible Disclosure */}
      <section className="bg-gray-900/30 border-y border-white/5 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold mb-4">Responsible Disclosure</h2>
          <p className="text-gray-400 mb-6">
            Found a security vulnerability? We appreciate responsible disclosure. Please report
            security issues directly to our security team. We commit to responding within 24 hours
            and keeping you informed of our progress.
          </p>
          <a
            href="mailto:security@knowledgeforge.ai"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition-all"
          >
            <Shield className="w-5 h-5" />
            Report a Vulnerability
          </a>
          <p className="text-gray-500 text-sm mt-4">security@knowledgeforge.ai</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold mb-4">Have security questions?</h2>
          <p className="text-gray-400 mb-8">
            Our enterprise security team is happy to answer your questions, provide our security
            documentation, and complete your vendor security review.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl transition-all"
          >
            Talk to our security team →
          </Link>
        </div>
      </section>
    </div>
  );
}
