import { Hono } from "hono";
import type { AppEnv } from "../types";
import { permissionAdmin, permissionCount } from "../settings";
import { accessDenied, missingParams, notFound } from "./errorPages";
import { Card } from "../client/components/card";
import judgementRoutes from './admin/judgement';
import ticketQuickReplyRoutes from './admin/ticketQuickReply';
import { Form } from "../client/components/form";

const app = new Hono<AppEnv>();
app.use('/*', async (c, next) => {
    if (!c.get('currentUser') || !(c.get('currentUser')!.permission & permissionAdmin)) {
        return accessDenied(c);
    }
    await next();
});

app.route('/judgement', judgementRoutes);
app.route('/ticket-quick-reply', ticketQuickReplyRoutes);

app.get('/', c => c.render(<>
    <Card>
        <h1>Admin</h1>
        {c.get('currentUser')?.id === 1 ? <p>
            <a href='/admin/domain/cy3.cc.cd/renew'>Domain cy3.cc.cd Renew</a>
        </p> : <></>}
        <p><a href='/admin/judgement'>{c.get('translations').admin.judgement.adminJudgementTitle}</a></p>
		<p><a href='/admin/ticket-quick-reply'>{c.get('translations').admin.ticketQuickReply.name}</a></p>
    </Card>
    <Card>
        <h2>Add a check-in type</h2>
        <Form action='/admin/add-a-check-in-type' method='post'>
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
        </Form>
    </Card>
</>, { title: 'Admin' }));

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

app.post('/add-a-check-in-type', async c => {
    const env = c.env as any, { title_en, good_en, bad_en, title_zh, good_zh, bad_zh } = c.get('reqBody');
    await env.db.prepare(`INSERT INTO checkin_texts (title_en, good_en, bad_en, title_zh, good_zh, bad_zh) VALUES (?, ?, ?, ?, ?, ?)`).bind(title_en, good_en, bad_en, title_zh, good_zh, bad_zh).run();
    return c.redirect('/');
});

export default app;