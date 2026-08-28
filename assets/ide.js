// 加载语言列表
async function loadLanguages() {
    const select = document.getElementById('cxxVersion');
    if (!select) {
        console.warn('cxxVersion select not found');
        return;
    }
    try {
        const response = await fetch('/api/languages');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        // 清空下拉框
        select.innerHTML = '';
        // 填充语言选项
        if (data.languages && Array.isArray(data.languages)) {
            data.languages.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.value;
                option.textContent = lang.label;
                select.appendChild(option);
            });
        } else {
            throw new Error('Invalid languages data');
        }
    } catch (error) {
        console.error('Failed to load languages:', error);
        // 使用备用语言列表
        const fallback = [
            { value: 'cpp17', label: 'C++17' },
            { value: 'cpp20', label: 'C++20' },
            { value: 'cpp23', label: 'C++23' },
            { value: 'python3', label: 'Python 3' },
            { value: 'javascript', label: 'JavaScript' },
        ];
        select.innerHTML = '';
        fallback.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.value;
            option.textContent = lang.label;
            select.appendChild(option);
        });
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
        if (!language) {
            alert('请选择一种语言');
            return;
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
        if (data.status === 'Compilation Error') {
            CodeMirrorEditor_actualOutput.setValue(data.stderr ?? '');
        } else {
            CodeMirrorEditor_actualOutput.setValue(data.stdout ?? '');
        }
        CodeMirrorEditor_stderr.setValue(data.stderr ?? '');
    });
};