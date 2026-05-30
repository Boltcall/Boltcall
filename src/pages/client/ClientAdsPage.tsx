/**
 * ClientAdsPage — Bolt System SKU only (placeholder).
 *
 * Real implementation from client-ads-reports: live creative grid with AI
 * commentary, queued creatives awaiting client approval, "why this angle?"
 * explanation per variant, predicted CTR/CPL.
 *
 * NOTE: This route is rendered for non-Bolt-System clients too — the sidebar
 * hides the link for them, but a direct visit will land here. The real
 * implementation should detect the SKU and render an "ads aren't part of
 * your plan" state for non-Bolt-System users (which is a softer outcome
 * than 404'ing them).
 */
import React from 'react';
import ClientPagePlaceholder from './_ClientPagePlaceholder';

const ClientAdsPage: React.FC = () => (
  <ClientPagePlaceholder
    title="Ads"
    description="Live creative performance and queued variants for your review."
  />
);

export default ClientAdsPage;
