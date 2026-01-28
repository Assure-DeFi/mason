# Mason

**AI-powered continuous improvement for your codebase.**

Mason analyzes your repo, suggests prioritized improvements, and executes them automatically using Claude Code.

---

## Quick Start (5 minutes)

### Step 1: Install Mason in Your Repo

```bash
cd ~/projects/article-intake   # or your repo

# Run the setup wizard
npx @anthropic-ai/claude-code --command "$(curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh)"
```

**Or if you have Mason cloned locally:**

```bash
cd ~/projects/article-intake
node ~/projects/mason/packages/mason-cli/dist/bin/mason.js init
```

### Step 2: Follow the Wizard

The wizard will:

1. Ask for your Supabase credentials (or help you create a project)
2. Install Claude Code commands (`/pm-review`, `/execute-approved`)
3. Create database migration files
4. Set up the dashboard

### Step 3: Run the Database Migrations

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Run each file from `supabase/migrations/` in order:
   - `001_pm_backlog_tables.sql`
   - `002_pm_execution_runs.sql`
   - `003_pm_execution_tasks.sql`

### Step 4: Start Using Mason

Open Claude Code in your repo and run:

```
/pm-review
```

That's it! Mason will analyze your codebase and store improvements in Supabase.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  1. ANALYZE                                                  │
│     Run /pm-review in Claude Code                           │
│     → Scans codebase for improvements                       │
│     → Scores by impact & effort                             │
│     → Stores in Supabase                                    │
├─────────────────────────────────────────────────────────────┤
│  2. REVIEW                                                   │
│     Open Dashboard at localhost:3000/admin/backlog          │
│     → See all improvements sorted by priority               │
│     → Approve items you want implemented                    │
│     → Generate PRDs for approved items                      │
├─────────────────────────────────────────────────────────────┤
│  3. EXECUTE                                                  │
│     Run /execute-approved in Claude Code                    │
│     → Creates feature branches                              │
│     → Implements changes in parallel waves                  │
│     → Commits with proper messages                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Commands

| Command                       | What It Does                           |
| ----------------------------- | -------------------------------------- |
| `/pm-review`                  | Analyze codebase and find improvements |
| `/pm-review quick`            | Find 5-7 quick wins only               |
| `/pm-review area:security`    | Focus on security improvements         |
| `/execute-approved`           | Implement all approved items           |
| `/execute-approved --limit 3` | Implement top 3 approved items         |

---

## Dashboard

Start the dashboard to view and manage improvements:

```bash
cd mason-dashboard
pnpm install
pnpm dev
```

Open http://localhost:3000/admin/backlog

**Features:**

- View all improvements sorted by priority
- Filter by status, area, or type
- Approve/reject items
- Generate PRDs with one click

---

## Requirements

- **Node.js 18+**
- **Claude Code** with Pro Max subscription
- **Supabase** account (free tier works)
- **Anthropic API key** (optional, for PRD generation in dashboard)

---

## Project Structure After Setup

```
your-repo/
├── mason.config.json              # Mason configuration
├── .claude/
│   ├── commands/
│   │   ├── pm-review.md           # Analysis command
│   │   └── execute-approved.md    # Execution command
│   └── skills/
│       └── pm-domain-knowledge/
│           └── SKILL.md           # Customize for your project
├── supabase/
│   └── migrations/                # Database schema
│       ├── 001_pm_backlog_tables.sql
│       ├── 002_pm_execution_runs.sql
│       └── 003_pm_execution_tasks.sql
└── mason-dashboard/               # Next.js dashboard (optional)
```

---

## Customization

### Edit Domain Knowledge

Customize what Mason knows about your project:

```bash
# Edit this file to add your business context
nano .claude/skills/pm-domain-knowledge/SKILL.md
```

Add:

- Your business goals
- Technical constraints
- Areas to focus on or avoid
- User personas

### Configure Domains

Edit `mason.config.json` to enable/disable analysis domains:

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

---

## Troubleshooting

### Check Your Setup

```bash
mason doctor
```

This verifies:

- Configuration file exists
- Supabase credentials are set
- Claude Code commands are installed
- Migration files are present

### Common Issues

| Problem                        | Solution                                                         |
| ------------------------------ | ---------------------------------------------------------------- |
| "Missing Supabase credentials" | Add `supabase.url` and `supabase.anonKey` to `mason.config.json` |
| Dashboard won't start          | Check `mason-dashboard/.env.local` has correct values            |
| `/pm-review` not found         | Run `mason init` to install commands                             |
| No items in dashboard          | Run `/pm-review` first, then check Supabase tables               |

---

## Support

- Issues: https://github.com/Assure-DeFi/mason/issues
- Run `mason doctor` to diagnose problems

---

## License

MIT
