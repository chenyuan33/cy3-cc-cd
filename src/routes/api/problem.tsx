import { Hono } from "hono";
import type { AppEnv, userInfo } from "../../types";
import { userInfoDatas } from "./user";
import { accessDenied, loginRequired, missingParams, notFound } from "../errorPages";

export type ProblemBasicInfo = { id: number, title: string, created_at: string, user: userInfo };
export type ProblemInfo = ProblemBasicInfo & { content: string };
export const problemBasicInfoDatas = ['id', 'title', 'created_at'];
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
app.get('/:id{\\d+}/test-cases', async c => {
	const { id } = c.req.param(), currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	const problem = await c.env.db.prepare('SELECT uid FROM problem WHERE id = ?').bind(id).first<{ uid: number }>();
	if (!problem) {
		return notFound(c);
	}
	if (problem.uid !== currentUser.id) {
		return accessDenied(c);
	}
	return c.json({ success: true, test_cases: (await c.env.db.prepare('SELECT input, output FROM problem_testcases WHERE pid = ?').bind(id).all()).results });
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
app.post('/submit', async c => {
	const currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	const { pid, lang, code } = c.get('reqBody');
	if (!pid || !lang || !code) {
		return missingParams(c);
	}
	if (!await c.env.db.prepare('SELECT id FROM problem WHERE id = ?').bind(pid).first()) {
		return notFound(c);
	}
	const { id } = await c.env.db.prepare('INSERT INTO record (pid, uid, lang, code, status) VALUES (?, ?, ?, ?, \'Waiting\') RETURNING id').bind(pid, currentUser.id, lang, code).first<{ id: number }>() || {};
	await c.env.queue.send({ type: 'judge-record', recordId: id });
	return c.json({ success: true, id });
});
app.put('/:id{\\d+}', async c => {
	const currentUser = c.get('currentUser'), id = c.req.param('id');
	if (!currentUser) {
		return loginRequired(c);
	}
	const { title, content, testcases } = c.get('reqBody');
	if (!title || !content || !testcases) {
		return missingParams(c);
	}
	const test_cases = JSON.parse(testcases);
	if (!Array.isArray(test_cases) || !test_cases.every(val => typeof val === 'object' && typeof val.input === 'string' && typeof val.output === 'string')) {
		return missingParams(c);
	}
	const { uid } = await c.env.db.prepare('SELECT uid FROM problem WHERE id = ?').bind(id).first<{ uid: number }>() || {};
	if (!uid) {
		return notFound(c);
	}
	if (currentUser.id !== uid && currentUser.id !== 1) {
		return accessDenied(c);
	}
	await c.env.db.prepare('UPDATE problem SET title = ?, content = ? WHERE id = ?').bind(title, content, id).run();
	await c.env.db.prepare('DELETE FROM problem_testcases WHERE pid = ?').bind(id).run();
	const stmt = c.env.db.prepare('INSERT INTO problem_testcases (pid, input, output) VALUES (?, ?, ?)');
	await c.env.db.batch(test_cases.map(({ input, output }) => stmt.bind(id, input, output)));
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