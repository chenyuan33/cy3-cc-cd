import { navigate } from '@w3cj/ruta';
import type { FC, PropsWithChildren } from 'hono/jsx';

export const A: FC<PropsWithChildren<{ href: string, [key: string]: any }>> = ({ href, children, onClick, target, download, ...rest }) => <a
	href={href}
	target={target}
	download={download}
	onClick={(e: MouseEvent) => {
		if (target === '_blank' || download) {
			return;
		}
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
			return;
		}
		if (e.button !== 0) {
			return;
		}
		onClick?.(e);
		if (e.defaultPrevented) {
			return;
		}
		if (!href.startsWith('/') || href.startsWith('//')) {
			return;
		}
		e.preventDefault();
		navigate(href);
	}}
	{...rest}
>
	{children}
</a>;