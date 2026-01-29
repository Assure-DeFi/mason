# Mason Auto-Pilot & Pattern Learning Installer (Windows PowerShell)
#
# This script installs the Mason compound learning system:
# - Auto-pilot skill for autonomous backlog execution
# - Pattern learning plugin for continuous improvement
#
# Usage (from any project directory):
#   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Assure-DeFi/mason/main/extras/compound-learning/install.ps1" -OutFile "install-autopilot.ps1"; .\install-autopilot.ps1
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

    # Check gh CLI (optional)
    try {
        $ghVersion = & gh --version 2>&1 | Select-Object -First 1
        Write-Success "GitHub CLI found: $ghVersion"
    } catch {
        Write-Warn "GitHub CLI not found (optional, for auto PR creation)"
        Write-Host "  Install: winget install --id GitHub.cli"
    }
}

# Create directory structure
function New-Directories {
    Write-Info "Creating directory structure..."

    # Auto-pilot skill
    New-Item -ItemType Directory -Force -Path ".claude/skills/mason-autopilot/scripts/lib" | Out-Null
    New-Item -ItemType Directory -Force -Path ".claude/skills/mason-autopilot/templates" | Out-Null

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
    $localSkillPath = Join-Path $scriptDir "skills/mason-autopilot/SKILL.md"

    if (Test-Path $localSkillPath) {
        Write-Info "Installing from local repository..."

        # Copy auto-pilot skill
        Copy-Item -Path "$scriptDir/skills/mason-autopilot/*" -Destination ".claude/skills/mason-autopilot/" -Recurse -Force

        # Copy pattern learning plugin
        Copy-Item -Path "$scriptDir/plugins/mason-learning/*" -Destination ".claude/plugins/mason-learning/" -Recurse -Force

        # Copy commands
        Copy-Item -Path "$scriptDir/commands/mason-autopilot.md" -Destination ".claude/commands/" -Force
        Copy-Item -Path "$scriptDir/commands/mason-patterns.md" -Destination ".claude/commands/" -Force

    } else {
        Write-Info "Downloading from GitHub..."

        # GitHub raw URL base - files are in extras/compound-learning/
        $githubRaw = "https://raw.githubusercontent.com/Assure-DeFi/mason/main/extras/compound-learning"

        # Download auto-pilot skill
        Invoke-WebRequest -Uri "$githubRaw/skills/mason-autopilot/SKILL.md" -OutFile ".claude/skills/mason-autopilot/SKILL.md"
        Invoke-WebRequest -Uri "$githubRaw/skills/mason-autopilot/scripts/fetch_next_item.py" -OutFile ".claude/skills/mason-autopilot/scripts/fetch_next_item.py"
        Invoke-WebRequest -Uri "$githubRaw/skills/mason-autopilot/scripts/create_pr.py" -OutFile ".claude/skills/mason-autopilot/scripts/create_pr.py"
        Invoke-WebRequest -Uri "$githubRaw/skills/mason-autopilot/scripts/requirements.txt" -OutFile ".claude/skills/mason-autopilot/scripts/requirements.txt"
        Invoke-WebRequest -Uri "$githubRaw/skills/mason-autopilot/scripts/lib/__init__.py" -OutFile ".claude/skills/mason-autopilot/scripts/lib/__init__.py"
        Invoke-WebRequest -Uri "$githubRaw/skills/mason-autopilot/scripts/lib/mason_api.py" -OutFile ".claude/skills/mason-autopilot/scripts/lib/mason_api.py"
        Invoke-WebRequest -Uri "$githubRaw/skills/mason-autopilot/scripts/lib/git_ops.py" -OutFile ".claude/skills/mason-autopilot/scripts/lib/git_ops.py"

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
        Invoke-WebRequest -Uri "$githubRaw/commands/mason-autopilot.md" -OutFile ".claude/commands/mason-autopilot.md"
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

    # Check if autoPilot already exists
    if ($config.autoPilot) {
        Write-Info "autoPilot config already exists"
    } else {
        # Update version
        $config | Add-Member -NotePropertyName "version" -NotePropertyValue "3.0" -Force

        # Add autoPilot section
        $autoPilot = @{
            enabled = $true
            maxItemsPerRun = 3
            branchPrefix = "work/mason-"
            qualityChecks = @("npm run typecheck", "npm test")
            autoCreatePr = $true
        }
        $config | Add-Member -NotePropertyName "autoPilot" -NotePropertyValue $autoPilot -Force

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
    Write-Host "Mason Auto-Pilot installed successfully!" -ForegroundColor Green
    Write-Host "========================================"
    Write-Host ""
    Write-Host "What's installed:"
    Write-Host "  - Auto-pilot skill for autonomous backlog execution"
    Write-Host "  - Pattern learning plugin for continuous improvement"
    Write-Host "  - /mason auto-pilot command"
    Write-Host "  - /mason patterns command"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Test with: /mason auto-pilot --dry-run"
    Write-Host "  2. Execute one item: /mason auto-pilot --single"
    Write-Host "  3. View patterns: /mason patterns"
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
    Write-Host "Mason Auto-Pilot & Pattern Learning"
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
