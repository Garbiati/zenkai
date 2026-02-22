'use client';

import React from 'react';

/**
 * Props for the KanbanBoard component.
 *
 * @param error - Error message string to display in the banner (empty string = no error)
 * @param onClearError - Callback to dismiss the error banner
 * @param children - KanbanColumn components rendered side by side
 */
export interface KanbanBoardProps {
  error: string;
  onClearError: () => void;
  children: React.ReactNode;
}

/**
 * Board-level wrapper that renders an error banner (when present)
 * and a flex container for the four Kanban columns.
 *
 * Preserves the exact layout classes from the original dashboard page:
 * - Error banner: red background with close button
 * - Columns container: vertical stack on mobile, horizontal row on lg+ screens
 *
 * @returns The rendered board element
 */
export default function KanbanBoard({
  error,
  onClearError,
  children,
}: KanbanBoardProps) {
  return (
    <>
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-red-700 text-sm mb-4">
          {error}
          <button
            onClick={onClearError}
            className="ml-3 font-bold"
            aria-label="Fechar"
          >
            <svg
              className="w-4 h-4 inline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Board -- 4 columns */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {children}
      </div>
    </>
  );
}
