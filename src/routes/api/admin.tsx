import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { permissionAdmin, permissionCount } from "../../settings";
import { accessDenied, missingParams, notFound } from "../errorPages";

const app = new Hono<AppEnv>();
app.use('/*', async (c, next) => {
	if (!c.get('currentUser') || !(c.get('currentUser')!.permission & permissionAdmin)) {
		return accessDenied(c);
	}
	await next();
});
app.post('/user/warn', async c => {
	const reqBody = c.get('reqBody');
	if (!Object.hasOwn(reqBody, 'uid')) {
		return missingParams(c);
	}
	const uid = parseInt(reqBody.uid || '');
	if (uid === 1 || !await c.env.db.prepare('SELECT id FROM users WHERE id = ?').bind(uid).first()) {
		return notFound(c);
	}
	const payload = JSON.stringify({
		comment: reqBody.comment?.trim() || null,
		operator: c.get('currentUser')!.id
	});
	await c.env.db
		.prepare('INSERT INTO judgement (uid, type, payload, batch_id, comment, operator) VALUES (?, \'warn\', \'{}\', NULL, ?, ?)')
		.bind(uid, reqBody.comment?.trim() || null, c.get('currentUser')!.id).run();
	await c.env.db
		.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, \'warn\', ?)')
		.bind(uid, payload).run();
	return c.json({ success: true });
});
app.post('/user/name-violation', async c => {
    const reqBody = c.get('reqBody');
    if (!Object.hasOwn(reqBody, 'uid')) {
        return missingParams(c);
    }
    const uid = parseInt(reqBody.uid || '');
    if (uid === 1 || !await c.env.db.prepare('SELECT id FROM users WHERE id = ?').bind(uid).first()) {
        return notFound(c);
    }
    const { username_violation: oldViolation } = await c.env.db
        .prepare('SELECT username_violation FROM users WHERE id = ?')
        .bind(uid).first() as { username_violation: number };
    const newViolation = oldViolation === 1 ? 0 : 1;
    await c.env.db
        .prepare('UPDATE users SET username_violation = ? WHERE id = ?')
        .bind(newViolation, uid).run();
    await c.env.db
        .prepare('INSERT INTO judgement (uid, type, payload, batch_id, comment, operator) VALUES (?, \'name-violation\', ?, NULL, ?, ?)')
        .bind(uid, JSON.stringify({ oldViolation, newViolation }), reqBody.comment || '', c.get('currentUser')!.id).run();
    await c.env.db
        .prepare('INSERT INTO notification (uid, type, payload) VALUES (?, \'name-violation\', ?)')
        .bind(uid, JSON.stringify({
			comment: reqBody.comment?.trim() || null,
			oldViolation,
			newViolation,
			operator: c.get('currentUser')!.id
		})).run();
	return c.json({ success: true });
});
app.post('/user/permission-set', async c => {
    const reqBody = c.get('reqBody');
    if (!Object.hasOwn(reqBody, 'uid')) {
        return missingParams(c);
    }
    const uid = parseInt(reqBody.uid || '');
    if (uid === 1 || !await c.env.db.prepare('SELECT id FROM users WHERE id = ?').bind(uid).first()) {
        return notFound(c);
    }
    const { permission: oldPermission } = await c.env.db.prepare('SELECT permission FROM users WHERE id = ?').bind(uid).first() as { permission: number };
    let newPermission = 0;
    for (let i = 1; i < (1 << permissionCount); i <<= 1) {
        if (c.get('currentUser')!.id !== 1 && i === permissionAdmin) {
            continue;
        }
        if (reqBody['p' + i]) {
            newPermission |= i;
        }
    }
    await c.env.db.prepare('UPDATE users SET permission = ? WHERE id = ?').bind(newPermission, uid).run();
    await c.env.db.prepare('INSERT INTO judgement (uid, type, payload, batch_id, comment, operator) VALUES (?, \'permission-changed\', ?, NULL, ?, ?)')
        .bind(uid, JSON.stringify({ oldPermission, newPermission }), reqBody.comment || null, c.get('currentUser')!.id ).run();
    await c.env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, \'permission-changed\', ?)')
        .bind(uid, JSON.stringify({ comment: reqBody.comment || null, oldPermission, newPermission })).run();
	return c.json({ success: true });
});
app.post('/discussion/set-pin', async c => {
    const { discussion_id, pin } = c.get('reqBody');
    if (!discussion_id) {
        return notFound(c);
    }
    if (!await c.env.db.prepare('SELECT id FROM discussion WHERE id = ?').bind(discussion_id).first()) {
        return notFound(c);
    }
    await c.env.db.prepare('UPDATE discussion SET pin = ? WHERE id = ?').bind(pin, discussion_id).run();
    return c.json({ success: true });
});
export default app;