/**
 * ClientCirclePage — cohort hub, Day 14+ (placeholder).
 *
 * Real implementation from client-circle-approvals-settings: cohort member
 * cards (anonymized unless mutual opt-in), "this week in your cohort" feed,
 * one-tap apply on peer experiments, weekly AI Cohort Pulse.
 *
 * NOTE: The sidebar hides this link before Day 14 since cohort matching
 * needs 2 weeks of data. A direct early visit lands here; the real
 * implementation should show a "your cohort is being matched — back on
 * day X" state for sub-14-day clients.
 */
import React from 'react';
import ClientPagePlaceholder from './_ClientPagePlaceholder';

const ClientCirclePage: React.FC = () => (
  <ClientPagePlaceholder
    title="Circle"
    description="Your peer cohort — what they're testing, what's working."
  />
);

export default ClientCirclePage;
