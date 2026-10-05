import { Hono } from "hono";
import type { AppEnv, ContextType, userInfo } from "../../types";
import { accessDenied, contentRequired, emailVerifyRequired, loginRequired, muted, notFound } from "../errorPages";
import { enableEmailVerify, permissionSpeak } from "../../settings";
import { processAt } from "../../at";
import { userQuery } from "./user";

export type feedInfo = {
	id: number,
	parent?: feedInfo | null,
	user: userInfo,
	content: string,
	created_at: string,
	replies: feedInfo[]
};
const app = new Hono<AppEnv>();
const feedQuery = async (c: ContextType, feed_id: number, queryParent = true, recursionDepth = 5): Promise<feedInfo | null> => {
	const env = c.env as any;
	const { id, parent_id, uid, content, created_at } = await env.db.prepare('SELECT id, parent_id, uid, content, created_at FROM feed WHERE id = ? AND deleted = 0').bind(feed_id).first();
	if (id === null || id === undefined) {
		return null;
	}
	const parent = queryParent && parent_id ? await feedQuery(c, parent_id, false, 0) : null;
	const user = await userQuery(uid, c);
	if (!recursionDepth) {
		return { id, parent, user, content, created_at, replies: [] };
	}
	const { results }: { results: { id: number }[] } = await env.db.prepare('SELECT id FROM feed WHERE parent_id = ? AND deleted = 0 LIMIT 5').bind(feed_id).all();
	return { id, parent, user, content, created_at, replies: await Promise.all(results.filter(({ id }) => id).map(({ id }) => feedQuery(c, id, false, recursionDepth - 1))) as feedInfo[] }
};
app.get('/query/:feed_id{\\d+}', async c => c.json({
	feed: await feedQuery(c, parseInt(c.req.param('feed_id')), true, 0),
	replies: await Promise.all((await (c.env as any).db.prepare('SELECT id FROM feed WHERE parent_id = ? AND deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?')
		.bind(parseInt(c.req.param('feed_id')), Math.min(parseInt(c.get('reqBody').perpage || '10'), 10), (parseInt(c.get('reqBody').page || '1') - 1) * parseInt(c.get('reqBody').perpage || '10')).all())
		.results.map(async ({ id }: { id: number }) => await feedQuery(c, id, false))),
	total: (await (c.env as any).db.prepare('SELECT COUNT(*) AS total FROM feed WHERE parent_id = ? AND deleted = 0').bind(parseInt(c.req.param('feed_id'))).first()).total
}));
app.post('/reply', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody'), env = c.env as any;
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
		return contentRequired(c);
	}
	const parent_id = parseInt(reqBody.parent_id || '0') || 0;
	const { id } = await env.db.prepare('INSERT INTO feed (parent_id, uid, content) VALUES (?, ?, ?) RETURNING id').bind(parent_id, currentUser.id, reqBody.content).first();
	await processAt(c, reqBody.content, '/feed/' + id);
	const { uid: parent_uid } = await env.db.prepare('SELECT uid FROM feed WHERE id = ?').bind(parent_id).first();
	if (parent_id && parent_uid !== currentUser.id) {
		await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "feed-reply", ?)').bind(parent_uid, JSON.stringify({
			uid: currentUser.id,
			parent_id: parent_id,
			id: id
		})).run();
	}
	return c.json({ success: true });
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
	return c.json({ success: true });
});
app.post('/edit', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody'), env = c.env as any;
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
		return contentRequired(c);
	}
	const res = await env.db.prepare('SELECT uid, deleted FROM feed WHERE id = ?').bind(id).first();
	if (!res || res.deleted) {
		return notFound(c);
	}
	if (currentUser.id !== 1 && currentUser.id !== res.uid) {
		return accessDenied(c);
	}
	await env.db.prepare('UPDATE feed SET content = ? WHERE id = ?').bind(reqBody.content, id).run();
	return c.json({ success: true });
});
export default app;