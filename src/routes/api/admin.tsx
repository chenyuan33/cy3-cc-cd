import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { permissionAdmin, permissionCount } from "../../settings";
import { accessDenied, contentRequired, missingParams, notFound, titleRequired } from "../errorPages";
import { userInfoDatas } from "./user";

const app = new Hono<AppEnv>();
app.use('/*', async (c, next) => {
	if (!c.get('currentUser') || !(c.get('currentUser')!.permission & permissionAdmin)) {
		return accessDenied(c);
	}
	await next();
});
app.get('/domain-renew', async c => c.json(await (await fetch('https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=renew', {
	method: 'POST',
	headers: {
		'X-API-Key': c.env.DNSHE_API_KEY,
		'X-API-Secret': c.env.DNSHE_API_SECRET,
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({ subdomain_id: c.env.DNSHE_SUBDOMAIN_ID })
})).json()));
app.get('/check-in/list', async c => c.json((await c.env.db.prepare('SELECT * FROM checkin_texts').all()).results));
app.post('/check-in/add', async c => {
    const { title_en, good_en, bad_en, title_zh, good_zh, bad_zh } = c.get('reqBody');
    await c.env.db.prepare(`INSERT INTO checkin_texts (title_en, good_en, bad_en, title_zh, good_zh, bad_zh) VALUES (?, ?, ?, ?, ?, ?)`).bind(title_en, good_en, bad_en, title_zh, good_zh, bad_zh).run();
    return c.redirect('/');
});
app.get('/ticket-quick-reply/list', async c => c.json((await c.env.db.prepare(`
	SELECT
		t.id, t.title, t.content,
		json_object ( ${userInfoDatas.map(scheme => `'${scheme}', u.${scheme}`)} ) AS creator
	FROM ticket_quick_reply t
	JOIN users u ON t.creator = u.id
`).all<{ id: number, title: string, content: string, creator: string }>()).results.map(({ id, title, content, creator }) => ({ id, title, content, creator: JSON.parse(creator) }))));
app.post('/ticket-quick-reply/new', async c => {
	const { title, content } = c.get('reqBody');
	if (!title) {
		return titleRequired(c);
	}
	if (!content) {
		return contentRequired(c);
	}
	await c.env.db.prepare('INSERT INTO ticket_quick_reply (title, content, creator) VALUES (?, ?, ?)').bind(title, content, c.get('currentUser')!.id).run();
	return c.redirect('/admin/ticket-quick-reply');
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