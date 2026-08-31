import type { CSSProperties, FC } from "hono/jsx";

export const CodeMirrorInit: FC<{}> = () => <>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.21/codemirror.min.js" referrerpolicy="no-referrer"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.21/codemirror.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
	<script src='/codemirror_loader.js'></script>
</>;
export const CodeMirrorLangInit: FC<{ lang: string }> = ({ lang }) => <script src={`https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.21/mode/${lang}/${lang}.min.js`}></script>;
export const CodeMirrorEditor: FC<{
	id: string,
	className?: string,
	name?: string,
	required?: boolean,
	initialCode?: string,
	height: number | string,
	mode: string,
	onchange?: string,
	extraKeys?: string,
	style?: CSSProperties,
	readOnly?: boolean
}> = ({ id, className, name, required = false, initialCode = '', height, mode, onchange = '() => {}', extraKeys = '{}', style, readOnly = false }) => <div style={style}>
	<textarea id={id} class={className} name={name} required={required}>{initialCode}</textarea>
	<script dangerouslySetInnerHTML={{ __html: `loadCodeMirror('${id}', '${height}', '${mode}', ${onchange}, ${extraKeys}, ${readOnly});` }} />
</div>;