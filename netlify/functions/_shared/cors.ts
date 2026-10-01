import { publicEnv } from './public-config';
/**
 * Shared CORS headers for Netlify functions.
 * Origins from ALLOWED_ORIGINS (env, else the prod list in public-config); set it to '' to allow '*'.
 */

const ALLOWED_ORIGINS = (publicEnv('ALLOWED_ORIGINS') || '*').split(',').map(o => o.trim());

export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  // In development or if no restriction is set, allow all
  if (ALLOWED_ORIGINS.includes('*')) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };
  }

  // In production, check against allowed origins
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

/** Default headers for backwards compatibility */
export const corsHeaders = getCorsHeaders();
