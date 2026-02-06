#!/usr/bin/env node

/**
 * Mason Dashboard Screenshot Tool
 *
 * Takes screenshots of the Mason dashboard using Playwright.
 * Used by E2E testing (execute-approved, battle-test) for visual validation.
 *
 * Pattern: chromium.launch headless → 1920x1080 viewport → networkidle + wait delay → fullPage capture
 * Reference: assure-sales-pipeline/scripts/screenshot.js
 *
 * Usage:
 *   node scripts/screenshot.js [url_path] [output_path]
 *   node scripts/screenshot.js --all                    # Screenshot all pages
 *   node scripts/screenshot.js --all --output-dir DIR   # Custom output directory
 *
 * Examples:
 *   node scripts/screenshot.js                              # Screenshot homepage
 *   node scripts/screenshot.js /admin/backlog                # Screenshot backlog
 *   node scripts/screenshot.js /setup /tmp/setup.png         # Custom output path
 *   node scripts/screenshot.js --full /admin/backlog         # Full page screenshot
 *   node scripts/screenshot.js --all                         # All dashboard pages
 *   node scripts/screenshot.js --all --output-dir .claude/battle-test/screenshots
 */

import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// All Mason dashboard pages that deliver frontend content
const ALL_PAGES = [
  { path: '/', name: 'home' },
  { path: '/auth/signin', name: 'signin' },
  { path: '/setup', name: 'setup' },
  { path: '/admin/backlog', name: 'backlog' },
  { path: '/settings/database', name: 'settings-database' },
  { path: '/settings/github', name: 'settings-github' },
  { path: '/settings/api-keys', name: 'settings-api-keys' },
  { path: '/settings/ai-providers', name: 'settings-ai-providers' },
  { path: '/settings/autopilot', name: 'settings-autopilot' },
];

async function takeScreenshot(urlPath = '/', outputPath, options = {}) {
  const {
    fullPage = true,
    width = 1920,
    height = 1080,
    waitMs = 3000,
  } = options;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (
        !text.includes('favicon') &&
        !text.includes('manifest.json') &&
        !text.includes('net::ERR_CONNECTION_REFUSED')
      ) {
        consoleErrors.push(text);
      }
    }
  });

  const targetUrl = BASE_URL + urlPath;
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(waitMs);

  if (!outputPath) {
    const safePath = urlPath.replace(/\//g, '_').replace(/^_/, '') || 'home';
    outputPath = `.claude/battle-test/screenshots/${safePath}-${Date.now()}.png`;
  }

  // Ensure output directory exists
  const dir = dirname(resolve(outputPath));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  await page.screenshot({ path: outputPath, fullPage });

  await browser.close();

  return { outputPath, consoleErrors };
}

async function screenshotAll(outputDir, options = {}) {
  const {
    fullPage = true,
    width = 1920,
    height = 1080,
    waitMs = 3000,
  } = options;

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  // Capture console errors per page
  let currentPageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (
        !text.includes('favicon') &&
        !text.includes('manifest.json') &&
        !text.includes('net::ERR_CONNECTION_REFUSED')
      ) {
        currentPageErrors.push(text);
      }
    }
  });

  const results = [];

  for (const { path: urlPath, name } of ALL_PAGES) {
    currentPageErrors = [];
    const outputPath = `${outputDir}/${name}.png`;
    const startTime = Date.now();

    try {
      await page.goto(BASE_URL + urlPath, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      await page.waitForTimeout(waitMs);

      await page.screenshot({ path: outputPath, fullPage });

      const loadTimeMs = Date.now() - startTime;

      results.push({
        url: urlPath,
        name,
        status: currentPageErrors.length > 0 ? 'warning' : 'pass',
        screenshot: outputPath,
        load_time_ms: loadTimeMs,
        console_errors: [...currentPageErrors],
      });

      console.log(`  [PASS] ${name} (${loadTimeMs}ms) → ${outputPath}`);
    } catch (err) {
      results.push({
        url: urlPath,
        name,
        status: 'fail',
        screenshot: null,
        load_time_ms: Date.now() - startTime,
        console_errors: [...currentPageErrors],
        error: err.message,
      });

      console.error(`  [FAIL] ${name}: ${err.message}`);
    }
  }

  await browser.close();

  // Write results JSON
  const summary = {
    timestamp: new Date().toISOString(),
    base_url: BASE_URL,
    viewport: { width, height },
    pages_tested: results.length,
    pages_passed: results.filter((r) => r.status === 'pass').length,
    pages_warned: results.filter((r) => r.status === 'warning').length,
    pages_failed: results.filter((r) => r.status === 'fail').length,
    results,
  };

  const summaryPath = `${outputDir}/screenshot-results.json`;
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\nResults: ${summaryPath}`);

  return summary;
}

// CLI entrypoint
const args = process.argv.slice(2);
const isAll = args.includes('--all');
const fullPage = args.includes('--full') || isAll;
const filteredArgs = args.filter((a) => !a.startsWith('--'));

if (isAll) {
  const outputDirIdx = args.indexOf('--output-dir');
  const outputDir =
    outputDirIdx !== -1
      ? args[outputDirIdx + 1]
      : '.claude/battle-test/screenshots';

  console.log(
    `Screenshotting all ${ALL_PAGES.length} Mason dashboard pages...`,
  );
  console.log(`Output: ${outputDir}`);
  console.log(`Viewport: 1920x1080 | Wait: 3s after networkidle\n`);

  screenshotAll(outputDir, { fullPage })
    .then((summary) => {
      const failed = summary.pages_failed;
      if (failed > 0) {
        console.error(`\n${failed} page(s) failed to screenshot`);
        process.exit(1);
      }
      console.log(`\nAll ${summary.pages_tested} pages captured successfully`);
    })
    .catch((e) => {
      console.error('Error:', e.message);
      process.exit(1);
    });
} else {
  const urlPath = filteredArgs[0] || '/';
  const outputPath = filteredArgs[1] || undefined;

  takeScreenshot(urlPath, outputPath, { fullPage })
    .then(({ outputPath: out, consoleErrors }) => {
      console.log(out);
      if (consoleErrors.length > 0) {
        console.error('Console errors:', consoleErrors);
      }
    })
    .catch((e) => {
      console.error('Error:', e.message);
      process.exit(1);
    });
}
