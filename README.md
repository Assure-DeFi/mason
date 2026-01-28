# Mason

**AI-powered continuous improvement for your codebase.**

Mason analyzes your repo, suggests prioritized improvements, and executes them automatically using Claude Code.

---

## Requirements

Before you start, make sure you have:

- **Node.js 18+** - [Download here](https://nodejs.org)
- **Claude Code** with Pro Max subscription - [Get Claude Code](https://claude.com/claude-code)
- **Supabase account** (free tier works) - [Create account](https://supabase.com)
- **A git repository** - Mason works on any existing project

---

## Installation (5 minutes)

### Step 1: Open Your Terminal

Open a terminal window on your computer.

### Step 2: Navigate to Your Project

Use `cd` to go to your project's root directory (where your `.git` folder is):

```bash
cd /path/to/your/project
```

**Examples:**

```bash
cd ~/projects/my-webapp
cd ~/code/my-saas-app
cd /Users/jane/Development/my-project
```

### Step 3: Run the Installer

Copy and paste this command into your terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh | bash
```

This will:

- Create `.claude/commands/` with Mason commands
- Create `.claude/skills/` with domain knowledge template
- Create `supabase/migrations/` with database schema
- Create `mason.config.json` configuration file

### Step 4: Add Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Go to **Project Settings** > **API**
4. Copy your **Project URL** and **anon/public key**

5. Open `mason.config.json` in your project and add them:

```json
{
  "version": "1.0",
  "supabase": {
    "url": "https://xxxxx.supabase.co",
    "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
}
```

### Step 5: Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open each file in `supabase/migrations/` and run them **in order**:
   - `001_pm_backlog_tables.sql`
   - `002_pm_execution_runs.sql`
   - `003_pm_execution_tasks.sql`

### Step 6: Start Using Mason

1. Open Claude Code in your project directory:

   ```bash
   cd /path/to/your/project
   claude
   ```

2. Run your first analysis:
   ```
   /pm-review
   ```

Mason will analyze your codebase and store improvement suggestions in Supabase.

---

## How It Works

```
+-------------------------------------------------------------+
|  1. ANALYZE                                                  |
|     Run /pm-review in Claude Code                           |
|     - Scans codebase for improvements                       |
|     - Scores by impact & effort                             |
|     - Stores in Supabase                                    |
+-------------------------------------------------------------+
|  2. REVIEW                                                   |
|     Open Dashboard at localhost:3000/admin/backlog          |
|     - See all improvements sorted by priority               |
|     - Approve items you want implemented                    |
|     - Generate PRDs for approved items                      |
+-------------------------------------------------------------+
|  3. EXECUTE                                                  |
|     Run /execute-approved in Claude Code                    |
|     - Creates feature branches                              |
|     - Implements changes in parallel waves                  |
|     - Commits with proper messages                          |
+-------------------------------------------------------------+
```

---

## Commands Reference

Run these commands inside Claude Code:

| Command                       | What It Does                           |
| ----------------------------- | -------------------------------------- |
| `/pm-review`                  | Analyze codebase and find improvements |
| `/pm-review quick`            | Find 5-7 quick wins only               |
| `/pm-review area:security`    | Focus on security improvements         |
| `/execute-approved`           | Implement all approved items           |
| `/execute-approved --limit 3` | Implement top 3 approved items         |

---

## Dashboard (Optional)

The dashboard lets you view and manage improvements in a web UI.

### Setup

After running the installer, a `mason-dashboard/` folder is created. To start it:

```bash
cd /path/to/your/project/mason-dashboard
pnpm install
pnpm dev
```

Then open: http://localhost:3000/admin/backlog

### Features

- View all improvements sorted by priority
- Filter by status, area, or type
- Approve/reject items
- Generate PRDs with one click

---

## Project Structure After Setup

After installation, Mason adds these files to your project:

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
├── supabase/
│   └── migrations/                # Database schema
│       ├── 001_pm_backlog_tables.sql
│       ├── 002_pm_execution_runs.sql
│       └── 003_pm_execution_tasks.sql
└── mason-dashboard/               # Next.js dashboard (optional)
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

### Verify Your Setup

From your project directory, run:

```bash
curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/doctor.sh | bash
```

This checks:

- Configuration file exists
- Supabase credentials are set
- Claude Code commands are installed
- Migration files are present

### Common Issues

| Problem                        | Solution                                                         |
| ------------------------------ | ---------------------------------------------------------------- |
| "Not a git repository"         | Run the installer from your project root (where `.git` is)       |
| "Missing Supabase credentials" | Add `supabase.url` and `supabase.anonKey` to `mason.config.json` |
| `/pm-review` not found         | Make sure `.claude/commands/pm-review.md` exists                 |
| No items in dashboard          | Run `/pm-review` first to generate improvement items             |
| Dashboard won't start          | Run `pnpm install` in the `mason-dashboard/` directory           |

---

## Uninstall

To remove Mason from your project, delete these files/folders:

```bash
rm -rf .claude/commands/pm-review.md
rm -rf .claude/commands/execute-approved.md
rm -rf .claude/skills/pm-domain-knowledge
rm -rf supabase/migrations/001_pm_backlog_tables.sql
rm -rf supabase/migrations/002_pm_execution_runs.sql
rm -rf supabase/migrations/003_pm_execution_tasks.sql
rm -rf mason-dashboard
rm mason.config.json
```

---

## Support

- **Issues:** https://github.com/Assure-DeFi/mason/issues
- **Documentation:** This README

---

## License

MIT
