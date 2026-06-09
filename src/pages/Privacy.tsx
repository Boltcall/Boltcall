import React from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Shield, Lock, Eye, FileText, Globe, Mail, AlertTriangle, Phone as PhoneIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const LAST_UPDATED = 'May 2026';

const Privacy: React.FC = () => {
  React.useEffect(() => {
    document.title = 'Privacy Policy - Boltcall Data Protection & Privacy';
    updateMetaDescription(
      'Boltcall privacy policy. How we collect, use, and protect your data under Israeli Privacy Protection Law (PPL), GDPR, and global standards.'
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="p-4 bg-blue-100 rounded-xl">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
              <p className="text-gray-600 text-lg">Last updated: {LAST_UPDATED}</p>
            </div>
          </motion.div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
            <strong>Applicable laws:</strong> Israeli Privacy Protection Law 5741-1981 (PPL) &amp; Amendment 13
            (in force August 2025) · EU GDPR (supervisory practice) · Israeli Communications Law Amendment 40
            (anti-spam) · Israeli Wiretapping Law 5739-1979
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-8">
        {/* SECTION 1 — Data Controller */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">1. Who We Are (Data Controller)</h2>
          </div>
          <div className="text-gray-700 leading-relaxed space-y-3 text-sm">
            <p><strong>Boltcall</strong> is a speed-to-lead SaaS platform that uses AI voice agents and automated messaging to help local service businesses respond to inbound leads instantly.</p>
            <p><strong>Data Controller:</strong> Boltcall (operated by Noam Yakoby, Israel). Under the Israeli Privacy Protection Law (PPL) 5741-1981, Boltcall is the <em>Database Owner</em> and, where processing data on behalf of customers, also a <em>Database Holder</em>.</p>
            <p><strong>Contact:</strong> <a href="mailto:privacy@boltcall.org" className="text-blue-600 hover:underline">privacy@boltcall.org</a></p>
            <p className="text-gray-500">Database registration: Boltcall is assessing whether data volumes trigger mandatory registration with the Israeli Registrar of Databases under PPL Amendment 13. We will register when required.</p>
          </div>
        </motion.div>

        {/* SECTION 2 — Data We Collect */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-green-50 rounded-lg"><Eye className="w-5 h-5 text-green-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">2. Information We Collect</h2>
          </div>
          <div className="space-y-4 text-gray-700 text-sm">
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Account &amp; Business Information</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Name, email address, phone number</li>
                <li>Business name, address, industry, website</li>
                <li>Payment and billing information (processed via Stripe — we do not store raw card data)</li>
                <li>VAT number / business registration (ח.פ. / ע.מ.) for Israeli tax invoicing</li>
                <li>Account credentials (passwords are hashed — never stored in plain text)</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Call &amp; Communication Data</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Call recordings and transcripts</strong> — generated when your AI agent answers calls. Callers are notified at call start (see Section 6).</li>
                <li>SMS, WhatsApp, and email messages sent through the platform</li>
                <li>Lead information captured during conversations</li>
                <li>Appointment details and calendar entries</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Technical Information</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>IP address, browser type, device information</li>
                <li>Usage patterns and feature interaction data</li>
                <li>Cookies — see Section 9 and our Cookie Consent banner</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* SECTION 3 — Purposes */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg"><Globe className="w-5 h-5 text-purple-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">3. Why We Process Your Data</h2>
          </div>
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-gray-700">
              <thead><tr className="bg-gray-50"><th className="text-left p-3 font-semibold">Purpose</th><th className="text-left p-3 font-semibold">Legal basis (PPL / GDPR)</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="p-3">Provide and maintain the AI receptionist platform</td><td className="p-3">Contract performance</td></tr>
                <tr><td className="p-3">Process payments and issue tax invoices</td><td className="p-3">Contract &amp; legal obligation</td></tr>
                <tr><td className="p-3">Answer inbound calls, send SMS / WhatsApp</td><td className="p-3">Contract &amp; consent (Israeli Communications Law)</td></tr>
                <tr><td className="p-3">Improve AI models using anonymised data</td><td className="p-3">Legitimate interest</td></tr>
                <tr><td className="p-3">Send marketing communications</td><td className="p-3">Explicit opt-in consent (Israeli anti-spam law)</td></tr>
                <tr><td className="p-3">Comply with tax, anti-fraud, and legal obligations</td><td className="p-3">Legal obligation</td></tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* SECTION 4 — Sub-Processors */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Sub-Processors &amp; Third Parties</h2>
          <p className="text-gray-700 text-sm mb-4">We do not sell your personal data. We share data only with the vendors below, each bound by a data processing agreement. Full DPA: <a href="/dpa" className="text-blue-600 hover:underline">boltcall.org/dpa</a>.</p>
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-gray-700">
              <thead><tr className="bg-gray-50"><th className="text-left p-3 font-semibold">Vendor</th><th className="text-left p-3 font-semibold">Purpose</th><th className="text-left p-3 font-semibold">Data location</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="p-3">Supabase (AWS)</td><td className="p-3">Database &amp; auth</td><td className="p-3">US East (us-east-1)</td></tr>
                <tr><td className="p-3">Retell AI</td><td className="p-3">AI voice agent &amp; call recordings</td><td className="p-3">US (AWS)</td></tr>
                <tr><td className="p-3">Twilio</td><td className="p-3">Phone numbers, SMS, call routing</td><td className="p-3">US / Ireland</td></tr>
                <tr><td className="p-3">Stripe</td><td className="p-3">Payment processing</td><td className="p-3">US / Ireland</td></tr>
                <tr><td className="p-3">Brevo</td><td className="p-3">Transactional email</td><td className="p-3">EU (Germany)</td></tr>
                <tr><td className="p-3">ElevenLabs</td><td className="p-3">AI voice synthesis</td><td className="p-3">US</td></tr>
                <tr><td className="p-3">OpenAI</td><td className="p-3">Language model inference</td><td className="p-3">US</td></tr>
                <tr><td className="p-3">Google Analytics / GTM</td><td className="p-3">Web analytics (consent-gated)</td><td className="p-3">US</td></tr>
                <tr><td className="p-3">Microsoft Clarity</td><td className="p-3">Public-site heatmaps and session behavior analytics (consent-gated)</td><td className="p-3">US</td></tr>
                <tr><td className="p-3">Greeninvoice</td><td className="p-3">Israeli tax invoice issuance</td><td className="p-3">Israel</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-3">Cross-border transfers to the US are covered by Standard Contractual Clauses (SCCs). Israel has not been designated an "adequate" country by the US. Transfer records available on request.</p>
        </motion.div>

        {/* SECTION 5 — Retention */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention</h2>
          <div className="bg-gray-50 rounded-xl p-5 text-sm">
            <table className="w-full text-gray-700">
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2 font-medium w-1/2">Account information</td><td className="py-2">Account closure + 7 years (Israeli tax records requirement)</td></tr>
                <tr><td className="py-2 font-medium">Call recordings &amp; transcripts</td><td className="py-2">2 years, then permanently deleted</td></tr>
                <tr><td className="py-2 font-medium">Lead &amp; conversation data</td><td className="py-2">Until you delete or account closes</td></tr>
                <tr><td className="py-2 font-medium">Payment records</td><td className="py-2">7 years (Israeli Bookkeeping Regulations)</td></tr>
                <tr><td className="py-2 font-medium">Technical logs</td><td className="py-2">1 year</td></tr>
                <tr><td className="py-2 font-medium">Consent records</td><td className="py-2">3 years from last interaction (Israeli anti-spam law)</td></tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* SECTION 6 — Call Recording & AI Disclosure */}
        <motion.div className="bg-white rounded-2xl border border-yellow-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-yellow-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">6. Call Recording &amp; AI Disclosure</h2>
          </div>
          <div className="space-y-3 text-gray-700 text-sm">
            <p><strong>Recording notice:</strong> Under the Israeli Wiretapping Law (חוק האזנת סתר, 5739-1979), all parties to a recorded call must be notified before or at the start of recording. Boltcall AI agents are programmed to announce at the start of every call:</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 font-medium text-gray-800 space-y-1">
              <p>English: "Just so you know, I'm an AI assistant and this call may be recorded for quality purposes."</p>
              <p>Hebrew (עברית): "שים לב, אני עוזר בינה מלאכותית והשיחה עשויה להיות מוקלטת לצורכי איכות."</p>
            </div>
            <p><strong>AI disclosure:</strong> In line with the 2024 Israeli AI Code of Ethics, callers are informed they are speaking with an AI at the start of every interaction. Boltcall agents will never deny being AI when sincerely asked.</p>
          </div>
        </motion.div>

        {/* SECTION 7 — Your Rights */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Privacy Rights</h2>
          <p className="text-gray-600 text-sm mb-4">Under Israeli PPL Amendment 13 (2025) and GDPR, you have the rights below. Contact <a href="mailto:privacy@boltcall.org" className="text-blue-600 hover:underline">privacy@boltcall.org</a>. We respond within 30 days.</p>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
              <p><strong>Right of access (סעיף 13 לחוק):</strong> Request a copy of all personal data we hold about you.</p>
              <p><strong>Right to correct:</strong> Fix inaccurate or incomplete data.</p>
              <p><strong>Right to delete:</strong> Request deletion where we have no legal obligation to retain.</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 space-y-2">
              <p><strong>Right to portability:</strong> Receive your data in a machine-readable format.</p>
              <p><strong>Right to object:</strong> Object to processing based on legitimate interest.</p>
              <p><strong>Withdraw consent:</strong> Withdraw marketing consent at any time — one click in any email.</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Complaints may be lodged with the Israeli Privacy Protection Authority (רשות הגנת הפרטיות) at <a href="https://www.gov.il/he/departments/the_privacy_protection_authority" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">gov.il</a>.</p>
        </motion.div>

        {/* SECTION 8 — Security */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-red-50 rounded-lg"><Lock className="w-5 h-5 text-red-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">8. Data Security</h2>
          </div>
          <div className="bg-gray-50 rounded-xl p-5 text-sm text-gray-700 space-y-1.5">
            <p>• TLS 1.2+ encryption for all data in transit</p>
            <p>• AES-256 encryption for sensitive data at rest</p>
            <p>• Row-level security (RLS) so users access only their own data</p>
            <p>• Passwords hashed (bcrypt) — never stored in plain text</p>
            <p>• Role-based access controls for internal team</p>
            <p>• Data breach notification within 72 hours to affected users and relevant authorities as required by PPL Amendment 13</p>
          </div>
        </motion.div>

        {/* SECTION 9 — Cookies */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies &amp; Tracking</h2>
          <div className="space-y-3 text-gray-700 text-sm">
            <p>We use a consent banner to obtain explicit permission before placing non-essential cookies. This complies with the Israeli Privacy Protection Authority's guidance on consent.</p>
            <div className="bg-gray-50 rounded-xl p-5 space-y-2">
              <p><strong>Essential cookies:</strong> Auth session, language preference, cookie consent record. Always active.</p>
              <p><strong>Analytics (requires consent):</strong> Google Analytics 4 (G-LY9H4ZQW81), GTM (GTM-5LWRPT5N), and Microsoft Clarity. Track pages, feature usage, heatmaps, and public-site session behavior. Clarity is not enabled on authenticated dashboard or setup areas. No personal data shared for advertising.</p>
            </div>
            <p>Withdraw consent anytime by clearing the <code className="bg-gray-100 px-1 rounded text-xs">cookie_consent</code> key in your browser's localStorage and refreshing.</p>
          </div>
        </motion.div>

        {/* SECTION 10 — Anti-Spam */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Marketing &amp; Israeli Anti-Spam Law</h2>
          <div className="text-gray-700 text-sm space-y-3">
            <p>Israel's Communications Law Amendment 40 (חוק הספאם) requires <strong>explicit prior opt-in</strong> before sending promotional SMS, email, or WhatsApp messages. Statutory damages are ₪1,000 per unsolicited message with no harm required.</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Unchecked-by-default marketing consent checkboxes at sign-up</li>
              <li>One-click unsubscribe in every marketing email</li>
              <li>Suppression list — once unsubscribed, no further marketing contacts</li>
              <li>No outbound promotional SMS without consent on record</li>
            </ul>
            <p>Transactional messages (confirmations, alerts, password resets) are exempt and cannot be individually unsubscribed.</p>
          </div>
        </motion.div>

        {/* SECTION 11 — Children */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Children's Privacy</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-gray-700">
            Our services are not directed at individuals under 18. We do not knowingly collect personal information from minors. If you believe we have inadvertently collected such data, contact <a href="mailto:privacy@boltcall.org" className="text-blue-600 hover:underline">privacy@boltcall.org</a> immediately.
          </div>
        </motion.div>

        {/* SECTION 12 — Changes */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to This Policy</h2>
          <p className="text-gray-700 text-sm leading-relaxed">We may update this policy to reflect changes in our services, legal requirements, or best practices. Material changes will be announced by email at least 14 days before taking effect. The current version is always at <a href="/privacy-policy" className="text-blue-600 hover:underline">boltcall.org/privacy-policy</a>.</p>
        </motion.div>

        {/* SECTION 13 — Contact */}
        <motion.div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-5">13. Contact Us</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0"><Mail className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Privacy Officer</p>
                <a href="mailto:privacy@boltcall.org" className="text-blue-600 hover:underline">privacy@boltcall.org</a>
                <p className="text-gray-500 mt-1">DSR requests, data breaches, DPA inquiries</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0"><Mail className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">General Support</p>
                <a href="mailto:support@boltcall.org" className="text-blue-600 hover:underline">support@boltcall.org</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0"><PhoneIcon className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Data Processing Agreement</p>
                <a href="/dpa" className="text-blue-600 hover:underline">View our DPA →</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0"><Shield className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Israeli Privacy Authority</p>
                <a href="https://www.gov.il/he/departments/the_privacy_protection_authority" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Reshut HaGanat HaPratiyut</a>
                <p className="text-gray-500 mt-1">Lodge a complaint if we've failed you</p>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Privacy;
