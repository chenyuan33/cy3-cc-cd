import type { editor } from "monaco-editor";
import type { supportedLanguages } from "./editor";

export const MonacoEditorLanguages = {
	md: 'markdown',
	py: 'python',
	js: 'javascript',
	cpp: 'cpp',
	c: 'c'
};
let monacoEditor: typeof import('monaco-editor').editor | undefined;
export const MonacoEditors: editor.IStandaloneCodeEditor[] = [];
const MonacoEditorMap = new Map<string, editor.IStandaloneCodeEditor>();

export const setMonacoEditorApi = (monaco: typeof import('monaco-editor')) => {
	monacoEditor = monaco.editor;
};
export const wrapSelectionMonacoEditor = async (editor: editor.IStandaloneCodeEditor, prefix: string, suffix: string) => {
	const selection = editor.getSelection(), { Selection } = await import('monaco-editor');
	const model = editor.getModel();
	if (!selection || !model) return;
	const selectedText = model.getValueInRange(selection);
	editor.executeEdits('wrap', [{
		range: selection,
		text: `${prefix}${selectedText}${suffix}`,
		forceMoveMarkers: true,
	}]);
	const newSelection = new Selection(
		selection.startLineNumber,
		selection.startColumn + prefix.length,
		selection.endLineNumber,
		selection.endColumn + prefix.length,
	);
	editor.setSelection(newSelection);
}
export const getValueMonacoEditor = (id: string) => {
	const editor = MonacoEditorMap.get(id);
	if (!editor) {
		return null;
	}
	return editor.getValue();
};
export const setValueMonacoEditor = (id: string, value: string) => {
	const editor = MonacoEditorMap.get(id);
	if (!editor) {
		return;
	}
	editor.setValue(value);
};
export const replaceSelectionMonacoEditor = (id: string, value: string) => {
	const editor = MonacoEditorMap.get(id);
	if (!editor) {
		return;
	}
	const selection = editor.getSelection();
	if (!selection) {
		return;
	}
	editor.executeEdits('replace-selection', [{
		range: selection,
		text: value,
		forceMoveMarkers: true
	}]);
};
export const setLangMonacoEditor = (id: string, value: supportedLanguages) => {
	const editor = MonacoEditorMap.get(id);
	if (!editor) {
		return;
	}
	const model = editor.getModel();
	if (!model) {
		return;
	}
	monacoEditor?.setModelLanguage(model, MonacoEditorLanguages[value]);
};
export const registerMonacoEditor = (id: string, editor: editor.IStandaloneCodeEditor) => {
	MonacoEditors.push(editor);
	MonacoEditorMap.set(id, editor);
};
export const unregisterMonacoEditor = (id: string, editor: editor.IStandaloneCodeEditor) => {
	const index = MonacoEditors.indexOf(editor);
	if (index >= 0) {
		MonacoEditors.splice(index, 1);
	}
	if (MonacoEditorMap.get(id) === editor) {
		MonacoEditorMap.delete(id);
	}
};
