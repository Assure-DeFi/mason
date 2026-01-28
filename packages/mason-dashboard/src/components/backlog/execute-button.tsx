'use client';

import { useState } from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';

interface ExecuteButtonProps {
  itemIds: string[];
}

export function ExecuteButton({ itemIds }: ExecuteButtonProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const handleCopy = async () => {
    const command = `/execute-approved --ids ${itemIds.join(',')}`;

    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  if (itemIds.length === 0) {
    return null;
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
        copyError
          ? 'bg-red-600 text-white'
          : 'bg-gold text-navy hover:bg-gold/90'
      }`}
      title={
        copyError
          ? 'Copy failed - try selecting and copying manually'
          : undefined
      }
    >
      {copyError ? (
        <>
          <AlertCircle className="w-4 h-4" />
          Copy failed
        </>
      ) : copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Execute All ({itemIds.length})
        </>
      )}
    </button>
  );
}
