import { defineRoutes, Router, useLocation } from '@w3cj/ruta';
import { render, useEffect, useState, type FC, type PropsWithChildren } from 'hono/jsx/dom';
import { t, tString } from './i18n';
import { permissionAdmin } from '../settings';
import { getDisplayUsernameString, User } from './components/user';
import { CurrentUserProvider, useCurrentUser, useUsingTheme } from './utils/currentUser';
import { A } from './components/a';
import { NotFound } from './pages/error';
import './style.css';
import { toast, ToastContainer } from './components/toast';
import { CodeMirrorEditors } from './components/editor/codemirrorUtils';
import { MonacoEditors } from './components/editor/monacoEditorUtils';
import { isLightMode } from './utils/isLightMode';
import { ThemeLoader } from './components/themeLoader';
import type { userInfo } from '../types';

const LazyPage: FC<{ load: () => Promise<FC<{}>> }> = ({ load }) => {
	const [Page, setPage] = useState<FC<{}> | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		let cancelled = false;
		load().then(
			loadedPage => {
				if (!cancelled) {
					setPage(() => loadedPage);
				}
			},
			error => {
				if (!cancelled) {
					const message = error instanceof Error ? error.message : String(error);
					setError(message);
					toast(message, 'error');
				}
			}
		);
		return () => {
			cancelled = true;
		};
	}, [load]);
	if (Page) {
		return <Page />;
	}
	if (error) {
		return <div role='alert'>{error}</div>;
	}
	return <div class='page-loading' role='status' aria-label={t('loading')}>
		<span class='page-loading-title' aria-hidden='true'></span>
		<span class='page-loading-block' aria-hidden='true'></span>
		<span class='page-loading-line' aria-hidden='true'></span>
	</div>;
};
type RouteLayout = FC<PropsWithChildren<{}>>;
const LayoutRoute: FC<{
	loadLayout: () => Promise<RouteLayout>,
	resolvePage: (location: string) => () => Promise<FC<{}>>
}> = ({ loadLayout, resolvePage }) => {
	const { location } = useLocation();
	const [Layout, setLayout] = useState<RouteLayout | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		let cancelled = false;
		loadLayout().then(
			loadedLayout => {
				if (!cancelled) {
					setLayout(() => loadedLayout);
				}
			},
			error => {
				if (!cancelled) {
					const message = error instanceof Error ? error.message : String(error);
					setError(message);
					toast(message, 'error');
				}
			}
		);
		return () => {
			cancelled = true;
		};
	}, [loadLayout]);
	if (error) {
		return <div role='alert'>{error}</div>;
	}
	if (!Layout) {
		return <div class='page-loading' role='status' aria-label={t('loading')}>
			<span class='page-loading-title' aria-hidden='true'></span>
			<span class='page-loading-block' aria-hidden='true'></span>
			<span class='page-loading-line' aria-hidden='true'></span>
		</div>;
	}
	const Page = resolvePage(location);
	return <Layout><div key={location}><LazyPage load={Page} /></div></Layout>;
};
const lazyPage = (load: () => Promise<FC<{}>>) => () => {
	const { location } = useLocation();
	return <LazyPage key={location} load={load} />;
};
const routes = defineRoutes(route => [
	route('/', lazyPage(() => import('./pages/home').then(module => module.default))),
	route('/user/register', lazyPage(() => import('./pages/user/register').then(module => module.Register))),
	route('/user/login', lazyPage(() => import('./pages/user/login').then(module => module.Login))),
	route('/user/settings/:section{browserNotification|username|security}?', () => <LayoutRoute loadLayout={() => import('./pages/user/settings/layout').then(module => module.UserSettingsLayout)} resolvePage={location => {
		switch (location) {
			case '/user/settings':
			case '/user/settings/browserNotification':
				return () => import('./pages/user/settings/browserNotification').then(module => module.UserSettingsBrowserNotification);
			case '/user/settings/username':
				return () => import('./pages/user/settings/username').then(module => module.UserSettingsUsername);
			case '/user/settings/security':
				return () => import('./pages/user/settings/security').then(module => module.UserSettingsSecurity);
			default:
				return () => Promise.resolve(NotFound);
		}
	}} />),
	route('/user/notification', lazyPage(() => import('./pages/user/notification').then(module => module.UserNotification))),
	route('/user/:id{\\d+}/:tab{home|feed|discussion|theme|judgement|admin}?', () => <LayoutRoute loadLayout={() => import('./pages/user/detail/layout').then(module => module.UserDetailLayout)} resolvePage={location => {
		if (/^\/user\/\d+\/?$/.test(location)) {
			return () => import('./pages/user/detail/home').then(module => module.UserDetailHome);
		}
		switch (location.split('/').at(-1)) {
			case undefined:
			case '':
			case 'home':
				return () => import('./pages/user/detail/home').then(module => module.UserDetailHome);
			case 'feed':
				return () => import('./pages/user/detail/feed').then(module => module.UserDetailFeed);
			case 'discussion':
				return () => import('./pages/user/detail/discussion').then(module => module.UserDetailDiscussion);
			case 'theme':
				return () => import('./pages/user/detail/theme').then(module => module.UserDetailTheme);
			case 'judgement':
				return () => import('./pages/user/detail/judgement').then(module => module.UserDetailJudgement);
			case 'admin':
				return () => import('./pages/user/detail/admin').then(module => module.UserDetailAdmin);
			default:
				return () => Promise.resolve(NotFound);
		}
	}} />),
	route('/problem', lazyPage(() => import('./pages/problem/list').then(module => module.ProblemList))),
	route('/problem/post', lazyPage(() => import('./pages/problem/post').then(module => module.ProblemPost))),
	route('/problem/:id{\\d+}', lazyPage(() => import('./pages/problem/detail').then(module => module.ProblemDetail))),
	route('/problem/:id{\\d+}/edit', lazyPage(() => import('./pages/problem/edit').then(module => module.ProblemEdit))),
	route('/feed', lazyPage(() => import('./pages/feed').then(module => module.default))),
	route('/feed/:id{\\d+}', lazyPage(() => import('./pages/feed').then(module => module.default))),
	route('/discussion', lazyPage(() => import('./pages/discussion/list').then(module => module.DiscussionList))),
	route('/discussion/post', lazyPage(() => import('./pages/discussion/post').then(module => module.DiscussionPost))),
	route('/discussion/:id{\\d+}', lazyPage(() => import('./pages/discussion/detail').then(module => module.DiscussionDetail))),
	route('/discussion/reply/:id{\\d+}', lazyPage(() => import('./pages/discussion/replyRedirect').then(module => module.DiscussionReplyRedirect))),
	route('/ticket', lazyPage(() => import('./pages/ticket/list').then(module => module.TicketList))),
	route('/ticket/post', lazyPage(() => import('./pages/ticket/post').then(module => module.TicketPost))),
	route('/ticket/:id{\\d+}', lazyPage(() => import('./pages/ticket/detail').then(module => module.TicketDetail))),
	route('/ticket/reply/:id{\\d+}', lazyPage(() => import('./pages/ticket/replyRedirect').then(module => module.TicketReplyRedirect))),
	route('/ide', lazyPage(() => import('./pages/ide').then(module => module.IDE))),
	route('/judgement', lazyPage(() => import('./pages/judgement').then(module => module.Judgement))),
	route('/theme', lazyPage(() => import('./pages/theme/list').then(module => module.ThemeList))),
	route('/theme/create', lazyPage(() => import('./pages/theme/create').then(module => module.ThemeCreate))),
	route('/theme/:id{\\d+}', lazyPage(() => import('./pages/theme/create').then(module => module.ThemeCreate))),
	route('/chat', lazyPage(() => import('./pages/chat').then(module => module.Chat))),
	route('/file/:path{.*}', lazyPage(() => import('./pages/file').then(module => module.File))),
	route('/admin/:section{home|domain-renew|check-in|ticket-quick-reply}?', () => <LayoutRoute loadLayout={() => import('./pages/admin/layout').then(module => module.AdminLayout)} resolvePage={location => {
		switch (location) {
			case '/admin':
			case '/admin/home':
				return () => import('./pages/admin/home').then(module => module.Admin);
			case '/admin/domain-renew':
				return () => import('./pages/admin/domainRenew').then(module => module.AdminDomainRenew);
			case '/admin/check-in':
				return () => import('./pages/admin/checkIn').then(module => module.AdminCheckIn);
			case '/admin/ticket-quick-reply':
				return () => import('./pages/admin/ticketQuickReply').then(module => module.AdminTicketQuickReply);
			default:
				return () => Promise.resolve(NotFound);
		}
	}} />),
	route('*', NotFound)
]);
declare module "@w3cj/ruta" {
	interface Register {
		routes: typeof routes;
	}
}
const switchLight = () => {
	switch (localStorage.lightMode) {
		case 'dark':
			localStorage.lightMode = 'system';
			break;
		case 'system':
			localStorage.lightMode = 'light';
			break;
		case 'light':
			localStorage.lightMode = 'dark';
			break;
		default:
			localStorage.lightMode = 'system';
			break;
	}
	loadLight();
}, loadLight = async () => {
	switch (localStorage.lightMode) {
		case 'system':
			document.documentElement.style.colorScheme = 'light dark';
			document.getElementById('lightSwitchIcon')!.classList = 'fa-solid fa-circle-half-stroke';
			break;
		case 'light':
			document.documentElement.style.colorScheme = 'light';
			document.getElementById('lightSwitchIcon')!.classList = 'fa-solid fa-sun';
			break;
		case 'dark':
			document.documentElement.style.colorScheme = 'dark';
			document.getElementById('lightSwitchIcon')!.classList = 'fa-solid fa-moon';
			break;
		default:
			localStorage.lightMode = 'system';
			document.documentElement.style.colorScheme = 'light dark';
			document.getElementById('lightSwitchIcon')!.classList = 'fa-solid fa-circle-half-stroke';
			break;
	}
	const lightMode = isLightMode();
	if (CodeMirrorEditors.length) {
		const duotone = (await import('@uiw/codemirror-theme-duotone'))[lightMode ? 'duotoneLight' : 'duotoneDark'];
		CodeMirrorEditors.forEach(({ editor, themeCompartment }) => editor.dispatch({ effects: themeCompartment.reconfigure(duotone) }));
	}
	MonacoEditors.forEach(editor => editor.updateOptions({ 'theme': lightMode ? 'vs-light' : 'vs-dark' }));
};
const ErrorBoundary: FC<PropsWithChildren<{}>> = ({ children }) => {
	const [error, setError] = useState<string | null>();
	useEffect(() => {
		const handler = (e: ErrorEvent) => setError(e.message);
		window.addEventListener('error', handler);
		return () => window.removeEventListener('error', handler);
	}, []);
	if (error && error !== 'ResizeObserver loop completed with undelivered notifications.') {
		toast(error, 'error');
	}
	return <>{children}</>;
};
const Header: FC<{}> = () => {
	const currentUser = useCurrentUser();
	const notificationCount = window?.data.notificationCount ?? 0, privateMessageCount = window?.data.privateMessageCount ?? 0;
	const [serverConnectStatus, setServerConnectStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
	useEffect(() => {
		navigator.locks.request('cy3-cc-cd-browser-notifictaion', { mode: 'exclusive' }, async lock => {
			const url = new URL('/api/websocket', location.href);
			url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
			let ws: WebSocket;
			let recentNotificationsAfter = new Date().toISOString().replace('T', ' ').replace(/\.\d\d\dZ/, ''), interval: ReturnType<typeof setInterval>;
			const loadWs = () => {
				ws = new WebSocket(url);
				ws.addEventListener('open', () => {
					interval = setInterval(() => ws.send(JSON.stringify({ recentNotificationsAfter })), 20000);
					setServerConnectStatus('connected');
				});
				ws.addEventListener('message', evt => {
					const recent: ({ type: 'notification', created_at: string } | { type: 'privateMessage', created_at: string, sender: userInfo, content: string })[] = JSON.parse(evt.data);
					if (recent.length) {
						recentNotificationsAfter = recent[0]!.created_at;
					}
					if ('Notification' in window) {
						if (Notification.permission === 'granted') {
							recent.forEach((row) => {
								let title: string | undefined, body: string | undefined;
								if (row.type === 'notification') {
									if (localStorage.browserNotificationSettingsNotification === 'detail') {
										title = tString('browserNotification.title.notification');
										body = tString('browserNotification.body.notification');
									}
									if (localStorage.browserNotificationSettingsNotification === 'summary') {
										title = tString('browserNotification.title.notification');
										body = tString('browserNotification.body.notification');
									}
								} else {
									if (localStorage.browserNotificationSettingsNotification === 'detail') {
										title = tString('browserNotification.title.privateMessage.detail', { sender: getDisplayUsernameString(row.sender) });
										body = row.content;
									}
									if (localStorage.browserNotificationSettingsNotification === 'senderOnly') {
										title = tString('browserNotification.title.privateMessage.detail', { sender: getDisplayUsernameString(row.sender) });
										body = tString('browserNotification.body.privateMessage.detail', { sender: getDisplayUsernameString(row.sender) });
									}
									if (localStorage.browserNotificationSettingsNotification === 'summary') {
										title = tString('browserNotification.title.privateMessage.summary');
										body = tString('browserNotification.body.privateMessage.summary');
									}
								}
								if (title && body) {
									new Notification(title, {
										badge: '/favicon.ico',
										icon: '/favicon.ico',
										body
									}).onclick = () => window.open({
										notification: '/user/notification',
										privateMessage: '/chat'
									}[row.type]);
								}
							});
						}
					}
				});
				const wsCloseOrErrorCallback = () => {
					clearInterval(interval);
					setServerConnectStatus('connecting');
					loadWs();
				};
				ws.addEventListener('close', wsCloseOrErrorCallback);
				ws.addEventListener('error', wsCloseOrErrorCallback);
			};
		});
	}, []);
	return <header style={{
		position: 'fixed',
		top: 0,
		left: 0,
		right: 0,
		height: '50px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: '0 30px',
		zIndex: 2
	}}>
		<div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
			<A href='/' style={{ display: 'inline-flex', alignItems: 'center' }}>
				<img src='/favicon.ico' alt='Home' style={{ height: '50px', width: '50px' }} />
			</A>
			<i class='fa-solid fa-server' style={{
				fontSize: '20px', color: {
					connecting: 'yellow',
					connected: 'green',
					failed: 'red'
				}[serverConnectStatus]
			}} title={tString(`serverConnectStatus.${serverConnectStatus}`)} id='serverConnectStatus'></i>
		</div>
		<div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
			<i class='fa-solid fa-language' onClick={() => document.getElementById('langSwitch')!.style.display = document.getElementById('langSwitch')!.style.display === 'block' ? 'none' : 'block'}></i>
			<div id='langSwitch' style={{ display: 'none', position: 'absolute', top: '50px', backgroundColor: 'light-dark(white, black)', padding: '20px', borderRadius: '10px', border: 'solid 1px' }}>
				<A href='?lang=en'>English</A><br />
				<A href='?lang=zh'>简体中文</A><br />
			</div>
			<A href='/user/login' style={{ textDecoration: 'none', fontSize: '18px', color: 'var(--text)', display: currentUser ? 'none' : 'inline' }}>
				<i class='fa-solid fa-sign-in-alt'></i> {t('user.login')}
			</A>
			<A href='/user/register' style={{ textDecoration: 'none', fontSize: '18px', color: 'var(--text)', display: currentUser ? 'none' : 'inline' }}>
				<i class='fa-solid fa-user-plus'></i> {t('user.register')}
			</A>

			{/* 管理面板（仅管理员可见，只显示图标，位于铃铛左边） */}
			{<A
				href='/admin'
				style={{
					textDecoration: 'none',
					color: 'var(--text)',
					fontSize: '20px',
					display: currentUser?.permission && currentUser.permission & permissionAdmin ? 'inline-flex' : 'none',
					alignItems: 'center',
					position: 'relative',
					top: '-1px'
				}}
				title={tString('admin.name')}
			>
				<i class='fa-solid fa-user-shield'></i>
			</A>}

			{/* 私信图标（位于管理面板右侧、铃铛左侧） */}
			<A href='/chat' style={{ textDecoration: 'none', color: 'var(--text)', display: currentUser ? 'inline-flex' : 'none', alignItems: 'center' }}>
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
			</A>

			{/* 通知项（铃铛） */}
			<A href='/user/notification' style={{ textDecoration: 'none', color: 'var(--text)', display: currentUser ? 'inline-flex' : 'none', alignItems: 'center' }}>
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
			</A>

			{/* 用户名 */}
			<User user={currentUser} style={{ display: currentUser ? 'inline' : 'none' }} />

			{/* 用户设置（仅图标，位于用户名右侧） */}
			<A
				href='/user/settings'
				style={{ textDecoration: 'none', color: 'var(--text)', fontSize: '20px', alignItems: 'center', display: currentUser ? 'inline-flex' : 'none' }}
				title={tString('user.settings.name')}
			>
				<i class='fa-solid fa-gear'></i>
			</A>

			{/* 登出 */}
			<a
				href='javascript:void(0)'
				onClick={async () => {
					await fetch('/api/user/logout');
					location.reload();
				}}
				style={{ textDecoration: 'none', color: 'var(--text)', fontSize: '20px', display: currentUser ? 'inline' : 'none' }}
			>
				<i class='fa-solid fa-sign-out-alt'></i>
			</a>
		</div>
	</header>;
};
const Nav: FC<{}> = () => {
	const currentUser = useCurrentUser();
	return <nav style={{
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
		<p><A href='/'>
			<i class='fa-solid fa-house'></i>
			<span class='sidebarTitle'>{t('home.name')}</span>
		</A></p>
		<p><A href='/problem'>
			<i class='fa-solid fa-book'></i>
			<span class='sidebarTitle'>{t('problem.list')}</span>
		</A></p>
		<p><A href='/feed'>
			<i class='fa-solid fa-rss'></i>
			<span class='sidebarTitle'>{t('feeds')}</span>
		</A></p>
		<p><A href='/discussion'>
			<i class='fa-solid fa-comments'></i>
			<span class='sidebarTitle'>{t('discussion.name')}</span>
		</A></p>
		<p><A href='/ticket'>
			<i class='fa-solid fa-ticket'></i>
			<span class='sidebarTitle'>{t('ticket.name')}</span>
		</A></p>
		<p><A href='/ide'>
			<i class='fa-solid fa-code'></i>
			<span class='sidebarTitle'>{t('ide.name')}</span>
		</A></p>
		<p><A href='/judgement'>
			<i class='fa-solid fa-user-plus'></i>
			<span class='sidebarTitle'>{t('judgement.name')}</span>
		</A></p>
		<p style={{ display: currentUser ? 'block' : 'none' }}><A href={`/file/user/${currentUser?.id}/`}>
			<i class='fa-solid fa-cloud-upload'></i>
			<span class='sidebarTitle'>{t('file.name')}</span>
		</A></p>
		<p><A href='/theme'>
			<i class='fa-solid fa-paint-brush'></i>
			<span class='sidebarTitle'>{t('theme.list')}</span>
		</A></p>
		<p><A href='javascript:void(0)' onClick={switchLight}>
			<i class='fa-solid fa-circle-half-stroke' id='lightSwitchIcon'></i>
			<span class='sidebarTitle'>{t('renderer.theme')}</span>
		</A></p>
	</nav>;
};
const routeContainerKey = (location: string) => {
	if (location === '/admin' || location.startsWith('/admin/')) {
		return 'admin';
	}
	if (location === '/user/settings' || location.startsWith('/user/settings/')) {
		return 'userSettings';
	}
	const userDetail = /^\/user\/(\d+)(?:\/|$)/.exec(location);
	if (userDetail) {
		return `userDetail-${userDetail[1]}`;
	}
	return location;
};
const App: FC<{}> = () => {
	const usingTheme = useUsingTheme();
	const { location } = useLocation();
	return <>
		<ThemeLoader theme={usingTheme} root='body' />
		<Header />
		<Nav />
		<main key={routeContainerKey(location)} style={{ paddingTop: '50px' }}><Router routes={routes} /></main>
		<ToastContainer />
	</>
};
render(<ErrorBoundary><CurrentUserProvider><App /></CurrentUserProvider></ErrorBoundary>, document.getElementById('app')!);
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', loadLight);
} else {
	loadLight();
}