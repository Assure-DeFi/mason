#!/bin/bash
#
# Mason Pattern Learning Installer
#
# This script installs the Mason pattern learning system:
# - Pattern learning plugin for continuous improvement
#
# Usage (from any project directory):
#   bash <(curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/extras/compound-learning/install.sh)
#
# Or if you have the mason repo cloned:
#   bash /path/to/mason/extras/compound-learning/install.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print with color
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check for required commands
check_requirements() {
    print_info "Checking requirements..."

    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
        PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
        print_success "Python 3 found: $PYTHON_VERSION"
    elif command -v python &> /dev/null; then
        # Check if python is Python 3
        PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
        if [[ "$PYTHON_VERSION" == 3.* ]]; then
            PYTHON_CMD="python"
            print_success "Python 3 found: $PYTHON_VERSION"
        else
            print_error "Python 3.9+ is required. Found Python $PYTHON_VERSION"
            echo "Install Python 3:"
            echo "  macOS: brew install python@3.11"
            echo "  Ubuntu: sudo apt install python3"
            exit 1
        fi
    else
        print_error "Python 3.9+ is required but not found"
        echo "Install Python 3:"
        echo "  macOS: brew install python@3.11"
        echo "  Ubuntu: sudo apt install python3"
        exit 1
    fi

    # Check minimum Python version (3.9+)
    PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
    PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)
    if [[ "$PYTHON_MAJOR" -lt 3 ]] || [[ "$PYTHON_MAJOR" -eq 3 && "$PYTHON_MINOR" -lt 9 ]]; then
        print_error "Python 3.9+ is required. Found $PYTHON_VERSION"
        exit 1
    fi

    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is required but not found"
        echo "Install Git:"
        echo "  macOS: xcode-select --install"
        echo "  Ubuntu: sudo apt install git"
        exit 1
    fi
    print_success "Git found: $(git --version | awk '{print $3}')"
}

# Detect platform
detect_platform() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        PLATFORM="macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        PLATFORM="linux"
    else
        PLATFORM="unknown"
    fi
    print_info "Detected platform: $PLATFORM"
}

# Create directory structure
create_directories() {
    print_info "Creating directory structure..."

    # Pattern learning plugin
    mkdir -p .claude/plugins/mason-learning/.claude-plugin
    mkdir -p .claude/plugins/mason-learning/hooks
    mkdir -p .claude/plugins/mason-learning/scripts/lib

    # Rules directory
    mkdir -p .claude/rules

    # Commands directory
    mkdir -p .claude/commands

    print_success "Directories created"
}

# Download or copy files
install_files() {
    print_info "Installing files..."

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Check if we're running from the mason repo extras directory
    if [[ -f "$SCRIPT_DIR/plugins/mason-learning/.claude-plugin/plugin.json" ]]; then
        print_info "Installing from local repository..."

        # Copy pattern learning plugin
        cp -r "$SCRIPT_DIR/plugins/mason-learning/"* .claude/plugins/mason-learning/

        # Copy commands
        cp "$SCRIPT_DIR/commands/mason-patterns.md" .claude/commands/

    else
        print_info "Downloading from GitHub..."

        # GitHub raw URL base - files are in extras/compound-learning/
        GITHUB_RAW="https://raw.githubusercontent.com/Assure-DeFi/mason/main/extras/compound-learning"

        # Download pattern learning plugin
        curl -fsSL "$GITHUB_RAW/plugins/mason-learning/.claude-plugin/plugin.json" -o .claude/plugins/mason-learning/.claude-plugin/plugin.json
        curl -fsSL "$GITHUB_RAW/plugins/mason-learning/hooks/hooks.json" -o .claude/plugins/mason-learning/hooks/hooks.json
        curl -fsSL "$GITHUB_RAW/plugins/mason-learning/scripts/track_tool.py" -o .claude/plugins/mason-learning/scripts/track_tool.py
        curl -fsSL "$GITHUB_RAW/plugins/mason-learning/scripts/analyze_session.py" -o .claude/plugins/mason-learning/scripts/analyze_session.py
        curl -fsSL "$GITHUB_RAW/plugins/mason-learning/scripts/requirements.txt" -o .claude/plugins/mason-learning/scripts/requirements.txt
        curl -fsSL "$GITHUB_RAW/plugins/mason-learning/scripts/lib/__init__.py" -o .claude/plugins/mason-learning/scripts/lib/__init__.py
        curl -fsSL "$GITHUB_RAW/plugins/mason-learning/scripts/lib/state.py" -o .claude/plugins/mason-learning/scripts/lib/state.py
        curl -fsSL "$GITHUB_RAW/plugins/mason-learning/scripts/lib/patterns.py" -o .claude/plugins/mason-learning/scripts/lib/patterns.py
        curl -fsSL "$GITHUB_RAW/plugins/mason-learning/scripts/lib/rules.py" -o .claude/plugins/mason-learning/scripts/lib/rules.py

        # Download commands
        curl -fsSL "$GITHUB_RAW/commands/mason-patterns.md" -o .claude/commands/mason-patterns.md
    fi

    print_success "Files installed"
}

# Create or update learned-patterns.md
create_rules_file() {
    if [[ ! -f .claude/rules/learned-patterns.md ]]; then
        print_info "Creating learned-patterns.md..."
        cat > .claude/rules/learned-patterns.md << 'EOF'
# Learned Patterns

Automatically extracted from observed retry patterns. Updated after each session.

These patterns help Claude avoid common mistakes by learning from previous errors.

---
EOF
        print_success "Rules file created"
    else
        print_info "learned-patterns.md already exists, keeping existing patterns"
    fi
}

# Update mason.config.json
update_config() {
    print_info "Updating mason.config.json..."

    if [[ ! -f mason.config.json ]]; then
        print_warning "mason.config.json not found"
        echo "Please run the Mason setup wizard first or create mason.config.json manually"
        return
    fi

    # Check if config already has patternLearning section
    if grep -q '"patternLearning"' mason.config.json; then
        print_info "patternLearning config already exists"
    else
        # Add patternLearning section
        # Using Python for reliable JSON manipulation
        $PYTHON_CMD << 'PYTHON_SCRIPT'
import json
import sys

try:
    with open('mason.config.json', 'r') as f:
        config = json.load(f)

    # Add patternLearning section if not exists
    if 'patternLearning' not in config:
        config['patternLearning'] = {
            'enabled': True,
            'maxPatternsPerSession': 5,
            'minConfidence': 0.7
        }

    with open('mason.config.json', 'w') as f:
        json.dump(config, f, indent=2)

    print('Config updated successfully')
except Exception as e:
    print(f'Error updating config: {e}', file=sys.stderr)
    sys.exit(1)
PYTHON_SCRIPT
        print_success "Config updated"
    fi
}

# Make scripts executable
make_executable() {
    print_info "Setting permissions..."

    chmod +x .claude/plugins/mason-learning/scripts/*.py 2>/dev/null || true

    print_success "Permissions set"
}

# Print completion message
print_completion() {
    echo ""
    echo "========================================"
    echo -e "${GREEN}Mason Pattern Learning installed successfully!${NC}"
    echo "========================================"
    echo ""
    echo "What's installed:"
    echo "  - Pattern learning plugin for continuous improvement"
    echo "  - /mason patterns command"
    echo ""
    echo "Next steps:"
    echo "  1. View patterns: /mason patterns"
    echo "  2. Clear patterns: /mason patterns --clear"
    echo ""
    echo "Configuration:"
    echo "  - Settings: mason.config.json"
    echo "  - Patterns: .claude/rules/learned-patterns.md"
    echo ""
}

# Main installation flow
main() {
    echo ""
    echo "========================================"
    echo "Mason Pattern Learning"
    echo "========================================"
    echo ""

    check_requirements
    detect_platform
    create_directories
    install_files
    create_rules_file
    update_config
    make_executable
    print_completion
}

# Run main
main
