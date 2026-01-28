'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface ExecuteButtonProps {
  itemIds: string[];
}

export function ExecuteButton({ itemIds }: ExecuteButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const command = `/execute-approved --ids ${itemIds.join(',')}`;

    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (itemIds.length === 0) {
    return null;
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-4 py-2 bg-gold text-navy font-medium text-sm hover:bg-gold/90 transition-colors"
    >
      {copied ? (
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
