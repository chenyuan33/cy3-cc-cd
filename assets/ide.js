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
    const expectedOutputEl = document.getElementById('expectedOutput');
    const versionSelect = document.getElementById('cxxVersion');
    const timeLimitEl = document.getElementById('timeLimit');
    const memoryLimitEl = document.getElementById('memoryLimit');
    const resultEl = document.getElementById('result');

    const language = versionSelect.value;
    if (!language) {
        alert(window.ideTranslations.selectLanguage || 'Please select a language');
        return;
    }

    const input = stdinEl.value ?? '';
    const output = expectedOutputEl.value ?? '';
    let timeLimit = parseInt(timeLimitEl.value) || 1000;
    let memoryLimit = parseInt(memoryLimitEl.value) || 256;
    if (timeLimit < 1) timeLimit = 1000;
    if (memoryLimit < 16) memoryLimit = 256;
    if (memoryLimit > 2048) memoryLimit = 2048;

    const url = new URL('/ws/ide-judge', location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const judger = new WebSocket(url.toString());

    judger.addEventListener('open', () => {
        judger.send(JSON.stringify({
            language: language,
            code: codeEl.value,
            test_cases: [{ input, output }],
            time_limit_ms: timeLimit,
            memory_limit_mb: memoryLimit
        }));
        resultEl.innerHTML = window.ideTranslations.running || 'running';
    });

    judger.addEventListener('message', ({ data: dataString }) => {
        const data = JSON.parse(dataString);
        if (data.error) {
            resultEl.innerHTML = 'Error: ' + data.error;
            return;
        }
        const result = data.results && data.results.length ? data.results[0] : {};
        const status = window.ideTranslations[result.status] || result.status || data.status;
        const stdout = result.stdout ?? '';
        const stderr = result.stderr ?? '';
        const timeMs = result.time_ms ?? data.time_ms;

        resultEl.innerHTML = status + (timeMs ? '<br />' + timeMs + 'ms' : '');
        CodeMirrorEditor_actualOutput.setValue(stdout);
        CodeMirrorEditor_stderr.setValue(stderr);
    });

    judger.addEventListener('error', () => {
        resultEl.innerHTML = 'WebSocket error';
    });
};