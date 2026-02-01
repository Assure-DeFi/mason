'use client';

import {
  ChevronDown,
  ChevronUp,
  Search,
  ArrowLeft,
  Terminal,
  Database,
  Github,
  Shield,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';

import { UserMenu } from '@/components/auth/user-menu';
import { MasonTagline } from '@/components/brand';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Terminal className="w-5 h-5" />,
    items: [
      {
        question: 'What is Mason?',
        answer:
          "Mason is an AI-powered tool that reviews your codebase and suggests improvements. It works through Claude Code (Anthropic's CLI) and stores all data in YOUR Supabase database - nothing is stored on Mason servers.",
      },
      {
        question: 'What is Claude Code and how do I install it?',
        answer:
          "Claude Code is Anthropic's official command-line interface for Claude. You can install it by visiting anthropic.com/claude-code. Mason uses Claude Code to analyze your codebase and execute approved improvements.",
      },
      {
        question: 'What do I need to get started?',
        answer:
          'You need: 1) Claude Code installed, 2) A GitHub account for authentication, 3) A free Supabase account for your database, and 4) About 5 minutes to complete setup.',
      },
      {
        question: 'How does the setup process work?',
        answer:
          'The setup wizard guides you through: 1) Signing in with GitHub, 2) Connecting your Supabase database, 3) Generating an API key for the CLI. After setup, you can run /pm-review in Claude Code to start analyzing your codebase.',
      },
      {
        question: 'Is Mason free to use?',
        answer:
          "Mason itself is free. You'll need your own Anthropic API key for Claude Code usage, and a free Supabase account for your database. Supabase's free tier is generous and sufficient for most users.",
      },
    ],
  },
  {
    id: 'privacy-security',
    title: 'Privacy & Security',
    icon: <Shield className="w-5 h-5" />,
    items: [
      {
        question: 'Where is my data stored?',
        answer:
          "All your data (backlog items, PRDs, analysis results) is stored in YOUR Supabase database. Mason's central server only knows who you are and what repos you've connected - it never sees your actual data.",
      },
      {
        question: 'Can Mason developers see my code?',
        answer:
          'No. Your code analysis happens locally through Claude Code. Results are stored in your own Supabase database. We have no access to your code, analysis results, or any data in your database.',
      },
      {
        question: 'What data does Mason collect?',
        answer:
          "Our central server stores only: your GitHub user ID, username, email, avatar URL, and which repositories you've connected. Everything else stays in your Supabase.",
      },
      {
        question: 'How are my API keys protected?',
        answer:
          "API keys are hashed before storage and credentials are kept in your browser's localStorage or your own database. We never store plaintext secrets on our servers.",
      },
    ],
  },
  {
    id: 'database-setup',
    title: 'Database Setup',
    icon: <Database className="w-5 h-5" />,
    items: [
      {
        question: 'Why do I need my own Supabase?',
        answer:
          'This architecture ensures your data privacy. Your analysis results, PRDs, and backlog items never touch our servers. You have full control and ownership of your data.',
      },
      {
        question: 'How do I find my Supabase credentials?',
        answer:
          'In Supabase: Go to Settings > API. Your Project URL and anon/public key are visible there. The service_role key is under "Service Role" (keep this secret!). The database password was set when you created the project.',
      },
      {
        question: 'What if I lose my Supabase credentials?',
        answer:
          'You can always find them in your Supabase dashboard under Settings > API. If you lose your database password, you can reset it in Supabase under Settings > Database.',
      },
      {
        question: 'Can I use an existing Supabase project?',
        answer:
          "Yes! Mason creates its own tables (prefixed with mason_) and won't interfere with your existing data. Just provide your project credentials during setup.",
      },
    ],
  },
  {
    id: 'github-integration',
    title: 'GitHub Integration',
    icon: <Github className="w-5 h-5" />,
    items: [
      {
        question: 'What GitHub permissions does Mason need?',
        answer:
          'Mason requires read access to repositories you connect. This allows the CLI to access your code for analysis. You can revoke access at any time in GitHub settings.',
      },
      {
        question: 'Can I use Mason with private repositories?',
        answer:
          'Yes! As long as you grant the appropriate GitHub permissions, Mason can analyze private repositories. Remember, analysis happens locally through Claude Code.',
      },
      {
        question: 'How do I disconnect a repository?',
        answer:
          'Go to Settings > GitHub in the Mason dashboard. You can disconnect individual repositories there. To fully revoke access, remove Mason from your GitHub authorized applications.',
      },
      {
        question: "Why can't I see my repositories?",
        answer:
          "Make sure you've granted the appropriate permissions when signing in with GitHub. You may need to re-authenticate or check your GitHub application settings.",
      },
    ],
  },
  {
    id: 'using-mason',
    title: 'Using Mason',
    icon: <Wrench className="w-5 h-5" />,
    items: [
      {
        question: 'How do I run a PM review?',
        answer:
          'Open your terminal in your project directory with Claude Code running, then type /pm-review. Mason will analyze your codebase and send improvement suggestions to your dashboard.',
      },
      {
        question: 'What are the different backlog statuses?',
        answer:
          "New: Just discovered, needs review. Approved: Ready to implement. In Progress: Being worked on. Completed: Done. Deferred: Saved for later. Rejected: Won't implement.",
      },
      {
        question: 'How do I execute approved items?',
        answer:
          'Click "Execute Approved" in the dashboard to copy the command, then paste it into Claude Code. The command will be: /execute-approved --ids [item-ids]',
      },
      {
        question: 'What is a PRD?',
        answer:
          'PRD (Product Requirements Document) is a detailed specification generated for backlog items. It includes context, requirements, acceptance criteria, and implementation notes.',
      },
      {
        question: 'Can I customize the analysis focus?',
        answer:
          'Yes! You can use flags with /pm-review: --domain=security, --domain=performance, --domain=ux, etc. to focus on specific areas.',
      },
      {
        question: 'How does the priority score work?',
        answer:
          'Priority score (0-100) is calculated based on impact, effort, risk, and strategic alignment. Higher scores indicate items that provide more value for less effort.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: <AlertTriangle className="w-5 h-5" />,
    items: [
      {
        question: 'Install command not working',
        answer:
          "Make sure: 1) You're running the command in a terminal, not Claude Code directly, 2) curl is installed on your system, 3) You have internet access. Try: curl --version to verify curl is installed.",
      },
      {
        question: '/pm-review command not found',
        answer:
          'Verify: 1) Claude Code is running in your project directory, 2) mason.config.json exists in your project root, 3) The .claude/commands/ directory contains pm-review.md. Try reinstalling Mason.',
      },
      {
        question: 'Items not appearing in dashboard',
        answer:
          "Check: 1) You're logged in with the same GitHub account, 2) The correct repository is selected in the dashboard, 3) Your Supabase connection is working. Try clicking Refresh.",
      },
      {
        question: 'API key invalid or not working',
        answer:
          "API keys cannot be recovered once created. If your key isn't working: 1) Generate a new key in the dashboard, 2) Update mason.config.json with the new key, 3) Make sure the key wasn't truncated when copying.",
      },
      {
        question: 'Supabase connection failed',
        answer:
          'Verify: 1) Project URL format is correct (https://[project-id].supabase.co), 2) Anon key and service role key are from the API settings, 3) Your Supabase project is active (not paused).',
      },
      {
        question: 'No repositories showing in selector',
        answer:
          "This usually means: 1) You haven't granted repository access to GitHub, 2) The OAuth token has expired. Try signing out and back in, or check GitHub authorized applications.",
      },
      {
        question: 'PRD generation failed',
        answer:
          'PRD generation requires: 1) A valid AI provider API key configured in Claude Code, 2) The backlog item to have sufficient detail. Check Claude Code configuration.',
      },
      {
        question: 'Execute command does nothing',
        answer:
          'Make sure: 1) Items are in "Approved" status (not New or other), 2) Claude Code is running in your project directory, 3) You have at least one approved item. Check the item IDs in the command.',
      },
      {
        question: 'Dashboard shows loading forever',
        answer:
          'This could mean: 1) Supabase connection issues - check your credentials, 2) Network problems - check your internet, 3) Database tables missing - go to Settings and click "Update Database Schema".',
      },
      {
        question: 'Error: User not found in database',
        answer:
          'This happens when your user record is missing. Go to Settings and click "Update Database Schema" to ensure all tables exist, then try signing out and back in.',
      },
      {
        question: '"mason.config.json" not found errors',
        answer:
          'The config file should be in your project root. Either: 1) Run the install command again, 2) Download the config from the Setup Complete page, 3) Manually create it with your Supabase URL, anon key, and API key.',
      },
      {
        question: 'How do I reset everything and start fresh?',
        answer:
          'To reset: 1) Delete mason.config.json from your project, 2) Clear browser localStorage (or use Settings > Clear Local Data), 3) Go through the setup wizard again. Your Supabase data will remain unless you manually delete it.',
      },
    ],
  },
];

function FAQAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-800 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-4 text-left text-white hover:text-gold transition-colors"
      >
        <span className="font-medium pr-4">{item.question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 flex-shrink-0 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="pb-4 text-gray-400 text-sm leading-relaxed whitespace-pre-line">
          {item.answer}
        </div>
      )}
    </div>
  );
}

function FAQCategorySection({
  category,
  openItems,
  onToggleItem,
}: {
  category: FAQCategory;
  openItems: Set<string>;
  onToggleItem: (key: string) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-black/30 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 bg-gray-900/50 border-b border-gray-800">
        <div className="text-gold">{category.icon}</div>
        <h2 className="text-lg font-semibold text-white">{category.title}</h2>
        <span className="text-sm text-gray-500">
          ({category.items.length} items)
        </span>
      </div>
      <div className="px-6">
        {category.items.map((item, index) => {
          const key = `${category.id}-${index}`;
          return (
            <FAQAccordionItem
              key={key}
              item={item}
              isOpen={openItems.has(key)}
              onToggle={() => onToggleItem(key)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const handleToggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Filter categories and items based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return FAQ_DATA;
    }

    const query = searchQuery.toLowerCase();
    return FAQ_DATA.map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query),
      ),
    })).filter((category) => category.items.length > 0);
  }, [searchQuery]);

  // Auto-expand search results
  useMemo(() => {
    if (searchQuery.trim()) {
      const newOpenItems = new Set<string>();
      filteredCategories.forEach((category) => {
        category.items.forEach((_, index) => {
          newOpenItems.add(`${category.id}-${index}`);
        });
      });
      setOpenItems(newOpenItems);
    }
  }, [searchQuery, filteredCategories]);

  const totalQuestions = FAQ_DATA.reduce(
    (sum, cat) => sum + cat.items.length,
    0,
  );

  return (
    <main className="min-h-screen bg-navy">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/backlog"
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Frequently Asked Questions
                </h1>
                <MasonTagline size="sm" variant="muted" className="mt-1" />
                <p className="text-gray-400 text-sm mt-1">
                  {totalQuestions} questions across {FAQ_DATA.length} categories
                </p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b border-gray-800 bg-black/20">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-10 pr-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No results found
            </h2>
            <p className="text-gray-400">
              Try a different search term or browse all categories below.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-gold hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCategories.map((category) => (
              <FAQCategorySection
                key={category.id}
                category={category}
                openItems={openItems}
                onToggleItem={handleToggleItem}
              />
            ))}
          </div>
        )}

        {/* Still need help? */}
        <div className="mt-12 p-6 rounded-lg border border-gray-800 bg-black/30 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">
            Still need help?
          </h3>
          <p className="text-gray-400 mb-4">
            Can&apos;t find what you&apos;re looking for? Open an issue on
            GitHub.
          </p>
          <a
            href="https://github.com/Assure-DeFi/mason/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-navy font-medium rounded hover:opacity-90 transition-opacity"
          >
            <Github className="w-4 h-4" />
            Open an Issue
          </a>
        </div>
      </div>
    </main>
  );
}
