import type { JSX } from 'hono/jsx/jsx-runtime';
export const renderTemplate = (template: string, parts: Record<string, string | JSX.Element>) => {
	const keys = Object.keys(parts);
	if (!keys.length) {
		return <>{template}</>;
	}
	const pattern = new RegExp(`(${keys.map((key: string) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
	return <>{template.split(pattern).map(token => Object.hasOwn(parts, token) ? parts[token] : token)}</>;
};