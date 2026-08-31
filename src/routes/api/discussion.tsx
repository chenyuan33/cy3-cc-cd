import { Hono } from "hono";
import type { AppEnv, userInfo } from "../../types";
import { accessDenied, emailVerifyRequired, errorHTML, loginRequired, muted, notFound } from "../errorPages";
import { getText } from "../../translations";
import { enableEmailVerify, permissionAdmin, permissionSpeak } from "../../settings";
import { processAt } from "../../at";

export const discussionCategories = {
	announcement: (user: userInfo) => user.permission & permissionAdmin,
	general: () => true,
	academic: () => true
};
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
	if (!(category in discussionCategories)) {
		return notFound(c);
	}
	if (!discussionCategories[category as keyof typeof discussionCategories](currentUser)) {
		return accessDenied(c);
	}
	return c.redirect('/discussion/' + (await env.db.prepare('INSERT INTO discussion (uid, category, title, content) VALUES (?, ?, ?, ?) RETURNING id').bind(currentUser.id, category, title, content).first()).id, 303);
});
app.post('/delete', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, { discussion_id } = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!discussion_id) {
		return notFound(c);
	}
	const discussion = await env.db.prepare('SELECT uid FROM discussion WHERE id = ?').bind(discussion_id).first();
	if (!discussion) {
		return notFound(c);
	}
	if (currentUser.id !== 1 && currentUser.id !== discussion.uid) {
		return accessDenied(c);
	}
	await env.db.prepare('DELETE FROM discussion_reply WHERE discussion_id = ?').bind(discussion_id).run();
	await env.db.prepare('DELETE FROM discussion WHERE id = ?').bind(discussion_id).run();
	return c.redirect('/discussion', 303);
});
app.post('/edit', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, locale = c.get('locale'), { discussion_id, title, content } = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!discussion_id || !title || !content) {
		return errorHTML(c, getText(locale, 'contentRequired'));
	}
	const discussion = await env.db.prepare('SELECT uid FROM discussion WHERE id = ?').bind(discussion_id).first();
	if (!discussion) {
		return notFound(c);
	}
	if (currentUser.id !== 1 && currentUser.id !== discussion.uid) {
		return accessDenied(c);
	}
	await env.db.prepare('UPDATE discussion SET title = ?, content = ? WHERE id = ?').bind(title, content, discussion_id).run();
	return c.redirect('/discussion/' + discussion_id, 303);
});
app.post('/reply', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, locale = c.get('locale'), { discussion_id, parent_id: parent_id_got, content } = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (enableEmailVerify && !c.get('currentUserEmail')) {
		return emailVerifyRequired(c);
	}
	if (!(currentUser.permission & permissionSpeak)) {
		return muted(c);
	}
	if (!discussion_id) {
		return notFound(c);
	}
	if (!content) {
		return errorHTML(c, getText(locale, 'contentRequired'));
	}
	const discussion = await env.db.prepare('SELECT id, uid FROM discussion WHERE id = ?').bind(discussion_id).first();
	if (!discussion) {
		return notFound(c);
	}
	const parent_id_ = parseInt(parent_id_got ?? '');
	const parent_id = Number.isNaN(parent_id_) ? null : parent_id_;
	const { id } = await env.db.prepare('INSERT INTO discussion_reply (discussion_id, parent_id, uid, content) VALUES (?, ?, ?, ?) RETURNING id').bind(discussion_id, parent_id, currentUser.id, content).first();
	processAt(c, content, '/discussion/reply/' + id);
	if (parent_id !== null) {
		const { uid: parent_uid } = parent_id
			? await env.db.prepare('SELECT uid FROM discussion_reply WHERE id = ?').bind(parent_id).first()
			: await env.db.prepare('SELECT uid FROM discussion WHERE id = ?').bind(discussion_id).first();
		if (parent_uid !== currentUser.id) {
			await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "discussion-reply-replied", ?)').bind(parent_uid, JSON.stringify({ discussion_id, uid: currentUser.id, parent_id, id })).run();
		}
	}
	return c.redirect('/discussion/' + discussion_id, 303);
});
app.post('/reply/edit', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, locale = c.get('locale'), { discussion_id, reply_id, content } = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!discussion_id || !reply_id || !content) {
		return errorHTML(c, getText(locale, 'contentRequired'));
	}
	const reply = await env.db.prepare('SELECT uid FROM discussion_reply WHERE id = ? AND discussion_id = ?').bind(reply_id, discussion_id).first();
	if (!reply) {
		return notFound(c);
	}
	if (currentUser.id !== 1 && currentUser.id !== reply.uid) {
		return accessDenied(c);
	}
	await env.db.prepare('UPDATE discussion_reply SET content = ? WHERE id = ? AND discussion_id = ?').bind(content, reply_id, discussion_id).run();
	return c.redirect('/discussion/' + discussion_id, 303);
});
app.post('/reply/delete', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, { discussion_id, reply_id } = c.get('reqBody');
	console.log(c.get('reqBody'));
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!discussion_id || !reply_id) {
		return notFound(c);
	}
	if (!(await env.db.prepare('SELECT uid FROM discussion WHERE id = ?').bind(discussion_id).first())) {
		return notFound(c);
	}
	const reply = await env.db.prepare('SELECT uid FROM discussion_reply WHERE id = ? AND discussion_id = ?').bind(reply_id, discussion_id).first();
	if (!reply) {
		return notFound(c);
	}
	if (currentUser.id !== 1 && currentUser.id !== reply.uid) {
		return accessDenied(c);
	}
	if (currentUser.id !== reply.uid) {
		const { created_at: reply_created_at, content: reply_content } = await env.db.prepare('SELECT created_at, content FROM discussion_reply WHERE id = ?').bind(reply_id).first();
		await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "discussion-reply-deleted-by-discussion-owner", ?)').bind(reply.uid, JSON.stringify({ discussion_id, uid: currentUser.id, reply_created_at, reply_content })).run();
	}
	await env.db.prepare('DELETE FROM discussion_reply WHERE id = ? AND discussion_id = ?').bind(reply_id, discussion_id).run();
	return c.redirect('/discussion/' + discussion_id, 303);
});
export default app;