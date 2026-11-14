import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { userInfoDatas } from "./user";
import { accessDenied, loginRequired, missingParams, notFound } from "../errorPages";

const app = new Hono<AppEnv>();
app.get('/', async c => {
	const { page: page_, perpage } = c.get('reqBody');
	const page = Math.max(parseInt(page_ || '1') || 1, 1);
	const perPage = Math.max(1, Math.min(parseInt(perpage || '50') || 50, 50));
	return c.json({
		problems: (await c.env.db.prepare(`
			SELECT
				p.id, p.title, p.created_at,
				json_object (
					${userInfoDatas.map(scheme => `'${scheme}', u.${scheme}`).join()}
				) AS user
			FROM problem p
			JOIN users u ON u.id = p.uid
			ORDER BY p.id
			LIMIT ?
			OFFSET ?
		`).bind(perPage, (page - 1) * perPage).all<{ id: number, title: string, created_at: string, user: string }>()).results.map(({ user, ...data }) => ({ ...data, user: JSON.parse(user) })),
		total: (await c.env.db.prepare('SELECT COUNT(*) AS total FROM problem').bind().first<{ total: number }>())!.total
	});
});
app.get('/:id{\\d+}', async c => {
	const { id } = c.req.param();
	const problem = await c.env.db.prepare(`
		SELECT
			p.id, p.title, p.content, p.created_at,
			json_object (
				${userInfoDatas.map(scheme => `'${scheme}', u.${scheme}`).join()}
			) AS user
		FROM problem p
		JOIN users u ON u.id = p.uid
		WHERE p.id = ?
	`).bind(id).first<{ id: number, title: string, content: string, created_at: string, user: string }>();
	if (!problem) {
		return notFound(c);
	}
	return c.json({ success: true, problem: { ...problem, user: JSON.parse(problem.user) } });
});
app.post('/', async c => {
	const currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	const { title, content } = c.get('reqBody');
	if (!title || !content) {
		return missingParams(c);
	}
	return c.json({ success: true, id: (await c.env.db.prepare('INSERT INTO problem (uid, title, content) VALUES (?, ?, ?) RETURNING id').bind(currentUser.id, title, content).first<{ id: number }>())?.id });
});
app.put('/:id{\\d+}', async c => {
	const currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	const { title, content } = c.get('reqBody');
	if (!title || !content) {
		return missingParams(c);
	}
	const { uid } = await c.env.db.prepare('SELECT uid FROM problem WHERE id = ?').bind(c.req.param('id')).first<{ uid: number }>() || {};
	if (!uid) {
		return notFound(c);
	}
	if (currentUser.id !== uid && currentUser.id !== 1) {
		return accessDenied(c);
	}
	await c.env.db.prepare('UPDATE problem SET title = ?, content = ? WHERE id = ?').bind(title, content, c.req.param('id')).run();
	return c.json({ success: true });
});
app.delete('/:id{\\d+}', async c => {
	const currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	const { uid } = await c.env.db.prepare('SELECT uid FROM problem WHERE id = ?').bind(c.req.param('id')).first<{ uid: number }>() || {};
	if (!uid) {
		return notFound(c);
	}
	if (currentUser.id !== uid && currentUser.id !== 1) {
		return accessDenied(c);
	}
	await c.env.db.prepare('DELETE FROM problem WHERE id = ?').bind(c.req.param('id')).run();
	return c.json({ success: true });
});
export default app;