import { defineRoutes, Router } from '@w3cj/ruta';
import { render, useEffect, useState, type FC, type PropsWithChildren } from 'hono/jsx/dom';
import type { Child } from 'hono/jsx';
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

const LazyPage: FC<{ load: () => Promise<Child> }> = ({ load }) => {
	const [page, setPage] = useState<Child | null>(null);
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
		return () => { cancelled = true; };
	}, [load]);
	return <>{page ?? (error
		? <div role='alert'>{error}</div>
		: <div class='page-loading' role='status' aria-label={t('loading')}>
			<span class='page-loading-title' aria-hidden='true'></span>
			<span class='page-loading-block' aria-hidden='true'></span>
			<span class='page-loading-line' aria-hidden='true'></span>
		</div>
	)}</>;
};
const lazyPage = (load: () => Promise<Child>) => () => <LazyPage load={load} />;
const lazyComponent = <Component extends FC<{}>>(load: () => Promise<Component>, key: string) =>
	lazyPage(async () => {
		const Page = await load();
		return <Page key={key} />;
	});
const lazyLayout = <Layout extends FC<PropsWithChildren<{}>>, Page extends FC<{}>>(
	loadLayout: () => Promise<Layout>,
	loadPage: () => Promise<Page>,
	layoutKey: string,
	pageKey: string
) => lazyPage(async () => {
	const [Layout, Page] = await Promise.all([loadLayout(), loadPage()]);
	return <Layout key={layoutKey}><Page key={pageKey} /></Layout>;
});
const lazySettingsPage = (loadPage: () => Promise<FC<{}>>, pageKey: string) => lazyLayout(
	() => import('./pages/user/settings/layout').then(module => module.UserSettingsLayout),
	loadPage,
	'userSettings',
	pageKey
);
const lazyUserDetailPage = (loadPage: () => Promise<FC<{}>>, pageKey: string) => lazyLayout(
	() => import('./pages/user/detail/layout').then(module => module.UserDetailLayout),
	loadPage,
	'userDetail',
	pageKey
);
const lazyAdminPage = (loadPage: () => Promise<FC<{}>>, pageKey: string) => lazyLayout(
	() => import('./pages/admin/layout').then(module => module.AdminLayout),
	loadPage,
	'admin',
	pageKey
);

const loadFeed = () => import('./pages/feed').then(module => module.default);
const loadThemeCreate = () => import('./pages/theme/create').then(module => module.ThemeCreate);
const loadUserDetailHome = () => import('./pages/user/detail/home').then(module => module.UserDetailHome);
const loadSettingsBrowserNotification = () => import('./pages/user/settings/browserNotification').then(module => module.UserSettingsBrowserNotification);
const loadAdminHome = () => import('./pages/admin/home').then(module => module.Admin);

const routes = defineRoutes(route => [
	route('/', lazyComponent(() => import('./pages/home').then(module => module.default), 'home')),
	route('/user/register', lazyComponent(() => import('./pages/user/register').then(module => module.Register), 'userRegister')),
	route('/user/login', lazyComponent(() => import('./pages/user/login').then(module => module.Login), 'userLogin')),
	route('/user/settings', lazySettingsPage(loadSettingsBrowserNotification, 'userSettingsBrowserNotification')),
	route('/user/settings/browserNotification', lazySettingsPage(loadSettingsBrowserNotification, 'userSettingsBrowserNotification')),
	route('/user/settings/username', lazySettingsPage(
		() => import('./pages/user/settings/username').then(module => module.UserSettingsUsername),
		'userSettingsGeneral'
	)),
	route('/user/settings/security', lazySettingsPage(
		() => import('./pages/user/settings/security').then(module => module.UserSettingsSecurity),
		'userSettingsSecurity'
	)),
	route('/user/notification', lazyComponent(() => import('./pages/user/notification').then(module => module.UserNotification), 'userNotification')),
	route('/user/:id{\\d+}', lazyUserDetailPage(loadUserDetailHome, 'userDetailHome')),
	route('/user/:id{\\d+}/home', lazyUserDetailPage(loadUserDetailHome, 'userDetailHome')),
	route('/user/:id{\\d+}/feed', lazyUserDetailPage(
		() => import('./pages/user/detail/feed').then(module => module.UserDetailFeed),
		'userDetailFeed'
	)),
	route('/user/:id{\\d+}/discussion', lazyUserDetailPage(
		() => import('./pages/user/detail/discussion').then(module => module.UserDetailDiscussion),
		'userDetailDiscussion'
	)),
	route('/user/:id{\\d+}/theme', lazyUserDetailPage(
		() => import('./pages/user/detail/theme').then(module => module.UserDetailTheme),
		'userDetailTheme'
	)),
	route('/user/:id{\\d+}/judgement', lazyUserDetailPage(
		() => import('./pages/user/detail/judgement').then(module => module.UserDetailJudgement),
		'userDetailJudgement'
	)),
	route('/user/:id{\\d+}/admin', lazyUserDetailPage(
		() => import('./pages/user/detail/admin').then(module => module.UserDetailAdmin),
		'userDetailAdmin'
	)),
	route('/feed', lazyComponent(loadFeed, 'feed')),
	route('/feed/:id{\\d+}', lazyComponent(loadFeed, 'feed')),
	route('/discussion', lazyComponent(() => import('./pages/discussion/list').then(module => module.DiscussionList), 'discussionList')),
	route('/discussion/post', lazyComponent(() => import('./pages/discussion/post').then(module => module.DiscussionPost), 'discussionPost')),
	route('/discussion/:id{\\d+}', lazyComponent(() => import('./pages/discussion/detail').then(module => module.DiscussionDetail), 'discussionDetail')),
	route('/discussion/reply/:id{\\d+}', lazyComponent(() => import('./pages/discussion/replyRedirect').then(module => module.DiscussionReplyRedirect), 'discussionReplyRedirect')),
	route('/ticket', lazyComponent(() => import('./pages/ticket/list').then(module => module.TicketList), 'ticketList')),
	route('/ticket/post', lazyComponent(() => import('./pages/ticket/post').then(module => module.TicketPost), 'ticketPost')),
	route('/ticket/:id{\\d+}', lazyComponent(() => import('./pages/ticket/detail').then(module => module.TicketDetail), 'ticketDetail')),
	route('/ticket/reply/:id{\\d+}', lazyComponent(() => import('./pages/ticket/replyRedirect').then(module => module.TicketReplyRedirect), 'ticketReplyRedirect')),
	route('/ide', lazyComponent(() => import('./pages/ide').then(module => module.IDE), 'ide')),
	route('/judgement', lazyComponent(() => import('./pages/judgement').then(module => module.Judgement), 'judgement')),
	route('/theme', lazyComponent(() => import('./pages/theme/list').then(module => module.ThemeList), 'themeList')),
	route('/theme/create', lazyComponent(loadThemeCreate, 'themeCreate')),
	route('/theme/:id{\\d+}', lazyComponent(loadThemeCreate, 'themeDetail')),
	route('/chat', lazyComponent(() => import('./pages/chat').then(module => module.Chat), 'chat')),
	route('/file/:path{.*}', lazyComponent(() => import('./pages/file').then(module => module.File), 'file')),
	route('/admin', lazyAdminPage(loadAdminHome, 'adminHome')),
	route('/admin/home', lazyAdminPage(loadAdminHome, 'adminHome')),
	route('/admin/domain-renew', lazyAdminPage(
		() => import('./pages/admin/domainRenew').then(module => module.AdminDomainRenew),
		'adminDomainRenew'
	)),
	route('/admin/check-in', lazyAdminPage(
		() => import('./pages/admin/checkIn').then(module => module.AdminCheckIn),
		'adminCheckIn'
	)),
	route('/admin/ticket-quick-reply', lazyAdminPage(
		() => import('./pages/admin/ticketQuickReply').then(module => module.AdminTicketQuickReply),
		'adminTicketQuickReply'
	)),
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
const App: FC<{}> = () => {
	const usingTheme = useUsingTheme();
	return <>
		<ThemeLoader theme={usingTheme} root='body' />
		<Header />
		<Nav />
		<main style={{ paddingTop: '50px' }}><Router routes={routes} /></main>
		<ToastContainer />
	</>
};
render(<ErrorBoundary><CurrentUserProvider><App /></CurrentUserProvider></ErrorBoundary>, document.getElementById('app')!);
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', loadLight);
} else {
	loadLight();
}