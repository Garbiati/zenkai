'use client';

import { useTranslations } from 'next-intl';

export function useErrorTranslation() {
  const t = useTranslations('errors');

  return (errorMessage: string): string => {
    // Try to find a translation for the error code
    try {
      const translated = t(errorMessage as any);
      if (translated && translated !== errorMessage && !translated.startsWith('errors.')) {
        return translated;
      }
    } catch {
      // Fall through to return original message
    }
    // Return original message if no translation found
    return errorMessage;
  };
}
