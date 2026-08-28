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
        const timeLimit = parseInt(document.getElementById('timeLimit').value) || 1000;
        const memoryLimit = parseInt(document.getElementById('memoryLimit').value) || 256;
        judger.send(JSON.stringify({
            code: document.getElementById('code').value,
            input: document.getElementById('stdin').value,
            language: language,
            time_limit_ms: timeLimit,
            memory_limit_mb: memoryLimit,
        }));
        document.getElementById('result').innerHTML = window.ideTranslations['running'] || 'running';
    });
    judger.addEventListener('message', ({ data: dataString }) => {
        const data = JSON.parse(dataString);
        const status = window.ideTranslations[data.status] || data.status;
        document.getElementById('result').innerHTML = `
			${status}
			${data.time_ms ? '<br />' + data.time_ms + 'ms' : ''}
		`;
        // 实际输出：如果是编译错误，显示 stderr，否则显示 stdout
        if (data.status === 'Compilation Error') {
            CodeMirrorEditor_actualOutput.setValue(data.stderr ?? '');
        } else {
            CodeMirrorEditor_actualOutput.setValue(data.stdout ?? '');
        }
    });
};