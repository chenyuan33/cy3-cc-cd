import { Hono } from "hono";
import type { AppEnv, userInfo } from "../../types";
import { accessDenied, categoryNotFound, categoryRequired, contentRequired, emailVerifyRequired, errorJson, loginRequired, missingParams, muted, notFound, titleRequired } from "../errorPages";
import { enableEmailVerify, permissionAdmin, permissionSpeak } from "../../settings";
import { processAt } from "../../at";
import { userInfoDatas, userQuery } from "./user";

export const discussionCategories = {
    announcement: (user: userInfo) => user.permission & permissionAdmin,
    general: () => true,
    academic: () => true
} as const;
export type discussionCategoriesType = keyof typeof discussionCategories;
export const inDiscussionCategory = (category: string): category is discussionCategoriesType => {
	return category in discussionCategories;
}
export const discussionCategoriesKey = Object.keys(discussionCategories) as discussionCategoriesType[];
export type discussionBasicInfo = {
	id: number,
	user: userInfo,
	category: discussionCategoriesType,
	title: string,
	created_at: string,
	pin: number
};
export type discussionInfo = discussionBasicInfo & { content: string };
export type discussionReplyInfo = {
	id: number,
	parent?: discussionReplyInfo | { [key in keyof discussionReplyInfo]: null },
	user: userInfo,
	content: string,
	created_at: string
};
const app = new Hono<AppEnv>();
app.get('/list', async c => {
	const { category, page: page_, perpage } = c.get('reqBody'), env = c.env as any;
	if (category && !(category in discussionCategories)) {
		return categoryNotFound(c);
	}
	const page = Math.max(parseInt(page_ || '1') || 1, 1);
	const perPage = Math.max(1, Math.min(parseInt(perpage || '20') || 20, 20));
	return c.json({
		discussion: (await env.db.prepare(`
			SELECT
				d.id, d.category, d.title, d.created_at, d.pin,
				json_object (
					${userInfoDatas.map(schema => `'${schema}', u.${schema}`)}
				) AS user
			FROM discussion d
			JOIN users u ON d.uid = u.id
			${category ? 'WHERE d.category = ?' : ''}
			ORDER BY d.pin DESC, d.created_at DESC
			LIMIT ?
			OFFSET ?
		`).bind(...(category ? [category] : []), perPage, perPage * (page - 1)).all()).results.map(({ user, ...attr }: { user: string, [attr: string]: any }) => ({ user: JSON.parse(user), ...attr })),
		total: (await env.db.prepare(`SELECT COUNT(*) as total FROM discussion ${category ? 'WHERE category = ?' : ''}`).bind(...(category ? [category] : [])).first()).total
	});
});
app.get('/detail/:id{\\d+}', async c => {
	const env = c.env as any, id = parseInt(c.req.param('id')), { page: page_, perpage } = c.get('reqBody');
	const page = Math.max(parseInt(page_ || '1') || 1, 1);
	const perPage = Math.max(1, Math.min(parseInt(perpage || '20') || 20, 20));
	const info = await env.db.prepare(`
		SELECT
			d.id, d.category, d.title, d.content, d.created_at, d.pin,
			json_object (
				${userInfoDatas.map(key => `'${key}', u.${key}`)}
			) AS user
		FROM discussion d
		JOIN users u ON d.uid = u.id
		WHERE d.id = ?`).bind(id).first();
	if (!info) {
		return c.json({ exists: false });
	}
	return c.json({
		exists: true,
		info: { ...info, user: JSON.parse(info.user) },
		replyCount: (await env.db.prepare('SELECT COUNT(*) as total FROM discussion_reply WHERE discussion_id = ?').bind(id).first()).total,
		replies: (await env.db.prepare(`
			SELECT
				d.id, d.content, d.created_at,
				CASE
					WHEN d.parent_id = 0 THEN json_object (
						'id', 0,
						'content', di.content,
						'created_at', di.created_at,
						'user', json_object (
							${userInfoDatas.map(key => `'${key}', u.${key}`)}
						)
					)
					WHEN d.parent_id IS NULL THEN NULL
					WHEN p.id IS NULL THEN json_object (
						'id', NULL,
						'content', NULL,
						'created_at', NULL,
						'user', NULL
					)
					ELSE json_object (
						'id', p.id,
						'content', p.content,
						'created_at', p.created_at,
						'user', json_object (
							${userInfoDatas.map(key => `'${key}', pu.${key}`)}
						)
					)
				END AS parent,
				json_object (
					${userInfoDatas.map(key => `'${key}', u.${key}`)}
				) AS user
			FROM discussion_reply d
			JOIN discussion di ON d.discussion_id = di.id
			JOIN users u ON d.uid = u.id
			LEFT JOIN discussion_reply p ON d.parent_id = p.id
			LEFT JOIN users pu ON p.uid = pu.id
			WHERE d.discussion_id = ?
			ORDER BY d.created_at
			LIMIT ?
			OFFSET ?
		`).bind(id, perPage, (page - 1) * perPage).all()).results.map(({ user, parent, ...attr }: { id: number, content: string, created_at: string, user: string, parent: string }) => ({
			user: JSON.parse(user),
			parent: parent === null ? null : JSON.parse(parent),
			...attr
		}))
	});
});
app.post('/post', async c => {
    const currentUser = c.get('currentUser'), env = c.env as any, { category, title, content } = c.get('reqBody');
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
        return categoryRequired(c);
    }
    if (!title) {
        return titleRequired(c);
    }
    if (!content) {
        return contentRequired(c);
    }
    if (!(category in discussionCategories)) {
        return categoryNotFound(c);
    }
    if (!discussionCategories[category as keyof typeof discussionCategories](currentUser)) {
        return accessDenied(c);
    }
    const { id } = await env.db.prepare('INSERT INTO discussion (uid, category, title, content) VALUES (?, ?, ?, ?) RETURNING id')
        .bind(currentUser.id, category, title, content).first();
    await processAt(c, content, '/discussion/' + id);
    return c.json({ success: true, id });
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
    return c.json({ success: true });
});
app.post('/edit', async c => {
    const currentUser = c.get('currentUser'), env = c.env as any, { discussion_id, title, content } = c.get('reqBody');
    if (!currentUser) {
        return loginRequired(c);
    }
    if (!discussion_id || !title || !content) {
        return contentRequired(c);
    }
    const discussion = await env.db.prepare('SELECT uid FROM discussion WHERE id = ?').bind(discussion_id).first();
    if (!discussion) {
        return notFound(c);
    }
    if (currentUser.id !== 1 && currentUser.id !== discussion.uid) {
        return accessDenied(c);
    }
    await env.db.prepare('UPDATE discussion SET title = ?, content = ? WHERE id = ?').bind(title, content, discussion_id).run();
    return c.json({ success: true });
});
app.post('/reply', async c => {
    const currentUser = c.get('currentUser'), env = c.env as any, { discussion_id, parent_id: parent_id_got, content } = c.get('reqBody');
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
        return contentRequired(c);
    }
    const discussion = await env.db.prepare('SELECT id, uid FROM discussion WHERE id = ?').bind(discussion_id).first();
    if (!discussion) {
        return notFound(c);
    }
    const parent_id_ = parseInt(parent_id_got ?? '');
    const parent_id = Number.isNaN(parent_id_) ? null : parent_id_;
    const { id } = await env.db.prepare('INSERT INTO discussion_reply (discussion_id, parent_id, uid, content) VALUES (?, ?, ?, ?) RETURNING id').bind(discussion_id, parent_id, currentUser.id, content).first();
    await processAt(c, content, '/discussion/reply/' + id);
    if (parent_id !== null) {
        const { uid: parent_uid } = parent_id
            ? await env.db.prepare('SELECT uid FROM discussion_reply WHERE id = ?').bind(parent_id).first()
            : await env.db.prepare('SELECT uid FROM discussion WHERE id = ?').bind(discussion_id).first();
        if (parent_uid !== currentUser.id) {
            await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, \'discussion-reply-replied\', ?)').bind(parent_uid, JSON.stringify({ discussion_id, uid: currentUser.id, parent_id, id })).run();
        }
    }
    return c.json({ success: true });
});
app.post('/reply/edit', async c => {
    const currentUser = c.get('currentUser'), env = c.env as any, { reply_id, content } = c.get('reqBody');
    if (!currentUser) {
        return loginRequired(c);
    }
    if (!reply_id || !content) {
        return contentRequired(c);
    }
    const reply = await env.db.prepare('SELECT uid FROM discussion_reply WHERE id = ?').bind(reply_id).first();
    if (!reply) {
        return notFound(c);
    }
    if (currentUser.id !== 1 && currentUser.id !== reply.uid) {
        return accessDenied(c);
    }
    await env.db.prepare('UPDATE discussion_reply SET content = ? WHERE id = ?').bind(content, reply_id).run();
    return c.json({ success: true });
});
app.post('/reply/delete', async c => {
    const currentUser = c.get('currentUser'), env = c.env as any, { reply_id } = c.get('reqBody');
    if (!currentUser) {
        return loginRequired(c);
    }
    if (!reply_id) {
        return notFound(c);
    }
    const reply = await env.db.prepare('SELECT uid FROM discussion_reply WHERE id = ?').bind(reply_id).first();
    if (!reply) {
        return notFound(c);
    }
    if (currentUser.id !== 1 && currentUser.id !== reply.uid) {
        return accessDenied(c);
    }
    await env.db.prepare('DELETE FROM discussion_reply WHERE id = ?').bind(reply_id).run();
    return c.json({ success: true });
});
app.get('/reply/redirect', async c => {
    const env = c.env as any, { id } = c.get('reqBody');
    if (!id) {
        return missingParams(c);
    }
    const reply = await env.db.prepare('SELECT uid FROM discussion_reply WHERE id = ?').bind(id).first();
    if (!reply) {
        return c.json({ discussion_id: null });
    }
	const { discussion_id } = await env.db.prepare('SELECT discussion_id FROM discussion_reply WHERE id = ?').bind(id).first();
    return c.json({ discussion_id, page: Math.floor((await env.db.prepare('SELECT COUNT(*) as total FROM discussion_reply WHERE discussion_id = ? AND id < ?').bind(discussion_id, id).first()).total / 10) + 1 });
});
export default app;