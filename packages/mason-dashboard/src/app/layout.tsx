import type { Metadata } from 'next';
import { SessionProvider } from '@/components/auth/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mason - AI-Powered Codebase Improvement',
  description:
    'Continuous improvement for your codebase. 100% private. Built by Assure DeFi®.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Mason by Assure DeFi®',
    description: 'AI-powered continuous improvement for your codebase.',
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
