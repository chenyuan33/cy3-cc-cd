import { html } from 'hono/html';
import { type CSSProperties, type FC } from 'hono/jsx';
import { CodeMirrorEditor, CodeMirrorInit, CodeMirrorLangInit } from './codemirror';

export const MdInit: FC<{}> = () => <>
    {/* CodeMirror 核心 */}
	<CodeMirrorInit />
	<CodeMirrorLangInit lang='markdown' />
    {/* 自定义编辑器样式 */}
    <link rel="stylesheet" href="/md/editor.css" />
    {/* KaTeX */}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.18.4/katex.min.js" referrerpolicy="no-referrer"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.18.4/katex.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
    {/* DOMPurify */}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.4.13/purify.min.js" referrerpolicy="no-referrer"></script>
    {/* 主渲染脚本（内部） */}
    <script src="/md/md.js"></script>
</>;
let mdeditorid = 0;
export const MdEditor: FC<{
    initialCode?: string,
    id?: string | undefined,
    name?: string | undefined,
    required?: boolean,
    height?: string,
    locale?: string | undefined,
    style?: CSSProperties
}> = ({ initialCode = '', id, name = '', required = false, height = '300px', locale = 'en', style = {} }) => {
	id = id || 'mdeditor-' + ++mdeditorid;
    return <>
        <div class='mdeditor-div' style={{ height: height, ...style }}>
            <div class='mdeditor-input-cell'>
				<CodeMirrorEditor
					id={'mdeditor-input-' + id}
					className='mdeditor-input'
					name={name}
					required={required}
					initialCode={initialCode}
					height={height}
					mode='markdown'
					onchange={`async () => document.getElementById('mdeditor-output-${id}').innerHTML = await mdToHtml(document.getElementById('mdeditor-input-${id}').value)`}
					extraKeys={`{
						"Ctrl-B": function(cm) { wrapSelection(cm, '**', '**'); },
						"Ctrl-U": function(cm) { wrapSelection(cm, '<u>', '</u>'); },
						"Ctrl-I": function(cm) { wrapSelection(cm, '*', '*'); },
						"Ctrl-Alt-X": function(cm) { wrapSelection(cm, '~~', '~~'); }
					}`}
				/>
            </div>
            <div class='mdeditor-output' id={'mdeditor-output-' + id}>{{
                'en': 'Loading...',
                'zh': '少女祈祷中...'
            }[locale]}</div>
        </div>
    </>;
};

export const MdRender: FC<{ markdown: string }> = ({ markdown }) => <span data-markdown={markdown}>{markdown}</span>;