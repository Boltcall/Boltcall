import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../components/Header', () => ({ default: () => null }));
vi.mock('../../components/Footer', () => ({ default: () => null }));
vi.mock('../../components/GiveawayBar', () => ({ default: () => null }));
vi.mock('../../components/FAQ', () => ({ default: () => null }));
vi.mock('../../components/Breadcrumbs', () => ({ default: () => null }));
vi.mock('../../hooks/useSchemaInjector', () => ({ useSchemaInjector: vi.fn() }));
vi.mock('../../lib/schema', () => ({ createServiceSchema: vi.fn(() => ({})), injectSchemas: vi.fn(() => () => {}) }));
vi.mock('../../lib/utils', async (orig) => ({ ...(await orig<object>()), updateMetaDescription: vi.fn() }));
vi.mock('../../hooks/useAttributionCapture', () => ({ getStoredAttributionUid: () => 'uid-123' }));

import SEOAuditPDF from '../SEOAuditPDF';
import BusinessAuditPage from '../BusinessAuditPage';

const ENDPOINT = '/.netlify/functions/free-tool-lead';
const reply = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SEOAuditPDF (navigates on success)', () => {
  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/seo-aeo-audit']}>
        <Routes>
          <Route path="/seo-aeo-audit" element={<SEOAuditPDF />} />
          <Route path="/seo-aeo-audit/thank-you" element={<div>thank you page</div>} />
        </Routes>
      </MemoryRouter>,
    );
  const submit = () => {
    fireEvent.change(screen.getByPlaceholderText('https://example.com'), { target: { value: 'example.com' } });
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'a@b.com' } });
    fireEvent.click(document.querySelector('button[type="submit"]')!);
  };

  it.each([true, false])('posts { tool, form } and reaches thank-you when forwarded=%s', async (forwarded) => {
    const fetchMock = reply(200, { ok: true, forwarded });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    submit();
    expect(await screen.findByText('thank you page', {}, { timeout: 5000 })).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(JSON.parse(init.body)).toEqual({
      tool: 'seo_aeo_audit',
      form: { url: 'https://example.com', email: 'a@b.com', ref: 'uid-123' },
    });
  });

  it('shows the server error message on 400', async () => {
    vi.stubGlobal('fetch', reply(400, { error: 'Enter a valid email' }));
    renderPage();
    submit();
    expect(await screen.findByText('Enter a valid email')).toBeTruthy();
  });
});

describe('BusinessAuditPage (success popup)', () => {
  const submit = () => {
    fireEvent.change(screen.getByPlaceholderText('https://yourbusiness.com'), { target: { value: 'https://biz.com' } });
    fireEvent.change(screen.getByPlaceholderText('your.email@example.com'), { target: { value: 'a@b.com' } });
    fireEvent.click(document.querySelector('button[type="submit"]')!);
  };

  it.each([true, false])('posts { tool, form } and shows the popup when forwarded=%s', async (forwarded) => {
    const fetchMock = reply(200, { ok: true, forwarded });
    vi.stubGlobal('fetch', fetchMock);
    render(<BusinessAuditPage />);
    submit();
    expect(await screen.findByText('Audit Ready!')).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(JSON.parse(init.body)).toEqual({
      tool: 'business_audit',
      form: { url: 'https://biz.com', email: 'a@b.com', type: 'business-audit' },
    });
  });

  it('shows the server error message on 400 and no popup', async () => {
    vi.stubGlobal('fetch', reply(400, { error: 'Enter a valid email' }));
    render(<BusinessAuditPage />);
    submit();
    expect(await screen.findByText('Enter a valid email')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Audit Ready!')).toBeNull());
  });

  it('shows a generic retry message on 500', async () => {
    vi.stubGlobal('fetch', reply(500, { error: 'boom' }));
    render(<BusinessAuditPage />);
    submit();
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeTruthy();
  });
});
