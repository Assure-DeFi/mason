'use client';

import { clsx } from 'clsx';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useUserDatabase } from '@/hooks/useUserDatabase';
import { TABLES } from '@/lib/constants';

interface ConnectionStatusProps {
  /** Additional className */
  className?: string;
}

type ConnectionState = 'connected' | 'syncing' | 'disconnected' | 'unknown';

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const { isConfigured, client, isLoading } = useUserDatabase();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('unknown');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      if (!isConfigured || !client) {
        setConnectionState('disconnected');
        return;
      }

      setConnectionState('syncing');

      try {
        // Simple ping to check if database is accessible
        const { error } = await client
          .from(TABLES.USERS)
          .select('id', { count: 'exact', head: true })
          .limit(1);

        if (error) {
          setConnectionState('disconnected');
        } else {
          setConnectionState('connected');
          setLastChecked(new Date());
        }
      } catch {
        setConnectionState('disconnected');
      }
    };

    // Check on mount
    if (!isLoading) {
      void checkConnection();
    }

    // Periodic check every 30 seconds
    const interval = setInterval(() => void checkConnection(), 30000);
    return () => clearInterval(interval);
  }, [isConfigured, client, isLoading]);

  if (isLoading || connectionState === 'unknown') {
    return null;
  }

  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      textColor: 'text-green-400',
      icon: <Wifi className="w-3 h-3" />,
      label: 'Connected',
      description: 'Connected to your Supabase database',
    },
    syncing: {
      color: 'bg-yellow-500',
      textColor: 'text-yellow-400',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: 'Syncing',
      description: 'Checking connection...',
    },
    disconnected: {
      color: 'bg-red-500',
      textColor: 'text-red-400',
      icon: <WifiOff className="w-3 h-3" />,
      label: 'Disconnected',
      description: 'Unable to reach database. Check your configuration.',
    },
    unknown: {
      color: 'bg-gray-500',
      textColor: 'text-gray-400',
      icon: <Wifi className="w-3 h-3" />,
      label: 'Unknown',
      description: 'Checking connection status...',
    },
  };

  const config = statusConfig[connectionState];

  return (
    <div className={clsx('group relative', className)}>
      {/* Status indicator */}
      <div
        className={clsx(
          'flex items-center gap-2 px-2 py-1 rounded border border-gray-700 bg-black/30 cursor-default',
          config.textColor,
        )}
      >
        <span
          className={clsx(
            'w-2 h-2 rounded-full',
            config.color,
            connectionState === 'syncing' && 'animate-pulse',
          )}
        />
        <span className="text-xs font-medium">{config.label}</span>
      </div>

      {/* Tooltip on hover */}
      <div className="absolute top-full right-0 mt-2 w-64 p-3 rounded-lg border border-gray-700 bg-gray-900 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="flex items-start gap-2">
          <span className={config.textColor}>{config.icon}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{config.label}</p>
            <p className="text-xs text-gray-400 mt-1">{config.description}</p>
            {lastChecked && connectionState === 'connected' && (
              <p className="text-xs text-gray-500 mt-2">
                Last checked: {lastChecked.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {connectionState === 'disconnected' && (
          <a
            href="/setup"
            className="mt-3 block w-full px-3 py-2 text-xs text-center bg-gold/10 text-gold border border-gold/30 rounded hover:bg-gold/20 transition-colors"
          >
            Check Setup Configuration
          </a>
        )}
      </div>
    </div>
  );
}

export default ConnectionStatus;
