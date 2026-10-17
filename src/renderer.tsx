import { jsxRenderer, useRequestContext } from "hono/jsx-renderer";
import type { AppEnv } from "./types";
import { ThemeLoader } from "./components/themeLoader";
import { Script, ViteClient } from "vite-ssr-components/hono";
import { getI18n } from "./i18n";

export const renderer = jsxRenderer(async () => {
	const c = useRequestContext<AppEnv>();
	const t = getI18n(c), locale = c.get('language');
	return <html lang={locale}>
		<head>
			<meta charset='UTF-8' />
			<meta name='viewport' content='width=device-width, initial-scale=1.0' />
			<ViteClient />
			<script dangerouslySetInnerHTML={{ __html: 'var data = ' + JSON.stringify({
				enableAvatar: (c as any).ENABLE_AVATAR ? 1 : 0,
				locale,
				currentUser: { ...c.get('currentUser'), email: c.get('currentUserEmail') },
				usingTheme: c.get('usingTheme')
			}).replace(/</g, '\\u003c') }} />
			<Script src='/src/client/main.tsx' />
			<link rel='stylesheet' type='text/css' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.0/css/all.min.css' />
			<ThemeLoader theme={c.get('usingTheme')} root='body' />
			<link rel='icon' type='image/x-icon' href='/favicon.ico' />
			<title>{t('loading')} - cy3's site</title>
		</head>
		<body>
			<noscript><strong>{t('renderer.noscript')}</strong></noscript>
			<div id='app'></div>
		</body>
	</html>;
});