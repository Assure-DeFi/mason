'use client';

import { useState } from 'react';
import type { BacklogItem, BacklogStatus } from '@/types/backlog';
import { X, FileText, GitBranch, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';

interface ItemDetailModalProps {
  item: BacklogItem;
  onClose: () => void;
  onUpdateStatus: (id: string, status: BacklogStatus) => Promise<void>;
  onGeneratePrd: (id: string) => Promise<void>;
}

export function ItemDetailModal({
  item,
  onClose,
  onUpdateStatus,
  onGeneratePrd,
}: ItemDetailModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'prd'>('details');

  const handleGeneratePrd = async () => {
    setIsGenerating(true);
    try {
      await onGeneratePrd(item.id);
      setActiveTab('prd');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = async (status: BacklogStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(item.id, status);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-navy border border-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <div className="flex gap-2 mt-1">
              <span className="text-xs text-gray-400">{item.area}</span>
              <span className="text-xs text-gray-600">|</span>
              <span className="text-xs text-gray-400">{item.type}</span>
              <span className="text-xs text-gray-600">|</span>
              <span className="text-xs text-gray-400">{item.complexity}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('details')}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'details'
                ? 'text-gold border-b-2 border-gold'
                : 'text-gray-400 hover:text-white',
            )}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('prd')}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'prd'
                ? 'text-gold border-b-2 border-gold'
                : 'text-gray-400 hover:text-white',
            )}
          >
            PRD {item.prd_content && '(Ready)'}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Scores */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-black/30 rounded-lg text-center">
                  <div className="text-3xl font-bold text-gold">
                    {item.priority_score}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Priority</div>
                </div>
                <div className="p-4 bg-black/30 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {item.impact_score}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Impact</div>
                </div>
                <div className="p-4 bg-black/30 rounded-lg text-center">
                  <div className="text-3xl font-bold text-orange-400">
                    {item.effort_score}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Effort</div>
                </div>
              </div>

              {/* Problem */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">
                  Problem
                </h3>
                <p className="text-gray-200 whitespace-pre-wrap">
                  {item.problem}
                </p>
              </div>

              {/* Solution */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">
                  Solution
                </h3>
                <p className="text-gray-200 whitespace-pre-wrap">
                  {item.solution}
                </p>
              </div>

              {/* Benefits */}
              {item.benefits_json.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Benefits
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-200">
                    {item.benefits_json.map((benefit, i) => (
                      <li key={i}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Git info */}
              {(item.branch_name || item.pr_url) && (
                <div className="flex gap-4">
                  {item.branch_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <GitBranch className="w-4 h-4" />
                      <code className="bg-black/50 px-2 py-0.5 rounded">
                        {item.branch_name}
                      </code>
                    </div>
                  )}
                  {item.pr_url && (
                    <a
                      href={item.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gold hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View PR
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'prd' && (
            <div>
              {item.prd_content ? (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-200 bg-black/30 p-4 rounded-lg overflow-x-auto">
                    {item.prd_content}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400 mb-4">
                    No PRD generated yet. Generate a PRD to enable execution.
                  </p>
                  <button
                    onClick={handleGeneratePrd}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-gold text-navy font-medium rounded hover:bg-gold/90 disabled:opacity-50"
                  >
                    {isGenerating ? 'Generating...' : 'Generate PRD'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800 bg-black/20">
          <div className="text-sm text-gray-500">
            Status: <span className="text-white">{item.status}</span>
          </div>
          <div className="flex gap-2">
            {item.status === 'new' && (
              <>
                <button
                  onClick={() => handleStatusChange('rejected')}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm bg-red-600/50 hover:bg-red-600 rounded disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleStatusChange('approved')}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Approve'}
                </button>
              </>
            )}
            {item.status === 'approved' && !item.prd_content && (
              <button
                onClick={handleGeneratePrd}
                disabled={isGenerating}
                className="px-4 py-2 text-sm bg-gold text-navy font-medium rounded hover:bg-gold/90 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate PRD'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
