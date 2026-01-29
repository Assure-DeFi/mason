'use client';

import Image from 'next/image';

interface PoweredByFooterProps {
  showCTA?: boolean;
  showTagline?: boolean;
  className?: string;
}

export function PoweredByFooter({
  showCTA = false,
  showTagline = true,
  className = '',
}: PoweredByFooterProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      {showTagline && (
        <p className="mb-1 text-center text-xs text-gray-500">
          Rock Solid by Design
        </p>
      )}
      <div className="flex items-center justify-between py-2 text-sm text-gray-500">
        <div className="flex items-center gap-3">
          <Image
            src="/assure-defi-logo.svg"
            alt="Assure DeFi"
            width={24}
            height={24}
            className="opacity-70"
          />
          <span>
            Powered by{' '}
            <a
              href="https://assuredefi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              Assure DeFi®
            </a>
          </span>
        </div>

        {showCTA && (
          <a
            href="https://assuredefi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 transition-colors hover:text-gold"
          >
            Web3 Security Audits
          </a>
        )}
      </div>
    </div>
  );
}

export default PoweredByFooter;
