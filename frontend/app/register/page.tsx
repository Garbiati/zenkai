'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Step = 'choose' | 'manager' | 'member';

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('choose');
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    teamName: '',
  });
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeError, setInviteCodeError] = useState('');
  const [inviteCodeLoading, setInviteCodeLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const t = useTranslations('register');
  const tErrors = useTranslations('errors');

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.register({
        name: form.name,
        email: form.email,
        username: form.username,
        password: form.password,
        teamName: form.teamName || undefined,
      });
      login(data.access_token, data.user, data.must_change_password);
      router.push('/onboarding');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg === 'EMAIL_TAKEN' || msg === 'USERNAME_TAKEN') {
        setError(tErrors(msg as any));
      } else {
        setError(msg || t('registerError'));
      }
    } finally {
      setLoading(false);
    }
  };

  /** Extract token from a full URL or return the raw value as token. */
  const extractToken = (value: string): string => {
    const trimmed = value.trim();
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split('/');
      return parts[parts.length - 1] || trimmed;
    } catch {
      return trimmed;
    }
  };

  const handleInviteCode = async () => {
    const token = extractToken(inviteCode);
    if (!token) return;
    setInviteCodeError('');
    setInviteCodeLoading(true);
    try {
      await api.getInvitation(token);
      router.push(`/invite/${token}`);
    } catch {
      setInviteCodeError(t('memberCodeError'));
    } finally {
      setInviteCodeLoading(false);
    }
  };

  // ── Step 0: Choose role ────────────────────────────────────────────────────
  if (step === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] p-10 w-full max-w-lg">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>

          <h1 className="text-3xl font-bold text-center mb-1 text-[var(--foreground)]">
            {t('chooseTitle')}
          </h1>
          <p className="text-sm text-center text-[var(--foreground-secondary)] mb-8">
            {t('chooseSubtitle')}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setStep('manager')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-[var(--border)] rounded-xl hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all text-left cursor-pointer"
            >
              <span className="text-4xl">👔</span>
              <div>
                <p className="font-bold text-[var(--foreground)] text-base">{t('managerTitle')}</p>
                <p className="text-xs text-[var(--foreground-secondary)] mt-0.5">
                  {t('managerDesc')}
                </p>
              </div>
              <span className="text-xs font-medium text-[var(--primary)] mt-auto">
                {t('managerCta')} →
              </span>
            </button>

            <button
              onClick={() => setStep('member')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-[var(--border)] rounded-xl hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all text-left cursor-pointer"
            >
              <span className="text-4xl">👋</span>
              <div>
                <p className="font-bold text-[var(--foreground)] text-base">{t('memberTitle')}</p>
                <p className="text-xs text-[var(--foreground-secondary)] mt-0.5">
                  {t('memberDesc')}
                </p>
              </div>
              <span className="text-xs font-medium text-[var(--primary)] mt-auto">
                {t('memberCta')} →
              </span>
            </button>
          </div>

          <p className="text-center text-sm text-[var(--foreground-secondary)] mt-8">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-[var(--primary)] hover:underline font-medium">
              {t('signIn')}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Step: Member — enter invite code/link ─────────────────────────────────
  if (step === 'member') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] p-10 w-full max-w-md">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>

          <button
            onClick={() => setStep('choose')}
            className="text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] mb-6 flex items-center gap-1"
          >
            ← Voltar
          </button>

          <h1 className="text-3xl font-bold text-center mb-2 text-[var(--foreground)]">
            {t('memberCodeTitle')}
          </h1>
          <p className="text-sm text-center text-[var(--foreground-secondary)] mb-8">
            {t('memberCodeHint')}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">
                {t('memberCodeLabel')}
              </label>
              <Input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder={t('memberCodePlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && handleInviteCode()}
                autoFocus
              />
            </div>

            {inviteCodeError && (
              <div className="bg-[var(--status-blocked-bg)] border border-[var(--status-blocked)] rounded-lg p-3 text-[var(--status-blocked)] text-sm">
                {inviteCodeError}
              </div>
            )}

            <Button
              type="button"
              disabled={!inviteCode.trim() || inviteCodeLoading}
              variant="primary"
              className="w-full text-base py-2.5"
              onClick={handleInviteCode}
            >
              {inviteCodeLoading ? '...' : t('memberCodeContinue')}
            </Button>
          </div>

          <p className="text-center text-sm text-[var(--foreground-secondary)] mt-6">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-[var(--primary)] hover:underline font-medium">
              {t('signIn')}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Step: Manager — registration form ─────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] p-10 w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <button
          onClick={() => setStep('choose')}
          className="text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] mb-6 flex items-center gap-1"
        >
          ← Voltar
        </button>

        <h1 className="text-4xl font-bold text-center mb-2 text-[var(--foreground)]">
          {t('title')}
        </h1>
        <p className="text-base text-center text-[var(--foreground-secondary)] mb-8">
          {t('subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">
              {t('nameLabel')}
            </label>
            <Input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              placeholder={t('namePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">
              {t('emailLabel')}
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              placeholder={t('emailPlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">
              {t('usernameLabel')}
            </label>
            <Input
              type="text"
              value={form.username}
              onChange={handleChange('username')}
              placeholder={t('usernamePlaceholder')}
              pattern="[a-z0-9._-]+"
              title={t('usernameHint')}
              required
            />
            <p className="text-xs text-[var(--foreground-secondary)] mt-1">{t('usernameHint')}</p>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">
              {t('passwordLabel')}
            </label>
            <Input
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">
              {t('teamNameLabel')}
            </label>
            <Input
              type="text"
              value={form.teamName}
              onChange={handleChange('teamName')}
              placeholder={t('teamNamePlaceholder')}
            />
          </div>

          {error && (
            <div className="bg-[var(--status-blocked-bg)] border border-[var(--status-blocked)] rounded-lg p-3 text-[var(--status-blocked)] text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="w-full text-base py-2.5 mt-2"
          >
            {loading ? t('registering') : t('registerButton')}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--foreground-secondary)] mt-6">
          {t('alreadyHaveAccount')}{' '}
          <Link href="/login" className="text-[var(--primary)] hover:underline font-medium">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
