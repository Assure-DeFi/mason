import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mason Dashboard',
  description: 'PM backlog management for continuous improvement',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-navy text-white">{children}</body>
    </html>
  );
}
