import type { Context } from 'hono';
import en_us_translations from './i18n/en_us';
import zh_hans_cn_translations from './i18n/zh_hans_cn';
import { createI18n } from 'hono-i18n';
export const messages = {
	en: en_us_translations,
	en_us: en_us_translations,
	zh: zh_hans_cn_translations,
	zh_hans: zh_hans_cn_translations,
	zh_cn: zh_hans_cn_translations,
	zh_hans_cn: zh_hans_cn_translations
};
export type supportedLanguagesShortCodeType = 'en' | 'us';
type I18nInstance = ReturnType<typeof createI18n<Context, typeof messages, 'en'>>;
const i18n: I18nInstance = createI18n({
	messages,
	defaultLocale: 'en',
	getLocale: c => c.get('language')
});
export const i18nMiddleware: I18nInstance['i18nMiddleware'] = i18n.i18nMiddleware;
export const getI18n: I18nInstance['getI18n'] = i18n.getI18n;
export const segmenter = (locale: string, content: string) => Array.from((new Intl.Segmenter(locale, { granularity: 'word' })).segment(content)).map(({ segment }) => segment).join(' ');