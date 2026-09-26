import { type CSSProperties, type FC } from 'hono/jsx';
import { CodeMirrorEditor, CodeMirrorInit, CodeMirrorLangInit } from './codemirror';
import katex from 'katex';
import { User } from './user';
import type { ContextType } from '../types';

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
					onchange={`mdeditorOutputRefresh('${id}')`}
					extraKeys={`{
						"Ctrl-B": function(cm) { wrapSelection(cm, '**', '**'); },
						"Ctrl-U": function(cm) { wrapSelection(cm, '<u>', '</u>'); },
						"Ctrl-I": function(cm) { wrapSelection(cm, '*', '*'); },
						"Ctrl-Alt-X": function(cm) { wrapSelection(cm, '~~', '~~'); }
					}`}
				/>
            </div>
            <div class='mdeditor-output' id={'mdeditor-output-' + id} data-markdown=''>{{
                'en': 'Loading...',
                'zh': '少女祈祷中...'
            }[locale]}</div>
        </div>
    </>;
};
const inlineMdToHtml = async (md: string, c: ContextType) => {
    const codes: string[] = [], maths: { math: string, displayMode: boolean }[] = [], signs: string[] = [], users = new Set<number>(), usersObject: Record<number, string> = {};
    let html = md
        .replaceAll(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
            maths.push({ math, displayMode: true });
            return `\x00MATH_${maths.length - 1}\x00`;
        })
        .replaceAll(/\$(.*?)\$/g, (_, math) => {
            maths.push({ math, displayMode: false });
            return `\x00MATH_${maths.length - 1}\x00`;
        })
		.replaceAll(/&/g, '&amp;')
		.replaceAll(/</g, '&lt;')
		.replaceAll(/>/g, '&gt;')
		.replaceAll(/"/g, '&quot;')
        .replaceAll(/(?<!`)(`+)(.*?)\1(?!`)/g, (_, __, code) => {
            codes.push(code.replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;').replaceAll(/"/g, '&quot;'));
            return `\x00CODE_${codes.length - 1}\x00`;
        })
        .replaceAll(/\\(.)/g, (_, sign) => {
            signs.push(sign);
            return `\x00SIGN_${signs.length - 1}\x00`;
        })
        .replaceAll(/@(\d+)/g, (_, user) => {
            users.add(parseInt(user));
            return `\x00USER_${user}\x00`;
        })
        .replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replaceAll(/\b__(.+?)__\b/g, '<strong>$1</strong>')
        .replaceAll(/\*(.+?)\*/g, '<em>$1</em>')
        .replaceAll(/\b_(.+?)_\b/g, '<em>$1</em>')
        .replaceAll(/~~(.+?)~~/g, '<del>$1</del>')
        .replaceAll(/!\[(.*?)\]\((.+?)\)/g, (_, alt, url) => {
            const isExternal = /^https?:\/\//i.test(url) || /^\/\//.test(url);
            if (isExternal) {
                return `<a href="${url}" target="_blank" rel="noreferrer noopener">${alt || url}</a>`;
            }
            return `<img src="${url}" alt="${alt}" />`;
        })
        .replaceAll(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
    for (let uid of users) {
        usersObject[uid] = await (<User c={c} user={uid} />).toString();
    }
    html = html
        .replaceAll(/\x00CODE_(\d+)\x00/g, (_, idx) => `<code>${codes[parseInt(idx)]}</code>`)
        .replaceAll(/\x00MATH_(\d+)\x00/g, (_, idx) => {
            const { math, displayMode } = maths[parseInt(idx)]!;
            return katex.renderToString(math, { throwOnError: false, displayMode });
        })
        .replaceAll(/\x00SIGN_(\d+)\x00/g, (_, idx) => signs[idx]!)
        .replaceAll(/\x00USER_(\d+)\x00/g, (_, uid) => usersObject[uid]!);
    return html;
};

// ========== 表格解析辅助函数 ==========
function parseMarkdownTable(lines: string[]) {
	const line0 = lines[0], line1 = lines[1];
    if (!line0 || !line1) return null;
	const bodylines = lines.slice(2);
    const header = line0.trim().split('|').map(s => s.trim()).filter(s => s);
    if (header.length === 0) return null;
    const alignRow = line1.trim().split('|').map(s => s.trim()).filter(s => s);
    if (alignRow.length !== header.length) return null;
    const aligns = alignRow.map(cell => {
        if (/^:-+:$/.test(cell)) return 'center';
        if (/^:-+$/.test(cell)) return 'left';
        if (/^-+:$/.test(cell)) return 'right';
        return 'left';
    });
    const rows = [];
    for (const raw of bodylines) {
        const row = raw.trim().split('|').map(s => s.trim()).filter(s => s);
        if (row.length === 0) continue;
        while (row.length < header.length) row.push('');
        rows.push(row);
    }
    return { header, aligns, rows };
}

function renderTable(table: {
    header: string[];
    aligns: ("center" | "left" | "right")[];
    rows: string[][];
}) {
    let html = '<table>';
    html += '<thead><tr>';
    table.header.forEach((h, i) => {
        const align = table.aligns[i] === 'left' ? ' style="text-align:left"' :
            table.aligns[i] === 'right' ? ' style="text-align:right"' :
                table.aligns[i] === 'center' ? ' style="text-align:center"' : '';
        html += `<th${align}>${h}</th>`;
    });
    html += '</tr></thead><tbody>';
    table.rows.forEach(row => {
        html += '<tr>';
        row.forEach((cell, i) => {
            const align = table.aligns[i] === 'left' ? ' style="text-align:left"' :
                table.aligns[i] === 'right' ? ' style="text-align:right"' :
                    table.aligns[i] === 'center' ? ' style="text-align:center"' : '';
            html += `<td${align}>${cell}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}
// ========================================

type marker = {
	name: string,
	_started: boolean,
	content: string,
	subMarker: marker | null,
	started(): boolean,
	start(started: boolean, attr?: Object): Promise<undefined>;
	restart(): Promise<undefined>;
}
const mdToHtml = async (md: string, c: ContextType) => {
    let html = '';
    const lines = md.split('\n');

    const markerGenerator = (htmlTagName: string, contentOutline: boolean, subMarker: marker | null = null): marker => ({
        name: htmlTagName,
        _started: false,
        content: '',
        subMarker: subMarker,
        started() {
            return this._started;
        },
        async start(started: boolean, attr = {}) {
            if (this._started !== started) {
                this._started = started;
                if (!started) {
                    if (contentOutline || this.name === 'li' && /^(\n|#{1,6} |>|\+ |- |\* |\d+\. |\+{3,}|-{3,}|_{3,})/.test(this.content)) {
                        html += await mdToHtml(this.content, c);
                    } else {
                        html += await inlineMdToHtml(this.content, c);
                    }
                }
                this.content = '';
                if (!started && this.subMarker) {
                    await this.subMarker.start(false);
                }
                html += `<${started ? '' : '/'}${htmlTagName} ${started ? Object.entries(attr).map(([key, val]) => `${key}=${val.replaceAll('"', '&quot;')}`).join(' ') : ''}>`;
            }
        },
        async restart() {
            await this.start(false);
            await this.start(true);
        }
    });

    const paragraphMarker = markerGenerator('p', false);
    const blockquoteMarker = markerGenerator('blockquote', true);
    const unorderedListMarker = markerGenerator('ul', true, markerGenerator('li', false));
    const orderedListMarker = markerGenerator('ol', true, markerGenerator('li', false));

    const startMarker = async (startMarker: string | null, attr: Object = {}) => {
        for (const marker of [paragraphMarker, blockquoteMarker, unorderedListMarker, orderedListMarker]) {
            await marker.start(startMarker === marker.name, attr);
        }
    };
    const endMarker = async () => await startMarker(null);

    let state = 'normal';
    let codeBlockLang = '';
    let codeBlockLines = [];
    let tableLines: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const curLine = lines[i]!;
        const trimed = curLine.trim();

        if (state === 'codeBlock') {
            if (trimed === '```') {
                const codeContent = codeBlockLines.join('\n');
                const langClass = codeBlockLang ? ` class="language-${codeBlockLang}"` : '';
                html += `<pre><code${langClass}>${codeContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
                state = 'normal';
                codeBlockLang = '';
                codeBlockLines = [];
                i++;
                continue;
            }
            codeBlockLines.push(curLine);
            i++;
            continue;
        }

        if (state === 'table') {
            if (!(/^\s*\|.*\|\s*$/.test(curLine))) {
                const table = parseMarkdownTable(tableLines);
                if (table) {
                    html += renderTable(table);
                } else {
                    html += tableLines.join('\n');
                }
                state = 'normal';
                tableLines = [];
                continue;
            }
            tableLines.push(curLine);
            i++;
            continue;
        }

        if (trimed.startsWith('```')) {
            await endMarker();
            codeBlockLang = trimed.substring(3).trim();
            state = 'codeBlock';
            codeBlockLines = [];
            i++;
            continue;
        }

        if (/^\s*\|.*\|\s*$/.test(curLine) && i + 1 < lines.length && /^\s*\|.*\|\s*$/.test(lines[i + 1]!.trim())) {
            await endMarker();
            tableLines = [curLine];
            state = 'table';
            i++;
            continue;
        }

        let gened = false;
        for (let headingLevel = 6; headingLevel > 0; headingLevel--) {
            if (trimed.startsWith('#'.repeat(headingLevel) + ' ')) {
                await endMarker();
                html += `<h${headingLevel}>${await inlineMdToHtml(trimed.substring(headingLevel + 1), c)}</h${headingLevel}>`;
                gened = true;
                break;
            }
        }
        if (gened) { i++; continue; }
        if (trimed == '') {
            await endMarker();
            i++;
            continue;
        }
        if (trimed.startsWith('>') || blockquoteMarker.started()) {
            await startMarker('blockquote');
            blockquoteMarker.content += (trimed.startsWith('>') ? trimed.substring(1) : trimed).trim() + '\n';
            i++;
            continue;
        } else {
            await blockquoteMarker.start(false);
        }
        if (trimed.startsWith('+ ') || trimed.startsWith('- ') || trimed.startsWith('* ')) {
            await startMarker('ul');
            await unorderedListMarker.subMarker!.restart();
            unorderedListMarker.subMarker!.content += trimed.substring(2).trim() + '\n';
            i++;
            continue;
        } else if (unorderedListMarker.started()) {
            unorderedListMarker.subMarker!.content += trimed + '\n';
            i++;
            continue;
        } else {
            await unorderedListMarker.start(false);
        }
        if (/^\d+\. /.test(trimed)) {
            await startMarker('ol', { start: parseInt(trimed).toString() });
            await orderedListMarker.subMarker!.restart();
            orderedListMarker.subMarker!.content += trimed.replace(/^\d+\. /, '').trim() + '\n';
            i++;
            continue;
        } else if (orderedListMarker.started()) {
            orderedListMarker.subMarker!.content += trimed + '\n';
            i++;
            continue;
        } else {
            await orderedListMarker.start(false);
        }
        if (/^([*_\-])\1{2,}$/g.test(trimed)) {
            await endMarker();
            html += '<hr />';
            i++;
            continue;
        }
        await startMarker('p');
        paragraphMarker.content += trimed + '\n';
        if (curLine.endsWith('  ') || curLine.endsWith('\\')) {
            html += '<br />';
        }
        i++;
    }

    if (state === 'codeBlock') {
        const codeContent = codeBlockLines.join('\n');
        const langClass = codeBlockLang ? ` class="language-${codeBlockLang}"` : '';
        html += `<pre><code${langClass}>${codeContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    }
    if (state === 'table') {
        const table = parseMarkdownTable(tableLines);
        if (table) html += renderTable(table);
        else html += tableLines.join('\n');
    }

    await endMarker();
    return html;
};
export const MdRender: FC<{ markdown: string, c: ContextType }> = async ({ markdown, c }) => <span data-markdown={markdown} dangerouslySetInnerHTML={{ __html: await mdToHtml(markdown, c)}} />;