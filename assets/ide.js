async function loadLanguages() {
    const select = document.getElementById('cxxVersion');
    const response = await fetch('/api/languages');
    const data = await response.json();
    select.innerHTML = '';
    data.languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.value;
        option.textContent = lang.label;
        select.appendChild(option);
    });
}

document.addEventListener('DOMContentLoaded', loadLanguages);

const run = () => {
    const codeEl = document.getElementById('code');
    const stdinEl = document.getElementById('stdin');
    const versionSelect = document.getElementById('cxxVersion');
    const timeLimitEl = document.getElementById('timeLimit');
    const memoryLimitEl = document.getElementById('memoryLimit');
    const resultEl = document.getElementById('result');

    const url = new URL('/ws/ide-judge', location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const judger = new WebSocket(url.toString());

    judger.addEventListener('open', () => {
        const language = versionSelect.value;
        if (!language) {
            alert('请选择一种语言');
            return;
        }
        const timeLimit = parseInt(timeLimitEl.value) || 1000;
        const memoryLimit = parseInt(memoryLimitEl.value) || 256;
        judger.send(JSON.stringify({
            code: codeEl.value,
            input: stdinEl.value,
            language: language,
            time_limit_ms: timeLimit,
            memory_limit_mb: memoryLimit,
        }));
        resultEl.innerHTML = window.ideTranslations.running;
    });

    judger.addEventListener('message', ({ data: dataString }) => {
        const data = JSON.parse(dataString);
        const status = window.ideTranslations[data.status] || data.status;
        resultEl.innerHTML = `
            ${status}
            ${data.time_ms ? '<br />' + data.time_ms + 'ms' : ''}
        `;
        if (data.status === 'Compilation Error') {
            CodeMirrorEditor_actualOutput.setValue(data.stderr ?? '');
        } else {
            CodeMirrorEditor_actualOutput.setValue(data.stdout ?? '');
        }
        CodeMirrorEditor_stderr.setValue(data.stderr ?? '');
    });
};