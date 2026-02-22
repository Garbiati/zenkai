'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ProfileStats, WorkSchedule } from '@/lib/types';
import Avatar from '@/components/Avatar';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ProfilePage() {
  const { user, updateUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations();
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Work schedule states
  const [mySchedule, setMySchedule] = useState<WorkSchedule | null>(null);
  const [globalSchedule, setGlobalSchedule] = useState<WorkSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ startTime: '08:00', lunchStart: '12:00', lunchEnd: '13:00', endTime: '17:00' });
  const [globalForm, setGlobalForm] = useState({ startTime: '08:00', lunchStart: '12:00', lunchEnd: '13:00', endTime: '17:00' });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [isPersonalOverride, setIsPersonalOverride] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const loadProfile = async () => {
      try {
        const [profile, statsData, mySchedData, globalSchedData] = await Promise.all([
          api.getProfile(),
          api.getProfileStats(),
          api.getMySchedule(),
          api.getGlobalSchedule(),
        ]);
        setName(profile.name);
        setAvatarUrl(profile.avatarUrl || null);
        setStats(statsData);
        setGlobalSchedule(globalSchedData);
        setGlobalForm({
          startTime: globalSchedData.startTime,
          lunchStart: globalSchedData.lunchStart,
          lunchEnd: globalSchedData.lunchEnd,
          endTime: globalSchedData.endTime,
        });
        setMySchedule(mySchedData);
        const hasPersonalOverride = mySchedData.memberId !== null;
        setIsPersonalOverride(hasPersonalOverride);
        setScheduleForm({
          startTime: mySchedData.startTime,
          lunchStart: mySchedData.lunchStart,
          lunchEnd: mySchedData.lunchEnd,
          endTime: mySchedData.endTime,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user, authLoading, router]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError(t('profile.imageTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data: { name?: string; avatarUrl?: string } = {};
      if (name !== user?.name) data.name = name;
      if (avatarUrl !== (user?.avatarUrl || null)) data.avatarUrl = avatarUrl || '';
      if (Object.keys(data).length === 0) {
        setMessage(t('profile.noChanges'));
        setSaving(false);
        return;
      }
      await api.updateProfile(data);
      updateUser({ name: name || user?.name, avatarUrl });
      setMessage(t('profile.updateSuccess'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="skeleton h-9 w-48" />
          <div className="skeleton h-9 w-20" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="skeleton h-64 w-full" />
            <div className="skeleton h-48 w-full" />
          </div>
          <div>
            <div className="skeleton h-72 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">{t('profile.title')}</h1>
        <Button
          onClick={() => router.push('/dashboard')}
          variant="secondary"
        >
          {t('common.back')}
        </Button>
      </div>

      {error && (
        <div className="bg-[var(--status-blocked-bg)] border border-[var(--status-blocked)] rounded-lg p-3 text-[var(--status-blocked)] text-sm mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-3 font-bold cursor-pointer">x</button>
        </div>
      )}
      {message && (
        <div className="bg-[var(--status-active-bg)] border border-[var(--status-active)] rounded-lg p-3 text-[var(--status-active)] text-sm mb-4">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) — Profile Data + Work Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Section */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-sm)] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">{t('profile.profileData')}</h2>

            <div className="flex items-center gap-4 mb-6">
              <Avatar name={name || user?.name || ''} avatarUrl={avatarUrl} size="lg" />
              <div>
                <label className="cursor-pointer">
                  <Button variant="secondary" size="sm" className="pointer-events-none">
                    {t('profile.changeAvatar')}
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
                {avatarUrl && (
                  <Button
                    onClick={() => setAvatarUrl(null)}
                    variant="danger"
                    size="sm"
                    className="ml-2"
                  >
                    {t('profile.removeAvatar')}
                  </Button>
                )}
                <p className="text-xs text-[var(--foreground-muted)] mt-1">{t('profile.avatarHint')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('profile.name')}</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('profile.username')}</label>
                <Input
                  value={user?.username || ''}
                  disabled
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                variant="primary"
                className="w-full"
              >
                {saving ? t('profile.saving') : t('profile.saveChanges')}
              </Button>
            </div>
          </div>

          {/* Work Schedule Section */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-sm)] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">{t('profile.schedule')}</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('profile.startTime')}</label>
                <Input
                  type="time"
                  value={scheduleForm.startTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('profile.lunchStart')}</label>
                <Input
                  type="time"
                  value={scheduleForm.lunchStart}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, lunchStart: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('profile.lunchEnd')}</label>
                <Input
                  type="time"
                  value={scheduleForm.lunchEnd}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, lunchEnd: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('profile.endTime')}</label>
                <Input
                  type="time"
                  value={scheduleForm.endTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  setSavingSchedule(true);
                  setError('');
                  setMessage('');
                  try {
                    await api.updateMySchedule(scheduleForm);
                    setIsPersonalOverride(true);
                    setMessage(t('profile.schedulePersonalSaved'));
                  } catch (err: any) {
                    setError(err.message);
                  } finally {
                    setSavingSchedule(false);
                  }
                }}
                disabled={savingSchedule}
                variant="primary"
                className="flex-1"
              >
                {savingSchedule ? t('profile.savingSchedule') : t('profile.saveSchedule')}
              </Button>
              {isPersonalOverride && (
                <Button
                  onClick={async () => {
                    setError('');
                    setMessage('');
                    try {
                      await api.deleteMySchedule();
                      setIsPersonalOverride(false);
                      if (globalSchedule) {
                        setScheduleForm({
                          startTime: globalSchedule.startTime,
                          lunchStart: globalSchedule.lunchStart,
                          lunchEnd: globalSchedule.lunchEnd,
                          endTime: globalSchedule.endTime,
                        });
                      }
                      setMessage(t('profile.usingGlobalSchedule'));
                    } catch (err: any) {
                      setError(err.message);
                    }
                  }}
                  variant="secondary"
                >
                  {t('profile.useGlobal')}
                </Button>
              )}
            </div>

            {/* Admin: Global Schedule */}
            {user?.isAdmin && (
              <div className="mt-6 pt-6 border-t border-[var(--border-light)]">
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-3">{t('profile.globalSchedule')}</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('profile.startTime')}</label>
                    <Input
                      type="time"
                      value={globalForm.startTime}
                      onChange={(e) => setGlobalForm({ ...globalForm, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('profile.lunchStart')}</label>
                    <Input
                      type="time"
                      value={globalForm.lunchStart}
                      onChange={(e) => setGlobalForm({ ...globalForm, lunchStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('profile.lunchEnd')}</label>
                    <Input
                      type="time"
                      value={globalForm.lunchEnd}
                      onChange={(e) => setGlobalForm({ ...globalForm, lunchEnd: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('profile.endTime')}</label>
                    <Input
                      type="time"
                      value={globalForm.endTime}
                      onChange={(e) => setGlobalForm({ ...globalForm, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    setSavingGlobal(true);
                    setError('');
                    setMessage('');
                    try {
                      await api.updateGlobalSchedule(globalForm);
                      setMessage(t('profile.scheduleGlobalSaved'));
                    } catch (err: any) {
                      setError(err.message);
                    } finally {
                      setSavingGlobal(false);
                    }
                  }}
                  disabled={savingGlobal}
                  variant="primary"
                  className="w-full"
                >
                  {savingGlobal ? t('profile.savingGlobal') : t('profile.saveGlobalSchedule')}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3) — Statistics */}
        <div>
          {stats && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-sm)] p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">{t('profile.stats')}</h2>
              <div className="space-y-4">
                <div className="text-center p-4 bg-[var(--accent-soft)] rounded-lg border border-[var(--border-light)]">
                  <p className="text-3xl font-bold text-[var(--accent)]">{stats.hoursToday}h</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{t('profile.hoursToday')}</p>
                </div>
                <div className="text-center p-4 bg-[var(--status-done-bg)] rounded-lg border border-[var(--border-light)]">
                  <p className="text-3xl font-bold text-[var(--status-done)]">{stats.hoursWeek}h</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{t('profile.hoursWeek')}</p>
                </div>
                <div className="text-center p-4 bg-[var(--status-done-bg)] rounded-lg border border-[var(--border-light)]">
                  <p className="text-3xl font-bold text-[var(--status-done)]">{stats.hoursMonth}h</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{t('profile.hoursMonth')}</p>
                </div>
                <div className="border-t border-[var(--border-light)] pt-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-[var(--status-paused-bg)] rounded-lg border border-[var(--border-light)]">
                      <p className="text-2xl font-bold text-[var(--status-paused)]">{stats.activeTasks}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">{t('profile.activeTasks')}</p>
                    </div>
                    <div className="text-center p-3 bg-[var(--status-active-bg)] rounded-lg border border-[var(--border-light)]">
                      <p className="text-2xl font-bold text-[var(--status-active)]">{stats.doneTasks}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">{t('profile.doneTasks')}</p>
                    </div>
                    <div className="text-center p-3 bg-[var(--background-secondary)] rounded-lg border border-[var(--border-light)]">
                      <p className="text-2xl font-bold text-[var(--foreground)]">{stats.totalTasks}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">{t('profile.totalTasks')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
