function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resolveSourceUrl(rawUrl, siteUrl) {
  assert(typeof rawUrl === 'string' && rawUrl.trim(), 'source is missing a URL');
  const resolved = new URL(rawUrl, siteUrl);
  assert(
    resolved.protocol === 'https:' || resolved.protocol === 'http:',
    `source URL must be http(s): ${rawUrl}`,
  );
  return resolved.toString();
}

export async function checkHelpSourcesResolve(
  sources,
  {
    siteUrl,
    fetchImpl = fetch,
  },
) {
  assert(Array.isArray(sources) && sources.length > 0, 'help response did not include any sources');

  const results = [];
  for (const source of sources) {
    const title = String(source?.title || source?.url || 'Untitled source');
    const url = resolveSourceUrl(source?.url, siteUrl);
    const response = await fetchImpl(url, { redirect: 'follow' });
    const status = Number(response.status);
    assert(status >= 200 && status < 400, `${title} source ${url} returned ${status}`);
    results.push({ title, url, status });
  }

  return results;
}
