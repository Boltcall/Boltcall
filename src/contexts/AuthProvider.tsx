/**
 * AuthProvider — the full Supabase-backed auth provider.
 *
 * This file is lazy-loaded in AppRoutes.tsx so @supabase/supabase-js (127 KB)
 * is NOT in the critical-path bundle for marketing pages.
 */
import React, { useReducer, useEffect } from 'react';
import type { User, AuthState, LoginCredentials, SignupCredentials } from '../lib/auth';
import {
  login as supabaseLogin,
  signup as supabaseSignup,
  logout as supabaseLogout,
  getCurrentUser,
  onAuthStateChange,
  signInWithGoogle,
  signInWithMicrosoft,
  signInWithFacebook,
} from '../lib/auth';
import { AuthContext } from './AuthContext';
import type { AuthContextType } from './AuthContext';

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return { user: action.payload, isAuthenticated: true, isLoading: false };
    case 'LOGIN_ERROR':
      return { ...state, isLoading: false };
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

const initialState: AuthState = { user: null, isAuthenticated: false, isLoading: true };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();

    const { data: { subscription } } = onAuthStateChange((user) => {
      if (user) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      const user = await supabaseLogin(credentials);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'LOGIN_ERROR' });
      throw error;
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      const user = await supabaseSignup(credentials);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'LOGIN_ERROR' });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabaseLogout();
    } catch (error) {
      console.error('Logout error:', error);
      // Server sign-out failed (network/5xx) — clear the local session anyway
      // so autoRefreshToken can't resurrect it after the user chose to log out.
      const { supabase } = await import('../lib/supabase');
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } finally {
      // Wipe user-scoped browser state so a second account signing in on the
      // same browser doesn't inherit the previous user's cached location or
      // setup status.
      try {
        localStorage.removeItem('currentLocationId');
        localStorage.removeItem('boltcall_setup_complete');
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('currentLocationId:')) localStorage.removeItem(k);
        }
      } catch { /* localStorage unavailable — safe to ignore */ }
      dispatch({ type: 'LOGOUT' });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      dispatch({ type: 'LOGIN_START' });
      await signInWithGoogle();
    } catch (error) {
      if (error instanceof Error && error.message === 'OAuth redirect initiated') return;
      dispatch({ type: 'LOGIN_ERROR' });
      throw error;
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      dispatch({ type: 'LOGIN_START' });
      await signInWithMicrosoft();
    } catch (error) {
      if (error instanceof Error && error.message === 'OAuth redirect initiated') return;
      dispatch({ type: 'LOGIN_ERROR' });
      throw error;
    }
  };

  const handleFacebookLogin = async () => {
    try {
      dispatch({ type: 'LOGIN_START' });
      await signInWithFacebook();
    } catch (error) {
      if (error instanceof Error && error.message === 'OAuth redirect initiated') return;
      dispatch({ type: 'LOGIN_ERROR' });
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    signup,
    logout,
    signInWithGoogle: handleGoogleLogin,
    signInWithMicrosoft: handleMicrosoftLogin,
    signInWithFacebook: handleFacebookLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
