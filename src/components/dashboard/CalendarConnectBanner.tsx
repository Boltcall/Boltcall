import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { FUNCTIONS_BASE } from '../../lib/api';
import { authedFetch } from '../../lib/authedFetch';

const DISMISS_KEY = 'gcal_banner_dismissed';

/**
 * Persistent nudge: without a connected calendar the agent's
 * book_appointment / check_availability tools silently no-op.
 * Shows until Google Calendar is connected; dismiss lasts the session.
 */
const CalendarConnectBanner: React.FC<{ className?: string }> = ({ className }) => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user?.id || sessionStorage.getItem(DISMISS_KEY)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list', userId: user.id }),
        });
        const data = await res.json();
        const gcal = (data.integrations || []).find(
          (i: { provider?: string; is_connected?: boolean }) => i.provider === 'google_calendar'
        );
        if (!cancelled && gcal?.is_connected !== true) setShow(true);
      } catch {
        // Can't determine state — stay quiet rather than nag wrongly.
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!show) return null;

  return (
    <div className={`flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 ${className || ''}`}>
      <Calendar className="h-4 w-4 shrink-0 text-blue-600" />
      <p className="flex-1 text-sm text-blue-900">
        Connect your calendar so your agent can book jobs.{' '}
        <Link to="/dashboard/integrations" className="font-semibold underline underline-offset-2 hover:text-blue-700">
          Connect Google Calendar
        </Link>
      </p>
      <button
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1');
          setShow(false);
        }}
        className="text-blue-400 transition-colors hover:text-blue-700"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default CalendarConnectBanner;
