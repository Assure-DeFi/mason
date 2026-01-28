'use client';

import Image from 'next/image';

interface PoweredByFooterProps {
  showCTA?: boolean;
  className?: string;
}

export function PoweredByFooter({
  showCTA = false,
  className = '',
}: PoweredByFooterProps) {
  return (
    <div
      className={`flex items-center justify-between py-6 text-sm text-gray-500 ${className}`}
    >
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
  );
}

export default PoweredByFooter;
