import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { accessDenied, loginRequired, notFound } from "../errorPages";
import { userInfoDatas } from "./user";
import { problemBasicInfoDatas } from "./problem";

const app = new Hono<AppEnv>();
app.get('/', async c => {
	const { pid, uid, page: page_, perpage } = c.get('reqBody');
	const page = Math.max(parseInt(page_ || '1') || 1, 1);
	const perPage = Math.max(1, Math.min(parseInt(perpage || '20') || 20, 20));
	return c.json({
		success: true,
		list: (await c.env.db.prepare(`
			SELECT
				r.id, r.created_at, r.status, r.score, r.time_ms, r.lang,
				json_object ( ${userInfoDatas.map(scheme => `'${scheme}', u.${scheme}`)} ) AS user,
				json_object (
					${problemBasicInfoDatas.map(scheme => `'${scheme}', p.${scheme}`)},
					'user', json_object ( ${userInfoDatas.map(scheme => `'${scheme}', pu.${scheme}`)} )
				) AS problem
			FROM record r
			JOIN users u ON r.uid = u.id
			JOIN problem p ON r.pid = p.id
			JOIN users pu ON p.uid = pu.id
			WHERE (r.pid = ? OR ? = 1) AND (r.uid = ? OR ? = 1)
			ORDER BY r.created_at DESC
			LIMIT ?
			OFFSET ?
		`).bind(pid, !pid, uid, !uid, perPage, (page - 1) * perPage).all<{
			id: number;
			created_at: string;
			status: string;
			score: number;
			time_ms: number;
			lang: string;
			code_length: number;
			user: string;
			problem: string;
		}>()).results.map(({ user, problem, ...scheme }) => ({ user: JSON.parse(user), problem: JSON.parse(problem), ...scheme })),
		total: (await c.env.db.prepare('SELECT COUNT(*) AS total FROM record r WHERE (r.pid = ? OR ? = 1) AND (r.uid = ? OR ? = 1)').bind(pid, !pid, uid, !uid).first())?.total
	});
});
app.post('/:id{\\d+}/rejudge', async c => {
	const { id } = c.req.param(), currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (currentUser.id !== 1) {
		return accessDenied(c);
	}
	const record = await c.env.db.prepare(`
		UPDATE record
		SET status = 'Waiting', score = NULL, time_ms = NULL, detail = NULL
		WHERE id = ?
		RETURNING id
	`).bind(id).first<{ id: number }>();
	if (!record) {
		return notFound(c);
	}
	await c.env.queue.send({ type: 'judge-record', recordId: record.id });
	return c.json({ success: true });
});
export default app;