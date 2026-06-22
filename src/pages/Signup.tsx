import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import AuthSwitch from '../components/ui/auth-switch';

const Signup: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    document.title = 'Sign Up for Boltcall - Start Your Free Trial Today';
    updateMetaDescription('Sign up for Boltcall and start your free trial. Get AI receptionist with free setup in 5 minutes. No credit card required. Join now.');
  }, []);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/setup" replace />;
  }

  return <AuthSwitch defaultMode="signup" defaultRedirect="/setup" />;
};

export default Signup;
