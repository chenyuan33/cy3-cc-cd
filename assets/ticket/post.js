let simliarRefresherTimeout = null;
const refreshSimilarTicket = () => {
	document.getElementById('similar').innerHTML = '';
	const title = document.getElementById('title').value;
	if (!title) {
		return;
	}
	if (simliarRefresherTimeout) {
		clearTimeout(simliarRefresherTimeout);
	}
	simliarRefresherTimeout = setTimeout(async () => document.getElementById('similar').innerHTML = `
		<p><strong>${translations.ticketPostSimilar}</strong></p>
		<ul>${(await (await fetch('/api/ticket/similar?title=' + encodeURIComponent(title))).json()).map(({ id, title }) => `<li><a href='/ticket/${id}'>${title}</a></li>`).join('')}</ul>
	`, 300);
};