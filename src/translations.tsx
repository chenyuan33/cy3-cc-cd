import en_us_translations from './translations/en_us';
import zh_hans_cn_translations from './translations/zh_hans_cn';
export const translations = {
	en: en_us_translations,
	en_us: en_us_translations,
	zh: zh_hans_cn_translations,
	zh_hans: zh_hans_cn_translations,
	zh_cn: zh_hans_cn_translations,
	zh_hans_cn: zh_hans_cn_translations
};
export type supportedLanguagesType = keyof typeof translations;
type Prefix<T> = T extends `${infer P}${'_' | '-'}${string}` ? P : T;
export type supportedLanguagesShortCodeType = Prefix<supportedLanguagesType>;
export const supportedLanguages = Object.keys(translations) as supportedLanguagesType[];
export function isLanguageSupported(language: string): language is supportedLanguagesType {
	return (supportedLanguages as readonly string[]).includes(language);
}
export const segmenter = (locale: string, content: string) => Array.from((new Intl.Segmenter(locale, { granularity: 'word' })).segment(content)).map(({ segment }) => segment).join(' ');