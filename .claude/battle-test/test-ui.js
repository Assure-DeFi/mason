#!/usr/bin/env node
/**
 * UI Testing Script for Mason Dashboard
 * Tests each page for rendering, console errors, and basic functionality.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3000';

const PAGES = [
  { path: '/', name: 'landing' },
  { path: '/auth/signin', name: 'signin' },
  { path: '/setup', name: 'setup' },
  { path: '/admin/backlog', name: 'backlog' },
  { path: '/settings/database', name: 'database-settings' },
  { path: '/settings/github', name: 'github-settings' },
  { path: '/settings/api-keys', name: 'api-keys' },
];

async function testPage(page, pageInfo) {
  const url = BASE_URL + pageInfo.path;
  const name = pageInfo.name;

  const result = {
    url: pageInfo.path,
    status: 'pass',
    load_time_ms: 0,
    console_errors: [],
    issues: [],
  };

  // Collect console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // Navigate and measure load time
    const startTime = Date.now();
    await page.goto(url, { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    const loadTime = Date.now() - startTime;
    result.load_time_ms = loadTime;

    // Check if page has content
    const bodyText = await page.locator('body').textContent();

    if (!bodyText || bodyText.trim().length < 10) {
      result.status = 'fail';
      result.issues.push({
        type: 'blank_page',
        severity: 'critical',
        description: 'Page appears to be blank or has minimal content',
        screenshot: `.claude/battle-test/screenshots/UI-${name}-blank.png`,
      });
      await page.screenshot({
        path: `.claude/battle-test/screenshots/UI-${name}-blank.png`,
        fullPage: true,
      });
    }

    // Check for error text on page
    const errorPatterns = [
      'Error',
      'Something went wrong',
      'Unexpected',
      'Failed to',
      'Cannot',
    ];
    for (const pattern of errorPatterns) {
      try {
        const errorElem = page.locator(`text=/${pattern}/i`).first();
        const isVisible = await errorElem
          .isVisible({ timeout: 1000 })
          .catch(() => false);
        if (isVisible) {
          const errorText = await errorElem.textContent();
          result.status = 'fail';
          result.issues.push({
            type: 'render_fail',
            severity: 'high',
            description: `Error text found on page: ${errorText}`,
            screenshot: `.claude/battle-test/screenshots/UI-${name}-error.png`,
          });
          await page.screenshot({
            path: `.claude/battle-test/screenshots/UI-${name}-error.png`,
            fullPage: true,
          });
          break;
        }
      } catch (err) {
        // Pattern not found, continue
      }
    }

    // Check console errors
    if (consoleErrors.length > 0) {
      result.console_errors = consoleErrors;
      // Filter out noise
      const criticalErrors = consoleErrors.filter(
        (e) =>
          !e.toLowerCase().includes('favicon') &&
          !e.toLowerCase().includes('net::err_failed'),
      );

      if (criticalErrors.length > 0) {
        result.status = 'fail';
        result.issues.push({
          type: 'console_error',
          severity: 'medium',
          description: `Console errors detected: ${criticalErrors.length} error(s)`,
          screenshot: `.claude/battle-test/screenshots/UI-${name}-console.png`,
        });
        await page.screenshot({
          path: `.claude/battle-test/screenshots/UI-${name}-console.png`,
          fullPage: true,
        });
      }
    }
  } catch (error) {
    result.status = 'fail';
    result.issues.push({
      type: 'timeout',
      severity: 'critical',
      description: `Failed to load page: ${error.message}`,
      screenshot: `.claude/battle-test/screenshots/UI-${name}-timeout.png`,
    });
    try {
      await page.screenshot({
        path: `.claude/battle-test/screenshots/UI-${name}-timeout.png`,
        fullPage: true,
      });
    } catch (screenshotErr) {
      // Ignore screenshot errors
    }
  }

  return result;
}

async function main() {
  const results = {
    agent_id: 'UI-1',
    completed_at: new Date().toISOString(),
    summary: {
      pages_tested: 0,
      pages_passed: 0,
      pages_failed: 0,
      issues_found: 0,
    },
    pages: [],
  };

  // Ensure screenshot directory exists
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const pageInfo of PAGES) {
    console.log(`Testing ${pageInfo.path}...`);
    const result = await testPage(page, pageInfo);
    results.pages.push(result);

    results.summary.pages_tested += 1;
    if (result.status === 'pass') {
      results.summary.pages_passed += 1;
      console.log(`  ✓ PASS (${result.load_time_ms}ms)`);
    } else {
      results.summary.pages_failed += 1;
      results.summary.issues_found += result.issues.length;
      console.log(`  ✗ FAIL - ${result.issues.length} issue(s)`);
      for (const issue of result.issues) {
        console.log(`    - ${issue.type}: ${issue.description}`);
      }
    }
  }

  await browser.close();

  // Ensure results directory exists
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Write results
  const outputPath = path.join(resultsDir, 'UI-1.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('UI Testing Complete');
  console.log('='.repeat(60));
  console.log(`Pages Tested: ${results.summary.pages_tested}`);
  console.log(`Pages Passed: ${results.summary.pages_passed}`);
  console.log(`Pages Failed: ${results.summary.pages_failed}`);
  console.log(`Issues Found: ${results.summary.issues_found}`);
  console.log(`\nResults written to: ${outputPath}`);

  // Exit with error code if any tests failed
  process.exit(results.summary.pages_failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
