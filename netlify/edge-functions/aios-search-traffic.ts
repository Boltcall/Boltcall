// Installation template, NOT deployed. Copy into a dedicated Boltcall worktree
// only when telemetry installation/deployment is authorized. Never reuse the
// AIOS operator token or Searchable token here.
type EdgeContext = { next: () => Promise<Response>; waitUntil: (promise: Promise<unknown>) => void }
declare const Netlify: { env: { get: (key: string) => string | undefined } }

export default async function (request: Request, context: EdgeContext) {
  const started=performance.now()
  const response = await context.next()
  const headerWaitMs=Math.min(3600000,Math.max(0,performance.now()-started))
  context.waitUntil(forward(request, response, headerWaitMs))
  return response
}

async function forward(request: Request, response: Response, headerWaitMs: number) {
  const endpoint = Netlify.env.get('AIOS_SEARCH_TRAFFIC_ENDPOINT')
  const secret = Netlify.env.get('AIOS_SEARCH_TRAFFIC_SECRET')
  if (!endpoint || !secret) return
  try {
    const target = new URL(endpoint)
    if (target.protocol !== 'https:' || target.pathname !== '/api/search-traffic/ingest' || target.search || target.username || target.password) return
    const url = new URL(request.url)
    if (url.hostname !== 'boltcall.org' && url.hostname !== 'www.boltcall.org') return
    const contentType = response.headers.get('content-type') || ''
    const ua = request.headers.get('user-agent') || ''
    // Capture crawler requests on any path, but human requests only on HTML
    // documents. Asset requests are never mislabeled as human pageviews.
    const maybeBot = /bot|crawler|spider|ChatGPT-User|Claude-User|Perplexity-User|meta-external/i.test(ua)
    if (!maybeBot && !/^text\/html(?:;|$)/i.test(contentType)) return
    let referrer = ''
    try { referrer = new URL(request.headers.get('referer') || '').origin } catch {}
    const body = JSON.stringify({ domain: 'boltcall.org', events: [{
      id: request.headers.get('x-nf-request-id') || crypto.randomUUID(),
      at: new Date().toISOString(), path: url.pathname, userAgent: ua.slice(0, 512),
      method: request.method, status: response.status, contentType, referrer, host:url.hostname,
      responseTimeMs:headerWaitMs,responseTimeBasis:'context_next_headers_wait', // NOT full body delivery or CWV.
      // No IP, email, cookies, query strings, precise location or visitor/session identity.
    }] })
    const timestamp = String(Date.now())
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`)))
    const signature = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
    // Two bounded asynchronous attempts reuse the same event ID and signature;
    // server-side dedupe prevents double-counting if the first response was lost.
    // No durable edge queue is implied: freshness exposes continued outages.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await fetch(target.href, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(2000),
          headers: { 'content-type': 'application/json', 'x-aios-timestamp': timestamp, 'x-aios-signature': signature }, body })
        if (result.ok || ![429, 500, 502, 503, 504].includes(result.status)) break
      } catch { if (attempt === 1) break }
    }
  } catch { /* telemetry never changes the visitor response; server freshness must surface outages */ }
}

export const config = { path: '/*' }
