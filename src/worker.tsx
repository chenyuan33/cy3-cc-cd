import { Hono } from 'hono';
import { jwtVerify } from 'jose';
import { languageDetector } from 'hono/language';
import type { AppEnv } from './types';
import { defaultTheme, permissionVisit } from './settings';
import { userQuery } from './routes/api/user';
import { banned, errorJson, notFound } from './routes/errorPages';
import apisRoutes from './routes/apis';
import webSocketRoutes from './routes/ws';
import userRoutes from './routes/user';
import chatRoutes from './routes/chat';
import adminRoutes from './routes/admin';
import judgementRoutes from './routes/judgement';
import fileRoutes from './routes/file';
import themeRoutes from './routes/theme';
import ideRoutes from './routes/ide';
import { renderer } from './renderer';
import { i18nMiddleware, type supportedLanguagesShortCodeType } from './i18n';
const app = new Hono<AppEnv>();
app.use(languageDetector({
	supportedLanguages: ['en', 'en_us', 'zh', 'zh_cn', 'zh_hans', 'zh_hans_cn'],
	fallbackLanguage: 'en',
	order: ['path', 'querystring', 'cookie', 'header'],
	lookupQueryString: 'lang',
	lookupCookie: 'lang',
	caches: ['cookie'],
	cookieOptions: {
		httpOnly: false
	}
}));
app.use(i18nMiddleware);
app.use(async (c, next) => {
	const clonedReq = c.req.raw.clone(), env = c.env as any;
	if (c.req.method === 'POST' || c.req.method === 'PUT') {
		const contentType = c.req.header('Content-Type')?.split(';')[0];
		if (contentType === 'application/json') {
			try {
				c.set('reqBody', await clonedReq.json());
			} catch {
				c.set('reqBody', {});
			}
		} else if (contentType === 'application/x-www-form-urlencoded') {
			const text = await clonedReq.text();
			c.set('reqBody', Object.fromEntries(new URLSearchParams(text)));
		} else if (contentType === 'multipart/form-data') {
			c.set('reqBody', Object.fromEntries(Array.from(await clonedReq.formData()).filter(([_, value]) => typeof value === 'string')) as Record<string, string>);
		}
	} else {
		c.set('reqBody', Object.fromEntries(new URL(c.req.url).searchParams));
	}
	let cookies: Record<string, string> = {};
	c.req.header('Cookie')?.split(';').forEach(cookie => {
		const [key, value] = cookie.split('=').map(s => s.trim());
		key && (cookies[key] = decodeURIComponent(value ?? ''));
	});
	let uid: number | null = null;
	if (cookies.session) {
		const { payload } = await jwtVerify(cookies.session, new TextEncoder().encode(env.JWT_SECRET)).catch(() => ({ payload: null }));
		if (payload) {
			uid = parseInt(payload.uid as string);
		}
	}
	const currentUser = uid ? await userQuery(uid, c) : null;
	c.set('currentUser', currentUser);
	const { email } = currentUser ? await env.db.prepare('SELECT email FROM users WHERE id = ?').bind(currentUser.id).first() : {};
	c.set('currentUserEmail', email ?? null);
	c.set('usingTheme', (currentUser ? await env.db.prepare(`
		SELECT
			theme.usebgimage, theme.useFrostedGlass, theme.editor,
			theme.bgImageRepeatX, theme.bgImageRepeatY,
			theme.bgImageSizeX, theme.bgImageSizeXCustom, theme.bgImageSizeXCustomUnit,
			theme.bgImageSizeY, theme.bgImageSizeYCustom, theme.bgImageSizeYCustomUnit,
			theme.light_fgcolor, theme.light_bgcolor, theme.light_bgimage,
			theme.dark_fgcolor, theme.dark_bgcolor, theme.dark_bgimage
		FROM users
		JOIN theme ON users.using_theme = theme.id
		WHERE users.id = ?
	`).bind(currentUser.id).first() : null) || defaultTheme);
	c.set('shortLocale', c.get('language').split(/[_\-]/)[0] as supportedLanguagesShortCodeType);
	console.log({
		customLog: {
			logType: 'Custom Log',
			currentUser: currentUser,
			ip: c.req.header('x-real-ip') ?? c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'unknown'
		}
	});
	await next();
});
app.use(renderer);
app.use(async (c, next) => {
	if (c.get('currentUser') && !(c.get('currentUser')!.permission & permissionVisit)) {
		return banned(c);
	}
	await next();
});
app.get('/', c => c.render(<></>));
app.get('/private-message', (c) => {
	const query = c.req.query();
	const searchParams = new URLSearchParams(query).toString();
	const suffix = searchParams ? '?' + searchParams : '';
	return c.redirect('/chat' + suffix, 301);
});
app.route('/api', apisRoutes);
app.route('/ws', webSocketRoutes);
app.route('/admin', adminRoutes);
app.route('/user', userRoutes);
app.route('/chat', chatRoutes);
app.route('/judgement', judgementRoutes);
app.route('/file', fileRoutes);
app.route('/theme', themeRoutes);
app.route('/ide', ideRoutes);
app.onError((err, c) => {
	console.error(err);
	return errorJson(c, err, 500);
});
app.notFound(c => {
	if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/ws')) {
		return notFound(c);
	}
	return c.render(<></>);
});
export default app;