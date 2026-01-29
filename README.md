<p align="center">
  <img src="brand/logos/svg/mason_icon.svg" alt="Mason Logo" width="120" />
</p>

<h1 align="center">Mason</h1>

<p align="center">
  <strong>AI-powered continuous improvement for your codebase</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node.js"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.3-blue.svg" alt="TypeScript"></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-14-black.svg" alt="Next.js"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#installation">Installation</a> •
  <a href="#documentation">Documentation</a>
</p>

---

Mason analyzes your repositories, suggests prioritized improvements, and lets you review and execute them through a dashboard. It creates pull requests automatically, turning your backlog into shipped code.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Assure-DeFi/mason.git
cd mason && pnpm install

# 2. Set up environment
cp packages/mason-dashboard/.env.example packages/mason-dashboard/.env.local
# Edit .env.local with your credentials

# 3. Run the dashboard
cd packages/mason-dashboard && pnpm dev
```

Open http://localhost:3000, sign in with GitHub, and connect your first repository.

## Features

- **Codebase Analysis** - Scans repos for security, performance, UX, and code quality improvements
- **Smart Prioritization** - Scores items by impact and effort to surface quick wins
- **Dashboard Review** - Visual interface to approve, reject, and track improvements
- **Automated Execution** - Creates branches and PRs automatically via GitHub API
- **Cross-Project Visibility** - Manage multiple repositories from one dashboard
- **Privacy-First** - All data stays in your own Supabase instance

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  1. CONNECT                                                  │
│     Sign in with GitHub and connect repositories             │
├─────────────────────────────────────────────────────────────┤
│  2. ANALYZE                                                  │
│     Run /pm-review in Claude Code to scan your codebase      │
├─────────────────────────────────────────────────────────────┤
│  3. REVIEW                                                   │
│     Approve or reject improvements in the dashboard          │
├─────────────────────────────────────────────────────────────┤
│  4. EXECUTE                                                  │
│     Click Execute to create PRs automatically                │
└─────────────────────────────────────────────────────────────┘
```

## Architecture

Mason uses a **central instance** architecture—one dashboard manages improvements across all your projects:

```
┌─────────────────────────────────────────────────────────────┐
│              Mason Dashboard + Your Supabase DB              │
├─────────────────────────────────────────────────────────────┤
│  Connected Repositories:                                     │
│    ├── github.com/you/project-a                              │
│    ├── github.com/you/project-b                              │
│    └── github.com/org/project-c                              │
└─────────────────────────────────────────────────────────────┘
                          │ GitHub API
                          ▼
          ┌──────────┐ ┌──────────┐ ┌──────────┐
          │project-a │ │project-b │ │project-c │
          └──────────┘ └──────────┘ └──────────┘
```

**Why this design?**

- **Cross-project visibility** - See all improvements in one place
- **No coupling** - Target projects just receive PRs, no Mason code required
- **Single deployment** - One instance per user or team
- **GitHub-native** - Standard branches and pull requests

## Installation

### Prerequisites

- [Node.js 18+](https://nodejs.org)
- [Claude Code](https://claude.ai/code) with Pro subscription
- [Supabase](https://supabase.com) account (free tier works)
- GitHub account

### Step 1: Set Up Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** and run the migrations from `packages/mason-migrations/migrations/`

### Step 2: Create GitHub OAuth App

1. Go to GitHub **Settings** → **Developer Settings** → **OAuth Apps**
2. Click **New OAuth App** with:
   - **Homepage URL:** `http://localhost:3000`
   - **Callback URL:** `http://localhost:3000/api/auth/callback/github`
3. Copy the Client ID and generate a Client Secret

### Step 3: Configure Environment

Create `packages/mason-dashboard/.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32>

# GitHub OAuth
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# AI Provider
ANTHROPIC_API_KEY=your-api-key
```

### Step 4: Run the Dashboard

```bash
cd packages/mason-dashboard
pnpm install
pnpm dev
```

### Step 5: Install CLI Commands (Optional)

Add Mason commands to your projects:

```bash
# macOS/Linux
curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh | bash

# Windows (PowerShell)
irm https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.ps1 | iex
```

## Commands

Run these in [Claude Code](https://claude.ai/code):

| Command                    | Description                            |
| -------------------------- | -------------------------------------- |
| `/pm-review`               | Analyze codebase and find improvements |
| `/pm-review quick`         | Find 5-7 quick wins only               |
| `/pm-review area:security` | Focus on security improvements         |
| `/execute-approved`        | Implement all approved items           |

## Project Structure

```
mason/
├── packages/
│   ├── mason-dashboard/     # Next.js web application
│   ├── mason-commands/      # Claude Code command templates
│   └── mason-migrations/    # Supabase SQL migrations
├── e2e/                     # Playwright E2E tests
├── brand/                   # Brand assets
└── .claude/                 # Claude Code configuration
```

## Documentation

| Document                                 | Description         |
| ---------------------------------------- | ------------------- |
| [CONTRIBUTING.md](CONTRIBUTING.md)       | How to contribute   |
| [SECURITY.md](SECURITY.md)               | Security policy     |
| [TESTING.md](TESTING.md)                 | E2E testing guide   |
| [CHANGELOG.md](CHANGELOG.md)             | Version history     |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards |

## Security

Mason is designed with privacy first:

- **Your data stays yours** - All data stored in your own Supabase instance
- **Minimal permissions** - Only requests necessary GitHub scopes
- **No external servers** - Runs entirely on your infrastructure
- **Encrypted at rest** - Supabase handles encryption

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Troubleshooting

| Problem                  | Solution                                                   |
| ------------------------ | ---------------------------------------------------------- |
| GitHub sign-in fails     | Check `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`        |
| "Unauthorized" errors    | Verify `NEXTAUTH_SECRET` is set                            |
| Can't connect repository | Check GitHub OAuth callback URL                            |
| Execution fails          | Verify `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` |
| `/pm-review` not found   | Run the installer in your project directory                |

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Development setup
git clone https://github.com/Assure-DeFi/mason.git
cd mason
pnpm install
pnpm dev
```

## License

[MIT](LICENSE) - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built by <a href="https://github.com/Assure-DeFi">Assure DeFi</a>
</p>
