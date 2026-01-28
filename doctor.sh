#!/bin/bash
# Mason Doctor Script
# Verifies your Mason installation is complete

echo ""
echo "=================================="
echo "  Mason Doctor"
echo "=================================="
echo ""

ERRORS=0

# Check if we're in a git repo
if [ ! -d ".git" ]; then
    echo "ERROR: Not in a git repository"
    echo "  Run this from your project root directory"
    echo ""
    ERRORS=$((ERRORS + 1))
fi

# Check mason.config.json
echo "Checking configuration..."
if [ -f "mason.config.json" ]; then
    echo "  [OK] mason.config.json exists"

    # Check for Supabase URL
    if grep -q '"url": ""' mason.config.json 2>/dev/null || ! grep -q '"url":' mason.config.json 2>/dev/null; then
        echo "  [WARN] Supabase URL not configured"
        echo "    Add your Supabase URL to mason.config.json"
        ERRORS=$((ERRORS + 1))
    else
        echo "  [OK] Supabase URL configured"
    fi

    # Check for Supabase anon key
    if grep -q '"anonKey": ""' mason.config.json 2>/dev/null || ! grep -q '"anonKey":' mason.config.json 2>/dev/null; then
        echo "  [WARN] Supabase anon key not configured"
        echo "    Add your Supabase anon key to mason.config.json"
        ERRORS=$((ERRORS + 1))
    else
        echo "  [OK] Supabase anon key configured"
    fi
else
    echo "  [ERROR] mason.config.json not found"
    echo "    Run the installer: curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh | bash"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check Claude Code commands
echo "Checking Claude Code commands..."
if [ -f ".claude/commands/pm-review.md" ]; then
    echo "  [OK] pm-review.md installed"
else
    echo "  [ERROR] pm-review.md not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f ".claude/commands/execute-approved.md" ]; then
    echo "  [OK] execute-approved.md installed"
else
    echo "  [ERROR] execute-approved.md not found"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check skills
echo "Checking skills..."
if [ -f ".claude/skills/pm-domain-knowledge/SKILL.md" ]; then
    echo "  [OK] pm-domain-knowledge skill installed"
else
    echo "  [WARN] pm-domain-knowledge skill not found"
    echo "    This is optional but recommended"
fi

echo ""

# Check migrations
echo "Checking migrations..."
MIGRATIONS_OK=0
if [ -f "supabase/migrations/001_pm_backlog_tables.sql" ]; then
    echo "  [OK] 001_pm_backlog_tables.sql"
    MIGRATIONS_OK=$((MIGRATIONS_OK + 1))
else
    echo "  [ERROR] 001_pm_backlog_tables.sql not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "supabase/migrations/002_pm_execution_runs.sql" ]; then
    echo "  [OK] 002_pm_execution_runs.sql"
    MIGRATIONS_OK=$((MIGRATIONS_OK + 1))
else
    echo "  [ERROR] 002_pm_execution_runs.sql not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "supabase/migrations/003_pm_execution_tasks.sql" ]; then
    echo "  [OK] 003_pm_execution_tasks.sql"
    MIGRATIONS_OK=$((MIGRATIONS_OK + 1))
else
    echo "  [ERROR] 003_pm_execution_tasks.sql not found"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Summary
echo "=================================="
if [ $ERRORS -eq 0 ]; then
    echo "  All checks passed!"
    echo ""
    echo "  Next steps:"
    echo "  1. Run migrations in Supabase SQL Editor"
    echo "  2. Open Claude Code and run /pm-review"
    echo "=================================="
    exit 0
else
    echo "  Found $ERRORS issue(s)"
    echo ""
    echo "  Fix the issues above, then run doctor again."
    echo "=================================="
    exit 1
fi
