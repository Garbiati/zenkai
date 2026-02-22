'use client';

import { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from 'react';
import { useRealtimeBoard } from '@/lib/hooks/useRealtimeBoard';
import { api } from '@/lib/api';
import { Task, TeamMember, HeartbeatResponse } from '@/lib/types';

const MAX_VISIBLE_AVATARS = 5;

interface UseDashboardDataParams {
  user: { id: string; isAdmin?: boolean; name?: string; username?: string; avatarUrl?: string | null } | null;
  authLoading: boolean;
  filter: 'all' | 'blocked';
  filterOwner: string;
  addToast: (type: 'warning' | 'info' | 'success' | 'error', message: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
  formatHoursCompact: (hours: number) => string;
  logout: () => void;
}

interface UseDashboardDataReturn {
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  members: TeamMember[];
  loading: boolean;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  fetchData: () => Promise<void>;
  onlineMembers: Set<string>;
  heartbeatData: HeartbeatResponse | null;
  showResumeModal: string | null;
  setShowResumeModal: Dispatch<SetStateAction<string | null>>;
  showDailyDigest: boolean;
  setShowDailyDigest: Dispatch<SetStateAction<boolean>>;
  backlogTasks: Task[];
  standbyTasks: Task[];
  inProgressTasks: Task[];
  doneTasks: Task[];
  doneTasksVisible: Task[];
  doneTasksArchived: Task[];
  busyMemberIds: Set<string>;
  availableMembers: TeamMember[];
  visibleMembers: TeamMember[];
  overflowMembers: TeamMember[];
}

/**
 * Custom hook that encapsulates all data-fetching, WebSocket integration,
 * heartbeat, daily digest, inactivity tracking, heartbeat notifications,
 * and derived state logic for the dashboard page.
 *
 * @param params - Configuration object with user context, filter state, and utility functions
 * @returns All data and derived state needed by the dashboard UI
 */
export function useDashboardData({
  user,
  authLoading,
  filter,
  filterOwner,
  addToast,
  t,
  formatHoursCompact,
  logout,
}: UseDashboardDataParams): UseDashboardDataReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Heartbeat + Pause/Resume states
  const [heartbeatData, setHeartbeatData] = useState<HeartbeatResponse | null>(null);
  const [showResumeModal, setShowResumeModal] = useState<string | null>(null);

  // Daily Digest: show banner after 5h worked or after 5pm (once per session)
  const [showDailyDigest, setShowDailyDigest] = useState(false);
  const dailyDigestShownRef = useRef(false);

  // Toast notification refs
  const lastActivityRef = useRef(Date.now());
  const inactivityToastShownRef = useRef(false);
  const hoursWarningShownRef = useRef(false);
  const deadlineWarningShownRef = useRef(false);

  // --- Data fetching ---
  const fetchData = useCallback(async () => {
    try {
      const [tasksData, membersData] = await Promise.all([api.getTasks(), api.getMembers()]);
      setTasks(tasksData);
      setMembers(membersData);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        logout();
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // --- WebSocket integration (real-time board) ---
  const { onlineMembers } = useRealtimeBoard({
    memberId: user?.id ?? null,
    onTaskCreated: useCallback((task: Task) => {
      setTasks((prev) => {
        if (prev.find((t) => t.id === task.id)) return prev;
        return [task, ...prev];
      });
    }, []),
    onTaskUpdated: useCallback((task: Task) => {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    }, []),
    onTaskDeleted: useCallback(({ taskId }: { taskId: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }, []),
  });

  // --- Heartbeat with Page Visibility API ---
  useEffect(() => {
    if (!user || authLoading) return;

    let intervalId: NodeJS.Timeout | null = null;

    const sendHeartbeat = async () => {
      try {
        const data = await api.heartbeat();
        setHeartbeatData(data);
        // If task was auto-paused by heartbeat timeout, show resume modal
        if (data.isPaused && data.activeTaskId) {
          setShowResumeModal(data.activeTaskId);
        }
      } catch {
        // Silently ignore heartbeat errors
      }
    };

    const startHeartbeat = () => {
      sendHeartbeat();
      intervalId = setInterval(sendHeartbeat, 60000);
    };

    const stopHeartbeat = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    };

    if (document.visibilityState === 'visible') {
      startHeartbeat();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, authLoading]);

  // --- Daily Digest: show banner after 5h worked or after 5pm (once per session) ---
  useEffect(() => {
    if (!heartbeatData || dailyDigestShownRef.current) return;
    const hours = heartbeatData.workedHoursToday ?? 0;
    const currentHour = new Date().getHours();
    if (hours >= 5 || currentHour >= 17) {
      dailyDigestShownRef.current = true;
      setShowDailyDigest(true);
    }
  }, [heartbeatData]);

  // --- Inactivity tracking (90s warning) ---
  useEffect(() => {
    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      inactivityToastShownRef.current = false;
    };

    const checkInactivity = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (
        elapsed >= 90000 &&
        !inactivityToastShownRef.current &&
        heartbeatData?.activeTaskId &&
        !heartbeatData?.isPaused
      ) {
        inactivityToastShownRef.current = true;
        addToast('warning', t('toasts.inactivity'));
      }
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('click', resetActivity);

    const intervalId = setInterval(checkInactivity, 10000);

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('click', resetActivity);
      clearInterval(intervalId);
    };
  }, [heartbeatData, addToast, t]);

  // --- Heartbeat-triggered notifications (8h warning + deadline exceeded) ---
  useEffect(() => {
    if (!heartbeatData) return;

    // 8h approaching warning (once per session)
    if (!hoursWarningShownRef.current && heartbeatData.expectedHours > 0) {
      const threshold = heartbeatData.expectedHours - 0.5;
      if (heartbeatData.workedHoursToday >= threshold) {
        hoursWarningShownRef.current = true;
        addToast(
          'info',
          t('toasts.hoursApproaching', { hours: formatHoursCompact(heartbeatData.expectedHours) }),
        );
      }
    }

    // Deadline exceeded warning (once per session)
    if (
      !deadlineWarningShownRef.current &&
      heartbeatData.taskDeadlineExceeded &&
      heartbeatData.taskEstimatedHours
    ) {
      deadlineWarningShownRef.current = true;
      addToast(
        'error',
        t('toasts.deadlineExceeded', {
          estimated: formatHoursCompact(heartbeatData.taskEstimatedHours),
          actual: formatHoursCompact(heartbeatData.taskTotalHoursSpent),
        }),
      );
    }
  }, [heartbeatData, addToast, t, formatHoursCompact]);

  // --- Derived task lists ---
  // Backlog is a shared queue -- always show all tasks regardless of member filter
  const backlogTasks = tasks
    .filter((t) => t.status === 'backlog')
    .filter((t) => (filter === 'blocked' ? t.isBlocked : true));

  const standbyTasks = tasks
    .filter((t) => t.status === 'standby')
    .filter((t) => (filter === 'blocked' ? t.isBlocked : true))
    .filter((t) => (filterOwner ? t.ownerId === filterOwner : true));

  const inProgressTasks = tasks
    .filter((t) => t.status === 'in_progress')
    .filter((t) => (filterOwner ? t.ownerId === filterOwner : true));

  const doneTasks = tasks
    .filter((t) => t.status === 'done')
    .filter((t) => (filterOwner ? t.ownerId === filterOwner : true));

  // Separate done tasks
  const doneTasksVisible = doneTasks.filter((t) => !t.isArchived);
  const doneTasksArchived = doneTasks.filter((t) => t.isArchived);

  // --- Derived members ---
  // Available members (not busy with in_progress task)
  const busyMemberIds = new Set(
    tasks
      .filter((t) => t.status === 'in_progress')
      .map((t) => t.ownerId)
      .filter((id): id is string => id !== null),
  );
  const availableMembers = members.filter((m) => !busyMemberIds.has(m.id));

  // Avatar filter helpers
  const visibleMembers = members.slice(0, MAX_VISIBLE_AVATARS);
  const overflowMembers = members.slice(MAX_VISIBLE_AVATARS);

  return {
    tasks,
    setTasks,
    members,
    loading,
    error,
    setError,
    fetchData,
    onlineMembers,
    heartbeatData,
    showResumeModal,
    setShowResumeModal,
    showDailyDigest,
    setShowDailyDigest,
    backlogTasks,
    standbyTasks,
    inProgressTasks,
    doneTasks,
    doneTasksVisible,
    doneTasksArchived,
    busyMemberIds,
    availableMembers,
    visibleMembers,
    overflowMembers,
  };
}
