import { html } from 'hono/html';
import { type CSSProperties, type FC } from 'hono/jsx';

export const MdInit: FC<{}> = () => <>
  {/* CodeMirror 核心（cdnjs） */}
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css" />
  {/* CodeMirror Markdown 模式（cdnjs） */}
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/markdown/markdown.min.js"></script>
  {/* 自定义编辑器样式 */}
  <link rel="stylesheet" href="/md/editor.css" />
  {/* KaTeX CSS（cdnjs） */}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.css" />
  {/* 主渲染脚本（内部） */}
  <script src="/md/md.js"></script>
</>;

export const MdEditor: FC<{
  initialCode?: string,
  id: string,
  name?: string | undefined,
  required?: boolean,
  height?: string,
  locale?: string | undefined,
  style?: CSSProperties
}> = ({ initialCode = '', id, name = '', required = false, height = '300px', locale = 'en', style = {} }) => {
  return <>
    <div class='mdeditor-div' style={{ height: height, ...style }}>
      <div class='mdeditor-input-cell'>
        <textarea class='mdeditor-input' id={'mdeditor-input-' + id} name={name} required={required}>{initialCode}</textarea>
      </div>
      <div class='mdeditor-output' id={'mdeditor-output-' + id}>{{
        'en': 'Loading...',
        'zh': '少女祈祷中...'
      }[locale]}</div>
    </div>
    {html`<script>
      document.addEventListener('DOMContentLoaded', () => {
        const inputId = '${'mdeditor-input-' + id}';
        const outputId = '${'mdeditor-output-' + id}';
        const editor = CodeMirror.fromTextArea(document.getElementById(inputId), {
          lineNumbers: true,
          mode: 'markdown',
          theme: 'default'
        });
        const outputEl = document.getElementById(outputId);
        const inputEl = document.getElementById(inputId);
        const getOutput = async () => {
          outputEl.innerHTML = await mdToHtml(inputEl.value);
        };
        let timer = null;
        editor.on('change', () => {
          editor.save();
          clearTimeout(timer);
          timer = setTimeout(() => {
            getOutput();
          }, 250);
        });
        editor.setSize(null, '${height}');
        getOutput();
      });
    </script>`}
  </>;
};

export const MdRender: FC<{ markdown: string }> = ({ markdown }) => <span data-markdown={markdown}>{markdown}</span>;