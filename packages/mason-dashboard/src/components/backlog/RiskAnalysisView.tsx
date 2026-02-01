'use client';

import { clsx } from 'clsx';
import {
  FileCode,
  GitBranch,
  TestTube,
  Layers,
  Database,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import type { ImpactRadius } from '@/lib/analysis/cross-repo-analyzer';
import type { DependencyAnalysis, BreakingChange } from '@/types/backlog';
import { getRiskLevel, getRiskBgColor } from '@/types/backlog';

import { ImpactRadiusView } from './ImpactRadiusView';
import { RiskBadge } from './RiskBadge';

interface RiskAnalysisViewProps {
  analysis: DependencyAnalysis | null;
  isLoading?: boolean;
  analyzedAt?: string | null;
  crossRepoImpact?: ImpactRadius | null;
  sourceRepoName?: string;
}

/**
 * Detailed view of dependency/risk analysis for a backlog item
 * Risk analysis is now pre-populated during /pm-review - no manual trigger needed
 */
export function RiskAnalysisView({
  analysis,
  isLoading = false,
  analyzedAt,
  crossRepoImpact,
  sourceRepoName,
}: RiskAnalysisViewProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!analysis && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
          <TestTube className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Risk Analysis Pending
        </h3>
        <p className="text-gray-400 max-w-sm">
          Risk analysis is automatically generated when items are processed by{' '}
          <code className="px-1 py-0.5 bg-black rounded text-gold font-mono text-sm">
            /pm-review
          </code>
          . Re-run the review to populate this data.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Loading risk analysis...</p>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const level = getRiskLevel(analysis.overall_risk_score);

  const scoreItems = [
    {
      label: 'File Count',
      score: analysis.file_count_score,
      icon: FileCode,
      description: `${analysis.target_files.length} files directly affected`,
      weight: '20%',
    },
    {
      label: 'Dependency Depth',
      score: analysis.dependency_depth_score,
      icon: GitBranch,
      description: `${analysis.upstream_dependencies.length} upstream dependencies`,
      weight: '25%',
    },
    {
      label: 'Test Coverage',
      score: analysis.test_coverage_score,
      icon: TestTube,
      description:
        analysis.files_without_tests.length > 0
          ? `${analysis.files_without_tests.length} files lack tests`
          : 'All files have tests',
      weight: '25%',
    },
    {
      label: 'Cascade Potential',
      score: analysis.cascade_potential_score,
      icon: Layers,
      description: `${analysis.affected_files.length} files import these modules`,
      weight: '20%',
    },
    {
      label: 'API Surface',
      score: analysis.api_surface_score,
      icon: Database,
      description:
        [
          analysis.migration_needed && 'Migration needed',
          analysis.api_changes_detected && 'API changes',
        ]
          .filter(Boolean)
          .join(', ') || 'No API/DB changes',
      weight: '10%',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overall Risk Score */}
      <div className={clsx('p-4 border', getRiskBgColor(level))}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-1">
              Overall Risk Score
            </h3>
            <div className="flex items-center gap-3">
              <RiskBadge
                score={analysis.overall_risk_score}
                size="lg"
                showLabel
              />
              {analysis.has_breaking_changes && (
                <span className="flex items-center gap-1 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Breaking Changes
                </span>
              )}
            </div>
          </div>
        </div>
        {analyzedAt && (
          <p className="text-xs text-gray-500 mt-2">
            Analyzed {new Date(analyzedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Score Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
          Score Breakdown
        </h4>
        <div className="space-y-2">
          {scoreItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 p-3 bg-black/20 border border-gray-800"
              >
                <Icon className="w-5 h-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{item.label}</span>
                    <span className="text-xs text-gray-500">{item.weight}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {item.description}
                  </p>
                </div>
                <RiskBadge score={item.score} size="sm" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Breaking Changes */}
      {analysis.breaking_changes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Breaking Changes Detected
          </h4>
          <div className="space-y-2">
            {analysis.breaking_changes.map((change, idx) => (
              <BreakingChangeCard key={idx} change={change} />
            ))}
          </div>
        </div>
      )}

      {/* Expandable File Lists */}
      <div className="space-y-2">
        {/* Target Files */}
        <FileListSection
          title="Target Files"
          files={analysis.target_files}
          icon={<FileCode className="w-4 h-4" />}
          isExpanded={expandedSection === 'target'}
          onToggle={() =>
            setExpandedSection(expandedSection === 'target' ? null : 'target')
          }
        />

        {/* Affected Files */}
        <FileListSection
          title="Files That Import These"
          files={analysis.affected_files}
          icon={<Layers className="w-4 h-4" />}
          isExpanded={expandedSection === 'affected'}
          onToggle={() =>
            setExpandedSection(
              expandedSection === 'affected' ? null : 'affected',
            )
          }
        />

        {/* Files Without Tests */}
        {analysis.files_without_tests.length > 0 && (
          <FileListSection
            title="Missing Test Coverage"
            files={analysis.files_without_tests}
            icon={<XCircle className="w-4 h-4 text-red-400" />}
            isExpanded={expandedSection === 'untested'}
            onToggle={() =>
              setExpandedSection(
                expandedSection === 'untested' ? null : 'untested',
              )
            }
            variant="warning"
          />
        )}
      </div>

      {/* Cross-Repository Impact Analysis */}
      {(crossRepoImpact || sourceRepoName) && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Cross-Repository Impact
          </h4>
          <ImpactRadiusView
            impactRadius={crossRepoImpact ?? null}
            sourceRepoName={sourceRepoName ?? 'Current Repository'}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Breaking change card component
 */
function BreakingChangeCard({ change }: { change: BreakingChange }) {
  const severityColors = {
    low: 'border-yellow-400/30 bg-yellow-400/5',
    medium: 'border-orange-400/30 bg-orange-400/5',
    high: 'border-red-400/30 bg-red-400/5',
  };

  return (
    <div className={clsx('p-3 border', severityColors[change.severity])}>
      <div className="flex items-start gap-2">
        <span
          className={clsx(
            'px-1.5 py-0.5 text-xs font-medium',
            change.severity === 'high'
              ? 'bg-red-400/20 text-red-400'
              : change.severity === 'medium'
                ? 'bg-orange-400/20 text-orange-400'
                : 'bg-yellow-400/20 text-yellow-400',
          )}
        >
          {change.severity.toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white">{change.description}</p>
          <p className="text-xs text-gray-500 mt-1 truncate">{change.file}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Expandable file list section
 */
function FileListSection({
  title,
  files,
  icon,
  isExpanded,
  onToggle,
  variant = 'default',
}: {
  title: string;
  files: string[];
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  variant?: 'default' | 'warning';
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="border border-gray-800">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm text-white">{title}</span>
          <span
            className={clsx(
              'px-1.5 py-0.5 text-xs',
              variant === 'warning'
                ? 'bg-red-400/20 text-red-400'
                : 'bg-gray-700 text-gray-300',
            )}
          >
            {files.length}
          </span>
        </div>
        <span className="text-gray-400 text-sm">
          {isExpanded ? 'Hide' : 'Show'}
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-gray-800 p-3 bg-black/20 max-h-48 overflow-y-auto">
          <ul className="space-y-1">
            {files.map((file, idx) => (
              <li
                key={idx}
                className="text-xs text-gray-400 font-mono truncate"
              >
                {file}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
