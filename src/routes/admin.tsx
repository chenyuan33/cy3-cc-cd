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
// 挂载权限更新子路由
app.route('/judgement', judgementRoutes);
app.get('/', c => c.render(<>
	<Card>
		<h1>Admin</h1>
		{c.get('currentUser')?.id === 1 ? <>
			<p><a href='/admin/init'>Init</a></p>
			<p><a href='https://dash.cloudflare.com/5168c05171e882fb497107a7fe5d332e/workers/services/view/site/production/observability/events?filterCombination=%22and%22&calculations=%5B%7B%22operator%22%3A%22count%22%7D%5D&timeframe=24h&conditions=%7B%7D&conditionCombination=%22and%22&alertTiming=%7B%22interval%22%3A300%2C%22window%22%3A900%2C%22timeBeforeFiring%22%3A600%2C%22timeBeforeResolved%22%3A600%7D&orderBy=%7B%22value%22%3A%22count%22%2C%22limit%22%3A10%2C%22order%22%3A%22desc%22%7D&filters=%5B%7B%22key%22%3A%22customLog.logType%22%2C%22operation%22%3A%22eq%22%2C%22type%22%3A%22string%22%2C%22value%22%3A%22Custom+Log%22%7D%5D'>Log</a></p>
			<p><a href='/admin/domain/cy3.cc.cd/renew'>Domain cy3.cc.cd Renew</a></p>
		</> : <></>}
        <p><a href='/admin/judgement'>{getText(c.get('locale'), 'judgement')}</a></p>
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
	await env.db.prepare('UPDATE users SET username_violation = 1 - username_violation WHERE id = ?').bind(uid).run();
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
	for (let i = 1; i < (1 << permissionCount); i <<= 1)
	{
		if (c.get('currentUser')!.id !== 1 && i === permissionAdmin) {
			continue;
		}
		if (reqBody['p' + i]) {
			newPermission |= i;
		}
	}
	await env.db.prepare('UPDATE users SET permission = ? WHERE id = ?').bind(newPermission, uid).run();
	// 插入 judgement 表（用于公开显示）
    await env.db.prepare('INSERT INTO judgement (uid, type, payload) VALUES (?, "permission-changed", ?)')
        .bind(uid, JSON.stringify({ comment: reqBody.comment, oldPermission, newPermission }))
        .run();

    // 插入 notification 表（用于用户通知）
    await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "permission-changed", ?)')
        .bind(uid, JSON.stringify({ comment: reqBody.comment, oldPermission, newPermission }))
        .run();
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