import type { JSX } from 'hono/jsx/jsx-runtime';
let message: any = {};
export const loadI18n = async () => message = await (await fetch('/api/i18n')).json();
const rawContent = (value: string | JSX.Element | undefined) => {
	if (typeof value === 'string') {
		return <span dangerouslySetInnerHTML={{ __html: value }}></span>;
	}
	return value;
};
export const t = (key: string, params: Record<string, string | JSX.Element> = {}) => {
	try {
		return <>{(key.split('.').reduce((obj, k) => obj?.[k], message) as string).split(/(\{\w+\})/g).map(match => rawContent(/^\{\w+\}$/.test(match) && match.substring(1, match.length - 1) in params ? params[match.substring(1, match.length - 1)] : match))}</>;
	} catch {
		return <>{key}</>
	}
};
export const tString = (key: string, params: Record<string, string> = {}) => {
	try {
		return (key.split('.').reduce((obj, k) => obj?.[k], message) as string).split(/(\{\w+\})/g).map(match => /^\{\w+\}$/.test(match) && match.substring(1, match.length - 1) in params ? params[match.substring(1, match.length - 1)] : match).join('');
	} catch {
		return key;
	}
};