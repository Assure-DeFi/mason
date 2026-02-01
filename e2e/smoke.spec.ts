/**
 * E2E Smoke Test for Mason Dashboard
 *
 * Quick "app boots, no crashes" test for use with /execute-approved --smoke-test.
 * Designed to run in ~30 seconds and catch catastrophic failures.
 *
 * What it tests:
 * - Key routes load without crashing
 * - No console errors
 * - Basic page structure renders
 *
 * What it does NOT test:
 * - Full UI functionality
 * - Interactive elements
 * - API responses (covered by unit tests)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Routes to smoke test
const SMOKE_TEST_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/setup', name: 'Setup Wizard' },
  { path: '/admin/backlog', name: 'Backlog' },
];

test.describe('Smoke Test', () => {
  // Track console errors across all tests
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Ignore known harmless errors
        const text = msg.text();
        if (
          !text.includes('favicon') &&
          !text.includes('manifest.json') &&
          !text.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED')
        ) {
          consoleErrors.push(text);
        }
      }
    });

    // Capture page crashes
    page.on('pageerror', (err) => {
      consoleErrors.push(`Page Error: ${err.message}`);
    });
  });

  for (const route of SMOKE_TEST_ROUTES) {
    test(`${route.name} page loads without crashes`, async ({ page }) => {
      // Navigate to the page
      const response = await page.goto(`${BASE_URL}${route.path}`);

      // Check response status
      expect(response?.status()).toBeLessThan(500);

      // Wait for page to be interactive
      await page.waitForLoadState('domcontentloaded');

      // Check that body renders
      await expect(page.locator('body')).toBeVisible();

      // Verify no console errors occurred
      if (consoleErrors.length > 0) {
        console.log(`Console errors on ${route.name}:`, consoleErrors);
      }
      expect(consoleErrors).toHaveLength(0);
    });
  }

  test('No JavaScript runtime errors on route navigation', async ({ page }) => {
    // Start at home
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Navigate between routes
    for (const route of SMOKE_TEST_ROUTES) {
      await page.goto(`${BASE_URL}${route.path}`);
      await page.waitForLoadState('domcontentloaded');
    }

    // Check no runtime errors accumulated
    expect(consoleErrors).toHaveLength(0);
  });
});
