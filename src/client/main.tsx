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
	return <>{page ?? (error ? <div role='alert'>{error}</div> : <div>{t('loading')}</div>)}</>;
};
const lazyPage = (load: () => Promise<Child>) => () => <LazyPage load={load} />;

const routes = defineRoutes(route => [
	route('/', lazyPage(async () => {
		const { default: Home } = await import('./pages/home');
		return <Home key='home' />;
	})),
	route('/user/register', lazyPage(async () => {
		const { Register } = await import('./pages/user/register');
		return <Register key='userRegister' />;
	})),
	route('/user/login', lazyPage(async () => {
		const { Login } = await import('./pages/user/login');
		return <Login key='userLogin' />;
	})),
	route('/user/settings', lazyPage(async () => {
		const [{ UserSettingsLayout }, { UserSettingsBrowserNotification }] = await Promise.all([
			import('./pages/user/settings/layout'),
			import('./pages/user/settings/browserNotification')
		]);
		return <UserSettingsLayout key='userSettings'><UserSettingsBrowserNotification key='userSettingsBrowserNotification' /></UserSettingsLayout>;
	})),
	route('/user/settings/browserNotification', lazyPage(async () => {
		const [{ UserSettingsLayout }, { UserSettingsBrowserNotification }] = await Promise.all([
			import('./pages/user/settings/layout'),
			import('./pages/user/settings/browserNotification')
		]);
		return <UserSettingsLayout key='userSettings'><UserSettingsBrowserNotification key='userSettingsBrowserNotification' /></UserSettingsLayout>;
	})),
	route('/user/settings/username', lazyPage(async () => {
		const [{ UserSettingsLayout }, { UserSettingsUsername }] = await Promise.all([
			import('./pages/user/settings/layout'),
			import('./pages/user/settings/username')
		]);
		return <UserSettingsLayout key='userSettings'><UserSettingsUsername key='userSettingsGeneral' /></UserSettingsLayout>;
	})),
	route('/user/settings/security', lazyPage(async () => {
		const [{ UserSettingsLayout }, { UserSettingsSecurity }] = await Promise.all([
			import('./pages/user/settings/layout'),
			import('./pages/user/settings/security')
		]);
		return <UserSettingsLayout key='userSettings'><UserSettingsSecurity key='userSettingsSecurity' /></UserSettingsLayout>;
	})),
	route('/user/notification', lazyPage(async () => {
		const { UserNotification } = await import('./pages/user/notification');
		return <UserNotification key='userNotification' />;
	})),
	route('/user/:id{\\d+}', lazyPage(async () => {
		const [{ UserDetailLayout }, { UserDetailHome }] = await Promise.all([
			import('./pages/user/detail/layout'),
			import('./pages/user/detail/home')
		]);
		return <UserDetailLayout key='userDetail'><UserDetailHome key='userDetailHome' /></UserDetailLayout>;
	})),
	route('/user/:id{\\d+}/home', lazyPage(async () => {
		const [{ UserDetailLayout }, { UserDetailHome }] = await Promise.all([
			import('./pages/user/detail/layout'),
			import('./pages/user/detail/home')
		]);
		return <UserDetailLayout key='userDetail'><UserDetailHome key='userDetailHome' /></UserDetailLayout>;
	})),
	route('/user/:id{\\d+}/feed', lazyPage(async () => {
		const [{ UserDetailLayout }, { UserDetailFeed }] = await Promise.all([
			import('./pages/user/detail/layout'),
			import('./pages/user/detail/feed')
		]);
		return <UserDetailLayout key='userDetail'><UserDetailFeed key='userDetailFeed' /></UserDetailLayout>;
	})),
	route('/user/:id{\\d+}/discussion', lazyPage(async () => {
		const [{ UserDetailLayout }, { UserDetailDiscussion }] = await Promise.all([
			import('./pages/user/detail/layout'),
			import('./pages/user/detail/discussion')
		]);
		return <UserDetailLayout key='userDetail'><UserDetailDiscussion key='userDetailDiscussion' /></UserDetailLayout>;
	})),
	route('/user/:id{\\d+}/theme', lazyPage(async () => {
		const [{ UserDetailLayout }, { UserDetailTheme }] = await Promise.all([
			import('./pages/user/detail/layout'),
			import('./pages/user/detail/theme')
		]);
		return <UserDetailLayout key='userDetail'><UserDetailTheme key='userDetailTheme' /></UserDetailLayout>;
	})),
	route('/user/:id{\\d+}/judgement', lazyPage(async () => {
		const [{ UserDetailLayout }, { UserDetailJudgement }] = await Promise.all([
			import('./pages/user/detail/layout'),
			import('./pages/user/detail/judgement')
		]);
		return <UserDetailLayout key='userDetail'><UserDetailJudgement key='userDetailJudgement' /></UserDetailLayout>;
	})),
	route('/user/:id{\\d+}/admin', lazyPage(async () => {
		const [{ UserDetailLayout }, { UserDetailAdmin }] = await Promise.all([
			import('./pages/user/detail/layout'),
			import('./pages/user/detail/admin')
		]);
		return <UserDetailLayout key='userDetail'><UserDetailAdmin key='userDetailAdmin' /></UserDetailLayout>;
	})),
	route('/feed', lazyPage(async () => {
		const { default: Feed } = await import('./pages/feed');
		return <Feed key='feed' />;
	})),
	route('/feed/:id{\\d+}', lazyPage(async () => {
		const { default: Feed } = await import('./pages/feed');
		return <Feed key='feed' />;
	})),
	route('/discussion', lazyPage(async () => {
		const { DiscussionList } = await import('./pages/discussion/list');
		return <DiscussionList key='discussionList' />;
	})),
	route('/discussion/post', lazyPage(async () => {
		const { DiscussionPost } = await import('./pages/discussion/post');
		return <DiscussionPost key='discussionPost' />;
	})),
	route('/discussion/:id{\\d+}', lazyPage(async () => {
		const { DiscussionDetail } = await import('./pages/discussion/detail');
		return <DiscussionDetail key='discussionDetail' />;
	})),
	route('/discussion/reply/:id{\\d+}', lazyPage(async () => {
		const { DiscussionReplyRedirect } = await import('./pages/discussion/replyRedirect');
		return <DiscussionReplyRedirect key='discussionReplyRedirect' />;
	})),
	route('/ticket', lazyPage(async () => {
		const { TicketList } = await import('./pages/ticket/list');
		return <TicketList key='ticketList' />;
	})),
	route('/ticket/post', lazyPage(async () => {
		const { TicketPost } = await import('./pages/ticket/post');
		return <TicketPost key='ticketPost' />;
	})),
	route('/ticket/:id{\\d+}', lazyPage(async () => {
		const { TicketDetail } = await import('./pages/ticket/detail');
		return <TicketDetail key='ticketDetail' />;
	})),
	route('/ticket/reply/:id{\\d+}', lazyPage(async () => {
		const { TicketReplyRedirect } = await import('./pages/ticket/replyRedirect');
		return <TicketReplyRedirect key='ticketReplyRedirect' />;
	})),
	route('/ide', lazyPage(async () => {
		const { IDE } = await import('./pages/ide');
		return <IDE key='ide' />;
	})),
	route('/judgement', lazyPage(async () => {
		const { Judgement } = await import('./pages/judgement');
		return <Judgement key='judgement' />;
	})),
	route('/theme', lazyPage(async () => {
		const { ThemeList } = await import('./pages/theme/list');
		return <ThemeList key='themeList' />;
	})),
	route('/theme/create', lazyPage(async () => {
		const { ThemeCreate } = await import('./pages/theme/create');
		return <ThemeCreate key='themeCreate' />;
	})),
	route('/theme/:id{\\d+}', lazyPage(async () => {
		const { ThemeCreate } = await import('./pages/theme/create');
		return <ThemeCreate key='themeDetail' />;
	})),
	route('/chat', lazyPage(async () => {
		const { Chat } = await import('./pages/chat');
		return <Chat key='chat' />;
	})),
	route('/file/:path{.*}', lazyPage(async () => {
		const { File } = await import('./pages/file');
		return <File key='file' />;
	})),
	route('/admin', lazyPage(async () => {
		const [{ AdminLayout }, { Admin }] = await Promise.all([
			import('./pages/admin/layout'),
			import('./pages/admin/home')
		]);
		return <AdminLayout key='admin'><Admin key='adminHome' /></AdminLayout>;
	})),
	route('/admin/home', lazyPage(async () => {
		const [{ AdminLayout }, { Admin }] = await Promise.all([
			import('./pages/admin/layout'),
			import('./pages/admin/home')
		]);
		return <AdminLayout key='admin'><Admin key='adminHome' /></AdminLayout>;
	})),
	route('/admin/domain-renew', lazyPage(async () => {
		const [{ AdminLayout }, { AdminDomainRenew }] = await Promise.all([
			import('./pages/admin/layout'),
			import('./pages/admin/domainRenew')
		]);
		return <AdminLayout key='admin'><AdminDomainRenew key='adminDomainRenew' /></AdminLayout>;
	})),
	route('/admin/check-in', lazyPage(async () => {
		const [{ AdminLayout }, { AdminCheckIn }] = await Promise.all([
			import('./pages/admin/layout'),
			import('./pages/admin/checkIn')
		]);
		return <AdminLayout key='admin'><AdminCheckIn key='adminCheckIn' /></AdminLayout>;
	})),
	route('/admin/ticket-quick-reply', lazyPage(async () => {
		const [{ AdminLayout }, { AdminTicketQuickReply }] = await Promise.all([
			import('./pages/admin/layout'),
			import('./pages/admin/ticketQuickReply')
		]);
		return <AdminLayout key='admin'><AdminTicketQuickReply key='adminTicketQuickReply' /></AdminLayout>;
	})),
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