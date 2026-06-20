import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const SETUP_ENTRY_PATH = '/setup';
export const CLASSIC_SETUP_PATH = '/setup/classic';
export const SETUP_SIGNUP_PATH = `/signup?redirect=${encodeURIComponent(SETUP_ENTRY_PATH)}`;

const SetupEntry: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 text-sm font-medium text-zinc-500">
        Loading setup...
      </div>
    );
  }

  return (
    <Navigate
      to={isAuthenticated ? CLASSIC_SETUP_PATH : SETUP_SIGNUP_PATH}
      replace
    />
  );
};

export default SetupEntry;
