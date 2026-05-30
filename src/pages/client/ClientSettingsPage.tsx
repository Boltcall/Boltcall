/**
 * ClientSettingsPage — portal settings (placeholder).
 *
 * Real implementation from client-circle-approvals-settings: business hours
 * editor, voice picker with AI-generated sample of each voice answering one
 * of the client's actual call types, notification router (push/SMS/email),
 * team members manager, billing portal link, smart pause/resume.
 */
import React from 'react';
import ClientPagePlaceholder from './_ClientPagePlaceholder';

const ClientSettingsPage: React.FC = () => (
  <ClientPagePlaceholder
    title="Settings"
    description="Hours, voice, alerts, team, billing — your portal's switches."
  />
);

export default ClientSettingsPage;
