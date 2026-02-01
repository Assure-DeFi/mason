/**
 * Centralized tooltip content for Mason-specific terminology.
 * This ensures consistent explanations throughout the interface.
 */

export const SCORING_TOOLTIPS = {
  impact: {
    title: 'Impact Score',
    content:
      'How much value does this add to users? Scale: 1 (minimal) to 10 (transformative).',
  },
  effort: {
    title: 'Effort Score',
    content:
      'How hard is this to build? Scale: 1 (trivial) to 10 (massive undertaking).',
  },
  priority: {
    title: 'Priority Score',
    content:
      'Recommendation ranking calculated as (Impact × 2) - Effort. Higher scores indicate better ROI.',
  },
  risk: {
    title: 'Risk Score',
    content:
      'Potential for breaking changes or complications. 1-3: Low, 4-5: Medium, 6-7: High, 8-10: Critical.',
  },
} as const;

export const RISK_LEVEL_TOOLTIPS = {
  low: {
    title: 'Low Risk (1-3)',
    content:
      'Minimal breaking changes, high test coverage, small scope. Safe to implement.',
  },
  medium: {
    title: 'Medium Risk (4-5)',
    content:
      'Some testing gaps or moderate scope changes. Review carefully before implementing.',
  },
  high: {
    title: 'High Risk (6-7)',
    content:
      'Significant breaking changes or large scope. Requires thorough testing.',
  },
  critical: {
    title: 'Critical Risk (8-10)',
    content:
      'Major dependencies affected, substantial test coverage gaps. Proceed with caution.',
  },
} as const;

export const CATEGORY_TOOLTIPS = {
  feature: {
    title: 'Feature',
    content: 'Net-new functionality that extends product capabilities.',
  },
  ui: {
    title: 'UI',
    content: 'Visual changes, components, styling, and layout improvements.',
  },
  ux: {
    title: 'UX',
    content: 'User flows, journey optimization, and interaction patterns.',
  },
  api: {
    title: 'API',
    content: 'Backend endpoints, services, and server-side logic.',
  },
  data: {
    title: 'Data',
    content: 'Database schema changes, queries, and data migrations.',
  },
  security: {
    title: 'Security',
    content: 'Vulnerabilities, hardening, authentication, and authorization.',
  },
  performance: {
    title: 'Performance',
    content: 'Speed optimization, efficiency, and resource usage.',
  },
  'code-quality': {
    title: 'Code Quality',
    content: 'Refactors, cleanup, tech debt, and maintainability.',
  },
} as const;

export const BADGE_TOOLTIPS = {
  quickWin: {
    title: 'Quick Win',
    content:
      'High impact (7+) with low effort (3 or less). Prioritize these for fast value.',
  },
  highImpact: {
    title: 'High Impact',
    content: 'Very high impact score (9+). Significant value to users.',
  },
  lowHangingFruit: {
    title: 'Low Hanging Fruit',
    content: 'Very low effort (2 or less). Easy early wins.',
  },
  banger: {
    title: 'Banger Idea',
    content:
      'Previously featured transformation idea. Rotated but still valuable.',
  },
  newFeature: {
    title: 'New Feature',
    content: 'Adds entirely new functionality to the product.',
  },
} as const;

export const STATUS_TOOLTIPS = {
  new: {
    title: 'New',
    content: 'Just discovered by PM review. Needs your review and approval.',
  },
  approved: {
    title: 'Approved',
    content: 'Ready to be implemented. Will be picked up in next execution.',
  },
  in_progress: {
    title: 'In Progress',
    content: 'Currently being worked on by Mason.',
  },
  completed: {
    title: 'Completed',
    content: 'Done! Implementation merged. Check the PR for details.',
  },
  deferred: {
    title: 'Deferred',
    content: 'Saved for later consideration. Can be re-approved anytime.',
  },
  rejected: {
    title: 'Rejected',
    content: 'Not implementing. Available for future reconsideration.',
  },
} as const;

export const EXECUTION_TOOLTIPS = {
  phase: {
    site_review: {
      title: 'Site Review',
      content: 'Analyzing the codebase and PRD to plan implementation.',
    },
    foundation: {
      title: 'Foundation',
      content: 'Exploring existing patterns and setting up the implementation.',
    },
    building: {
      title: 'Building',
      content: 'Active implementation phase. Writing code and making changes.',
    },
    inspection: {
      title: 'Inspection',
      content:
        'Running validation checks: TypeScript, ESLint, build, and tests.',
    },
    complete: {
      title: 'Complete',
      content: 'All validations passed. Changes committed and ready.',
    },
    failed: {
      title: 'Failed',
      content:
        'Execution failed after multiple fix attempts. Manual review needed.',
    },
  },
  validation: {
    typescript: {
      title: 'TypeScript',
      content: 'Type checking to ensure type safety.',
    },
    eslint: {
      title: 'ESLint',
      content: 'Code linting for style and best practices.',
    },
    build: {
      title: 'Build',
      content: 'Production build to catch compilation errors.',
    },
    tests: {
      title: 'Tests',
      content: 'Unit and integration tests to verify behavior.',
    },
  },
} as const;

export const PM_REVIEW_TOOLTIPS = {
  pmReview: {
    title: 'PM Review',
    content:
      'Automated code analysis that discovers improvements, generates PRDs, and prioritizes work.',
  },
  prd: {
    title: 'PRD',
    content:
      'Product Requirements Document. Auto-generated spec for implementing the improvement.',
  },
  evidence: {
    title: 'Evidence',
    content:
      'Code analysis results showing why this improvement was suggested.',
  },
  wave: {
    title: 'Wave',
    content:
      'Execution phase. Work is grouped into waves that can run in parallel.',
  },
} as const;
