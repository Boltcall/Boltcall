/**
 * True when this function is running on a hosted Netlify deploy
 * (production, deploy-preview, or branch-deploy).
 *
 * Netlify sets NETLIFY=true on every hosted function and NETLIFY_DEV=true
 * only when running under `netlify dev` locally. CONTEXT and NODE_ENV are
 * available at build time but NOT reliably set at function runtime — checking
 * them causes fail-open bugs. Use this helper for anything gated on "is this
 * really prod?".
 */
export function isHostedDeploy(): boolean {
  return process.env.NETLIFY === 'true' && process.env.NETLIFY_DEV !== 'true';
}
