const run = () => {
	const url = new URL('/ws/ide-judge', location.href);
	url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
	const judger = new WebSocket(url.toString());
	judger.addEventListener('open', () => {
		judger.send(JSON.stringify({
			code: document.getElementById('code').value,
			input: document.getElementById('stdin').value,
		}));
		document.getElementById('result').innerHTML = 'running';
	});
	judger.addEventListener('message', ({ data: dataString }) => {
		const data = JSON.parse(dataString);
		document.getElementById('result').innerHTML = `
			${{ 'Wrong Answer': 'Accepted' }[data.status] ?? data.status}
			${data.time_ms ? '<br />' + data.time_ms + 'ms' : ''}
		`;
		CodeMirrorEditor_stdout.setValue(data.stdout ?? '');
		CodeMirrorEditor_stderr.setValue(data.stderr ?? '');
	});
};