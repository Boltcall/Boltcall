/**
 * True when this function is running under `netlify dev` locally.
 *
 * Netlify's function runtime (AWS Lambda) does NOT reliably expose CONTEXT,
 * NODE_ENV, or NETLIFY at runtime. The only reliable local-dev marker is
 * NETLIFY_DEV, which `netlify dev` sets. Everywhere else — production,
 * deploy-preview, branch-deploy, standalone Lambda — treat as production and
 * fail-closed.
 */
export function isLocalDev(): boolean {
  return process.env.NETLIFY_DEV === 'true';
}
