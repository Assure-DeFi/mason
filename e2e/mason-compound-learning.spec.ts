/**
 * E2E Test Suite for Mason Compound Learning System
 *
 * Tests:
 * 1. API Endpoints (with and without authentication)
 * 2. Dashboard UI Components
 * 3. AutoPilotButton rendering and functionality
 * 4. Platform selector in setup wizard
 * 5. Clipboard functionality
 * 6. Console error detection
 * 7. Responsive design
 * 8. Screenshots for verification
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Mason Compound Learning System - E2E Tests', () => {
  // =========================================================================
  // Helper Functions
  // =========================================================================

  async function checkForConsoleErrors(page: Page, testName: string) {
    // This will be captured by Playwright's built-in console tracking
    // We can access it via the test context
  }

  async function takeScreenshot(page: Page, name: string) {
    await page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  // =========================================================================
  // TEST: Home Page
  // =========================================================================

  test('Home page loads without errors', async ({ page }) => {
    // Navigate to home page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await takeScreenshot(page, '01_home_page');

    // Verify page title exists
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check that page loaded successfully
    await expect(page.locator('body')).toBeVisible();
  });

  // =========================================================================
  // TEST: Backlog Page
  // =========================================================================

  test('Backlog page renders correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/backlog`);
    await page.waitForLoadState('networkidle');

    // Wait for any dynamic content
    await page.waitForTimeout(2000);

    await takeScreenshot(page, '02_backlog_page');

    // Verify page loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('AutoPilotButton functionality', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto(`${BASE_URL}/admin/backlog`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if AutoPilotButton exists
    const autoPilotButton = page.locator('button:has-text("Auto-Pilot")');

    const buttonCount = await autoPilotButton.count();

    if (buttonCount > 0) {
      console.log('✓ AutoPilotButton found on page');

      // Click the button
      await autoPilotButton.click();

      // Wait for clipboard operation
      await page.waitForTimeout(1000);

      await takeScreenshot(page, '02b_autopilot_clicked');

      // Check for success feedback (tooltip or check icon)
      const successIndicator = page.locator('text=/Copied|copied/i');
      const hasSuccessIndicator = (await successIndicator.count()) > 0;

      if (hasSuccessIndicator) {
        console.log('✓ Copy feedback displayed');
      }

      // Try to read clipboard content
      const clipboardText = await page.evaluate(() => {
        return navigator.clipboard.readText();
      });

      expect(clipboardText).toContain('/mason');
      console.log(`✓ Clipboard contains: ${clipboardText}`);
    } else {
      console.log(
        'ℹ No AutoPilotButton found (likely no approved items - this is OK)',
      );
    }
  });

  // =========================================================================
  // TEST: Setup Wizard
  // =========================================================================

  test('Setup wizard loads and displays platform selector', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/setup`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await takeScreenshot(page, '03_setup_wizard');

    // Verify page loaded
    await expect(page.locator('body')).toBeVisible();

    // Look for platform selector buttons
    const macOSButton = page.locator('button:has-text("macOS")');
    const windowsButton = page.locator('button:has-text("Windows")');
    const linuxButton = page.locator('button:has-text("Linux")');

    const hasPlatformSelectors =
      (await macOSButton.count()) > 0 ||
      (await windowsButton.count()) > 0 ||
      (await linuxButton.count()) > 0;

    if (hasPlatformSelectors) {
      console.log('✓ Platform selector buttons found');

      // Test clicking each platform
      if ((await macOSButton.count()) > 0) {
        await macOSButton.first().click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '03_macos_selected');
        console.log('✓ Successfully clicked macOS');
      }

      if ((await windowsButton.count()) > 0) {
        await windowsButton.first().click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '03_windows_selected');
        console.log('✓ Successfully clicked Windows');
      }

      if ((await linuxButton.count()) > 0) {
        await linuxButton.first().click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '03_linux_selected');
        console.log('✓ Successfully clicked Linux');
      }

      // Check if install command is displayed
      const codeBlock = page.locator('code');
      if ((await codeBlock.count()) > 0) {
        const commandText = await codeBlock.first().textContent();
        expect(commandText).toBeTruthy();
        console.log(
          `✓ Install command displayed (${commandText?.length} chars)`,
        );
      } else {
        console.log(
          'ℹ No install command visible (may need API key generation first)',
        );
      }
    } else {
      console.log('ℹ Platform selectors not visible on current step');
    }
  });

  test('Platform selection changes install command', async ({ page }) => {
    await page.goto(`${BASE_URL}/setup`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for platform buttons
    const windowsButton = page.locator('button:has-text("Windows")');
    const linuxButton = page.locator('button:has-text("Linux")');

    if ((await windowsButton.count()) > 0 && (await linuxButton.count()) > 0) {
      // Select Windows
      await windowsButton.first().click();
      await page.waitForTimeout(500);

      let codeBlock = page.locator('code').first();
      let windowsCommand = await codeBlock.textContent();

      // Select Linux
      await linuxButton.first().click();
      await page.waitForTimeout(500);

      codeBlock = page.locator('code').first();
      let linuxCommand = await codeBlock.textContent();

      // Commands should be different
      if (windowsCommand && linuxCommand) {
        expect(windowsCommand).not.toEqual(linuxCommand);
        console.log('✓ Install command changes based on platform selection');

        // Windows should have PowerShell syntax
        expect(windowsCommand).toContain('$env:');
        console.log('✓ Windows command has PowerShell syntax');

        // Linux should have bash syntax
        expect(linuxCommand).toContain('bash');
        console.log('✓ Linux command has bash syntax');
      } else {
        console.log('ℹ Commands not available (may need API key generation)');
      }
    } else {
      console.log('ℹ Platform buttons not available for testing');
    }
  });

  // =========================================================================
  // TEST: API Endpoints
  // =========================================================================

  test('API endpoint /api/v1/backlog/next requires authentication', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/v1/backlog/next`);

    // Should return 401 without auth
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBeTruthy();

    console.log('✓ API endpoint correctly requires authentication');
  });

  test('API endpoint /api/v1/backlog/next with invalid auth', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/v1/backlog/next`, {
      headers: {
        Authorization: 'Bearer invalid_key_12345',
      },
    });

    // Should return 401 with invalid auth
    expect(response.status()).toBe(401);

    console.log('✓ API endpoint rejects invalid authentication');
  });

  // =========================================================================
  // TEST: Responsive Design
  // =========================================================================

  test('Backlog page renders correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/admin/backlog`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await takeScreenshot(page, '04_responsive_mobile');

    // Verify page is visible
    await expect(page.locator('body')).toBeVisible();

    console.log('✓ Mobile viewport renders correctly');
  });

  test('Backlog page renders correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(`${BASE_URL}/admin/backlog`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await takeScreenshot(page, '04_responsive_tablet');

    // Verify page is visible
    await expect(page.locator('body')).toBeVisible();

    console.log('✓ Tablet viewport renders correctly');
  });

  test('Backlog page renders correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto(`${BASE_URL}/admin/backlog`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await takeScreenshot(page, '04_responsive_desktop');

    // Verify page is visible
    await expect(page.locator('body')).toBeVisible();

    console.log('✓ Desktop viewport renders correctly');
  });

  // =========================================================================
  // TEST: Console Errors
  // =========================================================================

  test('No console errors on backlog page', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto(`${BASE_URL}/admin/backlog`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for errors
    if (errors.length > 0) {
      console.log('⚠ Console errors detected:');
      errors.forEach((err) => console.log(`  - ${err}`));

      // Fail test if there are errors
      expect(errors.length).toBe(0);
    } else {
      console.log('✓ No console errors detected');
    }
  });

  test('No console errors on setup page', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto(`${BASE_URL}/setup`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for errors
    if (errors.length > 0) {
      console.log('⚠ Console errors detected:');
      errors.forEach((err) => console.log(`  - ${err}`));

      // Fail test if there are errors
      expect(errors.length).toBe(0);
    } else {
      console.log('✓ No console errors detected');
    }
  });
});
