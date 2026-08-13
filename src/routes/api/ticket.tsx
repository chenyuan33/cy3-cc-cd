import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { accessDenied, emailVerifyRequired, errorHTML, loginRequired, muted, notFound } from "../errorPages";
import { getText } from "../../translations";
import { enableEmailVerify, permissionAdmin, permissionSpeak } from "../../settings";
import { processAt } from "../../at";
export const ticketStatus = ['new', 'inProgress', 'pending', 'infoNeeded', 'resolved', 'closed'];
export const ticketCategories = ['suggestion', 'bugReport', 'userReport', 'checkinAdd', 'other'];
const app = new Hono<AppEnv>();
app.post('/post', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, locale = c.get('locale'), { category, title, content } = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (enableEmailVerify && !c.get('currentUserEmail')) {
		return emailVerifyRequired(c);
	}
	if (!(currentUser.permission & permissionSpeak)) {
		return muted(c);
	}
	if (!category) {
		return errorHTML(c, getText(locale, 'categoryRequired'));
	}
	if (!title) {
		return errorHTML(c, getText(locale, 'titleRequired'));
	}
	if (!content) {
		return errorHTML(c, getText(locale, 'contentRequired'));
	}
	console.log(category, ticketCategories);
	if (!ticketCategories.includes(category)) {
		return notFound(c);
	}
	return c.redirect('/ticket/' + (await env.db.prepare('INSERT INTO ticket (uid, category, title, content) VALUES (?, ?, ?, ?) RETURNING id').bind(currentUser.id, category, title, content).first()).id, 303);
});
app.post('/delete', async c => {
	return notFound(c);
	// const currentUser = c.get('currentUser'), env = c.env as any, { ticket_id } = c.get('reqBody');
	// if (!currentUser) {
	// 	return loginRequired(c);
	// }
	// if (!ticket_id) {
	// 	return notFound(c);
	// }
	// const ticket = await env.db.prepare('SELECT uid FROM ticket WHERE id = ?').bind(ticket_id).first();
	// if (!ticket) {
	// 	return notFound(c);
	// }
	// if (currentUser.id !== 1 && currentUser.id !== ticket.uid) {
	// 	return accessDenied(c);
	// }
	// await env.db.prepare('DELETE FROM ticket_reply WHERE ticket_id = ?').bind(ticket_id).run();
	// await env.db.prepare('DELETE FROM ticket WHERE id = ?').bind(ticket_id).run();
	// return c.redirect('/ticket', 303);
});
app.post('/edit', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, locale = c.get('locale'), { ticket_id, title, content } = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!ticket_id || !title || !content) {
		return errorHTML(c, getText(locale, 'contentRequired'));
	}
	const ticket = await env.db.prepare('SELECT uid FROM ticket WHERE id = ?').bind(ticket_id).first();
	if (!ticket) {
		return notFound(c);
	}
	if (currentUser.id !== 1 && currentUser.id !== ticket.uid) {
		return accessDenied(c);
	}
	await env.db.prepare('UPDATE ticket SET title = ?, content = ? WHERE id = ?').bind(title, content, ticket_id).run();
	return c.redirect('/ticket/' + ticket_id, 303);
});
app.post('/reply', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, { ticket_id, parent_id: parent_id_got, content, set_status, set_assignee } = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (enableEmailVerify && !c.get('currentUserEmail')) {
		return emailVerifyRequired(c);
	}
	if (!(currentUser.permission & permissionSpeak)) {
		return muted(c);
	}
	if (!ticket_id || set_status && !ticketStatus.includes(set_status)) {
		return notFound(c);
	}
	if (!content && !set_status && !set_assignee) {
		return errorHTML(c, getText(c.get('locale'), 'contentRequired'));
	}
	const ticket = await env.db.prepare('SELECT id, uid FROM ticket WHERE id = ?').bind(ticket_id).first();
	if (!ticket) {
		return notFound(c);
	}
	const parent_id_ = parseInt(parent_id_got ?? '');
	const parent_id = Number.isNaN(parent_id_) ? null : parent_id_;
	if (set_status || set_assignee) {
		const { assignee_uid } = await env.db.prepare('SELECT assignee_uid FROM ticket WHERE id = ?').bind(ticket_id).first();
		if (!(currentUser.permission & permissionAdmin) && (!assignee_uid || assignee_uid !== currentUser.id))
		{
			return accessDenied(c);
		}
	}
	const { id } = await env.db.prepare('INSERT INTO ticket_reply (ticket_id, parent_id, uid, content, set_status, set_assignee) VALUES (?, ?, ?, ?, ?, ?) RETURNING id').bind(ticket_id, parent_id, currentUser.id, content, set_status ?? null, set_assignee ?? null).first();
	if (content) {
		processAt(c, content, '/ticket/reply/' + id);
	}
	if (set_status) {
		await env.db.prepare('UPDATE ticket SET status = ? WHERE id = ?').bind(set_status, ticket_id).run();
		await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "ticket-status-changed", ?)').bind(ticket.uid, JSON.stringify({ ticket_id, status: set_status })).run();
	}
	if (set_assignee) {
		await env.db.prepare('UPDATE ticket SET assignee_uid = ? WHERE id = ?').bind(set_assignee, ticket_id).run();
	}
	if (parent_id !== null) {
		const { uid: parent_uid } = parent_id
			? await env.db.prepare('SELECT uid FROM ticket_reply WHERE id = ?').bind(parent_id).first()
			: await env.db.prepare('SELECT uid FROM ticket WHERE id = ?').bind(ticket_id).first();
		if (parent_uid !== currentUser.id) {
			await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "ticket-reply-replied", ?)').bind(parent_uid, JSON.stringify({ ticket_id, uid: currentUser.id, parent_id, id })).run();
		}
	}
	return c.redirect('/ticket/' + ticket_id, 303);
});
app.post('/reply/edit', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, locale = c.get('locale'), { ticket_id, reply_id, content } = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!ticket_id || !reply_id || !content) {
		return errorHTML(c, getText(locale, 'contentRequired'));
	}
	const reply = await env.db.prepare('SELECT uid FROM ticket_reply WHERE id = ? AND ticket_id = ?').bind(reply_id, ticket_id).first();
	if (!reply) {
		return notFound(c);
	}
	if (currentUser.id !== 1 && currentUser.id !== reply.uid) {
		return accessDenied(c);
	}
	await env.db.prepare('UPDATE ticket_reply SET content = ? WHERE id = ? AND ticket_id = ?').bind(content, reply_id, ticket_id).run();
	return c.redirect('/ticket/' + ticket_id, 303);
});
app.post('/reply/delete', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, { ticket_id, reply_id } = c.get('reqBody');
	console.log(c.get('reqBody'));
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!ticket_id || !reply_id) {
		return notFound(c);
	}
	if (!(await env.db.prepare('SELECT uid FROM ticket WHERE id = ?').bind(ticket_id).first())) {
		return notFound(c);
	}
	const reply = await env.db.prepare('SELECT uid FROM ticket_reply WHERE id = ? AND ticket_id = ?').bind(reply_id, ticket_id).first();
	if (!reply) {
		return notFound(c);
	}
	if (currentUser.id !== 1 && currentUser.id !== reply.uid) {
		return accessDenied(c);
	}
	if (currentUser.id !== reply.uid) {
		const { created_at: reply_created_at, content: reply_content } = await env.db.prepare('SELECT created_at, content FROM ticket_reply WHERE id = ?').bind(reply_id).first();
		await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "ticket-reply-deleted-by-ticket-owner", ?)').bind(reply.uid, JSON.stringify({ ticket_id, uid: currentUser.id, reply_created_at, reply_content })).run();
	}
	await env.db.prepare('DELETE FROM ticket_reply WHERE id = ? AND ticket_id = ?').bind(reply_id, ticket_id).run();
	return c.redirect('/ticket/' + ticket_id, 303);
});
export default app;