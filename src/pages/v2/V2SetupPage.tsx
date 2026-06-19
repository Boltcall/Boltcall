/**
 * Legacy V2 setup entry.
 *
 * V1 is the canonical onboarding path. Any older /v2/setup links now hand off
 * to /setup, which already owns the auth -> classic-setup flow.
 */

import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { updateMetaDescription } from '../../lib/utils';

const V2SetupPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Set Up Boltcall';
    updateMetaDescription('Start Boltcall setup through the classic V1 onboarding flow.');
  }, []);

  return <Navigate to="/setup" replace />;
};

export default V2SetupPage;
