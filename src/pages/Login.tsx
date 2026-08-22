import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import AuthSwitch from '../components/ui/auth-switch';
import { useToast } from '../contexts/ToastContext';

const Login: React.FC = () => {
  const { showToast } = useToast();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Login to Your Boltcall Account | Boltcall';
    updateMetaDescription('Login to your Boltcall account. Access your dashboard, manage settings, and view your speed-to-lead analytics. Sign in now.');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('authError') === 'callback') {
      showToast({
        variant: 'error',
        title: "Sign-in didn't complete",
        message: 'Please try signing in again.',
      });
      // Strip the flag so a refresh doesn't retrigger the toast.
      params.delete('authError');
      const next = params.toString();
      window.history.replaceState({}, '', location.pathname + (next ? `?${next}` : ''));
    }
  }, [location.pathname, location.search, showToast]);

  return <AuthSwitch defaultMode="login" />;
};

export default Login;
