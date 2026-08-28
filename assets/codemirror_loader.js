function wrapSelection(editor, before, after) {
	const selection = editor.getSelection();
	if (selection === '') return;
	// 获取选区的起始位置（行列对象）
	const start = editor.getCursor(true);
	const end = editor.getCursor(false);
	// 替换选中的文本
	editor.replaceSelection(before + selection + after);
	// 计算新的选区结束位置：从 start 开始，偏移 before.length + selection.length + after.length
	// 使用 indexFromPos 和 posFromIndex 处理跨行情况
	const doc = editor.getDoc();
	const startIndex = doc.indexFromPos(start);
	const newEndIndex = startIndex + before.length + selection.length + after.length;
	const newEnd = doc.posFromIndex(newEndIndex);
	// 设置选区为新包裹的整个内容
	editor.setSelection(start, newEnd);
}

const loadCodeMirror = (id, height, mode, onchange, extraKeys) => document.addEventListener('DOMContentLoaded', () => {
	const textarea = document.getElementById(id);

	const editor = CodeMirror.fromTextArea(textarea, {
		lineNumbers: true,
		lineWrapping: true,
		mode,
		theme: 'default',
		extraKeys
	});

	let timer = null;
	editor.on('change', () => {
		editor.save();
		clearTimeout(timer);
		timer = setTimeout(onchange, 250);
	});

	editor.setSize(null, height);
	onchange();

	window['CodeMirrorEditor_' + id] = editor;
});