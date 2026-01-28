#!/bin/bash

# Team Claude Code - Developer Onboarding Script
# Run this on a new developer's machine to set up shared config
# Usage: curl -sL <raw-github-url> | bash
# Or: ./team-onboard.sh

set -e

# Configuration - UPDATE THESE FOR YOUR TEAM
GITHUB_ORG="Assure-DeFi"  # Your GitHub org/user
CONFIG_REPO="claude-team-config"  # Shared config repo name
INSTALL_PATH="$HOME/claude-team-config"  # Where to clone

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     Team Claude Code - Developer Onboarding               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed${NC}"
    exit 1
fi
echo "  ✓ git installed"

if ! command -v claude &> /dev/null; then
    echo -e "${YELLOW}  ⚠ Claude Code CLI not found${NC}"
    echo "    Install with: npm install -g @anthropic-ai/claude-code"
    echo "    Or: https://claude.ai/code"
fi

# Clone shared config
echo ""
echo -e "${YELLOW}Setting up shared Claude Code config...${NC}"

if [ -d "$INSTALL_PATH" ]; then
    echo "  Config already exists at $INSTALL_PATH"
    echo "  Pulling latest..."
    cd "$INSTALL_PATH"
    git pull origin main
else
    echo "  Cloning from GitHub..."
    git clone "https://github.com/$GITHUB_ORG/$CONFIG_REPO.git" "$INSTALL_PATH"
fi
echo "  ✓ Shared config ready at $INSTALL_PATH"

# Make hooks executable
echo ""
echo -e "${YELLOW}Making hooks executable...${NC}"
chmod +x "$INSTALL_PATH/.claude/hooks/"*.sh 2>/dev/null || true
echo "  ✓ Hooks are executable"

# Set up global symlink
echo ""
echo -e "${YELLOW}Setting up global Claude config...${NC}"

if [ -L "$HOME/.claude" ]; then
    echo "  Removing existing symlink..."
    rm "$HOME/.claude"
elif [ -d "$HOME/.claude" ]; then
    echo "  Backing up existing ~/.claude to ~/.claude.backup..."
    mv "$HOME/.claude" "$HOME/.claude.backup"
fi

ln -s "$INSTALL_PATH/.claude" "$HOME/.claude"
echo "  ✓ Global config linked: ~/.claude -> $INSTALL_PATH/.claude"

# Verify setup
echo ""
echo -e "${YELLOW}Verifying setup...${NC}"

echo "  Skills:"
ls -1 "$HOME/.claude/skills/" 2>/dev/null | sed 's/^/    - /' || echo "    (none found)"

echo "  Hooks:"
ls -1 "$HOME/.claude/hooks/"*.sh 2>/dev/null | xargs -n1 basename | sed 's/^/    - /' || echo "    (none found)"

echo "  Commands:"
ls -1 "$HOME/.claude/commands/"*.md 2>/dev/null | xargs -n1 basename | sed 's/\.md$//' | sed 's/^/    - /' || echo "    (none found)"

echo "  Agents:"
ls -1 "$HOME/.claude/agents/"*.md 2>/dev/null | xargs -n1 basename | sed 's/\.md$//' | sed 's/^/    - /' || echo "    (none found)"

# Print success
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                         ║"
echo "╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "You now have access to:"
echo ""
echo "  ${BLUE}Skills${NC} (use 'load X skill' or mention keywords):"
echo "    • brand-guidelines  - UI/UX rules, colors, patterns"
echo "    • supabase-patterns - Database migrations, RLS, queries"
echo "    • nextjs-patterns   - API routes, pages, components"
echo ""
echo "  ${BLUE}Commands${NC} (invoke with /):"
echo "    • /ralph - Start/continue Ralph Loop execution"
echo ""
echo "  ${BLUE}Agents${NC} (ask to use them):"
echo "    • code-reviewer - Comprehensive code review"
echo ""
echo "  ${BLUE}Automatic Hooks${NC}:"
echo "    • Branch protection (can't edit on main)"
echo "    • Auto-format (Prettier after edits)"
echo "    • Type-check (TypeScript after edits)"
echo "    • Skill suggestions (based on prompt)"
echo ""
echo "To create a new project with team config:"
echo "  ${YELLOW}$INSTALL_PATH/.claude/scripts/setup-new-project.sh my-project${NC}"
echo ""
echo "To update shared config later:"
echo "  ${YELLOW}cd $INSTALL_PATH && git pull${NC}"
echo ""
