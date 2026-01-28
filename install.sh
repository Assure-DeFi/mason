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

# Function to download file with verification
download_file() {
    local url="$1"
    local dest="$2"
    local name="$3"

    echo "  Downloading $name..."

    if ! curl -fsSL "$url" -o "$dest" 2>/dev/null; then
        echo ""
        echo "ERROR: Failed to download $name"
        echo "  URL: $url"
        echo ""
        echo "Please check your internet connection and try again."
        echo "If the problem persists, manually download from:"
        echo "  https://github.com/Assure-DeFi/mason"
        echo ""
        exit 1
    fi

    # Verify file was downloaded and is not empty
    if [ ! -s "$dest" ]; then
        echo ""
        echo "ERROR: Downloaded file is empty: $name"
        echo "  URL: $url"
        echo ""
        echo "Please try again or manually download from:"
        echo "  https://github.com/Assure-DeFi/mason"
        echo ""
        exit 1
    fi

    echo "  [OK] $name"
}

# Download command templates
echo ""
echo "Installing Claude Code commands..."

download_file \
    "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/commands/pm-review.md" \
    ".claude/commands/pm-review.md" \
    "pm-review.md"

download_file \
    "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/commands/execute-approved.md" \
    ".claude/commands/execute-approved.md" \
    "execute-approved.md"

# Download skill template
echo ""
echo "Installing domain knowledge skill..."

download_file \
    "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/skills/pm-domain-knowledge/SKILL.md" \
    ".claude/skills/pm-domain-knowledge/SKILL.md" \
    "SKILL.md"

# Download migration (single combined file)
echo ""
echo "Installing database migration..."

download_file \
    "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-migrations/migrations/001_mason_schema.sql" \
    "supabase/migrations/001_mason_schema.sql" \
    "001_mason_schema.sql"

# Create default config if it doesn't exist
if [ ! -f "mason.config.json" ]; then
    echo ""
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
    echo "  [OK] mason.config.json"
fi

# Verify all files exist
echo ""
echo "Verifying installation..."

ERRORS=0

verify_file() {
    if [ -f "$1" ]; then
        echo "  [OK] $1"
    else
        echo "  [ERROR] Missing: $1"
        ERRORS=$((ERRORS + 1))
    fi
}

verify_file ".claude/commands/pm-review.md"
verify_file ".claude/commands/execute-approved.md"
verify_file ".claude/skills/pm-domain-knowledge/SKILL.md"
verify_file "supabase/migrations/001_mason_schema.sql"
verify_file "mason.config.json"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "ERROR: Installation incomplete. $ERRORS file(s) missing."
    echo "Please try running the installer again."
    exit 1
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
echo "2. Run the database migration:"
echo "   - Open Supabase SQL Editor"
echo "   - Copy contents of supabase/migrations/001_mason_schema.sql"
echo "   - Paste and run in SQL Editor"
echo ""
echo "3. Customize your domain knowledge (optional):"
echo "   - Edit .claude/skills/pm-domain-knowledge/SKILL.md"
echo "   - Add your business context and goals"
echo ""
echo "4. Start using Mason in Claude Code:"
echo "   - Open Claude Code in this directory"
echo "   - Run: /pm-review"
echo ""
echo "5. Review improvements in Dashboard:"
echo "   - Clone mason-dashboard from GitHub"
echo "   - Run: pnpm install && pnpm dev"
echo "   - Open: http://localhost:3000/admin/backlog"
echo ""
