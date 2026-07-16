import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Calendar, CheckCircle, XCircle, Link2 } from 'lucide-react';
import ServiceEmptyState from '../../components/dashboard/ServiceEmptyState';
import { PopButton } from '../../components/ui/pop-button';
import { PageSkeleton } from '../../components/ui/loading-skeleton';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';

const WEBHOOK_URL = 'https://boltcall.org/.netlify/functions/appointment-handler';

const CalcomPage: React.FC = () => {
  const { user } = useAuth();
  const handleError = useErrorHandler();
  const [loading, setLoading] = useState(true);
  const [calConnected, setCalConnected] = useState(false);
  const [webhookId, setWebhookId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('business_features')
          .select('reminders_config')
          .eq('user_id', user.id)
          .single();

        if (data?.reminders_config) {
          const cfg = data.reminders_config as Record<string, any>;
          setCalConnected(!!cfg.cal_connected);
          setWebhookId(cfg.cal_webhook_id || null);
        }
      } catch (err) {
        handleError('calcom: load connection status', err, {
          message: 'Could not load your Cal.com connection status.',
          metadata: { userId: user.id },
        });
      }
      setLoading(false);
    })();
  }, [user, handleError]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (!calConnected) {
    return (
      <ServiceEmptyState
        icon={<Calendar className="w-7 h-7 text-purple-600" />}
        iconBg="bg-purple-50"
        title="Cal.com Not Connected"
        description="Connect your Cal.com account to enable appointment reminders and automatic review requests after every booking."
        setupLabel="Connect Cal.com"
        setupTo="/dashboard/reminders"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <img
            src="/cal.com_logo.png"
            alt="Cal.com"
            className="w-10 h-10"
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cal.com Integration</h1>
            <p className="text-gray-600">Appointment booking webhook status</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium ${
              calConnected
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                calConnected ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            {calConnected ? 'Connected' : 'Not Connected'}
          </span>
          <PopButton color="blue" size="sm" asChild>
            <a
              href="https://app.cal.com"
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Cal.com
            </a>
          </PopButton>
        </div>
      </motion.div>

      {/* Connection Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Link2 className="w-4 h-4 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Webhook Status</h2>
        </div>

        <div className="space-y-4">
          {/* Connection status */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
            {calConnected ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {calConnected ? 'Webhook Active' : 'Webhook Not Configured'}
              </p>
              <p className="text-xs text-gray-500">
                {calConnected
                  ? 'Cal.com is sending booking events to your appointment handler.'
                  : 'Connect Cal.com from the Reminders page to activate appointment webhooks.'}
              </p>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-1">Webhook Endpoint</p>
            <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded break-all">
              {WEBHOOK_URL}
            </code>
          </div>

          {/* Webhook ID */}
          {webhookId && (
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">Webhook ID</p>
              <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {webhookId}
              </code>
            </div>
          )}

          {/* Events listened */}
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Listening for Events</p>
            <div className="flex flex-wrap gap-2">
              {['BOOKING_CREATED', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED'].map((evt) => (
                <span
                  key={evt}
                  className={`text-xs px-2 py-1 rounded-full ${
                    calConnected
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {evt}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-blue-50 rounded-lg border border-blue-200 p-6"
      >
        <h3 className="text-lg font-medium text-blue-900 mb-2">How It Works</h3>
        <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
          <li>When a booking is created in Cal.com, we store it as an appointment</li>
          <li>If SMS reminders are enabled, a reminder is scheduled before the appointment</li>
          <li>If the Reputation Manager is enabled, a review request is scheduled after the appointment</li>
          <li>When a booking is cancelled, all pending messages are automatically cancelled</li>
          <li>When rescheduled, message times are recalculated automatically</li>
        </ul>
      </motion.div>

    </div>
  );
};

export default CalcomPage;
