'use client';

import {
  Shield,
  Database,
  Eye,
  Lock,
  Server,
  Trash2,
  Github,
} from 'lucide-react';
import Link from 'next/link';

import { LandingHeader } from '@/components/landing';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';

export default function SecurityPage() {
  const principles = [
    {
      icon: Database,
      title: 'Your database, your data',
      description:
        'All your data lives in your own Supabase project. We provide the UI - you own the data.',
    },
    {
      icon: Eye,
      title: 'We never see your code',
      description:
        'Mason runs locally in Claude Code. Your codebase never touches our servers.',
    },
    {
      icon: Lock,
      title: 'Credentials stay local',
      description:
        'Your Supabase credentials and API keys are stored in your browser only. We never receive them.',
    },
    {
      icon: Server,
      title: 'Minimal central data',
      description:
        'Our database only knows who you are and what repos you connected. Nothing else.',
    },
    {
      icon: Trash2,
      title: 'Delete anytime',
      description:
        'Drop your Supabase tables and your data is gone. We have nothing to delete.',
    },
    {
      icon: Github,
      title: 'Open source',
      description:
        "The entire codebase is open source. Audit it yourself if you'd like.",
    },
  ];

  return (
    <main className="min-h-screen bg-navy">
      <LandingHeader />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mason-entrance mb-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-lg bg-gold/10 p-3">
              <Shield className="h-8 w-8 text-gold" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            Security & Privacy
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Mason is designed so we can&apos;t access your data even if we
            wanted to.
          </p>
        </div>

        {/* Quote */}
        <div
          className="mason-entrance mb-12 rounded-xl border border-gold/30 bg-gold/5 p-6 text-center"
          style={{ animationDelay: '0.1s' }}
        >
          <p className="text-lg italic text-gray-300">
            &ldquo;We don&apos;t want your data. Literally can&apos;t access
            it.&rdquo;
          </p>
        </div>

        {/* Principles Grid */}
        <div
          className="mason-entrance grid gap-6 md:grid-cols-2"
          style={{ animationDelay: '0.2s' }}
        >
          {principles.map((principle) => (
            <div
              key={principle.title}
              className="rounded-lg border border-gray-800 bg-black/30 p-6"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-gold/10 p-2">
                  <principle.icon className="h-5 w-5 text-gold" />
                </div>
                <h2 className="font-semibold text-white">{principle.title}</h2>
              </div>
              <p className="text-sm text-gray-400">{principle.description}</p>
            </div>
          ))}
        </div>

        {/* Data Location Table */}
        <div
          className="mason-entrance mt-12 rounded-lg border border-gray-800 bg-black/30 p-6"
          style={{ animationDelay: '0.3s' }}
        >
          <h2 className="mb-4 text-lg font-semibold text-white">
            Where your data lives
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="pb-3 text-left font-medium text-gray-400">
                    Data Type
                  </th>
                  <th className="pb-3 text-left font-medium text-gray-400">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr>
                  <td className="py-3 text-gray-300">User identity</td>
                  <td className="py-3 text-gold">Our database</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-300">Connected repos list</td>
                  <td className="py-3 text-gold">Our database</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-300">Supabase credentials</td>
                  <td className="py-3 text-green-400">Your browser only</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-300">AI provider keys</td>
                  <td className="py-3 text-green-400">Your Supabase</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-300">Backlog items & PRDs</td>
                  <td className="py-3 text-green-400">Your Supabase</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-300">Analysis results</td>
                  <td className="py-3 text-green-400">Your Supabase</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-300">Your code</td>
                  <td className="py-3 text-green-400">
                    Never leaves your machine
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* GitHub Link */}
        <div
          className="mason-entrance mt-12 text-center"
          style={{ animationDelay: '0.4s' }}
        >
          <Link
            href="https://github.com/Assure-DeFi/mason"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
          >
            <Github className="h-5 w-5" />
            View the source code on GitHub
          </Link>
        </div>

        <footer className="mt-16">
          <PoweredByFooter className="justify-center" />
        </footer>
      </div>
    </main>
  );
}
