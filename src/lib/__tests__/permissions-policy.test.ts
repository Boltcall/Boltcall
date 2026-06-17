import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const headersPath = path.resolve(process.cwd(), 'public/_headers');

describe('Permissions policy headers', () => {
  it('allows same-origin microphone access for live call flows', () => {
    const headers = readFileSync(headersPath, 'utf8');

    expect(headers).toContain('Permissions-Policy: camera=(), microphone=(self), geolocation=()');
    expect(headers).not.toContain('Permissions-Policy: camera=(), microphone=(), geolocation=()');
  });
});
