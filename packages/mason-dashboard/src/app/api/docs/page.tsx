'use client';

/**
 * API Documentation Page
 *
 * Renders a simple API documentation viewer.
 * Uses the OpenAPI spec and displays endpoints in a clean UI.
 * Available at /api/docs
 */

import { useEffect, useState } from 'react';
import { FileCode, Lock, ExternalLink, Copy, Check } from 'lucide-react';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<
    string,
    Record<
      string,
      {
        tags?: string[];
        summary: string;
        description?: string;
        security?: Array<Record<string, unknown[]>>;
        parameters?: Array<{
          name: string;
          in: string;
          required?: boolean;
          schema?: { type: string };
          description?: string;
        }>;
        requestBody?: {
          required?: boolean;
          content: Record<
            string,
            {
              schema: unknown;
            }
          >;
        };
        responses: Record<
          string,
          {
            description: string;
            content?: Record<
              string,
              {
                schema: unknown;
              }
            >;
          }
        >;
      }
    >
  >;
  components?: {
    securitySchemes?: Record<string, unknown>;
  };
}

const methodColors: Record<string, string> = {
  get: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  post: 'bg-green-500/20 text-green-400 border-green-500/50',
  put: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  delete: 'bg-red-500/20 text-red-400 border-red-500/50',
  patch: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
};

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSpec() {
      try {
        const response = await fetch('/api/docs/openapi.json');
        if (!response.ok) {
          throw new Error('Failed to load API specification');
        }
        const data = await response.json();
        setSpec(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchSpec();
  }, []);

  const togglePath = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string, endpoint: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-gold" />
          <p className="text-gray-400">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">Failed to load API documentation</p>
          <p className="mt-2 text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Group paths by tag
  const pathsByTag: Record<
    string,
    Array<{
      path: string;
      method: string;
      details: (typeof spec.paths)[string][string];
    }>
  > = {};

  Object.entries(spec.paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, details]) => {
      const tag = details.tags?.[0] || 'Other';
      if (!pathsByTag[tag]) {
        pathsByTag[tag] = [];
      }
      pathsByTag[tag].push({ path, method, details });
    });
  });

  return (
    <div className="min-h-screen bg-navy text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3 mb-4">
            <FileCode className="h-8 w-8 text-gold" />
            <h1 className="text-3xl font-bold">{spec.info.title}</h1>
            <span className="rounded-full bg-gold/20 px-3 py-1 text-sm font-medium text-gold">
              v{spec.info.version}
            </span>
          </div>

          {/* Markdown-like description rendering */}
          <div className="prose prose-invert max-w-none">
            {spec.info.description.split('\n\n').map((para, i) => {
              if (para.startsWith('# ')) {
                return null; // Skip the main title
              }
              if (para.startsWith('## ')) {
                return (
                  <h2 key={i} className="mt-6 text-xl font-semibold text-white">
                    {para.replace('## ', '')}
                  </h2>
                );
              }
              if (para.startsWith('### ')) {
                return (
                  <h3
                    key={i}
                    className="mt-4 text-lg font-medium text-gray-200"
                  >
                    {para.replace('### ', '')}
                  </h3>
                );
              }
              if (para.startsWith('```')) {
                const code = para
                  .replace(/```\w*\n?/g, '')
                  .replace(/```$/g, '');
                return (
                  <pre
                    key={i}
                    className="my-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm"
                  >
                    <code>{code}</code>
                  </pre>
                );
              }
              if (para.startsWith('- ')) {
                const items = para.split('\n');
                return (
                  <ul key={i} className="my-2 list-disc pl-6 text-gray-300">
                    {items.map((item, j) => (
                      <li key={j}>{item.replace('- ', '')}</li>
                    ))}
                  </ul>
                );
              }
              if (para.includes('`')) {
                // Render inline code
                const parts = para.split(/(`[^`]+`)/g);
                return (
                  <p key={i} className="my-2 text-gray-300">
                    {parts.map((part, j) =>
                      part.startsWith('`') && part.endsWith('`') ? (
                        <code
                          key={j}
                          className="rounded bg-gray-800 px-1.5 py-0.5 text-sm text-gold"
                        >
                          {part.slice(1, -1)}
                        </code>
                      ) : (
                        part
                      ),
                    )}
                  </p>
                );
              }
              return (
                <p key={i} className="my-2 text-gray-300">
                  {para}
                </p>
              );
            })}
          </div>

          {/* Server URLs */}
          <div className="mt-6">
            <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400">
              Base URLs
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {spec.servers.map((server, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2"
                >
                  <code className="text-sm text-gold">{server.url}</code>
                  <span className="ml-2 text-xs text-gray-500">
                    ({server.description})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Endpoints */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {Object.entries(pathsByTag).map(([tag, endpoints]) => (
          <section key={tag} className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-white">{tag}</h2>

            <div className="space-y-3">
              {endpoints.map(({ path, method, details }) => {
                const key = `${method}-${path}`;
                const isExpanded = expandedPaths.has(key);
                const requiresAuth =
                  details.security && details.security.length > 0;

                return (
                  <div
                    key={key}
                    className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900/50"
                  >
                    {/* Endpoint Header */}
                    <button
                      onClick={() => togglePath(key)}
                      className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-800/50 transition-colors"
                    >
                      <span
                        className={`rounded px-2.5 py-1 text-xs font-bold uppercase border ${methodColors[method] || 'bg-gray-500/20 text-gray-400'}`}
                      >
                        {method}
                      </span>
                      <code className="text-sm font-medium text-white">
                        {path}
                      </code>
                      {requiresAuth && (
                        <Lock
                          className="h-4 w-4 text-gold"
                          title="Requires authentication"
                        />
                      )}
                      <span className="ml-auto text-sm text-gray-400">
                        {details.summary}
                      </span>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-800 p-4">
                        {/* Description */}
                        {details.description && (
                          <p className="mb-4 text-gray-300">
                            {details.description}
                          </p>
                        )}

                        {/* Copy cURL button */}
                        <div className="mb-4">
                          <button
                            onClick={() =>
                              copyToClipboard(
                                `curl -X ${method.toUpperCase()} "${spec.servers[0]?.url || 'http://localhost:3000'}${path}" ${requiresAuth ? '-H "Authorization: Bearer YOUR_API_KEY"' : ''} -H "Content-Type: application/json"`,
                                key,
                              )
                            }
                            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                          >
                            {copiedEndpoint === key ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-green-400" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Copy cURL
                              </>
                            )}
                          </button>
                        </div>

                        {/* Parameters */}
                        {details.parameters &&
                          details.parameters.length > 0 && (
                            <div className="mb-4">
                              <h4 className="mb-2 text-sm font-medium text-gray-400">
                                Parameters
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-800 text-left text-gray-500">
                                      <th className="py-2 pr-4">Name</th>
                                      <th className="py-2 pr-4">In</th>
                                      <th className="py-2 pr-4">Required</th>
                                      <th className="py-2">Description</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {details.parameters.map((param, i) => (
                                      <tr
                                        key={i}
                                        className="border-b border-gray-800/50"
                                      >
                                        <td className="py-2 pr-4">
                                          <code className="text-gold">
                                            {param.name}
                                          </code>
                                        </td>
                                        <td className="py-2 pr-4 text-gray-400">
                                          {param.in}
                                        </td>
                                        <td className="py-2 pr-4">
                                          {param.required ? (
                                            <span className="text-red-400">
                                              Yes
                                            </span>
                                          ) : (
                                            <span className="text-gray-500">
                                              No
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 text-gray-400">
                                          {param.description || '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                        {/* Request Body */}
                        {details.requestBody && (
                          <div className="mb-4">
                            <h4 className="mb-2 text-sm font-medium text-gray-400">
                              Request Body
                              {details.requestBody.required && (
                                <span className="ml-2 text-red-400">
                                  (required)
                                </span>
                              )}
                            </h4>
                            <pre className="overflow-x-auto rounded-lg bg-gray-800 p-4 text-xs">
                              <code className="text-gray-300">
                                {JSON.stringify(
                                  Object.values(details.requestBody.content)[0]
                                    ?.schema || {},
                                  null,
                                  2,
                                )}
                              </code>
                            </pre>
                          </div>
                        )}

                        {/* Responses */}
                        <div>
                          <h4 className="mb-2 text-sm font-medium text-gray-400">
                            Responses
                          </h4>
                          <div className="space-y-2">
                            {Object.entries(details.responses).map(
                              ([code, response]) => (
                                <div
                                  key={code}
                                  className="rounded-lg border border-gray-800 bg-gray-800/50 p-3"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <span
                                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                                        code.startsWith('2')
                                          ? 'bg-green-500/20 text-green-400'
                                          : code.startsWith('4')
                                            ? 'bg-orange-500/20 text-orange-400'
                                            : 'bg-red-500/20 text-red-400'
                                      }`}
                                    >
                                      {code}
                                    </span>
                                    <span className="text-sm text-gray-300">
                                      {response.description}
                                    </span>
                                  </div>
                                  {response.content && (
                                    <pre className="overflow-x-auto rounded bg-gray-900 p-2 text-xs">
                                      <code className="text-gray-400">
                                        {JSON.stringify(
                                          Object.values(response.content)[0]
                                            ?.schema || {},
                                          null,
                                          2,
                                        )}
                                      </code>
                                    </pre>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* OpenAPI JSON Link */}
        <div className="mt-12 flex items-center justify-center gap-4 border-t border-gray-800 pt-8">
          <a
            href="/api/docs/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2 text-sm text-gold hover:bg-gold/20 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View OpenAPI JSON Spec
          </a>
        </div>
      </main>
    </div>
  );
}
