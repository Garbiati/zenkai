'use client';

import { useLocale } from '@/lib/locale';
import { locales, Locale } from '@/i18n';

const LOCALE_LABELS: Record<Locale, string> = {
  'pt-BR': 'PT',
  'en-US': 'EN',
};

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center bg-stone-200/50 rounded-md p-0.5">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={`px-2 py-0.5 text-xs font-bold rounded transition-all ${
            locale === loc
              ? 'bg-white text-stone-700 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          {LOCALE_LABELS[loc]}
        </button>
      ))}
    </div>
  );
}
