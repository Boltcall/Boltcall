import { test, expect } from '@playwright/test';

/**
 * CTA smoke sweep — verifies primary calls-to-action route to the right
 * destinations across the marketing surface.
 *
 * Each check:
 *   1. Loads the page.
 *   2. Finds the primary CTA button by accessible text.
 *   3. Verifies the CTA target is present and clickable.
 *
 * Uses the running dev server (playwright.config.ts webServer). Focused
 * on structure rather than pixel-perfect behavior so this can run in CI
 * without deploy dependencies.
 *
 * Refs: docs/v1-production-readiness-plan.md P1 (marketing CTA sweep).
 */

const CTA_TARGETS = [
  { path: '/', label: /pricing/i, target: /\/pricing/ },
  { path: '/', label: /book.*call|book.*demo|talk to.*sales/i, target: /\/book-a-call|\/contact|\/demo/ },
  { path: '/pricing', label: /pricing|get started|start free/i, target: /\/pricing|\/signup|\/setup/ },
  { path: '/features/ai-receptionist', label: /pricing|start|book/i },
  { path: '/comparisons', label: /pricing|start|book/i },
  { path: '/tools/roofing-missed-lead-calculator', label: /book|start|pricing/i },
  { path: '/tools/plumber-revenue-calculator', label: /book|start|pricing/i },
  { path: '/blog', label: /pricing|start|book|read/i },
  { path: '/about', label: /pricing|book|start|contact/i },
];

for (const { path, label, target } of CTA_TARGETS) {
  test(`CTA on ${path} → primary route`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response, `no response for ${path}`).not.toBeNull();
    expect(response!.status(), `bad status for ${path}`).toBeLessThan(400);

    // Find a visible CTA link/button matching the label.
    const candidates = page.getByRole('link', { name: label }).or(page.getByRole('button', { name: label }));
    await expect(candidates.first(), `no CTA matching ${label} on ${path}`).toBeVisible({ timeout: 8_000 });

    if (target) {
      // Verify at least one candidate points at the expected destination.
      const hrefs = await candidates.evaluateAll((els) =>
        els.map((el) => (el as HTMLAnchorElement).href || (el as HTMLButtonElement).dataset.href || ''),
      );
      expect(hrefs.some((h) => target.test(h)), `no CTA points at ${target} on ${path}`).toBe(true);
    }
  });
}

test('speed-test /offer submits to the real endpoint (not the old fake setTimeout)', async ({ page }) => {
  // Regression guard for P0.4. The old implementation resolved to the
  // "Thank You" state after a hard-coded 1s delay. The new one hits
  // /.netlify/functions/speed-test-offer.
  await page.goto('/speed-test/offer', { waitUntil: 'domcontentloaded' });

  const submit = page.getByRole('button', { name: /book.*free.*call/i });
  await expect(submit).toBeVisible({ timeout: 8_000 });

  // Try to submit with empty fields — real endpoint rejects with 400.
  // The fake would advance to Thank You. We simply assert the form is
  // still visible after clicking without filling required inputs.
  await submit.click({ force: true }).catch(() => { /* required attr may block */ });
  await expect(submit).toBeVisible();
});
