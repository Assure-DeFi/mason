/**
 * Query parameter validation utilities for API routes
 * Provides type-safe validation without external dependencies
 */

export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

/**
 * Schema field types
 */
type FieldSchema =
  | {
      type: 'string';
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
    }
  | {
      type: 'number';
      required?: boolean;
      min?: number;
      max?: number;
      integer?: boolean;
    }
  | { type: 'boolean'; required?: boolean }
  | { type: 'enum'; required?: boolean; values: readonly string[] }
  | { type: 'uuid'; required?: boolean };

type Schema = Record<string, FieldSchema>;

/**
 * Infer TypeScript type from schema
 */
type InferSchemaType<S extends Schema> = {
  [K in keyof S]: S[K] extends { required: true }
    ? InferFieldType<S[K]>
    : InferFieldType<S[K]> | undefined;
};

type InferFieldType<F extends FieldSchema> = F extends { type: 'string' }
  ? string
  : F extends { type: 'number' }
    ? number
    : F extends { type: 'boolean' }
      ? boolean
      : F extends { type: 'enum'; values: readonly (infer V)[] }
        ? V
        : F extends { type: 'uuid' }
          ? string
          : never;

// UUID v4 regex pattern
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate query parameters against a schema
 */
export function validateQueryParams<S extends Schema>(
  searchParams: URLSearchParams,
  schema: S,
): ValidationResult<InferSchemaType<S>> {
  const errors: ValidationError[] = [];
  const result: Record<string, unknown> = {};

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const rawValue = searchParams.get(field);

    // Handle required fields
    if (fieldSchema.required && (rawValue === null || rawValue === '')) {
      errors.push({ field, message: `${field} is required` });
      continue;
    }

    // Skip optional fields that are not provided
    if (rawValue === null || rawValue === '') {
      result[field] = undefined;
      continue;
    }

    // Validate based on type
    switch (fieldSchema.type) {
      case 'string': {
        if (fieldSchema.minLength && rawValue.length < fieldSchema.minLength) {
          errors.push({
            field,
            message: `${field} must be at least ${fieldSchema.minLength} characters`,
          });
        } else if (
          fieldSchema.maxLength &&
          rawValue.length > fieldSchema.maxLength
        ) {
          errors.push({
            field,
            message: `${field} must be at most ${fieldSchema.maxLength} characters`,
          });
        } else if (fieldSchema.pattern && !fieldSchema.pattern.test(rawValue)) {
          errors.push({ field, message: `${field} has invalid format` });
        } else {
          result[field] = rawValue;
        }
        break;
      }

      case 'number': {
        const num = parseFloat(rawValue);
        if (isNaN(num)) {
          errors.push({ field, message: `${field} must be a number` });
        } else if (fieldSchema.integer && !Number.isInteger(num)) {
          errors.push({ field, message: `${field} must be an integer` });
        } else if (fieldSchema.min !== undefined && num < fieldSchema.min) {
          errors.push({
            field,
            message: `${field} must be at least ${fieldSchema.min}`,
          });
        } else if (fieldSchema.max !== undefined && num > fieldSchema.max) {
          errors.push({
            field,
            message: `${field} must be at most ${fieldSchema.max}`,
          });
        } else {
          result[field] = num;
        }
        break;
      }

      case 'boolean': {
        const lower = rawValue.toLowerCase();
        if (lower === 'true' || lower === '1') {
          result[field] = true;
        } else if (lower === 'false' || lower === '0') {
          result[field] = false;
        } else {
          errors.push({ field, message: `${field} must be true or false` });
        }
        break;
      }

      case 'enum': {
        if (fieldSchema.values.includes(rawValue)) {
          result[field] = rawValue;
        } else {
          errors.push({
            field,
            message: `${field} must be one of: ${fieldSchema.values.join(', ')}`,
          });
        }
        break;
      }

      case 'uuid': {
        if (UUID_PATTERN.test(rawValue)) {
          result[field] = rawValue;
        } else {
          errors.push({ field, message: `${field} must be a valid UUID` });
        }
        break;
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: result as InferSchemaType<S> };
}

/**
 * Format validation errors for API response
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e) => e.message).join('; ');
}

/**
 * Common schema definitions for reuse
 */
export const CommonSchemas = {
  /** UUID field */
  uuid: (required = false) => ({ type: 'uuid', required }) as const,

  /** Pagination limit */
  limit: (defaultMax = 100) =>
    ({ type: 'number', integer: true, min: 1, max: defaultMax }) as const,

  /** Pagination offset */
  offset: () => ({ type: 'number', integer: true, min: 0 }) as const,

  /** Provider enum (anthropic/openai) */
  aiProvider: (required = false) =>
    ({
      type: 'enum',
      required,
      values: ['anthropic', 'openai'] as const,
    }) as const,

  /** Status enum */
  status: (required = false) =>
    ({
      type: 'enum',
      required,
      values: [
        'new',
        'approved',
        'in_progress',
        'completed',
        'deferred',
        'rejected',
      ] as const,
    }) as const,
} as const;
