import type { Context, Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { getV2CorsHeaders } from './cors-v2';

function toCanonicalHeaderName(header: string) {
  return header
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

function toLegacyHeaders(headers: Headers) {
  const out: Record<string, string> = {};

  headers.forEach((value, key) => {
    out[key] = value;
    out[toCanonicalHeaderName(key)] = value;
  });

  return out;
}

function toSingleValueQuery(searchParams: URLSearchParams) {
  const out: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    if (!(key in out)) out[key] = value;
  }

  return Object.keys(out).length > 0 ? out : null;
}

function toMultiValueQuery(searchParams: URLSearchParams) {
  const out: Record<string, string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    if (!out[key]) out[key] = [];
    out[key].push(value);
  }

  return Object.keys(out).length > 0 ? out : null;
}

async function toLegacyEvent(request: Request, context: Context): Promise<HandlerEvent> {
  const url = new URL(request.url);
  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text();

  return {
    httpMethod: request.method,
    headers: toLegacyHeaders(request.headers),
    body: body === '' ? undefined : body,
    isBase64Encoded: false,
    path: url.pathname,
    rawUrl: request.url,
    rawQuery: url.search.startsWith('?') ? url.search.slice(1) : url.search,
    queryStringParameters: toSingleValueQuery(url.searchParams),
    multiValueQueryStringParameters: toMultiValueQuery(url.searchParams),
    pathParameters: context.params ?? null,
    multiValueHeaders: {},
    cookies: [],
  } as HandlerEvent;
}

function toModernResponse(result: HandlerResponse) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(result.headers ?? {})) {
    headers.set(key, String(value));
  }

  if (result.multiValueHeaders) {
    for (const [key, values] of Object.entries(result.multiValueHeaders)) {
      headers.delete(key);
      for (const value of values) {
        headers.append(key, String(value));
      }
    }
  }

  const status = result.statusCode ?? 200;
  // Response() throws if a null-body status (204/205/304) is given any body,
  // including an empty string — legacy handlers return { statusCode: 204, body: '' }.
  const nullBodyStatus = status === 204 || status === 205 || status === 304 || status === 101;
  const body =
    nullBodyStatus || result.body == null
      ? null
      : result.isBase64Encoded
        ? Uint8Array.from(Buffer.from(result.body, 'base64'))
        : result.body;

  return new Response(body, {
    headers,
    status,
  });
}

// strictCors: authed endpoints keep their module-level `'Access-Control-Allow-Origin': '*'`
// constant for backwards compatibility, but the wire response echoes only an
// allowlisted origin (cors-v2), so a foreign page can't read authed responses.
function applyStrictCors(result: HandlerResponse, request: Request): HandlerResponse {
  const key = Object.keys(result.headers ?? {}).find(
    (k) => k.toLowerCase() === 'access-control-allow-origin' && result.headers?.[k] === '*',
  );
  if (!key) return result;
  const { echoedOrigin } = getV2CorsHeaders(request.headers.get('origin'));
  // Copy — handlers share a module-level headers object; never mutate it.
  return { ...result, headers: { ...result.headers, [key]: echoedOrigin, Vary: 'Origin' } };
}

// Bridge the repo's legacy Handler-event functions onto Netlify's current Request/Response runtime.
export function withLegacyHandler(handler: Handler, options: { strictCors?: boolean } = {}) {
  return async (request: Request, context: Context) => {
    let result = (await handler(await toLegacyEvent(request, context), {} as never)) ?? { statusCode: 204, body: '' };
    if (options.strictCors) result = applyStrictCors(result, request);
    return toModernResponse(result);
  };
}
