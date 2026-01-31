'use client';

import { DocsLayout } from '@/components/docs';

export default function MasonUpdatePage() {
  return (
    <DocsLayout
      title="/mason-update"
      description="Keep your Mason commands up to date."
    >
      <h2>Overview</h2>
      <p>
        The <code>/mason-update</code> command checks for and installs updates
        to your Mason commands. It ensures you always have the latest features
        and fixes.
      </p>

      <h2>Usage</h2>
      <pre>
        <code>/mason-update</code>
      </pre>
      <p>This checks all commands and updates any that have newer versions.</p>

      <h2>Automatic Updates</h2>
      <p>
        Most of the time, you don&apos;t need to run this command manually.
        Mason commands check for updates automatically before each run:
      </p>
      <ol>
        <li>Command checks its version against the remote manifest</li>
        <li>
          If below <code>required_minimum</code>, auto-updates before executing
        </li>
        <li>
          If a newer version exists but isn&apos;t required, shows notification
        </li>
      </ol>

      <h2>Version Enforcement</h2>
      <p>
        Critical updates set a <code>required_minimum</code> version. When this
        happens:
      </p>
      <ul>
        <li>The command automatically updates before running</li>
        <li>No user action required</li>
        <li>Ensures everyone has important fixes</li>
      </ul>

      <h2>Command Files</h2>
      <p>
        Commands are stored in <code>.claude/commands/</code> in your project:
      </p>
      <pre>
        <code>{`.claude/commands/
├── pm-review.md
├── execute-approved.md
└── mason-update.md`}</code>
      </pre>
      <p>Each file has YAML frontmatter with version information:</p>
      <pre>
        <code>{`---
name: pm-review
description: Analyze codebase and generate improvements
version: 2.2.0
---`}</code>
      </pre>

      <h2>Version Manifest</h2>
      <p>
        The central version manifest is hosted at the Mason repository. It
        contains:
      </p>
      <ul>
        <li>Current version for each command</li>
        <li>Required minimum versions</li>
        <li>Breaking change reasons</li>
      </ul>

      <h2>Manual Update Scenarios</h2>
      <p>
        You might want to run <code>/mason-update</code> manually when:
      </p>
      <ul>
        <li>Starting work on a new machine</li>
        <li>Troubleshooting command issues</li>
        <li>Wanting to preview new features before they become required</li>
      </ul>

      <h2>Checking Versions</h2>
      <p>To see what version you have:</p>
      <pre>
        <code>head -10 .claude/commands/pm-review.md</code>
      </pre>
      <p>The version is in the YAML frontmatter at the top.</p>
    </DocsLayout>
  );
}
