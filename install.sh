#!/bin/bash
# Mason Installation Script
# This script sets up Mason in your current directory for the hosted service
# with direct Supabase connection for privacy

set -e

echo ""
echo "=================================="
echo "  Mason Setup Wizard"
echo "=================================="
echo ""
echo "Mason is a privacy-first tool - all your data stays in YOUR database."
echo "Assure DeFi has zero access to your repositories or improvements."
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

# Configuration
echo ""
echo "=================================="
echo "  Database Configuration"
echo "=================================="
echo ""
echo "Mason connects directly to YOUR Supabase database."
echo "Complete the setup wizard at: https://mason.assuredefi.com/setup"
echo "to get your credentials."
echo ""

# Prompt for Supabase URL (read from /dev/tty for piped execution)
printf "Enter your Supabase Project URL (e.g., https://xxx.supabase.co): "
read SUPABASE_URL < /dev/tty

# Validate Supabase URL format
if [[ ! "$SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
    echo ""
    echo "WARNING: URL should be in format https://xxx.supabase.co"
    echo "Continuing anyway, but please verify the URL is correct."
    echo ""
fi

# Prompt for Supabase Anon Key
echo ""
printf "Enter your Supabase Anon Key (starts with 'eyJ'): "
read SUPABASE_ANON_KEY < /dev/tty

# Validate Anon Key format
if [[ ! "$SUPABASE_ANON_KEY" =~ ^eyJ ]]; then
    echo ""
    echo "WARNING: Anon key should start with 'eyJ'"
    echo "Continuing anyway, but please verify the key is correct."
    echo ""
fi

# Prompt for API key
echo ""
echo "=================================="
echo "  API Key Configuration"
echo "=================================="
echo ""
echo "Generate an API key in the setup wizard: https://mason.assuredefi.com/setup"
echo ""
printf "Enter your Mason API key: "
read API_KEY < /dev/tty

# Validate API key format
if [[ ! "$API_KEY" =~ ^mason_ ]]; then
    echo ""
    echo "WARNING: API key should start with 'mason_'"
    echo "Continuing anyway, but please verify your key is correct."
    echo ""
fi

# Create config with all credentials
echo ""
echo "Creating configuration file..."
cat > mason.config.json << EOF
{
  "version": "2.0",
  "supabaseUrl": "$SUPABASE_URL",
  "supabaseAnonKey": "$SUPABASE_ANON_KEY",
  "apiKey": "$API_KEY",
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
echo "PRIVACY NOTE:"
echo "  All your data is stored in YOUR Supabase database."
echo "  Assure DeFi has zero access to your data."
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Customize your domain knowledge (optional):"
echo "   - Edit .claude/skills/pm-domain-knowledge/SKILL.md"
echo "   - Add your business context and goals"
echo ""
echo "2. Start using Mason in Claude Code:"
echo "   - Open Claude Code in this directory"
echo "   - Run: /pm-review"
echo ""
echo "3. Review improvements in Dashboard:"
echo "   - Open: https://mason.assuredefi.com/admin/backlog"
echo "   - Data loads from YOUR Supabase database"
echo ""
