import enTranslations from './translations/en';
import zhTranslations from './translations/zh';
export const translations: Record<string, Record<string, string>> = {
	en: enTranslations,
	zh: zhTranslations
};
export const getText = (locale: string, key: string): string => (translations[locale]?.[key] as string ?? translations.en?.[key] ?? key);