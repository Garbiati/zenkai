import { getRequestConfig } from 'next-intl/server';

export const locales = ['pt-BR', 'en-US'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'pt-BR';

export function getMessages(locale: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./messages/${locale}.json`);
}

export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    messages: getMessages(locale),
  };
});
