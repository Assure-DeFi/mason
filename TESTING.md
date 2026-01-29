# Mason E2E Testing Guide

This guide explains how to run and maintain the E2E test suite for the Mason Compound Learning System.

## Quick Start

```bash
# Run all E2E tests (dev server starts automatically)
pnpm exec playwright test

# Run with interactive UI
pnpm exec playwright test --ui

# Run in headed mode (see the browser)
pnpm exec playwright test --headed

# Run specific test
pnpm exec playwright test e2e/mason-compound-learning.spec.ts
```

## Test Suite Structure

### Test Files

```
mason/
├── e2e/
│   └── mason-compound-learning.spec.ts    # Main E2E test suite
├── playwright.config.ts                    # Playwright configuration
└── test-results/
    └── screenshots/                        # Test screenshots (generated)
```

### Test Coverage

The test suite covers:

1. **API Endpoints** (4 routes)
   - GET /api/v1/backlog/next
   - POST /api/v1/backlog/[id]/start
   - POST /api/v1/backlog/[id]/complete
   - POST /api/v1/backlog/[id]/fail

2. **UI Components**
   - Platform Selector
   - Setup Wizard
   - Backlog Page

3. **Cross-cutting Concerns**
   - Authentication
   - Responsive design
   - Console errors
   - Brand compliance

## Test Configuration

### playwright.config.ts

Key settings:

- **baseURL**: `http://localhost:3000`
- **Browser**: Chromium only (for CI consistency)
- **Workers**: 1 (sequential execution)
- **Retries**: 0 locally, 2 on CI
- **Screenshots**: Only on failure
- **Video**: Retained on failure
- **Web Server**: Auto-starts Next.js dev server

### Environment Variables

Tests use the same environment as the dev server:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Writing New Tests

### Basic Test Structure

```typescript
test('Test description', async ({ page }) => {
  // Navigate to page
  await page.goto('/path');
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await page.screenshot({ path: 'test-results/screenshots/name.png' });

  // Perform assertions
  await expect(page.locator('selector')).toBeVisible();
});
```

### API Testing

```typescript
test('API endpoint test', async ({ request }) => {
  const response = await request.get('/api/endpoint', {
    headers: { Authorization: 'Bearer test_key' },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toBeTruthy();
});
```

### Console Error Detection

```typescript
test('No console errors', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  await page.goto('/path');

  expect(errors.length).toBe(0);
});
```

## Debugging Tests

### View Test Results

```bash
# Generate and open HTML report
pnpm exec playwright show-report
```

### Run with UI Mode

```bash
# Interactive debugging
pnpm exec playwright test --ui
```

### Run Single Test

```bash
# Run specific test by name
pnpm exec playwright test -g "Test name"
```

### Enable Debug Mode

```bash
# Run with debug logs
DEBUG=pw:api pnpm exec playwright test
```

### Headed Mode

```bash
# See the browser
pnpm exec playwright test --headed
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 24
      - name: Install dependencies
        run: pnpm install
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium
      - name: Run E2E tests
        run: pnpm exec playwright test
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/
```

## Troubleshooting

### Server Won't Start

**Problem**: Dev server fails to start

**Solution**:

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Tests Timeout

**Problem**: Tests timeout waiting for server

**Solution**: Increase timeout in `playwright.config.ts`:

```typescript
webServer: {
  timeout: 120 * 1000, // 2 minutes
}
```

### Clipboard Tests Fail

**Problem**: Clipboard API not available

**Solution**: Grant permissions in test:

```typescript
test('Clipboard test', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  // ... rest of test
});
```

### Screenshots Not Saving

**Problem**: Screenshot directory doesn't exist

**Solution**: Create directory manually or update path:

```typescript
await page.screenshot({
  path: 'test-results/screenshots/name.png',
  fullPage: true,
});
```

## Best Practices

### 1. Use Explicit Waits

```typescript
// Good
await page.waitForLoadState('networkidle');
await page.waitForSelector('.my-element');

// Avoid
await page.waitForTimeout(5000); // Only use as last resort
```

### 2. Use Data Attributes

```typescript
// In component
<button data-testid="submit-button">Submit</button>

// In test
await page.locator('[data-testid="submit-button"]').click();
```

### 3. Take Screenshots

```typescript
// Before critical actions
await page.screenshot({ path: 'before-action.png' });
await page.click('button');
await page.screenshot({ path: 'after-action.png' });
```

### 4. Clean Test Data

```typescript
// Clean up after test
test.afterEach(async () => {
  // Delete test data from database
});
```

### 5. Use Page Object Model

```typescript
// pages/BacklogPage.ts
export class BacklogPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/admin/backlog');
    await this.page.waitForLoadState('networkidle');
  }
}

// In test
const backlog = new BacklogPage(page);
await backlog.goto();
```

## Maintenance

### Update Dependencies

```bash
# Update Playwright
pnpm update @playwright/test playwright

# Reinstall browsers
pnpm exec playwright install chromium
```

### Add New Test

1. Create test in `e2e/` directory
2. Follow naming convention: `feature-name.spec.ts`
3. Add to test report documentation
4. Verify CI passes

### Review Test Flakiness

```bash
# Run tests multiple times to check stability
for i in {1..10}; do pnpm exec playwright test; done
```

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)

## Support

For issues or questions:

1. Check test logs: `test-results/`
2. Review screenshots: `test-results/screenshots/`
3. Run with debug: `DEBUG=pw:api pnpm exec playwright test`
4. Check Playwright docs
5. Open an issue on GitHub
