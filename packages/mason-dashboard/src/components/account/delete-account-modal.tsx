'use client';

import { clsx } from 'clsx';
import {
  AlertTriangle,
  Check,
  Loader2,
  X,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';

import { STORAGE_KEYS, TABLES } from '@/lib/constants';
import { runDatabaseQuery } from '@/lib/supabase/management-api';
import {
  getOAuthSession,
  getAccessToken,
  getRefreshToken,
  updateTokens,
  clearOAuthSession,
  type SupabaseOAuthTokens,
} from '@/lib/supabase/oauth';
import { getMasonConfig } from '@/lib/supabase/user-client';

type ModalStep = 'warning' | 'confirm' | 'deleting' | 'error' | 'success';

interface DeletionProgress {
  supabaseData: 'pending' | 'in_progress' | 'completed' | 'error' | 'skipped';
  centralDb: 'pending' | 'in_progress' | 'completed' | 'error';
  localStorage: 'pending' | 'in_progress' | 'completed' | 'error';
}

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT';

// Tables to delete in correct order (respecting foreign key constraints)
const DELETE_ORDER = [
  TABLES.EXECUTION_LOGS,
  TABLES.REMOTE_EXECUTION_RUNS,
  TABLES.PM_EXECUTION_TASKS,
  TABLES.PM_EXECUTION_RUNS,
  TABLES.PM_FILTERED_ITEMS,
  TABLES.PM_BACKLOG_ITEMS,
  TABLES.PM_ANALYSIS_RUNS,
  TABLES.AI_PROVIDER_KEYS,
  TABLES.API_KEYS,
  TABLES.GITHUB_REPOSITORIES,
  TABLES.USERS,
];

export function DeleteAccountModal({
  isOpen,
  onClose,
}: DeleteAccountModalProps) {
  const [step, setStep] = useState<ModalStep>('warning');
  const [confirmationText, setConfirmationText] = useState('');
  const [progress, setProgress] = useState<DeletionProgress>({
    supabaseData: 'pending',
    centralDb: 'pending',
    localStorage: 'pending',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('warning');
      setConfirmationText('');
      setProgress({
        supabaseData: 'pending',
        centralDb: 'pending',
        localStorage: 'pending',
      });
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'deleting') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, onClose]);

  const clearAllLocalStorage = useCallback(() => {
    // Clear all Mason-related localStorage keys
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  }, []);

  const deleteUserSupabaseData = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
    skipped?: boolean;
  }> => {
    const oauthSession = getOAuthSession();
    const config = getMasonConfig();

    // Check if we have OAuth session to delete data
    if (!oauthSession?.selectedProjectRef) {
      // No OAuth session - skip Supabase deletion
      // User may have used manual password method or OAuth expired
      return { success: true, skipped: true };
    }

    // Get or refresh access token
    let accessToken = getAccessToken();
    if (!accessToken) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const response = await fetch('/api/auth/supabase/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (response.ok) {
            const newTokens = (await response.json()) as SupabaseOAuthTokens;
            updateTokens(newTokens);
            accessToken = newTokens.accessToken;
          } else {
            // OAuth session expired
            return { success: true, skipped: true };
          }
        } catch {
          return { success: true, skipped: true };
        }
      } else {
        return { success: true, skipped: true };
      }
    }

    // Verify project ref matches config
    if (config?.supabaseUrl) {
      const configRef = config.supabaseUrl.match(
        /https:\/\/([^.]+)\.supabase\.co/,
      )?.[1];
      if (configRef && configRef !== oauthSession.selectedProjectRef) {
        // Mismatch - skip to avoid deleting wrong database
        return { success: true, skipped: true };
      }
    }

    // Delete all Mason tables in order
    try {
      for (const table of DELETE_ORDER) {
        await runDatabaseQuery(
          accessToken,
          oauthSession.selectedProjectRef,
          `DELETE FROM ${table};`,
          false,
        );
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete data',
      };
    }
  }, []);

  const deleteCentralDbAccount = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: data.error || 'Failed to delete account',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }, []);

  const performDeletion = useCallback(async () => {
    setStep('deleting');
    setErrorMessage(null);

    // Step 1: Delete user's Supabase data
    setProgress((prev) => ({ ...prev, supabaseData: 'in_progress' }));
    const supabaseResult = await deleteUserSupabaseData();
    if (!supabaseResult.success) {
      setProgress((prev) => ({ ...prev, supabaseData: 'error' }));
      setErrorMessage(supabaseResult.error || 'Failed to delete Supabase data');
      setStep('error');
      return;
    }
    setProgress((prev) => ({
      ...prev,
      supabaseData: supabaseResult.skipped ? 'skipped' : 'completed',
    }));

    // Step 2: Delete from central DB
    setProgress((prev) => ({ ...prev, centralDb: 'in_progress' }));
    const centralResult = await deleteCentralDbAccount();
    if (!centralResult.success) {
      setProgress((prev) => ({ ...prev, centralDb: 'error' }));
      setErrorMessage(
        centralResult.error || 'Failed to delete from central database',
      );
      setStep('error');
      return;
    }
    setProgress((prev) => ({ ...prev, centralDb: 'completed' }));

    // Step 3: Clear localStorage
    setProgress((prev) => ({ ...prev, localStorage: 'in_progress' }));
    try {
      clearAllLocalStorage();
      clearOAuthSession();
      setProgress((prev) => ({ ...prev, localStorage: 'completed' }));
    } catch {
      setProgress((prev) => ({ ...prev, localStorage: 'error' }));
      setErrorMessage('Failed to clear local settings');
      setStep('error');
      return;
    }

    // Success!
    setStep('success');

    // Sign out and redirect after brief delay
    setTimeout(() => {
      void signOut({ redirect: false }).then(() => {
        window.location.href = '/setup';
      });
    }, 2000);
  }, [deleteUserSupabaseData, deleteCentralDbAccount, clearAllLocalStorage]);

  const handleRetry = useCallback(() => {
    setStep('confirm');
    setProgress({
      supabaseData: 'pending',
      centralDb: 'pending',
      localStorage: 'pending',
    });
    setErrorMessage(null);
  }, []);

  const isConfirmationValid = confirmationText === CONFIRMATION_PHRASE;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={step !== 'deleting' ? onClose : undefined}
    >
      <div
        className="flex items-center justify-center min-h-screen p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-navy border border-gray-800 w-full max-w-lg overflow-hidden shadow-2xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              {step === 'warning' && (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              {step === 'confirm' && (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              {step === 'deleting' && (
                <Loader2 className="w-5 h-5 text-gold animate-spin" />
              )}
              {step === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
              {step === 'success' && (
                <Check className="w-5 h-5 text-green-400" />
              )}
              <h2 className="text-lg font-semibold text-white">
                {step === 'warning' && 'Delete Your Account'}
                {step === 'confirm' && 'Confirm Deletion'}
                {step === 'deleting' && 'Deleting Account...'}
                {step === 'error' && 'Deletion Failed'}
                {step === 'success' && 'Account Deleted'}
              </h2>
            </div>
            {step !== 'deleting' && step !== 'success' && (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'warning' && (
              <WarningStep
                onContinue={() => setStep('confirm')}
                onCancel={onClose}
              />
            )}

            {step === 'confirm' && (
              <ConfirmStep
                confirmationText={confirmationText}
                onTextChange={setConfirmationText}
                isValid={isConfirmationValid}
                onDelete={performDeletion}
                onCancel={onClose}
              />
            )}

            {step === 'deleting' && <DeletingStep progress={progress} />}

            {step === 'error' && (
              <ErrorStep
                errorMessage={errorMessage}
                onRetry={handleRetry}
                onCancel={onClose}
              />
            )}

            {step === 'success' && <SuccessStep />}
          </div>
        </div>
      </div>
    </div>
  );
}

function WarningStep({
  onContinue,
  onCancel,
}: {
  onContinue: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
        <p className="text-sm text-red-300">
          This action is permanent and cannot be undone. All your data will be
          permanently deleted.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-white mb-3">
          The following will be deleted:
        </h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            All backlog items and PRDs
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Analysis history and execution logs
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Repository connections (repos themselves are not affected)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            API keys
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            AI provider configurations
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Your Mason account
          </li>
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 hover:bg-white/5 transition-all font-medium rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={onContinue}
          className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium hover:bg-red-700 transition-colors rounded-lg"
        >
          I Understand, Continue
        </button>
      </div>
    </div>
  );
}

function ConfirmStep({
  confirmationText,
  onTextChange,
  isValid,
  onDelete,
  onCancel,
}: {
  confirmationText: string;
  onTextChange: (text: string) => void;
  isValid: boolean;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Type{' '}
          <span className="font-mono text-red-400">{CONFIRMATION_PHRASE}</span>{' '}
          to confirm:
        </label>
        <input
          type="text"
          value={confirmationText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={CONFIRMATION_PHRASE}
          className="w-full px-4 py-3 bg-black/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all rounded-lg font-mono"
          autoFocus
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 hover:bg-white/5 transition-all font-medium rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={onDelete}
          disabled={!isValid}
          className={clsx(
            'flex-1 px-4 py-2.5 font-medium transition-colors rounded-lg',
            isValid
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-800 text-gray-400 cursor-not-allowed',
          )}
        >
          Delete My Account
        </button>
      </div>
    </div>
  );
}

function DeletingStep({ progress }: { progress: DeletionProgress }) {
  const getStatusIcon = (status: DeletionProgress[keyof DeletionProgress]) => {
    switch (status) {
      case 'pending':
        return (
          <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
        );
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-gold animate-spin" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'skipped':
        return <span className="w-4 h-4 text-gray-400 text-xs">-</span>;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Please wait while we delete your account...
      </p>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {getStatusIcon(progress.supabaseData)}
          <span
            className={clsx(
              'text-sm',
              progress.supabaseData === 'in_progress'
                ? 'text-white'
                : progress.supabaseData === 'completed'
                  ? 'text-green-400'
                  : progress.supabaseData === 'skipped'
                    ? 'text-gray-400'
                    : 'text-gray-400',
            )}
          >
            Clearing database data...
            {progress.supabaseData === 'skipped' &&
              ' (skipped - no OAuth session)'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {getStatusIcon(progress.centralDb)}
          <span
            className={clsx(
              'text-sm',
              progress.centralDb === 'in_progress'
                ? 'text-white'
                : progress.centralDb === 'completed'
                  ? 'text-green-400'
                  : 'text-gray-400',
            )}
          >
            Removing account from Mason...
          </span>
        </div>

        <div className="flex items-center gap-3">
          {getStatusIcon(progress.localStorage)}
          <span
            className={clsx(
              'text-sm',
              progress.localStorage === 'in_progress'
                ? 'text-white'
                : progress.localStorage === 'completed'
                  ? 'text-green-400'
                  : 'text-gray-400',
            )}
          >
            Clearing local settings...
          </span>
        </div>
      </div>
    </div>
  );
}

function ErrorStep({
  errorMessage,
  onRetry,
  onCancel,
}: {
  errorMessage: string | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
        <p className="text-sm text-red-300">
          {errorMessage || 'An error occurred while deleting your account.'}
        </p>
      </div>

      <p className="text-sm text-gray-400">
        You can try again or cancel and contact support if the issue persists.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 hover:bg-white/5 transition-all font-medium rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white font-medium hover:bg-red-700 transition-colors rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}

function SuccessStep() {
  return (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-400" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-white">Account Deleted</h3>
        <p className="mt-1 text-sm text-gray-400">
          Your account has been successfully deleted. Redirecting to setup...
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        Redirecting...
      </div>
    </div>
  );
}
