import enTranslations from './translations/en';
import zhTranslations from './translations/zh';
export const translations: Record<string, Record<string, string>> = {
	en: enTranslations,
	zh: zhTranslations
};
export const normalizeLocale = (value?: string | null): string | null => {
	const normalized = value?.trim().toLowerCase();
	if (!normalized) {
		return null;
	}
	const candidates = [normalized, normalized.replace(/_/g, '-')];
	for (const candidate of candidates) {
		const directMatch = Object.keys(translations).find(locale => locale.toLowerCase() === candidate);
		if (directMatch) {
			return directMatch;
		}
		const baseMatch = Object.keys(translations).find(locale => locale.toLowerCase() === (candidate.split('-')[0] ?? candidate));
		if (baseMatch) {
			return baseMatch;
		}
	}
	return null;
};
export const getText = (locale: string, key: string): string => (translations[locale]?.[key] as string ?? translations.en?.[key] ?? key);