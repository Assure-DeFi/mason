'use client';

import { Suspense } from 'react';
import { SetupWizard } from '@/components/setup/SetupWizard';

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
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
