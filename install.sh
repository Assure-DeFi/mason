#!/bin/bash
# Mason Installation Script
# This script sets up Mason in your current directory for the hosted service
# with direct Supabase connection for privacy
#
# Usage:
#   1. One-liner from dashboard (recommended):
#      Copy the install command from https://mason.assuredefi.com/setup
#
#   2. With existing config file:
#      Place mason.config.json in project root, then run:
#      curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh | bash
#
#   3. Interactive mode:
#      curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh | bash

set -e

echo ""
echo "=================================="
echo "  Mason CLI Installer"
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

BASE_CMD_URL="https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/commands"

download_file \
    "${BASE_CMD_URL}/pm-review.md" \
    ".claude/commands/pm-review.md" \
    "pm-review.md"

download_file \
    "${BASE_CMD_URL}/pm-banger.md" \
    ".claude/commands/pm-banger.md" \
    "pm-banger.md"

download_file \
    "${BASE_CMD_URL}/pm-quick.md" \
    ".claude/commands/pm-quick.md" \
    "pm-quick.md"

download_file \
    "${BASE_CMD_URL}/pm-focus.md" \
    ".claude/commands/pm-focus.md" \
    "pm-focus.md"

download_file \
    "${BASE_CMD_URL}/execute-approved.md" \
    ".claude/commands/execute-approved.md" \
    "execute-approved.md"

download_file \
    "${BASE_CMD_URL}/mason-update.md" \
    ".claude/commands/mason-update.md" \
    "mason-update.md"

download_file \
    "${BASE_CMD_URL}/battle-test.md" \
    ".claude/commands/battle-test.md" \
    "battle-test.md"

# Download skill template
echo ""
echo "Installing domain knowledge skill..."

download_file \
    "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/skills/pm-domain-knowledge/SKILL.md" \
    ".claude/skills/pm-domain-knowledge/SKILL.md" \
    "SKILL.md"

# Determine configuration source (priority order):
# 1. Environment variables (from dashboard one-liner)
# 2. Existing mason.config.json file
# 3. Interactive prompts

CONFIG_SOURCE=""
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
API_KEY=""

# Check for environment variables (highest priority - from dashboard)
if [ -n "$MASON_SUPABASE_URL" ] && [ -n "$MASON_SUPABASE_ANON_KEY" ] && [ -n "$MASON_API_KEY" ]; then
    CONFIG_SOURCE="env"
    SUPABASE_URL="$MASON_SUPABASE_URL"
    SUPABASE_ANON_KEY="$MASON_SUPABASE_ANON_KEY"
    API_KEY="$MASON_API_KEY"
    echo ""
    echo "Using credentials from dashboard..."
    echo "  Supabase URL: ${SUPABASE_URL:0:30}..."
    echo "  API Key: ${API_KEY:0:12}..."

# Check for existing config file
elif [ -f "mason.config.json" ]; then
    echo ""
    echo "Found existing mason.config.json..."

    # Validate config has required fields using node
    if node -e "
        const config = require('./mason.config.json');
        if (!config.supabaseUrl || !config.supabaseAnonKey || !config.apiKey) {
            process.exit(1);
        }
        console.log('  Supabase URL: ' + config.supabaseUrl.substring(0, 30) + '...');
        console.log('  API Key: ' + config.apiKey.substring(0, 12) + '...');
    " 2>/dev/null; then
        CONFIG_SOURCE="file"
        echo "  [OK] Config file is valid"
    fi
fi

# Fall back to interactive prompts if no config found
if [ -z "$CONFIG_SOURCE" ]; then
    CONFIG_SOURCE="interactive"
    echo ""
    echo "=================================="
    echo "  Configuration Required"
    echo "=================================="
    echo ""
    echo "TIP: For faster setup, copy the install command from:"
    echo "     https://mason.assuredefi.com/setup"
    echo ""
    echo "----------------------------------"
    echo ""

    # Prompt for Supabase URL (read from /dev/tty for piped execution)
    printf "Enter your Supabase Project URL (e.g., https://xxx.supabase.co): "
    read SUPABASE_URL < /dev/tty

    # Validate Supabase URL format
    if [[ ! "$SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
        echo ""
        echo "WARNING: URL should be in format https://xxx.supabase.co"
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
        echo ""
    fi

    # Prompt for API key
    echo ""
    printf "Enter your Mason API key (starts with 'mason_'): "
    read API_KEY < /dev/tty

    # Validate API key format
    if [[ ! "$API_KEY" =~ ^mason_ ]]; then
        echo ""
        echo "WARNING: API key should start with 'mason_'"
        echo ""
    fi
fi

# Create/update config file (skip if using existing valid file)
if [ "$CONFIG_SOURCE" != "file" ]; then
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
verify_file ".claude/commands/pm-banger.md"
verify_file ".claude/commands/pm-quick.md"
verify_file ".claude/commands/pm-focus.md"
verify_file ".claude/commands/execute-approved.md"
verify_file ".claude/commands/mason-update.md"
verify_file ".claude/commands/battle-test.md"
verify_file ".claude/skills/pm-domain-knowledge/SKILL.md"
verify_file "mason.config.json"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "ERROR: Installation incomplete. $ERRORS file(s) missing."
    echo "Please try running the installer again."
    exit 1
fi

# Record installed versions for update tracking
echo ""
echo "Recording installed versions..."

# Extract versions from installed files
get_version() {
    grep -m1 "^version:" ".claude/commands/$1.md" 2>/dev/null | cut -d: -f2 | tr -d ' '
}

PM_REVIEW_VER=$(get_version "pm-review")
PM_BANGER_VER=$(get_version "pm-banger")
PM_QUICK_VER=$(get_version "pm-quick")
PM_FOCUS_VER=$(get_version "pm-focus")
EXEC_VER=$(get_version "execute-approved")
UPDATE_VER=$(get_version "mason-update")
BATTLE_VER=$(get_version "battle-test")

cat > .claude/.mason-state.json << EOF
{
  "installed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "installed_versions": {
    "pm-review": "${PM_REVIEW_VER:-3.1.0}",
    "pm-banger": "${PM_BANGER_VER:-3.0.0}",
    "pm-quick": "${PM_QUICK_VER:-3.0.0}",
    "pm-focus": "${PM_FOCUS_VER:-3.0.0}",
    "execute-approved": "${EXEC_VER:-2.10.0}",
    "mason-update": "${UPDATE_VER:-2.1.0}",
    "battle-test": "${BATTLE_VER:-1.0.0}"
  }
}
EOF
echo "  [OK] .claude/.mason-state.json"

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
echo "1. Start using Mason in Claude Code:"
echo "   - Open Claude Code in this directory"
echo "   - Run: /pm-review"
echo ""
echo "2. Review improvements in Dashboard:"
echo "   - Open: https://mason.assuredefi.com/admin/backlog"
echo ""
