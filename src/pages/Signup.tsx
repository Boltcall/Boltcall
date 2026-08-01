import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import AuthSwitch from '../components/ui/auth-switch';

const Signup: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    document.title = 'Sign Up for Boltcall - Start Your Free Trial Today';
    updateMetaDescription('Sign up for Boltcall and start your free trial. Get AI receptionist with free setup in 5 minutes. No credit card required. Join now.');
  }, []);

  if (!isLoading && isAuthenticated) {
    // If the user's setup is already done, sending them back to /setup drops
    // them into an empty wizard state. Route to /dashboard instead — the
    // ProtectedRoute component still verifies the DB row and bounces them
    // to /setup if the cache is stale.
    const setupCompleteFor = user?.id
      ? localStorage.getItem('boltcall_setup_complete')
      : null;
    const target = setupCompleteFor === user?.id ? '/dashboard' : '/setup';
    return <Navigate to={target} replace />;
  }

  return <AuthSwitch defaultMode="signup" defaultRedirect="/setup" />;
};

export default Signup;
