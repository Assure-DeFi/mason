# Mason Pattern Learning Installer (Windows PowerShell)
#
# This script installs the Mason pattern learning system:
# - Pattern learning plugin for continuous improvement
#
# Usage (from any project directory):
#   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Assure-DeFi/mason/main/extras/compound-learning/install.ps1" -OutFile "install-patterns.ps1"; .\install-patterns.ps1
#
# Or if you have the mason repo cloned:
#   .\path\to\mason\extras\compound-learning\install.ps1
#

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Blue }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

# Check for required commands
function Test-Requirements {
    Write-Info "Checking requirements..."

    # Check Python
    $pythonCmd = $null

    try {
        $pythonVersion = & python --version 2>&1
        if ($pythonVersion -match "Python 3\.(\d+)") {
            $minorVersion = [int]$Matches[1]
            if ($minorVersion -ge 9) {
                $script:PythonCmd = "python"
                Write-Success "Python found: $pythonVersion"
            } else {
                Write-Err "Python 3.9+ is required. Found $pythonVersion"
                Write-Host "Download Python 3.11+ from: https://www.python.org/downloads/"
                exit 1
            }
        }
    } catch {
        Write-Err "Python 3.9+ is required but not found"
        Write-Host "Download Python 3.11+ from: https://www.python.org/downloads/"
        exit 1
    }

    # Check Git
    try {
        $gitVersion = & git --version 2>&1
        Write-Success "Git found: $gitVersion"
    } catch {
        Write-Err "Git is required but not found"
        Write-Host "Download Git from: https://git-scm.com/downloads"
        exit 1
    }
}

# Create directory structure
function New-Directories {
    Write-Info "Creating directory structure..."

    # Pattern learning plugin
    New-Item -ItemType Directory -Force -Path ".claude/plugins/mason-learning/.claude-plugin" | Out-Null
    New-Item -ItemType Directory -Force -Path ".claude/plugins/mason-learning/hooks" | Out-Null
    New-Item -ItemType Directory -Force -Path ".claude/plugins/mason-learning/scripts/lib" | Out-Null

    # Rules directory
    New-Item -ItemType Directory -Force -Path ".claude/rules" | Out-Null

    # Commands directory
    New-Item -ItemType Directory -Force -Path ".claude/commands" | Out-Null

    Write-Success "Directories created"
}

# Download or copy files
function Install-Files {
    Write-Info "Installing files..."

    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $localPluginPath = Join-Path $scriptDir "plugins/mason-learning/.claude-plugin/plugin.json"

    if (Test-Path $localPluginPath) {
        Write-Info "Installing from local repository..."

        # Copy pattern learning plugin
        Copy-Item -Path "$scriptDir/plugins/mason-learning/*" -Destination ".claude/plugins/mason-learning/" -Recurse -Force

        # Copy commands
        Copy-Item -Path "$scriptDir/commands/mason-patterns.md" -Destination ".claude/commands/" -Force

    } else {
        Write-Info "Downloading from GitHub..."

        # GitHub raw URL base - files are in extras/compound-learning/
        $githubRaw = "https://raw.githubusercontent.com/Assure-DeFi/mason/main/extras/compound-learning"

        # Download pattern learning plugin
        Invoke-WebRequest -Uri "$githubRaw/plugins/mason-learning/.claude-plugin/plugin.json" -OutFile ".claude/plugins/mason-learning/.claude-plugin/plugin.json"
        Invoke-WebRequest -Uri "$githubRaw/plugins/mason-learning/hooks/hooks.json" -OutFile ".claude/plugins/mason-learning/hooks/hooks.json"
        Invoke-WebRequest -Uri "$githubRaw/plugins/mason-learning/scripts/track_tool.py" -OutFile ".claude/plugins/mason-learning/scripts/track_tool.py"
        Invoke-WebRequest -Uri "$githubRaw/plugins/mason-learning/scripts/analyze_session.py" -OutFile ".claude/plugins/mason-learning/scripts/analyze_session.py"
        Invoke-WebRequest -Uri "$githubRaw/plugins/mason-learning/scripts/requirements.txt" -OutFile ".claude/plugins/mason-learning/scripts/requirements.txt"
        Invoke-WebRequest -Uri "$githubRaw/plugins/mason-learning/scripts/lib/__init__.py" -OutFile ".claude/plugins/mason-learning/scripts/lib/__init__.py"
        Invoke-WebRequest -Uri "$githubRaw/plugins/mason-learning/scripts/lib/state.py" -OutFile ".claude/plugins/mason-learning/scripts/lib/state.py"
        Invoke-WebRequest -Uri "$githubRaw/plugins/mason-learning/scripts/lib/patterns.py" -OutFile ".claude/plugins/mason-learning/scripts/lib/patterns.py"
        Invoke-WebRequest -Uri "$githubRaw/plugins/mason-learning/scripts/lib/rules.py" -OutFile ".claude/plugins/mason-learning/scripts/lib/rules.py"

        # Download commands
        Invoke-WebRequest -Uri "$githubRaw/commands/mason-patterns.md" -OutFile ".claude/commands/mason-patterns.md"
    }

    Write-Success "Files installed"
}

# Create or update learned-patterns.md
function New-RulesFile {
    $rulesPath = ".claude/rules/learned-patterns.md"

    if (-not (Test-Path $rulesPath)) {
        Write-Info "Creating learned-patterns.md..."

        $content = @"
# Learned Patterns

Automatically extracted from observed retry patterns. Updated after each session.

These patterns help Claude avoid common mistakes by learning from previous errors.

---
"@
        Set-Content -Path $rulesPath -Value $content -Encoding UTF8
        Write-Success "Rules file created"
    } else {
        Write-Info "learned-patterns.md already exists, keeping existing patterns"
    }
}

# Update mason.config.json
function Update-Config {
    Write-Info "Updating mason.config.json..."

    if (-not (Test-Path "mason.config.json")) {
        Write-Warn "mason.config.json not found"
        Write-Host "Please run the Mason setup wizard first or create mason.config.json manually"
        return
    }

    $config = Get-Content "mason.config.json" | ConvertFrom-Json

    # Check if patternLearning already exists
    if ($config.patternLearning) {
        Write-Info "patternLearning config already exists"
    } else {
        # Add patternLearning section
        $patternLearning = @{
            enabled = $true
            maxPatternsPerSession = 5
            minConfidence = 0.7
        }
        $config | Add-Member -NotePropertyName "patternLearning" -NotePropertyValue $patternLearning -Force

        # Save config
        $config | ConvertTo-Json -Depth 10 | Set-Content "mason.config.json" -Encoding UTF8

        Write-Success "Config updated"
    }
}

# Print completion message
function Write-Completion {
    Write-Host ""
    Write-Host "========================================"
    Write-Host "Mason Pattern Learning installed successfully!" -ForegroundColor Green
    Write-Host "========================================"
    Write-Host ""
    Write-Host "What's installed:"
    Write-Host "  - Pattern learning plugin for continuous improvement"
    Write-Host "  - /mason patterns command"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. View patterns: /mason patterns"
    Write-Host "  2. Clear patterns: /mason patterns --clear"
    Write-Host ""
    Write-Host "Configuration:"
    Write-Host "  - Settings: mason.config.json"
    Write-Host "  - Patterns: .claude/rules/learned-patterns.md"
    Write-Host ""
}

# Main installation flow
function Main {
    Write-Host ""
    Write-Host "========================================"
    Write-Host "Mason Pattern Learning"
    Write-Host "========================================"
    Write-Host ""

    Test-Requirements
    New-Directories
    Install-Files
    New-RulesFile
    Update-Config
    Write-Completion
}

# Run main
Main
