// ===== 加载 DOMPurify（cdnjs） =====
const DOMPurifyFragment = document.createRange().createContextualFragment('<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.5/purify.min.js" integrity="sha384-rneZSW/1QE+3/U5/u+/7eRNi/tRc+SzS+yXy36fltr1tDN9EHaVo1Bwz2Z8o8DA4" crossorigin="anonymous"></script>');
const DOMPurifyLoaded = new Promise(resolve => DOMPurifyFragment.querySelector('script').onload = () => resolve());
document.head.append(DOMPurifyFragment);

// ===== 加载 KaTeX（cdnjs） =====
const KaTeXFragment = document.createRange().createContextualFragment('<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.js" integrity="sha384-V7JOWfEfZ8C8fxUOjBp60F2YyK1Fpl1Hc8pnNWnVWtNkH0ghlj9m+C4a1sZdxwHc" crossorigin="anonymous"></script>');
const KaTeXLoaded = new Promise(resolve => KaTeXFragment.querySelector('script').onload = () => resolve());
document.head.append(KaTeXFragment);

const inlineMdToHtml = async (md, options) => {
    options ??= {};
    options.safe ??= true;
    options.allowHtml ??= true;
    const codes = [], maths = [], signs = [], users = new Set(), usersObject = {};
    const mathObjects = [];

    let html = md
        .replaceAll(/(?<!`)(`+)(.*?)\1(?!`)/g, (_, __, code) => {
            codes.push(code.replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;').replaceAll(/"/g, '&quot;'));
            return `\x00CODE_${codes.length - 1}\x00`;
        })
        .replaceAll(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
            mathObjects.push({ math, displayMode: true });
            return `\x00MATH_${mathObjects.length - 1}\x00`;
        })
        .replaceAll(/\$(.*?)\$/g, (_, math) => {
            mathObjects.push({ math, displayMode: false });
            return `\x00MATH_${mathObjects.length - 1}\x00`;
        })
        .replaceAll(/\\(.)/g, (_, sign) => {
            signs.push(sign);
            return `\x00SIGN_${signs.length - 1}\x00`;
        })
        .replaceAll(/@(\d+)/g, (_, user) => {
            users.add(user);
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
        try {
            const resp = await fetch('/api/user/uidToHtml?id=' + uid);
            if (!resp.ok) {
                console.warn('获取用户 HTML 失败 (uid=' + uid + '):', resp.status);
                usersObject[uid] = `<a href="/user/${uid}">用户${uid}</a>`;
            } else {
                usersObject[uid] = await resp.text();
            }
        } catch (e) {
            console.error('请求出错 (uid=' + uid + '):', e);
            usersObject[uid] = `<a href="/user/${uid}">用户${uid}</a>`;
        }
    }

    if (!options.allowHtml) {
        html = html.replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;').replaceAll(/"/g, '&quot;');
    }
    await KaTeXLoaded;
    html = html
        .replaceAll(/\x00CODE_(\d+)\x00/g, (_, idx) => `<code>${codes[parseInt(idx)]}</code>`)
        .replaceAll(/\x00MATH_(\d+)\x00/g, (_, idx) => {
            const { math, displayMode } = mathObjects[parseInt(idx)];
            try {
                return katex.renderToString(math, { throwOnError: false, displayMode });
            } catch (_) {
                return `<span style="color:red;">KaTeX error: ${math}</span>`;
            }
        })
        .replaceAll(/\x00SIGN_(\d+)\x00/g, (_, idx) => signs[idx])
        .replaceAll(/\x00USER_(\d+)\x00/g, (_, uid) => usersObject[uid]);
    if (options.safe) {
        await DOMPurifyLoaded;
        html = DOMPurify.sanitize(html);
    }
    return html;
};

// ========== 表格解析辅助函数 ==========
function parseMarkdownTable(lines) {
    if (lines.length < 2) return null;
    const header = lines[0].trim().split('|').map(s => s.trim()).filter(s => s);
    if (header.length === 0) return null;
    const alignRow = lines[1].trim().split('|').map(s => s.trim()).filter(s => s);
    if (alignRow.length !== header.length) return null;
    const aligns = alignRow.map(cell => {
        if (/^:---:$/.test(cell)) return 'center';
        if (/^:---$/.test(cell)) return 'left';
        if (/^---:$/.test(cell)) return 'right';
        return 'left';
    });
    const rows = [];
    for (let i = 2; i < lines.length; i++) {
        const row = lines[i].trim().split('|').map(s => s.trim()).filter(s => s);
        if (row.length === 0) continue;
        while (row.length < header.length) row.push('');
        rows.push(row);
    }
    return { header, aligns, rows };
}

function renderTable(table) {
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

const mdToHtml = async (md, options) => {
    options ??= {};
    options.safe ??= true;
    let html = '';
    const lines = md.split('\n');

    const markerGenerator = (htmlTagName, contentOutline, subMarker = null) => ({
        name: htmlTagName,
        _started: false,
        content: '',
        subMarker: subMarker,
        started() {
            return this._started;
        },
        async start(started, attr = {}) {
            started = !!started;
            if (this._started !== started) {
                this._started = started;
                if (!started) {
                    if (contentOutline || this.name === 'li' && /^(\n|#{1,6} |>|\+ |- |\* |\d+\. |\+{3,}|-{3,}|_{3,})/.test(this.content)) {
                        html += await mdToHtml(this.content, options);
                    } else {
                        html += await inlineMdToHtml(this.content, options);
                    }
                }
                this.content = '';
                if (!started && this.subMarker) {
                    await this.subMarker.start(false);
                }
                html += `<${started ? '' : '/'}${htmlTagName} ${started ? Object.entries(attr).map(([key, val]) => `${key}=${val.replaceAll('"', '&quot;')}`).join(' ') : ''}>`;
            }
        },
        async restart(started) {
            await this.start(false);
            await this.start(true);
        }
    });

    const paragraphMarker = markerGenerator('p', false);
    const blockquoteMarker = markerGenerator('blockquote', true);
    const unorderedListMarker = markerGenerator('ul', true, markerGenerator('li', false));
    const orderedListMarker = markerGenerator('ol', true, markerGenerator('li', false));

    const startMarker = async (startMarker, attr) => {
        for (const marker of [paragraphMarker, blockquoteMarker, unorderedListMarker, orderedListMarker]) {
            await marker.start(startMarker === marker.name, attr);
        }
    };
    const endMarker = async () => await startMarker(null);

    let state = 'normal';
    let codeBlockLang = '';
    let codeBlockLines = [];
    let tableLines = [];
    let i = 0;

    while (i < lines.length) {
        const curLine = lines[i];
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

        if (/^\s*\|.*\|\s*$/.test(curLine) && i + 1 < lines.length && /^\s*\|.*\|\s*$/.test(lines[i + 1].trim())) {
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
                html += `<h${headingLevel}>${await inlineMdToHtml(trimed.substring(headingLevel + 1), options)}</h${headingLevel}>`;
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
            await unorderedListMarker.subMarker.restart();
            unorderedListMarker.subMarker.content += trimed.substring(2).trim() + '\n';
            i++;
            continue;
        } else if (unorderedListMarker.started()) {
            unorderedListMarker.subMarker.content += trimed + '\n';
            i++;
            continue;
        } else {
            await unorderedListMarker.start(false);
        }
        if (/^\d+\. /.test(trimed)) {
            await startMarker('ol', { start: parseInt(trimed).toString() });
            await orderedListMarker.subMarker.restart();
            orderedListMarker.subMarker.content += trimed.replace(/^\d+\. /, '').trim() + '\n';
            i++;
            continue;
        } else if (orderedListMarker.started()) {
            orderedListMarker.subMarker.content += trimed + '\n';
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

    if (options.safe) {
        await DOMPurifyLoaded;
        html = DOMPurify.sanitize(html);
    }
    return html;
};

const mdRender = () => Array.from(document.querySelectorAll('[data-markdown]')).forEach(async e => e.innerHTML = await mdToHtml(e.dataset.markdown));
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mdRender);
} else {
    mdRender();
}