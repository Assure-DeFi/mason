'use client';

import { Play, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface RemoteExecuteButtonProps {
  itemIds: string[];
  repositoryId: string | null;
  disabled?: boolean;
  onExecutionStart?: (runId: string) => void;
  onError?: (error: string) => void;
}

export function RemoteExecuteButton({
  itemIds,
  repositoryId,
  disabled,
  onExecutionStart,
  onError,
}: RemoteExecuteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExecute = async () => {
    if (!repositoryId) {
      onError?.('Please select a repository first');
      return;
    }

    if (itemIds.length === 0) {
      onError?.('No items to execute');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/execution/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId,
          itemIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to start execution');
      }

      onExecutionStart?.(data.runId);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = disabled || isLoading || itemIds.length === 0 || !repositoryId;

  return (
    <button
      onClick={handleExecute}
      disabled={isDisabled}
      className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      <span>{isLoading ? 'Starting...' : `Execute (${itemIds.length})`}</span>
    </button>
  );
}
