import type { Metadata, Viewport } from 'next';

import { SessionProvider } from '@/components/auth/session-provider';
import { NetworkStatusProvider } from '@/components/ui/NetworkStatusProvider';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0A0724',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover', // Required for safe area insets on notched iPhones
};

export const metadata: Metadata = {
  title: 'Mason - Rock Solid by Design',
  description:
    'Rock Solid by Design. AI-powered continuous improvement for your codebase. 100% private.',
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
    title: 'Mason - Rock Solid by Design',
    description:
      'Rock Solid by Design. AI-powered continuous improvement for your codebase.',
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
        <SessionProvider>
          <NetworkStatusProvider>{children}</NetworkStatusProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
