'use client';

import React from 'react';

type BadgeVariant = 'active' | 'paused' | 'blocked' | 'done' | 'owner' | 'default';

const variantClasses: Record<BadgeVariant, string> = {
  active: 'bg-[var(--status-active-bg)] text-[var(--status-active)]',
  paused: 'bg-[var(--status-paused-bg)] text-[var(--status-paused)]',
  blocked: 'bg-[var(--status-blocked-bg)] text-[var(--status-blocked)]',
  done: 'bg-[var(--status-done-bg)] text-[var(--status-done)]',
  owner: 'bg-[var(--accent-soft)] text-[var(--accent-text)]',
  default: 'bg-[var(--background-secondary)] text-[var(--foreground-secondary)]',
};

const dotColors: Record<BadgeVariant, string> = {
  active: 'bg-[var(--status-active)]',
  paused: 'bg-[var(--status-paused)]',
  blocked: 'bg-[var(--status-blocked)]',
  done: 'bg-[var(--status-done)]',
  owner: 'bg-[var(--accent)]',
  default: 'bg-[var(--foreground-muted)]',
};

export default function Badge({
  variant = 'default',
  dot = false,
  className = '',
  children,
}: {
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full ${variantClasses[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
