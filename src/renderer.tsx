import { jsxRenderer, useRequestContext } from "hono/jsx-renderer";
import type { AppEnv } from "./types";
import { ThemeLoader } from "./components/themeLoader";
import { Script, Link, ViteClient } from "vite-ssr-components/hono";
import { getI18n } from "./i18n";

export const renderer = jsxRenderer(async ({ children }) => {
	const c = useRequestContext<AppEnv>();
	const t = getI18n(c), locale = c.get('language');
	return <html lang={locale}>
		<head>
			<meta charset='UTF-8' />
			<meta name='viewport' content='width=device-width, initial-scale=1.0' />
			<ViteClient />
			<Script src='/src/client/main.tsx' />
			<link rel='stylesheet' type='text/css' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.0/css/all.min.css' />
			<ThemeLoader theme={c.get('usingTheme')} root='body' />
			<link rel='icon' type='image/x-icon' href='/favicon.ico' />
			<title>{t('loading')} - cy3's site</title>
			<script>var ENABLE_AVATAR = {(c as any).ENABLE_AVATAR ? 1 : 0};</script>
		</head>
		<body>
			<noscript><strong>{t('renderer.noscript')}</strong></noscript>
			<div id='app'></div>
		</body>
	</html>;
});