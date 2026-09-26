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

    // F7: a business_profiles row is written before the agents are
    // provisioned (provisionAgentSetup.ts creates the profile, then the
    // agents, then calls setup-launch which flips
    // workspaces.setup_completed). Gating on business_profiles alone let a
    // provisioning failure (Retell 5xx, tab closed mid-loader) strand the
    // user on the classic dashboard with no agent and no way back to
    // /setup. Gate on workspaces.setup_completed instead — the signal
    // setup-launch actually sets when the run finished — with a fallback
    // for legacy workspaces that have a working inbound agent but predate
    // that column being backfilled.
    const checkSetup = async () => {
      const queryWorkspace = async () => {
        const { supabase } = await import('../lib/supabase');
        return supabase
          .from('workspaces')
          .select('setup_completed')
          .eq('user_id', user.id)
          .maybeSingle();
      };
      try {
        let { data, error } = await queryWorkspace();

        if (error) {
          // One retry before defaulting open — network blips shouldn't
          // silently mark setup complete and let the user into an empty
          // dashboard.
          console.warn('Setup check error, retrying once:', error);
          await new Promise((r) => setTimeout(r, 400));
          ({ data, error } = await queryWorkspace());
        }

        if (error) {
          console.error('Setup check error (retry failed):', error);
          setSetupCheck('completed'); // Fail open — better than blocking
          return;
        }

        if (data?.setup_completed) {
          localStorage.setItem(SETUP_COMPLETE_KEY, user.id);
          setSetupCheck('completed');
          return;
        }

        // Legacy safety net: a workspace with a real inbound agent already
        // works even if setup_completed was never backfilled for it.
        const { supabase } = await import('../lib/supabase');
        const { data: agents } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user.id)
          .or('agent_type.eq.inbound,agent_type.eq.ai_receptionist')
          .not('retell_agent_id', 'is', null)
          .limit(1);

        if (agents?.length) {
          localStorage.setItem(SETUP_COMPLETE_KEY, user.id);
          setSetupCheck('completed');
          return;
        }

        localStorage.removeItem(SETUP_COMPLETE_KEY);
        setSetupCheck('needed');
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
    // Preserve where the user tried to go so they land back there after
    // signing in, instead of dropping into the default post-login route.
    const attempted = location.pathname + location.search + location.hash;
    const safe = attempted && attempted !== '/' && !attempted.startsWith('/login')
      ? `?redirect=${encodeURIComponent(attempted)}`
      : '';
    return <Navigate to={`/login${safe}`} replace />;
  }

  // New user without setup → redirect to setup
  if (setupCheck === 'needed') {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
