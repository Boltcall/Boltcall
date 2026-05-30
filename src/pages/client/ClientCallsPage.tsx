/**
 * ClientCallsPage — full call history (placeholder).
 *
 * Real implementation from client-calls-insights: call list with per-call AI
 * summary + QA score, transcript viewer, auto-tagged outcomes, "calls that
 * went sideways" filter.
 */
import React from 'react';
import ClientPagePlaceholder from './_ClientPagePlaceholder';

const ClientCallsPage: React.FC = () => (
  <ClientPagePlaceholder
    title="Calls"
    description="Every call, with a one-line summary and full transcript."
  />
);

export default ClientCallsPage;
