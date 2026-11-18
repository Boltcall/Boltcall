/**
 * DashboardProviders — lazy-loaded provider wrapper for authenticated dashboard pages.
 *
 * Keeping SubscriptionContext + TokenContext here (and lazy-loading this file from
 * AppRoutes.tsx) prevents @supabase/supabase-js from being in the critical-path
 * modulepreload list on marketing pages.
 */
import React from 'react';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { TokenProvider } from '../contexts/TokenContext';
import { DashboardAppearanceProvider } from '../contexts/DashboardAppearanceContext';

const DashboardProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SubscriptionProvider>
    <TokenProvider>
      <DashboardAppearanceProvider>{children}</DashboardAppearanceProvider>
    </TokenProvider>
  </SubscriptionProvider>
);

export default DashboardProviders;
