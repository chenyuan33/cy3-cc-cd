import type { JSX } from 'hono/jsx/jsx-runtime';
import type en_us_translations from '../i18n/en_us';
let message = {};
type i18nKeyMaker<T> = T extends Record<string, any> ? { [K in keyof T & string]: T[K] extends Record<string, any> ? `${K}.${i18nKeyMaker<T[K]>}` : K }[keyof T & string] : never;
type i18nKey = i18nKeyMaker<typeof en_us_translations>;
export const loadI18n = async () => message = await (await fetch('/api/i18n')).json();
const rawContent = (value: string | JSX.Element | undefined) => {
	if (typeof value === 'string') {
		return <span dangerouslySetInnerHTML={{ __html: value }}></span>;
	}
	return value;
};
export const t = (key: i18nKey, params: Record<string, string | JSX.Element> = {}) => {
	try {
		return <>{(key.split('.').reduce((obj, k) => obj?.[k as keyof typeof obj], message) as string).split(/(\{\w+\})/g).map(match => rawContent(/^\{\w+\}$/.test(match) && match.substring(1, match.length - 1) in params ? params[match.substring(1, match.length - 1)] : match))}</>;
	} catch {
		return <>{key}</>
	}
};
export const tString = (key: i18nKey, params: Record<string, string> = {}) => {
	try {
		return (key.split('.').reduce((obj, k) => obj?.[k as keyof typeof obj], message) as string).split(/(\{\w+\})/g).map(match => /^\{\w+\}$/.test(match) && match.substring(1, match.length - 1) in params ? params[match.substring(1, match.length - 1)] : match).join('');
	} catch {
		return key;
	}
};