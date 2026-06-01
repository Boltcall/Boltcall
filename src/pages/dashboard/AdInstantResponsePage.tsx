import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import ServiceEmptyState from '../../components/dashboard/ServiceEmptyState';
import { PopButton } from '../../components/ui/pop-button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTokens } from '../../contexts/TokenContext';
import { supabase } from '../../lib/supabase';

interface FacebookConnection {
  id: string;
  page_id: string;
  page_name: string | null;
  created_at: string;
}

const AdInstantResponsePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { claimReward } = useTokens();

  const [fbConnections, setFbConnections] = useState<FacebookConnection[]>([]);
  const [fbLoading, setFbLoading] = useState(true);
  const [fbConnecting, setFbConnecting] = useState(false);

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

  const handleConnectFacebook = async () => {
    if (!user?.id) {
      showToast({ message: 'Please sign in before connecting Facebook.', variant: 'error' });
      return;
    }
    setFbConnecting(true);
    try {
      const response = await fetch(
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

  if (!fbLoading && !isConnected) {
    return (
      <ServiceEmptyState
        icon={
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        }
        iconBg="bg-blue-600"
        title="Connect Facebook Ads"
        description="Link your Facebook Lead Ads so every new lead gets an instant AI follow-up — before your competitors even see the notification."
        setupLabel={fbConnecting ? 'Connecting...' : 'Connect Facebook Ads'}
        onSetup={handleConnectFacebook}
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
        className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center"
      >
        <p className="text-sm text-gray-500 font-medium">Google Ads & TikTok Ads — coming soon</p>
        <p className="text-xs text-gray-400 mt-1">Same instant response for every ad platform you run</p>
      </motion.div>
    </div>
  );
};

export default AdInstantResponsePage;
