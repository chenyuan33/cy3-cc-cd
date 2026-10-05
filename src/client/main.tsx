import { defineRoutes, Router } from '@w3cj/ruta';
import Home from './pages/home';
import { render, useEffect, useState, type FC, type PropsWithChildren } from 'hono/jsx/dom';
import { loadI18n, t, tString } from './i18n';
import { permissionAdmin } from '../settings';
import { User } from './components/user';
import { CurrentUserProvider, useCurrentUser } from './currentUser';
import { A } from './components/a';
import { NotFound } from './pages/error';
import { Register } from './pages/user/register';
import { Login } from './pages/user/login';
import Feed from './pages/feed';
import './style.css';
import { toast, ToastContainer } from './components/toast';
import { CodeMirrorEditors } from './components/editor/codemirror';
import { MonacoEditors } from './components/editor/monacoeditor';
import { isLightMode } from './isLightMode';

const routes = defineRoutes(route => [
	route('/', () => <Home key='home' />),
	route('/user/register', () => <Register key='userRegister' />),
	route('/user/login', () => <Login key='userLogin' />),
	route('/feed', () => <Feed key='feed' />),
	route('/feed/:id{\\d+}', () => <Feed key='feed' />),
	route('*', NotFound)
]);
declare module "@w3cj/ruta" {
	interface Register {
		routes: typeof routes;
	}
}
await loadI18n();
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
	const duotone = (await import('@uiw/codemirror-theme-duotone'))[lightMode ? 'duotoneLight' : 'duotoneDark'];
	CodeMirrorEditors.forEach(async ({ editor, themeCompartment }) => editor.dispatch({ effects: themeCompartment.reconfigure(duotone) }));
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
		toast(error);
	}
	return <>{children}</>;
};
const Header: FC<{}> = () => {
	const currentUser = useCurrentUser();
	const [{ notificationCount, privateMessageCount }, setNotifCounts] = useState({ notificationCount: 0, privateMessageCount: 0 });
	useEffect(() => { (async () => setNotifCounts(await (await fetch('/api/notificationCount')).json()))() }, [currentUser?.id]);
	const [serverConnectStatus, setServerConnectStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
	useEffect(() => {
		const url = new URL('/ws', location.href);
		url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
		const ws = new WebSocket(url.toString());
		let recentNotificationsAfter = new Date().toISOString().replace('T', ' ').replace(/\.\d\d\dZ/, ''), interval: NodeJS.Timeout;
		ws.addEventListener('open', () => {
			interval = setInterval(() => ws.send(JSON.stringify({ recentNotificationsAfter })), 20000);
			setServerConnectStatus('connected');
		});
		ws.addEventListener('message', evt => {
			const recent = JSON.parse(evt.data);
			if (recent.length) {
				recentNotificationsAfter = recent[0].created_at;
			}
			if ('Notification' in window) {
				if (Notification.permission === 'granted') {
					recent.forEach(({ type }: { type: 'notification' | 'privateMessage' }) => new Notification(tString(`browserNotification.title.${type}`), {
						badge: '/favicon.ico',
						icon: '/favicon.ico',
						body: tString(`browserNotification.body.${type}`)
					}).onclick = () => window.open({
						notification: '/user/notification',
						privateMessage: '/private-message'
					}[type]));
				}
			}
		});
		const wsCloseOrErrorCallback = () => {
			clearInterval(interval);
			setServerConnectStatus('failed');
		};
		ws.addEventListener('close', wsCloseOrErrorCallback);
		ws.addEventListener('error', wsCloseOrErrorCallback);
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
			}} title={tString('serverConnectStatus.' + serverConnectStatus)} id='serverConnectStatus'></i>
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
			<span class='sidebarTitle'>{t('ide')}</span>
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
render(<ErrorBoundary><CurrentUserProvider>
	<Header />
	<Nav />
	<main style={{ paddingTop: '50px' }}><Router routes={routes} /></main>
	<ToastContainer />
</CurrentUserProvider></ErrorBoundary>, document.getElementById('app')!);
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', loadLight);
} else {
	loadLight();
}