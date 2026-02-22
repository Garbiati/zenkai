'use client';

import { useEffect, useRef } from 'react';

export default function CardOverflowMenu({
  items,
  open,
  onToggle,
}: {
  items: { label: string; onClick: () => void; className?: string }[];
  open: boolean;
  onToggle: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onToggle();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onToggle();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onToggle]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="card-menu-trigger w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
        aria-label="Menu de acoes"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="dropdown-menu absolute right-0 top-full mt-1 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-xl py-1 shadow-[var(--shadow-lg)] z-50" role="menu">
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                onToggle();
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--background-secondary)] transition-colors ${item.className || 'text-[var(--foreground-secondary)]'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
