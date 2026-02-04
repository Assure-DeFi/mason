import { SettingsSidebar } from '@/components/settings/settings-sidebar';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <SettingsSidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
