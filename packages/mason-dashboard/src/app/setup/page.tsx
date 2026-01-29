'use client';

import { Suspense } from 'react';

import { MasonLoader } from '@/components/brand';
import { SetupWizard } from '@/components/setup/SetupWizard';

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
