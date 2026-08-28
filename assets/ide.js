const run = () => {
    const url = new URL('/ws/ide-judge', location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const judger = new WebSocket(url.toString());
    judger.addEventListener('open', () => {
        const version = document.getElementById('cxxVersion').value;
        const o2 = document.getElementById('cxxO2').checked;
        let language = version;
        if (o2) {
            language += '-o2';
        }
        judger.send(JSON.stringify({
            code: document.getElementById('code').value,
            input: document.getElementById('stdin').value,
            language: language,
        }));
        document.getElementById('result').innerHTML = ideTranslations['running'] || 'running';
    });
    judger.addEventListener('message', ({ data: dataString }) => {
        const data = JSON.parse(dataString);
        const status = ideTranslations[data.status] || data.status;
        document.getElementById('result').innerHTML = `
			${status}
			${data.time_ms ? '<br />' + data.time_ms + 'ms' : ''}
		`;
        CodeMirrorEditor_stdout.setValue(data.stdout ?? '');
        CodeMirrorEditor_stderr.setValue(data.stderr ?? '');
    });
};