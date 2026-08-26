import { Hono } from "hono";
import type { AppEnv } from "../types";
import { permissionAdmin, permissionCount } from "../settings";
import { accessDenied, notFound } from "./errorPages";
import { Card } from "../components/card";
import judgementRoutes from './admin/judgement';
import { getText } from "../translations";

const app = new Hono<AppEnv>();
app.use('/*', async (c, next) => {
    if (!c.get('currentUser') || !(c.get('currentUser')!.permission & permissionAdmin)) {
        return accessDenied(c);
    }
    await next();
});

app.route('/judgement', judgementRoutes);

app.get('/', c => c.render(<>
    <Card>
        <h1>Admin</h1>
        {c.get('currentUser')?.id === 1 ? <>
            <p><a href='/admin/init'>Init</a></p>
            <p><a href='https://dash.cloudflare.com/...'>Log</a></p>
            <p><a href='/admin/domain/cy3.cc.cd/renew'>Domain cy3.cc.cd Renew</a></p>
        </> : <></>}
        <p><a href='/admin/judgement'>{getText(c.get('locale'), 'adminJudgementTitle')}</a></p>
    </Card>
    <Card>
        <h2>Add a check-in type</h2>
        <form action='/admin/add-a-check-in-type' method='post'>
            <table>
                <thead>
                    <tr>
                        <th>Language</th>
                        <th>Title</th>
                        <th>Good Text</th>
                        <th>Bad Text</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>English</td>
                        <td><input type='text' name='title_en' /></td>
                        <td><input type='text' name='good_en' /></td>
                        <td><input type='text' name='bad_en' /></td>
                    </tr>
                    <tr>
                        <td>Chinese</td>
                        <td><input type='text' name='title_zh' /></td>
                        <td><input type='text' name='good_zh' /></td>
                        <td><input type='text' name='bad_zh' /></td>
                    </tr>
                </tbody>
            </table>
            <input type='submit' />
        </form>
    </Card>
</>, { title: 'Admin' }));

app.get('/init', async c => {
    const env: any = c.env;
    return c.render(<Card><p>Init Successfully.</p></Card>, { title: 'Init - Admin' });
});

app.get('/domain/cy3.cc.cd/renew', async c => {
    return c.render(
        <Card>
            <pre><code>{JSON.stringify(await (await fetch('https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=renew', {
                method: 'POST',
                headers: {
                    'X-API-Key': (c.env as any).DNSHE_API_KEY,
                    'X-API-Secret': (c.env as any).DNSHE_API_SECRET,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subdomain_id: (c.env as any).DNSHE_SUBDOMAIN_ID })
            })).json(), null, '\t')}</code></pre>
        </Card>,
        { title: 'Domain cy3.cc.cd Renew - Admin' }
    )
});

app.post('/user/name-violation', async c => {
    const reqBody = c.get('reqBody'), env = c.env as any;
    if (!Object.hasOwn(reqBody, 'uid')) {
        return notFound(c);
    }
    const uid = parseInt(reqBody.uid || '');
    if (uid === 1 || !await env.db.prepare('SELECT id FROM users WHERE id = ?').bind(uid).first()) {
        return notFound(c);
    }
    const { username_violation: oldViolation } = await env.db
        .prepare('SELECT username_violation FROM users WHERE id = ?')
        .bind(uid).first();
    const newViolation = oldViolation === 1 ? 0 : 1;
    await env.db
        .prepare('UPDATE users SET username_violation = ? WHERE id = ?')
        .bind(newViolation, uid).run();

    const comment = reqBody.comment?.trim() || getText(c.get('locale'), 'noReason');
    const payload = JSON.stringify({
        comment,
        oldViolation,
        newViolation,
        operator: c.get('currentUser')!.id
    });

    await env.db
        .prepare('INSERT INTO judgement (uid, type, payload, batch_id) VALUES (?, "name-violation", ?, NULL)')
        .bind(uid, payload).run();

    const typeLabel = newViolation === 1
        ? getText(c.get('locale'), 'violationSet')
        : getText(c.get('locale'), 'violationUnset');
    const notifPayload = JSON.stringify({
        comment,
        oldViolation,
        newViolation,
        operator: c.get('currentUser')!.id,
        typeLabel
    });
    await env.db
        .prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "name-violation", ?)')
        .bind(uid, notifPayload).run();

    return c.redirect('/user/' + uid, 303);
});

app.post('/user/permission/set', async c => {
    const reqBody = c.get('reqBody'), env = c.env as any;
    if (!Object.hasOwn(reqBody, 'uid')) {
        return notFound(c);
    }
    const uid = parseInt(reqBody.uid || '');
    if (uid === 1 || !await env.db.prepare('SELECT id FROM users WHERE id = ?').bind(uid).first()) {
        return notFound(c);
    }
    const { permission: oldPermission } = await env.db.prepare('SELECT permission FROM users WHERE id = ?').bind(uid).first();
    let newPermission = 0;
    for (let i = 1; i < (1 << permissionCount); i <<= 1) {
        if (c.get('currentUser')!.id !== 1 && i === permissionAdmin) {
            continue;
        }
        if (reqBody['p' + i]) {
            newPermission |= i;
        }
    }
    await env.db.prepare('UPDATE users SET permission = ? WHERE id = ?').bind(newPermission, uid).run();

    const payload = JSON.stringify({
        comment: reqBody.comment || getText(c.get('locale'), 'noReason'),
        oldPermission,
        newPermission
    });

    // 插入 judgement 表（公开记录）
    await env.db.prepare('INSERT INTO judgement (uid, type, payload, batch_id) VALUES (?, "permission-changed", ?, NULL)')
        .bind(uid, payload).run();

    // 插入 notification 表（用户通知）
    await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "permission-changed", ?)')
        .bind(uid, payload).run();

    return c.redirect('/user/' + uid, 303);
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
    return c.redirect('/discussion/' + discussion_id, 303);
});

app.post('/add-a-check-in-type', async c => {
    const env = c.env as any, { title_en, good_en, bad_en, title_zh, good_zh, bad_zh } = c.get('reqBody');
    await env.db.prepare(`INSERT INTO checkin_texts (title_en, good_en, bad_en, title_zh, good_zh, bad_zh) VALUES (?, ?, ?, ?, ?, ?)`).bind(title_en, good_en, bad_en, title_zh, good_zh, bad_zh).run();
    return c.redirect('/');
});

export default app;