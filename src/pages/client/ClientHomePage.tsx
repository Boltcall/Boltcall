/**
 * ClientHomePage — Boltcall client portal home (placeholder).
 *
 * The real implementation lands from the client-home-ask branch and will
 * include: <HeroStatus />, <AskBoltcallAI />, <DailyDigestCard />,
 * <PendingApprovalsRibbon />, <LiveCallTicker />.
 *
 * This stub keeps the wiring branch buildable.
 */
import React from 'react';
import ClientPagePlaceholder from './_ClientPagePlaceholder';

const ClientHomePage: React.FC = () => (
  <ClientPagePlaceholder
    title="Home"
    description="Today's pipeline, your strategist's note, and anything that needs you."
  />
);

export default ClientHomePage;
