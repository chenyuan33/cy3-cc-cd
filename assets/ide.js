const CodeMirrorModeMap = {
	'python': 'text/x-python',
	'python3': 'text/x-python',
	'js': 'text/javascript',
	'javascript': 'text/javascript',
	'cpp14': 'text/x-c++src',
	'cpp17': 'text/x-c++src',
	'cpp20': 'text/x-c++src',
	'cpp23': 'text/x-c++src',
	'cpp14-o2': 'text/x-c++src',
	'cpp17-o2': 'text/x-c++src',
	'cpp20-o2': 'text/x-c++src',
	'cpp23-o2': 'text/x-c++src',
	'c': 'text/x-csrc',
	'cpp': 'text/x-c++src',
	'c++': 'text/x-c++src'
}, run = () => {
	const url = new URL('/ws/ide-judge', location.href);
	url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
	const judger = new WebSocket(url.toString());
	judger.addEventListener('open', () => {
		judger.send(JSON.stringify({
			lang: document.getElementById('lang').value,
			timeLimit: document.getElementById('timeLimit').value,
			memoryLimit: document.getElementById('memoryLimit').value,
			code: document.getElementById('code').value,
			stdin: document.getElementById('stdin').value,
			expectedOutput: document.getElementById('expectedOutput').value
		}));
		document.getElementById('result').innerHTML = judgeResult_Judging;
	});
	judger.addEventListener('message', ({ data: dataString }) => {
		const data = JSON.parse(dataString);
		document.getElementById('result').innerHTML = `
			${window['judgeResult_' + data.status.replaceAll(' ', '_')] ?? data.status}
			${data.time_ms ? '<br />' + data.time_ms + 'ms' : ''}
		`;
		CodeMirrorEditor_actualOutput.setValue(data.stdout ?? '');
		CodeMirrorEditor_stderr.setValue(data.stderr ?? '');
	});
};
document.addEventListener('DOMContentLoaded', async () => {
	const langSelector = document.getElementById('lang');
	langSelector.innerHTML = (await (await fetch('/api/support-langs')).json()).languages.map(({ value, label }) => `<option value=${value}>${label}</option>`).join('');
	langSelector.addEventListener('change', e => CodeMirrorEditor_code.setOption('mode', CodeMirrorModeMap[e.target.value]));
	CodeMirrorEditor_code.setOption('mode', CodeMirrorModeMap[langSelector.value]);
});