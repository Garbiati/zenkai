'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function getPasswordStrength(pw: string, t: any): { level: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;

  if (score <= 1) return { level: score, label: t('strength.weak'), color: 'bg-red-400' };
  if (score <= 2) return { level: score, label: t('strength.fair'), color: 'bg-yellow-400' };
  if (score <= 3) return { level: score, label: t('strength.good'), color: 'bg-blue-400' };
  return { level: score, label: t('strength.strong'), color: 'bg-green-500' };
}

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations('changePassword');

  const strength = getPasswordStrength(newPassword, t);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('passwordsDontMatch'));
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || t('changeError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-[var(--foreground)]">
          {t('title')}
        </h1>
        <p className="text-base text-center text-[var(--foreground-secondary)] mb-6">
          {t('subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('currentPassword')}</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('newPassword')}</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            {newPassword && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded ${
                        i <= strength.level ? strength.color : 'bg-[var(--background-secondary)]'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-[var(--foreground-secondary)]">{strength.label}</span>
                <ul className="text-xs text-[var(--foreground-muted)] mt-1 space-y-0.5">
                  <li className={newPassword.length >= 8 ? 'text-[var(--status-active)]' : ''}>
                    {newPassword.length >= 8 ? '✓' : '○'} {t('requirements.minChars')}
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'text-[var(--status-active)]' : ''}>
                    {/[A-Z]/.test(newPassword) ? '✓' : '○'} {t('requirements.uppercase')}
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'text-[var(--status-active)]' : ''}>
                    {/[0-9]/.test(newPassword) ? '✓' : '○'} {t('requirements.number')}
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">{t('confirmPassword')}</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <span className="text-[var(--status-blocked)] text-xs">{t('passwordsDontMatch')}</span>
            )}
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
            className="w-full text-base py-2.5"
          >
            {loading ? t('saving') : t('changeButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}
