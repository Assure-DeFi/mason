#!/bin/bash

# Team Claude Code - New Project Setup Script
# Usage: ./setup-new-project.sh <project-name> [template-type]
# Example: ./setup-new-project.sh my-new-app nextjs

set -e

PROJECT_NAME="${1:-}"
TEMPLATE_TYPE="${2:-nextjs}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(dirname "$SCRIPT_DIR")"
PROJECTS_DIR="$(dirname "$CONFIG_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Team Claude Code - Project Setup ===${NC}"

# Check for project name
if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Error: Project name required${NC}"
    echo "Usage: $0 <project-name> [template-type]"
    echo "Example: $0 my-new-app nextjs"
    exit 1
fi

PROJECT_PATH="$PROJECTS_DIR/$PROJECT_NAME"

# Check if project already exists
if [ -d "$PROJECT_PATH" ]; then
    echo -e "${RED}Error: Directory $PROJECT_PATH already exists${NC}"
    exit 1
fi

echo -e "${YELLOW}Creating project: $PROJECT_NAME${NC}"
echo "Location: $PROJECT_PATH"
echo "Template: $TEMPLATE_TYPE"
echo ""

# Create project based on template type
case $TEMPLATE_TYPE in
    nextjs)
        echo -e "${YELLOW}Creating Next.js project...${NC}"
        cd "$PROJECTS_DIR"
        npx create-next-app@latest "$PROJECT_NAME" \
            --typescript \
            --tailwind \
            --eslint \
            --app \
            --src-dir \
            --import-alias "@/*" \
            --no-turbopack
        ;;
    *)
        echo -e "${YELLOW}Creating empty project...${NC}"
        mkdir -p "$PROJECT_PATH"
        cd "$PROJECT_PATH"
        git init
        ;;
esac

cd "$PROJECT_PATH"

# Link Claude config
echo -e "${YELLOW}Setting up Claude Code config...${NC}"
if [ -L ".claude" ]; then
    rm .claude
fi
ln -s "$CONFIG_DIR/.claude" .claude
echo "  ✓ Linked .claude/ to shared config"

# Copy brand assets
echo -e "${YELLOW}Copying brand assets...${NC}"
if [ -d "$CONFIG_DIR/brand" ]; then
    cp -r "$CONFIG_DIR/brand" brand
    echo "  ✓ Copied brand/ directory"
else
    mkdir -p brand
    echo "  ⚠ No brand template found, created empty brand/"
fi

# Create CLAUDE.md from template
echo -e "${YELLOW}Creating CLAUDE.md...${NC}"
if [ -f "$CONFIG_DIR/templates/CLAUDE.md.template" ]; then
    sed "s/\[PROJECT_NAME\]/$PROJECT_NAME/g" "$CONFIG_DIR/templates/CLAUDE.md.template" > CLAUDE.md
    echo "  ✓ Created CLAUDE.md from template"
else
    echo "# Claude Project Instructions - $PROJECT_NAME" > CLAUDE.md
    echo "  ⚠ No template found, created minimal CLAUDE.md"
fi

# Create .env.example
echo -e "${YELLOW}Creating .env.example...${NC}"
cat > .env.example << 'EOF'
# Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

# Add other env vars as needed
EOF
echo "  ✓ Created .env.example"

# Update .gitignore
echo -e "${YELLOW}Updating .gitignore...${NC}"
cat >> .gitignore << 'EOF'

# Claude Code local settings
.claude/settings.local.json
.claude/*.local.md
.claude/*.local.json

# Environment
.env
.env.local
.env.*.local
EOF
echo "  ✓ Updated .gitignore"

# Initialize Supabase directory
echo -e "${YELLOW}Creating Supabase structure...${NC}"
mkdir -p supabase/migrations
echo "  ✓ Created supabase/migrations/"

# Create initial commit
echo -e "${YELLOW}Creating initial commit...${NC}"
git add .
git commit -m "Initial project setup with team Claude Code config

- Next.js $TEMPLATE_TYPE template
- Linked shared Claude Code config
- Brand assets included
- CLAUDE.md project documentation

Co-Authored-By: Claude <noreply@anthropic.com>"
echo "  ✓ Created initial commit"

echo ""
echo -e "${GREEN}=== Project Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. cd $PROJECT_PATH"
echo "  2. cp .env.example .env.local"
echo "  3. Fill in environment variables"
echo "  4. npm install (if not already done)"
echo "  5. claude  # Start Claude Code"
echo ""
echo "Your project has:"
echo "  ✓ Shared Claude Code config (skills, hooks, commands, agents)"
echo "  ✓ Brand assets and guidelines"
echo "  ✓ CLAUDE.md project documentation"
echo "  ✓ Supabase migrations directory"
echo "  ✓ Proper .gitignore"
echo ""
