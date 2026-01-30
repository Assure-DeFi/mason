'use client';

import { ChevronRight } from 'lucide-react';

/**
 * Shared helper components for Instructions sections
 */

export function FeatureCard({
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

export function StepItem({ number, text }: { number: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-navy">
        {number}
      </div>
      <span className="text-gray-300">{text}</span>
    </li>
  );
}

export function CodeBlock({
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

export function DomainCard({
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

export function StatusCard({
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

export function ContentCard({
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

export function ShortcutRow({
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

export function CommandRow({
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

export function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <ChevronRight className="h-4 w-4 text-gold" />
      {children}
    </li>
  );
}
