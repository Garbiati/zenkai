'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface InviteDetails {
  email: string | null;
  role: string;
  orgName: string;
  expiresAt: string;
  isOpenInvite: boolean;
}

export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const { login } = useAuth();
  const t = useTranslations('invite');
  const tErrors = useTranslations('errors');
  const tCommon = useTranslations('common');

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [form, setForm] = useState({ name: '', username: '', password: '', email: '' });
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .getInvitation(token)
      .then(setInvite)
      .catch((err: any) => setFetchError(err.message || 'INVITATION_NOT_FOUND'));
  }, [token]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setLoading(true);
    try {
      const payload: Parameters<typeof api.acceptInvitation>[1] = {
        name: form.name,
        username: form.username,
        password: form.password,
      };
      if (invite?.isOpenInvite && form.email) {
        payload.email = form.email;
      }
      const data = await api.acceptInvitation(token, payload);
      login(data.access_token, data.user, data.must_change_password);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg === 'USERNAME_TAKEN') {
        setSubmitError(tErrors('USERNAME_TAKEN'));
      } else if (msg === 'EMAIL_TAKEN') {
        setSubmitError(tErrors('EMAIL_TAKEN'));
      } else if (msg === 'INVITATION_ALREADY_ACCEPTED') {
        setSubmitError(t('alreadyAccepted'));
      } else if (msg === 'INVITATION_EXPIRED') {
        setSubmitError(t('expired'));
      } else if (msg === 'INVITATION_USES_EXHAUSTED') {
        setSubmitError(t('usesExhausted'));
      } else {
        setSubmitError(msg || t('acceptError'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (!invite && !fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--foreground-muted)]">{tCommon('loading')}</p>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    const msgKey =
      fetchError === 'INVITATION_NOT_FOUND'
        ? 'notFound'
        : fetchError === 'INVITATION_EXPIRED'
          ? 'expired'
          : fetchError === 'INVITATION_ALREADY_ACCEPTED'
            ? 'alreadyAccepted'
            : fetchError === 'INVITATION_USES_EXHAUSTED'
              ? 'usesExhausted'
              : 'fetchError';
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] p-10 w-full max-w-md text-center">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="text-[var(--status-blocked)] font-semibold">{t(msgKey as any)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-[var(--foreground)]">
          {t('title')}
        </h1>
        <p className="text-base text-center text-[var(--foreground-secondary)] mb-1">
          {t('joinTeam', { team: invite!.orgName })}
        </p>
        {invite!.isOpenInvite ? (
          <p className="text-xs text-center text-[var(--foreground-muted)] mb-8">
            {t('openInviteHint')}
          </p>
        ) : (
          <p className="text-xs text-center text-[var(--foreground-muted)] mb-8">
            {t('emailHint', { email: invite!.email ?? '' })}
          </p>
        )}

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
              {t('usernameLabel')}
            </label>
            <Input
              type="text"
              value={form.username}
              onChange={handleChange('username')}
              placeholder={t('usernamePlaceholder')}
              pattern="[a-z0-9._-]+"
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

          {invite!.isOpenInvite && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">
                {t('emailLabel')}
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder={t('emailPlaceholder')}
              />
            </div>
          )}

          {submitError && (
            <div className="bg-[var(--status-blocked-bg)] border border-[var(--status-blocked)] rounded-lg p-3 text-[var(--status-blocked)] text-sm">
              {submitError}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="w-full text-base py-2.5 mt-2"
          >
            {loading ? t('joining') : t('joinButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}
