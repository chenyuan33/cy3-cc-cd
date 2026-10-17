import { Hono } from "hono";
import type { AppEnv, userInfo } from "../../types";
import { accessDenied, categoryNotFound, categoryRequired, contentRequired, emailVerifyRequired, loginRequired, missingParams, muted, notFound, statusNotFound, titleRequired } from "../errorPages";
import { enableEmailVerify, permissionAdmin, permissionSpeak } from "../../settings";
import { processAt } from "../../at";
import { segmenter } from "../../i18n";
import { userInfoDatas } from "./user";
export const ticketStatus = ['new', 'inProgress', 'pending', 'infoNeeded', 'resolved', 'closed'] as const;
export type ticketStatusType = (typeof ticketStatus)[number];
export const inTicketStatus = (status: string): status is ticketStatusType => {
	return (ticketStatus as readonly string[]).includes(status);
};
export const ticketCategories = ['suggestion', 'bugReport', 'userReport', 'checkinAdd', 'other'] as const;
export type ticketCategoriesType = (typeof ticketCategories)[number];
export const inTicketCategory = (category: string): category is ticketCategoriesType => {
	return ticketCategories.includes(category as any);
}
export type ticketBasicInfo = {
	id: number,
	user: userInfo,
	category: ticketCategoriesType,
	status: ticketStatusType,
	title: string,
	created_at: string,
	assignee: userInfo | null
};
export type ticketInfo = ticketBasicInfo & { content: string };
export type ticketReplyInfo = {
	id: number,
	parent?: ticketReplyInfo | { [key in keyof ticketReplyInfo]: null },
	user: userInfo,
	content: string,
	set_assignee: userInfo | null,
	set_status: ticketStatusType | null,
	created_at: string
};
const app = new Hono<AppEnv>();
app.get('/list', async c => {
	const { category, status, page: page_, perpage } = c.get('reqBody'), env = c.env as any;
	if (category && !inTicketCategory(category)) {
		return categoryNotFound(c);
	}
	if (status && !inTicketStatus(status)) {
		return statusNotFound(c);
	}
	const page = Math.max(parseInt(page_ || '1') || 1, 1);
	const perPage = Math.max(1, Math.min(parseInt(perpage || '20') || 20, 20));
	return c.json({
		ticket: (await env.db.prepare(`
			SELECT
				t.id, t.category, t.status, t.title, t.created_at,
				json_object (
					${userInfoDatas.map(schema => `'${schema}', u.${schema}`)}
				) AS user,
				CASE
					WHEN t.assignee_uid IS NULL THEN NULL
					ELSE json_object (
						${userInfoDatas.map(schema => `'${schema}', au.${schema}`)}
					)
				END AS assignee
			FROM ticket t
			JOIN users u ON t.uid = u.id
			LEFT JOIN users au ON t.assignee_uid = au.id
			${category || status ? 'WHERE' : ''}
			${category ? 't.category = ?' : ''}
			${category && status ? 'AND' : ''}
			${status ? 't.status = ?' : ''}
			ORDER BY t.created_at DESC
			LIMIT ?
			OFFSET ?
		`).bind(...(category ? [category] : []), ...(status ? [status] : []), perPage, perPage * (page - 1)).all()).results.map(({ user, assignee, ...attr }: { user: string, assignee: string | null, [attr: string]: any }) => ({ user: JSON.parse(user), assignee: assignee ? JSON.parse(assignee) : null, ...attr })),
		total: (await env.db.prepare(`SELECT COUNT(*) as total FROM ticket ${category || status ? 'WHERE' : ''} ${category ? 'category = ?' : ''} ${category && status ? 'AND' : ''} ${status ? 'status = ?' : ''}`).bind(...(category ? [category] : []), ...(status ? [status] : [])).first()).total
	});
});
app.get('/detail/:id{\\d+}', async c => {
	const env = c.env as any, id = parseInt(c.req.param('id')), { page: page_, perpage } = c.get('reqBody'), currentUser = c.get('currentUser');
	const page = Math.max(parseInt(page_ || '1') || 1, 1);
	const perPage = Math.max(1, Math.min(parseInt(perpage || '20') || 20, 20));
	const info = await env.db.prepare(`
		SELECT
			t.id, t.category, t.status, t.title, t.content, t.created_at,
			json_object (
				${userInfoDatas.map(key => `'${key}', u.${key}`)}
			) AS user,
			CASE
				WHEN t.assignee_uid IS NULL THEN NULL
				ELSE json_object (
					${userInfoDatas.map(schema => `'${schema}', au.${schema}`)}
				)
			END AS assignee
		FROM ticket t
		JOIN users u ON t.uid = u.id
		LEFT JOIN users au ON t.assignee_uid = au.id
		WHERE t.id = ?`).bind(id).first();
	if (!info) {
		return c.json({ exists: false });
	}
	return c.json({
		exists: true,
		info: { ...info, user: JSON.parse(info.user), assignee: JSON.parse(info.assignee) },
		replyCount: (await env.db.prepare('SELECT COUNT(*) as total FROM ticket_reply WHERE ticket_id = ?').bind(id).first()).total,
		replies: (await env.db.prepare(`
			SELECT
				t.id, t.content, t.set_status, t.created_at,
				CASE
					WHEN t.parent_id = 0 THEN json_object (
						'id', 0,
						'content', ti.content,
						'created_at', ti.created_at,
						'user', json_object (
							${userInfoDatas.map(key => `'${key}', u.${key}`)}
						),
						'set_status', NULL,
						'set_assignee', NULL
					)
					WHEN t.parent_id IS NULL THEN NULL
					WHEN p.id IS NULL THEN json_object (
						'id', NULL,
						'content', NULL,
						'created_at', NULL,
						'user', NULL,
						'set_status', NULL,
						'set_assignee', NULL
					)
					ELSE json_object (
						'id', p.id,
						'content', p.content,
						'created_at', p.created_at,
						'user', json_object (
							${userInfoDatas.map(key => `'${key}', pu.${key}`)}
						),
						'set_status', p.set_status,
						'set_assignee', CASE
							WHEN p.set_assignee IS NULL THEN NULL
							ELSE json_object (
								${userInfoDatas.map(key => `'${key}', pau.${key}`)}
							)
						END
					)
				END AS parent,
				json_object (
					${userInfoDatas.map(key => `'${key}', u.${key}`)}
				) AS user,
				CASE
					WHEN t.set_assignee IS NULL OR t.set_assignee = '' THEN NULL
					ELSE json_object (
						${userInfoDatas.map(key => `'${key}', au.${key}`)}
					)
				END AS set_assignee
			FROM ticket_reply t
			JOIN ticket ti ON t.ticket_id = ti.id
			JOIN users u ON t.uid = u.id
			LEFT JOIN users au ON t.set_assignee = au.id
			LEFT JOIN ticket_reply p ON t.parent_id = p.id
			LEFT JOIN users pu ON p.uid = pu.id
			LEFT JOIN users pau ON p.set_assignee = pau.id
			WHERE t.ticket_id = ?
			ORDER BY t.created_at
			LIMIT ?
			OFFSET ?
		`).bind(id, perPage, (page - 1) * perPage).all()).results.map(({ user, set_assignee, parent, ...attr }: { id: number, content: string, created_at: string, user: string, set_assignee: string | null, parent: string }) => ({
			user: JSON.parse(user),
			set_assignee: set_assignee ? JSON.parse(set_assignee) : '',
			parent: parent === null ? null : JSON.parse(parent),
			...attr
		})),
		quickReplies: currentUser && ((currentUser.permission & permissionAdmin) || info.assignee && JSON.parse(info.assignee).id === currentUser.id) ? (await env.db.prepare('SELECT title, content FROM ticket_quick_reply').all()).results : []
	});
});
app.get('/similar', async c => {
	const locale = c.get('shortLocale'), { title, category } = c.get('reqBody'), env = c.env as any;
    if (!title) {
        return titleRequired(c);
    }
    if (!category) {
        return categoryRequired(c);
    }
	return c.json((await env.db.prepare('SELECT rowid, status, title FROM ticket_fts WHERE category = ? AND ticket_fts MATCH ? LIMIT 10').bind(category, `segmented_title:"${segmenter(locale, title).replaceAll('"', '""')}"`).all()).results.map(({ rowid, status, title }: { rowid: number, status: ticketStatusType, title: string }) => ({ id: rowid, status, title })));
});
app.post('/post', async c => {
    const currentUser = c.get('currentUser'), env = c.env as any, locale = c.get('language'), { category, title, content } = c.get('reqBody');
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
    console.log(category, ticketCategories);
    if (!(ticketCategories as readonly string[]).includes(category)) {
        return categoryNotFound(c);
    }
    const { id } = await env.db.prepare('INSERT INTO ticket (uid, category, title, content) VALUES (?, ?, ?, ?) RETURNING id')
        .bind(currentUser.id, category, title, content).first();
	await env.db.prepare('INSERT INTO ticket_fts (rowid, category, status, title, segmented_title) VALUES (?, ?, \'new\', ?, ?)').bind(id, category, title, segmenter(locale, title)).run();
    await processAt(c, content, '/ticket/' + id);
    return c.json({ success: true, id });
});
app.post('/edit', async c => {
    const currentUser = c.get('currentUser'), env = c.env as any, locale = c.get('language'), { ticket_id, title, content } = c.get('reqBody');
    if (!currentUser) {
        return loginRequired(c);
    }
    if (!ticket_id || !title || !content) {
        return contentRequired(c);
    }
    const ticket = await env.db.prepare('SELECT uid FROM ticket WHERE id = ?').bind(ticket_id).first();
    if (!ticket) {
        return notFound(c);
    }
    if (currentUser.id !== 1 && currentUser.id !== ticket.uid) {
        return accessDenied(c);
    }
	await env.db.prepare('UPDATE ticket SET title = ?, content = ? WHERE id = ?').bind(title, content, ticket_id).run();
	await env.db.prepare('UPDATE ticket_fts SET title = ?, segmented_title = ? WHERE rowid = ?').bind(title, segmenter(locale, title), ticket_id).run();
    return c.json({ success: true });
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
    if (!ticket_id || set_status && !(ticketStatus as readonly string[]).includes(set_status)) {
        return notFound(c);
    }
    if (!content && !set_status && !set_assignee) {
        return contentRequired(c);
    }
    const ticket = await env.db.prepare('SELECT id, uid FROM ticket WHERE id = ?').bind(ticket_id).first();
    if (!ticket) {
        return notFound(c);
    }
    const parent_id_ = parseInt(parent_id_got ?? '');
    const parent_id = Number.isNaN(parent_id_) ? null : parent_id_;
    if (set_status || set_assignee) {
        const { assignee_uid } = await env.db.prepare('SELECT assignee_uid FROM ticket WHERE id = ?').bind(ticket_id).first();
        if (!(currentUser.permission & permissionAdmin) && (!assignee_uid || assignee_uid !== currentUser.id)) {
            return accessDenied(c);
        }
    }
    const { id } = await env.db.prepare('INSERT INTO ticket_reply (ticket_id, parent_id, uid, content, set_status, set_assignee) VALUES (?, ?, ?, ?, ?, ?) RETURNING id').bind(ticket_id, parent_id, currentUser.id, content, set_status ?? null, set_assignee ?? null).first();
    if (content) {
        await processAt(c, content, '/ticket/reply/' + id);
    }
    if (set_status) {
        await env.db.prepare('UPDATE ticket SET status = ? WHERE id = ?').bind(set_status, ticket_id).run();
		await env.db.prepare('UPDATE ticket_fts SET status = ? WHERE rowid = ?').bind(set_status, ticket_id).run();
        await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, \'ticket-status-changed\', ?)').bind(ticket.uid, JSON.stringify({ ticket_id, status: set_status })).run();
    }
    if (set_assignee) {
        await env.db.prepare('UPDATE ticket SET assignee_uid = ? WHERE id = ?').bind(set_assignee, ticket_id).run();
    }
    if (parent_id !== null) {
        const { uid: parent_uid } = parent_id
            ? await env.db.prepare('SELECT uid FROM ticket_reply WHERE id = ?').bind(parent_id).first()
            : await env.db.prepare('SELECT uid FROM ticket WHERE id = ?').bind(ticket_id).first();
        if (parent_uid !== currentUser.id) {
            await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, \'ticket-reply-replied\', ?)').bind(parent_uid, JSON.stringify({ ticket_id, uid: currentUser.id, parent_id, id })).run();
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
    const reply = await env.db.prepare('SELECT uid FROM ticket_reply WHERE id = ?').bind(reply_id).first();
    if (!reply) {
        return notFound(c);
    }
    if (currentUser.id !== 1 && currentUser.id !== reply.uid) {
        return accessDenied(c);
    }
    await env.db.prepare('UPDATE ticket_reply SET content = ? WHERE id = ?').bind(content, reply_id).run();
    return c.json({ success: true });
});
app.post('/reply/delete', async c => {
    const currentUser = c.get('currentUser'), env = c.env as any, { reply_id } = c.get('reqBody');
    console.log(c.get('reqBody'));
    if (!currentUser) {
        return loginRequired(c);
    }
    if (!reply_id) {
        return notFound(c);
    }
    const reply = await env.db.prepare('SELECT uid FROM ticket_reply WHERE id = ?').bind(reply_id).first();
    if (!reply) {
        return notFound(c);
    }
    if (currentUser.id !== 1 && currentUser.id !== reply.uid) {
        return accessDenied(c);
    }
    await env.db.prepare('DELETE FROM ticket_reply WHERE id = ?').bind(reply_id).run();
    return c.json({ success: true });
});
app.get('/reply/redirect', async c => {
	const env = c.env as any, { id } = c.get('reqBody');
	if (!id) {
		return missingParams(c);
	}
	const reply = await env.db.prepare('SELECT uid FROM ticket_reply WHERE id = ?').bind(id).first();
	if (!reply) {
		return c.json({ ticket_id: null });
	}
	const { ticket_id } = await env.db.prepare('SELECT ticket_id FROM ticket_reply WHERE id = ?').bind(id).first();
	return c.json({ ticket_id, page: Math.floor((await env.db.prepare('SELECT COUNT(*) as total FROM ticket_reply WHERE ticket_id = ? AND id < ?').bind(ticket_id, id).first()).total / 10) + 1 });
});
export default app;