import React from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Scale, FileText, Shield, AlertTriangle, CreditCard, Phone, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const LAST_UPDATED = 'July 2026';

const Terms: React.FC = () => {
  React.useEffect(() => {
    document.title = 'Terms of Service - Boltcall Legal Terms & Conditions';
    updateMetaDescription(
      'Boltcall terms of service. Governing law: Israel (Tel Aviv courts). Covers subscriptions, VAT, call recording, data processing, and your rights.'
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
              <Scale className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
              <p className="text-gray-600 text-lg">Last updated: {LAST_UPDATED}</p>
            </div>
          </motion.div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
            <strong>Governing law:</strong> State of Israel · Jurisdiction: Tel Aviv-Yafo District Court ·
            These terms are an agreement between you and Boltcall (operated by Noam Yakoby, Israel).
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-8">

        {/* SECTION 1 — Agreement */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0"><FileText className="w-5 h-5 text-blue-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">1. Agreement</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>These Terms of Service ("Terms") govern your access to and use of Boltcall's speed-to-lead platform, AI voice agents, automated messaging, and related services (collectively, the "Service"). By creating an account or using the Service, you agree to these Terms.</p>
            <p><strong>Parties:</strong> "Boltcall", "we", "us" means the operator Noam Yakoby (Israel). "You" or "Customer" means the individual or legal entity that created the account.</p>
            <p>If you are entering these Terms on behalf of a company, you represent that you have authority to bind that company.</p>
          </div>
        </motion.div>

        {/* SECTION 2 — Service Description */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg shrink-0"><Globe className="w-5 h-5 text-purple-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">2. Service Description</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>Boltcall provides a software-as-a-service ("SaaS") platform that includes: AI voice agents that answer inbound calls 24/7; automated SMS, WhatsApp, and email follow-up sequences; appointment booking and calendar integration; lead capture and CRM functionality; and analytics dashboards.</p>
            <p>We may modify, suspend, or discontinue features with 30 days' prior notice for material changes. Emergency maintenance or security fixes may occur without advance notice.</p>
          </div>
        </motion.div>

        {/* SECTION 3 — Account & Eligibility */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-green-50 rounded-lg shrink-0"><Shield className="w-5 h-5 text-green-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">3. Account &amp; Eligibility</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>You must be at least 18 years old and operate a legitimate business. You agree to provide accurate account information and keep it current. You are responsible for all activity under your account. Notify us immediately at <a href="mailto:support@boltcall.org" className="text-blue-600 hover:underline">support@boltcall.org</a> if you suspect unauthorized access.</p>
            <p>We reserve the right to reject, suspend, or terminate any account at our discretion, including for violation of these Terms or applicable law.</p>
          </div>
        </motion.div>

        {/* SECTION 4 — Acceptable Use */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-yellow-50 rounded-lg shrink-0"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">4. Acceptable Use</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>You may use the Service only for lawful business purposes. You must not:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Send unsolicited communications in violation of Israeli Communications Law Amendment 40 (anti-spam), CAN-SPAM, or any applicable law</li>
              <li>Record calls without notifying the other party as required by Israeli Wiretapping Law 5739-1979 and equivalent laws</li>
              <li>Use the Service to harass, defraud, or harm individuals</li>
              <li>Attempt to reverse-engineer, scrape, or resell the Service without our written consent</li>
              <li>Use the AI agents to impersonate a human being in contexts where disclosure is legally required</li>
            </ul>
            <p>We may suspend service immediately if we detect misuse. You are responsible for all content your agents transmit.</p>
          </div>
        </motion.div>

        {/* SECTION 5 — Call Recording & AI Disclosure */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-red-50 rounded-lg shrink-0"><Phone className="w-5 h-5 text-red-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">5. Call Recording &amp; AI Disclosure</h2>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-gray-800 space-y-2">
            <p><strong>Your legal obligation:</strong> Israeli Wiretapping Law 5739-1979 and equivalent two-party consent laws in many jurisdictions require that callers be notified when a call is being recorded. Boltcall's default agent opening prompt includes a recording disclosure, but you are responsible for ensuring this notification is present and legally compliant for your jurisdiction.</p>
            <p>Israeli law also recommends (and industry practice requires) disclosure that callers are speaking with an AI system, not a human. Do not configure agents to deny being AI.</p>
            <p>By using the Service you confirm that your use complies with all applicable recording and AI-disclosure laws.</p>
          </div>
        </motion.div>

        {/* SECTION 6 — AI Accuracy, Regulated Professions & No Professional Advice */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg shrink-0"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">6. AI Accuracy, Regulated Professions &amp; No Professional Advice</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p><strong>AI accuracy.</strong> The Service uses artificial intelligence and automated speech recognition, which may mishear, misclassify, or record caller information incorrectly. Boltcall is an intake and lead-capture tool, not a system of record for deadlines, appointments, or case management. You must independently verify all information captured by the Service — including names, dates, deadlines, and callback numbers — before relying on it for any consequential decision.</p>
            <p><strong>No professional advice.</strong> If you operate in a regulated profession (including law, medicine, dentistry, mental health, accounting, or financial services), the AI agent does not and cannot provide legal, medical, financial, or other professional advice, and no professional relationship (including no attorney-client relationship) is formed by any interaction with the Service. The AI agent's role is limited to intake, scheduling, and message-taking. You remain solely responsible for all professional, ethical, and regulatory obligations applicable to your practice, including conflicts checks, deadline calendaring, confidentiality, and any rules governing advertising or client communications (e.g., bar association or medical board rules).</p>
            <p>You must not configure or instruct the AI agent to give advice, assess the merits of a matter, predict outcomes, quote binding terms, or otherwise act beyond intake and scheduling for any regulated-profession use case.</p>
            <p>Law firms: see our <a href="/law-firm-security" className="text-blue-600 hover:underline">Security &amp; Compliance for Law Firms</a> page for a plain-language summary of the guardrails and data handling described here.</p>
          </div>
        </motion.div>

        {/* SECTION 7 — Guarantee Terms */}
        <motion.div id="guarantee" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg shrink-0"><Shield className="w-5 h-5 text-emerald-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">7. Guarantee Terms</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>Where Boltcall advertises a money-back or results guarantee (e.g., on a pricing page), the following terms apply and control over any shorter marketing description:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The guarantee applies only to paying subscribers on an eligible plan, starting from the date the AI agent is fully configured and live on your account.</li>
              <li>To claim the guarantee, contact <a href="mailto:support@boltcall.org" className="text-blue-600 hover:underline">support@boltcall.org</a> within the stated window (e.g., 30 days) with your account details.</li>
              <li>The guarantee requires that you have not materially misconfigured the agent, disabled call routing, or otherwise prevented the Service from operating as intended.</li>
              <li><strong>Sole and exclusive remedy:</strong> if the guarantee is not met, your sole remedy is a refund of fees paid for the applicable period, or an account credit at Boltcall's discretion. The guarantee does not create any additional liability, warranty, or right to damages beyond the refund described here.</li>
            </ul>
          </div>
        </motion.div>

        {/* SECTION 8 — Payment Terms */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg shrink-0"><CreditCard className="w-5 h-5 text-emerald-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">8. Payment Terms</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>Subscriptions are billed monthly or annually in advance. Prices are displayed in USD or ILS as selected. All fees are exclusive of applicable taxes.</p>
            <p><strong>Israeli VAT (מע"מ):</strong> Israeli-resident customers are charged 18% VAT (current rate as of January 2025) in addition to the subscription price. A proper Israeli tax invoice (חשבונית מס) will be issued for each payment. B2B customers with a valid VAT number (ע.מ. / ח.פ.) may be eligible for reverse-charge treatment on qualifying transactions — contact <a href="mailto:billing@boltcall.org" className="text-blue-600 hover:underline">billing@boltcall.org</a>.</p>
            <p>Subscriptions auto-renew. Cancel any time before the renewal date through your account dashboard. Cancellation takes effect at the end of the current billing period — no partial refunds are issued except as required by Israeli Consumer Protection Law (for B2C contracts within 14 days of first purchase) or as Boltcall determines in its sole discretion.</p>
            <p>Payments are processed by Stripe. Failed payments may result in service suspension after a 5-day grace period.</p>
          </div>
        </motion.div>

        {/* SECTION 7 — Data, Privacy & DPA */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0"><Shield className="w-5 h-5 text-blue-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">9. Data &amp; Privacy</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>Our collection and use of your personal data is governed by our <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>, which is incorporated into these Terms by reference.</p>
            <p>Where Boltcall processes personal data on your behalf (e.g., your customers' data flowing through the AI agents), our <a href="/dpa" className="text-blue-600 hover:underline">Data Processing Agreement (DPA)</a> applies. The DPA sets out our obligations as a data processor under Israeli PPL Amendment 13 and EU GDPR.</p>
            <p>You remain the data controller/database owner for your customers' data. You are responsible for having a lawful basis to collect and process that data and for obtaining any necessary consents before using Boltcall's outbound messaging features.</p>
          </div>
        </motion.div>

        {/* SECTION 8 — Intellectual Property */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Intellectual Property</h2>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>Boltcall and its licensors own all rights in the Service, including software, UI, AI models, and documentation. You receive a limited, non-exclusive, non-transferable license to use the Service during your subscription.</p>
            <p>You retain ownership of your data. You grant Boltcall a limited license to process your data solely to provide the Service. We do not use your customer conversations to train shared AI models without your consent.</p>
          </div>
        </motion.div>

        {/* SECTION 11 — Disclaimers, Limitation of Liability & Indemnification */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Disclaimers, Limitation of Liability &amp; Indemnification</h2>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p><strong>No warranty.</strong> The Service is provided "AS IS" and "AS AVAILABLE," without warranties of any kind, whether express, implied, or statutory, including any implied warranty of merchantability, fitness for a particular purpose, or non-infringement. Boltcall does not warrant that the Service will be uninterrupted, error-free, or that AI-generated output will be accurate or complete.</p>
            <p><strong>Liability cap.</strong> To the maximum extent permitted by applicable law, Boltcall's total liability for any claim arising from these Terms or the Service is limited to the fees you paid in the 12 months preceding the claim.</p>
            <p><strong>Excluded damages.</strong> In no event is Boltcall liable for indirect, incidental, consequential, or punitive damages, including lost profits, lost leads, lost clients, or business interruption — even if advised of the possibility of such damages.</p>
            <p><strong>Sole remedy.</strong> Where these Terms or any Boltcall guarantee provide a specific remedy (such as a service credit or refund under Section 7), that remedy is your sole and exclusive remedy for the applicable issue.</p>
            <p><strong>Your indemnification of us.</strong> You agree to indemnify and hold Boltcall harmless from any third-party claim, loss, or expense (including reasonable legal fees) arising from: (a) your use of the Service, (b) your failure to comply with professional, regulatory, or legal obligations applicable to your business, (c) content or instructions you configure into the AI agent, or (d) your violation of these Terms or applicable law.</p>
            <p>Nothing in these Terms limits liability that cannot be excluded under mandatory Israeli consumer or data-protection law.</p>
          </div>
        </motion.div>

        {/* SECTION 12 — Termination */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Termination</h2>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>You may cancel your subscription at any time through your account dashboard. We may terminate or suspend your account for material breach of these Terms, non-payment, or illegal use, with or without notice depending on severity.</p>
            <p>Upon termination, your access to the Service ceases. You may request a data export within 30 days of termination — after which we may delete your data in accordance with our <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a> retention schedule. Payment obligations for services already rendered survive termination.</p>
          </div>
        </motion.div>

        {/* SECTION 11 — Governing Law */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Governing Law, Arbitration &amp; Dispute Resolution</h2>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>These Terms are governed by the laws of the <strong>State of Israel</strong>. Subject to the arbitration agreement below, any dispute arising from these Terms or the Service shall be submitted to the exclusive jurisdiction of the <strong>Tel Aviv-Yafo District Court</strong> (or the relevant Magistrate's Court for smaller claims).</p>
            <p><strong>Arbitration (customers outside Israel).</strong> If you are located outside Israel, any dispute arising from these Terms or the Service — other than claims for injunctive relief to protect intellectual property or confidential information — will be resolved by binding arbitration on an individual basis, rather than in court, except where prohibited by mandatory local law. The arbitration will be conducted in English, seated in Tel Aviv, Israel, under rules to be specified at the time a dispute arises. Judgment on the arbitration award may be entered in any court of competent jurisdiction. Nothing here waives protections you have as a consumer under mandatory law in your jurisdiction.</p>
            <p>Before initiating formal proceedings, both parties agree to attempt good-faith resolution by contacting <a href="mailto:legal@boltcall.org" className="text-blue-600 hover:underline">legal@boltcall.org</a>. If you are a consumer under Israeli Consumer Protection Law, you also have the right to file a complaint with the Israeli Consumer Protection and Fair Trade Authority (הרשות להגנת הצרכן).</p>
          </div>
        </motion.div>

        {/* SECTION 14 — Changes */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Changes to These Terms</h2>
          <p className="text-gray-700 text-sm leading-relaxed">We may update these Terms to reflect changes in law, our services, or our policies. We will notify you by email at least 14 days before material changes take effect, and re-prompt acceptance in-app for material changes. Continued use after the effective date constitutes acceptance. The current version is always at <a href="/terms-of-service" className="text-blue-600 hover:underline">boltcall.org/terms-of-service</a>.</p>
        </motion.div>

        {/* SECTION 15 — Contact */}
        <motion.div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-5">15. Contact</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>General:</strong> <a href="mailto:support@boltcall.org" className="text-blue-600 hover:underline">support@boltcall.org</a></p>
            <p><strong>Legal / contracts:</strong> <a href="mailto:legal@boltcall.org" className="text-blue-600 hover:underline">legal@boltcall.org</a></p>
            <p><strong>Billing / VAT invoices:</strong> <a href="mailto:billing@boltcall.org" className="text-blue-600 hover:underline">billing@boltcall.org</a></p>
            <p><strong>Privacy / DPA:</strong> <a href="/dpa" className="text-blue-600 hover:underline">View our Data Processing Agreement →</a></p>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Terms;
