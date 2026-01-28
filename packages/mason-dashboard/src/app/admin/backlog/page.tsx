'use client';

import { useState, useEffect, useCallback } from 'react';
import { BacklogTable } from '@/components/backlog/backlog-table';
import { ItemDetailModal } from '@/components/backlog/item-detail-modal';
import { Filters } from '@/components/backlog/filters';
import type {
  BacklogItem,
  BacklogFilters,
  BacklogStatus,
} from '@/types/backlog';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BacklogPage() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null);
  const [filters, setFilters] = useState<BacklogFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (filters.status?.length) {
        params.set('status', filters.status.join(','));
      }
      if (filters.area?.length) {
        params.set('area', filters.area.join(','));
      }
      if (filters.type?.length) {
        params.set('type', filters.type.join(','));
      }
      if (filters.search) {
        params.set('search', filters.search);
      }

      const response = await fetch(`/api/backlog?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch backlog items');
      }

      const data = await response.json();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleUpdateStatus = async (id: string, status: BacklogStatus) => {
    const response = await fetch(`/api/backlog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update status');
    }

    const updated = await response.json();

    // Update local state
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

    // Update selected item if it's the one being updated
    if (selectedItem?.id === id) {
      setSelectedItem(updated);
    }
  };

  const handleGeneratePrd = async (id: string) => {
    const response = await fetch(`/api/prd/${id}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to generate PRD');
    }

    const updated = await response.json();

    // Update local state
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

    // Update selected item
    if (selectedItem?.id === id) {
      setSelectedItem(updated);
    }
  };

  // Error state
  if (error && !isLoading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="p-8 bg-red-900/20 border border-red-800 rounded-lg text-center">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={fetchItems}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">PM Backlog</h1>
              <p className="text-gray-400 text-sm">
                {items.length} items{' '}
                {filters.status?.length ? '(filtered)' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={fetchItems}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-black/30 border border-gray-800 rounded-lg hover:border-gray-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <Filters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Table */}
        <div className="bg-black/20 border border-gray-800 rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : (
            <BacklogTable
              items={items}
              onSelectItem={setSelectedItem}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
        </div>

        {/* Detail Modal */}
        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdateStatus={handleUpdateStatus}
            onGeneratePrd={handleGeneratePrd}
          />
        )}
      </div>
    </main>
  );
}
