import { TimeEntry } from './types';

export function calcTotalTime(entries: TimeEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    const start = new Date(entry.startedAt).getTime();
    const end = entry.endedAt ? new Date(entry.endedAt).getTime() : Date.now();
    total += end - start;
  }
  return total;
}

export function calcTodayTime(entries: TimeEntry[]): number {
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayStart = startOfDay.getTime();

  let total = 0;
  for (const entry of entries) {
    const start = Math.max(new Date(entry.startedAt).getTime(), dayStart);
    const end = entry.endedAt ? new Date(entry.endedAt).getTime() : now;
    if (end > dayStart) {
      total += end - start;
    }
  }
  return total;
}

export function calcMemberTime(entries: TimeEntry[], memberId: string): number {
  let total = 0;
  for (const entry of entries) {
    if (entry.teamMemberId === memberId) {
      const start = new Date(entry.startedAt).getTime();
      const end = entry.endedAt ? new Date(entry.endedAt).getTime() : Date.now();
      total += end - start;
    }
  }
  return total;
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

export function formatTimeShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatHoursCompact(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const MEMBER_RING_COLORS: Record<string, string> = {};
const RING_COLORS = [
  'ring-indigo-400',
  'ring-emerald-400',
  'ring-amber-400',
  'ring-rose-400',
  'ring-sky-400',
  'ring-violet-400',
  'ring-teal-400',
];

let colorIndex = 0;

export function getMemberColor(memberId: string): string {
  if (!MEMBER_RING_COLORS[memberId]) {
    MEMBER_RING_COLORS[memberId] = RING_COLORS[colorIndex % RING_COLORS.length];
    colorIndex++;
  }
  return MEMBER_RING_COLORS[memberId];
}
