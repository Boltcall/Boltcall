import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const SETUP_COMPLETE_KEY = 'boltcall_setup_complete';

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [setupCheck, setSetupCheck] = useState<'loading' | 'completed' | 'needed'>(() => {
    // If we already verified setup for this user, skip the loading state entirely
    if (user?.id && localStorage.getItem(SETUP_COMPLETE_KEY) === user.id) {
      return 'completed';
    }
    return 'loading';
  });

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setSetupCheck('loading');
      return;
    }

    // Skip check if already on setup pages (including loading screen)
    if (location.pathname.startsWith('/setup')) {
      setSetupCheck('completed');
      return;
    }

    // If we already verified setup for this user, skip the DB check
    if (localStorage.getItem(SETUP_COMPLETE_KEY) === user.id) {
      setSetupCheck('completed');
      return;
    }

    // Note: we used to short-circuit here when the URL had `?setupCompleted=true`
    // and blindly cache SETUP_COMPLETE_KEY. That let a hand-typed
    // `/dashboard/?setupCompleted=true` (or a Skip after a failed
    // TalkToAgent) strand the user in an empty dashboard forever because
    // provisionAgentSetup was skipped from then on. Now we always verify the
    // business_profiles row exists before caching.
    const params = new URLSearchParams(location.search);
    const arrivedFromSetupLoader = params.get('setupCompleted') === 'true';

    // Check if user has completed setup (has a business_profiles row)
    const checkSetup = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        const { data, error } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Setup check error:', error);
          setSetupCheck('completed'); // Don't block on error
          return;
        }

        if (data) {
          localStorage.setItem(SETUP_COMPLETE_KEY, user.id);
          setSetupCheck('completed');
        } else if (arrivedFromSetupLoader) {
          // The URL claims setup finished but no business_profiles row
          // exists — treat as still-needed so the wizard runs, and drop
          // the stale cache marker.
          localStorage.removeItem(SETUP_COMPLETE_KEY);
          setSetupCheck('needed');
        } else {
          localStorage.removeItem(SETUP_COMPLETE_KEY);
          setSetupCheck('needed');
        }
      } catch {
        setSetupCheck('completed'); // Don't block on error
      }
    };

    checkSetup();
  }, [isAuthenticated, user?.id]);

  if (isLoading || (isAuthenticated && setupCheck === 'loading')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div
          className="text-center text-blue-600 animate-[fadeIn_0.5s_ease-in-out_forwards]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="100px" width="100px" viewBox="0 0 200 200" className="pencil mx-auto">
            <defs>
              <clipPath id="pencil-eraser"><rect height="30" width="30" ry="5" rx="5" /></clipPath>
            </defs>
            <circle transform="rotate(-113,100,100)" strokeLinecap="round" strokeDashoffset="439.82" strokeDasharray="439.82 439.82" strokeWidth="3" stroke="hsl(223,90%,50%)" fill="none" r="70" className="pencil__stroke" />
            <g transform="translate(100,100)" className="pencil__rotate">
              <g fill="none">
                <circle transform="rotate(-90)" strokeDashoffset="402" strokeDasharray="402.12 402.12" strokeWidth="30" stroke="hsl(223,90%,50%)" r="64" className="pencil__body1" />
                <circle transform="rotate(-90)" strokeDashoffset="465" strokeDasharray="464.96 464.96" strokeWidth="10" stroke="hsl(223,90%,60%)" r="74" className="pencil__body2" />
                <circle transform="rotate(-90)" strokeDashoffset="339" strokeDasharray="339.29 339.29" strokeWidth="10" stroke="hsl(223,90%,40%)" r="54" className="pencil__body3" />
              </g>
              <g transform="rotate(-90) translate(49,0)" className="pencil__eraser">
                <g className="pencil__eraser-skew">
                  <rect height="30" width="30" ry="5" rx="5" fill="hsl(223,90%,70%)" />
                  <rect clipPath="url(#pencil-eraser)" height="30" width="5" fill="hsl(223,90%,60%)" />
                  <rect height="20" width="30" fill="hsl(40,20%,94%)" />
                  <rect height="20" width="15" fill="hsl(40,20%,89%)" />
                  <rect height="20" width="5" fill="hsl(40,20%,84%)" />
                </g>
              </g>
              <g transform="rotate(-90) translate(49,-30)" className="pencil__point">
                <polygon points="15 0,30 30,0 30" fill="hsl(33,90%,70%)" />
                <polygon points="15 0,6 30,0 30" fill="hsl(33,90%,50%)" />
                <polygon points="15 0,20 10,10 10" fill="hsl(223,10%,10%)" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // New user without setup → redirect to setup
  if (setupCheck === 'needed') {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
