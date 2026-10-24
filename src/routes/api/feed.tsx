import { Hono } from "hono";
import type { AppEnv, ContextType, userInfo } from "../../types";
import { accessDenied, contentRequired, emailVerifyRequired, loginRequired, muted, notFound } from "../errorPages";
import { enableEmailVerify, permissionSpeak } from "../../settings";
import { processAt } from "../../at";
import { userInfoDatas } from "./user";

export type feedInfo = {
	id: number,
	parent?: feedInfo | null,
	user: userInfo,
	content: string,
	created_at: string,
	replies: feedInfo[]
};
const app = new Hono<AppEnv>();
export async function feedQuery(c: ContextType, id_: number, queryParent?: boolean, queryReply?: boolean): Promise<feedInfo | null>;
export async function feedQuery(c: ContextType, id_: number[], queryParent?: boolean, queryReply?: boolean): Promise<(feedInfo | null)[]>;
export async function feedQuery(c: ContextType, id_: number | number[], queryParent = true, queryReply = true): Promise<feedInfo | null | (feedInfo | null)[]> {
	const env = c.env as any, ids = typeof id_ === 'number' ? [id_] : id_;
	if (!ids.length) {
		return [];
	}
	const { results: rows }: { results: { id: number, parent_id: number | null }[] } = await env.db.prepare(`SELECT id, parent_id FROM feed WHERE id IN (${ids.map(() => '?')}) AND deleted = 0`).bind(...ids).all();
	if (!rows.length) {
		return typeof id_ === 'number' ? null : id_.map(() => null);
	}
	const parentMap = new Map<number, number | null>();
	rows.forEach(({ id, parent_id }) => parentMap.set(id, parent_id));
	const subFeeds = new Set<number>();
	const doNotQueryReplyFeeds = new Set<number>();
	rows.forEach(({ id }) => subFeeds.add(id));
	if (!queryReply) {
		rows.forEach(({ id }) => doNotQueryReplyFeeds.add(id));
	}
	if (queryParent) {
		rows.forEach(({ parent_id }) => {
			if (!parent_id) {
				return;
			}
			subFeeds.add(parent_id);
			if (!ids.includes(parent_id)) {
				doNotQueryReplyFeeds.add(parent_id);
			}
		});
	}
	const addReply = async (ids: number[]) => {
		if (!ids.length) {
			return [];
		}
		const { results }: { results: { id: number }[] } = await env.db.prepare(`
			SELECT id FROM (
				SELECT
					id,
					ROW_NUMBER() OVER (
						PARTITION BY parent_id
						ORDER BY created_at DESC
					) AS rn
				FROM feed
				WHERE parent_id IN (${ids.map(() => '?')}) AND deleted = 0
			) WHERE rn <= 10
		`).bind(...ids).all();
		results.forEach(({ id }) => subFeeds.add(id));
		return results.map(({ id }) => id);
	};
	if (queryReply) {
		await addReply(await addReply(await addReply(ids)));
	}
	const feedInfos = new Map<number, { [k in keyof feedInfo]: k extends 'replies' ? number[] : feedInfo[k] }>();
	(await env.db.prepare(`
		SELECT
			f.id, f.content, f.created_at,
			json_object (
				${userInfoDatas.map(schema => `'${schema}', u.${schema}`)}
			) AS user
		FROM feed f
		JOIN users u ON u.id = f.uid
		WHERE f.id IN (${Array.from(subFeeds).map(() => '?')}) AND deleted = 0
	`).bind(...subFeeds).all()).results.forEach(({ id, content, created_at, user }: { id: number, content: string, created_at: string, user: string }) => feedInfos.set(id, { id, user: JSON.parse(user), content, created_at, replies: [] }));
	(await env.db.prepare(`SELECT id, parent_id FROM feed WHERE id IN (${Array.from(subFeeds).map(() => '?')}) AND deleted = 0 ORDER BY created_at DESC`).bind(...subFeeds).all()).results.forEach(({ id, parent_id }: { id: number, parent_id: number | null }) => {
		if (parent_id && !doNotQueryReplyFeeds.has(parent_id)) {
			feedInfos.get(parent_id)?.replies.push(id);
		}
	});
	const makeFeed = (id: number, makeReplies = true): feedInfo | null => {
		if (!feedInfos.has(id)) {
			return null;
		}
		const info = feedInfos.get(id)!;
		return { ...info, replies: makeReplies ? info.replies.map(id => makeFeed(id)).filter((info): info is feedInfo => !!info) : [] };
	};
	const makeFeedWithParent = (id: number): feedInfo | null => {
		const ret = makeFeed(id);
		if (!ret) {
			return null;
		}
		const parent_id = parentMap.get(id);
		return { ...ret, parent: parent_id ? makeFeed(parent_id, false) : null };
	};
	return typeof id_ === 'number' ? makeFeedWithParent(id_) : ids.map(id => makeFeedWithParent(id));
};
app.get('/query/:feed_id{\\d+}', async c => {
	const feed_id = parseInt(c.req.param('feed_id'));
	const perPage = Math.min(Math.max(parseInt(c.get('reqBody').perpage || '10') || 10, 1), 10);
	const page = Math.max(parseInt(c.get('reqBody').page || '1') || 1, 1);
	if (feed_id !== feed_id || feed_id < 0) {
		return c.json({ feed: null, replies: [], total: 0 });
	}
	return c.json({
		feed: await feedQuery(c, feed_id, true, false),
		replies: await feedQuery(c, [...(await (c.env as any).db.prepare('SELECT id FROM feed WHERE parent_id = ? AND deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?')
			.bind(feed_id, perPage, (page - 1) * perPage).all())
			.results.map(({ id }: { id: number }) => id)], false, true),
		total: (await (c.env as any).db.prepare('SELECT COUNT(*) AS total FROM feed WHERE parent_id = ? AND deleted = 0').bind(feed_id).first()).total
	});
});
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
		await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, \'feed-reply\', ?)').bind(parent_uid, JSON.stringify({
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