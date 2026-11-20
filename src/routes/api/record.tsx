import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { accessDenied, loginRequired, notFound } from "../errorPages";

const app = new Hono<AppEnv>();
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