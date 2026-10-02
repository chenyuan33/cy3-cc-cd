import type { CSSProperties, FC } from "hono/jsx";
import type { ContextType } from "../types";
import { CodeMirrorEditor, CodeMirrorInit, CodeMirrorLangInit } from "./codemirror";
import { MonacoEditor, MonacoEditorInit } from "./monacoeditor";

export const EditorInit: FC<{ c: ContextType }> = ({ c }) => c.get('usingTheme').editor === 'CodeMirror' ? <CodeMirrorInit /> : <MonacoEditorInit c={c} />;
export const EditorLangInit: FC<{ c: ContextType, lang: string }> = ({ c, lang }) => c.get('usingTheme').editor === 'CodeMirror' ? <CodeMirrorLangInit lang={lang} /> : null;
export const Editor: FC<{
	c: ContextType,
	id: string,
	className?: string,
	name?: string,
	required?: boolean,
	initialCode?: string,
	height: number | string,
	lang?: 'md' | 'py' | 'js' | 'cpp' | 'c',
	onchange?: string,
	extraKeys?: string,
	style?: CSSProperties,
	readOnly?: boolean
}> = ({ c, lang, ...props }) => c.get('usingTheme').editor === 'CodeMirror' ? <CodeMirrorEditor mode={lang ? {
	md: 'markdown',
	py: 'text/x-python',
	js: 'text/javascript',
	cpp: 'text/x-c++src',
	c: 'text/x-csrc'
}[lang] : 'text/plain'} {...props} /> : <MonacoEditor lang={lang ? {
	md: 'markdown',
	py: 'python',
	js: 'javascript',
	cpp: 'cpp',
	c: 'c'
}[lang] : 'plaintext'} {...props} />;