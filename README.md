# Mason

**AI-powered continuous improvement for your codebase.**

Mason analyzes your repo, suggests prioritized improvements, and lets you review and execute them through a dashboard.

---

## Requirements

Before you start, make sure you have:

- **Node.js 18+** - [Download here](https://nodejs.org)
- **Claude Code** with Pro Max subscription - [Get Claude Code](https://claude.com/claude-code)
- **Supabase account** (free tier works) - [Create account](https://supabase.com)
- **A git repository** - Mason works on any existing project

---

## Installation

### Step 1: Navigate to Your Project

```bash
cd /path/to/your/project
```

### Step 2: Run the Installer

```bash
curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh | bash
```

This will:

- Create `.claude/commands/` with Mason commands
- Create `.claude/skills/` with domain knowledge template
- Create `supabase/migrations/` with database schema
- Create `mason.config.json` configuration file

### Step 3: Add Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Go to **Project Settings** > **API**
4. Copy your **Project URL** and **anon/public key**
5. Open `mason.config.json` and add them:

```json
{
  "version": "1.0",
  "supabase": {
    "url": "https://xxxxx.supabase.co",
    "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
}
```

### Step 4: Run Database Migration

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `supabase/migrations/001_mason_schema.sql`
4. Paste and run in SQL Editor

---

## How It Works

```
+------------------------------------------------------------------+
|  1. ANALYZE                                                       |
|     Run /pm-review in Claude Code                                 |
|     - Scans codebase for improvements                             |
|     - Scores by impact & effort                                   |
|     - Stores in Supabase                                          |
+------------------------------------------------------------------+
|  2. REVIEW (Dashboard)                                            |
|     Open Dashboard at localhost:3000/admin/backlog                |
|     - See all improvements with stats                             |
|     - Filter by status: New, Approved, In Progress, etc.          |
|     - Click item to view details and benefits                     |
|     - Approve or Reject improvements                              |
+------------------------------------------------------------------+
|  3. EXECUTE                                                       |
|     Click "Execute All" on Approved tab                           |
|     - Copies command to clipboard                                 |
|     - Paste into Claude Code                                      |
|     - Claude implements all approved items                        |
+------------------------------------------------------------------+
```

---

## Usage

### 1. Analyze Your Codebase

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

### 2. Review in Dashboard

Start the dashboard:

```bash
cd mason-dashboard
pnpm install
pnpm dev
```

Open http://localhost:3000/admin/backlog

**Dashboard Features:**

- **Stats Bar** - See counts for each status
- **Status Tabs** - Filter by New, Approved, In Progress, etc.
- **Table View** - See all improvements with type, priority, complexity
- **Detail Modal** - View full problem, solution, and benefits
- **Approve/Reject** - Change item status with one click
- **Execute All** - Copy command to implement approved items

### 3. Execute Approved Items

1. Click the **Approved** tab
2. Click **Execute All** button
3. Paste the copied command into Claude Code

Claude will implement all approved improvements automatically.

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

## Troubleshooting

### Common Issues

| Problem                        | Solution                                                         |
| ------------------------------ | ---------------------------------------------------------------- |
| "Not a git repository"         | Run the installer from your project root (where `.git` is)       |
| "Missing Supabase credentials" | Add `supabase.url` and `supabase.anonKey` to `mason.config.json` |
| `/pm-review` not found         | Make sure `.claude/commands/pm-review.md` exists                 |
| No items in dashboard          | Run `/pm-review` first to generate improvement items             |
| Dashboard won't start          | Run `pnpm install` in the dashboard directory                    |

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
