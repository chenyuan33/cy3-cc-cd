let simliarRefresherTimeout = null;
const refreshSimilarTicket = () => {
	const title = document.getElementById('title').value;
	if (!title) {
		document.getElementById('similar').innerHTML = '';
		return;
	}
	if (simliarRefresherTimeout) {
		clearTimeout(simliarRefresherTimeout);
	}
	simliarRefresherTimeout = setTimeout(async () => document.getElementById('similar').innerHTML = `
		<p><strong>${translations.ticket.post.similar}</strong></p>
		<ul>${(await (await fetch(`/api/ticket/similar?title=${encodeURIComponent(title)}&category=${encodeURIComponent(document.getElementById('category').value)}`)).json()).map(({ id, status, title }) => `<li><a href='/ticket/${id}'>${status} ${title}</a></li>`).join('')}</ul>
	`, 300);
};