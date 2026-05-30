/**
 * ClientWelcomePage — first-visit experience (placeholder).
 *
 * Real implementation from client-welcome-agent: personalized welcome video,
 * build-progress timeline, phone-number reveal, inline Cal.com intake
 * scheduler. Auto-redirects to /dashboard/client after intake is booked.
 */
import React from 'react';
import ClientPagePlaceholder from './_ClientPagePlaceholder';

const ClientWelcomePage: React.FC = () => (
  <ClientPagePlaceholder
    title="Welcome to Boltcall"
    description="A short personal video and your next 7 days, mapped."
  />
);

export default ClientWelcomePage;
