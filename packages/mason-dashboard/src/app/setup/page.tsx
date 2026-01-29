'use client';

import { Suspense } from 'react';
import { SetupWizard } from '@/components/setup/SetupWizard';
import { MasonLoader } from '@/components/brand';

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy">
      <MasonLoader size="lg" label="Loading setup..." variant="glow" />
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SetupWizard />
    </Suspense>
  );
}
