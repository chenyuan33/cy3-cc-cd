const loadedScripts = new Set();

function loadModeScript(scriptName, callback) {
    if (!scriptName) {
        if (callback) callback();
        return;
    }
    if (loadedScripts.has(scriptName)) {
        if (callback) callback();
        return;
    }
    const script = document.createElement('script');
    script.src = `https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.21/mode/${scriptName}/${scriptName}.min.js`;
    script.onload = () => {
        loadedScripts.add(scriptName);
        if (callback) callback();
    };
    script.onerror = () => {
        if (callback) callback();
    };
    document.head.appendChild(script);
}

async function loadLanguages() {
    const select = document.getElementById('cxxVersion');
    const response = await fetch('/api/languages');
    const data = await response.json();
    select.innerHTML = '';
    data.languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.value;
        option.textContent = lang.label;
        option.dataset.editorMode = lang.editorMode || 'text/plain';
        option.dataset.codemirrorScript = lang.codemirrorScript || '';
        select.appendChild(option);
    });

    const firstOption = select.options[0];
    if (firstOption && firstOption.dataset.codemirrorScript) {
        loadModeScript(firstOption.dataset.codemirrorScript);
    } else {
        loadModeScript('clike');
    }

    select.addEventListener('change', function () {
        const selected = this.options[this.selectedIndex];
        if (!selected) return;
        const editorMode = selected.dataset.editorMode || 'text/plain';
        const scriptName = selected.dataset.codemirrorScript;
        const codeEditor = window['CodeMirrorEditor_code'];
        if (!codeEditor) return;
        codeEditor.setOption('mode', editorMode);
        if (scriptName) {
            loadModeScript(scriptName);
        }
    });
}

document.addEventListener('DOMContentLoaded', loadLanguages);

const run = () => {
    const codeEditor = window['CodeMirrorEditor_code'];
    const stdinEditor = window['CodeMirrorEditor_stdin'];
    const expectedOutputEditor = window['CodeMirrorEditor_expectedOutput'];
    const versionSelect = document.getElementById('cxxVersion');
    const timeLimitEl = document.getElementById('timeLimit');
    const memoryLimitEl = document.getElementById('memoryLimit');
    const resultEl = document.getElementById('result');

    const language = versionSelect.value;
    if (!language) {
        alert(ideTranslations.ideSelectLanguage);
        return;
    }

    const input = stdinEditor ? stdinEditor.getValue() : '';
    const output = expectedOutputEditor ? expectedOutputEditor.getValue() : '';
    let timeLimit = parseInt(timeLimitEl.value) || timeLimitDefault;
    let memoryLimit = parseInt(memoryLimitEl.value) || memoryLimitDefault;
    if (timeLimit < 1) timeLimit = timeLimitDefault;
    if (memoryLimit < 16) memoryLimit = memoryLimitDefault;
    if (memoryLimit > 2048) memoryLimit = 2048;

    const url = new URL('/ws/ide-judge', location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const judger = new WebSocket(url.toString());

    judger.addEventListener('open', () => {
        judger.send(JSON.stringify({
            language: language,
            code: codeEditor ? codeEditor.getValue() : '',
            test_cases: [{ input, output }],
            time_limit_ms: timeLimit,
            memory_limit_mb: memoryLimit
        }));
        resultEl.innerHTML = ideTranslations.ideStatus_running;
    });

    judger.addEventListener('message', ({ data: dataString }) => {
        const data = JSON.parse(dataString);
        if (data.error) {
            resultEl.innerHTML = ideTranslations.ideErrorPrefix + data.error;
            return;
        }
        const result = data.results && data.results.length ? data.results[0] : {};
        const rawStatus = result.status || data.status || 'InternalError';
        const statusKey = 'ideStatus_' + rawStatus.replace(/ /g, '');
        const status = ideTranslations[statusKey] || rawStatus;
        const stdout = result.stdout ?? '';
        const stderr = result.stderr ?? '';
        const timeMs = result.time_ms ?? data.time_ms;

        resultEl.innerHTML = status + (timeMs ? '<br />' + timeMs + 'ms' : '');
        const actualOutputEditor = window['CodeMirrorEditor_actualOutput'];
        const stderrEditor = window['CodeMirrorEditor_stderr'];
        if (actualOutputEditor) actualOutputEditor.setValue(stdout);
        if (stderrEditor) stderrEditor.setValue(stderr);
    });

    judger.addEventListener('error', () => {
        resultEl.innerHTML = ideTranslations.ideWebSocketError;
    });
};