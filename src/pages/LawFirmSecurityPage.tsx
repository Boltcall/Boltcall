import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Scale,
  Database,
  UserX,
  FileCheck,
  AlertTriangle,
  Mail,
} from 'lucide-react';
import { updateMetaDescription } from '../lib/utils';

const LawFirmSecurityPage: React.FC = () => {
  React.useEffect(() => {
    document.title = 'Security & Compliance for Law Firms - Boltcall';
    updateMetaDescription(
      'How Boltcall handles confidentiality, data security, and AI guardrails for law firm intake calls. No legal advice given, no attorney-client relationship formed, encrypted data, no training on your calls.'
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
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Security &amp; Compliance for Law Firms</h1>
              <p className="text-gray-600 text-lg">How Boltcall handles intake calls at a firm that has to get this right</p>
            </div>
          </motion.div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
            This page summarizes our security and compliance posture for law firms evaluating Boltcall for call intake. It is not a substitute for our{' '}
            <Link to="/terms-of-service" className="underline">Terms of Service</Link> or{' '}
            <Link to="/dpa" className="underline">Data Processing Agreement</Link>, which govern the relationship.
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-8">

        {/* SECTION 1 — What the AI is and isn't */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-red-50 rounded-lg shrink-0"><UserX className="w-5 h-5 text-red-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">Intake only — never advice</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>Boltcall's law firm agent is built with hard rules it cannot be talked out of:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Never gives legal advice, in any form — not "in general," not "typically"</li>
              <li>Never assesses whether a caller has a case, or predicts an outcome</li>
              <li>Never quotes fees beyond your general structure (e.g. contingency, free consultation)</li>
              <li>Never tells a caller they may have missed a filing deadline — it collects the date and lets your attorney assess it</li>
              <li>Never states or implies an attorney-client relationship has been formed</li>
              <li>Escalates immediately on custody emergencies, domestic violence, or an imminent court date</li>
            </ul>
            <p>The agent's job is narrow on purpose: answer the call, collect the facts, book the consultation, and get out of the way. See the full rule set in our{' '}
              <Link to="/terms-of-service" className="text-blue-600 hover:underline">Terms of Service</Link>, Section 6 (AI Accuracy, Regulated Professions &amp; No Professional Advice).
            </p>
          </div>
        </motion.div>

        {/* SECTION 2 — Confidentiality */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg shrink-0"><Lock className="w-5 h-5 text-purple-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">Confidentiality</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>Callers are told upfront the call may be recorded and that they're speaking with an AI assistant, not an attorney — both required by law and built into every agent's opening line. The agent is instructed to keep confidentiality front of mind: no case details are shared outside the call record, and sensitive categories (SSN, financial account numbers, medical or criminal history) are flagged as data the agent should not collect during intake.</p>
            <p>Whether a specific intake call is protected by attorney-client privilege is a legal question that depends on your jurisdiction and how you use Boltcall — that determination is yours to make, not ours to promise.</p>
          </div>
        </motion.div>

        {/* SECTION 3 — Data handling */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-green-50 rounded-lg shrink-0"><Database className="w-5 h-5 text-green-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">Data handling</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-2">
            <ul className="list-disc list-inside space-y-2">
              <li>All data is encrypted in transit (TLS 1.2+) and at rest (AES-256)</li>
              <li>We do not use your callers' conversations to train shared AI models without your consent</li>
              <li>Access to production systems is restricted by role and requires multi-factor authentication</li>
              <li>Sub-processors (call/voice infrastructure, hosting, email) are listed in full in our{' '}
                <Link to="/dpa" className="text-blue-600 hover:underline">Data Processing Agreement</Link>, along with where each one is located</li>
              <li>You can request a data export or deletion at any time; on termination, data is retained for 30 days for export, then deleted per our{' '}
                <Link to="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link> retention schedule</li>
            </ul>
          </div>
        </motion.div>

        {/* SECTION 4 — Compliance posture */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0"><FileCheck className="w-5 h-5 text-blue-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">Compliance posture</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>Boltcall processes data as a processor under Israeli PPL Amendment 13 and EU GDPR where applicable — full detail, including international transfer disclosures, is in the{' '}
              <Link to="/dpa" className="text-blue-600 hover:underline">DPA</Link>. Enterprise customers can request a countersigned DPA.</p>
            <p><strong>What we don't claim:</strong> bar association advertising rules, UPL (unauthorized practice of law) requirements, and client-communication rules vary by state and practice area. Boltcall is a tool your firm configures and operates — you remain responsible for using it in a way that complies with the rules governing your practice.</p>
          </div>
        </motion.div>

        {/* SECTION 5 — What happens if something goes wrong */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-yellow-50 rounded-lg shrink-0"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">If something goes wrong</h2>
          </div>
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            <p>If your agent has repeated technical failures (calls dropping, not connecting), our monitoring detects it and emails your firm automatically within the hour — you're not finding out from a missed intake call. Every call is logged with a recording, transcript, and timestamp, so if something needs review, the record exists.</p>
            <p>AI is not error-free. It may mishear a name or a callback number — you should treat intake data as a starting point to verify, not a system of record for deadlines. Our liability terms are in{' '}
              <Link to="/terms-of-service" className="text-blue-600 hover:underline">Section 11</Link> of the Terms of Service.</p>
          </div>
        </motion.div>

        {/* SECTION 6 — FAQ */}
        <motion.div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg shrink-0"><ShieldCheck className="w-5 h-5 text-indigo-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">Common questions</h2>
          </div>
          <div className="space-y-5 text-sm">
            <div>
              <p className="font-semibold text-gray-900 mb-1">Does the AI ever give legal advice?</p>
              <p className="text-gray-700 leading-relaxed">No. It's configured to refuse — see Section 1 above. If a caller pushes, the agent's standard response is to offer a consultation with your attorney, not an opinion.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Do you train your AI models on our calls?</p>
              <p className="text-gray-700 leading-relaxed">No, not without your explicit consent.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Can we get a signed DPA for our records?</p>
              <p className="text-gray-700 leading-relaxed">Yes — email <a href="mailto:privacy@boltcall.org" className="text-blue-600 hover:underline">privacy@boltcall.org</a>.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Who is liable if the AI makes a mistake on an intake call?</p>
              <p className="text-gray-700 leading-relaxed">Our Terms of Service set out liability terms, including a cap and an indemnification clause. We'd rather you read the actual terms than a marketing summary of them — see{' '}
                <Link to="/terms-of-service" className="text-blue-600 hover:underline">Terms of Service</Link>.</p>
            </div>
          </div>
        </motion.div>

        {/* SECTION 7 — Contact */}
        <motion.div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-5">Questions before you sign up</h2>
          <div className="text-sm text-gray-700 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0"><Mail className="w-4 h-4 text-blue-600" /></div>
              <a href="mailto:legal@boltcall.org" className="text-blue-600 hover:underline font-medium">legal@boltcall.org</a>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link to="/tools/lawyer-intake-calculator" className="text-blue-600 hover:underline font-medium">Try the lawyer intake calculator →</Link>
              <Link to="/pricing" className="text-blue-600 hover:underline font-medium">See pricing →</Link>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default LawFirmSecurityPage;
