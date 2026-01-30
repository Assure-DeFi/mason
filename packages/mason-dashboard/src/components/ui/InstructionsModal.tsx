'use client';

import {
  X,
  BookOpen,
  ChevronRight,
  Terminal,
  Sparkles,
  CheckCircle2,
  Settings,
  Database,
  Github,
  Key,
  LayoutDashboard,
  Zap,
  FileText,
  PlayCircle,
  Filter,
  Search,
  MousePointer,
  Keyboard,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Section =
  | 'overview'
  | 'setup'
  | 'pm-review'
  | 'backlog'
  | 'prd'
  | 'execute'
  | 'settings'
  | 'shortcuts';

interface SectionItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
}

const sections: SectionItem[] = [
  { id: 'overview', label: 'Overview', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'setup', label: 'Getting Started', icon: <Zap className="h-4 w-4" /> },
  {
    id: 'pm-review',
    label: 'Running PM Review',
    icon: <Terminal className="h-4 w-4" />,
  },
  {
    id: 'backlog',
    label: 'Managing Backlog',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    id: 'prd',
    label: 'Generating PRDs',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: 'execute',
    label: 'Executing Items',
    icon: <PlayCircle className="h-4 w-4" />,
  },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  {
    id: 'shortcuts',
    label: 'Keyboard Shortcuts',
    icon: <Keyboard className="h-4 w-4" />,
  },
];

export function InstructionsModal({ isOpen, onClose }: InstructionsModalProps) {
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />;
      case 'setup':
        return <SetupSection />;
      case 'pm-review':
        return <PMReviewSection />;
      case 'backlog':
        return <BacklogSection />;
      case 'prd':
        return <PRDSection />;
      case 'execute':
        return <ExecuteSection />;
      case 'settings':
        return <SettingsSection />;
      case 'shortcuts':
        return <ShortcutsSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 flex h-[85vh] w-full max-w-5xl overflow-hidden rounded-lg border border-gray-800 bg-navy shadow-2xl">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-gray-800 bg-black/30">
          <div className="flex items-center gap-3 border-b border-gray-800 p-4">
            <div className="rounded-lg bg-gold/20 p-2">
              <BookOpen className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h2 className="font-semibold text-white">User Guide</h2>
              <p className="text-xs text-gray-400">How to use Mason</p>
            </div>
          </div>
          <nav className="p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-gold/20 text-gold'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">
              {sections.find((s) => s.id === activeSection)?.label}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}

function OverviewSection() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gold/30 bg-gold/10 p-4">
        <h4 className="flex items-center gap-2 font-semibold text-gold">
          <Sparkles className="h-5 w-5" />
          What is Mason?
        </h4>
        <p className="mt-2 text-gray-300">
          Mason is an AI-powered product management tool that analyzes your
          codebase and generates prioritized improvement suggestions. It
          integrates with Claude Code to provide intelligent recommendations for
          features, fixes, and optimizations.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Key Features</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={<Terminal className="h-5 w-5" />}
            title="Codebase Analysis"
            description="Run /pm-review in Claude Code to analyze your codebase and generate improvement suggestions"
          />
          <FeatureCard
            icon={<LayoutDashboard className="h-5 w-5" />}
            title="Backlog Dashboard"
            description="View, filter, and manage all improvement suggestions in a centralized dashboard"
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="PRD Generation"
            description="Generate detailed Product Requirements Documents for any improvement item"
          />
          <FeatureCard
            icon={<PlayCircle className="h-5 w-5" />}
            title="Execute Improvements"
            description="Approve items and execute them with a single command in Claude Code"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Privacy First</h4>
        <p className="text-gray-400">
          Mason stores all your data in your own Supabase database. Your code,
          improvements, and API keys never leave your infrastructure. The
          central server only validates your identity - it never sees your
          backlog items or code.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Quick Start Flow</h4>
        <ol className="space-y-3">
          <StepItem
            number={1}
            text="Complete the setup wizard to configure your database and GitHub connection"
          />
          <StepItem
            number={2}
            text="Connect a repository from the Settings page"
          />
          <StepItem number={3} text="Install Mason CLI in your repository" />
          <StepItem
            number={4}
            text="Run /pm-review in Claude Code to analyze your codebase"
          />
          <StepItem
            number={5}
            text="Review and approve suggestions in the dashboard"
          />
          <StepItem
            number={6}
            text="Execute approved items with /execute-approved"
          />
        </ol>
      </div>
    </div>
  );
}

function SetupSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-white">Initial Setup</h4>
        <p className="text-gray-400">
          Before using Mason, you need to complete the setup wizard which guides
          you through configuring your database and connections.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Database className="h-5 w-5 text-gold" />
          1. Database Configuration
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">a.</span>
              <span>
                Create a free Supabase project at{' '}
                <code className="rounded bg-black px-1 text-gold">
                  supabase.com
                </code>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">b.</span>
              <span>
                Copy your Project URL and Anon Key from Settings → API
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">c.</span>
              <span>Copy your Database Password from Settings → Database</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">d.</span>
              <span>
                Enter these credentials in the setup wizard to initialize your
                database
              </span>
            </li>
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Github className="h-5 w-5 text-gold" />
          2. GitHub Connection
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">a.</span>
              <span>
                Sign in with GitHub to authorize Mason to access your
                repositories
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">b.</span>
              <span>
                Your GitHub token is stored locally in your browser only - never
                on our servers
              </span>
            </li>
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Sparkles className="h-5 w-5 text-gold" />
          3. AI Provider (Optional)
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <p className="mb-3 text-sm text-gray-300">
            Configure an AI provider key for PRD generation:
          </p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>
                <strong className="text-gray-300">Anthropic:</strong> Preferred
                (Claude 3.5 Sonnet)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>
                <strong className="text-gray-300">OpenAI:</strong> Fallback
                (GPT-4)
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Terminal className="h-5 w-5 text-gold" />
          4. Install Mason CLI
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <p className="mb-3 text-sm text-gray-300">
            After connecting a repository, install Mason in your local clone:
          </p>
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">a.</span>
              <span>Go to Settings → Repository Settings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">b.</span>
              <span>Click "Install Mason" next to your repository</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">c.</span>
              <span>
                Copy the install command and run it in your repository root
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function PMReviewSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-white">Running a PM Review</h4>
        <p className="text-gray-400">
          The PM Review command analyzes your codebase and generates prioritized
          improvement suggestions across multiple domains.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">How to Run</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <p className="mb-3 text-sm text-gray-300">
            In Claude Code, run one of these commands:
          </p>
          <div className="space-y-2 font-mono text-sm">
            <CodeBlock
              code="/pm-review"
              description="Full analysis (10-20 items)"
            />
            <CodeBlock
              code="/pm-review area:frontend-ux"
              description="Focus on frontend/UX"
            />
            <CodeBlock
              code="/pm-review area:api-backend"
              description="Focus on backend/API"
            />
            <CodeBlock
              code="/pm-review area:security"
              description="Focus on security"
            />
            <CodeBlock
              code="/pm-review quick"
              description="Quick wins only (5-7 items)"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Analysis Domains</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <DomainCard
            title="Frontend UX"
            description="UI/UX issues, accessibility, responsive design, user flow"
          />
          <DomainCard
            title="API Backend"
            description="API design, performance, error handling, endpoints"
          />
          <DomainCard
            title="Reliability"
            description="Error handling, logging, monitoring, graceful degradation"
          />
          <DomainCard
            title="Security"
            description="Auth issues, input validation, OWASP vulnerabilities"
          />
          <DomainCard
            title="Code Quality"
            description="Duplication, complexity, testing gaps, technical debt"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Scoring System</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">Impact (1-10):</span>
              <span>How much value does this improvement add?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">Effort (1-10):</span>
              <span>How much work is required?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">Priority:</span>
              <span>Calculated as (Impact × 2) - Effort</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">Complexity (1-5):</span>
              <span>Technical complexity rating</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function BacklogSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-white">Backlog Dashboard</h4>
        <p className="text-gray-400">
          The backlog dashboard is your central hub for managing all improvement
          suggestions generated by PM Review.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Status Tabs</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <StatusCard
            status="New"
            description="Newly created items awaiting review"
            color="text-blue-400"
          />
          <StatusCard
            status="Approved"
            description="Items approved for implementation"
            color="text-green-400"
          />
          <StatusCard
            status="In Progress"
            description="Items currently being implemented"
            color="text-yellow-400"
          />
          <StatusCard
            status="Completed"
            description="Successfully implemented items"
            color="text-gray-400"
          />
          <StatusCard
            status="Deferred"
            description="Items postponed for later"
            color="text-orange-400"
          />
          <StatusCard
            status="Rejected"
            description="Items that won't be implemented"
            color="text-red-400"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Filter className="h-5 w-5 text-gold" />
          Filtering Items
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>
                <strong>Area:</strong> Frontend or Backend
              </span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>
                <strong>Type:</strong> Dashboard, Discovery, Auth, Backend
              </span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>
                <strong>Complexity:</strong> 1 (Trivial) to 5 (Very High)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>
                <strong>Effort:</strong> Score range (e.g., 1-3 for quick wins)
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <MousePointer className="h-5 w-5 text-gold" />
          Item Actions
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Click any row to view item details</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Use checkboxes for bulk selection</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Bulk approve, reject, or defer selected items</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Sort by any column header</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Search className="h-5 w-5 text-gold" />
          Quick Wins
        </h4>
        <p className="text-gray-400">
          Items with high impact and low effort are marked with a "Quick Win"
          badge. These are the best candidates for immediate implementation.
        </p>
      </div>
    </div>
  );
}

function PRDSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-white">
          Product Requirements Documents
        </h4>
        <p className="text-gray-400">
          PRDs are detailed implementation plans generated by AI for each
          improvement item. They provide structured guidance for developers.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Generating a PRD</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">1.</span>
              <span>Click on any item to open the detail modal</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">2.</span>
              <span>
                Click the "Generate PRD" button (or press{' '}
                <kbd className="rounded bg-black px-1">G</kbd>)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">3.</span>
              <span>
                Wait for AI to generate the document (requires AI provider key)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">4.</span>
              <span>View the PRD in the "PRD" tab</span>
            </li>
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">PRD Contents</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <ContentCard
            title="Problem Statement"
            description="Clear description of the issue being addressed"
          />
          <ContentCard
            title="Proposed Solution"
            description="Detailed technical approach and implementation"
          />
          <ContentCard
            title="Success Criteria"
            description="Measurable goals for the implementation"
          />
          <ContentCard
            title="Technical Approach"
            description="Wave-based task breakdown for parallel execution"
          />
          <ContentCard
            title="Risks & Mitigations"
            description="Potential issues and how to address them"
          />
          <ContentCard
            title="Out of Scope"
            description="What is explicitly not included"
          />
        </div>
      </div>

      <div className="rounded-lg border border-yellow-800/30 bg-yellow-900/10 p-4">
        <p className="text-sm text-yellow-200/80">
          <strong>Note:</strong> PRD generation requires an AI provider key
          (Anthropic or OpenAI). Configure this in Settings → AI Providers.
        </p>
      </div>
    </div>
  );
}

function ExecuteSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-white">Executing Approved Items</h4>
        <p className="text-gray-400">
          Once items are approved and have PRDs, you can execute them using
          Claude Code to automatically implement the changes.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Execution Methods</h4>
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
            <h5 className="mb-2 font-medium text-gold">
              Method 1: Dashboard Button
            </h5>
            <ol className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="font-medium text-gold">1.</span>
                <span>Go to the "Approved" tab in the backlog</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-gold">2.</span>
                <span>Click the "Execute" button</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-gold">3.</span>
                <span>Copy the generated command</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-gold">4.</span>
                <span>Paste and run in Claude Code</span>
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
            <h5 className="mb-2 font-medium text-gold">
              Method 2: Direct Command
            </h5>
            <p className="mb-2 text-sm text-gray-300">
              Run directly in Claude Code:
            </p>
            <div className="rounded bg-black p-2 font-mono text-sm text-gray-300">
              /execute-approved
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Execution Process</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">1.</span>
              <span>Creates a feature branch for the changes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">2.</span>
              <span>Executes tasks in parallel waves based on PRD</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">3.</span>
              <span>Runs validation (TypeScript, ESLint, tests)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">4.</span>
              <span>Auto-fixes any validation failures</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">5.</span>
              <span>Commits changes when all validations pass</span>
            </li>
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Remote Execution</h4>
        <p className="text-gray-400">
          For connected repositories, you can also trigger execution from the
          dashboard which will create a PR automatically. This requires a GitHub
          token with repo access.
        </p>
      </div>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-white">Settings Overview</h4>
        <p className="text-gray-400">
          Configure Mason through the user menu in the top-right corner of the
          dashboard.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Github className="h-5 w-5 text-gold" />
          Repository Settings
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Connect new repositories from GitHub</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Install Mason CLI in connected repos</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Disconnect repositories you no longer need</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Key className="h-5 w-5 text-gold" />
          API Keys
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Generate new API keys for CLI authentication</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>View existing keys (prefixes only for security)</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Revoke keys that are no longer needed</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Sparkles className="h-5 w-5 text-gold" />
          AI Providers
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Configure Anthropic API key (recommended)</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Configure OpenAI API key (fallback)</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Test keys to verify they work</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Database className="h-5 w-5 text-gold" />
          Database Setup
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Re-run the setup wizard if needed</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Update database credentials</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Run migrations for new features</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ShortcutsSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-white">Keyboard Shortcuts</h4>
        <p className="text-gray-400">
          Use these keyboard shortcuts for faster navigation and actions.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Item Detail Modal</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ShortcutRow shortcut="G" description="Generate PRD" />
            <ShortcutRow shortcut="A" description="Approve item" />
            <ShortcutRow shortcut="X" description="Reject item" />
            <ShortcutRow shortcut="Esc" description="Close modal" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Global Shortcuts</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ShortcutRow shortcut="Esc" description="Close any modal" />
            <ShortcutRow shortcut="Enter" description="Confirm action" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Claude Code Commands</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <div className="space-y-2">
            <CommandRow
              command="/pm-review"
              description="Run codebase analysis"
            />
            <CommandRow
              command="/pm-review area:frontend-ux"
              description="Analyze frontend only"
            />
            <CommandRow
              command="/pm-review area:api-backend"
              description="Analyze backend only"
            />
            <CommandRow
              command="/pm-review quick"
              description="Quick wins only"
            />
            <CommandRow
              command="/execute-approved"
              description="Execute approved items"
            />
            <CommandRow command="/commit" description="Create a git commit" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
      <div className="mb-2 flex items-center gap-2 text-gold">{icon}</div>
      <h5 className="font-medium text-white">{title}</h5>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function StepItem({ number, text }: { number: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-navy">
        {number}
      </div>
      <span className="text-gray-300">{text}</span>
    </li>
  );
}

function CodeBlock({
  code,
  description,
}: {
  code: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between rounded bg-black px-3 py-2">
      <code className="text-gold">{code}</code>
      <span className="text-xs text-gray-400">{description}</span>
    </div>
  );
}

function DomainCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-black/30 p-3">
      <h5 className="font-medium text-white">{title}</h5>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
    </div>
  );
}

function StatusCard({
  status,
  description,
  color,
}: {
  status: string;
  description: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-black/30 p-3">
      <h5 className={`font-medium ${color}`}>{status}</h5>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
    </div>
  );
}

function ContentCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-black/30 p-3">
      <h5 className="font-medium text-white">{title}</h5>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
    </div>
  );
}

function ShortcutRow({
  shortcut,
  description,
}: {
  shortcut: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{description}</span>
      <kbd className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gold">
        {shortcut}
      </kbd>
    </div>
  );
}

function CommandRow({
  command,
  description,
}: {
  command: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <code className="font-mono text-sm text-gold">{command}</code>
      <span className="text-xs text-gray-400">{description}</span>
    </div>
  );
}
