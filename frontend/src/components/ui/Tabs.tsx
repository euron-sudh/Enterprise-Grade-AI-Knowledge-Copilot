'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within a Tabs provider');
  return ctx;
}

export interface TabsProps {
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (id: string) => void;
  tabs: TabItem[];
  children: React.ReactNode;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export function Tabs({
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
  tabs,
  children,
  variant = 'underline',
  className,
}: TabsProps) {
  const [internalTab, setInternalTab] = React.useState(defaultTab ?? tabs[0]?.id ?? '');
  const activeTab = controlledTab ?? internalTab;

  const setActiveTab = React.useCallback(
    (id: string) => {
      setInternalTab(id);
      onTabChange?.(id);
    },
    [onTabChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('flex flex-col', className)}>
        <TabList tabs={tabs} variant={variant} />
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabList({ tabs, variant }: { tabs: TabItem[]; variant: TabsProps['variant'] }) {
  const { activeTab, setActiveTab } = useTabsContext();

  return (
    <div
      className={cn(
        'flex',
        variant === 'underline' &&
          'border-b border-surface-200 dark:border-surface-700',
        variant === 'pills' && 'gap-1',
        variant === 'default' && 'gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-lg'
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          aria-controls={`panel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            'disabled:pointer-events-none disabled:opacity-50',
            variant === 'underline' && [
              'border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400'
                : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-200',
            ],
            variant === 'pills' && [
              'rounded-lg',
              activeTab === tab.id
                ? 'bg-brand-600 text-white'
                : 'text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800',
            ],
            variant === 'default' && [
              'rounded-md flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-900 dark:text-surface-100'
                : 'text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100',
            ]
          )}
          disabled={tab.disabled}
          id={`tab-${tab.id}`}
          role="tab"
          type="button"
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.icon}
          {tab.label}
          {tab.badge !== undefined && (
            <span className="ml-1 rounded-full bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ id, children, className }: TabPanelProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== id) return null;

  return (
    <div
      aria-labelledby={`tab-${id}`}
      className={cn('flex-1 animate-fade-in', className)}
      id={`panel-${id}`}
      role="tabpanel"
    >
      {children}
    </div>
  );
}
