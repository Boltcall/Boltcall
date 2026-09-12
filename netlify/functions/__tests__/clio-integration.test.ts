import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockChain: any = {
  select: vi.fn(() => mockChain),
  eq: vi.fn(() => mockChain),
  update: vi.fn(() => mockChain),
  insert: vi.fn(() => mockChain),
  order: vi.fn(() => mockChain),
  maybeSingle: vi.fn(),
  single: vi.fn(),
};
const mockSupabase = { from: vi.fn(() => mockChain) };

vi.mock('../_shared/token-utils', () => ({
  getSupabase: () => mockSupabase,
  getServiceSupabase: () => mockSupabase,
}));
vi.mock('../_shared/user-auth', () => ({
  hasSharedSecret: vi.fn(() => true),
  requireMatchingUser: vi.fn(async (_event: unknown, userId: string) => ({
    ok: true,
    user: { id: userId || 'u1' },
    userId: userId || 'u1',
  })),
}));
vi.mock('../_shared/notify', () => ({ notifyError: vi.fn(), notifyInfo: vi.fn() }));

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-key';
process.env.CLIO_CLIENT_ID = 'clio-client-id';
process.env.CLIO_CLIENT_SECRET = 'clio-client-secret';

import { testHandler as handler } from '../integration-sync';

function makeEvent(body: object) {
  return {
    httpMethod: 'POST',
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  };
}

/** One queued fetch response, with an explicit HTTP status. */
function mockRes(status: number, body: object = {}) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as any);
}

function setupIntegrations(list: object[]) {
  mockChain.eq.mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ data: list, error: null }) });
  mockChain.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
}

function findCall(match: (url: string, init: any) => boolean) {
  return mockFetch.mock.calls.find((c: any[]) => typeof c[0] === 'string' && match(c[0], c[1]));
}

const growInt = {
  id: 'i-grow',
  provider: 'clio_grow',
  is_connected: true,
  api_key: 'INBOX-TOKEN',
  config: { region: 'us' },
  sync_count: 0,
};

const futureIso = () => new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
const pastIso = () => new Date(Date.now() - 60 * 1000).toISOString();

const manageInt = {
  id: 'i-manage',
  provider: 'clio',
  is_connected: true,
  api_key: 'REFRESH-TOKEN',
  config: { region: 'us', access_token: 'ACCESS-TOKEN', token_expires_at: futureIso() },
  sync_count: 0,
};

// ───────────────────────── Clio Grow: test action ──────────────────────────

describe('Clio Grow - test action', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a missing lead inbox token', async () => {
    const res = await handler(makeEvent({ action: 'test', provider: 'clio_grow' }), {} as any, vi.fn());
    expect(res?.statusCode).toBe(400);
    expect(JSON.parse(res!.body).error).toContain('Lead inbox token');
  });

  it('verifies the token without creating a lead in the firm inbox', async () => {
    mockRes(422, { errors: { from_first: ['is required'] } });
    const res = await handler(
      makeEvent({ action: 'test', provider: 'clio_grow', apiKey: 'INBOX-TOKEN' }),
      {} as any,
      vi.fn(),
    );
    const body = JSON.parse(res!.body);

    expect(body.success).toBe(true);
    expect(body.message).toContain('US');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://grow.clio.com/inbox_leads');
    const sent = JSON.parse(init.body);
    expect(sent.inbox_lead_token).toBe('INBOX-TOKEN');
    // Empty lead body is the point: a 422 proves the token without leaving junk behind.
    expect(sent.inbox_lead).toEqual({});
  });

  it('reports a bad token when Clio answers 401', async () => {
    mockRes(401, {});
    const res = await handler(
      makeEvent({ action: 'test', provider: 'clio_grow', apiKey: 'WRONG' }),
      {} as any,
      vi.fn(),
    );
    const body = JSON.parse(res!.body);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/rejected the token/i);
  });

  it('probes the regional host for a non-US firm', async () => {
    mockRes(422, {});
    const res = await handler(
      makeEvent({ action: 'test', provider: 'clio_grow', apiKey: 'T', config: { region: 'eu' } }),
      {} as any,
      vi.fn(),
    );
    expect(JSON.parse(res!.body).message).toContain('EU');
    expect(mockFetch.mock.calls[0][0]).toBe('https://eu.grow.clio.com/inbox_leads');
  });
});

// ───────────────────────── Clio Grow: sync_lead ────────────────────────────

describe('Clio Grow - sync_lead', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts a complete inbox_lead payload', async () => {
    setupIntegrations([growInt]);
    mockRes(201, { id: 4242 });

    const res = await handler(
      makeEvent({
        action: 'sync_lead',
        userId: 'u1',
        lead: {
          name: 'Maria De La Cruz',
          phone: '+14155550100',
          email: 'maria@example.com',
          notes: 'Rear-ended on I-95, treating with a chiropractor',
          source: 'ai_call',
        },
      }),
      {} as any,
      vi.fn(),
    );

    const body = JSON.parse(res!.body);
    expect(body.synced).toBe(1);
    expect(body.results[0]).toMatchObject({ provider: 'clio_grow', success: true, leadId: '4242' });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://grow.clio.com/inbox_leads');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', Accepts: 'application/json' });

    const sent = JSON.parse(init.body);
    expect(sent.inbox_lead_token).toBe('INBOX-TOKEN');
    expect(sent.inbox_lead).toMatchObject({
      from_first: 'Maria',
      from_last: 'De La Cruz',
      from_email: 'maria@example.com',
      from_phone: '+14155550100',
      from_message: 'Rear-ended on I-95, treating with a chiropractor [ai_call]',
      referring_url: 'https://boltcall.org',
      // Constant on purpose: it is what makes Boltcall a named lead source in Grow.
      from_source: 'Boltcall',
    });
  });

  it('fills the three required fields Clio 422s on when the lead is bare', async () => {
    setupIntegrations([growInt]);
    mockRes(201, {});

    await handler(
      makeEvent({ action: 'sync_lead', userId: 'u1', lead: { phone: '+15550000' } }),
      {} as any,
      vi.fn(),
    );

    const sent = JSON.parse(mockFetch.mock.calls[0][1].body).inbox_lead;
    expect(sent.from_first).toBe('Unknown');
    expect(sent.from_last).toBe('Caller');
    expect(sent.from_message).toBe('Inbound lead captured by Boltcall');
    expect(sent.referring_url).toBe('https://boltcall.org');
    expect(sent.from_source).toBe('Boltcall');
  });

  it('routes an EU firm to the EU lead inbox', async () => {
    setupIntegrations([{ ...growInt, config: { region: 'eu' } }]);
    mockRes(201, {});

    await handler(
      makeEvent({ action: 'sync_lead', userId: 'u1', lead: { name: 'Ana Silva', phone: '+3511234' } }),
      {} as any,
      vi.fn(),
    );

    expect(mockFetch.mock.calls[0][0]).toBe('https://eu.grow.clio.com/inbox_leads');
  });

  it('surfaces a revoked token as an actionable error', async () => {
    setupIntegrations([growInt]);
    mockRes(401, {});

    const body = JSON.parse(
      (await handler(
        makeEvent({ action: 'sync_lead', userId: 'u1', lead: { name: 'X', phone: '+1' } }),
        {} as any,
        vi.fn(),
      ))!.body,
    );

    expect(body.synced).toBe(0);
    expect(body.results[0].success).toBe(false);
    expect(body.results[0].error).toMatch(/lead inbox token/i);
  });

  it('fails cleanly when no token is stored', async () => {
    setupIntegrations([{ ...growInt, api_key: null }]);

    const body = JSON.parse(
      (await handler(
        makeEvent({ action: 'sync_lead', userId: 'u1', lead: { name: 'X' } }),
        {} as any,
        vi.fn(),
      ))!.body,
    );

    expect(body.synced).toBe(0);
    expect(body.results[0].error).toMatch(/no clio grow lead inbox token/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ───────────────────────── Clio Manage: test action ────────────────────────

describe('Clio Manage - test action', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tells the user to use OAuth instead of pasting a key', async () => {
    const res = await handler(makeEvent({ action: 'test', provider: 'clio' }), {} as any, vi.fn());
    expect(res?.statusCode).toBe(400);
    expect(JSON.parse(res!.body).error).toMatch(/OAuth/i);
  });

  it('verifies the token against who_am_i', async () => {
    mockRes(200, { data: { id: 9, name: 'Brauns Law' } });
    const res = await handler(
      makeEvent({ action: 'test', provider: 'clio', config: { access_token: 'ACCESS-TOKEN', region: 'ca' } }),
      {} as any,
      vi.fn(),
    );
    const body = JSON.parse(res!.body);

    expect(body.success).toBe(true);
    expect(body.message).toContain('Brauns Law');
    expect(mockFetch.mock.calls[0][0]).toBe('https://ca.app.clio.com/api/v4/users/who_am_i?fields=id,name');
  });
});

// ───────────────────────── Clio Manage: sync_lead ──────────────────────────

describe('Clio Manage - sync_lead', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates the contact and attaches the call summary as a note', async () => {
    setupIntegrations([manageInt]);
    mockRes(200, { data: [] });          // contact search: no match
    mockRes(201, { data: { id: 555 } }); // contact create
    mockRes(201, { data: { id: 77 } });  // note create

    const body = JSON.parse(
      (await handler(
        makeEvent({
          action: 'sync_lead',
          userId: 'u1',
          lead: {
            first_name: 'Dan',
            last_name: 'Whitley',
            email: 'dan@example.com',
            phone: '+14045550111',
            notes: 'Slip and fall, 3 Sep, no prior counsel',
            source: 'Google LSA',
          },
        }),
        {} as any,
        vi.fn(),
      ))!.body,
    );

    expect(body.synced).toBe(1);
    expect(body.results[0]).toMatchObject({ provider: 'clio', success: true, contactId: '555' });

    const search = mockFetch.mock.calls[0][0];
    expect(search).toContain('https://app.clio.com/api/v4/contacts?query=dan%40example.com');
    expect(search).toContain('fields=id,name');

    const create = findCall((u, i) => u.includes('/api/v4/contacts?fields=') && i?.method === 'POST');
    expect(create).toBeDefined();
    expect(JSON.parse(create![1].body)).toEqual({
      data: {
        type: 'Person',
        first_name: 'Dan',
        last_name: 'Whitley',
        phone_numbers: [{ name: 'Work', number: '+14045550111', default_number: true }],
        email_addresses: [{ name: 'Work', address: 'dan@example.com', default_email: true }],
      },
    });

    const note = findCall((u, i) => u.includes('/api/v4/notes') && i?.method === 'POST');
    expect(note).toBeDefined();
    const noteBody = JSON.parse(note![1].body).data;
    expect(noteBody).toMatchObject({
      type: 'Contact',
      detail: 'Slip and fall, 3 Sep, no prior counsel',
      contact: { id: 555 },
    });
    expect(noteBody.subject).toContain('Google LSA');
  });

  it('reuses an existing contact instead of duplicating it', async () => {
    setupIntegrations([manageInt]);
    mockRes(200, { data: [{ id: 321, name: 'Dan Whitley' }] }); // search hit
    mockRes(201, { data: { id: 78 } });                          // note

    const body = JSON.parse(
      (await handler(
        makeEvent({
          action: 'sync_lead',
          userId: 'u1',
          lead: { name: 'Dan Whitley', email: 'dan@example.com', notes: 'Follow-up call' },
        }),
        {} as any,
        vi.fn(),
      ))!.body,
    );

    expect(body.results[0]).toMatchObject({ success: true, contactId: '321' });
    expect(findCall((u, i) => u.includes('/api/v4/contacts?fields=') && i?.method === 'POST')).toBeUndefined();
  });

  it('refreshes an expired token and keeps the region in config', async () => {
    const expired = {
      ...manageInt,
      config: { region: 'au', access_token: 'OLD', token_expires_at: pastIso() },
    };
    setupIntegrations([expired]);
    mockRes(200, { access_token: 'NEW', expires_in: 2592000 }); // refresh
    mockRes(200, { data: [{ id: 12 }] });                        // search hit
    mockRes(201, { data: { id: 13 } });                          // note

    const body = JSON.parse(
      (await handler(
        makeEvent({ action: 'sync_lead', userId: 'u1', lead: { name: 'Kim Tan', email: 'k@e.com', notes: 'n' } }),
        {} as any,
        vi.fn(),
      ))!.body,
    );

    expect(body.results[0].success).toBe(true);

    const refresh = mockFetch.mock.calls[0];
    expect(refresh[0]).toBe('https://au.app.clio.com/oauth/token');
    expect(String(refresh[1].body)).toContain('grant_type=refresh_token');

    // The refresh must not wipe the region — the next refresh needs it to pick a host.
    const merged = mockChain.update.mock.calls.find((c: any[]) => c[0]?.config?.access_token === 'NEW');
    expect(merged).toBeDefined();
    expect(merged![0].config.region).toBe('au');

    // Subsequent API calls use the refreshed token and the AU host.
    expect(mockFetch.mock.calls[1][0]).toContain('https://au.app.clio.com/api/v4/contacts');
    expect(mockFetch.mock.calls[1][1].headers.Authorization).toBe('Bearer NEW');
  });

  it('asks the user to reconnect when the refresh token is gone', async () => {
    setupIntegrations([
      { ...manageInt, api_key: null, config: { region: 'us', access_token: 'OLD', token_expires_at: pastIso() } },
    ]);

    const body = JSON.parse(
      (await handler(
        makeEvent({ action: 'sync_lead', userId: 'u1', lead: { name: 'X' } }),
        {} as any,
        vi.fn(),
      ))!.body,
    );

    expect(body.synced).toBe(0);
    expect(body.results[0].error).toMatch(/reconnect/i);
  });

  it('still reports the contact when the note write fails', async () => {
    setupIntegrations([manageInt]);
    mockRes(200, { data: [] });
    mockRes(201, { data: { id: 900 } });
    mockFetch.mockRejectedValueOnce(new Error('note endpoint down'));

    const body = JSON.parse(
      (await handler(
        makeEvent({ action: 'sync_lead', userId: 'u1', lead: { name: 'A B', email: 'a@b.c', notes: 'summary' } }),
        {} as any,
        vi.fn(),
      ))!.body,
    );

    expect(body.results[0]).toMatchObject({ success: true, contactId: '900' });
  });
});
