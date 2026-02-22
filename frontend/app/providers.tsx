'use client';

import { AuthProvider } from '@/lib/auth';
import { LocaleProvider } from '@/lib/locale';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>{children}</AuthProvider>
    </LocaleProvider>
  );
}
