'use client';

import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import type { RemoteExecutionStatus } from '@/types/auth';

interface ExecutionLog {
  id: string;
  created_at: string;
  log_level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata: Record<string, unknown>;
}

interface ExecutionProgressProps {
  runId: string;
  onClose: () => void;
}

export function ExecutionProgress({ runId, onClose }: ExecutionProgressProps) {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [status, setStatus] = useState<RemoteExecutionStatus>('in_progress');
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE endpoint for logs
    const eventSource = new EventSource(`/api/execution/${runId}/logs`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'complete') {
          setStatus(data.status);
          setPrUrl(data.pr_url);
          eventSource.close();
        } else {
          setLogs((prev) => [...prev, data]);
        }
      } catch (e) {
        console.error('Failed to parse log:', e);
      }
    };

    eventSource.onerror = () => {
      setError('Connection lost. Please refresh.');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId]);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogLevelStyles = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'debug':
        return 'text-gray-500';
      default:
        return 'text-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-400" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-400" />;
      default:
        return <Loader2 className="h-6 w-6 animate-spin text-gold" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'success':
        return 'Execution Complete';
      case 'failed':
        return 'Execution Failed';
      case 'cancelled':
        return 'Execution Cancelled';
      default:
        return 'Executing...';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-navy shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h2 className="text-lg font-semibold text-white">
                {getStatusText()}
              </h2>
              {prUrl && (
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-gold hover:underline"
                >
                  View Pull Request
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto bg-black p-4 font-mono text-sm">
          {error && (
            <div className="mb-4 rounded bg-red-900/20 p-3 text-red-400">
              {error}
            </div>
          )}

          {logs.length === 0 && !error && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for logs...
            </div>
          )}

          {logs.map((log) => (
            <div key={log.id} className="mb-1">
              <span className="text-gray-600">
                {new Date(log.created_at).toLocaleTimeString()}
              </span>{' '}
              <span className={getLogLevelStyles(log.log_level)}>
                [{log.log_level.toUpperCase()}]
              </span>{' '}
              <span className="text-gray-300">{log.message}</span>
            </div>
          ))}

          <div ref={logsEndRef} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-800 p-4">
          {status === 'in_progress' ? (
            <span className="text-sm text-gray-400">
              Execution in progress...
            </span>
          ) : (
            <button
              onClick={onClose}
              className="rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
