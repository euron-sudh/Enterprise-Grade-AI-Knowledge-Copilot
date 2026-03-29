export default function PrivacyPage() {
  const lastUpdated = 'March 1, 2026';

  return (
    <div className="bg-gray-950 text-white">
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-invert prose-gray max-w-none space-y-10 text-gray-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-white text-xl font-bold mb-3">1. Introduction</h2>
            <p>
              KnowledgeForge, Inc. ("KnowledgeForge", "we", "us", or "our") is committed to
              protecting your privacy. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our platform and services (the "Service").
            </p>
            <p className="mt-3">
              By using our Service, you consent to the data practices described in this policy.
              If you do not agree, please discontinue use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">2. Information We Collect</h2>
            <h3 className="text-white font-semibold mb-2">2.1 Information you provide directly</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account information (name, email address, password)</li>
              <li>Organization and team details</li>
              <li>Payment information (processed securely via Stripe; we do not store card numbers)</li>
              <li>Documents, files, and content you upload to the Knowledge Base</li>
              <li>Messages and queries you submit to the AI assistant</li>
              <li>Communications with our support team</li>
            </ul>

            <h3 className="text-white font-semibold mb-2 mt-5">2.2 Information collected automatically</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Log data (IP address, browser type, pages visited, time spent)</li>
              <li>Device information (operating system, device identifiers)</li>
              <li>Usage analytics (features used, query volumes, error reports)</li>
              <li>Cookies and similar tracking technologies (see Section 7)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li>Provide, operate, and improve the Service</li>
              <li>Process and index documents for AI-powered search and retrieval</li>
              <li>Authenticate users and maintain account security</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send transactional emails and service notifications</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Analyze usage patterns to improve product features</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data to third parties. We do not use your uploaded
              documents to train our AI models without explicit written consent.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">4. Data Sharing and Disclosure</h2>
            <p>We may share your information with:</p>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li><strong className="text-white">Service providers:</strong> Third-party vendors who help us operate the Service (e.g., Stripe for payments, AWS for hosting, Anthropic/Google for AI processing). These providers are contractually bound to protect your data.</li>
              <li><strong className="text-white">Legal requirements:</strong> When required by law, court order, or governmental authority.</li>
              <li><strong className="text-white">Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, with appropriate notice to you.</li>
              <li><strong className="text-white">With your consent:</strong> For any other purpose with your explicit consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">5. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li>AES-256 encryption for data at rest</li>
              <li>TLS 1.3 for all data in transit</li>
              <li>SOC 2 Type II certified infrastructure</li>
              <li>Regular third-party penetration testing</li>
              <li>Role-based access controls with audit logging</li>
              <li>Automatic security patching and vulnerability scanning</li>
            </ul>
            <p className="mt-3">
              Despite these measures, no transmission over the internet is 100% secure.
              If you believe your account has been compromised, contact us immediately at
              {' '}<a href="mailto:security@knowledgeforge.ai" className="text-indigo-400 hover:text-indigo-300 transition-colors">security@knowledgeforge.ai</a>.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">6. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to
              provide the Service. Upon account deletion, we will delete or anonymize your personal
              data within 30 days, except where retention is required by law.
            </p>
            <p className="mt-3">
              Documents you upload are retained for as long as you maintain your account.
              You can delete individual documents at any time through the Knowledge Base interface.
            </p>
          </section>

          <section id="cookies">
            <h2 className="text-white text-xl font-bold mb-3">7. Cookies and Tracking</h2>
            <p>We use the following types of cookies:</p>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li><strong className="text-white">Essential cookies:</strong> Required for authentication and core functionality. Cannot be disabled.</li>
              <li><strong className="text-white">Analytics cookies:</strong> Help us understand how users interact with our Service. Can be disabled in your browser settings.</li>
              <li><strong className="text-white">Preference cookies:</strong> Remember your settings (e.g., theme, language). Optional.</li>
            </ul>
            <p className="mt-3">
              You can control cookies through your browser settings. Disabling essential cookies
              will prevent you from using the Service.
            </p>
          </section>

          <section id="gdpr">
            <h2 className="text-white text-xl font-bold mb-3">8. GDPR Rights (EU/EEA Users)</h2>
            <p>
              If you are located in the European Union or European Economic Area, you have the
              following rights under the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li><strong className="text-white">Right of access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong className="text-white">Right to rectification:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong className="text-white">Right to erasure:</strong> Request deletion of your personal data ("right to be forgotten").</li>
              <li><strong className="text-white">Right to restriction:</strong> Request that we limit processing of your data.</li>
              <li><strong className="text-white">Right to portability:</strong> Receive your data in a machine-readable format.</li>
              <li><strong className="text-white">Right to object:</strong> Object to processing based on legitimate interests.</li>
              <li><strong className="text-white">Rights related to automated decision-making:</strong> Not be subject to purely automated decisions with legal effects.</li>
            </ul>
            <p className="mt-3">
              Our legal basis for processing is: performance of a contract (providing the Service),
              legitimate interests (security, fraud prevention, analytics), and consent (where
              applicable). To exercise your rights, contact{' '}
              <a href="mailto:privacy@knowledgeforge.ai" className="text-indigo-400 hover:text-indigo-300 transition-colors">privacy@knowledgeforge.ai</a>.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">9. Children's Privacy</h2>
            <p>
              The Service is not directed to individuals under 16 years of age. We do not
              knowingly collect personal information from children under 16. If you believe we
              have collected such information, contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes via email or a prominent notice in the Service at least 30 days before the
              changes take effect.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">11. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy, please contact:
            </p>
            <div className="mt-3 p-4 bg-gray-900 border border-white/5 rounded-xl">
              <p className="font-semibold text-white">KnowledgeForge, Inc. — Privacy Team</p>
              <p>340 Pine Street, Suite 800, San Francisco, CA 94104</p>
              <p>Email: <a href="mailto:privacy@knowledgeforge.ai" className="text-indigo-400 hover:text-indigo-300 transition-colors">privacy@knowledgeforge.ai</a></p>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
