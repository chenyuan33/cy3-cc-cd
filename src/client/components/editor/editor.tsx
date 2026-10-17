import { useEffect, useRef, useState, type CSSProperties, type FC } from "hono/jsx";
import { useUsingTheme } from "../../utils/currentUser";
import type { EditorView, ViewUpdate } from "@codemirror/view";
import type { editor } from "monaco-editor";
import { CodeMirrorEditor, CodeMirrorLanguages, getValueCodeMirror, replaceSelectionCodeMirror, setLangCodeMirror, setValueCodeMirror, wrapSelectionCodeMirror } from "./codemirror";
import { getValueMonacoEditor, MonacoEditorLanguages, replaceSelectionMonacoEditor, setLangMonacoEditor, setValueMonacoEditor, wrapSelectionMonacoEditor } from "./monacoeditor";

export type supportedLanguages = 'md' | 'py' | 'js' | 'cpp' | 'c';
export const selectionWrapper = (prefix: string, suffix: string) => async (ed: editor.IStandaloneCodeEditor | EditorView) => {
	if (ed instanceof (await import('@codemirror/view')).EditorView) {
		return await wrapSelectionCodeMirror(ed, prefix, suffix);
	} else {
		return await wrapSelectionMonacoEditor(ed, prefix, suffix);
	}
};
export const getValue = (id: string) => {
	return getValueCodeMirror(id) ?? getValueMonacoEditor(id);
};
export const setValue = (id: string, value: string) => {
	setValueCodeMirror(id, value);
	setValueMonacoEditor(id, value);
};
export const replaceSelection = (id: string, value: string) => {
	replaceSelectionCodeMirror(id, value);
	replaceSelectionMonacoEditor(id, value);
};
export const setLang = (id: string, lang: supportedLanguages) => {
	setLangCodeMirror(id, lang);
	setLangMonacoEditor(id, lang);
};
export const Editor: FC<{
	id: string,
	className?: string,
	name?: string,
	required?: boolean,
	initialCode?: string,
	height: number | string,
	lang?: supportedLanguages,
	onChange?: (event: editor.IModelContentChangedEvent | ViewUpdate | undefined, content: string) => void,
	extraKeys?: {
		id: string,
		label: string,
		keybindings: string[],
		contextMenuGroupId: string,
		contextMenuOrder: number,
		run: (ed: editor.IStandaloneCodeEditor | EditorView) => void | boolean | Promise<void | boolean>
	}[],
	style?: CSSProperties,
	readOnly?: boolean
}> = ({ lang, ...props }) => {
	const theme = useUsingTheme().editor;
	const [MonacoEditor, setMonacoEditor] = useState<FC<{
		id: string,
		className?: string,
		name?: string,
		required?: boolean,
		initialCode?: string,
		height: number | string,
		lang: string,
		onChange?: (event: editor.IModelContentChangedEvent, content: string) => void,
		extraKeys?: {
			id: string,
			label: string,
			keybindings: string[],
			contextMenuGroupId: string,
			contextMenuOrder: number,
			run: (ed: editor.IStandaloneCodeEditor) => void
		}[],
		style?: CSSProperties,
		readOnly?: boolean
	}> | undefined>();
	useEffect(() => {(async () => {
		const { MonacoEditor } = await import('./monacoeditor');
		setMonacoEditor(() => MonacoEditor);
	})()}, []);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	if (theme === 'CodeMirror') {
		return <CodeMirrorEditor lang={lang ? CodeMirrorLanguages[lang] : undefined} {...props} />;
	}
	if (theme === 'MonacoEditor') {
		if (MonacoEditor) {
			return <MonacoEditor lang={lang ? MonacoEditorLanguages[lang] : 'plaintext'} {...props} />;
		}
	}
	return <textarea
		ref={textareaRef}
		id={props.id}
		class={props.className}
		name={props.name}
		required={props.required}
		style={{ ...props.style, height: props.height }}
		onChange={() => props.onChange?.(undefined, textareaRef.current?.value || '')}
		readonly={props.readOnly}
	>{props.initialCode}</textarea>;
};
