# Mason

**AI-powered continuous improvement for your codebase.**

Mason analyzes your repo, suggests prioritized improvements, and lets you review and execute them through a dashboard.

---

## Architecture

Mason uses a **central instance** architecture - one Mason database manages improvements across all your projects:

```
┌─────────────────────────────────────────────────────┐
│              Mason Dashboard + Database              │
│                  (One per user/team)                 │
├─────────────────────────────────────────────────────┤
│  Connected Repositories:                             │
│    ├── github.com/you/project-a                      │
│    ├── github.com/you/project-b                      │
│    └── github.com/org/project-c                      │
│                                                      │
│  Backlog Items:                                      │
│    ├── "Add caching" → project-a                     │
│    ├── "Fix auth bug" → project-a                    │
│    └── "Improve UI" → project-b                      │
└─────────────────────────────────────────────────────┘
                        │
                        │ GitHub API
                        ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │project-a │ │project-b │ │project-c │
         │ (GitHub) │ │ (GitHub) │ │ (GitHub) │
         └──────────┘ └──────────┘ └──────────┘
```

**Why this design?**

- **Cross-project visibility** - See all improvements in one dashboard
- **No coupling** - Target projects don't need Mason tables; they just receive PRs
- **Single deployment** - One Mason instance per user/team
- **GitHub-native** - Execution creates branches and PRs in your repos

---

## Requirements

Before you start, make sure you have:

- **Node.js 18+** - [Download here](https://nodejs.org)
- **Claude Code** with Pro Max subscription - [Get Claude Code](https://claude.com/claude-code)
- **Supabase account** (free tier works) - [Create account](https://supabase.com)
- **GitHub account** - For OAuth and repository access
- **A git repository** - Mason works on any existing project

---

## Installation

### Step 1: Set Up Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (or use existing)
3. Go to **SQL Editor** and run these migrations in order:
   - `packages/mason-migrations/migrations/001_mason_schema.sql`
   - `packages/mason-migrations/migrations/002_auth_and_github.sql`

### Step 2: Create GitHub OAuth App

1. Go to GitHub **Settings** > **Developer Settings** > **OAuth Apps**
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** Mason
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**
5. Copy the **Client ID**
6. Generate and copy a **Client Secret**

### Step 3: Configure Environment

Create `packages/mason-dashboard/.env.local`:

```bash
# Supabase (from Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # From Project Settings > API > service_role

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# GitHub OAuth (from Step 2)
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Anthropic (for AI code generation)
ANTHROPIC_API_KEY=your-api-key
```

### Step 4: Install and Run Dashboard

```bash
cd packages/mason-dashboard
pnpm install
pnpm dev
```

Open http://localhost:3000 and sign in with GitHub.

### Step 5: Install CLI Commands (Optional)

To use Mason's analysis commands in your projects:

```bash
cd /path/to/your/project
curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh | bash
```

> **Security Note:** Always review scripts before running them. You can inspect the script first:
>
> ```bash
> curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh
> ```

This creates `.claude/commands/` with Mason commands in your project.

---

## How It Works

```
+------------------------------------------------------------------+
|  1. CONNECT                                                       |
|     Sign in with GitHub at localhost:3000                         |
|     - Authenticate via GitHub OAuth                               |
|     - Connect your repositories                                   |
|     - Manage repos in Settings                                    |
+------------------------------------------------------------------+
|  2. ANALYZE                                                       |
|     Run /pm-review in Claude Code (in your project)               |
|     - Scans codebase for improvements                             |
|     - Scores by impact & effort                                   |
|     - Stores in Supabase                                          |
+------------------------------------------------------------------+
|  3. REVIEW                                                        |
|     Open Dashboard at localhost:3000/admin/backlog                |
|     - See all improvements with stats                             |
|     - Filter by status: New, Approved, In Progress, etc.          |
|     - Click item to view details and benefits                     |
|     - Approve or Reject improvements                              |
+------------------------------------------------------------------+
|  4. EXECUTE                                                       |
|     Option A: Dashboard (Recommended)                             |
|       - Select repository from dropdown                           |
|       - Click "Execute" on Approved tab                           |
|       - Watch real-time progress                                  |
|       - PR created automatically on GitHub                        |
|                                                                   |
|     Option B: CLI                                                 |
|       - Click "Copy CLI Command"                                  |
|       - Paste into Claude Code                                    |
|       - Claude implements locally                                 |
+------------------------------------------------------------------+
```

---

## Usage

### 1. Sign In and Connect Repositories

1. Open http://localhost:3000
2. Click **Sign in with GitHub**
3. Go to **Settings** (user menu) > **Repository Settings**
4. Click **Connect Repository** and select your repos

### 2. Analyze Your Codebase

Open Claude Code in your project directory:

```bash
cd /path/to/your/project
claude
```

Run the analysis:

```
/pm-review
```

This scans your codebase and stores improvement suggestions in Supabase.

### 3. Review in Dashboard

Open http://localhost:3000/admin/backlog

**Dashboard Features:**

- **Stats Bar** - See counts for each status
- **Status Tabs** - Filter by New, Approved, In Progress, etc.
- **Repository Selector** - Choose target repo for execution
- **Table View** - See all improvements with type, priority, complexity
- **Detail Modal** - View full problem, solution, and benefits
- **Approve/Reject** - Change item status with one click

### 4. Execute Approved Items

**Option A: Remote Execution (Recommended)**

1. Select your repository from the dropdown
2. Click the **Approved** tab
3. Click **Execute** button
4. Watch real-time progress in the modal
5. PR is created automatically on GitHub

**Option B: Local CLI Execution**

1. Click the **Approved** tab
2. Click **Copy CLI Command**
3. Paste into Claude Code in your project directory

---

## Commands Reference

Run these commands inside Claude Code:

| Command                    | What It Does                           |
| -------------------------- | -------------------------------------- |
| `/pm-review`               | Analyze codebase and find improvements |
| `/pm-review quick`         | Find 5-7 quick wins only               |
| `/pm-review area:security` | Focus on security improvements         |
| `/execute-approved`        | Implement all approved items           |

---

## Project Structure After Setup

```
your-project/
├── mason.config.json              # Mason configuration
├── .claude/
│   ├── commands/
│   │   ├── pm-review.md           # Analysis command
│   │   └── execute-approved.md    # Execution command
│   └── skills/
│       └── pm-domain-knowledge/
│           └── SKILL.md           # Customize for your project
└── supabase/
    └── migrations/
        └── 001_mason_schema.sql   # Database schema
```

---

## Customization

### Add Your Domain Knowledge

Customize what Mason knows about your project by editing:

```
.claude/skills/pm-domain-knowledge/SKILL.md
```

Add information about:

- Your business goals
- Technical constraints
- Areas to focus on or avoid
- User personas

### Configure Analysis Domains

Edit `mason.config.json` to enable/disable analysis areas:

```json
{
  "domains": [
    { "name": "frontend-ux", "enabled": true, "weight": 1 },
    { "name": "api-backend", "enabled": true, "weight": 1 },
    { "name": "reliability", "enabled": true, "weight": 1 },
    { "name": "security", "enabled": true, "weight": 1.2 },
    { "name": "code-quality", "enabled": false, "weight": 0.8 }
  ]
}
```

Higher weights = higher priority for that domain.

---

## Security

### GitHub OAuth Permissions

Mason requests the following GitHub OAuth scopes:

| Scope        | Purpose                                     |
| ------------ | ------------------------------------------- |
| `read:user`  | Access your GitHub profile information      |
| `user:email` | Access your email for notifications         |
| `repo`       | Create branches, commits, and pull requests |

**Why `repo` scope?** Mason needs full repository access to implement improvements in your codebase. This includes creating feature branches, committing code changes, and opening pull requests. Mason only accesses repositories you explicitly connect through the dashboard.

### Data Storage

- **Supabase:** All data is stored in your own Supabase project
- **GitHub tokens:** Stored encrypted at rest by Supabase
- **No external servers:** Mason runs entirely on your infrastructure

For security issues, see [SECURITY.md](SECURITY.md).

---

## Troubleshooting

### Common Issues

| Problem                  | Solution                                                            |
| ------------------------ | ------------------------------------------------------------------- |
| GitHub sign-in fails     | Check `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env.local` |
| "Unauthorized" errors    | Make sure `NEXTAUTH_SECRET` is set                                  |
| Can't connect repository | Verify GitHub OAuth app has correct callback URL                    |
| Execution fails          | Check `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`           |
| "Not a git repository"   | Run the installer from your project root (where `.git` is)          |
| `/pm-review` not found   | Make sure `.claude/commands/pm-review.md` exists in your project    |
| No items in dashboard    | Run `/pm-review` first to generate improvement items                |
| Dashboard won't start    | Run `pnpm install` in the dashboard directory                       |

### Verify Environment

```bash
# Check all required env vars are set
cd packages/mason-dashboard
cat .env.local | grep -E "^[A-Z]" | cut -d= -f1
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `ANTHROPIC_API_KEY`

---

## Uninstall

To remove Mason from your project:

```bash
rm -rf .claude/commands/pm-review.md
rm -rf .claude/commands/execute-approved.md
rm -rf .claude/skills/pm-domain-knowledge
rm -rf supabase/migrations/001_mason_schema.sql
rm mason.config.json
```

---

## Support

- **Issues:** https://github.com/Assure-DeFi/mason/issues

---

## License

MIT
