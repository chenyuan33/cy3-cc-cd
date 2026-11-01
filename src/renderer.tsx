import { jsxRenderer, useRequestContext } from "hono/jsx-renderer";
import type { AppEnv } from "./types";
import { Script, ViteClient } from "vite-ssr-components/hono";
import { getI18n } from "./i18n";

export const renderer = jsxRenderer(async () => {
	const c = useRequestContext<AppEnv>();
	const t = getI18n(c), locale = c.get('language'), currentUser = c.get('currentUser'), env = c.env as any;
	return <html lang={locale}>
		<head>
			<meta charset='UTF-8' />
			<meta name='viewport' content='width=device-width, initial-scale=1.0' />
			<ViteClient />
			<script dangerouslySetInnerHTML={{ __html: 'var data = ' + JSON.stringify({
				enableAvatar: (c as any).ENABLE_AVATAR ? 1 : 0,
				locale,
				currentUser: { ...c.get('currentUser'), email: c.get('currentUserEmail') },
				usingTheme: c.get('usingTheme'),
				notificationCount: currentUser ? (await env.db.prepare('SELECT COUNT(*) AS total FROM notification WHERE uid = ? AND read = 0').bind(currentUser.id).first()).total : 0,
				privateMessageCount: currentUser ? (await env.db.prepare('SELECT COUNT(*) AS total FROM private_messages WHERE receiver = ? AND read = 0').bind(currentUser.id).first()).total : 0
			}).replace(/</g, '\\u003c') }} />
			<Script src='/src/client/main.tsx' />
			<link rel='stylesheet' type='text/css' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.0/css/all.min.css' />
			<link rel='icon' type='image/x-icon' href='/favicon.ico' />
			<title>{t('loading')} - cy3's site</title>
		</head>
		<body>
			<noscript><strong>{t('renderer.noscript')}</strong></noscript>
			<div id='app'></div>
		</body>
	</html>;
});