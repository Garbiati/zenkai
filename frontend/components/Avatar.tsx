'use client';

import Image from 'next/image';

const AVATAR_COLORS = [
  'bg-amber-300',
  'bg-pink-300',
  'bg-sky-300',
  'bg-emerald-300',
  'bg-violet-300',
  'bg-orange-300',
  'bg-rose-300',
  'bg-teal-300',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const SIZES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-16 h-16 text-xl',
};

const PIXEL_SIZES = { sm: 28, md: 36, lg: 64 };

const DOT_SIZES = {
  sm: 'w-2 h-2 bottom-0 right-0',
  md: 'w-2.5 h-2.5 bottom-0 right-0',
  lg: 'w-3.5 h-3.5 bottom-0.5 right-0.5',
};

export default function Avatar({
  name,
  avatarUrl,
  size = 'md',
  online,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  /** When defined, shows a presence dot (green = online, gray = offline) */
  online?: boolean;
}) {
  const sizeClass = SIZES[size];
  const dotClass = DOT_SIZES[size];

  const presenceDot =
    online !== undefined ? (
      <span
        className={`absolute ${dotClass} rounded-full border-2 border-white ${online ? 'bg-emerald-400' : 'bg-stone-400'}`}
        title={online ? 'Online' : 'Offline'}
      />
    ) : null;

  if (avatarUrl) {
    return (
      <span className="relative inline-block">
        <Image
          src={avatarUrl}
          alt={name}
          width={PIXEL_SIZES[size]}
          height={PIXEL_SIZES[size]}
          className={`${sizeClass} rounded-full object-cover border-2 border-stone-300`}
          unoptimized
        />
        {presenceDot}
      </span>
    );
  }

  const colorClass = AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
  return (
    <span className="relative inline-block">
      <span
        className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center font-bold text-stone-700 border-2 border-stone-300`}
        title={name}
      >
        {getInitials(name)}
      </span>
      {presenceDot}
    </span>
  );
}
