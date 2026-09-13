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
};

const MonacoLangMap = {
	'python': 'python',
	'python3': 'python',
	'js': 'javascript',
	'javascript': 'javascript',
	'cpp14': 'cpp',
	'cpp17': 'cpp',
	'cpp20': 'cpp',
	'cpp23': 'cpp',
	'cpp14-o2': 'cpp',
	'cpp17-o2': 'cpp',
	'cpp20-o2': 'cpp',
	'cpp23-o2': 'cpp',
	'c': 'c',
	'cpp': 'cpp',
	'c++': 'cpp'
};

let monacoEditor = null;
let currentEditor = 'codemirror';

const getEditorPref = () => {
	try {
		const theme = JSON.parse(localStorage.getItem('theme') || '{}');
		return theme.editor || 'codemirror';
	} catch {
		return 'codemirror';
	}
};

const initMonacoEditor = async (language = 'plaintext') => {
	if (typeof require === 'undefined' || !require.config) {
		return null;
	}

	return new Promise((resolve) => {
		const timeout = setTimeout(() => resolve(null), 10000);
		require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
		require(['vs/editor/editor.main'], () => {
			clearTimeout(timeout);
			const container = document.getElementById('monacoEditor');
			if (!container) {
				resolve(null);
				return;
			}

			try {
				const isDark = document.documentElement.style.colorScheme === 'dark';
				const editor = monaco.editor.create(container, {
					value: CodeMirrorEditor_code?.getValue() || '',
					language: MonacoLangMap[language] || 'plaintext',
					theme: isDark ? 'vs-dark' : 'vs',
					minimap: { enabled: true },
					automaticLayout: false,
					scrollBeyondLastLine: false,
					fontSize: 14,
					tabSize: 4,
					wordWrap: 'on',
					lineNumbers: 'on',
					renderLineHighlight: 'line',
					quickSuggestions: true,
					suggestOnTriggerCharacters: true,
					acceptSuggestionOnCommitCharacter: true,
					snippetSuggestions: 'top',
					emptySelectionClipboard: true,
					clipboardPasteAsPlainText: true,
					formatOnPaste: true,
					formatOnType: true,
					diagnostics: true,
					readOnly: false,
					fixedOverflowWidgets: false,
					overviewRulerLanes: 0,
					hideCursorInOverviewRuler: true,
					overviewRulerBorder: false
				});

				monaco.editor.setModelLanguage(editor.getModel(), MonacoLangMap[language] || 'plaintext');

				const updateMonacoTheme = () => {
					const isDark = document.documentElement.style.colorScheme === 'dark';
					monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
				};

				const observer = new MutationObserver(updateMonacoTheme);
				observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

				resolve(editor);
			} catch (e) {
				console.error('Failed to create Monaco Editor:', e);
				resolve(null);
			}
		});
	});
};

const switchToMonaco = async (language) => {
	if (currentEditor === 'monaco') return;

	const cmEditor = document.getElementById('codemirrorEditor');
	const monacoContainer = document.getElementById('monacoEditor');

	if (!monacoEditor) {
		monacoEditor = await initMonacoEditor(language);
	}

	if (monacoEditor) {
		const code = CodeMirrorEditor_code?.getValue() || '';
		monacoEditor.setValue(code);

		cmEditor.style.display = 'none';
		monacoContainer.style.display = 'block';

		setTimeout(() => {
			monacoEditor.layout();
		}, 0);

		currentEditor = 'monaco';
	} else {
		cmEditor.style.display = 'block';
		monacoContainer.style.display = 'none';
		currentEditor = 'codemirror';
	}
};

const switchToCodeMirror = (language) => {
	if (currentEditor === 'codemirror') return;

	const cmEditor = document.getElementById('codemirrorEditor');
	const monacoContainer = document.getElementById('monacoEditor');

	if (monacoEditor) {
		const code = monacoEditor.getValue();
		CodeMirrorEditor_code.setValue(code);
	}

	cmEditor.style.display = 'block';
	monacoContainer.style.display = 'none';

	currentEditor = 'codemirror';
};

const getEditorValue = () => {
	if (currentEditor === 'monaco' && monacoEditor) {
		return monacoEditor.getValue();
	}
	return CodeMirrorEditor_code?.getValue() || '';
};

const setEditorValue = (value) => {
	if (currentEditor === 'monaco' && monacoEditor) {
		monacoEditor.setValue(value);
	} else if (CodeMirrorEditor_code) {
		CodeMirrorEditor_code.setValue(value);
	}
};

const setEditorLanguage = (language) => {
	if (currentEditor === 'monaco' && monacoEditor) {
		const model = monacoEditor.getModel();
		if (model) {
			monaco.editor.setModelLanguage(model, MonacoLangMap[language] || 'plaintext');
		}
	} else if (CodeMirrorEditor_code) {
		CodeMirrorEditor_code.setOption('mode', CodeMirrorModeMap[language]);
	}
};

const run = () => {
	const url = new URL('/ws/ide-judge', location.href);
	url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
	const judger = new WebSocket(url.toString());
	judger.addEventListener('open', () => {
		judger.send(JSON.stringify({
			lang: document.getElementById('lang').value,
			timeLimit: document.getElementById('timeLimit').value,
			memoryLimit: document.getElementById('memoryLimit').value,
			code: getEditorValue(),
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

	const pref = getEditorPref();
	if (pref === 'monaco') {
		await switchToMonaco(langSelector.value);
	} else {
		CodeMirrorEditor_code.setOption('mode', CodeMirrorModeMap[langSelector.value]);
	}

	langSelector.addEventListener('change', e => {
		setEditorLanguage(e.target.value);
	});

	document.addEventListener('theme:editorChange', async (e) => {
		const newEditor = e.detail.editor;
		const lang = document.getElementById('lang').value;
		if (newEditor === 'monaco') {
			await switchToMonaco(lang);
		} else {
			switchToCodeMirror(lang);
		}
	});
});
