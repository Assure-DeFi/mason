/**
 * OpenAPI Registry Configuration
 *
 * Extends existing Zod schemas with OpenAPI metadata for documentation generation.
 * Uses @asteasolutions/zod-to-openapi to bridge Zod validation with OpenAPI 3.1 spec.
 */

import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with OpenAPI functionality
extendZodWithOpenApi(z);

// Create a new registry for collecting OpenAPI definitions
export const registry = new OpenAPIRegistry();

// ============================================================================
// Common Schema Definitions
// ============================================================================

// Standard API response wrapper
const ApiResponseSchema = z
  .object({
    success: z.boolean().openapi({
      description: 'Whether the request was successful',
      example: true,
    }),
    data: z.unknown().optional().openapi({
      description: 'Response data (present on success)',
    }),
    error: z
      .object({
        code: z.string().openapi({
          description: 'Error code for programmatic handling',
          example: 'NOT_FOUND',
        }),
        message: z.string().openapi({
          description: 'Human-readable error message',
          example: 'Resource not found',
        }),
        details: z.unknown().optional().openapi({
          description: 'Additional error details',
        }),
      })
      .optional()
      .openapi({
        description: 'Error information (present on failure)',
      }),
  })
  .openapi('ApiResponse');

// Register common schemas
registry.register('ApiResponse', ApiResponseSchema);

// Bearer auth security scheme
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'API Key',
  description:
    'Mason API key authentication. Format: Bearer mason_xxxx (get your key from Mason dashboard Settings)',
});

// Session auth security scheme
registry.registerComponent('securitySchemes', 'sessionAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'next-auth.session-token',
  description:
    'Session-based authentication via NextAuth. Used by dashboard endpoints.',
});

// ============================================================================
// V1 API Endpoints (Bearer Token Auth)
// ============================================================================

// POST /api/v1/analysis - Validate API key and return user info
registry.registerPath({
  method: 'post',
  path: '/api/v1/analysis',
  tags: ['V1 API'],
  summary: 'Validate API key',
  description:
    'Validates the provided API key and returns user information. Used by CLI tools to authenticate.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: false,
      content: {
        'application/json': {
          schema: z.object({}).optional(),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'API key is valid',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              user_id: z.string().uuid(),
              repository_id: z.string().uuid().nullable(),
              github_username: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Invalid or missing API key',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

// GET /api/v1/backlog/next - Get highest-priority approved items
registry.registerPath({
  method: 'get',
  path: '/api/v1/backlog/next',
  tags: ['V1 API'],
  summary: 'Get next approved backlog items',
  description:
    'Returns the highest-priority approved items from the backlog, ready for execution.',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      limit: z.string().optional().openapi({
        description: 'Maximum number of items to return',
        example: '5',
      }),
      repository_id: z.string().uuid().optional().openapi({
        description: 'Filter by repository ID',
      }),
    }),
  },
  responses: {
    200: {
      description: 'List of approved backlog items',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              items: z.array(
                z.object({
                  id: z.string().uuid(),
                  title: z.string(),
                  problem: z.string(),
                  solution: z.string(),
                  priority_score: z.number(),
                  prd_content: z.string().nullable(),
                  type: z.string(),
                  status: z.literal('approved'),
                }),
              ),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Invalid or missing API key',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

// POST /api/v1/backlog/{id}/start - Mark item as in_progress
registry.registerPath({
  method: 'post',
  path: '/api/v1/backlog/{id}/start',
  tags: ['V1 API'],
  summary: 'Start executing a backlog item',
  description:
    'Marks a backlog item as in_progress. Called when execution begins.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: 'Backlog item ID',
      }),
    }),
    body: {
      required: false,
      content: {
        'application/json': {
          schema: z.object({
            branch_name: z.string().optional().openapi({
              description: 'Git branch name for this execution',
              example: 'mason/add-user-avatar',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Item marked as in_progress',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              status: z.literal('in_progress'),
            }),
          }),
        },
      },
    },
    404: {
      description: 'Item not found',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

// POST /api/v1/backlog/{id}/complete - Mark item as completed
registry.registerPath({
  method: 'post',
  path: '/api/v1/backlog/{id}/complete',
  tags: ['V1 API'],
  summary: 'Complete a backlog item',
  description:
    'Marks a backlog item as completed. Called when execution finishes successfully.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: 'Backlog item ID',
      }),
    }),
    body: {
      required: false,
      content: {
        'application/json': {
          schema: z.object({
            pr_url: z.string().url().optional().openapi({
              description: 'Pull request URL',
              example: 'https://github.com/org/repo/pull/123',
            }),
            branch_name: z.string().optional().openapi({
              description: 'Git branch name',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Item marked as completed',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              status: z.literal('completed'),
            }),
          }),
        },
      },
    },
  },
});

// POST /api/v1/backlog/{id}/fail - Mark item as failed
registry.registerPath({
  method: 'post',
  path: '/api/v1/backlog/{id}/fail',
  tags: ['V1 API'],
  summary: 'Mark a backlog item as failed',
  description: 'Marks a backlog item as failed. Called when execution fails.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: 'Backlog item ID',
      }),
    }),
    body: {
      required: false,
      content: {
        'application/json': {
          schema: z.object({
            failure_reason: z.string().optional().openapi({
              description: 'Reason for failure',
              example: 'Build failed after 5 fix iterations',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Item marked as failed',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              status: z.literal('rejected'),
            }),
          }),
        },
      },
    },
  },
});

// ============================================================================
// Dashboard API Endpoints (Session Auth)
// ============================================================================

// GET /api/health - Health check
registry.registerPath({
  method: 'get',
  path: '/api/health',
  tags: ['System'],
  summary: 'Health check',
  description: 'Returns service health status. No authentication required.',
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              status: z.literal('healthy'),
              timestamp: z.string().datetime(),
            }),
          }),
        },
      },
    },
  },
});

// GET /api/keys - List API keys
registry.registerPath({
  method: 'get',
  path: '/api/keys',
  tags: ['API Keys'],
  summary: 'List API keys',
  description: "Returns all API keys for the authenticated user's account.",
  security: [{ sessionAuth: [] }],
  responses: {
    200: {
      description: 'List of API keys',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              keys: z.array(
                z.object({
                  id: z.string().uuid(),
                  name: z.string(),
                  key_preview: z.string().openapi({
                    description: 'Masked API key (last 4 characters visible)',
                    example: 'mason_****xxxx',
                  }),
                  created_at: z.string().datetime(),
                  last_used_at: z.string().datetime().nullable(),
                }),
              ),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

// POST /api/keys - Create API key
registry.registerPath({
  method: 'post',
  path: '/api/keys',
  tags: ['API Keys'],
  summary: 'Create API key',
  description:
    'Creates a new API key for CLI authentication. The full key is only shown once.',
  security: [{ sessionAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().max(100).optional().default('Default').openapi({
              description: 'Friendly name for the API key',
              example: 'My CLI Key',
            }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'API key created',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              name: z.string(),
              key: z.string().openapi({
                description:
                  'The full API key. This is only shown once - store it securely!',
                example: 'mason_R_abcd1234efgh5678',
              }),
            }),
          }),
        },
      },
    },
  },
});

// DELETE /api/keys/{id} - Delete API key
registry.registerPath({
  method: 'delete',
  path: '/api/keys/{id}',
  tags: ['API Keys'],
  summary: 'Delete API key',
  description: 'Revokes an API key. The key will immediately stop working.',
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: 'API key ID to delete',
      }),
    }),
  },
  responses: {
    200: {
      description: 'API key deleted',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              deleted: z.literal(true),
            }),
          }),
        },
      },
    },
    404: {
      description: 'API key not found',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// OpenAPI Document Generator
// ============================================================================

export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Mason API',
      version: '1.0.0',
      description: `
# Mason API Documentation

Mason is an AI-powered PM system that reviews codebases and executes improvements.

## Authentication

### V1 API (CLI Tools)
Use Bearer token authentication with your Mason API key:
\`\`\`
Authorization: Bearer mason_xxxx
\`\`\`

Get your API key from the Mason dashboard Settings page.

### Dashboard API
Dashboard endpoints use session-based authentication via NextAuth cookies.
These endpoints are intended for the web dashboard, not external CLI tools.

## Rate Limiting

All endpoints are rate limited:
- V1 API: 100 requests per minute per user
- Dashboard API: 60 requests per minute per user

Rate limit headers are included in responses:
- \`X-RateLimit-Limit\`: Maximum requests per window
- \`X-RateLimit-Remaining\`: Requests remaining in window
- \`X-RateLimit-Reset\`: Unix timestamp when window resets

## Response Format

All responses follow a standard format:
\`\`\`json
{
  "success": true,
  "data": { ... }
}
\`\`\`

Error responses:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
\`\`\`
      `.trim(),
      contact: {
        name: 'Mason Support',
        url: 'https://github.com/Assure-DeFi/mason',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development',
      },
      {
        url: 'https://mason.yourdomain.com',
        description: 'Production',
      },
    ],
    tags: [
      {
        name: 'V1 API',
        description: 'CLI and external tool endpoints (Bearer token auth)',
      },
      {
        name: 'API Keys',
        description: 'API key management endpoints',
      },
      {
        name: 'System',
        description: 'System health and status endpoints',
      },
    ],
  });
}
