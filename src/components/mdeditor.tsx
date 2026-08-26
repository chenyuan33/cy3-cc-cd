import { html } from 'hono/html';
import { type CSSProperties, type FC } from 'hono/jsx';

export const MdInit: FC<{}> = () => <>
    {/* CodeMirror 核心（cdnjs） */}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.21/codemirror.min.js" referrerpolicy="no-referrer"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.21/codemirror.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
    {/* CodeMirror Markdown 模式（cdnjs） */}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.21/mode/markdown/markdown.min.js"></script>
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
        const textarea = document.getElementById(inputId);
        const outputEl = document.getElementById(outputId);

        // 辅助函数：用前后缀包裹选中文本，并正确选中包裹后的内容
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

        const editor = CodeMirror.fromTextArea(textarea, {
          lineNumbers: true,
          mode: 'markdown',
          theme: 'default',
          extraKeys: {
            "Ctrl-B": function(cm) { wrapSelection(cm, '**', '**'); },
            "Ctrl-U": function(cm) { wrapSelection(cm, '<u>', '</u>'); },
            "Ctrl-I": function(cm) { wrapSelection(cm, '*', '*'); },
            "Ctrl-Alt-X": function(cm) { wrapSelection(cm, '~~', '~~'); }
          }
        });

        const getOutput = async () => {
          outputEl.innerHTML = await mdToHtml(textarea.value);
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