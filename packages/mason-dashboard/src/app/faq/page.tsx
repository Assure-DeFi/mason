'use client';

import {
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';

import { UserMenu } from '@/components/auth/user-menu';
import { MasonMark } from '@/components/brand';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  // Getting Started
  {
    category: 'Getting Started',
    question: 'What is Mason?',
    answer:
      'Mason is an AI-powered tool for continuous codebase improvement. It analyzes your repositories, identifies potential improvements, and helps you implement them systematically. Unlike other tools, Mason stores all data in your own Supabase database, ensuring complete privacy.',
  },
  {
    category: 'Getting Started',
    question: 'How do I get started with Mason?',
    answer:
      'To get started: 1) Sign in with your GitHub account, 2) Set up your Supabase database by providing your project URL and service role key, 3) Connect a GitHub repository, and 4) Run /pm-review in Claude Code to analyze your codebase. The Setup wizard will guide you through each step.',
  },
  {
    category: 'Getting Started',
    question: 'Is Mason free to use?',
    answer:
      'Mason is open-source and free to use. You will need your own Supabase account (free tier available) and AI provider API keys (OpenAI, Anthropic, or Google) to use the analysis features.',
  },

  // Privacy & Security
  {
    category: 'Privacy & Security',
    question: 'Where is my data stored?',
    answer:
      'All your data is stored in your own Supabase database. Mason does not have access to your repositories, improvement items, API keys, or any other data. We only host the open-source UI - everything else stays with you.',
  },
  {
    category: 'Privacy & Security',
    question: 'Can Assure DeFi see my code or data?',
    answer:
      'No. Assure DeFi has zero access to your repositories, improvements, or any other data. Your Supabase credentials are stored only in your browser and sent directly to your database. The Mason UI is completely stateless.',
  },
  {
    category: 'Privacy & Security',
    question: 'How are my API keys protected?',
    answer:
      'Your AI provider API keys are stored encrypted in your own Supabase database using AES-256 encryption. The encryption key is derived from your database credentials, so only you can decrypt them.',
  },
  {
    category: 'Privacy & Security',
    question: 'Is Mason open source?',
    answer:
      'Yes, Mason is fully open source. You can audit the code, self-host if you prefer, and contribute improvements. The source code is available on GitHub.',
  },

  // Database Setup
  {
    category: 'Database Setup',
    question: 'How do I set up my Supabase database?',
    answer:
      'Create a free Supabase project at supabase.com. Then go to Settings in the Mason UI and enter your Supabase project URL and service role key. Mason will automatically create the necessary tables when you run the database migrations.',
  },
  {
    category: 'Database Setup',
    question: 'Where do I find my Supabase credentials?',
    answer:
      'In your Supabase project dashboard, go to Settings > API. Your Project URL is listed there, and you can find the service_role key under Project API keys. Use the service_role key (not the anon key) for full database access.',
  },
  {
    category: 'Database Setup',
    question: 'What tables does Mason create?',
    answer:
      'Mason creates several tables including: mason_pm_backlog_items (improvement items), mason_api_keys (your encrypted API keys), mason_github_repos (connected repositories), and mason_settings (configuration). All tables are prefixed with "mason_" to avoid conflicts.',
  },
  {
    category: 'Database Setup',
    question: 'Can I use an existing Supabase project?',
    answer:
      "Yes! Mason uses its own prefixed tables (mason_*) so it won't conflict with your existing data. You can safely use Mason alongside other applications in the same Supabase project.",
  },

  // GitHub Integration
  {
    category: 'GitHub Integration',
    question: 'How do I connect a GitHub repository?',
    answer:
      'Go to Repository Settings in the user menu and click "Connect Repository". Enter your GitHub Personal Access Token (with repo scope) and select the repository you want to analyze. The token is stored encrypted in your database.',
  },
  {
    category: 'GitHub Integration',
    question: 'What GitHub permissions does Mason need?',
    answer:
      'Mason requires a Personal Access Token with the "repo" scope to read repository contents for analysis. If you want Mason to create pull requests, it also needs write access. You control exactly which repositories Mason can access.',
  },
  {
    category: 'GitHub Integration',
    question: 'Can I connect multiple repositories?',
    answer:
      'Yes, you can connect as many repositories as you like. Each repository is analyzed separately, and you can filter your backlog by repository.',
  },
  {
    category: 'GitHub Integration',
    question: 'How do I install the Mason GitHub App?',
    answer:
      "The Mason GitHub App provides seamless integration for executing improvements. When connecting a repository, you'll be prompted to install the app on your GitHub account or organization. This enables Mason to create branches and pull requests on your behalf.",
  },

  // AI Providers
  {
    category: 'AI Providers',
    question: 'Which AI providers does Mason support?',
    answer:
      'Mason supports OpenAI (GPT-4), Anthropic (Claude), and Google (Gemini). You can configure one or more providers in AI Provider settings. Mason will use the first available provider for analysis.',
  },
  {
    category: 'AI Providers',
    question: 'How do I add an AI provider?',
    answer:
      'Go to AI Providers in the user menu and click "Add Provider". Enter your API key for OpenAI, Anthropic, or Google. You can test the key to verify it works before saving.',
  },
  {
    category: 'AI Providers',
    question: 'Do I need all three AI providers?',
    answer:
      'No, you only need one AI provider to use Mason. Configure whichever provider you have access to. Having multiple providers configured provides fallback options if one is unavailable.',
  },

  // Using Mason
  {
    category: 'Using Mason',
    question: 'How do I analyze my codebase?',
    answer:
      'Run the /pm-review command in Claude Code while in your repository. This will analyze your codebase and create improvement items in your Mason backlog. You can then review, prioritize, and approve items in the Mason dashboard.',
  },
  {
    category: 'Using Mason',
    question: 'What is the backlog?',
    answer:
      'The backlog is where all improvement items are tracked. Items have statuses: New (pending review), Approved (ready for implementation), In Progress (being worked on), Completed (done), Deferred (postponed), Rejected (not needed), and Filtered (hidden by auto-filters).',
  },
  {
    category: 'Using Mason',
    question: 'How do I approve an improvement item?',
    answer:
      'Click on an item in the backlog to open its details. Review the suggested improvement, optionally generate a PRD (Product Requirements Document), then click "Approve" to mark it ready for implementation.',
  },
  {
    category: 'Using Mason',
    question: 'What is a PRD and why generate one?',
    answer:
      'A PRD (Product Requirements Document) provides detailed requirements and acceptance criteria for an improvement. Generating a PRD helps ensure the AI implements the improvement correctly by providing clear specifications.',
  },
  {
    category: 'Using Mason',
    question: 'How do I execute approved improvements?',
    answer:
      'Run the /execute-approved command in Claude Code. This will implement the next approved item from your backlog, creating the necessary code changes. You can review the changes before committing.',
  },
  {
    category: 'Using Mason',
    question: 'Can I bulk approve or reject items?',
    answer:
      'Yes! Select multiple items using the checkboxes, then use the bulk actions bar that appears to approve, reject, or defer all selected items at once.',
  },

  // Troubleshooting
  {
    category: 'Troubleshooting',
    question: 'Why are my backlog items not showing up?',
    answer:
      "Check that: 1) Your database is properly connected in Settings, 2) You've run /pm-review to generate items, 3) You're not filtering by status or repository that excludes your items. Also verify the database migrations have been run.",
  },
  {
    category: 'Troubleshooting',
    question: 'Why is the AI analysis failing?',
    answer:
      'Verify that: 1) You have at least one AI provider configured with a valid API key, 2) Your API key has sufficient credits/quota, 3) The provider service is not experiencing outages. You can test your API key in AI Provider settings.',
  },
  {
    category: 'Troubleshooting',
    question: 'How do I reset my database?',
    answer:
      'In your Supabase dashboard, you can drop the mason_* tables and re-run migrations. Go to Database Setup in Mason and click "Run Migrations" to recreate the tables. This will delete all your improvement items.',
  },
  {
    category: 'Troubleshooting',
    question: 'The GitHub connection is not working. What should I check?',
    answer:
      'Verify that: 1) Your Personal Access Token has the "repo" scope, 2) The token hasn\'t expired, 3) You have access to the repository you\'re trying to connect. You can regenerate your token in GitHub Settings > Developer Settings > Personal Access Tokens.',
  },
];

const CATEGORIES = Array.from(new Set(FAQ_ITEMS.map((item) => item.category)));

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === null || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, FAQItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedItems(new Set(filteredItems.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  return (
    <main className="min-h-screen bg-navy">
      {/* Header with Mason branding */}
      <div className="border-b border-gray-800/50 bg-black/20">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="group flex items-center gap-3 transition-opacity hover:opacity-80"
              >
                <MasonMark
                  size="sm"
                  className="transition-transform group-hover:scale-105"
                />
                <span className="mason-wordmark text-lg font-bold tracking-wider text-white">
                  MASON
                </span>
              </Link>
            </div>
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Title */}
        <div className="mason-entrance mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="rounded-lg bg-gold/10 p-2">
              <HelpCircle className="h-8 w-8 text-gold" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Frequently Asked Questions
          </h1>
          <p className="mt-2 text-gray-400">
            Find answers to common questions about Mason
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-black/50 py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        {/* Category Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-gold text-navy'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-gold text-navy'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Expand/Collapse Controls */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Showing {filteredItems.length} of {FAQ_ITEMS.length} questions
          </p>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-sm text-gray-400 hover:text-white"
            >
              Expand all
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-gray-400 hover:text-white"
            >
              Collapse all
            </button>
          </div>
        </div>

        {/* FAQ Items */}
        {Object.entries(groupedItems).length === 0 ? (
          <div className="rounded-lg border border-gray-800 bg-black/30 p-8 text-center">
            <p className="text-gray-400">
              No questions found matching your search.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                <h2 className="mb-4 text-lg font-semibold text-gold">
                  {category}
                </h2>
                <div className="space-y-2">
                  {items.map((item) => {
                    const globalIndex = FAQ_ITEMS.indexOf(item);
                    const isExpanded = expandedItems.has(globalIndex);
                    return (
                      <div
                        key={globalIndex}
                        className="rounded-lg border border-gray-800 bg-black/30"
                      >
                        <button
                          onClick={() => toggleItem(globalIndex)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <span className="font-medium text-white">
                            {item.question}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 flex-shrink-0 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-400" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="border-t border-gray-800 px-4 py-3">
                            <p className="whitespace-pre-wrap text-gray-300">
                              {item.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-400">
            Can&apos;t find what you&apos;re looking for?{' '}
            <a
              href="https://github.com/anthropics/claude-code/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              Open an issue on GitHub
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
