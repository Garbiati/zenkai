'use client';

import React, { useEffect, useRef, useId, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const sizeClass = size === 'xl' ? 'max-w-3xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';

  // Focus trap: get all focusable elements inside dialog
  const getFocusableElements = useCallback(() => {
    if (!dialogRef.current) return [];
    return Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }, []);

  // Save previous focus & auto-focus on open
  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    // Delay to ensure DOM is rendered
    const timer = setTimeout(() => {
      if (!dialogRef.current) return;
      const focusable = getFocusableElements();
      // Try to focus first input, otherwise first focusable (close button)
      const firstInput = focusable.find(
        (el) => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
      );
      if (firstInput) {
        firstInput.focus();
      } else if (focusable.length > 0) {
        focusable[0].focus();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [open, getFocusableElements]);

  // Restore focus on close
  useEffect(() => {
    if (open) return;
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Keyboard: ESC to close, Tab/Shift+Tab focus trap
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusableElements();
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, getFocusableElements]);

  // SSR safety: only render portal after mount (document.body must exist)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-[fade-in_0.15s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={dialogRef}
        className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] w-full ${sizeClass} max-h-[85vh] flex flex-col animate-[modal-enter_0.2s_ease-out]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 pb-4 shrink-0 border-b border-[var(--border-light)]">
          <h2 id={titleId} className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] transition-colors"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
