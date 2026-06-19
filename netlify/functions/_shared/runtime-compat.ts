import type { Context, Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

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

  const body =
    result.body == null
      ? null
      : result.isBase64Encoded
        ? Uint8Array.from(Buffer.from(result.body, 'base64'))
        : result.body;

  return new Response(body, {
    headers,
    status: result.statusCode ?? 200,
  });
}

// Bridge the repo's legacy Handler-event functions onto Netlify's current Request/Response runtime.
export function withLegacyHandler(handler: Handler) {
  return async (request: Request, context: Context) => {
    const result = await handler(await toLegacyEvent(request, context), {} as never);
    return toModernResponse(result ?? { statusCode: 204, body: '' });
  };
}
