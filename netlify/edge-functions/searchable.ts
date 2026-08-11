import type { Context } from "https://edge.netlify.com";

const ENDPOINT = "https://tracker.searchableanalytics.com/v1/netlify-edge";
const TOKEN = Netlify.env.get("SEARCHABLE_TOKEN");

export default async function (request: Request, context: Context) {
  const response = await context.next();
  context.waitUntil(forward(request, response, context));
  return response;
}

async function forward(request: Request, response: Response, context: Context) {
  if (!TOKEN) return;
  try {
    const url = new URL(request.url);
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
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
