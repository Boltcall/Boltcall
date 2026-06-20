import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { consumePendingAuthRedirect } from '../lib/authRedirect';
import {
  clearPendingAgentSetup,
  readPendingAgentSetup,
} from '../lib/setup/onboarding';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Authentication Callback | Boltcall';
    updateMetaDescription('Authentication callback page. Processing your login and sending you to the right Boltcall next step.');
  }, []);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          navigate('/login');
          return;
        }

        if (session) {
          const pendingSetup = readPendingAgentSetup();
          const pendingAuthRedirect = consumePendingAuthRedirect();

          // Check if user has completed setup
          const { data: profile } = await supabase
            .from('business_profiles')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (!profile && pendingSetup) {
            navigate('/setup/loading', { replace: true });
            return;
          }

          if (profile) {
            clearPendingAgentSetup();
          }

          if (pendingAuthRedirect) {
            navigate(pendingAuthRedirect, { replace: true });
            return;
          }

          navigate(profile ? '/dashboard' : '/setup', { replace: true });
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
