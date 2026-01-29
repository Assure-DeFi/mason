import type { Metadata, Viewport } from 'next';

import { SessionProvider } from '@/components/auth/session-provider';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0A0724',
};

export const metadata: Metadata = {
  title: 'Mason - AI-Powered Codebase Improvement',
  description:
    'Continuous improvement for your codebase. 100% private. Built by Assure DeFi®.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Mason by Assure DeFi®',
    description: 'AI-powered continuous improvement for your codebase.',
    siteName: 'Mason',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-navy text-white">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
