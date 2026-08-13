import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { accessDenied, emailVerifyRequired, errorHTML, loginRequired, muted, notFound } from "../errorPages";
import { enableEmailVerify, permissionSpeak } from "../../settings";
import { getText } from "../../translations";
import { processAt } from "../../at";

const app = new Hono<AppEnv>();
app.post('/reply', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody'), locale = c.get('locale'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	if (enableEmailVerify && !c.get('currentUserEmail')) {
		return emailVerifyRequired(c);
	}
	if (!(currentUser.permission & permissionSpeak)) {
		return muted(c);
	}
	if (!Object.hasOwn(reqBody, 'content') || typeof reqBody.content !== 'string' || !reqBody.content.trim()) {
		return errorHTML(c, getText(locale, 'contentRequired'));
	}
	const parent_id = parseInt(reqBody.parent_id || '0') || 0;
	const { id } = await env.db.prepare('INSERT INTO feed (parent_id, uid, content) VALUES (?, ?, ?) RETURNING id').bind(parent_id, currentUser.id, reqBody.content).first();
	processAt(c, reqBody.content, '/feed/' + id);
	const { uid: parent_uid } = await env.db.prepare('SELECT uid FROM feed WHERE id = ?').bind(parent_id).first();
	if (parent_id && parent_uid !== currentUser.id) {
		await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "feed-reply", ?)').bind(parent_uid, JSON.stringify({
			uid: currentUser.id,
			parent_id: parent_id,
			id: id
		})).run();
	}
	return c.redirect(c.req.header('Referer') || '/feed', 303);
});
app.post('/delete', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'id')) {
		return notFound(c);
	}
	const id = parseInt(reqBody.id || '');
	if (Number.isNaN(id)) {
		return notFound(c);
	}
	const res = await (c.env as any).db.prepare('SELECT uid, deleted FROM feed WHERE id = ?').bind(id).first();
	if (!res || res.deleted) {
		return notFound(c);
	}
	if (currentUser.id !== 1 && currentUser.id !== res.uid) {
		return accessDenied(c);
	}
	await (c.env as any).db.prepare('UPDATE feed SET deleted = 1 WHERE id = ?').bind(id).run();
	return c.redirect('/feed', 303);
});
app.post('/edit', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody'), locale = c.get('locale'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'id') || !Object.hasOwn(reqBody, 'content')) {
		return notFound(c);
	}
	const id = parseInt(reqBody.id || '');
	if (Number.isNaN(id)) {
		return notFound(c);
	}
	if (typeof reqBody.content !== 'string' || !reqBody.content.trim()) {
		return errorHTML(c, getText(locale, 'contentRequired'));
	}
	const res = await env.db.prepare('SELECT uid, deleted FROM feed WHERE id = ?').bind(id).first();
	if (!res || res.deleted) {
		return notFound(c);
	}
	if (currentUser.id !== 1 && currentUser.id !== res.uid) {
		return accessDenied(c);
	}
	await env.db.prepare('UPDATE feed SET content = ? WHERE id = ?').bind(reqBody.content, id).run();
	return c.redirect(c.req.header('Referer') || '/feed', 303);
});
export default app;