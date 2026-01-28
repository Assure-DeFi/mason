---
name: testing-patterns
description: Testing patterns and conventions for TypeScript/React projects. Use when writing tests, setting up test infrastructure, or working with mocks. Keywords: test, jest, vitest, testing, spec, mock, stub, fixture, coverage, unit test, e2e, playwright, testing-library.
---

# Testing Patterns

## Framework Setup

### Preferred Testing Stack

| Type            | Tool                    | Location                    |
| --------------- | ----------------------- | --------------------------- |
| Unit Tests      | Vitest or Jest          | `__tests__/` or `*.test.ts` |
| Component Tests | Testing Library         | `*.test.tsx`                |
| E2E Tests       | Playwright              | `e2e/` or `tests/`          |
| API Tests       | Vitest/Jest + supertest | `__tests__/api/`            |

## File Naming Conventions

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx          # Co-located test
├── lib/
│   ├── utils.ts
│   └── __tests__/
│       └── utils.test.ts        # Grouped tests
└── app/
    └── api/
        └── users/
            └── route.test.ts    # API route test
```

## Test Structure Pattern (AAA)

```typescript
describe("ComponentName", () => {
  // Group related tests
  describe("when condition", () => {
    it("should expected behavior", () => {
      // Arrange - Set up test data
      const input = { value: "test" };

      // Act - Execute the code
      const result = processInput(input);

      // Assert - Verify the outcome
      expect(result).toBe("expected");
    });
  });
});
```

## Unit Test Patterns

### Testing Functions

```typescript
import { describe, it, expect } from "vitest";
import { formatCurrency, validateEmail } from "@/lib/utils";

describe("formatCurrency", () => {
  it("should format positive numbers with $ symbol", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("should handle zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("should handle negative numbers", () => {
    expect(formatCurrency(-100)).toBe("-$100.00");
  });
});

describe("validateEmail", () => {
  it.each([
    ["valid@email.com", true],
    ["invalid", false],
    ["missing@domain", false],
    ["@nodomain.com", false],
  ])('should validate "%s" as %s', (email, expected) => {
    expect(validateEmail(email)).toBe(expected);
  });
});
```

### Testing Async Functions

```typescript
import { describe, it, expect, vi } from "vitest";
import { fetchUser } from "@/lib/api";

describe("fetchUser", () => {
  it("should return user data on success", async () => {
    const user = await fetchUser("123");

    expect(user).toMatchObject({
      id: "123",
      name: expect.any(String),
    });
  });

  it("should throw on invalid user", async () => {
    await expect(fetchUser("invalid")).rejects.toThrow("User not found");
  });
});
```

## Component Test Patterns

### Using Testing Library

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when loading', () => {
    render(<Button disabled>Loading...</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Testing Forms

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/LoginForm';

describe('LoginForm', () => {
  it('should submit with valid data', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();

    render(<LoginForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), 'invalid');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });
});
```

## API Route Test Patterns

### Testing Next.js Route Handlers

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/users/route";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth", () => ({
  getServerSession: vi.fn(),
  authOptions: {},
}));

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    const { getServerSession } = await import("@/lib/auth");
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/users");
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should return users when authenticated", async () => {
    const { getServerSession } = await import("@/lib/auth");
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: "test@example.com" },
    });

    const request = new NextRequest("http://localhost/api/users");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.items)).toBe(true);
  });
});
```

## Mocking Patterns

### Mocking Modules

```typescript
import { vi } from "vitest";

// Mock entire module
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
}));

// Mock specific exports
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    fetchData: vi.fn().mockResolvedValue({ data: "mocked" }),
  };
});
```

### Mocking Fetch

```typescript
import { vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("should handle fetch response", async () => {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: "test" }),
  } as Response);

  const result = await fetchData();

  expect(result).toEqual({ data: "test" });
});
```

### Mocking Supabase

```typescript
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));
```

## E2E Test Patterns (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "password");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should display user data", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible();
    await expect(page.getByTestId("user-stats")).toBeVisible();
  });

  test("should create new item", async ({ page }) => {
    await page.click('button:has-text("New Item")');
    await page.fill('[name="title"]', "Test Item");
    await page.click('button:has-text("Save")');

    await expect(page.getByText("Test Item")).toBeVisible();
  });
});
```

## Test Data Factories

```typescript
// test/factories/user.ts
import { faker } from '@faker-js/faker';

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    createdAt: faker.date.past(),
    ...overrides,
  };
}

export function createUsers(count: number): User[] {
  return Array.from({ length: count }, () => createUser());
}

// Usage in tests
it('should display user list', () => {
  const users = createUsers(3);
  render(<UserList users={users} />);

  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});
```

## Test Configuration

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "test/"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Test Setup File

```typescript
// test/setup.ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
```

## Quick Reference Checklist

When writing tests:

- [ ] Follow AAA pattern (Arrange, Act, Assert)
- [ ] Use descriptive test names (should + expected behavior)
- [ ] Test edge cases (null, empty, error states)
- [ ] Mock external dependencies
- [ ] Use test factories for data
- [ ] Keep tests isolated (no shared state)
- [ ] Test behavior, not implementation
- [ ] Include both happy path and error cases
