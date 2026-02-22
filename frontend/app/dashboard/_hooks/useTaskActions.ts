'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { Task, TaskHistory } from '@/lib/types';

interface UseTaskActionsParams {
  user: { id: string; isAdmin?: boolean } | null;
  tasks: Task[];
  fetchData: () => Promise<void>;
  setError: (msg: string) => void;
  translateError: (msg: string) => string;
  t: (key: string, params?: Record<string, any>) => string;
}

export function useTaskActions({
  user,
  tasks,
  fetchData,
  setError,
  translateError,
  t,
}: UseTaskActionsParams) {
  // --- Modal states ---
  const [blockModal, setBlockModal] = useState<{ taskId: string } | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [activateModal, setActivateModal] = useState<{ taskId: string; isBlocked: boolean } | null>(
    null,
  );
  const [resolutionNote, setResolutionNote] = useState('');
  const [activateOwnerId, setActivateOwnerId] = useState('');
  const [ownerModal, setOwnerModal] = useState<{ taskId: string; currentOwnerId: string } | null>(
    null,
  );
  const [newOwnerId, setNewOwnerId] = useState('');
  const [editModal, setEditModal] = useState<{ task: Task } | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editEstimatedHours, setEditEstimatedHours] = useState('');
  const [commentModal, setCommentModal] = useState<{ taskId: string; readOnly?: boolean } | null>(
    null,
  );
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createEstimatedHours, setCreateEstimatedHours] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [startTrackingModal, setStartTrackingModal] = useState<{ task: Task } | null>(null);
  const [historyModal, setHistoryModal] = useState<{ taskId: string } | null>(null);
  const [history, setHistory] = useState<TaskHistory | null>(null);

  // Detail modal states (double-click)
  const [detailModalTask, setDetailModalTask] = useState<Task | null>(null);
  const [detailComments, setDetailComments] = useState<any[]>([]);
  const [detailHistory, setDetailHistory] = useState<TaskHistory | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailNewComment, setDetailNewComment] = useState('');
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Quick Complete feedback banner (5s auto-dismiss)
  const [quickCompleteTask, setQuickCompleteTask] = useState<Task | null>(null);
  const quickCompleteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Card interaction state
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // --- Handlers ---

  const handleBlock = useCallback(async () => {
    if (!blockModal || !blockReason.trim()) return;
    try {
      await api.blockTask(blockModal.taskId, blockReason);
      setBlockModal(null);
      setBlockReason('');
      fetchData();
    } catch (err: any) {
      setError(translateError(err.message));
    }
  }, [blockModal, blockReason, fetchData, setError, translateError]);

  const handleActivate = useCallback(async () => {
    if (!activateModal) return;
    if (activateModal.isBlocked && !resolutionNote.trim()) {
      setError(t('toasts.resolutionRequired'));
      return;
    }
    try {
      const ownerId = user?.isAdmin ? activateOwnerId || user?.id : user?.id;
      await api.activateTask(activateModal.taskId, ownerId, resolutionNote || undefined);
      setActivateModal(null);
      setResolutionNote('');
      setActivateOwnerId('');
      setError('');
      fetchData();
    } catch (err: any) {
      setError(translateError(err.message));
    }
  }, [activateModal, resolutionNote, activateOwnerId, user, fetchData, setError, translateError, t]);

  const handleComplete = useCallback(
    async (taskId: string) => {
      try {
        const task = tasks.find((t) => t.id === taskId);
        await api.completeTask(taskId);
        fetchData();
        // Show Quick Complete feedback banner for 5s
        if (task) {
          setQuickCompleteTask(task);
          if (quickCompleteTimerRef.current) clearTimeout(quickCompleteTimerRef.current);
          quickCompleteTimerRef.current = setTimeout(() => setQuickCompleteTask(null), 5000);
        }
      } catch (err: any) {
        setError(translateError(err.message));
      }
    },
    [tasks, fetchData, setError, translateError],
  );

  const handleUndo = useCallback(
    async (taskId: string) => {
      try {
        await api.undoTask(taskId);
        fetchData();
      } catch (err: any) {
        setError(translateError(err.message));
      }
    },
    [fetchData, setError, translateError],
  );

  const handleChangeOwner = useCallback(async () => {
    if (!ownerModal || !newOwnerId) return;
    try {
      await api.changeOwner(ownerModal.taskId, newOwnerId);
      setOwnerModal(null);
      setNewOwnerId('');
      fetchData();
    } catch (err: any) {
      setError(translateError(err.message));
    }
  }, [ownerModal, newOwnerId, fetchData, setError, translateError]);

  const handleEdit = useCallback(async () => {
    if (!editModal) return;
    try {
      const hours = editEstimatedHours ? parseFloat(editEstimatedHours) : undefined;
      await api.updateTask(editModal.task.id, {
        title: editTitle,
        description: editDesc,
        estimatedHours: hours,
      });
      setEditModal(null);
      fetchData();
    } catch (err: any) {
      setError(translateError(err.message));
    }
  }, [editModal, editTitle, editDesc, editEstimatedHours, fetchData, setError, translateError]);

  const handleOpenComments = useCallback(
    async (taskId: string, readOnly?: boolean) => {
      setCommentModal({ taskId, readOnly });
      try {
        const data = await api.getComments(taskId);
        setComments(data);
      } catch (err: any) {
        setError(translateError(err.message));
      }
    },
    [setError, translateError],
  );

  const handleAddComment = useCallback(async () => {
    if (!commentModal || !newComment.trim()) return;
    try {
      await api.addComment(commentModal.taskId, newComment);
      setNewComment('');
      const data = await api.getComments(commentModal.taskId);
      setComments(data);
    } catch (err: any) {
      setError(translateError(err.message));
    }
  }, [commentModal, newComment, setError, translateError]);

  const handleCreate = useCallback(async () => {
    if (!createTitle.trim()) return;
    try {
      const hours = createEstimatedHours ? parseFloat(createEstimatedHours) : undefined;
      await api.createTask(createTitle, createDesc, hours);
      setCreateModal(false);
      setCreateTitle('');
      setCreateDesc('');
      setCreateEstimatedHours('');
      fetchData();
    } catch (err: any) {
      setError(translateError(err.message));
    }
  }, [createTitle, createDesc, createEstimatedHours, fetchData, setError, translateError]);

  const handleDelete = useCallback(
    async (taskId: string) => {
      try {
        await api.deleteTask(taskId);
        fetchData();
      } catch (err: any) {
        setError(translateError(err.message));
      }
    },
    [fetchData, setError, translateError],
  );

  const handleArchive = useCallback(
    async (taskId: string) => {
      try {
        await api.archiveTask(taskId);
        fetchData();
      } catch (err: any) {
        setError(translateError(err.message));
      }
    },
    [fetchData, setError, translateError],
  );

  const handleUnarchive = useCallback(
    async (taskId: string) => {
      try {
        await api.unarchiveTask(taskId);
        fetchData();
      } catch (err: any) {
        setError(translateError(err.message));
      }
    },
    [fetchData, setError, translateError],
  );

  const handlePause = useCallback(
    async (taskId: string) => {
      try {
        await api.pauseTask(taskId);
        fetchData();
      } catch (err: any) {
        setError(translateError(err.message));
      }
    },
    [fetchData, setError, translateError],
  );

  const handleResume = useCallback(
    async (taskId: string) => {
      try {
        await api.resumeTask(taskId);
        fetchData();
      } catch (err: any) {
        setError(translateError(err.message));
      }
    },
    [fetchData, setError, translateError],
  );

  const openStartTrackingModal = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) setStartTrackingModal({ task });
    },
    [tasks],
  );

  const handleStartTracking = useCallback(
    async (taskId: string) => {
      try {
        await api.startTracking(taskId);
        setStartTrackingModal(null);
        fetchData();
      } catch (err: any) {
        setError(translateError(err.message));
      }
    },
    [fetchData, setError, translateError],
  );

  const handleOpenHistory = useCallback(
    async (taskId: string) => {
      setHistoryModal({ taskId });
      setHistory(null);
      try {
        const data = await api.getTaskHistory(taskId);
        setHistory(data);
      } catch (err: any) {
        setError(translateError(err.message));
      }
    },
    [setError, translateError],
  );

  // Detail modal: fetch fresh data on open
  useEffect(() => {
    if (!detailModalTask) return;
    let cancelled = false;
    const taskId = detailModalTask.id;
    Promise.all([api.getTask(taskId), api.getComments(taskId), api.getTaskHistory(taskId)])
      .then(([freshTask, freshComments, freshHistory]) => {
        if (cancelled) return;
        setDetailModalTask(freshTask);
        setDetailComments(freshComments);
        setDetailHistory(freshHistory);
        setDetailLoading(false);
      })
      .catch(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailModalTask?.id]);

  // Detail modal: sync when tasks array updates (after actions)
  useEffect(() => {
    if (!detailModalTask) return;
    const updated = tasks.find((t) => t.id === detailModalTask.id);
    if (updated) {
      setDetailModalTask(updated);
      api
        .getComments(detailModalTask.id)
        .then(setDetailComments)
        .catch(() => {});
    } else {
      setDetailModalTask(null); // task was deleted
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // Detail modal: add comment inline
  const handleDetailAddComment = useCallback(async () => {
    if (!detailModalTask || !detailNewComment.trim()) return;
    try {
      await api.addComment(detailModalTask.id, detailNewComment);
      setDetailNewComment('');
      const fresh = await api.getComments(detailModalTask.id);
      setDetailComments(fresh);
    } catch (err: any) {
      setError(translateError(err.message));
    }
  }, [detailModalTask, detailNewComment, setError, translateError]);

  const formatHistoryAction = useCallback(
    (entry: TaskHistory['entries'][0]) => {
      const { action, oldData, newData } = entry;
      if (action === 'create') return t('historyActions.created');
      if (action === 'delete') return t('historyActions.deleted');
      if (
        newData?.status === 'in_progress' &&
        (oldData?.status === 'backlog' || oldData?.status === 'standby')
      )
        return t('historyActions.activated');
      if (newData?.status === 'active' && oldData?.status === 'backlog')
        return t('historyActions.activated'); // legacy
      if (newData?.status === 'done') return t('historyActions.completed');
      if (newData?.status === 'standby' && oldData?.status === 'done')
        return t('historyActions.undone');
      if (newData?.status === 'backlog' && oldData?.status === 'done')
        return t('historyActions.undone'); // legacy
      if (newData?.status === 'standby' && newData?.isBlocked)
        return `${t('historyActions.blocked')}: ${newData.blockReason || ''}`;
      if (newData?.status === 'backlog' && newData?.isBlocked)
        return `${t('historyActions.blocked')}: ${newData.blockReason || ''}`; // legacy
      if (newData?.isArchived === true) return t('historyActions.archived');
      if (newData?.isArchived === false) return t('historyActions.unarchived');
      if (newData?.paused === true) return t('historyActions.paused');
      if (newData?.paused === false && oldData?.paused === true) return t('historyActions.resumed');
      if (newData?.tracking === true) return t('historyActions.startedTracking');
      if (newData?.ownerId && oldData?.ownerId && newData.ownerId !== oldData.ownerId)
        return t('historyActions.ownerChanged');
      return t('historyActions.updated');
    },
    [t],
  );

  // Card click handlers: single-click expands, double-click opens detail modal
  const handleCardSingleClick = useCallback(
    (taskId: string) => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        setExpandedCardId((prev: string | null) => (prev === taskId ? null : taskId));
      }, 250);
    },
    [],
  );

  const handleCardDoubleClick = useCallback((task: Task) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setDetailModalTask(task);
    setDetailComments([]);
    setDetailHistory(null);
    setDetailLoading(true);
  }, []);

  return {
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
    setComments,
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
    setDetailComments,
    detailHistory,
    setDetailHistory,
    detailLoading,
    setDetailLoading,
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
    setExpandedCardId,
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
  };
}
