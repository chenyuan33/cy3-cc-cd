import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { userInfoDatas, userQuery } from "./user";
import { accessDenied, loginRequired, notFound } from "../errorPages";
import { permissionChat } from "../../settings";

const app = new Hono<AppEnv>();
app.get('/', async c => {
	const env = c.env as any, { uid } = c.get('reqBody'), currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	const recent = (await env.db.prepare(`
		SELECT
			json_object ( ${userInfoDatas.map(scheme => `'${scheme}', u1.${scheme}`)} ) AS sender,
			json_object ( ${userInfoDatas.map(scheme => `'${scheme}', u2.${scheme}`)} ) AS receiver,
			p1.content, p1.created_at, p2.unread_count
		FROM private_messages p1
		JOIN users u1 ON u1.id = p1.sender
		JOIN users u2 ON u2.id = p1.receiver
		INNER JOIN (
			SELECT
				MAX(id) as latest_id,
				COUNT(
					CASE
						WHEN receiver = ? AND read = 0 THEN 1
						ELSE NULL
					END
				) as unread_count
			FROM private_messages
			WHERE sender = ? OR receiver = ?
			GROUP BY MIN(sender, receiver), MAX(sender, receiver)
		) p2 ON p1.id = p2.latest_id
		ORDER BY p1.created_at DESC
		LIMIT 50
	`).bind(currentUser.id, currentUser.id, currentUser.id).all()).results.map(({ sender, receiver, content, created_at, unread_count }: { sender: string, receiver: string, content: string, created_at: string, unread_count: number }) => ({ sender: JSON.parse(sender), receiver: JSON.parse(receiver), content, created_at, unread_count }));
	const user = uid ? await userQuery(parseInt(uid), c) : null;
	if (user) {
		await env.db.prepare('UPDATE private_messages SET read = 1 WHERE sender = ? AND receiver = ?').bind(uid, currentUser.id).run();
		return c.json({
			user,
			recent,
			messages: (await env.db.prepare(`
				SELECT
					json_object ( ${userInfoDatas.map(scheme => `'${scheme}', u.${scheme}`)} ) AS sender,
					p.content, p.read, p.created_at
				FROM private_messages p
				JOIN users u ON u.id = p.sender
				WHERE (p.sender = ? AND p.receiver = ?) OR (p.sender = ? AND p.receiver = ?)
				ORDER BY p.created_at DESC
				LIMIT 100
			`).bind(currentUser.id, user.id, user.id, currentUser.id).all()).results.map(({ sender, content, read, created_at }: { sender: string, content: string, read: number, created_at: string }) => ({ sender: JSON.parse(sender), content, read, created_at }))
		});
	} else {
		return c.json({ user, recent, messages: [] });
	}
});
app.post('/send', async c => {
    const env = c.env as any, currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!(currentUser.permission & permissionChat)) {
		return accessDenied(c);
	}
    if (!currentUser) {
        return loginRequired(c);
    }
    const { uid, content } = c.get('reqBody');
    if (!uid || !content) {
        return notFound(c);
    }
    await env.db.prepare('INSERT INTO private_messages (sender, receiver, content) VALUES (?, ?, ?)').bind(currentUser.id, uid, content).run();
    return c.json({ success: true });
});
export default app;