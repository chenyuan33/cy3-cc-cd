import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { permissionAdmin } from "../../settings";
import { accessDenied, notFound } from "../errorPages";

const app = new Hono<AppEnv>();
app.use('/*', async (c, next) => {
	if (!c.get('currentUser') || !(c.get('currentUser')!.permission & permissionAdmin)) {
		return accessDenied(c);
	}
	await next();
});
app.post('/discussion/set-pin', async c => {
    const { discussion_id, pin } = c.get('reqBody'), env = c.env as any;
    if (!discussion_id) {
        return notFound(c);
    }
    if (!await env.db.prepare('SELECT id FROM discussion WHERE id = ?').bind(discussion_id).first()) {
        return notFound(c);
    }
    await env.db.prepare('UPDATE discussion SET pin = ? WHERE id = ?').bind(pin, discussion_id).run();
    return c.json({ success: true });
});
export default app;