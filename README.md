# Claude Team Config

Shared Claude Code configuration for consistent development across the team.

## Quick Start

### New Team Member Setup

```bash
# Clone this repo
git clone https://github.com/Assure-DeFi/claude-team-config.git ~/claude-team-config

# Run onboarding script
~/claude-team-config/.claude/scripts/team-onboard.sh
```

Or one-liner:

```bash
git clone https://github.com/Assure-DeFi/claude-team-config.git ~/claude-team-config && ~/claude-team-config/.claude/scripts/team-onboard.sh
```

### Create New Project

```bash
~/claude-team-config/.claude/scripts/setup-new-project.sh my-project-name
```

## What's Included

### Skills (Domain Knowledge)

| Skill               | Trigger Keywords                              | Purpose                 |
| ------------------- | --------------------------------------------- | ----------------------- |
| `brand-guidelines`  | button, component, style, color, UI, tailwind | Assure DeFi brand rules |
| `supabase-patterns` | database, table, migration, SQL, postgres     | Database conventions    |
| `nextjs-patterns`   | api, route, page, endpoint, middleware        | App Router patterns     |
| `testing-patterns`  | test, jest, vitest, mock, e2e, playwright     | Testing conventions     |

### Hooks (Automation)

| Hook                  | Trigger           | Purpose                     |
| --------------------- | ----------------- | --------------------------- |
| `protect-main-branch` | Before Edit/Write | Blocks edits on main branch |
| `auto-format`         | After Edit/Write  | Runs Prettier               |
| `type-check`          | After Edit/Write  | Runs TypeScript check       |
| `lint-check`          | After Edit/Write  | Runs ESLint                 |
| `suggest-skills`      | On prompt         | Suggests relevant skills    |

### Commands

| Command      | Usage               | Purpose                           |
| ------------ | ------------------- | --------------------------------- |
| `/ralph`     | `/ralph [task]`     | Ralph Loop execution              |
| `/commit`    | `/commit [message]` | Create well-structured git commit |
| `/pr-review` | `/pr-review [PR#]`  | Review pull request for quality   |

### Agents

| Agent           | Usage               | Purpose                       |
| --------------- | ------------------- | ----------------------------- |
| `code-reviewer` | "use code-reviewer" | Code review against standards |

### Rules

- `brand-compliance.md` - UI/UX requirements
- `code-quality.md` - TypeScript & patterns
- `git-workflow.md` - Git conventions

## Directory Structure

```
.claude/
├── settings.json           # Hooks configuration
├── hooks/                  # Automation scripts
│   ├── protect-main-branch.sh
│   ├── auto-format.sh
│   ├── type-check.sh
│   ├── lint-check.sh
│   └── suggest-skills.sh
├── skills/                 # Domain knowledge
│   ├── brand-guidelines/
│   ├── supabase-patterns/
│   ├── nextjs-patterns/
│   └── testing-patterns/
├── commands/               # Slash commands
│   ├── ralph.md
│   ├── commit.md
│   └── pr-review.md
├── agents/                 # Specialized assistants
│   └── code-reviewer.md
├── rules/                  # Team guidelines
│   ├── brand-compliance.md
│   ├── code-quality.md
│   └── git-workflow.md
├── templates/              # Project templates
│   └── CLAUDE.md.template
├── scripts/                # Setup scripts
│   ├── setup-new-project.sh
│   └── team-onboard.sh
└── testing-framework/      # Before/after tests
```

## Hook Details

All hooks properly read input from stdin as JSON (Claude Code API):

- **protect-main-branch**: Blocks file modifications on main/master, prompts to create feature branch
- **auto-format**: Runs Prettier on JS/TS/JSON/CSS/MD files after edits
- **type-check**: Runs TypeScript compiler, reports error count
- **lint-check**: Runs ESLint on JS/TS files, reports issues
- **suggest-skills**: Analyzes prompts and suggests relevant skills

## Updating Config

When you improve the shared config:

```bash
cd ~/claude-team-config
git checkout -b improve/description
# Make changes
git add .
git commit -m "feat: description"
git push origin improve/description
# Create PR for team review
```

Team members pull updates:

```bash
cd ~/claude-team-config
git pull origin main
```

## Documentation

- [TEAM-SETUP.md](.claude/TEAM-SETUP.md) - Detailed setup guide
- [FINAL-REPORT.md](.claude/testing-framework/reports/FINAL-REPORT.md) - Implementation details
