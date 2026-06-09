import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Copy, RotateCw, Eye, EyeOff } from 'lucide-react';
import { PopButton } from '../../components/ui/pop-button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTokens } from '../../contexts/TokenContext';
import { supabase } from '../../lib/supabase';
import { authedFetch } from '../../lib/authedFetch';

interface FacebookConnection {
  id: string;
  page_id: string;
  page_name: string | null;
  created_at: string;
}

const GOOGLE_WEBHOOK_URL = 'https://boltcall.org/.netlify/functions/google-leads-webhook';

const AdInstantResponsePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { claimReward } = useTokens();

  const [fbConnections, setFbConnections] = useState<FacebookConnection[]>([]);
  const [fbLoading, setFbLoading] = useState(true);
  const [fbConnecting, setFbConnecting] = useState(false);

  const [googleKey, setGoogleKey] = useState<string | null>(null);
  const [googleKeyLoading, setGoogleKeyLoading] = useState(true);
  const [googleKeyRotating, setGoogleKeyRotating] = useState(false);
  const [googleKeyRevealed, setGoogleKeyRevealed] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);

  useEffect(() => {
    const fetchConnections = async () => {
      if (!user?.id) return;
      setFbLoading(true);
      try {
        const { data, error } = await supabase
          .from('facebook_page_connections')
          .select('id, page_id, page_name, created_at')
          .or(`workspace_id.eq.${user.id},user_id.eq.${user.id}`);

        if (error) {
          console.error('Error fetching FB connections:', error);
        } else {
          setFbConnections(data || []);
          if (data && data.length > 0) {
            claimReward('connect_facebook').then((result) => {
              if (result?.success && !result?.alreadyClaimed) {
                showToast({ title: 'Bonus Tokens!', message: '+75 tokens earned for connecting Facebook Ads', variant: 'success', duration: 4000 });
              }
            });
          }
        }
      } catch (err) {
        console.error('Error fetching FB connections:', err);
      } finally {
        setFbLoading(false);
      }
    };
    fetchConnections();
  }, [user?.id]);

  useEffect(() => {
    const fetchGoogleKey = async () => {
      if (!user?.id) return;
      setGoogleKeyLoading(true);
      try {
        const { data, error } = await supabase
          .from('business_features')
          .select('google_lead_form_key')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) {
          console.error('Error fetching Google Ads key:', error);
        } else {
          setGoogleKey(data?.google_lead_form_key || null);
        }
      } catch (err) {
        console.error('Error fetching Google Ads key:', err);
      } finally {
        setGoogleKeyLoading(false);
      }
    };
    fetchGoogleKey();
  }, [user?.id]);

  const copyToClipboard = async (text: string, label: string) => {
    // navigator.clipboard is unavailable in insecure contexts (e.g. older
    // mobile webviews on http: previews) — fall back to a hidden textarea
    // + document.execCommand('copy') so the button doesn't silently fail.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
        } finally {
          document.body.removeChild(ta);
        }
      }
      showToast({ message: `${label} copied`, variant: 'success', duration: 2000 });
    } catch {
      showToast({ message: `Couldn't copy ${label}. Select the text manually.`, variant: 'error' });
    }
  };

  const performRotateGoogleKey = async () => {
    if (!user?.id) return;
    setShowRotateConfirm(false);
    setGoogleKeyRotating(true);
    try {
      // Server-side rotation: the endpoint uses crypto.randomBytes(32) so the
      // generated key is cryptographically secure. Client-side Math.random
      // fallback would let an attacker brute-force the key in older browsers.
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/google-leads-rotate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
        },
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        console.error('Rotate failed:', detail);
        showToast({ message: 'Failed to rotate key. Try again.', variant: 'error' });
        return;
      }
      const data = await res.json();
      if (!data?.google_lead_form_key) {
        showToast({ message: 'Failed to rotate key. Try again.', variant: 'error' });
        return;
      }
      setGoogleKey(data.google_lead_form_key);
      setGoogleKeyRevealed(true);
      showToast({ message: 'New Google Ads key generated. Update it in Google Ads.', variant: 'success' });
    } catch (err) {
      console.error('Error rotating Google Ads key:', err);
      showToast({ message: 'Failed to rotate key. Try again.', variant: 'error' });
    } finally {
      setGoogleKeyRotating(false);
    }
  };

  const maskedKey = googleKey
    ? googleKeyRevealed
      ? googleKey
      : `${googleKey.slice(0, 4)}${'•'.repeat(Math.max(googleKey.length - 8, 4))}${googleKey.slice(-4)}`
    : '';

  const handleConnectFacebook = async () => {
    if (!user?.id) {
      showToast({ message: 'Please sign in before connecting Facebook.', variant: 'error' });
      return;
    }
    setFbConnecting(true);
    try {
      const response = await authedFetch(
        `/.netlify/functions/facebook-auth-start?user_id=${encodeURIComponent(user.id)}`,
      );
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast({ message: 'Failed to start Facebook connection. Please try again.', variant: 'error' });
      }
    } catch {
      showToast({ message: 'Error connecting to Facebook. Please try again.', variant: 'error' });
    } finally {
      setFbConnecting(false);
    }
  };

  const isConnected = fbConnections.length > 0;

  return (
    <div className="max-w-2xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-gray-900">Ad Instant Response</h1>
        <p className="mt-1 text-gray-500">
          Connect your ad platforms so every lead from your campaigns gets followed up the moment they come in.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
      >
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Facebook Ads</h3>
            <p className="text-sm text-gray-500">Lead Ads → instant follow-up</p>
          </div>
          {isConnected && (
            <div className="ml-auto flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" />
              Connected
            </div>
          )}
        </div>

        {fbLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking connection status...
          </div>
        ) : isConnected ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-900">Connected</h4>
            </div>
            <p className="text-green-700 text-sm mb-3">
              New leads from your Lead Ads will automatically appear in your Leads page and get an instant follow-up.
            </p>
            <div className="space-y-2">
              {fbConnections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between bg-white rounded-md px-3 py-2 text-sm">
                  <span className="font-medium text-gray-900">{conn.page_name || conn.page_id}</span>
                  <span className="text-gray-500 text-xs">
                    Connected {new Date(conn.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Connect Your Facebook Page</h4>
            <p className="text-sm text-gray-600">
              Authorize Boltcall to receive leads from your Facebook Lead Ads in real time. Your AI follows up instantly via SMS or email — before your competitors even see the notification.
            </p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2 text-sm">How it works</h4>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Click "Connect Facebook" and authorize Boltcall</li>
            <li>Select the Facebook Page(s) running Lead Ads</li>
            <li>New leads are captured in real-time as they submit your ad form</li>
            <li>Your AI follows up instantly via SMS/email</li>
          </ol>
        </div>

        <PopButton color="blue" onClick={handleConnectFacebook} disabled={fbConnecting} className="w-full gap-2">
          {fbConnecting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
          ) : isConnected ? (
            'Reconnect Facebook'
          ) : (
            'Connect Facebook'
          )}
        </PopButton>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
      >
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Google Ads</h3>
            <p className="text-sm text-gray-500">Lead Form Asset webhook → instant follow-up</p>
          </div>
          {googleKey && (
            <div
              className="ml-auto flex items-center gap-1 bg-gray-50 text-gray-700 text-xs font-medium px-2 py-1 rounded-full"
              title="A key has been generated for your workspace. Paste it into Google Ads to start receiving leads."
            >
              <CheckCircle className="w-3 h-3" />
              Key generated
            </div>
          )}
        </div>

        {googleKeyLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading your Google Ads webhook details...
          </div>
        ) : !googleKey ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-900">No webhook key yet</p>
            <p className="text-xs text-amber-700 mt-1 mb-3">
              Generate a key to start forwarding Google Ads Lead Form submissions to Boltcall.
            </p>
            <button
              type="button"
              onClick={() => setShowRotateConfirm(true)}
              disabled={googleKeyRotating}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md disabled:opacity-40"
            >
              {googleKeyRotating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
              Generate webhook key
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide" htmlFor="google-webhook-url">
                  Webhook URL
                </label>
                <div className="mt-1 flex flex-wrap items-stretch gap-2">
                  <code
                    id="google-webhook-url"
                    className="flex-1 min-w-0 truncate bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-800 font-mono"
                  >
                    {GOOGLE_WEBHOOK_URL}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(GOOGLE_WEBHOOK_URL, 'Webhook URL')}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide" htmlFor="google-webhook-key">
                  Key
                </label>
                <div className="mt-1 flex flex-wrap items-stretch gap-2">
                  <code
                    id="google-webhook-key"
                    className="flex-1 min-w-0 truncate bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-800 font-mono"
                    aria-label={googleKeyRevealed ? 'Webhook key, revealed' : 'Webhook key, masked'}
                  >
                    {maskedKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => setGoogleKeyRevealed((v) => !v)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                    aria-label={googleKeyRevealed ? 'Hide key' : 'Reveal key'}
                  >
                    {googleKeyRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {googleKeyRevealed ? 'Hide' : 'Reveal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(googleKey, 'Key')}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRotateConfirm(true)}
                    disabled={googleKeyRotating}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-md disabled:opacity-40"
                  >
                    {googleKeyRotating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                    Rotate
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Keep this key private — anyone with it can submit leads to your workspace.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 text-sm">How to set it up in Google Ads</h4>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>In Google Ads, open <strong>Assets → Lead forms</strong> and edit the form you want to forward.</li>
                <li>Scroll to <strong>"Lead delivery options"</strong> → <strong>Webhook integration</strong>.</li>
                <li>Paste the <strong>Webhook URL</strong> and <strong>Webhook Key</strong> above.</li>
                <li>Click <strong>"Send test data"</strong> in Google Ads to verify. You should see a 200 response.</li>
                <li>Save the form. New submissions appear in your Leads page within seconds, with an instant AI follow-up call.</li>
              </ol>
              <p className="text-xs text-gray-500 mt-3">
                No Google account connection or OAuth needed — Google posts leads directly to Boltcall.
              </p>
            </div>
          </>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center"
      >
        <p className="text-sm text-gray-500 font-medium">TikTok Ads — coming soon</p>
        <p className="text-xs text-gray-400 mt-1">Same instant response for every ad platform you run</p>
      </motion.div>

      {/* Rotate-key confirmation — modal instead of window.confirm so the
          framing reads as clearly destructive and we don't strand the user
          on a tiny native dialog. */}
      {showRotateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Rotate the Google Ads key?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Your <strong>current key will stop working immediately</strong> after rotation. Any Google Ads Lead Form
              configured with the old key will fail to deliver leads until you paste the new key into the form.
            </p>
            <ul className="mt-3 text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>Open Google Ads → Assets → Lead forms → "Lead delivery options".</li>
              <li>Replace the old key with the new one we'll generate.</li>
              <li>Save the form. Test delivery with "Send test data".</li>
            </ul>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRotateConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={performRotateGoogleKey}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Rotate key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdInstantResponsePage;
