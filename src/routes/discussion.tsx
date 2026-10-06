import { Hono } from "hono";
import type { AppEnv } from "../types";
import { notFound } from "./errorPages";

const app = new Hono<AppEnv>();
app.get('/reply/:reply_id{[1-9][0-9]*}', async c => {
	const env = c.env as any;
	const { discussion_id } = await env.db.prepare('SELECT discussion_id FROM discussion_reply WHERE id = ?').bind(c.req.param('reply_id')).first();
	if (!discussion_id) {
		return notFound(c);
	}
	return c.redirect(`/discussion/${discussion_id}?page=${Math.floor((await env.db.prepare('SELECT COUNT(*) as total FROM discussion_reply WHERE discussion_id = ? AND id < ?').bind(discussion_id, c.req.param('reply_id')).first()).total / 10) + 1}`, 303);
});
export default app;