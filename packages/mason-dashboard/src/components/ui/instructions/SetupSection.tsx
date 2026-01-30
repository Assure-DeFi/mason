'use client';

import { Database, Github, Sparkles, Terminal, CheckCircle2 } from 'lucide-react';

export function SetupSection() {
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
