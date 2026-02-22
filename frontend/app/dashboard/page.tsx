'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { calcTotalTime, calcTodayTime, formatHoursCompact } from '@/lib/utils';
import { useErrorTranslation } from '@/lib/useErrorTranslation';
import { useToast } from '@/lib/useToast';
import Avatar from '@/components/Avatar';
import ToastContainer from '@/components/Toast';
import { Timer, CardOverflowMenu } from '@/components/dashboard';
import TaskDetailModal from '@/components/dashboard/TaskDetailModal';
import Badge from '@/components/ui/Badge';
import BoardHeader from './_components/BoardHeader';
import KanbanBoard from './_components/KanbanBoard';
import KanbanColumn from './_components/KanbanColumn';
import Modals from './_components/Modals';
import { useDashboardData } from './_hooks/useDashboardData';
import { useTaskActions } from './_hooks/useTaskActions';

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations();
  const translateError = useErrorTranslation();
  const { toasts, addToast, removeToast } = useToast();

  // --- Local UI state (filter + collapse) ---
  const [filter, setFilter] = useState<'all' | 'blocked'>('all');
  const [filterOwner, setFilterOwner] = useState<string>('');
  const filterInitRef = useRef(false);
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(new Set());
  const toggleCol = (col: string) =>
    setCollapsedCols((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });

  // --- Data hook ---
  const dashboardData = useDashboardData({
    user,
    authLoading,
    filter,
    filterOwner,
    addToast,
    t,
    formatHoursCompact,
    logout,
  });

  const {
    tasks,
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
    doneTasksVisible,
    doneTasksArchived,
    busyMemberIds,
    availableMembers,
    visibleMembers,
    overflowMembers,
  } = dashboardData;

  // --- Actions hook ---
  const actions = useTaskActions({
    user,
    tasks,
    fetchData,
    setError,
    translateError,
    t,
  });

  const {
    // Block modal
    blockModal,
    setBlockModal,
    blockReason,
    setBlockReason,
    // Activate modal
    activateModal,
    setActivateModal,
    resolutionNote,
    setResolutionNote,
    activateOwnerId,
    setActivateOwnerId,
    // Owner modal
    ownerModal,
    setOwnerModal,
    newOwnerId,
    setNewOwnerId,
    // Edit modal
    editModal,
    setEditModal,
    editTitle,
    setEditTitle,
    editDesc,
    setEditDesc,
    editEstimatedHours,
    setEditEstimatedHours,
    // Comment modal
    commentModal,
    setCommentModal,
    comments,
    newComment,
    setNewComment,
    // Create modal
    createModal,
    setCreateModal,
    createTitle,
    setCreateTitle,
    createDesc,
    setCreateDesc,
    createEstimatedHours,
    setCreateEstimatedHours,
    // Start tracking modal
    startTrackingModal,
    setStartTrackingModal,
    // History modal
    historyModal,
    setHistoryModal,
    history,
    setHistory,
    // Detail modal (double-click)
    detailModalTask,
    setDetailModalTask,
    detailComments,
    detailHistory,
    detailLoading,
    detailNewComment,
    setDetailNewComment,
    // Quick Complete feedback
    quickCompleteTask,
    setQuickCompleteTask,
    // Show archived toggle
    showArchived,
    setShowArchived,
    // Card interaction
    expandedCardId,
    openMenuId,
    setOpenMenuId,
    // Handlers
    handleBlock,
    handleActivate,
    handleComplete,
    handleUndo,
    handleChangeOwner,
    handleEdit,
    handleOpenComments,
    handleAddComment,
    handleCreate,
    handleDelete,
    handleArchive,
    handleUnarchive,
    handlePause,
    handleResume,
    openStartTrackingModal,
    handleStartTracking,
    handleOpenHistory,
    handleDetailAddComment,
    formatHistoryAction,
    handleCardSingleClick,
    handleCardDoubleClick,
  } = actions;

  // --- Auth redirect + initial fetch ---
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    // Default: show all tasks (backlog is a shared queue)
    if (!filterInitRef.current) {
      filterInitRef.current = true;
      setFilterOwner('');
    }
    // Initial data fetch; real-time updates are handled via WebSocket (see useRealtimeBoard)
    fetchData();
  }, [user, authLoading, router, fetchData]);

  // --- Skeleton loading ---
  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        {/* Skeleton header */}
        <div className="border-b border-[var(--border)]/60 px-4 md:px-6">
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="skeleton h-8 w-48" />
            <div className="flex items-center gap-3">
              <div className="skeleton h-8 w-24" />
              <div className="skeleton h-8 w-8 !rounded-full" />
            </div>
          </div>
        </div>
        <div className="border-b border-[var(--border)]/40 px-4 md:px-6">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-2">
              <div className="skeleton h-7 w-32" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-7 w-7 !rounded-full" />
              ))}
            </div>
            <div className="skeleton h-7 w-28" />
          </div>
        </div>
        {/* Skeleton board */}
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((col) => (
              <div key={col} className="space-y-4">
                <div className="skeleton h-6 w-32 mb-4" />
                {[1, 2, 3].map((card) => (
                  <div key={card} className="skeleton h-28 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentMember = members.find((m) => m.id === user?.id);

  return (
    <div className="min-h-screen">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <BoardHeader
        user={user}
        currentMember={currentMember}
        members={members}
        heartbeatData={heartbeatData}
        filterOwner={filterOwner}
        setFilterOwner={setFilterOwner}
        filter={filter}
        setFilter={setFilter}
        onlineMembers={onlineMembers}
        visibleMembers={visibleMembers}
        overflowMembers={overflowMembers}
        onCreateTask={() => setCreateModal(true)}
        onLogout={logout}
      />

      <main className="p-4 md:p-6">
        <KanbanBoard error={error} onClearError={() => setError('')}>
          {/* ========== Backlog Column ========== */}
          <KanbanColumn
            id="backlog"
            title={t('dashboard.columns.backlog')}
            count={backlogTasks.length}
            icon={
              <svg
                className="w-5 h-5 text-[var(--foreground-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            }
            collapsed={collapsedCols.has('backlog')}
            onToggleCollapse={() => toggleCol('backlog')}
            emptyMessage={t('dashboard.empty.backlog')}
          >
            {backlogTasks.map((task) => (
              <div
                key={task.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow p-4 border-l-2 border-l-stone-300 group relative cursor-pointer"
                onClick={() => handleCardSingleClick(task.id)}
                onDoubleClick={() => handleCardDoubleClick(task)}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[var(--foreground)] truncate">
                      {task.title}
                    </h3>
                  </div>
                  <CardOverflowMenu
                    open={openMenuId === task.id}
                    onToggle={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                    items={[
                      {
                        label: t('dashboard.actions.history'),
                        onClick: () => handleOpenHistory(task.id),
                      },
                      ...(user?.isAdmin
                        ? [
                            {
                              label: t('dashboard.actions.delete'),
                              onClick: () => handleDelete(task.id),
                              className: 'text-red-600',
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
                <p className="text-sm text-[var(--foreground-secondary)] line-clamp-2 mb-2">
                  {task.description}
                </p>
                {task.estimatedHours && (
                  <div className="text-xs text-[var(--foreground-muted)] mb-1">
                    {formatHoursCompact(Number(task.estimatedHours))}{' '}
                    {t('dashboard.card.estimated')}
                  </div>
                )}
                {/* Hover/tap actions */}
                <div
                  className={`card-actions border-t border-[var(--border)]/60 pt-2 ${expandedCardId === task.id ? 'card-actions--expanded' : ''}`}
                >
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const defaultOwner = availableMembers.find((m) => m.id === user?.id)
                          ? user?.id || ''
                          : availableMembers[0]?.id || '';
                        setActivateOwnerId(defaultOwner);
                        setActivateModal({ taskId: task.id, isBlocked: false });
                      }}
                      className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-blue-100 px-3 py-0.5 text-sm text-blue-800 transition-all duration-200 hover:bg-blue-200"
                    >
                      {t('dashboard.actions.activate')}
                    </button>
                    {user?.isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditModal({ task });
                          setEditTitle(task.title);
                          setEditDesc(task.description);
                          setEditEstimatedHours(
                            task.estimatedHours != null ? String(task.estimatedHours) : '',
                          );
                        }}
                        className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-0.5 text-sm transition-all duration-200 hover:bg-[var(--surface-hover)]"
                      >
                        {t('dashboard.actions.edit')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </KanbanColumn>

          {/* ========== Stand By Column ========== */}
          <KanbanColumn
            id="standby"
            title={t('dashboard.columns.standby')}
            count={standbyTasks.length}
            icon={
              <svg
                className="w-5 h-5 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            collapsed={false}
            onToggleCollapse={() => {}}
            collapsible={false}
            colorClass="text-amber-700"
            badgeClass="bg-amber-100 text-amber-600"
            titleClass="text-amber-700"
            emptyMessage={t('dashboard.empty.standby')}
          >
            {standbyTasks.map((task) => {
              return (
                <div
                  key={task.id}
                  className={`bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow p-4 ${task.isBlocked ? 'border-l-2 border-l-[var(--status-blocked)]' : 'border-l-2 border-l-[var(--status-paused)]'} group relative cursor-pointer`}
                  onClick={() => handleCardSingleClick(task.id)}
                  onDoubleClick={() => handleCardDoubleClick(task)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[var(--foreground)] truncate">
                          {task.title}
                        </h3>
                        {task.isBlocked && (
                          <Badge variant="blocked" className="shrink-0">
                            {t('dashboard.card.blocked')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardOverflowMenu
                      open={openMenuId === task.id}
                      onToggle={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                      items={[
                        {
                          label: t('dashboard.actions.comments'),
                          onClick: () => handleOpenComments(task.id),
                        },
                        {
                          label: t('dashboard.actions.history'),
                          onClick: () => handleOpenHistory(task.id),
                        },
                        ...(user?.isAdmin
                          ? [
                              {
                                label: t('dashboard.actions.delete'),
                                onClick: () => handleDelete(task.id),
                                className: 'text-red-600',
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                  <p className="text-sm text-[var(--foreground-secondary)] line-clamp-2 mb-2">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {task.owner && (
                        <>
                          <Avatar
                            name={task.owner.name}
                            avatarUrl={task.owner.avatarUrl}
                            size="sm"
                          />
                          <span className="text-xs text-[var(--foreground-secondary)]">
                            {task.owner.name}
                          </span>
                        </>
                      )}
                    </div>
                    {task.timeEntries.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm">⏱</span>
                        <Timer entries={task.timeEntries} />
                      </div>
                    )}
                  </div>
                  {/* Hover/tap actions */}
                  <div
                    className={`card-actions border-t border-[var(--border)]/60 pt-2 ${expandedCardId === task.id ? 'card-actions--expanded' : ''}`}
                  >
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const defaultOwner = task.ownerId
                            ? availableMembers.find((m) => m.id === task.ownerId)
                              ? task.ownerId
                              : availableMembers.find((m) => m.id === user?.id)
                                ? user?.id || ''
                                : availableMembers[0]?.id || ''
                            : availableMembers.find((m) => m.id === user?.id)
                              ? user?.id || ''
                              : availableMembers[0]?.id || '';
                          setActivateOwnerId(defaultOwner);
                          setActivateModal({ taskId: task.id, isBlocked: task.isBlocked });
                        }}
                        className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-blue-100 px-3 py-0.5 text-sm text-blue-800 transition-all duration-200 hover:bg-blue-200"
                      >
                        {t('dashboard.actions.reactivate')}
                      </button>
                      {(task.ownerId === user?.id || user?.isAdmin) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditModal({ task });
                            setEditTitle(task.title);
                            setEditDesc(task.description);
                            setEditEstimatedHours(
                              task.estimatedHours != null ? String(task.estimatedHours) : '',
                            );
                          }}
                          className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-0.5 text-sm transition-all duration-200 hover:bg-[var(--surface-hover)]"
                        >
                          {t('dashboard.actions.edit')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </KanbanColumn>

          {/* ========== In Progress Column ========== */}
          <KanbanColumn
            id="in_progress"
            title={t('dashboard.columns.inProgress')}
            count={inProgressTasks.length}
            icon={
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            collapsed={false}
            onToggleCollapse={() => {}}
            collapsible={false}
            colorClass="text-blue-700"
            badgeClass="bg-blue-100 text-blue-600"
            titleClass="text-blue-700"
            emptyMessage={t('dashboard.empty.inProgress')}
          >
            {inProgressTasks.map((task) => {
              const hasOpenEntry = task.timeEntries.some((e) => !e.endedAt);
              const hasAnyEntry = task.timeEntries.length > 0;
              const isPaused = hasAnyEntry && !hasOpenEntry;
              const isNotStarted = !hasAnyEntry;
              const isMyTask = task.ownerId === user?.id;
              const expectedHours = isMyTask && heartbeatData ? heartbeatData.expectedHours : 8;
              const workedTodayMs = calcTodayTime(task.timeEntries);
              const workedTodayHours = workedTodayMs / 3600000;
              const totalMs = calcTotalTime(task.timeEntries);
              const totalHours = totalMs / 3600000;
              const hasEstimate =
                task.estimatedHours !== null && task.estimatedHours !== undefined;
              const estimatedH = hasEstimate ? Number(task.estimatedHours) : null;
              const deadlineExceeded = hasEstimate && totalHours >= estimatedH!;
              const progressBase = hasEstimate ? estimatedH! : expectedHours;
              const progressValue = hasEstimate ? totalHours : workedTodayHours;
              const progressPercent = Math.min((progressValue / progressBase) * 100, 100);
              const isOvertime = hasEstimate
                ? deadlineExceeded
                : workedTodayHours > expectedHours;
              return (
                <div
                  key={task.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow p-4 border-l-2 border-l-[var(--status-active)] group relative cursor-pointer"
                  onClick={() => handleCardSingleClick(task.id)}
                  onDoubleClick={() => handleCardDoubleClick(task)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3 className="text-base font-bold text-[var(--foreground)] truncate">
                        {task.title}
                      </h3>
                      {deadlineExceeded && (
                        <span className="shrink-0 text-xs font-bold bg-red-200 text-red-800 px-1.5 py-0.5 rounded">
                          {t('dashboard.card.deadlineExceeded')}
                        </span>
                      )}
                    </div>
                    <CardOverflowMenu
                      open={openMenuId === task.id}
                      onToggle={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                      items={[
                        ...(isMyTask || user?.isAdmin
                          ? [
                              {
                                label: t('dashboard.actions.edit'),
                                onClick: () => {
                                  setEditModal({ task });
                                  setEditTitle(task.title);
                                  setEditDesc(task.description);
                                  setEditEstimatedHours(
                                    task.estimatedHours != null
                                      ? String(task.estimatedHours)
                                      : '',
                                  );
                                },
                              },
                            ]
                          : []),
                        {
                          label: t('dashboard.actions.comments'),
                          onClick: () => handleOpenComments(task.id),
                        },
                        ...(user?.isAdmin
                          ? [
                              {
                                label: t('dashboard.actions.changeOwner'),
                                onClick: () => {
                                  setOwnerModal({
                                    taskId: task.id,
                                    currentOwnerId: task.ownerId || '',
                                  });
                                  setNewOwnerId('');
                                },
                              },
                            ]
                          : []),
                        {
                          label: t('dashboard.actions.history'),
                          onClick: () => handleOpenHistory(task.id),
                        },
                      ]}
                    />
                  </div>
                  <p className="text-sm text-[var(--foreground-secondary)] line-clamp-2 mb-2">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {task.owner && (
                        <>
                          <Avatar
                            name={task.owner.name}
                            avatarUrl={task.owner.avatarUrl}
                            size="sm"
                          />
                          <span className="text-xs font-semibold text-[var(--foreground)]">
                            {task.owner.name}
                          </span>
                        </>
                      )}
                      {/* Active/Paused/Not Started indicator */}
                      {isNotStarted ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                          {t('dashboard.card.notStarted')}
                        </span>
                      ) : isPaused ? (
                        <span className="flex items-center gap-1 text-xs text-[var(--foreground-muted)]">
                          <span className="w-2 h-2 rounded-full bg-[var(--foreground-muted)] inline-block" />
                          {t('dashboard.card.paused')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
                          {t('dashboard.card.active')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isNotStarted && (
                        <>
                          <span className="text-sm">⏱</span>
                          <Timer entries={task.timeEntries} todayOnly />
                        </>
                      )}
                      {hasEstimate && (
                        <span
                          className={`text-xs font-medium ml-1 ${deadlineExceeded ? 'text-red-600' : 'text-[var(--foreground-muted)]'}`}
                        >
                          / {formatHoursCompact(estimatedH!)} {t('dashboard.card.estimated')}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Prediction line */}
                  {task.predictedCompletion && !deadlineExceeded && (
                    <div className="mt-1 text-xs text-[var(--foreground-secondary)]">
                      {t('dashboard.card.prediction')}:{' '}
                      {new Date(task.predictedCompletion).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </div>
                  )}
                  {/* Progress bar */}
                  {!isNotStarted && (
                    <div className="mt-2 h-1.5 bg-stone-200/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${isOvertime ? 'bg-orange-400' : 'bg-blue-400'}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                  {/* Start tracking button for not-started tasks */}
                  {isNotStarted && (isMyTask || user?.isAdmin) && (
                    <div className="mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openStartTrackingModal(task.id);
                        }}
                        className="inline-flex items-center justify-center gap-2 font-semibold rounded-lg border border-[var(--border)] bg-emerald-100 px-3 py-1.5 text-sm text-emerald-800 transition-all duration-200 hover:bg-emerald-200 w-full"
                      >
                        {t('dashboard.actions.startTracking')}
                      </button>
                    </div>
                  )}
                  {/* Hover/tap actions */}
                  {!isNotStarted && (isMyTask || user?.isAdmin) && (
                    <div
                      className={`card-actions border-t border-[var(--border)]/60 pt-2 ${expandedCardId === task.id ? 'card-actions--expanded' : ''}`}
                    >
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleComplete(task.id);
                          }}
                          className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-green-100 px-3 py-0.5 text-sm text-green-800 transition-all duration-200 hover:bg-green-200"
                        >
                          {t('dashboard.actions.complete')}
                        </button>
                        {isPaused ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResume(task.id);
                            }}
                            className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-blue-100 px-3 py-0.5 text-sm text-blue-800 transition-all duration-200 hover:bg-blue-200"
                          >
                            {t('dashboard.actions.resume')}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePause(task.id);
                            }}
                            className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] px-3 py-0.5 text-sm text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)]"
                          >
                            {t('dashboard.actions.pause')}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBlockModal({ taskId: task.id });
                          }}
                          className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-red-100 px-3 py-0.5 text-sm text-red-800 transition-all duration-200 hover:bg-red-200"
                        >
                          {t('dashboard.actions.block')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </KanbanColumn>

          {/* ========== Done Column ========== */}
          <KanbanColumn
            id="done"
            title={t('dashboard.columns.done')}
            count={doneTasksVisible.length}
            icon={
              <svg
                className="w-5 h-5 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            collapsed={collapsedCols.has('done')}
            onToggleCollapse={() => toggleCol('done')}
            colorClass="text-emerald-700"
            badgeClass="bg-green-100 text-green-600"
            titleClass="text-emerald-700"
            emptyMessage={
              doneTasksArchived.length === 0 ? t('dashboard.empty.done') : undefined
            }
          >
            {doneTasksVisible.map((task) => (
              <div
                key={task.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow p-4 border-l-2 border-l-[var(--status-done)] opacity-80 group relative cursor-pointer"
                onClick={() => handleCardSingleClick(task.id)}
                onDoubleClick={() => handleCardDoubleClick(task)}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-base font-bold text-[var(--foreground-secondary)] line-through truncate flex-1 min-w-0">
                    {task.title}
                  </h3>
                  <CardOverflowMenu
                    open={openMenuId === task.id}
                    onToggle={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                    items={[
                      {
                        label: t('dashboard.actions.comments'),
                        onClick: () => handleOpenComments(task.id, true),
                      },
                      {
                        label: t('dashboard.actions.history'),
                        onClick: () => handleOpenHistory(task.id),
                      },
                      ...(task.ownerId === user?.id || user?.isAdmin
                        ? [
                            {
                              label: t('dashboard.actions.archive'),
                              onClick: () => handleArchive(task.id),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {task.owner && (
                      <>
                        <Avatar
                          name={task.owner.name}
                          avatarUrl={task.owner.avatarUrl}
                          size="sm"
                        />
                        <span className="text-xs text-[var(--foreground-muted)]">
                          {task.owner.name}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {task.completedAt && (
                      <span className="text-xs text-[var(--foreground-muted)]">
                        {new Date(task.completedAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-sm">⏱</span>
                      <Timer entries={task.timeEntries} />
                    </div>
                  </div>
                </div>
                {/* Hover/tap actions */}
                {(task.ownerId === user?.id || user?.isAdmin) && (
                  <div
                    className={`card-actions border-t border-[var(--border)]/60 pt-2 ${expandedCardId === task.id ? 'card-actions--expanded' : ''}`}
                  >
                    <div className="flex gap-1.5 flex-wrap">
                      {task.undoCount >= 3 ? (
                        <span className="text-xs text-orange-600 font-semibold">
                          {t('dashboard.card.undoLimit')}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUndo(task.id);
                          }}
                          className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-orange-100 px-3 py-0.5 text-sm text-orange-800 transition-all duration-200 hover:bg-orange-200"
                        >
                          {t('dashboard.actions.undo')} (
                          {t('dashboard.card.undoRemaining', { count: 3 - task.undoCount })})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Archived section */}
            {doneTasksArchived.length > 0 && (
              <div>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] px-3 py-0.5 text-sm text-[var(--foreground-secondary)] transition-all duration-200 hover:bg-[var(--surface-hover)] w-full"
                >
                  {showArchived
                    ? t('dashboard.actions.hideArchived', { count: doneTasksArchived.length })
                    : t('dashboard.actions.showArchived', {
                        count: doneTasksArchived.length,
                      })}
                </button>
                {showArchived && (
                  <div className="space-y-4 mt-4">
                    {doneTasksArchived.map((task) => (
                      <div
                        key={task.id}
                        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow p-4 border-l-2 border-l-stone-300 opacity-60 group relative cursor-pointer"
                        onClick={() => handleCardSingleClick(task.id)}
                        onDoubleClick={() => handleCardDoubleClick(task)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-base font-bold text-[var(--foreground-secondary)] line-through truncate flex-1 min-w-0">
                            {task.title}
                          </h3>
                          <CardOverflowMenu
                            open={openMenuId === task.id}
                            onToggle={() =>
                              setOpenMenuId(openMenuId === task.id ? null : task.id)
                            }
                            items={[
                              {
                                label: t('dashboard.actions.history'),
                                onClick: () => handleOpenHistory(task.id),
                              },
                            ]}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {task.owner && (
                              <>
                                <Avatar
                                  name={task.owner.name}
                                  avatarUrl={task.owner.avatarUrl}
                                  size="sm"
                                />
                                <span className="text-xs text-[var(--foreground-muted)]">
                                  {task.owner.name}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm">⏱</span>
                            <Timer entries={task.timeEntries} />
                          </div>
                        </div>
                        {/* Hover/tap actions */}
                        {(task.ownerId === user?.id || user?.isAdmin) && (
                          <div
                            className={`card-actions border-t border-[var(--border)]/60 pt-2 ${expandedCardId === task.id ? 'card-actions--expanded' : ''}`}
                          >
                            <div className="flex gap-1.5 flex-wrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnarchive(task.id);
                                }}
                                className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-blue-100 px-3 py-0.5 text-sm text-blue-800 transition-all duration-200 hover:bg-blue-200"
                              >
                                {t('dashboard.actions.unarchive')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </KanbanColumn>
        </KanbanBoard>

        {/* All Modals */}
        <Modals
          blockModal={blockModal}
          blockReason={blockReason}
          setBlockReason={setBlockReason}
          onBlock={handleBlock}
          onCloseBlock={() => setBlockModal(null)}
          activateModal={activateModal}
          activateOwnerId={activateOwnerId}
          setActivateOwnerId={setActivateOwnerId}
          resolutionNote={resolutionNote}
          setResolutionNote={setResolutionNote}
          onActivate={handleActivate}
          onCloseActivate={() => setActivateModal(null)}
          isAdmin={!!user?.isAdmin}
          availableMembers={availableMembers}
          busyMemberIds={busyMemberIds}
          userId={user?.id || ''}
          userName={user?.name || ''}
          ownerModal={ownerModal}
          newOwnerId={newOwnerId}
          setNewOwnerId={setNewOwnerId}
          members={members}
          onChangeOwner={handleChangeOwner}
          onCloseOwner={() => setOwnerModal(null)}
          editModal={editModal}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          editDesc={editDesc}
          setEditDesc={setEditDesc}
          editEstimatedHours={editEstimatedHours}
          setEditEstimatedHours={setEditEstimatedHours}
          onEdit={handleEdit}
          onCloseEdit={() => setEditModal(null)}
          commentModal={commentModal}
          comments={comments}
          newComment={newComment}
          setNewComment={setNewComment}
          onAddComment={handleAddComment}
          onCloseComments={() => {
            setCommentModal(null);
          }}
          createModal={createModal}
          createTitle={createTitle}
          setCreateTitle={setCreateTitle}
          createDesc={createDesc}
          setCreateDesc={setCreateDesc}
          createEstimatedHours={createEstimatedHours}
          setCreateEstimatedHours={setCreateEstimatedHours}
          onCreate={handleCreate}
          onCloseCreate={() => setCreateModal(false)}
          showResumeModal={showResumeModal}
          onResume={handleResume}
          onCloseResume={() => setShowResumeModal(null)}
          startTrackingModal={startTrackingModal}
          onStartTracking={handleStartTracking}
          onCloseStartTracking={() => setStartTrackingModal(null)}
          historyModal={historyModal}
          history={history}
          formatHistoryAction={formatHistoryAction}
          onCloseHistory={() => {
            setHistoryModal(null);
            setHistory(null);
          }}
        />

        {/* Task Detail Modal (double-click) */}
        {detailModalTask && (
          <TaskDetailModal
            task={detailModalTask}
            comments={detailComments}
            history={detailHistory}
            loading={detailLoading}
            onClose={() => {
              setDetailModalTask(null);
              setDetailNewComment('');
            }}
            newComment={detailNewComment}
            onNewCommentChange={setDetailNewComment}
            onAddComment={handleDetailAddComment}
            user={user}
            members={members}
            availableMembers={availableMembers}
            busyMemberIds={busyMemberIds}
            onActivate={(task) => {
              const defaultOwner = availableMembers.find((m) => m.id === user?.id)
                ? user?.id || ''
                : availableMembers[0]?.id || '';
              setActivateOwnerId(defaultOwner);
              setActivateModal({ taskId: task.id, isBlocked: task.isBlocked });
            }}
            onComplete={handleComplete}
            onBlock={(taskId) => setBlockModal({ taskId })}
            onPause={handlePause}
            onResume={handleResume}
            onStartTracking={openStartTrackingModal}
            onEdit={(task) => {
              setEditModal({ task });
              setEditTitle(task.title);
              setEditDesc(task.description);
              setEditEstimatedHours(task.estimatedHours != null ? String(task.estimatedHours) : '');
            }}
            onChangeOwner={(taskId, ownerId) => {
              setOwnerModal({ taskId, currentOwnerId: ownerId });
              setNewOwnerId('');
            }}
            onUndo={handleUndo}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            onDelete={(taskId) => {
              handleDelete(taskId);
              setDetailModalTask(null);
            }}
            onOpenHistory={handleOpenHistory}
          />
        )}

        {/* Quick Complete feedback banner -- auto-dismisses after 5s */}
        {quickCompleteTask && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] px-6 py-4 flex flex-col gap-3 min-w-[320px] max-w-[480px] animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-[var(--foreground)]">
                {t('quickComplete.title')}
              </span>
              <button
                onClick={() => setQuickCompleteTask(null)}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] text-xs"
              >
                {t('quickComplete.dismiss')}
              </button>
            </div>
            <p className="text-sm text-[var(--foreground-secondary)]">
              {t('quickComplete.question')}
            </p>
            <div className="flex gap-2">
              {[
                { key: 'lessThan', emoji: '\u{1F680}' },
                { key: 'asExpected', emoji: '\u{1F3AF}' },
                { key: 'moreThan', emoji: '\u{231B}' },
              ].map(({ key, emoji }) => (
                <button
                  key={key}
                  onClick={() => setQuickCompleteTask(null)}
                  className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] hover:bg-[var(--border)] transition-colors"
                >
                  {emoji} {t(`quickComplete.${key}` as any)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Daily Digest -- shown after 5h worked or after 5pm */}
        {showDailyDigest && heartbeatData && (
          <div className="fixed bottom-6 right-6 z-40 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] px-5 py-4 max-w-[280px] flex flex-col gap-1">
            <button
              onClick={() => setShowDailyDigest(false)}
              className="absolute top-2 right-3 text-[var(--foreground-muted)] text-xs hover:text-[var(--foreground)]"
            >
              {'\u2715'}
            </button>
            <p className="font-semibold text-[var(--foreground)] text-sm">
              {t('dailyDigest.worked', { hours: (heartbeatData.workedHoursToday ?? 0).toFixed(1) })}
            </p>
            <p className="text-xs text-[var(--foreground-secondary)]">
              {tasks.filter((t) => t.status === 'done').length === 1
                ? t('dailyDigest.tasks', { count: 1 })
                : t('dailyDigest.tasksPlural', {
                    count: tasks.filter((task) => task.status === 'done').length,
                  })}
            </p>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              {t('dailyDigest.goodWork')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
