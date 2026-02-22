'use client';

import React from 'react';

const baseClasses =
  'w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] disabled:bg-[var(--background-secondary)] disabled:cursor-not-allowed';

export function Input({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${baseClasses} ${className}`} {...props} />;
}

export function Textarea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${baseClasses} resize-none ${className}`} {...props} />;
}

export function Select({
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${baseClasses} ${className}`} {...props}>
      {children}
    </select>
  );
}
