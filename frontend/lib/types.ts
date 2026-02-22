export interface TeamMember {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  teamMemberId: string;
  teamMember?: TeamMember;
  startedAt: string;
  endedAt: string | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  author?: TeamMember;
  isOwner: boolean;
  content: string;
  createdAt: string;
}

export interface TaskBlock {
  id: string;
  taskId: string;
  blockedById: string;
  blockedBy?: TeamMember;
  blockReason: string;
  resolvedById: string | null;
  resolvedBy?: TeamMember;
  resolutionNote: string | null;
  blockedAt: string;
  resolvedAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'standby' | 'in_progress' | 'done';
  ownerId: string | null;
  owner: TeamMember | null;
  isBlocked: boolean;
  completedAt: string | null;
  undoCount: number;
  isArchived: boolean;
  estimatedHours: number | null;
  predictedCompletion: string | null;
  timeEntries: TimeEntry[];
  comments?: TaskComment[];
  blocks?: TaskBlock[];
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  oldData: any;
  newData: any;
  performedBy: string;
  performerName: string;
  performedAt: string;
}

export interface TaskHistory {
  task: Task;
  entries: AuditEntry[];
  timeEntries: TimeEntry[];
  blocks: TaskBlock[];
}

export interface WorkSchedule {
  id: string;
  memberId: string | null;
  startTime: string;
  lunchStart: string;
  lunchEnd: string;
  endTime: string;
}

export interface HeartbeatResponse {
  activeTaskId: string | null;
  isPaused: boolean;
  workedHoursToday: number;
  expectedHours: number;
  meetingHoursToday: number;
  taskEstimatedHours: number | null;
  taskTotalHoursSpent: number;
  taskPredictedCompletion: string | null;
  taskDeadlineExceeded: boolean;
}

export interface ProfileStats {
  hoursToday: number;
  hoursWeek: number;
  hoursMonth: number;
  activeTasks: number;
  doneTasks: number;
  totalTasks: number;
}
