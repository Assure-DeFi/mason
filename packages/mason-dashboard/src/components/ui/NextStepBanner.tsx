'use client';

import { clsx } from 'clsx';
import { ArrowRight, X, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

interface NextStepBannerProps {
  context:
    | 'post-setup'
    | 'empty-backlog'
    | 'has-new-items'
    | 'has-approved'
    | 'all-complete';
  onDismiss?: () => void;
  className?: string;
}

const BANNER_CONFIG = {
  'post-setup': {
    title: 'All set!',
    message: 'Paste the install command into your terminal to get started.',
    cta: null,
    dismissible: true,
    storageKey: 'mason_dismissed_post_setup',
  },
  'empty-backlog': {
    title: 'The workshop is quiet...',
    message: 'Run /pm-review and let Mason scout for ideas.',
    cta: '/pm-review',
    dismissible: false,
    storageKey: null,
  },
  'has-new-items': {
    title: 'Mason found some gems!',
    message: 'Take a look and approve the ones you want to build.',
    cta: null,
    dismissible: true,
    storageKey: 'mason_dismissed_review_prompt',
  },
  'has-approved': {
    title: 'Ready to build!',
    message: 'Run /execute-approved and watch Mason work.',
    cta: '/execute-approved',
    dismissible: true,
    storageKey: 'mason_dismissed_execute_prompt',
  },
  'all-complete': {
    title: 'Nice work, everything shipped!',
    message: 'Run /pm-review again to find the next batch.',
    cta: '/pm-review',
    dismissible: true,
    storageKey: 'mason_dismissed_complete_prompt',
  },
};

export function NextStepBanner({
  context,
  onDismiss,
  className,
}: NextStepBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const config = BANNER_CONFIG[context];

  useEffect(() => {
    if (config.storageKey) {
      const dismissed = localStorage.getItem(config.storageKey);
      setIsVisible(!dismissed);
    } else {
      setIsVisible(true);
    }
  }, [config.storageKey]);

  const handleDismiss = () => {
    if (config.storageKey) {
      localStorage.setItem(config.storageKey, 'true');
    }
    setIsVisible(false);
    onDismiss?.();
  };

  const handleCopy = async () => {
    if (!config.cta) {
      return;
    }
    try {
      await navigator.clipboard.writeText(config.cta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-4 px-4 py-3 bg-gold/10 border-b border-gold/20',
        className,
      )}
    >
      <Sparkles className="w-5 h-5 text-gold flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-gold mr-2">{config.title}</span>
        <span className="text-gray-300 text-sm">{config.message}</span>
      </div>

      {config.cta && (
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 bg-gold text-navy text-sm font-medium rounded hover:opacity-90 transition-opacity flex-shrink-0"
        >
          {copied ? (
            'Copied!'
          ) : (
            <>
              <code>{config.cta}</code>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}

      {config.dismissible && (
        <button
          onClick={handleDismiss}
          className="p-1 text-gray-400 hover:text-white transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default NextStepBanner;
