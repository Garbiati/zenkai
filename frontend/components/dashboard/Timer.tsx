'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { calcTotalTime, calcTodayTime, formatTime } from '@/lib/utils';

export default function Timer({ entries, todayOnly }: { entries: Task['timeEntries']; todayOnly?: boolean }) {
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    const hasOpen = entries.some((e) => !e.endedAt);
    if (!hasOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [entries]);

  const total = todayOnly ? calcTodayTime(entries) : calcTotalTime(entries);
  return <span className="text-sm font-semibold text-stone-500 tabular-nums" aria-live="polite">{formatTime(total)}</span>;
}
