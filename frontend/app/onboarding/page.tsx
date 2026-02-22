'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Step = 1 | 2 | 3;
type ExpiresIn = '1h' | '24h' | '7d' | 'never';

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations('onboarding');
  const tCommon = useTranslations('common');

  const [step, setStep] = useState<Step>(1);

  // Step 2 — First task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskLoading, setTaskLoading] = useState(false);

  // Step 3 — Open invite link
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>('7d');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const expiryOptions: { value: ExpiresIn; labelKey: string }[] = [
    { value: '1h', labelKey: 'inviteExpiry1h' },
    { value: '24h', labelKey: 'inviteExpiry24h' },
    { value: '7d', labelKey: 'inviteExpiry7d' },
    { value: 'never', labelKey: 'inviteExpiryNever' },
  ];

  const generateInviteLink = async (expiry: ExpiresIn) => {
    setInviteLoading(true);
    try {
      const result = await api.createInvitation({ expiresIn: expiry });
      setInviteLink(result.inviteLink);
    } catch {
      // ignore — user can retry
    } finally {
      setInviteLoading(false);
    }
  };

  // Auto-generate on entering step 3
  useEffect(() => {
    if (step === 3 && !inviteLink) {
      generateInviteLink(expiresIn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleExpiryChange = (value: ExpiresIn) => {
    setExpiresIn(value);
    setInviteLink('');
    generateInviteLink(value);
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      setStep(3);
      return;
    }
    setTaskLoading(true);
    try {
      await api.createTask(taskTitle.trim());
    } catch {
      // ignore — task creation is best-effort in onboarding
    } finally {
      setTaskLoading(false);
      setStep(3);
    }
  };

  const steps = [
    { number: 1, label: t('step1Label') },
    { number: 2, label: t('step2Label') },
    { number: 3, label: t('step3Label') },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {steps.map((s) => (
            <div key={s.number} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step === s.number
                    ? 'bg-[var(--foreground)] text-[var(--background)]'
                    : step > s.number
                      ? 'bg-emerald-400 text-white'
                      : 'bg-[var(--border)] text-[var(--foreground-muted)]'
                }`}
              >
                {step > s.number ? '✓' : s.number}
              </div>
              {s.number < 3 && (
                <div
                  className={`h-0.5 w-12 transition-colors ${step > s.number ? 'bg-emerald-400' : 'bg-[var(--border)]'}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] p-10">
          {/* ── Step 1: Welcome ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="text-center space-y-4">
              <p className="text-4xl">🎉</p>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                {t('welcomeTitle', { name: user?.name?.split(' ')[0] || '' })}
              </h1>
              <p className="text-[var(--foreground-secondary)]">{t('welcomeDesc')}</p>
              <Button
                variant="primary"
                className="w-full text-base py-2.5 mt-4"
                onClick={() => setStep(2)}
              >
                {t('letsGo')}
              </Button>
            </div>
          )}

          {/* ── Step 2: First Task ──────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-3xl mb-3">📋</p>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">{t('taskTitle')}</h2>
                <p className="text-sm text-[var(--foreground-secondary)] mt-1">{t('taskDesc')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">
                  {t('taskLabel')}
                </label>
                <Input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder={t('taskPlaceholder')}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setStep(3)}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  disabled={taskLoading}
                  onClick={handleCreateTask}
                >
                  {taskLoading ? '...' : t('createTask')}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Open Invite Link ─────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-3xl mb-3">👥</p>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">{t('inviteTitle')}</h2>
                <p className="text-sm text-[var(--foreground-secondary)] mt-1">{t('inviteDesc')}</p>
              </div>

              {/* Expiry selector */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-2">
                  {t('inviteExpiry')}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {expiryOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleExpiryChange(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        expiresIn === opt.value
                          ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
                          : 'border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--foreground-secondary)]'
                      }`}
                    >
                      {t(opt.labelKey as any)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Invite link */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-2">
                  {t('inviteLinkLabel')}
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground-secondary)] font-mono truncate">
                    {inviteLoading ? '...' : inviteLink || '—'}
                  </div>
                  <Button
                    variant="ghost"
                    className="shrink-0"
                    disabled={!inviteLink || inviteLoading}
                    onClick={handleCopy}
                  >
                    {copied ? t('inviteLinkCopied') : t('inviteLinkCopy')}
                  </Button>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-1.5">
                  {t('inviteLinkHint')}
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {t('inviteLinkPlanLimit', { max: 7 })}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={inviteLoading}
                  onClick={() => generateInviteLink(expiresIn)}
                >
                  {inviteLoading ? t('inviteGenerating') : t('inviteGenerate')}
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => router.push('/dashboard')}
                >
                  {t('goToDashboard')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
