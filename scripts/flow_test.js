#!/usr/bin/env node

/**
 * Flow Tester for Mason Dashboard
 * Tests user journeys and navigation flows
 * Agent: FLOW-1
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testFlows() {
  const results = {
    agent_id: 'FLOW-1',
    completed_at: new Date().toISOString(),
    summary: {
      flows_tested: 0,
      flows_passed: 0,
      flows_failed: 0,
      issues_found: 0,
    },
    flows: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  // Console logging
  page.on('console', (msg) =>
    console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`),
  );
  page.on('pageerror', (err) => console.error(`[PAGE ERROR] ${err}`));

  try {
    // FLOW 1: Landing to Auth
    console.log('\n=== FLOW 1: Landing to Auth ===');
    const flow1 = await testFlow1(page);
    results.flows.push(flow1);
    updateSummary(results, flow1);

    // FLOW 2: Auth Page State
    console.log('\n=== FLOW 2: Auth Page State ===');
    const flow2 = await testFlow2(page);
    results.flows.push(flow2);
    updateSummary(results, flow2);

    // FLOW 3: Protected Route Redirect
    console.log('\n=== FLOW 3: Protected Route Redirect ===');
    const flow3 = await testFlow3(page);
    results.flows.push(flow3);
    updateSummary(results, flow3);

    // FLOW 4: Settings Navigation
    console.log('\n=== FLOW 4: Settings Navigation ===');
    const flow4 = await testFlow4(page);
    results.flows.push(flow4);
    updateSummary(results, flow4);
  } finally {
    await browser.close();
  }

  return results;
}

function updateSummary(results, flow) {
  results.summary.flows_tested += 1;
  if (flow.status === 'pass') {
    results.summary.flows_passed += 1;
  } else {
    results.summary.flows_failed += 1;
  }
  results.summary.issues_found += flow.issues.length;
}

async function testFlow1(page) {
  const flow = {
    name: 'Landing to Auth',
    status: 'pass',
    steps: [],
    issues: [],
  };

  try {
    console.log('Step 1: Navigating to /');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);

    if (finalUrl.includes('/auth/signin')) {
      flow.steps.push({
        action: 'goto /',
        result: `redirected to ${finalUrl}`,
        status: 'pass',
      });
      console.log('✓ Redirected to signin as expected');
    } else if (finalUrl === BASE_URL || finalUrl === BASE_URL + '/') {
      await page.screenshot({ path: '/tmp/flow1_landing.png', fullPage: true });
      flow.steps.push({
        action: 'goto /',
        result: 'shows landing page',
        status: 'pass',
      });
      console.log('✓ Landing page shown');
    } else {
      flow.steps.push({
        action: 'goto /',
        result: `unexpected redirect to ${finalUrl}`,
        status: 'fail',
      });
      flow.status = 'fail';
      flow.issues.push({
        type: 'unexpected_redirect',
        severity: 'medium',
        description: `Expected / or /auth/signin, got ${finalUrl}`,
        step: 'goto /',
        screenshot: null,
      });
      console.log(`✗ Unexpected redirect to ${finalUrl}`);
    }
  } catch (e) {
    flow.status = 'fail';
    flow.steps.push({
      action: 'goto /',
      result: `error: ${e.message}`,
      status: 'fail',
    });
    flow.issues.push({
      type: 'crash',
      severity: 'critical',
      description: `Failed to load root page: ${e.message}`,
      step: 'goto /',
      screenshot: null,
    });
    console.log(`✗ Error: ${e.message}`);
  }

  return flow;
}

async function testFlow2(page) {
  const flow = {
    name: 'Auth Page State',
    status: 'pass',
    steps: [],
    issues: [],
  };

  try {
    console.log('Step 1: Navigating to /auth/signin');
    await page.goto(`${BASE_URL}/auth/signin`, {
      waitUntil: 'networkidle',
      timeout: 10000,
    });
    await page.waitForTimeout(1000);

    flow.steps.push({
      action: 'goto /auth/signin',
      result: 'page loaded',
      status: 'pass',
    });
    console.log('✓ Auth page loaded');

    console.log('Step 2: Looking for GitHub sign-in button');
    await page.screenshot({ path: '/tmp/flow2_auth.png', fullPage: true });

    // Try different selectors for GitHub button
    const selectors = [
      'button:has-text("Sign in with GitHub")',
      'button:has-text("GitHub")',
      'a:has-text("Sign in with GitHub")',
      'a:has-text("GitHub")',
      '[data-testid="github-signin"]',
      'button:has-text("Continue with GitHub")',
    ];

    let found = false;
    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          console.log(`✓ Found GitHub button with selector: ${selector}`);
          found = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (found) {
      flow.steps.push({
        action: 'check for GitHub button',
        result: 'GitHub sign-in button found',
        status: 'pass',
      });
      console.log('✓ GitHub sign-in button present');
    } else {
      flow.steps.push({
        action: 'check for GitHub button',
        result: 'GitHub sign-in button NOT found',
        status: 'fail',
      });
      flow.status = 'fail';
      flow.issues.push({
        type: 'missing_element',
        severity: 'critical',
        description: 'GitHub sign-in button not found on auth page',
        step: 'check for GitHub button',
        screenshot: '/tmp/flow2_auth.png',
      });
      console.log('✗ GitHub sign-in button missing');
    }
  } catch (e) {
    flow.status = 'fail';
    flow.steps.push({
      action: 'test auth page',
      result: `error: ${e.message}`,
      status: 'fail',
    });
    flow.issues.push({
      type: 'crash',
      severity: 'critical',
      description: `Failed to test auth page: ${e.message}`,
      step: 'test auth page',
      screenshot: null,
    });
    console.log(`✗ Error: ${e.message}`);
  }

  return flow;
}

async function testFlow3(page) {
  const flow = {
    name: 'Protected Route Redirect',
    status: 'pass',
    steps: [],
    issues: [],
  };

  try {
    console.log('Step 1: Navigating to /admin/backlog (protected)');
    await page.goto(`${BASE_URL}/admin/backlog`, {
      waitUntil: 'networkidle',
      timeout: 10000,
    });
    await page.waitForTimeout(1000);

    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);

    if (finalUrl.includes('/auth/signin')) {
      flow.steps.push({
        action: 'goto /admin/backlog without auth',
        result: `redirected to ${finalUrl}`,
        status: 'pass',
      });
      console.log('✓ Properly redirected to signin');
    } else if (finalUrl.includes('/admin/backlog')) {
      await page.screenshot({
        path: '/tmp/flow3_protected.png',
        fullPage: true,
      });

      // Look for auth indicators
      const content = await page.content();
      const authIndicators = [
        'Sign in',
        'Authentication required',
        'Please sign in',
        'GitHub',
        'Connect',
      ];

      const hasAuthPrompt = authIndicators.some((indicator) =>
        content.toLowerCase().includes(indicator.toLowerCase()),
      );

      if (hasAuthPrompt) {
        flow.steps.push({
          action: 'goto /admin/backlog without auth',
          result: 'page shows auth prompt',
          status: 'pass',
        });
        console.log('✓ Auth prompt shown on protected route');
      } else {
        flow.steps.push({
          action: 'goto /admin/backlog without auth',
          result: 'no redirect and no auth prompt',
          status: 'fail',
        });
        flow.status = 'fail';
        flow.issues.push({
          type: 'broken_navigation',
          severity: 'critical',
          description: 'Protected route accessible without auth or prompt',
          step: 'goto /admin/backlog without auth',
          screenshot: '/tmp/flow3_protected.png',
        });
        console.log('✗ No auth protection on protected route');
      }
    } else {
      flow.steps.push({
        action: 'goto /admin/backlog without auth',
        result: `unexpected redirect to ${finalUrl}`,
        status: 'fail',
      });
      flow.status = 'fail';
      flow.issues.push({
        type: 'unexpected_redirect',
        severity: 'high',
        description: `Expected /auth/signin or auth prompt, got ${finalUrl}`,
        step: 'goto /admin/backlog without auth',
        screenshot: null,
      });
      console.log(`✗ Unexpected redirect to ${finalUrl}`);
    }
  } catch (e) {
    flow.status = 'fail';
    flow.steps.push({
      action: 'test protected route',
      result: `error: ${e.message}`,
      status: 'fail',
    });
    flow.issues.push({
      type: 'crash',
      severity: 'critical',
      description: `Failed to test protected route: ${e.message}`,
      step: 'test protected route',
      screenshot: null,
    });
    console.log(`✗ Error: ${e.message}`);
  }

  return flow;
}

async function testFlow4(page) {
  const flow = {
    name: 'Settings Navigation',
    status: 'pass',
    steps: [],
    issues: [],
  };

  const settingsPages = [
    '/settings/database',
    '/settings/github',
    '/settings/api-keys',
  ];

  for (const settingsPath of settingsPages) {
    try {
      console.log(`Testing navigation to ${settingsPath}`);
      await page.goto(`${BASE_URL}${settingsPath}`, {
        waitUntil: 'networkidle',
        timeout: 10000,
      });
      await page.waitForTimeout(1000);

      const finalUrl = page.url();
      const screenshotName = settingsPath.split('/').pop();
      await page.screenshot({
        path: `/tmp/flow4_${screenshotName}.png`,
        fullPage: true,
      });

      if (finalUrl.includes(settingsPath)) {
        flow.steps.push({
          action: `goto ${settingsPath}`,
          result: 'page loaded successfully',
          status: 'pass',
        });
        console.log(`✓ ${settingsPath} loaded`);
      } else if (finalUrl.includes('/auth/signin')) {
        flow.steps.push({
          action: `goto ${settingsPath}`,
          result: 'redirected to signin (expected for protected route)',
          status: 'pass',
        });
        console.log(`✓ ${settingsPath} protected by auth`);
      } else {
        flow.steps.push({
          action: `goto ${settingsPath}`,
          result: `unexpected redirect to ${finalUrl}`,
          status: 'fail',
        });
        flow.status = 'fail';
        flow.issues.push({
          type: 'unexpected_redirect',
          severity: 'medium',
          description: `Expected ${settingsPath} or /auth/signin, got ${finalUrl}`,
          step: `goto ${settingsPath}`,
          screenshot: `/tmp/flow4_${screenshotName}.png`,
        });
        console.log(
          `✗ Unexpected redirect from ${settingsPath} to ${finalUrl}`,
        );
      }
    } catch (e) {
      flow.status = 'fail';
      flow.steps.push({
        action: `goto ${settingsPath}`,
        result: `error: ${e.message}`,
        status: 'fail',
      });
      flow.issues.push({
        type: 'crash',
        severity: 'high',
        description: `Failed to load ${settingsPath}: ${e.message}`,
        step: `goto ${settingsPath}`,
        screenshot: null,
      });
      console.log(`✗ Error loading ${settingsPath}: ${e.message}`);
    }
  }

  return flow;
}

// Main execution
console.log('Starting Mason Dashboard Flow Tests');
console.log(`Base URL: ${BASE_URL}\n`);

testFlows()
  .then((results) => {
    console.log('\n' + '='.repeat(60));
    console.log('FLOW TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Flows Tested: ${results.summary.flows_tested}`);
    console.log(`Flows Passed: ${results.summary.flows_passed}`);
    console.log(`Flows Failed: ${results.summary.flows_failed}`);
    console.log(`Issues Found: ${results.summary.issues_found}`);
    console.log('='.repeat(60));

    // Save results
    const outputDir = '.claude/battle-test/results';
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = `${outputDir}/FLOW-1.json`;
    writeFileSync(outputFile, JSON.stringify(results, null, 2));

    console.log(`\nResults saved to: ${outputFile}`);

    // Exit with error code if any flows failed
    process.exit(results.summary.flows_failed === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error('Fatal error:', e.message);
    process.exit(1);
  });
