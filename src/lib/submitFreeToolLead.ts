export type FreeTool = 'ai_audit' | 'seo_aeo_audit' | 'business_audit' | 'niche_tool';

/**
 * Posts a free-tool form to our own lead-capture function (saves the lead, then
 * forwards to n8n). Resolves on any 200, including forwarded=false (lead saved,
 * report sent by hand). Throws an Error with a visitor-safe message otherwise.
 */
export async function submitFreeToolLead(tool: FreeTool, form: Record<string, unknown>): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/.netlify/functions/free-tool-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, form }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (res.ok) return;
  if (res.status < 500) {
    const data = await res.json().catch(() => null);
    if (data && typeof data.error === 'string') throw new Error(data.error);
  }
  throw new Error('Something went wrong. Please try again.');
}
