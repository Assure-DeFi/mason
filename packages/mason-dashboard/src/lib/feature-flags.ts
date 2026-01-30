/**
 * Feature Flags for Mason Dashboard
 *
 * Used to gate beta features to specific users before general release.
 */

/**
 * Feature flags configuration
 */
export const FEATURE_FLAGS = {
  /**
   * Users who have access to the Autopilot beta feature.
   * Add email addresses here to grant access.
   */
  AUTOPILOT_BETA_USERS: ['chapo@assuredefi.com'],
} as const;

/**
 * Check if a user has access to the Autopilot feature.
 *
 * @param userEmail - The user's email address (from session)
 * @returns true if the user is in the beta list, false otherwise
 */
export function canAccessAutopilot(
  userEmail: string | null | undefined,
): boolean {
  if (!userEmail) {
    return false;
  }
  return (FEATURE_FLAGS.AUTOPILOT_BETA_USERS as readonly string[]).includes(
    userEmail,
  );
}

/**
 * Type helper for feature flag names
 */
export type FeatureFlag = keyof typeof FEATURE_FLAGS;
