import type { Context } from "https://edge.netlify.com";
import { getStore } from "https://esm.sh/@netlify/blobs@8";

const ENDPOINT = "https://tracker.searchableanalytics.com/v1/netlify-edge";

// Token lives in the "searchable" blob store (key "token"), not an env var:
// this site's Lambda-compat functions share a 4KB env limit that is already full.
// Env var wins if it ever exists (e.g. after a plan upgrade enables scoped vars).
let cachedToken: string | null | undefined;

async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = Netlify.env.get("SEARCHABLE_TOKEN") ?? null;
  if (!cachedToken) {
    try {
      cachedToken = await getStore("searchable").get("token");
    } catch {
      cachedToken = null;
    }
  }
  return cachedToken;
}

export default async function (request: Request, context: Context) {
  const response = await context.next();
  context.waitUntil(forward(request, response, context));
  return response;
}

async function forward(request: Request, response: Response, context: Context) {
  const token = await getToken();
  if (!token) return;
  try {
    const url = new URL(request.url);
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        type: "netlify_edge_event",
        timestamp: Date.now(),
        request_id: request.headers.get("x-nf-request-id") ?? crypto.randomUUID(),
        method: request.method,
        path: url.pathname,
        url: request.url,
        status_code: response.status,
        user_agent: request.headers.get("user-agent") ?? "",
        ip_address: context.ip ?? "",
        country: context.geo?.country?.code ?? "",
        referrer: request.headers.get("referer") ?? "",
      }),
    });
  } catch {
    /* swallow */
  }
}

export const config = { path: "/*" };
