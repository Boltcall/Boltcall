/**
 * ClientAgentPage — the agent's living profile (placeholder).
 *
 * Real implementation from client-welcome-agent: editable Business Brief
 * with confidence highlighting, plain-language prompt summary, live
 * stress-test panel, recent calls.
 */
import React from 'react';
import ClientPagePlaceholder from './_ClientPagePlaceholder';

const ClientAgentPage: React.FC = () => (
  <ClientPagePlaceholder
    title="Your agent"
    description="The brief your agent answers from, plus a way to test it live."
  />
);

export default ClientAgentPage;
