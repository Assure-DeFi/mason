# Team Claude Code Configuration Setup

This guide explains how to share Claude Code configuration across your team so everyone produces consistent, high-quality code.

## Architecture Overview

```
GitHub Repos:
├── your-org/claude-team-config     ← Shared Claude Code config
│   └── .claude/
│       ├── skills/                 ← Domain knowledge
│       ├── hooks/                  ← Automation
│       ├── commands/               ← Workflows
│       ├── agents/                 ← Specialized assistants
│       └── rules/                  ← Guidelines
│
└── your-org/nextjs-template        ← Project template
    ├── .claude/                    ← Project-specific overrides
    ├── brand/                      ← Brand assets
    ├── src/                        ← Standard structure
    ├── CLAUDE.md                   ← Project memory
    └── package.json                ← Dependencies

Each Developer:
├── ~/.claude/                      ← Global fallback (optional)
├── ~/projects/claude-team-config/  ← Cloned shared config
└── ~/projects/my-project/          ← Project using shared config
```

---

## Option A: Centralized Config with Symlinks (Recommended)

This approach keeps one source of truth that all projects reference.

### Initial Setup (One-Time)

**1. Create GitHub Repo for Shared Config**

```bash
# Go to GitHub and create: your-org/claude-team-config
# Then push your local config:

cd /path/to/projects
git remote add origin https://github.com/your-org/claude-team-config.git
git push -u origin main
```

**2. Each Team Member Clones**

```bash
# Clone to a standard location
cd ~
git clone https://github.com/your-org/claude-team-config.git .claude-team-config

# Or to a projects folder
cd ~/projects
git clone https://github.com/your-org/claude-team-config.git claude-team-config
```

**3. Create Global Symlink (Optional but Recommended)**

```bash
# Link to user-level Claude config
ln -s ~/claude-team-config/.claude ~/.claude
```

This makes the team config your default for ALL projects.

### Per-Project Setup

For each new or existing project:

```bash
cd ~/projects/my-project

# Option 1: Symlink to shared config (recommended)
ln -s ~/claude-team-config/.claude .claude

# Option 2: Copy and customize (if project needs overrides)
cp -r ~/claude-team-config/.claude .claude
```

### Updating Shared Config

When someone improves the shared config:

```bash
# Pull latest changes
cd ~/claude-team-config
git pull origin main

# All symlinked projects automatically get updates!
```

---

## Option B: Template Repository (For New Projects)

This approach bakes the config into your project template.

### Create Template Repo

**1. Create a Next.js template with Claude config:**

```bash
# Create base project
npx create-next-app@latest nextjs-template --typescript --tailwind --eslint --app

cd nextjs-template

# Copy Claude config into it
cp -r ~/claude-team-config/.claude .claude

# Copy brand assets
cp -r ~/existing-project/brand brand

# Add standard CLAUDE.md
# (See template below)
```

**2. Push to GitHub as Template**

```bash
git init
git add .
git commit -m "Initial template with Claude Code config"
git remote add origin https://github.com/your-org/nextjs-template.git
git push -u origin main
```

**3. Mark as Template on GitHub**

- Go to repo Settings → General
- Check "Template repository"

### Using the Template

For new projects:

1. Go to your template repo on GitHub
2. Click "Use this template" → "Create a new repository"
3. Name your project and create
4. Clone and start working

---

## Option C: Git Submodule (Advanced)

Include shared config as a submodule in each project.

```bash
cd ~/projects/my-project
git submodule add https://github.com/your-org/claude-team-config.git .claude-config
ln -s .claude-config/.claude .claude
```

Update submodule:

```bash
git submodule update --remote
```

---

## Team Workflow

### Making Changes to Shared Config

```bash
# 1. Clone/navigate to shared config repo
cd ~/claude-team-config

# 2. Create branch
git checkout -b improve/add-testing-skill

# 3. Make changes
# Edit skills, hooks, rules, etc.

# 4. Commit and push
git add .
git commit -m "feat: add testing-patterns skill"
git push origin improve/add-testing-skill

# 5. Create PR for team review
# 6. After approval, merge to main
# 7. Everyone pulls to get updates
```

### Team Members Getting Updates

```bash
cd ~/claude-team-config
git pull origin main

# If using symlinks, projects automatically have new config
# If using copies, need to re-copy or manually update
```

---

## Recommended Directory Structure for Template

```
your-template/
├── .claude/
│   ├── settings.json           # Hooks config (commit this)
│   ├── settings.local.json     # Personal settings (gitignored)
│   ├── hooks/
│   │   ├── protect-main-branch.sh
│   │   ├── auto-format.sh
│   │   ├── type-check.sh
│   │   └── suggest-skills.sh
│   ├── skills/
│   │   ├── brand-guidelines/SKILL.md
│   │   ├── supabase-patterns/SKILL.md
│   │   └── nextjs-patterns/SKILL.md
│   ├── commands/
│   │   └── ralph.md
│   ├── agents/
│   │   └── code-reviewer.md
│   └── rules/
│       ├── brand-compliance.md
│       ├── code-quality.md
│       └── git-workflow.md
│
├── brand/
│   ├── BRAND.md
│   ├── tokens/design-tokens.json
│   ├── rules/DO-NOT.md
│   ├── assets/logos/
│   └── knowledge/
│
├── src/
│   ├── app/
│   ├── components/
│   │   └── ui/               # shadcn components
│   └── lib/
│
├── supabase/
│   └── migrations/
│
├── .env.example              # Template env vars
├── .gitignore
├── CLAUDE.md                 # Project memory
├── package.json
├── tsconfig.json
└── README.md
```

---

## .gitignore for Shared Config Repo

```gitignore
# Local settings (personal preferences, permissions)
settings.local.json
*.local.json
*.local.md

# OS files
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/
```

---

## .gitignore for Project Template

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build
.next/
dist/
build/

# Environment (secrets)
.env
.env.local
.env.*.local

# Claude local settings
.claude/settings.local.json
.claude/*.local.md

# OS
.DS_Store

# Editor
.vscode/
.idea/

# Testing
coverage/
test-results/
playwright-report/
```

---

## Onboarding New Team Members

### Quick Start for New Dev

```bash
# 1. Clone shared config
git clone https://github.com/your-org/claude-team-config.git ~/claude-team-config

# 2. Create global symlink
ln -s ~/claude-team-config/.claude ~/.claude

# 3. Clone project to work on
git clone https://github.com/your-org/project-name.git ~/projects/project-name

# 4. Start Claude Code
cd ~/projects/project-name
claude --dangerously-skip-permissions

# ⚠️ Running plain `claude` will trigger many manual approval prompts
# and won't run smoothly with Mason commands.

# They now have:
# - All team skills
# - All team hooks (branch protection, auto-format, etc.)
# - All team commands (/ralph)
# - All team agents (code-reviewer)
# - All team rules
```

### Verification

New team member can verify setup:

```bash
# Check skills are available
ls ~/.claude/skills/

# Check hooks are executable
ls -la ~/.claude/hooks/

# Check commands exist
ls ~/.claude/commands/

# Test in Claude (always use --dangerously-skip-permissions)
claude --dangerously-skip-permissions
> "What skills are available?"
> "Use brand-guidelines to create a button"
```

---

## Keeping Things in Sync

### Weekly Sync Ritual

```bash
# Every Monday (or whenever)
cd ~/claude-team-config
git pull origin main

# Check for updates
git log --oneline -5
```

### Slack/Discord Notification

Set up a GitHub Action to notify team when config changes:

```yaml
# .github/workflows/notify-update.yml
name: Notify Config Update
on:
  push:
    branches: [main]
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Claude team config updated! Run `git pull` in ~/claude-team-config"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## FAQ

**Q: What if I need project-specific overrides?**
A: Create `.claude/settings.local.json` in the project (gitignored) for personal overrides, or copy the whole `.claude/` directory and modify.

**Q: How do hooks work with symlinks?**
A: Hooks scripts need to be executable. After cloning, run: `chmod +x ~/.claude/hooks/*.sh`

**Q: Can I have both global and project-level config?**
A: Yes! Claude Code merges them. Project-level takes precedence over global.

**Q: What if two people edit the same skill?**
A: Use normal git workflow - create branches, PRs, and resolve conflicts before merging.
