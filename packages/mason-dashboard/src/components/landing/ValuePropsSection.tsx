'use client';

import { ListChecks, FileText, Rocket } from 'lucide-react';

/**
 * Value props - "What you get" 3-column layout
 */
export function ValuePropsSection() {
  const props = [
    {
      icon: ListChecks,
      title: 'Improvements worth making',
      description: 'A ranked list of real improvements, not busywork.',
    },
    {
      icon: FileText,
      title: 'PRDs on demand',
      description: 'Clear explanations and task breakdowns.',
    },
    {
      icon: Rocket,
      title: 'Simple execute flow',
      description: 'Approve, execute, shipped.',
    },
  ];

  return (
    <section
      className="mason-entrance px-4 py-12 sm:px-6 lg:px-8"
      style={{ animationDelay: '0.2s' }}
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">
          What you get
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {props.map((prop) => (
            <div
              key={prop.title}
              className="group rounded-lg border border-gray-800 bg-black/30 p-6 transition-all hover:border-gold/50"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10 transition-colors group-hover:bg-gold/20">
                <prop.icon className="h-6 w-6 text-gold" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {prop.title}
              </h3>
              <p className="text-sm text-gray-400">{prop.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
