'use client';

import { useTranslations } from 'next-intl';
import { Modal } from '@/components/dashboard';
import Badge from '@/components/ui/Badge';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Task, TeamMember, TaskHistory, AuditEntry } from '@/lib/types';
import { calcTotalTime, formatTime, formatHoursCompact } from '@/lib/utils';

export interface ModalsProps {
  // Block modal
  blockModal: { taskId: string } | null;
  blockReason: string;
  setBlockReason: (v: string) => void;
  onBlock: () => void;
  onCloseBlock: () => void;

  // Activate modal
  activateModal: { taskId: string; isBlocked: boolean } | null;
  activateOwnerId: string;
  setActivateOwnerId: (v: string) => void;
  resolutionNote: string;
  setResolutionNote: (v: string) => void;
  onActivate: () => void;
  onCloseActivate: () => void;
  isAdmin: boolean;
  availableMembers: TeamMember[];
  busyMemberIds: Set<string | null>;
  userId: string;
  userName: string;

  // Change owner modal
  ownerModal: { taskId: string; currentOwnerId: string } | null;
  newOwnerId: string;
  setNewOwnerId: (v: string) => void;
  members: TeamMember[];
  onChangeOwner: () => void;
  onCloseOwner: () => void;

  // Edit modal
  editModal: { task: Task } | null;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editDesc: string;
  setEditDesc: (v: string) => void;
  editEstimatedHours: string;
  setEditEstimatedHours: (v: string) => void;
  onEdit: () => void;
  onCloseEdit: () => void;

  // Comments modal
  commentModal: { taskId: string; readOnly?: boolean } | null;
  comments: any[];
  newComment: string;
  setNewComment: (v: string) => void;
  onAddComment: () => void;
  onCloseComments: () => void;

  // Create modal
  createModal: boolean;
  createTitle: string;
  setCreateTitle: (v: string) => void;
  createDesc: string;
  setCreateDesc: (v: string) => void;
  createEstimatedHours: string;
  setCreateEstimatedHours: (v: string) => void;
  onCreate: () => void;
  onCloseCreate: () => void;

  // Resume modal
  showResumeModal: string | null;
  onResume: (taskId: string) => void;
  onCloseResume: () => void;

  // Start tracking modal
  startTrackingModal: { task: Task } | null;
  onStartTracking: (taskId: string) => void;
  onCloseStartTracking: () => void;

  // History modal
  historyModal: { taskId: string } | null;
  history: TaskHistory | null;
  formatHistoryAction: (entry: AuditEntry) => string;
  onCloseHistory: () => void;
}

export default function Modals(props: ModalsProps) {
  const t = useTranslations();

  const {
    blockModal,
    blockReason,
    setBlockReason,
    onBlock,
    onCloseBlock,
    activateModal,
    activateOwnerId,
    setActivateOwnerId,
    resolutionNote,
    setResolutionNote,
    onActivate,
    onCloseActivate,
    isAdmin,
    availableMembers,
    busyMemberIds,
    userId,
    userName,
    ownerModal,
    newOwnerId,
    setNewOwnerId,
    members,
    onChangeOwner,
    onCloseOwner,
    editModal,
    editTitle,
    setEditTitle,
    editDesc,
    setEditDesc,
    editEstimatedHours,
    setEditEstimatedHours,
    onEdit,
    onCloseEdit,
    commentModal,
    comments,
    newComment,
    setNewComment,
    onAddComment,
    onCloseComments,
    createModal,
    createTitle,
    setCreateTitle,
    createDesc,
    setCreateDesc,
    createEstimatedHours,
    setCreateEstimatedHours,
    onCreate,
    onCloseCreate,
    showResumeModal,
    onResume,
    onCloseResume,
    startTrackingModal,
    onStartTracking,
    onCloseStartTracking,
    historyModal,
    history,
    formatHistoryAction,
    onCloseHistory,
  } = props;

  return (
    <>
      {/* Block Modal */}
      <Modal
        open={!!blockModal}
        onClose={onCloseBlock}
        title={t('modals.block.title')}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--foreground-secondary)]">
            {t('modals.block.description')}
          </p>
          <Textarea
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            className="h-28"
            placeholder={t('modals.block.placeholder')}
            required
          />
          <button
            onClick={onBlock}
            disabled={!blockReason.trim()}
            className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-red-100 px-3 py-2 text-xl text-red-800 transition-all duration-200 hover:bg-red-200 w-full disabled:opacity-50"
          >
            {t('modals.block.confirm')}
          </button>
        </div>
      </Modal>

      {/* Activate Modal */}
      <Modal
        open={!!activateModal}
        onClose={onCloseActivate}
        title={t('modals.activate.title')}
      >
        <div className="space-y-4">
          {isAdmin ? (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-1">
                {t('modals.activate.assignTo')}
              </label>
              {availableMembers.length === 0 ? (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 text-yellow-700 text-sm">
                  {t('modals.activate.allBusy')}
                </div>
              ) : (
                <Select
                  value={activateOwnerId}
                  onChange={(e) => setActivateOwnerId(e.target.value)}
                >
                  {availableMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          ) : (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 text-blue-700 text-sm">
              {t('modals.activate.selfActivation', { name: userName })}
            </div>
          )}
          {activateModal?.isBlocked && (
            <div>
              <p className="text-sm text-red-600 font-semibold mb-2">
                {t('modals.activate.blockedWarning')}
              </p>
              <Textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="h-24"
                placeholder={t('modals.activate.resolutionPlaceholder')}
                required
              />
            </div>
          )}
          <button
            onClick={onActivate}
            disabled={
              isAdmin ? availableMembers.length === 0 : busyMemberIds.has(userId)
            }
            className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-blue-100 px-3 py-2 text-xl text-blue-800 transition-all duration-200 hover:bg-blue-200 w-full disabled:opacity-50"
          >
            {t('modals.activate.activateButton')}
          </button>
          {!isAdmin && busyMemberIds.has(userId) && (
            <p className="text-sm text-orange-600">{t('modals.activate.alreadyActive')}</p>
          )}
        </div>
      </Modal>

      {/* Change Owner Modal */}
      <Modal
        open={!!ownerModal}
        onClose={onCloseOwner}
        title={t('modals.changeOwner.title')}
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[var(--foreground-secondary)]">
            {t('modals.changeOwner.newOwner')}
          </label>
          <Select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)}>
            <option value="">{t('modals.changeOwner.select')}</option>
            {members
              .filter((m) => m.id !== ownerModal?.currentOwnerId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </Select>
          <button
            onClick={onChangeOwner}
            disabled={!newOwnerId}
            className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-yellow-100 px-3 py-2 text-xl text-yellow-800 transition-all duration-200 hover:bg-yellow-200 w-full disabled:opacity-50"
          >
            {t('modals.changeOwner.confirm')}
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={onCloseEdit} title={t('modals.edit.title')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-1">
              {t('modals.edit.titleField')}
            </label>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-1">
              {t('modals.edit.description')}
            </label>
            <Textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="h-24"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-1">
              {t('modals.edit.estimatedHours')}
            </label>
            <Input
              type="number"
              value={editEstimatedHours}
              onChange={(e) => setEditEstimatedHours(e.target.value)}
              placeholder={t('modals.edit.estimatedPlaceholder')}
              min="0.5"
              max="999"
              step="0.5"
            />
          </div>
          <button
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-indigo-100 px-3 py-2 text-xl text-indigo-800 transition-all duration-200 hover:bg-indigo-200 w-full"
          >
            {t('modals.edit.save')}
          </button>
        </div>
      </Modal>

      {/* Comments Modal */}
      <Modal
        open={!!commentModal}
        onClose={onCloseComments}
        title={t('modals.comments.title')}
      >
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-sm text-[var(--foreground-muted)]">
              {t('modals.comments.noComments')}
            </p>
          )}
          {comments.map((c: any) => (
            <div
              key={c.id}
              className="bg-[var(--background-secondary)] rounded p-3 border border-[var(--border)]"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold">
                  {c.author?.name || t('common.member')}
                </span>
                {c.isOwner && <Badge variant="owner">Owner</Badge>}
              </div>
              <p className="text-sm text-[var(--foreground-secondary)]">{c.content}</p>
              <span className="text-xs text-[var(--foreground-muted)]">
                {new Date(c.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        {commentModal?.readOnly ? (
          <p className="text-sm text-[var(--foreground-muted)] italic">
            {t('modals.comments.disabledDone')}
          </p>
        ) : (
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 h-16"
              placeholder={t('modals.comments.placeholder')}
            />
            <button
              onClick={onAddComment}
              disabled={!newComment.trim()}
              className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-purple-100 px-3 py-1.5 text-sm text-purple-800 transition-all duration-200 hover:bg-purple-200 disabled:opacity-50"
            >
              {t('common.send')}
            </button>
          </div>
        )}
      </Modal>

      {/* Create Task Modal */}
      <Modal
        open={createModal}
        onClose={onCloseCreate}
        title={t('modals.create.title')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-1">
              {t('modals.create.titleField')}
            </label>
            <Input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder={t('modals.create.titlePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-1">
              {t('modals.create.description')}
            </label>
            <Textarea
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              className="h-24"
              placeholder={t('modals.create.descriptionPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-1">
              {t('modals.create.estimatedHours')}
            </label>
            <Input
              type="number"
              value={createEstimatedHours}
              onChange={(e) => setCreateEstimatedHours(e.target.value)}
              placeholder={t('modals.create.estimatedPlaceholder')}
              min="0.5"
              max="999"
              step="0.5"
            />
          </div>
          <button
            onClick={onCreate}
            disabled={!createTitle.trim()}
            className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-green-100 px-3 py-2 text-xl text-green-800 transition-all duration-200 hover:bg-green-200 w-full disabled:opacity-50"
          >
            {t('modals.create.createButton')}
          </button>
        </div>
      </Modal>

      {/* Resume Activity Modal (heartbeat-triggered) */}
      <Modal
        open={!!showResumeModal}
        onClose={onCloseResume}
        title={t('modals.resume.title')}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--foreground-secondary)]">
            {t('modals.resume.description')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => showResumeModal && onResume(showResumeModal)}
              className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-blue-100 px-3 py-2 text-lg text-blue-800 transition-all duration-200 hover:bg-blue-200 flex-1"
            >
              {t('modals.resume.resumeButton')}
            </button>
            <button
              onClick={onCloseResume}
              className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] px-3 py-2 text-lg text-[var(--foreground-secondary)] transition-all duration-200 hover:bg-[var(--surface-hover)] flex-1"
            >
              {t('modals.resume.keepPaused')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Start Tracking Modal */}
      <Modal
        open={!!startTrackingModal}
        onClose={onCloseStartTracking}
        title={t('modals.startTracking.title')}
      >
        {startTrackingModal &&
          (() => {
            const task = startTrackingModal.task;
            const totalMs = calcTotalTime(task.timeEntries);
            const hasEstimate = task.estimatedHours !== null && task.estimatedHours !== undefined;
            const estimatedH = hasEstimate ? Number(task.estimatedHours) : null;
            return (
              <div className="space-y-4">
                <p className="text-sm text-[var(--foreground-secondary)]">
                  {t('modals.startTracking.description')}
                </p>
                <div className="bg-[var(--background-secondary)] rounded-lg border border-[var(--border)] p-4">
                  <h3 className="font-bold text-[var(--foreground)] mb-3">{task.title}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[var(--foreground-muted)] text-xs block">
                        {t('modals.startTracking.estimatedTime')}
                      </span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {hasEstimate
                          ? formatHoursCompact(estimatedH!)
                          : t('modals.startTracking.noEstimate')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--foreground-muted)] text-xs block">
                        {t('modals.startTracking.timeSpent')}
                      </span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {formatTime(totalMs)}
                      </span>
                    </div>
                  </div>
                  {hasEstimate && (
                    <div className="mt-3 h-2 bg-stone-200/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${totalMs / 3600000 >= estimatedH! ? 'bg-orange-400' : 'bg-blue-400'}`}
                        style={{
                          width: `${Math.min((totalMs / 3600000 / estimatedH!) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onStartTracking(task.id)}
                  className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--border)] bg-emerald-100 px-3 py-2 text-xl text-emerald-800 transition-all duration-200 hover:bg-emerald-200 w-full"
                >
                  {t('modals.startTracking.startButton')}
                </button>
              </div>
            );
          })()}
      </Modal>

      {/* History Modal */}
      <Modal
        open={!!historyModal}
        onClose={onCloseHistory}
        title={t('modals.history.title')}
      >
        {!history ? (
          <p className="text-sm text-[var(--foreground-muted)]">{t('common.loading')}</p>
        ) : (
          <div className="space-y-6">
            {/* Timeline */}
            <div>
              <h3 className="text-lg font-bold text-[var(--foreground-secondary)] mb-2">
                {t('modals.history.timeline')}
              </h3>
              {history.entries.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)]">
                  {t('modals.history.noEvents')}
                </p>
              ) : (
                <div className="space-y-2">
                  {history.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-2 text-sm border-l-2 border-[var(--border)] pl-3 py-1"
                    >
                      <div className="flex-1">
                        <p className="text-[var(--foreground)]">{formatHistoryAction(entry)}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          {entry.performerName} - {new Date(entry.performedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Time entries */}
            {history.timeEntries.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground-secondary)] mb-2">
                  {t('modals.history.timeRecorded')}
                </h3>
                <div className="space-y-2">
                  {history.timeEntries.map((te) => {
                    const start = new Date(te.startedAt);
                    const end = te.endedAt ? new Date(te.endedAt) : null;
                    const duration = (end ? end.getTime() : Date.now()) - start.getTime();
                    return (
                      <div
                        key={te.id}
                        className="text-sm bg-[var(--background-secondary)] rounded p-2 border border-[var(--border)]"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {te.teamMember?.name || t('common.member')}
                          </span>
                          <span className="text-[var(--foreground-secondary)]">
                            {formatTime(duration)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          {start.toLocaleString()}
                          {end
                            ? ` → ${end.toLocaleString()}`
                            : ` ${t('modals.history.inProgress')}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Blocks */}
            {history.blocks && history.blocks.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground-secondary)] mb-2">
                  {t('modals.history.blocks')}
                </h3>
                <div className="space-y-2">
                  {history.blocks.map((block) => (
                    <div
                      key={block.id}
                      className="text-sm bg-red-50 rounded p-2 border border-red-200"
                    >
                      <p className="font-medium text-red-700">
                        {t('modals.history.blockReason')}: {block.blockReason}
                      </p>
                      <p className="text-xs text-[var(--foreground-secondary)]">
                        {t('modals.history.blockedBy')}:{' '}
                        {block.blockedBy?.name || t('common.member')} -{' '}
                        {new Date(block.blockedAt).toLocaleString()}
                      </p>
                      {block.resolvedAt && (
                        <p className="text-xs text-green-600">
                          {t('modals.history.resolvedBy')}:{' '}
                          {block.resolvedBy?.name || t('common.member')} - {block.resolutionNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
