'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { TeamMember, HeartbeatResponse } from '@/lib/types';
import { formatHoursCompact } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface BoardHeaderProps {
  user: { id: string; isAdmin?: boolean; name?: string; username?: string; avatarUrl?: string | null } | null;
  currentMember: TeamMember | undefined;
  members: TeamMember[];
  heartbeatData: HeartbeatResponse | null;
  filterOwner: string;
  setFilterOwner: (v: string) => void;
  filter: 'all' | 'blocked';
  setFilter: (v: 'all' | 'blocked') => void;
  onlineMembers: Set<string>;
  visibleMembers: TeamMember[];
  overflowMembers: TeamMember[];
  onCreateTask: () => void;
  onLogout: () => void;
}

export default function BoardHeader({
  user,
  currentMember,
  members: _members,
  heartbeatData,
  filterOwner,
  setFilterOwner,
  filter,
  setFilter,
  onlineMembers,
  visibleMembers,
  overflowMembers,
  onCreateTask,
  onLogout,
}: BoardHeaderProps) {
  const router = useRouter();
  const t = useTranslations();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Close user menu on click outside / escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setUserMenuOpen(false);
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [userMenuOpen]);

  // Close overflow popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    }
    if (overflowOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [overflowOpen]);

  return (
    <header className="sticky top-0 z-40">
      {/* Tier 1 — Title + Nova Task + Avatar */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md border-b border-[var(--border)]/60 shadow-sm px-4 md:px-6">
        <div className="flex items-center justify-between h-14 md:h-16">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
            {t('dashboard.title')}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={onCreateTask}
              className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-green-100 px-3 py-1.5 text-sm text-green-800 transition-all duration-200 hover:bg-green-200"
            >
              {t('dashboard.newTask')}
            </button>
            {heartbeatData && (
              <span
                className={`text-sm font-semibold tabular-nums ${
                  heartbeatData.workedHoursToday > heartbeatData.expectedHours
                    ? 'text-orange-600'
                    : 'text-[var(--foreground-secondary)]'
                }`}
              >
                {formatHoursCompact(heartbeatData.workedHoursToday)}
                <span className="text-[var(--foreground-muted)]">
                  {' '}
                  / {formatHoursCompact(heartbeatData.expectedHours)}
                </span>
              </span>
            )}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
              >
                <Avatar
                  name={currentMember?.name || user?.name || ''}
                  avatarUrl={currentMember?.avatarUrl || user?.avatarUrl}
                  size="md"
                />
                <svg
                  className={`w-4 h-4 text-[var(--foreground-muted)] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {userMenuOpen && (
                <div
                  className="dropdown-menu absolute right-0 mt-2 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-xl py-2 shadow-lg z-50"
                  role="menu"
                >
                  <div className="px-4 py-2 border-b border-[var(--border)]/60">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {currentMember?.name || user?.name}
                    </p>
                    <p className="text-xs text-[var(--foreground-muted)]">@{user?.username}</p>
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => {
                      router.push('/profile');
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--foreground-secondary)] hover:bg-[var(--background-secondary)] transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-[var(--foreground-muted)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    {t('profile.myProfile')}
                  </button>
                  <div className="px-4 py-2 flex items-center justify-between border-t border-[var(--border)]/60">
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {t('common.language')}
                    </span>
                    <LanguageSwitcher />
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => {
                      onLogout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    {t('auth.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Tier 2 — Avatar Filter + Status Filter */}
      <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm border-b border-[var(--border)]/40 px-4 md:px-6">
        <div className="flex items-center justify-between h-12">
          {/* My Tasks / All toggle + Avatar filter */}
          <div className="flex items-center gap-1.5">
            <div className="bg-[var(--border)]/50 rounded-lg p-0.5 flex mr-2">
              <button
                onClick={() => setFilterOwner(user?.id || '')}
                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all ${
                  filterOwner === user?.id
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {t('dashboard.filters.myTasks')}
              </button>
              <button
                onClick={() => setFilterOwner('')}
                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all ${
                  !filterOwner
                    ? 'bg-white text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {t('dashboard.filters.allTasks')}
              </button>
            </div>
            {visibleMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => setFilterOwner(filterOwner === m.id ? '' : m.id)}
                className={`rounded-full transition-all duration-150 ${
                  filterOwner === m.id
                    ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110'
                    : filterOwner
                      ? 'opacity-40 hover:opacity-70'
                      : 'hover:scale-105'
                }`}
                title={m.name}
              >
                <Avatar
                  name={m.name}
                  avatarUrl={m.avatarUrl}
                  size="sm"
                  online={onlineMembers.has(m.id)}
                />
              </button>
            ))}
            {overflowMembers.length > 0 && (
              <div className="relative" ref={overflowRef}>
                <button
                  onClick={() => setOverflowOpen(!overflowOpen)}
                  className={`w-7 h-7 rounded-full bg-stone-300 text-[var(--foreground-secondary)] text-xs font-bold flex items-center justify-center border-2 border-stone-400 hover:bg-stone-400 transition-colors ${
                    filterOwner && overflowMembers.some((m) => m.id === filterOwner)
                      ? 'ring-2 ring-indigo-500 ring-offset-2'
                      : filterOwner
                        ? 'opacity-40'
                        : ''
                  }`}
                >
                  +{overflowMembers.length}
                </button>
                {overflowOpen && (
                  <div className="dropdown-menu absolute left-0 top-full mt-1 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl py-1 shadow-lg z-50">
                    {overflowMembers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setFilterOwner(filterOwner === m.id ? '' : m.id);
                          setOverflowOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[var(--background-secondary)] transition-colors ${
                          filterOwner === m.id
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-[var(--foreground-secondary)]'
                        }`}
                      >
                        <Avatar
                          name={m.name}
                          avatarUrl={m.avatarUrl}
                          size="sm"
                          online={onlineMembers.has(m.id)}
                        />
                        <span>{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {filterOwner && (
              <button
                onClick={() => setFilterOwner('')}
                className="w-5 h-5 rounded-full bg-stone-200 text-[var(--foreground-secondary)] text-xs flex items-center justify-center hover:bg-stone-300 transition-colors ml-1"
                title={t('dashboard.filters.clearFilter')}
                aria-label={t('dashboard.filters.clearFilter')}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {/* Status filter */}
          <div className="bg-[var(--border)]/50 rounded-lg p-0.5 flex">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                filter === 'all'
                  ? 'bg-white text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {t('dashboard.filters.all')}
            </button>
            <button
              onClick={() => setFilter('blocked')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                filter === 'blocked'
                  ? 'bg-red-100 text-red-800 shadow-sm'
                  : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {t('dashboard.filters.blocked')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
