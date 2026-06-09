// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadModule(clarityProjectId?: string) {
  vi.resetModules();
  vi.stubEnv('VITE_CLARITY_PROJECT_ID', clarityProjectId);
  return import('../marketingAnalytics');
}

function scriptSources() {
  return Array.from(document.querySelectorAll('script')).map((script) => script.getAttribute('src') || '');
}

afterEach(() => {
  vi.unstubAllEnvs();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/');
  delete window._analyticsLoaded;
  delete window._clarityLoaded;
  delete window.clarity;
  delete window.gtag;
  delete window.dataLayer;
});

describe('marketing analytics loader', () => {
  it('loads Microsoft Clarity after consent on public pages when a project id is configured', async () => {
    window.history.replaceState({}, '', '/pricing');
    const { loadMarketingAnalytics } = await loadModule('clarity-id');

    loadMarketingAnalytics();

    expect(scriptSources()).toContain('https://www.clarity.ms/tag/clarity-id');
    expect(window.clarity).toBeTypeOf('function');
    expect((window.clarity as any).q[0][0]).toBe('consentv2');
    expect((window.clarity as any).q[0][1]).toEqual({
      ad_Storage: 'denied',
      analytics_Storage: 'granted',
    });
  });

  it('does not load Microsoft Clarity in authenticated or setup areas', async () => {
    const { shouldLoadClarity } = await loadModule('clarity-id');

    expect(shouldLoadClarity('/dashboard')).toBe(false);
    expect(shouldLoadClarity('/v2/analytics')).toBe(false);
    expect(shouldLoadClarity('/client/insights')).toBe(false);
    expect(shouldLoadClarity('/setup')).toBe(false);
    expect(shouldLoadClarity('/pricing')).toBe(true);
  });

  it('uses the Boltcall Clarity project id by default', async () => {
    const { loadMarketingAnalytics, shouldLoadClarity } = await loadModule();

    loadMarketingAnalytics();

    expect(shouldLoadClarity('/pricing')).toBe(true);
    expect(scriptSources()).toContain('https://www.clarity.ms/tag/x4e3hjsgc7');
  });

  it('can load Clarity later if the first accepted page was private', async () => {
    const { loadMarketingAnalytics } = await loadModule('clarity-id');

    window.history.replaceState({}, '', '/dashboard');
    loadMarketingAnalytics();
    expect(scriptSources()).not.toContain('https://www.clarity.ms/tag/clarity-id');

    window.history.replaceState({}, '', '/pricing');
    loadMarketingAnalytics();
    expect(scriptSources()).toContain('https://www.clarity.ms/tag/clarity-id');
  });
});
