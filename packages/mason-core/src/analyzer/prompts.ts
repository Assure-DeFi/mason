/**
 * Base system prompt for domain analysis
 */
export const ANALYSIS_SYSTEM_PROMPT = `You are an expert software architect analyzing a codebase for potential improvements.
Your goal is to identify actionable, high-value improvements that would benefit the project.

Guidelines:
- Focus on practical, implementable improvements
- Consider both immediate and long-term value
- Be specific about what needs to change and why
- Avoid generic suggestions like "add more tests" without specifics
- Consider the existing patterns and conventions in the codebase
- Don't suggest changes that would require major architectural overhauls unless absolutely necessary

For each improvement, you must assess:
- Impact (1-10): How much value does this provide? (10 = critical fix, 1 = minor polish)
- Effort (1-10): How much work is required? (10 = weeks of work, 1 = quick fix)
- Complexity: low, medium, high, or very_high

Be conservative with high impact scores - reserve 8-10 for truly important issues.`;

/**
 * Get the analysis prompt for a specific domain
 */
export function getDomainPrompt(domain: string): string {
  switch (domain) {
    case 'frontend-ux':
      return `Analyze this code for Frontend UX improvements:

Focus areas:
- Loading states and skeleton screens
- Error handling and error boundaries
- Accessibility (a11y) issues
- Form validation and user feedback
- Responsive design issues
- Performance bottlenecks (large bundles, unnecessary renders)
- User experience friction points
- Missing confirmation dialogs for destructive actions
- Inconsistent UI patterns

Look for:
- Components without loading states
- Forms without validation
- Missing error boundaries
- Accessibility violations
- Poor mobile experience
- Slow initial load times`;

    case 'api-backend':
      return `Analyze this code for API and Backend improvements:

Focus areas:
- API design consistency
- Error handling and status codes
- Data validation on server side
- Query efficiency (N+1 queries, missing indexes)
- Caching opportunities
- Rate limiting and abuse prevention
- Authentication/authorization gaps
- Response formatting consistency

Look for:
- Endpoints without proper validation
- Inconsistent error responses
- Missing pagination for large lists
- Unoptimized database queries
- Missing caching for expensive operations`;

    case 'reliability':
      return `Analyze this code for Reliability improvements:

Focus areas:
- Error handling and recovery
- Retry logic for transient failures
- Logging and observability
- Graceful degradation
- Circuit breakers for external services
- Timeout handling
- Resource cleanup (memory leaks, connection pools)
- Background job error handling

Look for:
- Unhandled promise rejections
- Missing try/catch blocks
- External calls without timeouts
- Missing logging for errors
- No retry logic for flaky operations`;

    case 'security':
      return `Analyze this code for Security improvements:

Focus areas:
- Input validation and sanitization
- Authentication and authorization
- Secrets management
- SQL injection prevention
- XSS prevention
- CSRF protection
- Secure headers
- Rate limiting
- Session management

Look for:
- User input used without validation
- Missing authorization checks
- Hardcoded secrets or credentials
- Unsafe string interpolation in queries
- Missing security headers
- Overly permissive CORS`;

    case 'code-quality':
      return `Analyze this code for Code Quality improvements:

Focus areas:
- Type safety and type coverage
- Code organization and modularity
- Dead code and unused imports
- Naming conventions and clarity
- Code duplication
- Test coverage gaps
- Documentation for complex logic
- Consistent error handling patterns

Look for:
- Use of 'any' types
- Large monolithic functions
- Duplicated logic
- Unclear variable names
- Missing tests for critical paths
- Outdated comments`;

    default:
      return `Analyze this code for improvements in the ${domain} domain.`;
  }
}

/**
 * Format for improvement extraction
 */
export const IMPROVEMENT_FORMAT = `Return improvements as a JSON array with this structure:
{
  "improvements": [
    {
      "title": "Short, descriptive title (under 60 chars)",
      "problem": "Clear description of the issue or gap",
      "solution": "Specific solution or approach to implement",
      "impactScore": 1-10,
      "effortScore": 1-10,
      "complexity": "low" | "medium" | "high" | "very_high",
      "affectedFiles": ["path/to/file1.ts", "path/to/file2.ts"],
      "reasoning": "Brief explanation of why this matters"
    }
  ]
}

Important:
- Return valid JSON only, no markdown code blocks
- Keep title concise and action-oriented
- Be specific in problem and solution descriptions
- List specific affected files when possible
- Only include improvements you're confident about`;
