import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Send, Loader2, Download, ExternalLink, Globe } from 'lucide-react';
import ServiceEmptyState from '../../components/dashboard/ServiceEmptyState';
import { CopyButton } from '../../components/ui/copy-button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const WebsiteInstantResponsePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [setupMode, setSetupMode] = useState<'embed' | 'wordpress' | 'advanced'>('embed');
  const [testSending, setTestSending] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const webhookUrl = 'https://boltcall.org/.netlify/functions/lead-webhook';
  const prettyWebhookUrl = user?.id ? `https://boltcall.org/l/${user.id}` : '';

  const embedSnippet = user?.id
    ? `<script src="https://boltcall.org/form.js" data-user-id="${user.id}"></script>

<!-- Add data-boltcall to any form you want to capture: -->
<form data-boltcall>
  <input name="name" placeholder="Your name" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="phone" placeholder="Phone" />
  <button type="submit">Get Started</button>
</form>`
    : '<!-- Log in to see your install tag -->';

  const fetchSnippet = user?.id
    ? `fetch("${prettyWebhookUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890",
    source: "website_form"
  })
})`
    : '// Log in to see your endpoint';

  const htmlFormSnippet = user?.id
    ? `<form id="lead-form">
  <input name="name" placeholder="Your name" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="phone" placeholder="Phone" />
  <button type="submit">Get Started</button>
</form>

<script>
document.getElementById("lead-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await fetch("${prettyWebhookUrl}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        source: "website_form"
      })
    });
    alert("Thanks! We'll be in touch.");
  });
</script>`
    : '<!-- Log in to see your endpoint -->';

  const handleSendTestLead = async () => {
    if (!user?.id) {
      showToast({ message: 'You must be logged in to send a test lead.', variant: 'error' });
      return;
    }
    setTestSending(true);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Lead',
          email: `test+${Date.now()}@example.com`,
          phone: '+1234567890',
          source: 'test_webhook',
          user_id: user.id,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showToast({ message: 'Test lead sent successfully! Check your Leads page.', variant: 'success' });
      } else {
        showToast({ message: `Test failed: ${result.error || 'Unknown error'}`, variant: 'error' });
      }
    } catch {
      showToast({ message: 'Failed to send test lead. Check your network connection.', variant: 'error' });
    } finally {
      setTestSending(false);
    }
  };

  if (!showInstructions) {
    return (
      <ServiceEmptyState
        icon={<Globe className="w-7 h-7 text-purple-600" />}
        iconBg="bg-purple-50"
        title="Website Instant Response"
        description="Capture every form submission on your site and trigger an instant AI follow-up. Works with any platform — one line of code or a WordPress plugin."
        setupLabel="Get Setup Instructions"
        onSetup={() => setShowInstructions(true)}
      />
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Website Instant Response</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Every form submission on your site gets an instant follow-up. Works with any platform — no code changes required.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] p-6 space-y-6"
      >
        {/* Tab switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setSetupMode('embed')}
            className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              setupMode === 'embed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Embed <span className="text-purple-600 font-semibold text-xs">· Easiest</span>
          </button>
          <button
            onClick={() => setSetupMode('wordpress')}
            className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              setupMode === 'wordpress' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            WordPress
          </button>
          <button
            onClick={() => setSetupMode('advanced')}
            className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              setupMode === 'advanced' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            API
          </button>
        </div>

        {/* Embed tab */}
        {setupMode === 'embed' && (
          <div className="space-y-5">
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 text-sm mb-2">How it works</h4>
              <ol className="text-sm text-purple-900/80 space-y-1.5 list-decimal list-inside">
                <li>Paste the tag below into your site's HTML (before <code className="bg-white px-1 rounded">&lt;/body&gt;</code>)</li>
                <li>Add <code className="bg-white px-1 rounded">data-boltcall</code> to any form you want to capture</li>
                <li>Submissions flow into your Leads page instantly</li>
              </ol>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 text-sm">Install tag</h4>
                <CopyButton textToCopy={embedSnippet} className="py-1 px-3 text-xs h-auto" />
              </div>
              <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                {embedSnippet}
              </pre>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <h4 className="font-medium text-gray-900 mb-2">Optional form attributes</h4>
              <ul className="space-y-1.5 text-gray-600">
                <li><code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-xs">data-success-message="..."</code> — custom thank-you text</li>
                <li><code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-xs">data-success-url="/thanks"</code> — redirect after submit</li>
                <li><code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-xs">data-source="homepage-hero"</code> — tag the lead source</li>
              </ul>
            </div>

            <details className="bg-gray-50 rounded-lg p-4 text-sm">
              <summary className="font-medium text-gray-900 cursor-pointer">Capture every form on the page</summary>
              <p className="text-gray-600 mt-2">
                Add <code className="bg-white px-1 rounded">data-auto="true"</code> to the script tag to listen to every form on the page — no edits needed to individual forms.
              </p>
            </details>
          </div>
        )}

        {/* WordPress tab */}
        {setupMode === 'wordpress' && (
          <div className="space-y-5">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 bg-[#21759b] text-white text-xs font-bold rounded-full">1</span>
                <h4 className="font-medium text-gray-900 text-sm">Download the plugin</h4>
              </div>
              <a
                href="/wordpress/boltcall-for-wordpress.zip"
                download
                className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-[#21759b] text-white rounded-lg hover:bg-[#1a5f7f] transition-colors font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                Download boltcall-for-wordpress.zip
              </a>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 bg-[#21759b] text-white text-xs font-bold rounded-full">2</span>
                <h4 className="font-medium text-gray-900 text-sm">Upload to WordPress</h4>
              </div>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside ml-1">
                <li>Log into your WordPress admin</li>
                <li>Go to <strong>Plugins → Add New → Upload Plugin</strong></li>
                <li>Choose the ZIP, click <strong>Install Now</strong>, then <strong>Activate</strong></li>
              </ol>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 bg-[#21759b] text-white text-xs font-bold rounded-full">3</span>
                <h4 className="font-medium text-gray-900 text-sm">Paste your Boltcall User ID</h4>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                In WordPress, go to <strong>Settings → Boltcall</strong> and paste this ID:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-white px-3 py-2 rounded border border-gray-200 break-all text-gray-800 font-mono">
                  {user?.id || 'Loading...'}
                </code>
                {user?.id && (
                  <CopyButton textToCopy={user.id} label="" copiedLabel="" className="p-2 px-2 h-auto flex-shrink-0" />
                )}
              </div>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 text-sm mb-2">Captured automatically</h4>
              <div className="grid grid-cols-2 gap-y-1 gap-x-3 text-sm text-green-900/80">
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Contact Form 7</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> WPForms</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Gravity Forms</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Elementor Pro</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Ninja Forms</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Fluent Forms</div>
              </div>
            </div>

            <a
              href="https://boltcall.mintlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ExternalLink className="w-4 h-4" />
              Full WordPress setup docs
            </a>
          </div>
        )}

        {/* API tab */}
        {setupMode === 'advanced' && (
          <div className="space-y-5">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your webhook URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-white px-3 py-2 rounded border border-gray-200 break-all text-gray-800">
                  {prettyWebhookUrl || webhookUrl}
                </code>
                <CopyButton textToCopy={prettyWebhookUrl || webhookUrl} label="" copiedLabel="" className="p-2 px-2 h-auto flex-shrink-0" />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                POST any JSON with <code className="bg-white px-1 rounded">email</code> or <code className="bg-white px-1 rounded">phone</code>. Your account is encoded in the URL — no <code className="bg-white px-1 rounded">user_id</code> needed in the body.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 text-sm">JavaScript (fetch)</h4>
                <CopyButton textToCopy={fetchSnippet} className="py-1 px-3 text-xs h-auto" />
              </div>
              <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                {fetchSnippet}
              </pre>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 text-sm">HTML form example</h4>
                <CopyButton textToCopy={htmlFormSnippet} className="py-1 px-3 text-xs h-auto" />
              </div>
              <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                {htmlFormSnippet}
              </pre>
            </div>
          </div>
        )}

        <button
          onClick={handleSendTestLead}
          disabled={testSending || !user?.id}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {testSending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending test lead...</>
          ) : (
            <><Send className="w-4 h-4" /> Send Test Lead</>
          )}
        </button>
      </motion.div>
    </div>
  );
};

export default WebsiteInstantResponsePage;
