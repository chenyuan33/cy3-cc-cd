import { Hono } from 'hono';
import { jwtVerify } from 'jose';
import { translations, getText } from './translations';
import { User, userQuery } from './components/user';
import type { AppEnv } from './types';
import apisRoutes from './routes/apis';
import userRoutes from './routes/user';
import feedRoutes from './routes/feed';
import discussionRoutes from './routes/discussion';
import ticketRoutes from './routes/ticket';
import privateMessageRoutes from './routes/privateMessage';
import adminRoutes from './routes/admin';
import { Card } from './components/card';
import { banned, errorHTML, notFound } from './routes/errorPages';
import { jsxRenderer, useRequestContext } from 'hono/jsx-renderer';
import { permissionAdmin, permissionVisit } from './settings';
import { renderTemplate } from './components/renderTemplate';
import { Time } from './components/time';
import { Form } from './components/form';
import type { FC, PropsWithChildren } from 'hono/jsx';
import { raw } from 'hono/html';
const app = new Hono<AppEnv>();
app.use(async (c, next) => {
	c.set('reqBody', c.req.method === 'POST' || c.req.method === 'PUT' ?
		!c.req.header('Content-Type') || (c.req.header('Content-Type')?.split(';')[0] ?? c.req.header('Content-Type'))?.trim().toLowerCase() === 'application/json' ?
			await (async () => {
				try {
					let req = await c.req.json();
					if (typeof req === 'object' && req !== null) {
						return req;
					} else {
						return {} as Record<string, string>;
					}
				} catch (error) {
					return {} as Record<string, string>;
				}
			})()
			: Object.fromEntries(new URLSearchParams(await c.req.text()))
		: Object.fromEntries(new URL(c.req.url).searchParams));
	let cookies: Record<string, string> = {};
	c.req.header('Cookie')?.split(';').forEach(cookie => {
		const [key, value] = cookie.split('=').map(s => s.trim());
		key && (cookies[key] = decodeURIComponent(value ?? ''));
	});
	let uid: number | null = null;
	if (cookies.session) {
		const { payload } = await jwtVerify(cookies.session, new TextEncoder().encode((c.env as any).JWT_SECRET)).catch(() => ({ payload: null }));
		if (payload) {
			uid = parseInt(payload.uid as string);
		}
	}
	const currentUser = uid ? await userQuery(uid, c) : null;
	c.set('currentUser', currentUser);
	const { email } = currentUser ? await (c.env as any).db.prepare('SELECT email FROM users WHERE id = ?').bind(currentUser.id).first() : {};
	c.set('currentUserEmail', email ?? null);
	const url = new URL(c.req.url);
	const supportedLocales: string[] = Object.keys(translations);
	const queryLocale = url.searchParams.get('lang')?.toLowerCase();
	if (queryLocale && supportedLocales.includes(queryLocale)) {
		c.set('locale', queryLocale);
	} else {
		const cookieLocale = cookies.locale?.toLowerCase();
		if (cookieLocale && supportedLocales.includes(cookieLocale)) {
			c.set('locale', cookieLocale);
		} else {
			const acceptLanguage = c.req.header('accept-language') ?? '';
			const preferred = acceptLanguage
				.split(',')
				.map(value => (value.split(';')[0] ?? value).trim().toLowerCase())
				.find(value => supportedLocales.includes(value) || supportedLocales.includes(value.split('-')[0] ?? value));
			const normalized = preferred?.split('-')[0];
			if (preferred && supportedLocales.includes(preferred)) {
				c.set('locale', preferred);
			} else if (normalized && supportedLocales.includes(normalized)) {
				c.set('locale', normalized);
			} else {
				c.set('locale', 'en');
			}
		}
	}
	console.log({
		customLog: {
			logType: 'Custom Log',
			currentUser: currentUser,
			ip: c.req.header('x-real-ip'),
			reqBody: c.get('reqBody')
		}
	});
	await next();
});
declare module 'hono' {
	interface ContextRenderer {
		(
			content: string | Promise<string>,
			props: { title: string }
		): Response
	}
};
app.use(jsxRenderer(async ({ children, title }) => {
	const c = useRequestContext();
	const locale = c.get('locale'), currentUser = c.get('currentUser'), env = c.env as any;
	const { notificationCount } = currentUser ? await env.db.prepare('SELECT COUNT(*) AS notificationCount FROM notification WHERE uid = ? AND read = 0').bind(currentUser.id).first() : { notificationCount: 0 };
	const { privateMessageCount } = currentUser ? await env.db.prepare('SELECT COUNT(*) AS privateMessageCount FROM private_messages WHERE receiver = ? AND read = 0;').bind(currentUser.id).first() : { privateMessageCount: 0 };
	return <html lang={locale}>
		<head>
			<meta charset='UTF-8' />
			<meta name='viewport' content='width=device-width, initial-scale=1.0' />
			<link rel='stylesheet' type='text/css' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.0/css/all.min.css' />
			<link rel='stylesheet' type='text/css' href='/style.css' />
			<link rel='icon' type='image/x-icon' href='/favicon.ico' />
			<script src='/helper.js'></script>
			<title>{title} - cy3's site</title>
		</head>
		<body>
			<noscript><h2>{getText(locale, 'noscript')}</h2></noscript>

			{/* 顶部导航栏 */}
			<header style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				height: '50px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between', // 左右两端对齐
				padding: '0 30px',
				zIndex: 2
			}}>
				{/* 最左侧网站图标，点击跳转首页 */}
				<a href='/' style={{ display: 'inline-flex', alignItems: 'center' }}>
					<img src='/favicon.ico' alt='Home' style={{ height: '50px', width: '50px' }} />
				</a>

				{/* 右侧用户相关元素 */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
					{currentUser ? (
						<>
							<a href='/private-message' style={{ textDecoration: 'none', color: 'var(--text)', display: 'inline-flex', alignItems: 'center' }}>
								<span style={{ position: 'relative', display: 'inline-block' }}>
									<i class='fa-solid fa-envelope' style={{ fontSize: '20px' }}></i>
									{privateMessageCount ? (
										<sup style={{
											padding: '1px 5px',
											backgroundColor: 'red',
											color: 'white',
											borderRadius: '5px',
											position: 'absolute',
											top: '-5px',
											right: '-10px',
											fontSize: '10px'
										}}>
											{privateMessageCount}
										</sup>
									) : null}
								</span>
							</a>

							{/* 通知项（角标已修正） */}
							<a href='/user/notification' style={{ textDecoration: 'none', color: 'var(--text)', display: 'inline-flex', alignItems: 'center' }}>
								<span style={{ position: 'relative', display: 'inline-block' }}>
									<i class='fa-solid fa-bell' style={{ fontSize: '20px' }}></i>
									{notificationCount ? (
										<sup style={{
											padding: '1px 5px',
											backgroundColor: 'red',
											color: 'white',
											borderRadius: '5px',
											position: 'absolute',
											top: '-5px',
											right: '-10px',
											fontSize: '10px'
										}}>
											{notificationCount}
										</sup>
									) : null}
								</span>
							</a>

							{/* 用户名：使用 <User> 组件保留自定义颜色 */}
							<a
								href={`https://cy3.cc.cd/user/${currentUser.id}`}
								style={{ fontWeight: 'bold', textDecoration: 'none' }}
							>
								<User user={currentUser} c={c} />
							</a>

							{/* 登出（仅图标） */}
							<a
								href='/api/user/logout'
								style={{ textDecoration: 'none', color: 'var(--text)', fontSize: '20px' }}
							>
								<i class='fa-solid fa-sign-out-alt'></i>
							</a>
						</>
					) : (
						<>
							<a href='/user/login' style={{ textDecoration: 'none', fontSize: '18px', color: 'var(--text)' }}>
								<i class='fa-solid fa-sign-in-alt'></i> {getText(locale, 'login')}
							</a>
							<a href='/user/register' style={{ textDecoration: 'none', fontSize: '18px', color: 'var(--text)' }}>
								<i class='fa-solid fa-user-plus'></i> {getText(locale, 'register')}
							</a>
						</>
					)}
				</div>
			</header>

			{/* 侧边栏（保持原样，背景由 CSS 中的 nav 选择器定义） */}
			<nav style={{
				position: 'fixed',
				top: '50px',
				left: '-10px',
				height: 'calc(100% - 50px)',
				padding: '10px',
				'padding-left': '20px',
				'overflow-x': 'hidden',
				'overflow-y': 'auto',
				'white-space': 'nowrap',
				transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
				'border-radius': '10px',
				'z-index': 1
			}}>
				<p><a href='/'>
					<i class='fa-solid fa-house'></i>
					<span class='sidebarTitle'>{getText(locale, 'home')}</span>
				</a></p>
				<p><a href='/feed'>
					<i class='fa-solid fa-rss'></i>
					<span class='sidebarTitle'>{getText(locale, 'feeds')}</span>
				</a></p>
				<p><a href='/discussion'>
					<i class='fa-solid fa-comments'></i>
					<span class='sidebarTitle'>{getText(locale, 'discussion')}</span>
				</a></p>
				<p><a href='/ticket'>
					<i class='fa-solid fa-ticket'></i>
					<span class='sidebarTitle'>{getText(locale, 'ticket')}</span>
				</a></p>

				{
					currentUser ? <>
						<p><a href='/user/settings'>
							<i class='fa-solid fa-user-gear'></i>
							<span class='sidebarTitle'>{getText(locale, 'userSettings')}</span>
						</a></p>
					</> : null
				}

				{
					currentUser && (c.get('currentUser').permission & permissionAdmin) ? <p><a href='/admin'>
						<i class='fa-solid fa-user-shield'></i>
						<span class='sidebarTitle'>{getText(locale, 'admin')}</span>
					</a></p> : <></>
				}

				<p><a href='javascript:void(0)' onclick='switchLight()'>
					<i class='fa-solid fa-circle-half-stroke' id='lightSwitchIcon'></i>
					<span class='sidebarTitle'>{getText(locale, 'navTheme')}</span>
				</a></p>
			</nav>

			{/* 主体内容：添加顶部内边距，防止被固定顶部导航栏遮挡 */}
			<main style={{ paddingTop: '50px' }}>{children}</main>
		</body>
	</html>;
}));
app.use(async (c, next) => {
	if (c.get('currentUser') && !(c.get('currentUser')!.permission & permissionVisit)) {
		return banned(c);
	}
	await next();
});
app.get('/', async c => {
	const locale = c.get('locale'), env = c.env as any, nextDay = new Date();
	nextDay.setDate(nextDay.getDate() + 1);
	nextDay.setHours(0, 0, 0, 0);
	const { results: discussions } = await env.db.prepare('SELECT id, uid, category, title, created_at, pin FROM discussion ORDER BY pin DESC, created_at DESC LIMIT 10').bind().all();
	return c.render(<>
		<Card>
			<h1>{getText(locale, 'home')}</h1>
		</Card>
		<div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '20px' }}>
			<Card style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center' }}>
				<h2>{getText(locale, 'homeCheckIn')}</h2>
				{c.get('currentUser')
					? (async () => {
						const { checkin_date, checkin_count, checkin_today_status, checkin_today_good1, checkin_today_good2, checkin_today_bad1, checkin_today_bad2 } = await env.db.prepare('SELECT checkin_date, checkin_count, checkin_today_status, checkin_today_good1, checkin_today_good2, checkin_today_bad1, checkin_today_bad2 FROM users WHERE id = ?').bind(c.get('currentUser')?.id).first();
						const checkin_date_object = new Date(checkin_date + 'Z');
						const today = new Date();
						if (!checkin_date
							|| checkin_date_object.getFullYear() !== today.getFullYear()
							|| checkin_date_object.getMonth() !== today.getMonth()
							|| checkin_date_object.getDate() !== today.getDate()) {
							return <Form action='/api/check-in' method='post' inputs={[]} submit={{ content: getText(locale, 'homeCheckInButton') }} />;
						}
						const Good: FC<PropsWithChildren<{}>> = ({ children }) => <div style={{ color: 'red' }}>{children}</div>;
						const Bad: FC<PropsWithChildren<{}>> = ({ children }) => <div style={{ color: 'light-dark(black, white)' }}>{children}</div>;
						const GoodContent: FC<{ id: number }> = async ({ id }) => {
							const { title_en, good_en, title_zh, good_zh } = await env.db.prepare(`SELECT title_${locale}, good_${locale} FROM checkin_texts WHERE id = ?`).bind(id).first();
							return <div style={{ padding: '10px' }}><strong>{getText(locale, 'homeCheckInGood')}{title_en ?? title_zh}</strong><br />{good_en ?? good_zh}</div>;
						};
						const BadContent: FC<{ id: number }> = async ({ id }) => {
							const { title_en, bad_en, title_zh, bad_zh } = await env.db.prepare(`SELECT title_${locale}, bad_${locale} FROM checkin_texts WHERE id = ?`).bind(id).first();
							return <div style={{ padding: '10px' }}><strong>{getText(locale, 'homeCheckInBad')}{title_en ?? title_zh}</strong><br />{bad_en ?? bad_zh}</div>;
						};
						return <>
							<p>{renderTemplate(getText(locale, 'homeCheckInResetTime'), { __DATE__: <Time c={c} time={nextDay} /> })}</p>
							<p>{renderTemplate(getText(locale, 'homeCheckInCount'), { __COUNT__: checkin_count })}</p>
							<h2 style={{ color: {
								'-3': 'light-dark(black, white)',
								'-2': 'light-dark(black, white)',
								'-1': 'light-dark(black, white)',
								'0': 'green',
								'1': 'red',
								'2': 'red',
								'3': 'red'
							}[checkin_today_status as number] }}>{getText(locale, 'homeCheckInStatus_' + checkin_today_status)}</h2>
							<p style={{ 'font-size': 'smaller', color: 'gray' }}>{getText(locale, 'homeCheckInReferenceOnly')}</p>
							<div style={{ display: 'grid', width: '100%', 'grid-template-columns': 'repeat(2, 1fr)' }}>
								<div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center' }}>{checkin_today_good1 && checkin_today_good2 ? <Good><GoodContent id={checkin_today_good1} /><GoodContent id={checkin_today_good2} /></Good> : <Bad><strong>{getText(locale, 'homeCheckInEverythingBad')}</strong></Bad>}</div>
								<div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center' }}>{checkin_today_bad1 && checkin_today_bad2 ? <Bad><BadContent id={checkin_today_bad1} /><BadContent id={checkin_today_bad2} /></Bad> : <Good><strong>{getText(locale, 'homeCheckInEverythingGood')}</strong></Good>}</div>
							</div>
						</>;
					})()
					: <p>{raw(getText(locale, 'homeCheckInAfterLogin'))}</p>}
			</Card>
			<Card>
				<h2>{getText(locale, 'homeRecentDiscussions')}</h2>
				{discussions.length ? discussions.map(({ id, uid, category, title, created_at, pin }: { id: number, uid: number, category: string, title: string, created_at: string, pin: number }) => <Card>
					{pin ? <i class='fa-solid fa-thumbtack' style={{ color: 'gold' }}></i> : <></>}
					<a href={'/discussion/' + id}>{title}</a><br />
					{renderTemplate(getText(locale, 'discussionItemDescription'), {
						__USER__: <User c={c} user={uid} />,
						__CATEGORY__: <a href={`/discussion?category=${category}`}>{getText(locale, 'discussionCategoryName_' + category)}</a>,
						__CREATED_AT__: <Time c={c} time={created_at} />
					})}
				</Card>) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{getText(locale, 'discussionNothing')}</h2></Card>}
			</Card>
		</div>
	</>, { title: getText(locale, 'home') });
});
app.route('/api', apisRoutes);
app.route('/user', userRoutes);
app.route('/feed', feedRoutes);
app.route('/discussion', discussionRoutes);
app.route('/ticket', ticketRoutes);
app.route('/private-message', privateMessageRoutes);
app.route('/admin', adminRoutes);
app.onError((err, c) => {
	console.error(err);
	return errorHTML(c, err, 500);
});
app.notFound(c => notFound(c));
export default app;
/**
 * CREATE TABLE IF NOT EXISTS checkin_texts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title_en TEXT, good_en TEXT, bad_en TEXT,
		title_zh TEXT, good_zh TEXT, bad_zh TEXT
	)
 */
