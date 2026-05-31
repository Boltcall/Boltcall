/**
 * CohortRoster — anonymized peer list for /client/circle.
 *
 * Members come from slack-adapter.listCohortMembers, anonymized unless mutual
 * opt-in surfaces a real label upstream. We deliberately render no avatars,
 * no "online" dots, no profile pictures — anonymization is the contract.
 *
 * Design principles applied:
 *   - Principle 1 (no chatbot): plain card layout. No bubbles.
 *   - Principle 3 (founder invisible): copy says "your circle", not
 *     "Noam's hand-picked peers".
 *   - Principle 7 (structural personalization): label text changes per
 *     member; no template placeholders.
 */

import React from 'react';
import { Users } from 'lucide-react';

export interface CohortRosterMember {
  user_id: string;
  business_label_anonymized: string;
}

interface CohortRosterProps {
  members: CohortRosterMember[];
  isLoading?: boolean;
}

const CohortRoster: React.FC<CohortRosterProps> = ({
  members,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="text-sm font-semibold text-text-main">Your circle</h3>
        <p className="mt-1 text-xs text-text-muted">Loading peers…</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-main">Your circle</h3>
        </div>
        <p className="mt-3 text-sm text-text-muted">
          Matching you with peers in your vertical and revenue tier — back
          within a few days. Pulse will land here once your circle is seated.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-main">Your circle</h3>
        </div>
        <span className="text-xs text-text-muted">
          {members.length} {members.length === 1 ? 'peer' : 'peers'}
        </span>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Hand-picked operators in your vertical and revenue tier. Geographies
        never overlap.
      </p>

      <ul className="mt-4 divide-y divide-border">
        {members.map((m) => (
          <li
            key={m.user_id}
            className="flex items-center justify-between py-3 text-sm"
          >
            <span className="text-text-main">
              {m.business_label_anonymized}
            </span>
            <span className="text-xs text-text-muted">peer</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CohortRoster;
