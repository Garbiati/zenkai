'use client';

import React from 'react';

/**
 * Props for the KanbanColumn component.
 *
 * @param id - Column identifier ('backlog' | 'standby' | 'in_progress' | 'done')
 * @param title - Translated column title text
 * @param count - Number of tasks in this column
 * @param icon - React node for the column header icon (SVG element)
 * @param collapsed - Whether the column is currently collapsed
 * @param onToggleCollapse - Callback to toggle collapsed state
 * @param collapsible - Whether the column supports collapsing (default: true)
 * @param colorClass - CSS class for the collapsed title text color (e.g. 'text-emerald-700')
 * @param badgeClass - CSS classes for the count badge (e.g. 'bg-stone-200/60 text-[var(--foreground-secondary)]')
 * @param children - Card elements rendered inside the column
 * @param emptyMessage - Message shown when column has no children
 */
export interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  icon: React.ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  collapsible?: boolean;
  colorClass?: string;
  badgeClass?: string;
  titleClass?: string;
  children: React.ReactNode;
  emptyMessage?: string;
}

/**
 * Reusable Kanban board column wrapper.
 *
 * Handles two visual states:
 * - **Collapsed**: narrow strip with vertical text + count (backlog/done columns)
 * - **Expanded**: full column with icon, title, count badge, optional collapse button, and card children
 *
 * @returns The rendered column element
 */
export default function KanbanColumn({
  id,
  title,
  count,
  icon,
  collapsed,
  onToggleCollapse,
  collapsible = true,
  colorClass = 'text-[var(--foreground-secondary)]',
  badgeClass = 'bg-stone-200/60 text-[var(--foreground-secondary)]',
  titleClass = 'text-[var(--foreground-secondary)]',
  children,
  emptyMessage,
}: KanbanColumnProps) {
  // Determine if the children slot is effectively empty
  const isEmpty = React.Children.count(children) === 0;

  return (
    <div
      className={`board-column ${collapsed ? 'lg:w-14 shrink-0' : 'flex-1 min-w-0'}`}
    >
      {collapsed ? (
        <div
          className="flex flex-col items-center justify-start pt-6 gap-3 cursor-pointer min-h-[200px]"
          onClick={onToggleCollapse}
        >
          <span
            className={`text-xs font-bold tracking-widest ${colorClass} [writing-mode:vertical-rl] rotate-180 uppercase`}
          >
            {title}
          </span>
          <span className="text-xs text-[var(--foreground-muted)] font-mono">
            {count}
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            {icon}
            <h2
              id={`col-${id}`}
              className={`text-lg font-bold ${titleClass} uppercase tracking-wide`}
            >
              {title}
            </h2>
            <span
              className={`${badgeClass} text-xs font-bold px-2 py-0.5 rounded-full`}
            >
              {count}
            </span>
            {collapsible && (
              <button
                onClick={onToggleCollapse}
                title="Minimizar coluna"
                className="ml-auto text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {/* Backlog uses left chevron, Done uses right chevron.
                      We pick direction based on column id for exact parity. */}
                  {id === 'done' ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  )}
                </svg>
              </button>
            )}
          </div>
          <div className="space-y-4">
            {children}
            {isEmpty && emptyMessage && (
              <p className="text-xl text-[var(--foreground-muted)] text-center py-8">
                {emptyMessage}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
