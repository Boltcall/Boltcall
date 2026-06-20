import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import AuthSwitch from '../components/ui/auth-switch';

const Signup: React.FC = () => {
  useEffect(() => {
    document.title = 'Sign Up for Boltcall - Start Your Free Trial Today';
    updateMetaDescription('Sign up for Boltcall and start your free trial. Get AI receptionist with free setup in 5 minutes. No credit card required. Join now.');
  }, []);

  return <AuthSwitch defaultMode="signup" defaultRedirect="/setup" />;
};

export default Signup;
