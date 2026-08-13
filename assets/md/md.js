const DOMPurifyFragment = document.createRange().createContextualFragment('<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.5/purify.min.js" integrity="sha384-rneZSW/1QE+3/U5/u+/7eRNi/tRc+SzS+yXy36fltr1tDN9EHaVo1Bwz2Z8o8DA4" crossorigin="anonymous"></script>')
const DOMPurifyLoaded = new Promise(resolve => DOMPurifyFragment.querySelector('script').onload = () => resolve());
document.head.append(DOMPurifyFragment);
const KaTeXFragment = document.createRange().createContextualFragment('<script src="https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.js" integrity="sha384-AtrdNsnxl/75rvBneBVH7DtOvCxSVahR2zWqle1coBKd8DEmLoviqNeJSx64gNAs" crossorigin="anonymous"></script>')
const KaTeXLoaded = new Promise(resolve => KaTeXFragment.querySelector('script').onload = () => resolve());
document.head.append(KaTeXFragment);
const inlineMdToHtml = async (md, options) => {
	options ??= {};
	options.safe ??= true;
	options.allowHtml ??= true;
	const codes = [], maths = [], signs = [], users = new Set(), usersObject = {};
	let html = md
		.replaceAll(/(?<!`)(`+)(.*?)\1(?!`)/g, (_, __, code) => {
			codes.push(code.replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;').replaceAll(/"/g, '&quot;'));
			return `\x00CODE_${codes.length - 1}\x00`;
		})
		.replaceAll(/\$(.*?)\$/g, (_, math) => {
			maths.push(math);
			return `\x00MATH_${maths.length - 1}\x00`;
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
		usersObject[uid] = await (await fetch('/api/user/uidToHtml?id=' + uid)).text();
	}
	if (!options.allowHtml) {
		html = html.replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;').replaceAll(/"/g, '&quot;');
	}
	await KaTeXLoaded;
	html = html
		.replaceAll(/\x00CODE_(\d+)\x00/g, (_, idx) => `<code>${codes[parseInt(idx)]}</code>`)
		.replaceAll(/\x00MATH_(\d+)\x00/g, (_, idx) => katex.renderToString(maths[parseInt(idx)], { throwOnError: false }))
		.replaceAll(/\x00SIGN_(\d+)\x00/g, (_, idx) => signs[idx])
		.replaceAll(/\x00USER_(\d+)\x00/g, (_, uid) => usersObject[uid]);
	if (options.safe) {
		await DOMPurifyLoaded;
		html = DOMPurify.sanitize(html);
	}
	return html;
};
const mdToHtml = async (md, options) => {
	options ??= {};
	options.safe ??= true;
	let html = '';
	const lines = md.split('\n'), markerGenerator = (htmlTagName, contentOutline, subMarker = null) => ({
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
		for (const marker of [
			paragraphMarker,
			blockquoteMarker,
			unorderedListMarker,
			orderedListMarker
		]) {
			await marker.start(startMarker === marker.name, attr);
		}
	};
	const endMarker = async () => await startMarker(null);
	for (const curLine of lines) {
		if (curLine.startsWith('  ') || curLine.startsWith('\t')) {
			if (unorderedListMarker.started()) {
				unorderedListMarker.subMarker.content += curLine.substring(curLine.startsWith('  ') ? 2 : 1);
				continue;
			}
			if (orderedListMarker.started()) {
				orderedListMarker.subMarker.content += curLine.substring(curLine.startsWith('  ') ? 2 : 1);
				continue;
			}
		}
		const trimed = curLine.trim();
		let gened = false;
		for (let headingLevel = 6; headingLevel > 0; headingLevel--) {
			if (trimed.startsWith('#'.repeat(headingLevel) + ' ')) {
				await endMarker();
				html += `<h${headingLevel}>${await inlineMdToHtml(trimed.substring(headingLevel + 1), options)}</h${headingLevel}>`;
				gened = true;
				break;
			}
		}
		if (gened)
		{
			continue;
		}
		if (trimed == '') {
			await endMarker();
			continue;
		}
		if (trimed.startsWith('>') || blockquoteMarker.started()) {
			await startMarker('blockquote');
			blockquoteMarker.content += (trimed.startsWith('>') ? trimed.substring(1) : trimed).trim() + '\n';
			continue;
		} else {
			await blockquoteMarker.start(false);
		}
		if (trimed.startsWith('+ ') || trimed.startsWith('- ') || trimed.startsWith('* ')) {
			await startMarker('ul');
			await unorderedListMarker.subMarker.restart();
			unorderedListMarker.subMarker.content += trimed.substring(2).trim() + '\n';
			continue;
		} else if (unorderedListMarker.started()) {
			unorderedListMarker.subMarker.content += trimed + '\n';
			continue;
		} else {
			await unorderedListMarker.start(false);
		}
		if (/^\d+\. /.test(trimed)) {
			await startMarker('ol', {start: parseInt(trimed).toString()});
			await orderedListMarker.subMarker.restart();
			orderedListMarker.subMarker.content += trimed.replace(/^\d+\. /, '').trim() + '\n';
			continue;
		} else if (orderedListMarker.started()) {
			orderedListMarker.subMarker.content += trimed + '\n';
			continue;
		} else {
			await orderedListMarker.start(false);
		}
		if (/^([*_\-])\1{2,}$/g.test(trimed)) {
			await endMarker();
			html += '<hr />';
			continue;
		}
		await startMarker('p');
		paragraphMarker.content += trimed + '\n';
		if (curLine.endsWith('  ') || curLine.endsWith('\\')) {
			html += '<br />';
		}
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