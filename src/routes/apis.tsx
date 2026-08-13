import { Hono } from 'hono';
import userRoutes from './api/user';
import feedRoutes from './api/feed';
import discussionRoutes from './api/discussion';
import ticketRoutes from './api/ticket';
import type { AppEnv } from '../types';
import { loginRequired } from './errorPages';
const app = new Hono<AppEnv>();
app.route('/user', userRoutes);
app.route('/feed', feedRoutes);
app.route('/discussion', discussionRoutes);
app.route('/ticket', ticketRoutes);
app.post('/check-in', async c => {
	const env = c.env as any, currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	const { checkin_date: lastCheckInDate, checkin_count: lastCheckInCount } = await env.db.prepare('SELECT checkin_date, checkin_count FROM users WHERE id = ?').bind(currentUser.id).first();
	const lastCheckInDateZ = new Date(lastCheckInDate + 'Z'), currentDateZ = new Date();
	const lastCheckInDateValue = Date.UTC(lastCheckInDateZ.getFullYear(), lastCheckInDateZ.getMonth(), lastCheckInDateZ.getDate());
	const currentDateValue = Date.UTC(currentDateZ.getFullYear(), currentDateZ.getMonth(), currentDateZ.getDate());
	const dateDistance = Math.floor((currentDateValue - lastCheckInDateValue) / (1000 * 60 * 60 * 24));
	if (lastCheckInDate && !dateDistance) {
		return c.redirect('/');
	}
	const checkin_today_status = Math.floor(Math.random() * 7) - 3;
	const { results: checkin_today_goods } = checkin_today_status > -3 ? await env.db.prepare('SELECT id FROM checkin_texts WHERE bad_en IS NULL AND bad_zh IS NULL ORDER BY RANDOM() LIMIT 2').bind().all() : { results: [{ id: null }, { id: null }] };
	const { results: checkin_today_bads } = checkin_today_status < 3 ? await env.db.prepare('SELECT id FROM checkin_texts WHERE good_en IS NULL AND good_zh IS NULL ORDER BY RANDOM() LIMIT 2').bind().all() : { results: [{ id: null }, { id: null }] };
	await env.db.prepare('UPDATE users SET checkin_date = CURRENT_TIMESTAMP, checkin_count = ?, checkin_today_status = ?, checkin_today_good1 = ?, checkin_today_good2 = ?, checkin_today_bad1 = ?, checkin_today_bad2 = ?')
		.bind(lastCheckInCount ? Math.max(lastCheckInCount - Math.floor(Math.pow(2, dateDistance - 2)) + 1, 1) : 1, checkin_today_status, checkin_today_goods[0].id, checkin_today_goods[1].id, checkin_today_bads[0].id, checkin_today_bads[1].id).run();
	return c.redirect('/');
});
export default app;