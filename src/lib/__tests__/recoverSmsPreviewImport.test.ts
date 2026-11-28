import { afterEach, describe, expect, it, vi } from 'vitest';
import { recoverSmsPreviewImport } from '../recoverSmsPreviewImport';

function stubBrowser({ online = true, storageBlocked = false } = {}) {
  const storage = new Map<string, string>();
  const reload = vi.fn();
  vi.stubGlobal('window', {
    location: { reload },
    navigator: { onLine: online },
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (storageBlocked) throw new Error('Storage unavailable');
        storage.set(key, value);
      },
    },
    setTimeout,
  });
  return reload;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SMS preview route import recovery', () => {
  const staleModule = new TypeError(
    'Failed to fetch dynamically imported module: https://boltcall.org/assets/LeadMagnetSmsIntakeAgentPage-old.js',
  );

  it('reloads once for a stale lazy chunk and falls back if navigation fails', async () => {
    vi.useFakeTimers();
    const reload = stubBrowser();

    const firstLoad = expect(recoverSmsPreviewImport(staleModule)).rejects.toBe(staleModule);
    expect(reload).toHaveBeenCalledOnce();
    await vi.runAllTimersAsync();
    await firstLoad;

    await expect(Promise.resolve().then(() => recoverSmsPreviewImport(staleModule))).rejects.toBe(staleModule);
    expect(reload).toHaveBeenCalledOnce();
  });

  it.each([
    ['ordinary error', new TypeError('Unexpected value'), {}],
    ['offline', staleModule, { online: false }],
    ['storage unavailable', staleModule, { storageBlocked: true }],
  ] as const)('keeps the error boundary for %s', async (_label, error, options) => {
    const reload = stubBrowser(options);

    await expect(Promise.resolve().then(() => recoverSmsPreviewImport(error))).rejects.toBe(error);
    expect(reload).not.toHaveBeenCalled();
  });
});
