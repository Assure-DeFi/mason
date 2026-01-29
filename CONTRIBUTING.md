# Contributing to Mason

Thank you for your interest in contributing to Mason! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment (see below)
4. Create a branch for your changes
5. Make your changes and test them
6. Submit a pull request

## Development Setup

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org)
- **pnpm 9.0+** - Install with `npm install -g pnpm`
- **Supabase account** - [Sign up](https://supabase.com) (free tier works)
- **GitHub account** - For OAuth testing

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mason.git
cd mason

# Install dependencies
pnpm install

# Set up environment variables
cp packages/mason-dashboard/.env.example packages/mason-dashboard/.env.local
# Edit .env.local with your credentials

# Run the development server
cd packages/mason-dashboard
pnpm dev
```

### Database Setup

1. Create a Supabase project
2. Run migrations from `packages/mason-migrations/migrations/` in order
3. Configure your `.env.local` with Supabase credentials

## Project Structure

```
mason/
├── packages/
│   ├── mason-dashboard/     # Next.js web application
│   │   ├── src/
│   │   │   ├── app/         # Next.js App Router pages
│   │   │   ├── components/  # React components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── lib/         # Utilities and helpers
│   │   │   └── types/       # TypeScript type definitions
│   │   └── public/          # Static assets
│   ├── mason-commands/      # Claude Code command templates
│   └── mason-migrations/    # Supabase SQL migrations
├── e2e/                     # Playwright E2E tests
├── brand/                   # Brand assets and guidelines
└── .claude/                 # Claude Code configuration
```

## Making Changes

### Branch Naming

Use descriptive branch names:

```
work/feature-name      # New features
fix/bug-description    # Bug fixes
refactor/area          # Refactoring
docs/topic             # Documentation
```

### Commit Messages

Follow conventional commit format:

```
type: description

[optional body]

Co-Authored-By: Your Name <your@email.com>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

Examples:

- `feat: add repository connection wizard`
- `fix: resolve authentication timeout issue`
- `docs: update installation instructions`

## Code Style

### TypeScript

- Use strict TypeScript - no `any` types
- Prefer `interface` over `type` for object shapes
- Use descriptive variable names
- Handle null/undefined explicitly

### React Components

- Use functional components with hooks
- Follow the state order pattern: error → loading → empty → success
- Include proper loading and error states

### Formatting

The project uses ESLint and Prettier. Run before committing:

```bash
# Check formatting
pnpm format:check

# Fix formatting
pnpm format

# Lint code
pnpm lint

# Fix lint issues
pnpm lint:fix
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run E2E tests
cd e2e && pnpm test

# Run with coverage
pnpm test:coverage
```

### Writing Tests

- Add tests for new features
- Update tests when modifying existing functionality
- E2E tests go in the `e2e/` directory
- Unit tests go alongside the code they test

## Submitting Changes

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Fill out the PR template completely
4. Request review from maintainers

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No secrets or credentials committed
- [ ] Lint and format checks pass
- [ ] Build succeeds

### Review Process

- PRs require at least one approval
- Address review feedback promptly
- Keep PRs focused and reasonably sized

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Be clear and provide context in your questions

Thank you for contributing to Mason!
