'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const t = useTranslations('auth');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(username, password);
      login(data.access_token, data.user, data.must_change_password);
    } catch (err: any) {
      setError(err.message || t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] p-10 w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <h1 className="text-4xl font-bold text-center mb-2 text-[var(--foreground)]">
          {t('title')}
        </h1>
        <p className="text-base text-center text-[var(--foreground-secondary)] mb-8">
          {t('subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">
              {t('login')}
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('loginPlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)] mb-1.5">
              {t('password')}
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              required
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
            className="w-full text-base py-2.5"
          >
            {loading ? t('loggingIn') : t('loginButton')}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--foreground-secondary)] mt-6">
          {t('noAccount')}{' '}
          <Link href="/register" className="text-[var(--primary)] hover:underline font-medium">
            {t('createAccount')}
          </Link>
        </p>
      </div>
    </div>
  );
}
