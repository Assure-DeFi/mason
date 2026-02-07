'use client';

import { SettingsSidebar } from '@/components/settings/SettingsSidebar';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-navy">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="lg:flex lg:gap-8">
          <SettingsSidebar />
          <main className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
