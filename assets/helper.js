let dialogId = 0;
const createDialog = (content, buttons) => {
	dialogId++;
	const dialog = document.createElement('div'), dialogMain = document.createElement('div'), closeBtn = document.createElement('i'), dialogBtns = document.createElement('div');
	let resolver;
	const ret = new Promise(resolve => resolver = resolve);
	dialogBtns.classList.add('dialog-buttons');
	buttons.forEach(info => {
		info.text ??= '';
		info.close ??= true;
		info.callback ??= () => {};
		const btn = document.createElement('button');
		if (typeof info.text === "string") {
			btn.innerHTML = info.text;
		} else {
			btn.append(content);
		}
		btn.addEventListener('click', info.close ? () => {
			resolver(info.callback());
			dialog.remove();
		} : info.callback);
		dialogBtns.append(btn);
	});
	closeBtn.classList.add('dialog-close-btn', 'fa-solid', 'fa-xmark');
	dialogMain.classList.add('dialog-main');
	dialogMain.innerHTML = `<div>${content}</div>`;
	dialogMain.append(closeBtn, dialogBtns);
	dialog.id = `dialog-${dialogId}`;
	dialog.classList.add('dialog');
	dialog.innerHTML = '<div class="dialog-bg"></div>';
	closeBtn.addEventListener('click', () => {
		dialog.remove();
		resolver();
	});
	dialog.getElementsByClassName('dialog-bg')[0].addEventListener('click', () => {
		dialog.remove();
		resolver();
	});
	dialog.append(dialogMain);
	document.body.append(dialog);
	return ret;
}
const createAlert = content => createDialog(content, [{ text: translations.ok }]);
const createConfirm = content => createDialog(content, [{ text: translations.cancel, callback: () => false }, { text: translations.ok, callback: () => true }]);
const CodeMirrorEditors = [];
const setPage = page => {
	const url = new URL(location.href);
	url.searchParams.set('page', page);
	location.href = url.toString();
};
const url = new URL('/ws', location.href);
url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(url.toString());
let recentNotificationsAfter = new Date().toISOString().replace('T', ' ').replace(/\.\d\d\dZ/, ''), interval;
ws.addEventListener('open', () => {
	interval = setInterval(() => ws.send(JSON.stringify({ recentNotificationsAfter })), 20000);
	document.getElementById('serverConnectStatus').style.color = 'green';
	document.getElementById('serverConnectStatus').title = translations.serverConnectStatusConnected;
});
ws.addEventListener('message', evt => {
	const recent = JSON.parse(evt.data);
	if (recent.length) {
		recentNotificationsAfter = recent[0].created_at;
	}
	if ('Notification' in window) {
		if (Notification.permission === 'granted') {
			recent.forEach(({ type }) => new Notification(translations['notificationTitle_' + type], {
				badge: '/favicon.ico',
				icon: '/favicon.ico',
				body: translations['notificationBody_' + type]
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
	document.getElementById('serverConnectStatus').title = translations.serverConnectStatusFailed;
};
ws.addEventListener('close', wsCloseOrErrorCallback);
ws.addEventListener('error', wsCloseOrErrorCallback);
