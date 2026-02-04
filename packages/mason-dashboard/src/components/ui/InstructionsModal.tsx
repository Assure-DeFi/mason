'use client';

import {
  X,
  BookOpen,
  Terminal,
  Settings,
  LayoutDashboard,
  Zap,
  FileText,
  PlayCircle,
  Keyboard,
  Menu,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import {
  OverviewSection,
  SetupSection,
  PMReviewSection,
  BacklogSection,
  PRDSection,
  ExecuteSection,
  SettingsSection,
  ShortcutsSection,
} from './instructions';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Section =
  | 'overview'
  | 'setup'
  | 'pm-review'
  | 'backlog'
  | 'prd'
  | 'execute'
  | 'settings'
  | 'shortcuts';

interface SectionItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
}

const sections: SectionItem[] = [
  { id: 'overview', label: 'Overview', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'setup', label: 'Getting Started', icon: <Zap className="h-4 w-4" /> },
  {
    id: 'pm-review',
    label: 'Running PM Review',
    icon: <Terminal className="h-4 w-4" />,
  },
  {
    id: 'backlog',
    label: 'Managing Backlog',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    id: 'prd',
    label: 'Generating PRDs',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: 'execute',
    label: 'Executing Items',
    icon: <PlayCircle className="h-4 w-4" />,
  },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  {
    id: 'shortcuts',
    label: 'Keyboard Shortcuts',
    icon: <Keyboard className="h-4 w-4" />,
  },
];

const sectionComponents: Record<Section, React.ComponentType> = {
  overview: OverviewSection,
  setup: SetupSection,
  'pm-review': PMReviewSection,
  backlog: BacklogSection,
  prd: PRDSection,
  execute: ExecuteSection,
  settings: SettingsSection,
  shortcuts: ShortcutsSection,
};

export function InstructionsModal({ isOpen, onClose }: InstructionsModalProps) {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const SectionComponent = sectionComponents[activeSection];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm backdrop-blur-fallback">
      <div className="relative mx-2 sm:mx-4 flex h-[85vh] w-full max-w-[95vw] sm:max-w-4xl md:max-w-5xl overflow-hidden rounded-lg border border-gray-800 bg-navy shadow-2xl">
        {/* Mobile hamburger button - only visible on mobile */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 left-4 z-[61] rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white md:hidden"
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>

        {/* Optional backdrop overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-[59] bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - responsive positioning */}
        <div className={`fixed inset-y-0 left-0 z-[60] w-64 flex-shrink-0 transform border-r border-gray-800 bg-black/30 transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex items-center gap-3 border-b border-gray-800 p-4">
            <div className="rounded-lg bg-gold/20 p-2">
              <BookOpen className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h2 className="font-semibold text-white">User Guide</h2>
              <p className="text-xs text-gray-400">How to use Mason</p>
            </div>
          </div>
          <nav className="p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-gold/20 text-gold'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4 md:px-6 pl-16 md:pl-6">
            <h3 className="text-lg font-semibold text-white">
              {sections.find((s) => s.id === activeSection)?.label}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <SectionComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
