import type { Handler } from '@netlify/functions';
import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
import { validatePublicHttpUrl } from './_shared/outbound-url';
import { requireUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

// Firecrawl API keys — waterfall: use key 1 first, if exhausted try key 2, then key 3
const FIRECRAWL_KEYS = [
  process.env.FIRECRAWL_API_KEY_1,
  process.env.FIRECRAWL_API_KEY_2,
  process.env.FIRECRAWL_API_KEY_3,
].filter(Boolean) as string[];

const N8N_FALLBACK_WEBHOOK = process.env.N8N_SCRAPER_WEBHOOK || 'https://n8n.srv974118.hstgr.cloud/webhook/scrape-website';

function getHeader(headers: Record<string, string | undefined>, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

// Try Firecrawl with a specific key
async function tryFirecrawl(url: string, apiKey: string): Promise<{ success: boolean; data?: any; exhausted?: boolean }> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (response.status === 402 || response.status === 429) {
      return { success: false, exhausted: true };
    }

    if (!response.ok) return { success: false };

    const result = await response.json();
    if (result.success && result.data) {
      return { success: true, data: result.data };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

// Try n8n fallback webhook
async function tryN8nFallback(url: string): Promise<{ success: boolean; data?: any }> {
  if (!N8N_FALLBACK_WEBHOOK) return { success: false };
  try {
    const response = await fetch(N8N_FALLBACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) return { success: false };
    const data = await response.json();
    if (data.success) return { success: true, data };
    return { success: false };
  } catch {
    return { success: false };
  }
}

// Basic fetch fallback (original scrape-url logic)
async function basicScrape(url: string): Promise<{ title: string; description: string; content: string }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BoltcallBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml,text/plain,*/*',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    return { title: url, description: '', content: '' };
  }

  const html = await response.text();

  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '');

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > 50000) {
    text = text.substring(0, 50000) + '...';
  }

  return { title: title || url, description, content: text };
}

const handler: Handler = async (event) => {
  // Use the strict v2 CORS allowlist instead of '*'. scrape-url is gated by
  // INTERNAL_API_SECRET, but a wildcard CORS still lets any origin read
  // responses (status codes, error messages) — a recon aid for an attacker
  // who already exfiltrated the secret. The allowlist removes that primitive.
  // Note: the x-internal-secret header is added to Allow-Headers so the v2
  // setup conversation handler (server-to-server caller from the same origin)
  // can still set it. Browsers don't add Origin on server-to-server fetches,
  // so server callers stay unaffected by this change.
  const cors = getV2CorsHeaders(getRequestOrigin(event.headers as Record<string, string>), { methods: 'POST' });
  const headers = {
    ...cors.headers,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-internal-secret',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Defense-in-depth: reject cross-origin requests from disallowed sites.
  // Same-origin and server-to-server callers (no Origin header) still work.
  const requestOrigin = getRequestOrigin(event.headers as Record<string, string>);
  if (requestOrigin && !cors.allowed) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }

  try {
    // Fail-CLOSED: INTERNAL_API_SECRET MUST be set in every deploy context.
    // Previously this was fail-OPEN — when the env var was unset, the check
    // was skipped entirely and any external caller could burn Firecrawl
    // credits. That was a credential-leak amplifier; now we 503 instead.
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (!internalSecret) {
      console.error(
        '[scrape-url] INTERNAL_API_SECRET is not configured — refusing to serve. ' +
        'Set INTERNAL_API_SECRET in Netlify env (prod + deploy contexts).',
      );
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'Service misconfigured' }) };
    }
    const callerSecret = getHeader(event.headers as Record<string, string | undefined>, 'x-internal-secret');
    // Constant-time compare to defeat timing oracle attacks.
    let ok = false;
    if (callerSecret && typeof callerSecret === 'string' && callerSecret.length === internalSecret.length) {
      try {
        const crypto = await import('crypto');
        ok = crypto.timingSafeEqual(Buffer.from(callerSecret), Buffer.from(internalSecret));
      } catch {
        ok = callerSecret === internalSecret;
      }
    }
    if (!ok) {
      const auth = await requireUser(event, headers);
      if (!auth.ok) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
      }
    }

    const { url } = JSON.parse(event.body || '{}');

    if (!url) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'URL is required' }) };
    }

    const urlCheck = await validatePublicHttpUrl(String(url), { allowHttp: true, label: 'Scrape URL' });
    if (!urlCheck.ok) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: urlCheck.error }) };
    }

    // Strategy: Firecrawl (waterfall) → n8n fallback → basic scrape

    // 1. Try Firecrawl keys in waterfall
    for (let i = 0; i < FIRECRAWL_KEYS.length; i++) {
      console.log(`[scrape-url] Trying Firecrawl key ${i + 1}...`);
      const result = await tryFirecrawl(url, FIRECRAWL_KEYS[i]);

      if (result.exhausted) {
        console.log(`[scrape-url] Key ${i + 1} exhausted, trying next...`);
        continue;
      }

      if (result.success && result.data) {
        const markdown = result.data.markdown || result.data.content || '';
        const metadata = result.data.metadata || {};
        console.log(`[scrape-url] Firecrawl key ${i + 1} succeeded (${markdown.length} chars)`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            title: metadata.title || metadata.ogTitle || url,
            description: metadata.description || metadata.ogDescription || '',
            content: markdown,
            markdown,
            url,
            charCount: markdown.length,
            source: 'firecrawl',
            metadata: {
              language: metadata.language,
              ogImage: metadata.ogImage,
              links: result.data.links,
            },
          }),
        };
      }
    }

    // 2. Try n8n fallback
    console.log('[scrape-url] Firecrawl exhausted, trying n8n fallback...');
    const n8nResult = await tryN8nFallback(url);
    if (n8nResult.success && n8nResult.data) {
      console.log(`[scrape-url] n8n fallback succeeded (${(n8nResult.data.content || '').length} chars)`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          title: n8nResult.data.title || url,
          description: n8nResult.data.description || '',
          content: n8nResult.data.content || n8nResult.data.markdown || '',
          markdown: n8nResult.data.markdown || n8nResult.data.content || '',
          url,
          charCount: (n8nResult.data.content || '').length,
          source: 'n8n',
        }),
      };
    }

    // 3. Basic scrape fallback
    console.log('[scrape-url] n8n failed, falling back to basic scrape...');
    const basic = await basicScrape(url);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        title: basic.title,
        description: basic.description,
        content: basic.content,
        url,
        charCount: basic.content.length,
        source: 'basic',
      }),
    };
  } catch (error) {
    console.error('Scrape error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        content: '',
        source: 'error',
      }),
    };
  }
};

export { handler };

export default withLegacyHandler(handler);
