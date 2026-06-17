import { describe, expect, it } from 'vitest';

import { readJsonResponse } from '../readJsonResponse';

describe('readJsonResponse', () => {
  it('returns parsed JSON when the body is valid JSON', async () => {
    const response = new Response(JSON.stringify({ reply: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(readJsonResponse<{ reply: string }>(response)).resolves.toEqual({
      reply: 'ok',
    });
  });

  it('returns null when the body is not valid JSON', async () => {
    const response = new Response('<html>proxy error</html>', {
      headers: { 'Content-Type': 'text/html' },
    });

    await expect(readJsonResponse(response)).resolves.toBeNull();
  });
});
