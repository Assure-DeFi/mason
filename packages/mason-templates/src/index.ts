// Templates placeholder - will be populated with domain prompts and stack adapters
export const VERSION = '0.1.0';

/**
 * Default domain definitions for analysis
 */
export const DOMAINS = [
  {
    id: 'frontend-ux',
    name: 'Frontend UX',
    description:
      'User interface, accessibility, loading states, error handling',
  },
  {
    id: 'api-backend',
    name: 'API & Backend',
    description: 'API design, data fetching, server-side logic, performance',
  },
  {
    id: 'reliability',
    name: 'Reliability',
    description: 'Error handling, logging, retry logic, monitoring',
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Authentication, authorization, input validation, secrets',
  },
  {
    id: 'code-quality',
    name: 'Code Quality',
    description: 'Type safety, code organization, testing, documentation',
  },
] as const;

export type DomainId = (typeof DOMAINS)[number]['id'];
