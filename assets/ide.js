// 加载语言列表
async function loadLanguages() {
    const select = document.getElementById('cxxVersion');
    try {
        const response = await fetch('/api/languages');
        const data = await response.json();
        // 清空下拉框
        select.innerHTML = '';
        // 填充语言选项
        data.languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.value;
            option.textContent = lang.label;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load languages:', error);
        select.innerHTML = '<option value="">Error loading languages</option>';
    }
}

// 页面加载完成后加载语言列表
document.addEventListener('DOMContentLoaded', loadLanguages);

// 运行代码
const run = () => {
    const url = new URL('/ws/ide-judge', location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const judger = new WebSocket(url.toString());
    judger.addEventListener('open', () => {
        const language = document.getElementById('cxxVersion').value;
        // 如果用户勾选了 O2，但选中的语言本身已经包含 -o2 后缀，则不再重复添加
        const o2 = document.getElementById('cxxO2').checked;
        let finalLanguage = language;
        if (o2 && !language.endsWith('-o2')) {
            finalLanguage = language + '-o2';
        }
        const timeLimit = parseInt(document.getElementById('timeLimit').value) || 1000;
        const memoryLimit = parseInt(document.getElementById('memoryLimit').value) || 256;
        judger.send(JSON.stringify({
            code: document.getElementById('code').value,
            input: document.getElementById('stdin').value,
            language: finalLanguage,
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
        if (data.status === 'Compilation Error') {
            CodeMirrorEditor_actualOutput.setValue(data.stderr ?? '');
        } else {
            CodeMirrorEditor_actualOutput.setValue(data.stdout ?? '');
        }
        CodeMirrorEditor_stderr.setValue(data.stderr ?? '');
    });
};