'use client';

import { useTranslations } from 'next-intl';
import { Task, TeamMember, TaskHistory } from '@/lib/types';
import { calcTotalTime, formatHoursCompact } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import Timer from './Timer';
import Modal from './Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';

export default function TaskDetailModal({
  task,
  comments,
  history,
  loading,
  onClose,
  newComment,
  onNewCommentChange,
  onAddComment,
  user,
  members: _members,
  availableMembers: _availableMembers,
  busyMemberIds: _busyMemberIds,
  onActivate,
  onComplete,
  onBlock,
  onPause,
  onResume,
  onStartTracking,
  onEdit,
  onChangeOwner,
  onUndo,
  onArchive,
  onUnarchive,
  onDelete,
  onOpenHistory,
}: {
  task: Task;
  comments: any[];
  history: TaskHistory | null;
  loading: boolean;
  onClose: () => void;
  newComment: string;
  onNewCommentChange: (val: string) => void;
  onAddComment: () => void;
  user: any;
  members: TeamMember[];
  availableMembers: TeamMember[];
  busyMemberIds: Set<string | null>;
  onActivate: (task: Task) => void;
  onComplete: (taskId: string) => void;
  onBlock: (taskId: string) => void;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onStartTracking: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onChangeOwner: (taskId: string, ownerId: string) => void;
  onUndo: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onUnarchive: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onOpenHistory: (taskId: string) => void;
}) {
  const t = useTranslations();
  const isMyTask = task.ownerId === user?.id;
  const canEdit = isMyTask || user?.isAdmin;
  const hasOpenEntry = task.timeEntries.some(e => !e.endedAt);
  const hasAnyEntry = task.timeEntries.length > 0;
  const isPaused = task.status === 'in_progress' && hasAnyEntry && !hasOpenEntry;
  const isNotStarted = task.status === 'in_progress' && !hasAnyEntry;
  const totalMs = calcTotalTime(task.timeEntries);
  const hasEstimate = task.estimatedHours !== null && task.estimatedHours !== undefined;
  const estimatedH = hasEstimate ? Number(task.estimatedHours) : null;
  const totalHours = totalMs / 3600000;
  const progressPercent = hasEstimate && estimatedH! > 0 ? Math.min((totalHours / estimatedH!) * 100, 100) : 0;
  const deadlineExceeded = hasEstimate && totalHours >= estimatedH!;

  const statusBadgeVariant = task.status === 'backlog' ? 'default' as const
    : task.status === 'standby' ? 'paused' as const
    : task.status === 'in_progress' ? 'active' as const
    : 'done' as const;

  const statusLabel = task.status === 'backlog' ? t('status.backlog')
    : task.status === 'standby' ? t('status.standby')
    : task.status === 'in_progress' ? t('status.inProgress')
    : t('status.done');

  return (
    <Modal open={true} onClose={onClose} title={task.title} size="xl">
      {/* Custom header badges below the title */}
      <div className="flex items-center gap-2 flex-wrap -mt-2 mb-4">
        <Badge variant={statusBadgeVariant}>{statusLabel}</Badge>
        {task.isBlocked && <Badge variant="blocked" dot>{t('dashboard.card.blocked')}</Badge>}
        {task.isArchived && <Badge variant="default">{t('dashboard.card.archived')}</Badge>}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--foreground-muted)] py-8 text-center">{t('detail.loadingDetails')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left column (3/5) */}
          <div className="md:col-span-3 space-y-5">
            {/* Description */}
            {task.description && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('detail.description')}</h3>
                <p className="text-sm text-[var(--foreground-secondary)] whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Time */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-2">{t('detail.time')}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-[var(--background-secondary)] rounded-lg p-2 border border-[var(--border-light)]">
                  <span className="text-[var(--foreground-muted)] text-xs">{t('detail.total')}</span>
                  <div className="font-semibold text-[var(--foreground)]">
                    <Timer entries={task.timeEntries} />
                  </div>
                </div>
                <div className="bg-[var(--background-secondary)] rounded-lg p-2 border border-[var(--border-light)]">
                  <span className="text-[var(--foreground-muted)] text-xs">{t('detail.today')}</span>
                  <div className="font-semibold text-[var(--foreground)]">
                    <Timer entries={task.timeEntries} todayOnly />
                  </div>
                </div>
                {hasEstimate && (
                  <div className="bg-[var(--background-secondary)] rounded-lg p-2 border border-[var(--border-light)]">
                    <span className="text-[var(--foreground-muted)] text-xs">{t('detail.estimate')}</span>
                    <div className={`font-semibold ${deadlineExceeded ? 'text-[var(--status-blocked)]' : 'text-[var(--foreground)]'}`}>
                      {formatHoursCompact(estimatedH!)}
                    </div>
                  </div>
                )}
                {task.predictedCompletion && !deadlineExceeded && (
                  <div className="bg-[var(--background-secondary)] rounded-lg p-2 border border-[var(--border-light)]">
                    <span className="text-[var(--foreground-muted)] text-xs">{t('detail.prediction')}</span>
                    <div className="font-semibold text-[var(--foreground)]">
                      {new Date(task.predictedCompletion).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>
              {hasEstimate && (
                <div className="mt-2 h-2 bg-[var(--background-secondary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${deadlineExceeded ? 'bg-[var(--status-paused)]' : 'bg-[var(--accent)]'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>

            {/* Blocks history */}
            {history && history.blocks && history.blocks.length > 0 && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-2">{t('detail.blocks')}</h3>
                <div className="space-y-2">
                  {history.blocks.map((block) => (
                    <div key={block.id} className="text-sm bg-[var(--status-blocked-bg)] rounded-lg p-2 border border-red-200">
                      <p className="font-medium text-[var(--status-blocked)]">{t('modals.history.blockReason')}: {block.blockReason}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {t('modals.history.blockedBy')}: {block.blockedBy?.name || t('common.member')} - {new Date(block.blockedAt).toLocaleString()}
                      </p>
                      {block.resolvedAt && (
                        <p className="text-xs text-[var(--status-active)]">
                          {t('modals.history.resolvedBy')}: {block.resolvedBy?.name || t('common.member')} - {block.resolutionNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-2">
                {t('detail.comments')} ({comments.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {comments.length === 0 && (
                  <p className="text-sm text-[var(--foreground-muted)]">{t('modals.comments.noComments')}</p>
                )}
                {comments.map((c: any) => (
                  <div key={c.id} className="bg-[var(--background-secondary)] rounded-lg p-2 border border-[var(--border-light)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[var(--foreground)]">{c.author?.name || t('common.member')}</span>
                      {c.isOwner && <Badge variant="owner">Owner</Badge>}
                      <span className="text-xs text-[var(--foreground-muted)] ml-auto">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--foreground-secondary)]">{c.content}</p>
                  </div>
                ))}
              </div>
              {task.status !== 'done' && task.status !== 'backlog' && (
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => onNewCommentChange(e.target.value)}
                    className="flex-1 h-14 text-sm"
                    placeholder={t('modals.comments.placeholder')}
                  />
                  <Button
                    onClick={onAddComment}
                    disabled={!newComment.trim()}
                    variant="primary"
                    size="sm"
                    className="self-end"
                  >
                    {t('common.send')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right column (2/5) */}
          <div className="md:col-span-2 space-y-5">
            {/* Info card */}
            <div className="bg-[var(--background-secondary)] rounded-xl border border-[var(--border-light)] p-4 space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)]">{t('detail.info')}</h3>
              {task.owner && (
                <div className="flex items-center gap-2">
                  <Avatar name={task.owner.name} avatarUrl={task.owner.avatarUrl} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{task.owner.name}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{t('detail.owner')}</p>
                  </div>
                </div>
              )}
              {task.status === 'in_progress' && (
                <div className="flex items-center gap-2 text-sm">
                  {isNotStarted ? (
                    <span className="flex items-center gap-1 text-[var(--status-paused)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--status-paused)] inline-block" />
                      {t('dashboard.card.notStarted')}
                    </span>
                  ) : isPaused ? (
                    <span className="flex items-center gap-1 text-[var(--foreground-muted)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--foreground-muted)] inline-block" />
                      {t('dashboard.card.paused')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[var(--status-active)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--status-active)] inline-block animate-pulse" />
                      {t('dashboard.card.timerActive')}
                    </span>
                  )}
                </div>
              )}
              <div className="text-xs text-[var(--foreground-muted)]">
                {t('detail.createdAt')}: {new Date(task.createdAt).toLocaleString()}
              </div>
              {task.completedAt && (
                <div className="text-xs text-[var(--foreground-muted)]">
                  {t('detail.completedAt')}: {new Date(task.completedAt).toLocaleString()}
                </div>
              )}
              {task.status === 'done' && (
                <div className="text-xs text-[var(--foreground-muted)]">
                  {t('detail.undoUsed', { used: task.undoCount })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)]">{t('detail.actions')}</h3>

              {/* Backlog actions */}
              {task.status === 'backlog' && (
                <>
                  <Button onClick={() => onActivate(task)} variant="primary" className="w-full">
                    {t('dashboard.actions.activate')}
                  </Button>
                  {canEdit && (
                    <Button onClick={() => onEdit(task)} variant="secondary" className="w-full">
                      {t('dashboard.actions.edit')}
                    </Button>
                  )}
                </>
              )}

              {/* Stand By actions */}
              {task.status === 'standby' && (
                <>
                  <Button onClick={() => onActivate(task)} variant="primary" className="w-full">
                    {t('dashboard.actions.reactivate')}
                  </Button>
                  {canEdit && (
                    <Button onClick={() => onEdit(task)} variant="secondary" className="w-full">
                      {t('dashboard.actions.edit')}
                    </Button>
                  )}
                </>
              )}

              {/* In Progress actions */}
              {task.status === 'in_progress' && canEdit && (
                <>
                  {isNotStarted && (
                    <Button onClick={() => onStartTracking(task.id)} variant="primary" className="w-full">
                      {t('dashboard.actions.startTracking')}
                    </Button>
                  )}
                  <Button onClick={() => onComplete(task.id)} variant="primary" className="w-full">
                    {t('dashboard.actions.complete')}
                  </Button>
                  {!isNotStarted && (isPaused ? (
                    <Button onClick={() => onResume(task.id)} variant="secondary" className="w-full">
                      {t('dashboard.actions.resume')}
                    </Button>
                  ) : (
                    <Button onClick={() => onPause(task.id)} variant="secondary" className="w-full">
                      {t('dashboard.actions.pause')}
                    </Button>
                  ))}
                  <Button onClick={() => onBlock(task.id)} variant="danger" className="w-full">
                    {t('dashboard.actions.block')}
                  </Button>
                  <Button onClick={() => onEdit(task)} variant="secondary" className="w-full">
                    {t('dashboard.actions.edit')}
                  </Button>
                  {user?.isAdmin && (
                    <Button onClick={() => onChangeOwner(task.id, task.ownerId || '')} variant="secondary" className="w-full">
                      {t('dashboard.actions.changeOwner')}
                    </Button>
                  )}
                </>
              )}

              {/* Done actions */}
              {task.status === 'done' && !task.isArchived && canEdit && (
                <>
                  {task.undoCount < 3 ? (
                    <Button onClick={() => onUndo(task.id)} variant="secondary" className="w-full">
                      {t('dashboard.actions.undo')} ({t('dashboard.card.undoRemaining', { count: 3 - task.undoCount })})
                    </Button>
                  ) : (
                    <span className="text-xs text-[var(--status-paused)] font-semibold block text-center">{t('detail.undoLimitReached')}</span>
                  )}
                  <Button onClick={() => onArchive(task.id)} variant="secondary" className="w-full">
                    {t('dashboard.actions.archive')}
                  </Button>
                </>
              )}

              {/* Archived actions */}
              {task.isArchived && canEdit && (
                <Button onClick={() => onUnarchive(task.id)} variant="secondary" className="w-full">
                  {t('dashboard.actions.unarchive')}
                </Button>
              )}

              {/* Common actions */}
              <Button onClick={() => onOpenHistory(task.id)} variant="ghost" className="w-full">
                {t('dashboard.actions.viewFullHistory')}
              </Button>

              {/* Admin: delete backlog/standby tasks */}
              {user?.isAdmin && (task.status === 'backlog' || task.status === 'standby') && (
                <Button onClick={() => onDelete(task.id)} variant="danger" className="w-full mt-2">
                  {t('dashboard.actions.delete')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
