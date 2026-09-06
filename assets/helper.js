const CodeMirrorEditors = [], switchLight = () => {
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
}, loadLight = () => {
	switch (localStorage.lightMode) {
		case 'system':
			document.documentElement.style.colorScheme = 'light dark';
			document.getElementById('lightSwitchIcon').classList = 'fa-solid fa-circle-half-stroke';
			break;
		case 'light':
			document.documentElement.style.colorScheme = 'light';
			document.getElementById('lightSwitchIcon').classList = 'fa-solid fa-sun';
			break;
		case 'dark':
			document.documentElement.style.colorScheme = 'dark';
			document.getElementById('lightSwitchIcon').classList = 'fa-solid fa-moon';
			break;
		default:
			localStorage.lightMode = 'system';
			document.documentElement.style.colorScheme = 'light dark';
			document.getElementById('lightSwitchIcon').classList = 'fa-solid fa-circle-half-stroke';
			break;
	}
	const probe = document.createElement('div');
	probe.style.position = 'absolute';
	probe.style.visibility = 'hidden';
	probe.style.pointerEvents = 'none';
	probe.style.width = '0';
	probe.style.height = '0';
	probe.style.backgroundColor = 'light-dark(black, white)';
	document.body.appendChild(probe);
	const bgColor = getComputedStyle(probe).backgroundColor;
	document.body.removeChild(probe);
	const CodeMirrorTheme = ['rgb(0, 0, 0)'].includes(bgColor) ? 'duotone-light' : 'duotone-dark';
	CodeMirrorEditors.forEach(editor => editor.setOption('theme', CodeMirrorTheme));
}, setPage = page => {
	const url = new URL(location.href);
	url.searchParams.set('page', page);
	location.href = url.toString();
};
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', loadLight);
} else {
	loadLight();
}
const url = new URL('/ws', location.href);
url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(url.toString());
let recentNotificationsAfter = new Date().toISOString().replace('T', ' ').replace(/\.\d\d\dZ/, ''), interval;
ws.addEventListener('open', () => {
	interval = setInterval(() => ws.send(JSON.stringify({ recentNotificationsAfter })), 20000);
	document.getElementById('serverConnectStatus').style.color = 'green';
	document.getElementById('serverConnectStatus').title = helperScriptTranslations.serverConnectStatusConnected;
});
ws.addEventListener('message', evt => {
	const recent = JSON.parse(evt.data);
	if (recent.length) {
		recentNotificationsAfter = recent[0].created_at;
	}
	if ('Notification' in window) {
		if (Notification.permission === 'granted') {
			recent.forEach(({ type }) => new Notification(helperScriptTranslations['notificationTitle_' + type], {
				badge: '/favicon.ico',
				icon: '/favicon.ico',
				body: helperScriptTranslations['notificationBody_' + type]
			}).onclick = () => window.open({
				notification: '/user/notification',
				privateMessage: '/private-message'
			}[type]));
		}
	}
});
const wsCloseOrErrorCallback = () => {
	clearInterval(interval);
	document.getElementById('serverConnectStatus').style.color = 'red';
	document.getElementById('serverConnectStatus').title = helperScriptTranslations.serverConnectStatusFailed;
};
ws.addEventListener('close', wsCloseOrErrorCallback);
ws.addEventListener('error', wsCloseOrErrorCallback);