import katex from "katex";
import { User } from "../user";
import { useEffect, useRef, useState, type FC } from "hono/jsx";
import { tString } from "../../i18n";
import { render } from "hono/jsx/dom";

const inlineMdToHtml = (md: string) => {
    const codes: string[] = [], maths: { math: string, displayMode: boolean }[] = [], signs: string[] = [];
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
        .replaceAll(/@(\d+)/g, (_, user) => `<span data-md-uid=${user}>${tString('loading')}</span>`)
        .replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replaceAll(/\b__(.+?)__\b/g, '<strong>$1</strong>')
        .replaceAll(/\*(.+?)\*/g, '<em>$1</em>')
        .replaceAll(/\b_(.+?)_\b/g, '<em>$1</em>')
        .replaceAll(/~~(.+?)~~/g, '<del>$1</del>')
        .replaceAll(/!\[(.*?)\]\((.+?)\)/g, (_, alt, url) => {
			const parsedURL = new URL(url, location.href);
            if (['http:', 'https:'].includes(parsedURL.protocol)) {
				if (parsedURL.hostname === new URL(location.href).hostname) {
					return `<img src="${url}" alt="${alt}" />`;
				} else {
					return `<a href="${url}" target="_blank" rel="noreferrer noopener">${alt || url}</a>`;
				}
            } else {
				return alt || url;
			}
        })
        .replaceAll(/\[(.+?)\]\((.+?)\)/g, (_, alt, url) => {
			const parsedURL = new URL(url, location.href);
            if (['http:', 'https:'].includes(parsedURL.protocol)) {
				return `<a href="${url}" target="_blank" rel="noreferrer noopener">${alt || url}</a>`;
            } else {
				return alt || url;
			}
        });
    html = html
        .replaceAll(/\x00CODE_(\d+)\x00/g, (_, idx) => `<code>${codes[parseInt(idx)]}</code>`)
        .replaceAll(/\x00MATH_(\d+)\x00/g, (_, idx) => {
            const { math, displayMode } = maths[parseInt(idx)]!;
            return katex.renderToString(math, { throwOnError: false, displayMode });
        })
        .replaceAll(/\x00SIGN_(\d+)\x00/g, (_, idx) => signs[idx]!);
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
    let html = '<table><thead><tr>';
    for (let i = 0; i < table.header.length; i++) {
        const align = table.aligns[i] === 'left' ? ' style="text-align:left"' :
            table.aligns[i] === 'right' ? ' style="text-align:right"' :
                table.aligns[i] === 'center' ? ' style="text-align:center"' : '';
        html += `<th${align}>${inlineMdToHtml(table.header[i]!)}</th>`;
    };
    html += '</tr></thead><tbody>';
    for (const row of table.rows) {
        html += '<tr>';
        for (let i = 0; i < row.length; i++) {
            const align = table.aligns[i] === 'left' ? ' style="text-align:left"' :
                table.aligns[i] === 'right' ? ' style="text-align:right"' :
                    table.aligns[i] === 'center' ? ' style="text-align:center"' : '';
            html += `<td${align}>${inlineMdToHtml(row[i]!)}</td>`;
        };
        html += '</tr>';
    };
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
	start(started: boolean, attr?: Object): void;
	restart(): void;
}
export const mdToHtml = (md: string) => {
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
        start(started: boolean, attr = {}) {
            if (this._started !== started) {
                this._started = started;
                if (!started) {
                    if (contentOutline || this.name === 'li' && /^(\n|#{1,6} |>|\+ |- |\* |\d+\. |\+{3,}|-{3,}|_{3,})/.test(this.content)) {
                        html += mdToHtml(this.content);
                    } else {
                        html += inlineMdToHtml(this.content);
                    }
                }
                this.content = '';
                if (!started && this.subMarker) {
                    this.subMarker.start(false);
                }
                html += `<${started ? '' : '/'}${htmlTagName} ${started ? Object.entries(attr).map(([key, val]) => `${key}=${val.replaceAll('"', '&quot;')}`).join(' ') : ''}>`;
            }
        },
        restart() {
            this.start(false);
            this.start(true);
        }
    });

    const paragraphMarker = markerGenerator('p', false);
    const blockquoteMarker = markerGenerator('blockquote', true);
    const unorderedListMarker = markerGenerator('ul', true, markerGenerator('li', false));
    const orderedListMarker = markerGenerator('ol', true, markerGenerator('li', false));

    const startMarker = (startMarker: string | null, attr: Object = {}) => {
        for (const marker of [paragraphMarker, blockquoteMarker, unorderedListMarker, orderedListMarker]) {
            marker.start(startMarker === marker.name, attr);
        }
    };
    const endMarker = () => startMarker(null);

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
            endMarker();
            codeBlockLang = trimed.substring(3).trim();
            state = 'codeBlock';
            codeBlockLines = [];
            i++;
            continue;
        }

        if (/^\s*\|.*\|\s*$/.test(curLine) && i + 1 < lines.length && /^\s*\|.*\|\s*$/.test(lines[i + 1]!.trim())) {
            endMarker();
            tableLines = [curLine];
            state = 'table';
            i++;
            continue;
        }

        let gened = false;
        for (let headingLevel = 6; headingLevel > 0; headingLevel--) {
            if (trimed.startsWith('#'.repeat(headingLevel) + ' ')) {
                endMarker();
                html += `<h${headingLevel}>${inlineMdToHtml(trimed.substring(headingLevel + 1))}</h${headingLevel}>`;
                gened = true;
                break;
            }
        }
        if (gened) { i++; continue; }
        if (trimed == '') {
            endMarker();
            i++;
            continue;
        }
        if (trimed.startsWith('>') || blockquoteMarker.started()) {
            startMarker('blockquote');
            blockquoteMarker.content += (trimed.startsWith('>') ? trimed.substring(1) : trimed).trim() + '\n';
            i++;
            continue;
        } else {
            blockquoteMarker.start(false);
        }
        if (trimed.startsWith('+ ') || trimed.startsWith('- ') || trimed.startsWith('* ')) {
            startMarker('ul');
            unorderedListMarker.subMarker!.restart();
            unorderedListMarker.subMarker!.content += trimed.substring(2).trim() + '\n';
            i++;
            continue;
        } else if (unorderedListMarker.started()) {
            unorderedListMarker.subMarker!.content += trimed + '\n';
            i++;
            continue;
        } else {
            unorderedListMarker.start(false);
        }
        if (/^\d+\. /.test(trimed)) {
            startMarker('ol', { start: parseInt(trimed).toString() });
            orderedListMarker.subMarker!.restart();
            orderedListMarker.subMarker!.content += trimed.replace(/^\d+\. /, '').trim() + '\n';
            i++;
            continue;
        } else if (orderedListMarker.started()) {
            orderedListMarker.subMarker!.content += trimed + '\n';
            i++;
            continue;
        } else {
            orderedListMarker.start(false);
        }
        if (/^([*_\-])\1{2,}$/g.test(trimed)) {
            endMarker();
            html += '<hr />';
            i++;
            continue;
        }
        startMarker('p');
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

    endMarker();
    return html;
};
export const MdRender: FC<{ markdown: string }> = ({ markdown }) => {
	const html = mdToHtml(markdown);
	const containerRef = useRef<HTMLElement>(null);
	useEffect(() => {
		if (typeof html !== 'string' || containerRef.current === null) {
			return;
		}
		containerRef.current.querySelectorAll('[data-md-uid]').forEach(ele => {
			(ele as HTMLElement).innerHTML = '';
			render(<User user={parseInt(ele.getAttribute('data-md-uid') || '0')} />, ele as HTMLElement);
		});
	}, [html]);
	return <span data-markdown={markdown} dangerouslySetInnerHTML={{ __html: html }} ref={containerRef} />;
};