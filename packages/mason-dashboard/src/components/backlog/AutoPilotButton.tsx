'use client';

import { Rocket, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface AutoPilotButtonProps {
  approvedCount: number;
}

/**
 * Auto-Pilot button that copies the CLI command to execute approved items.
 * Provides a quick way for users to start auto-pilot from the dashboard.
 */
export function AutoPilotButton({ approvedCount }: AutoPilotButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = async () => {
    const command = '/mason auto-pilot';

    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setShowTooltip(true);
      setTimeout(() => {
        setCopied(false);
        setShowTooltip(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (approvedCount === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-gold to-yellow-500 text-navy font-semibold hover:shadow-lg hover:shadow-gold/30 transition-all group"
      >
        <Rocket className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
        <span>Auto-Pilot</span>
        <span className="text-navy/70 text-sm">({approvedCount})</span>
        {copied ? (
          <Check className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4 opacity-60" />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl whitespace-nowrap z-50 animate-fade-in">
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-white">
              Copied! Paste in Claude Code to execute
            </span>
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800 border-r border-b border-gray-700" />
        </div>
      )}
    </div>
  );
}

export default AutoPilotButton;
