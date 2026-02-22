function getApiUrl() {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }
  // Always prefer the explicit env var (required for tunnels/production)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return `http://${window.location.hostname}:3001`;
}

const API_URL = getApiUrl();

async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (data: {
    email: string;
    name: string;
    username: string;
    password: string;
    teamName?: string;
  }) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Team Members
  getMembers: () => request('/team-members'),

  // Tasks
  getTasks: (params?: { status?: string; blocked?: string; ownerId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.blocked) searchParams.set('blocked', params.blocked);
    if (params?.ownerId) searchParams.set('ownerId', params.ownerId);
    const qs = searchParams.toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`);
  },

  getTask: (id: string) => request(`/tasks/${id}`),

  createTask: (title: string, description?: string, estimatedHours?: number) =>
    request('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, description, estimatedHours }),
    }),

  updateTask: (
    id: string,
    data: { title?: string; description?: string; estimatedHours?: number },
  ) =>
    request(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  activateTask: (id: string, ownerId?: string, resolutionNote?: string) =>
    request(`/tasks/${id}/activate`, {
      method: 'PATCH',
      body: JSON.stringify({ ownerId, resolutionNote }),
    }),

  blockTask: (id: string, reason: string) =>
    request(`/tasks/${id}/block`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  completeTask: (id: string) => request(`/tasks/${id}/complete`, { method: 'PATCH' }),

  undoTask: (id: string) => request(`/tasks/${id}/undo`, { method: 'PATCH' }),

  changeOwner: (id: string, newOwnerId: string) =>
    request(`/tasks/${id}/change-owner`, {
      method: 'PATCH',
      body: JSON.stringify({ newOwnerId }),
    }),

  deleteTask: (id: string) => request(`/tasks/${id}`, { method: 'DELETE' }),

  // Start tracking (manual time tracking)
  startTracking: (id: string) => request(`/tasks/${id}/start-tracking`, { method: 'POST' }),

  // Status durations
  getStatusDurations: (id: string) => request(`/tasks/${id}/status-durations`),

  // Comments
  getComments: (taskId: string) => request(`/tasks/${taskId}/comments`),

  addComment: (taskId: string, content: string) =>
    request(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Blocks
  getBlocks: (taskId: string) => request(`/tasks/${taskId}/blocks`),

  // Archive
  archiveTask: (id: string) => request(`/tasks/${id}/archive`, { method: 'PATCH' }),

  unarchiveTask: (id: string) => request(`/tasks/${id}/unarchive`, { method: 'PATCH' }),

  // History
  getTaskHistory: (id: string) => request(`/tasks/${id}/history`),

  // Profile
  getProfile: () => request('/auth/profile'),

  updateProfile: (data: { name?: string; avatarUrl?: string }) =>
    request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getProfileStats: () => request('/auth/profile/stats'),

  // Tasks - Pause/Resume
  pauseTask: (id: string) => request(`/tasks/${id}/pause`, { method: 'PATCH' }),

  resumeTask: (id: string) => request(`/tasks/${id}/resume`, { method: 'PATCH' }),

  // Work Schedule
  getMySchedule: () => request('/work-schedule'),

  getGlobalSchedule: () => request('/work-schedule/global'),

  updateGlobalSchedule: (data: {
    startTime?: string;
    lunchStart?: string;
    lunchEnd?: string;
    endTime?: string;
  }) =>
    request('/work-schedule/global', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateMySchedule: (data: {
    startTime?: string;
    lunchStart?: string;
    lunchEnd?: string;
    endTime?: string;
  }) =>
    request('/work-schedule/mine', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMySchedule: () => request('/work-schedule/mine', { method: 'DELETE' }),

  // Heartbeat
  heartbeat: () => request('/heartbeat', { method: 'POST' }),

  // Invitations
  createInvitation: (data: {
    email?: string;
    role?: string;
    expiresIn?: '1h' | '24h' | '7d' | 'never';
    maxUses?: number;
  }) => request('/invitations', { method: 'POST', body: JSON.stringify(data) }),

  getInvitation: (token: string) => request(`/invitations/${token}`),

  acceptInvitation: (
    token: string,
    data: { name: string; username: string; password: string; avatarUrl?: string; email?: string },
  ) => request(`/invitations/${token}/accept`, { method: 'POST', body: JSON.stringify(data) }),

};
