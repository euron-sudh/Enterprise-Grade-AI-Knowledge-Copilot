export default function TermsPage() {
  const lastUpdated = 'March 1, 2026';

  return (
    <div className="bg-gray-950 text-white">
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-gray-400">Last updated: {lastUpdated}</p>
        </div>

        <div className="space-y-10 text-gray-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-white text-xl font-bold mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the KnowledgeForge platform and services ("Service"), you agree
              to be bound by these Terms of Service ("Terms"). If you are using the Service on behalf
              of an organization, you represent that you have authority to bind that organization to
              these Terms.
            </p>
            <p className="mt-3">
              If you do not agree to these Terms, you may not access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">2. Description of Service</h2>
            <p>
              KnowledgeForge provides an enterprise AI knowledge management platform that enables
              organizations to ingest, index, and query organizational knowledge through AI-powered
              chat, voice, and search interfaces. The Service includes AI Chat, Voice Assistant,
              Meeting Intelligence, Knowledge Base management, AI Agents, Workflow Automation,
              and related features.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">3. Account Registration</h2>
            <p>To use the Service, you must:</p>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li>Create an account with accurate and complete information</li>
              <li>Be at least 18 years old (or the age of majority in your jurisdiction)</li>
              <li>Maintain the security and confidentiality of your account credentials</li>
              <li>Promptly notify us of any unauthorized access to your account</li>
              <li>Be responsible for all activity that occurs under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">4. Subscription and Payment</h2>
            <p>
              Paid subscriptions are billed in advance on a monthly or annual basis. All fees are
              non-refundable except as required by law or as explicitly stated in our refund policy.
              You authorize KnowledgeForge to charge your payment method for the applicable
              subscription fees.
            </p>
            <p className="mt-3">
              If you fail to pay fees when due, we may suspend or terminate your access to the
              Service after reasonable notice. Prices are subject to change with 30 days' advance
              notice to active subscribers.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">5. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe intellectual property rights of third parties</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Reverse engineer, decompile, or extract source code from the Service</li>
              <li>Resell or sublicense the Service without our written consent</li>
              <li>Use the Service to train competing AI models without explicit written permission</li>
              <li>Upload or process content that is illegal, obscene, defamatory, or harmful</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Circumvent any access controls or rate limits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">6. Your Content</h2>
            <p>
              You retain ownership of all content you upload to or create within the Service
              ("Your Content"). By uploading content, you grant KnowledgeForge a limited,
              non-exclusive, worldwide license to process, store, and index Your Content solely
              for the purpose of providing the Service to you.
            </p>
            <p className="mt-3">
              You represent and warrant that you have all necessary rights to upload Your Content
              and that it does not violate any third-party rights or applicable laws.
            </p>
            <p className="mt-3">
              We will not use Your Content to train our AI models or for any purpose other than
              providing the Service without your explicit written consent.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">7. Intellectual Property</h2>
            <p>
              The Service, including all software, algorithms, designs, trademarks, and content
              created by KnowledgeForge, is owned by KnowledgeForge, Inc. and protected by
              intellectual property laws. Nothing in these Terms grants you any rights in our
              intellectual property except the limited right to use the Service as described herein.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">8. Confidentiality</h2>
            <p>
              Each party agrees to keep confidential any non-public information disclosed by the
              other party and to use it only in connection with these Terms. This obligation does
              not apply to information that is publicly available, independently developed, or
              required to be disclosed by law.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">9. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
              UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.
            </p>
            <p className="mt-3">
              AI-generated responses may contain errors, inaccuracies, or outdated information.
              You are responsible for verifying the accuracy of AI-generated content before
              relying on it for important decisions.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, KNOWLEDGEFORGE SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM
              YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE
              FEES YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">11. Termination</h2>
            <p>
              Either party may terminate these Terms at any time. You may terminate by deleting
              your account. We may terminate or suspend your access immediately if you violate
              these Terms or if required by law.
            </p>
            <p className="mt-3">
              Upon termination, your right to use the Service ceases immediately. We will retain
              your data for 30 days after termination, during which time you may export it.
              After 30 days, your data will be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of California, without regard
              to conflict of law provisions. Any disputes shall be resolved through binding
              arbitration in San Francisco, California, except that either party may seek
              injunctive relief in court for intellectual property violations.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">13. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will provide at least 30 days'
              notice of material changes via email or Service notification. Continued use of the
              Service after changes take effect constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">14. Contact</h2>
            <div className="mt-3 p-4 bg-gray-900 border border-white/5 rounded-xl">
              <p className="font-semibold text-white">KnowledgeForge, Inc. — Legal Team</p>
              <p>340 Pine Street, Suite 800, San Francisco, CA 94104</p>
              <p>Email: <a href="mailto:legal@knowledgeforge.ai" className="text-indigo-400 hover:text-indigo-300 transition-colors">legal@knowledgeforge.ai</a></p>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
