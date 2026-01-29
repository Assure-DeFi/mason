# Mason Compound Learning System

Optional add-on for Mason that enables:

- **Auto-Pilot**: Autonomous execution of approved backlog items
- **Pattern Learning**: Continuous improvement through learned patterns

## Installation

### macOS / Linux

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/extras/compound-learning/install.sh)
```

### Windows (PowerShell)

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Assure-DeFi/mason/main/extras/compound-learning/install.ps1" -OutFile "install-autopilot.ps1"; .\install-autopilot.ps1; Remove-Item "install-autopilot.ps1"
```

## Prerequisites

- Python 3.9+
- Git
- GitHub CLI (optional, for auto PR creation)
- Mason setup completed (mason.config.json exists)

## What Gets Installed

The installer adds the following to your project's `.claude/` directory:

```
.claude/
├── skills/
│   └── mason-autopilot/     # Auto-pilot skill
├── plugins/
│   └── mason-learning/      # Pattern learning plugin
├── commands/
│   ├── mason-autopilot.md   # /mason auto-pilot command
│   └── mason-patterns.md    # /mason patterns command
└── rules/
    └── learned-patterns.md  # Learned patterns storage
```

## Usage

### Auto-Pilot

Execute approved backlog items automatically:

```
/mason auto-pilot --dry-run    # Preview without execution
/mason auto-pilot --single     # Execute one item
/mason auto-pilot              # Execute up to 3 items
```

### Pattern Learning

View and manage learned patterns:

```
/mason patterns                # Show learned patterns
/mason patterns --clear        # Clear all patterns
```

## Configuration

The installer adds these sections to your `mason.config.json`:

```json
{
  "autoPilot": {
    "enabled": true,
    "maxItemsPerRun": 3,
    "branchPrefix": "work/mason-",
    "qualityChecks": ["npm run typecheck", "npm test"],
    "autoCreatePr": true
  },
  "patternLearning": {
    "enabled": true,
    "maxPatternsPerSession": 5,
    "minConfidence": 0.7
  }
}
```

## Uninstall

To remove the compound learning system:

```bash
rm -rf .claude/skills/mason-autopilot
rm -rf .claude/plugins/mason-learning
rm .claude/commands/mason-autopilot.md
rm .claude/commands/mason-patterns.md
```

Then remove the `autoPilot` and `patternLearning` sections from `mason.config.json`.
