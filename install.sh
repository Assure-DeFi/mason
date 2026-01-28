#!/bin/bash
# Mason Installation Script
# This script sets up Mason in your current directory

set -e

echo ""
echo "=================================="
echo "  Mason Setup Wizard"
echo "=================================="
echo ""

# Check if we're in a git repo
if [ ! -d ".git" ]; then
    echo "ERROR: Not a git repository."
    echo ""
    echo "Please run this command from your project's root directory:"
    echo "  cd /path/to/your/project"
    echo "  Then run the install command again."
    echo ""
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo ""
    echo "Please install Node.js 18+ from: https://nodejs.org"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js 18+ required. You have: $(node -v)"
    echo ""
    echo "Please upgrade Node.js from: https://nodejs.org"
    echo ""
    exit 1
fi

echo "Setting up Mason in: $(pwd)"
echo ""

# Create directories
echo "Creating directories..."
mkdir -p .claude/commands
mkdir -p .claude/skills/pm-domain-knowledge
mkdir -p supabase/migrations

# Download command templates
echo "Installing Claude Code commands..."

curl -fsSL "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/commands/pm-review.md" \
    -o .claude/commands/pm-review.md

curl -fsSL "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/commands/execute-approved.md" \
    -o .claude/commands/execute-approved.md

# Download skill template
echo "Installing domain knowledge skill..."
curl -fsSL "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/skills/pm-domain-knowledge/SKILL.md" \
    -o .claude/skills/pm-domain-knowledge/SKILL.md

# Download migrations
echo "Installing database migrations..."
curl -fsSL "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-migrations/migrations/001_pm_backlog_tables.sql" \
    -o supabase/migrations/001_pm_backlog_tables.sql

curl -fsSL "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-migrations/migrations/002_pm_execution_runs.sql" \
    -o supabase/migrations/002_pm_execution_runs.sql

curl -fsSL "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-migrations/migrations/003_pm_execution_tasks.sql" \
    -o supabase/migrations/003_pm_execution_tasks.sql

# Create default config if it doesn't exist
if [ ! -f "mason.config.json" ]; then
    echo "Creating configuration file..."
    cat > mason.config.json << 'EOF'
{
  "version": "1.0",
  "supabase": {
    "url": "",
    "anonKey": ""
  },
  "domains": [
    { "name": "frontend-ux", "enabled": true, "weight": 1 },
    { "name": "api-backend", "enabled": true, "weight": 1 },
    { "name": "reliability", "enabled": true, "weight": 1 },
    { "name": "security", "enabled": true, "weight": 1.2 },
    { "name": "code-quality", "enabled": true, "weight": 0.8 }
  ]
}
EOF
fi

echo ""
echo "=================================="
echo "  Installation Complete!"
echo "=================================="
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Add your Supabase credentials to mason.config.json:"
echo "   - Get them from: https://supabase.com/dashboard"
echo "   - Project Settings > API > Project URL and anon key"
echo ""
echo "2. Run the database migrations:"
echo "   - Open Supabase SQL Editor"
echo "   - Run each file in supabase/migrations/ in order"
echo ""
echo "3. Customize your domain knowledge:"
echo "   - Edit .claude/skills/pm-domain-knowledge/SKILL.md"
echo "   - Add your business context and goals"
echo ""
echo "4. Start using Mason in Claude Code:"
echo "   - Open Claude Code in this directory"
echo "   - Run: /pm-review"
echo ""
