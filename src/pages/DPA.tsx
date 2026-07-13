import React from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Shield, Database, Globe, Lock, FileText, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const LAST_UPDATED = 'May 2026';

const DPA: React.FC = () => {
  React.useEffect(() => {
    document.title = 'Data Processing Agreement - Boltcall DPA';
    updateMetaDescription(
      'Boltcall Data Processing Agreement. Sub-processor list, data residency disclosures, and obligations under Israeli PPL Amendment 13 and EU GDPR.'
    );
  }, []);

  const subprocessors = [
    {
      name: 'Supabase',
      purpose: 'Database, authentication, and storage',
      location: 'United States (AWS us-east-1)',
      link: 'https://supabase.com/privacy',
    },
    {
      name: 'Retell AI',
      purpose: 'AI voice agent engine and call transcription',
      location: 'United States',
      link: 'https://www.retellai.com/privacy',
    },
    {
      name: 'Twilio',
      purpose: 'Phone number provisioning, SMS, and call routing',
      location: 'United States',
      link: 'https://www.twilio.com/en-us/legal/privacy',
    },
    {
      name: 'Stripe',
      purpose: 'Payment processing and subscription management',
      location: 'United States (EU/UK residents: also EU data residency)',
      link: 'https://stripe.com/privacy',
    },
    {
      name: 'OpenAI',
      purpose: 'AI language model inference for agent conversations',
      location: 'United States',
      link: 'https://openai.com/policies/privacy-policy',
    },
    {
      name: 'ElevenLabs',
      purpose: 'Text-to-speech voice synthesis for AI agents',
      location: 'United States',
      link: 'https://elevenlabs.io/privacy',
    },
    {
      name: 'Brevo (formerly Sendinblue)',
      purpose: 'Transactional and marketing email delivery',
      location: 'France (EU)',
      link: 'https://www.brevo.com/legal/privacypolicy/',
    },
    {
      name: 'Meta (WhatsApp Business API)',
      purpose: 'WhatsApp message delivery',
      location: 'United States / Ireland (EU residents)',
      link: 'https://www.facebook.com/privacy/policy/',
    },
    {
      name: 'Google (GTM + GA4)',
      purpose: 'Analytics (consent-gated — only active after user accepts cookies)',
      location: 'United States',
      link: 'https://policies.google.com/privacy',
    },
    {
      name: 'Greeninvoice',
      purpose: 'Israeli tax invoice generation (חשבונית מס) for Israeli customers',
      location: 'Israel',
      link: 'https://www.greeninvoice.co.il',
    },
  ];

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
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Data Processing Agreement</h1>
              <p className="text-gray-600 text-lg">Last updated: {LAST_UPDATED}</p>
            </div>
          </motion.div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
            <strong>Applicable to:</strong> All Boltcall customers whose use involves processing personal data of third parties (e.g., their own leads, callers, or customers). This DPA forms part of the <a href="/terms-of-service" className="underline">Terms of Service</a> and is governed by Israeli PPL Amendment 13 and EU GDPR where applicable.
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-8">

        {/* SECTION 1 — Roles */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0"><FileText className="w-5 h-5 text-blue-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">1. Roles of the Parties</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p><strong>You (Customer)</strong> are the <em>Data Controller</em> (GDPR) / <em>Database Owner</em> (Israeli PPL) in respect of personal data belonging to your leads, callers, and customers that flows through the Boltcall platform.</p>
            <p><strong>Boltcall</strong> is the <em>Data Processor</em> (GDPR) / <em>Database Holder</em> (Israeli PPL). We process personal data on your behalf only as instructed by you and as described in this DPA.</p>
            <p>In respect of account data you provide about yourself or your team, Boltcall is an independent Data Controller. See our <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a> for that processing.</p>
          </div>
        </motion.div>

        {/* SECTION 2 — Processing Details */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-green-50 rounded-lg shrink-0"><Database className="w-5 h-5 text-green-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">2. Processing Details</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-4">
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Categories of data subjects</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Your inbound callers and leads</li>
                <li>Existing customers who interact with your AI agent</li>
                <li>Recipients of SMS, WhatsApp, or email sequences you configure</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Categories of personal data</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Name, phone number, email address</li>
                <li>Call recordings and conversation transcripts</li>
                <li>Appointment details and calendar data</li>
                <li>Lead qualification answers and intent signals</li>
                <li>IP address and device information (for web interactions)</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Purpose &amp; duration</h3>
              <p>Processing is solely to provide the Boltcall Service as described in the Terms of Service. Duration is for the term of your subscription plus the retention periods in our Privacy Policy.</p>
            </div>
          </div>
        </motion.div>

        {/* SECTION 3 — Boltcall Obligations */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg shrink-0"><Lock className="w-5 h-5 text-purple-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">3. Boltcall's Obligations</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-2">
            <ul className="list-disc list-inside space-y-2">
              <li>Process personal data only on your documented instructions (or as required by applicable law)</li>
              <li>Ensure that personnel authorised to process personal data are bound to confidentiality</li>
              <li>Implement appropriate technical and organisational security measures (encryption at rest and in transit, access controls, least-privilege)</li>
              <li>Assist you in responding to data subject requests (access, correction, erasure) within 7 business days of your request</li>
              <li>Notify you without undue delay (and within 72 hours where feasible) upon becoming aware of a personal data breach affecting your customers' data</li>
              <li>Delete or return all personal data at your request upon termination of the Service</li>
              <li>Provide information reasonably necessary for you to demonstrate compliance with applicable law</li>
            </ul>
          </div>
        </motion.div>

        {/* SECTION 4 — Customer Obligations */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Customer's Obligations</h2>
          <div className="text-gray-700 text-sm leading-relaxed space-y-2">
            <ul className="list-disc list-inside space-y-2">
              <li>Have a lawful basis (consent, legitimate interest, or contract) to collect and process your customers' personal data through the Service</li>
              <li>Comply with Israeli Communications Law Amendment 40 (anti-spam): obtain explicit prior opt-in before sending promotional SMS, WhatsApp, or email campaigns</li>
              <li>Ensure callers are notified of call recording as required by Israeli Wiretapping Law and equivalent local laws</li>
              <li>Provide your own privacy notice to your customers that covers processing through Boltcall</li>
              <li>Not instruct Boltcall to process personal data in a manner that would violate applicable law</li>
            </ul>
          </div>
        </motion.div>

        {/* SECTION 5 — Sub-processors */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-yellow-50 rounded-lg shrink-0"><Globe className="w-5 h-5 text-yellow-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">5. Sub-Processors</h2>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed mb-5">
            You provide general authorisation for Boltcall to engage the sub-processors listed below. We will notify you at least 14 days before adding or replacing a sub-processor that processes your customers' data.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-3 font-semibold text-gray-900">Sub-processor</th>
                  <th className="text-left p-3 font-semibold text-gray-900">Purpose</th>
                  <th className="text-left p-3 font-semibold text-gray-900">Location</th>
                </tr>
              </thead>
              <tbody>
                {subprocessors.map((sp, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}>
                    <td className="p-3">
                      <a href={sp.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                        {sp.name}
                      </a>
                    </td>
                    <td className="p-3 text-gray-700">{sp.purpose}</td>
                    <td className="p-3 text-gray-600">{sp.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* SECTION 6 — International Transfers */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. International Data Transfers</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-gray-800 space-y-3">
            <p><strong>Disclosure required by Israeli PPL Amendment 13:</strong> The majority of sub-processors listed above are located in the United States, which is not on Israel's list of countries with adequate data protection. Data transferred to these processors is protected by contractual safeguards (Standard Contractual Clauses / equivalent data processing agreements with each sub-processor).</p>
            <p>Core customer data (account records, leads, conversation history) is stored in Supabase (AWS us-east-1, United States). If your business requires Israeli or EU data residency, contact <a href="mailto:privacy@boltcall.org" className="text-blue-600 hover:underline">privacy@boltcall.org</a> to discuss options.</p>
          </div>
        </motion.div>

        {/* SECTION 7 — Security */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Security Measures</h2>
          <div className="text-gray-700 text-sm leading-relaxed space-y-2">
            <ul className="list-disc list-inside space-y-2">
              <li>All data is encrypted in transit (TLS 1.2+) and at rest (AES-256)</li>
              <li>Access to production systems is restricted by role and requires multi-factor authentication</li>
              <li>Authentication managed by Supabase (Auth v2) with hashed passwords and JWT session tokens</li>
              <li>Call recordings are stored with server-side encryption in Retell's infrastructure</li>
              <li>Regular review of access controls and third-party sub-processor security postures</li>
            </ul>
          </div>
        </motion.div>

        {/* SECTION 8 — Contact */}
        <motion.div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-5">8. Contact &amp; DPA Requests</h2>
          <div className="text-sm text-gray-700 space-y-3">
            <p>To sign a countersigned DPA for enterprise contracts, or to submit data subject requests on behalf of your customers:</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0"><Mail className="w-4 h-4 text-blue-600" /></div>
              <a href="mailto:privacy@boltcall.org" className="text-blue-600 hover:underline font-medium">privacy@boltcall.org</a>
            </div>
            <p className="text-gray-500 mt-4">Related documents: <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a> · <a href="/terms-of-service" className="text-blue-600 hover:underline">Terms of Service</a> · <a href="/law-firm-security" className="text-blue-600 hover:underline">Security for Law Firms</a></p>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default DPA;
