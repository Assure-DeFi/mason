'use client';

import { AlertTriangle, GitBranch, Layers, ArrowRight } from 'lucide-react';
import { memo } from 'react';

import type {
  ImpactRadius,
  AffectedRepository,
} from '@/lib/analysis/cross-repo-analyzer';
import { getImpactSummary } from '@/lib/analysis/cross-repo-analyzer';

interface ImpactRadiusViewProps {
  impactRadius: ImpactRadius | null;
  sourceRepoName: string;
  className?: string;
}

function ImpactRadiusViewComponent({
  impactRadius,
  sourceRepoName,
  className = '',
}: ImpactRadiusViewProps) {
  if (!impactRadius) {
    return (
      <div
        className={`bg-gray-900/50 border border-gray-800 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center gap-2 text-gray-400">
          <Layers className="w-4 h-4" />
          <span className="text-sm">Cross-repo impact not analyzed</span>
        </div>
      </div>
    );
  }

  const summary = getImpactSummary(impactRadius);

  if (impactRadius.totalReposAffected === 0) {
    return (
      <div
        className={`bg-gray-900/50 border border-gray-800 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">
            No cross-repository dependencies detected
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 bg-black/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-white">
              Cross-Repository Impact
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 text-xs font-medium ${summary.color}`}
          >
            {summary.level === 'critical' && (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            {summary.message}
          </div>
        </div>
      </div>

      {/* Impact Visualization */}
      <div className="p-4">
        {/* Source Repository */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-gold" />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-white">
              {sourceRepoName}
            </div>
            <div className="text-xs text-gray-400">Source of changes</div>
          </div>
        </div>

        {/* Connection Lines */}
        {impactRadius.directlyAffected.length > 0 && (
          <div className="mt-4 ml-6 border-l-2 border-dashed border-gray-700 pl-6">
            {/* Directly Affected Header */}
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-medium text-orange-400 uppercase tracking-wide">
                Directly Affected
              </span>
              <span className="text-xs text-gray-500">
                ({impactRadius.directlyAffected.length})
              </span>
            </div>

            {/* Directly Affected Repos */}
            <div className="space-y-2">
              {impactRadius.directlyAffected.map((affected) => (
                <AffectedRepoCard
                  key={affected.repository.id}
                  affected={affected}
                />
              ))}
            </div>

            {/* Indirectly Affected */}
            {impactRadius.indirectlyAffected.length > 0 && (
              <div className="mt-6 ml-6 border-l-2 border-dashed border-gray-800 pl-6">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
                    Indirectly Affected
                  </span>
                  <span className="text-xs text-gray-500">
                    ({impactRadius.indirectlyAffected.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {impactRadius.indirectlyAffected.map((affected) => (
                    <AffectedRepoCard
                      key={affected.repository.id}
                      affected={affected}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Breaking Changes Warning */}
      {impactRadius.hasBreakingPotential && (
        <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-300">
              <span className="font-medium">Breaking changes detected:</span>{' '}
              This change may affect exports used by other repositories. Review
              the affected files carefully before deploying.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AffectedRepoCardProps {
  affected: AffectedRepository;
}

function AffectedRepoCard({ affected }: AffectedRepoCardProps) {
  const severityColors = {
    high: 'border-red-500/30 bg-red-500/5',
    medium: 'border-yellow-500/30 bg-yellow-500/5',
    low: 'border-gray-700 bg-gray-800/30',
  };

  const severityTextColors = {
    high: 'text-red-400',
    medium: 'text-yellow-400',
    low: 'text-gray-400',
  };

  return (
    <div
      className={`rounded-lg border p-3 ${severityColors[affected.impactSeverity]}`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm font-medium text-white">
            {affected.repository.github_full_name}
          </span>
        </div>
        <span
          className={`text-xs font-medium ${severityTextColors[affected.impactSeverity]}`}
        >
          {affected.impactSeverity.toUpperCase()}
        </span>
      </div>
      <div className="text-xs text-gray-400">{affected.description}</div>
      {affected.affectedFiles.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-700/50">
          <div className="text-xs text-gray-500">
            {affected.affectedFiles.length} file(s) affected
            {affected.affectedFiles.length <= 3 && (
              <ul className="mt-1 space-y-0.5">
                {affected.affectedFiles.map((file) => (
                  <li key={file} className="text-gray-400 font-mono truncate">
                    {file}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const ImpactRadiusView = memo(ImpactRadiusViewComponent);
