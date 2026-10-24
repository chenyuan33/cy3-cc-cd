import { Hono } from 'hono';
import adminRoutes from './api/admin';
import userRoutes, { userInfoDatas } from './api/user';
import feedRoutes from './api/feed';
import discussionRoutes, { type discussionCategoriesType } from './api/discussion';
import ticketRoutes from './api/ticket';
import fileRoutes from './api/file';
import themeRoutes from './api/theme';
import type { AppEnv, judgementType } from '../types';
import { accessDenied, loginRequired, notFound } from './errorPages';
import { permissionChat } from '../settings';
import { getI18n, messages } from '../i18n';
const app = new Hono<AppEnv>();

app.get('/i18n', c => c.json(messages[c.get('language') as keyof typeof messages]));
app.get('/currentUser', c => c.json({ user: { ...c.get('currentUser'), email: c.get('currentUserEmail') }, usingTheme: c.get('usingTheme') }));
app.get('/notificationCount', async c => {
	const env = c.env as any, currentUser = c.get('currentUser');
	return c.json({
		notificationCount: currentUser ? (await env.db.prepare('SELECT COUNT(*) AS total FROM notification WHERE uid = ? AND read = 0').bind(currentUser.id).first()).total : 0,
		privateMessageCount: currentUser ? (await env.db.prepare('SELECT COUNT(*) AS total FROM private_messages WHERE receiver = ? AND read = 0').bind(currentUser.id).first()).total : 0
	});
});
app.get('/home', async c => {
	const env = c.env as any, locale = c.get('shortLocale'), currentUser = c.get('currentUser');
	const discussions = (await env.db.prepare(`
		SELECT
			d.id, d.category, d.title, d.created_at, d.pin,
			json_object (
				${userInfoDatas.map(data => `'${data}', u.${data}`).join()}
			) AS user
		FROM discussion d
		JOIN users u ON u.id = d.uid
		WHERE d.pin = 0
		ORDER BY d.pin DESC, d.created_at DESC
		LIMIT 10
	`).bind().all()).results.map(({ user, ...data }: { user: string, id: number, category: discussionCategoriesType, title: string, created_at: string, pin: number }) => ({ ...data, user: JSON.parse(user) }));
	const announcements = (await env.db.prepare(`
		SELECT
			d.id, d.category, d.title, d.created_at, d.pin,
			json_object (
				${userInfoDatas.map(data => `'${data}', u.${data}`).join()}
			) AS user
		FROM discussion d
		JOIN users u ON u.id = d.uid
		WHERE d.pin > 0
		ORDER BY d.pin DESC, d.created_at DESC
		LIMIT 10
	`).bind().all()).results.map(({ user, ...data }: { user: string, id: number, category: discussionCategoriesType, title: string, created_at: string, pin: number }) => ({ ...data, user: JSON.parse(user) }));
	if (!currentUser) {
		return c.json({ discussions, announcements });
	}
	const { checkin_date, checkin_count, checkin_today_status, checkin_today_good1, checkin_today_good2, checkin_today_bad1, checkin_today_bad2 } = await env.db.prepare('SELECT checkin_date, checkin_count, checkin_today_status, checkin_today_good1, checkin_today_good2, checkin_today_bad1, checkin_today_bad2 FROM users WHERE id = ?').bind(currentUser.id).first();
	const checkin_date_object = new Date(checkin_date + 'Z');
	const today = new Date();
	const notCheckedIn = !checkin_date
			|| checkin_date_object.getFullYear() !== today.getFullYear()
			|| checkin_date_object.getMonth() !== today.getMonth()
			|| checkin_date_object.getDate() !== today.getDate();
	if (notCheckedIn) {
		return c.json({ discussions, announcements, notCheckedIn });
	}
	return c.json({
		discussions,
		announcements,
		notCheckedIn,
		...(notCheckedIn ? {} : {
			checkin_count,
			checkin_today_status,
			checkin_today_good1: await env.db.prepare(`SELECT title_${locale}, good_${locale} FROM checkin_texts WHERE id = ?`).bind(checkin_today_good1).first(),
			checkin_today_good2: await env.db.prepare(`SELECT title_${locale}, good_${locale} FROM checkin_texts WHERE id = ?`).bind(checkin_today_good2).first(),
			checkin_today_bad1: await env.db.prepare(`SELECT title_${locale}, bad_${locale} FROM checkin_texts WHERE id = ?`).bind(checkin_today_bad1).first(),
			checkin_today_bad2: await env.db.prepare(`SELECT title_${locale}, bad_${locale} FROM checkin_texts WHERE id = ?`).bind(checkin_today_bad2).first()
		}),
	});
});
app.route('/admin', adminRoutes);
app.route('/user', userRoutes);
app.route('/feed', feedRoutes);
app.route('/discussion', discussionRoutes);
app.route('/ticket', ticketRoutes);
app.get('/judgement', async c => c.json((await (c.env as any).db.prepare(`
	SELECT
		j.id,
		j.type,
		j.payload,
		j.created_at,
		j.batch_id,
		j.comment,
		json_object ( ${userInfoDatas.map(scheme => `'${scheme}', u.${scheme}`)} ) AS user,
		json_object ( ${userInfoDatas.map(scheme => `'${scheme}', ou.${scheme}`)} ) AS operator
	FROM judgement j
	JOIN users u ON j.uid = u.id
	JOIN users ou ON j.operator = ou.id
	ORDER BY j.created_at DESC
	LIMIT 100
`).bind().all()).results.map(({ payload, user, operator, ...data }: {
	id: number,
	type: judgementType,
	payload: string,
	created_at: string,
	batch_id: string,
	comment: string,
	user: string,
	operator: string
}) => ({ payload: JSON.parse(payload), user: JSON.parse(user), operator: JSON.parse(operator), ...data }))));
app.route('/file', fileRoutes);
app.route('/theme', themeRoutes);
app.get('/support-langs', async c => c.json(await ((await fetch('https://judge.cqiming.com/languages/')).json())));
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
        return c.json({ success: false, message: getI18n(c)('home.checkIn.alreadyCheckedIn') });
    }
    const checkin_today_status = Math.floor(Math.random() * 7) - 3;
    const { results: checkin_today_goods } = checkin_today_status > -3 ? await env.db.prepare('SELECT id FROM checkin_texts WHERE (bad_en IS NULL OR bad_en = \'\') AND (bad_zh IS NULL OR bad_zh = \'\') ORDER BY RANDOM() LIMIT 2').bind().all() : { results: [{ id: null }, { id: null }] };
    const { results: checkin_today_bads } = checkin_today_status < 3 ? await env.db.prepare('SELECT id FROM checkin_texts WHERE (good_en IS NULL OR good_en = \'\') AND (good_zh IS NULL OR good_zh = \'\') ORDER BY RANDOM() LIMIT 2').bind().all() : { results: [{ id: null }, { id: null }] };
    await env.db.prepare('UPDATE users SET checkin_date = CURRENT_TIMESTAMP, checkin_count = ?, checkin_today_status = ?, checkin_today_good1 = ?, checkin_today_good2 = ?, checkin_today_bad1 = ?, checkin_today_bad2 = ? WHERE id = ?')
        .bind(lastCheckInCount ? Math.max(lastCheckInCount - Math.floor(Math.pow(2, dateDistance - 2)) + 1, 1) : 1, checkin_today_status, checkin_today_goods[0].id, checkin_today_goods[1].id, checkin_today_bads[0].id, checkin_today_bads[1].id, currentUser.id).run();
    return c.json({ success: true });
});
app.post('/chat/send', async c => {
    const env = c.env as any, currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!(currentUser.permission & permissionChat)) {
		return accessDenied(c);
	}
    if (!currentUser) {
        return loginRequired(c);
    }
    const { uid, content } = c.get('reqBody');
    if (!uid || !content) {
        return notFound(c);
    }
    await env.db.prepare('INSERT INTO private_messages (sender, receiver, content) VALUES (?, ?, ?)').bind(currentUser.id, uid, content).run();
    return c.redirect('/chat?user=' + uid);
});
export default app;