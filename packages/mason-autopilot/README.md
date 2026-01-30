# Mason Autopilot

Autopilot daemon for Mason - automated codebase analysis and execution.

## Overview

Mason Autopilot is a local daemon that runs scheduled PM reviews and executes approved improvements automatically. It uses your Claude Code Pro Max subscription to run analysis and implementation.

## Requirements

- Node.js 18+
- Claude Code CLI (`claude` command available)
- Mason dashboard configured with Supabase

## Installation

```bash
npm install -g mason-autopilot
```

## Quick Start

```bash
# 1. Initialize configuration
mason-autopilot init

# 2. Configure settings in Mason Dashboard
# https://mason.assuredefi.com/settings/autopilot

# 3. Start the daemon
mason-autopilot start

# 4. (Optional) Install as system service
mason-autopilot install
```

## Commands

### `mason-autopilot init`

Initialize autopilot configuration. Prompts for:

- Supabase URL
- Supabase Anon Key
- Repository path

Configuration is stored in `~/.mason/autopilot.json`.

### `mason-autopilot start`

Start the autopilot daemon. The daemon:

1. Polls Supabase every 5 minutes for configuration
2. Runs PM review when schedule triggers
3. Auto-approves items matching your rules
4. Executes approved items
5. Reports status back to Supabase

Options:

- `-d, --daemon`: Run in background mode
- `-v, --verbose`: Show verbose output

### `mason-autopilot install`

Install as a system service that survives reboot.

Supports:

- macOS: launchd
- Linux: systemd (user service)
- Windows: Task Scheduler

### `mason-autopilot status`

Show current autopilot status including:

- Local configuration
- Service status
- Remote configuration from Supabase
- Recent run history

## Configuration

All configuration is done in the Mason Dashboard at `/settings/autopilot`.

### Schedule

- **Daily**: Run once per day at specified time
- **Weekly**: Run once per week on specified day
- **Custom Cron**: Advanced users can specify a cron expression

### Auto-Approval Rules

Items are auto-approved when they match ALL criteria:

- `maxComplexity`: Only approve items with complexity ≤ this value
- `minImpact`: Only approve items with impact ≥ this value
- `excludedCategories`: Never auto-approve items in these categories

### Guardian Rails

Safety limits to prevent runaway automation:

- `maxItemsPerDay`: Maximum items to auto-approve per day
- `pauseOnFailure`: Disable autopilot if execution fails
- `requireHumanReviewComplexity`: Items with complexity > this require manual approval

### Execution Window

Restrict when executions can run:

- `startHour`: Earliest hour (0-23) to run
- `endHour`: Latest hour (0-23) to run

Example: `startHour: 22, endHour: 6` = Only run between 10 PM and 6 AM.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR MACHINE                             │
│                                                             │
│  mason-autopilot (this package)                             │
│  ├── Polls Supabase for config every 5 min                  │
│  ├── Runs `claude -p "/pm-review --auto"` on schedule       │
│  ├── Auto-approves items matching rules                     │
│  ├── Runs `claude -p "/execute-approved --auto"`            │
│  └── Reports status back to Supabase                        │
│                           │                                 │
│                           ▼                                 │
│  Claude Code (Pro Max) ──→ Creates PRs on GitHub            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  YOUR SUPABASE                              │
│  • mason_autopilot_config (schedule, rules, limits)         │
│  • mason_autopilot_runs (execution history)                 │
│  • mason_pm_backlog_items (analysis results)                │
└─────────────────────────────────────────────────────────────┘
```

## Privacy

- Uses YOUR Claude Code subscription (Pro Max)
- Uses YOUR Supabase database
- All data stays in YOUR infrastructure
- Mason central server only sees your user identity

## Troubleshooting

### Daemon not running

Check service status:

```bash
mason-autopilot status
```

Check logs:

```bash
tail -f ~/.mason/autopilot.log
```

### Schedule not triggering

Verify:

1. Autopilot is enabled in dashboard
2. Current time is within execution window
3. Cron expression is valid

### Auto-approval not working

Check:

1. Items meet complexity/impact thresholds
2. Items are not in excluded categories
3. Daily limit not reached
4. Items don't exceed human review complexity threshold

## License

MIT
