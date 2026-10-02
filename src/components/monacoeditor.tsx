import { raw } from "hono/html";
import type { CSSProperties, FC } from "hono/jsx";
import type { ContextType } from "../types";

export const MonacoEditorInit: FC<{ c: ContextType }> = ({ c }) => <>
	<script type='module'>{raw(`import { monaco, loadCss } from 'https://esm.sh/monaco-esm'; window.monaco = monaco; loadCss();`)}</script>
</>;
export const MonacoEditor: FC<{
	id: string,
	className?: string,
	name?: string,
	required?: boolean,
	initialCode?: string,
	height: number | string,
	lang: string,
	onchange?: string,
	extraKeys?: string,
	style?: CSSProperties,
	readOnly?: boolean
}> = ({ id, className, name, required, initialCode, height, lang, onchange, extraKeys, style, readOnly }) => <div style={style}>
	<textarea id={id} class={className} name={name} required={required} style={{ height }}></textarea>
	<script>{raw(`document.addEventListener('DOMContentLoaded', () => window['MonacoEditor_${id}'] = monaco.editor.create(document.getElementById(${JSON.stringify(id)}), {
		value: ${JSON.stringify(initialCode)},
		language: ${JSON.stringify(lang)},
		automaticLayout: true,
		readOnly: ${readOnly ? 'true' : 'false'},
		__cy3_dbg: console.log('loading monaco editor ${id}')
	}));`)}</script>
</div>;