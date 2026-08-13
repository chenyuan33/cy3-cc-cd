import { html } from 'hono/html';
import { type CSSProperties, type FC } from 'hono/jsx';
export const MdInit: FC<{}> = () => <>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
	<link rel='stylesheet' type='text/css' href='https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css' />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/markdown/markdown.min.js"></script>
	<link rel='stylesheet' type='text/css' href='/md/editor.css' />
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css" integrity="sha384-vlBdW0r3AcZO/HboRPznQNowvexd3fY8qHOWkBi5q7KGgqJ+F48+DceybYmrVbmB" crossorigin="anonymous" />
	<script src='/md/md.js'></script>
</>;
export const MdEditor: FC<{ initialCode?: string, id: string, name?: string | undefined, required?: boolean, height?: string, locale?: string | undefined, style?: CSSProperties }> = ({ initialCode = '', id, name = '', required = false, height = '300px', locale = 'en', style={} }) => {
	return <>
		<div class='mdeditor-div' style={{ height: height, ...style }}>
			<div class='mdeditor-input-cell'><textarea class='mdeditor-input' id={'mdeditor-input-' + id} name={name} required={required}>{initialCode}</textarea></div>
			<div class='mdeditor-output' id={'mdeditor-output-' + id}>{{
				'en': 'Loading...',
				'zh': '少女祈祷中...'
			}[locale]}</div>
		</div>
		{html`<script>document.addEventListener('DOMContentLoaded',()=>{const editor=CodeMirror.fromTextArea(document.getElementById('${'mdeditor-input-' + id}'),{lineNumbers:true,mode:'markdown',theme:'default'});const getOutput=async()=>document.getElementById('mdeditor-output-${id}').innerHTML=await mdToHtml(document.getElementById('mdeditor-input-${id}').value);editor.on('change',()=>{editor.save();getOutput();});editor.setSize(null,'${height}');getOutput();});</script>`}
	</>;
};
export const MdRender: FC<{ markdown: string }> = ({ markdown }) => <span data-markdown={markdown}>{markdown}</span>;