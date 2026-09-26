import { Hono } from "hono";
import { type AppEnv } from "../../types";
import { Card } from "../../components/card";
import { Form } from "../../components/form";
import { User } from "../../components/user";
import { contentRequired, titleRequired } from "../errorPages";

const app = new Hono<AppEnv>();
app.get('/', async c => {
	const translations = c.get('translations'), env = c.env as any;
	return c.render(<Card>
		<h1>{translations.admin.ticketQuickReply.name}</h1>
		<table>
			<thead>
				<tr>
					<th>{translations.id}</th>
					<th>{translations.title}</th>
					<th>{translations.content}</th>
					<th>{translations.creator}</th>
				</tr>
			</thead>
			<tbody>
				{(await env.db.prepare('SELECT id, title, content, creator FROM ticket_quick_reply').all()).results
					.map(({ id, title, content, creator }: { id: number, title: string, content: string, creator: number }) => <tr>
						<td>{id}</td>
						<td>{title}</td>
						<td>{content}</td>
						<td><User c={c} user={creator} /></td>
					</tr>)}
			</tbody>
		</table>
		<details style={{ position: 'relative' }}>
			<summary>{translations.admin.ticketQuickReply.new}</summary>
			<Form action='/admin/ticket-quick-reply/new' method='post' inputs={[
				{ name: 'title', label: translations.title, required: true, main: { type: 'input', inputType: 'text' } },
				{ name: 'content', label: translations.content, required: true, main: { type: 'input', inputType: 'text' } }
			]} submit={{ content: translations.admin.ticketQuickReply.new }} />
		</details>
	</Card>, { title: translations.admin.ticketQuickReply.name });
});
app.post('/new', async c => {
	const { title, content } = c.get('reqBody'), env = c.env as any;
	if (!title) {
		return titleRequired(c);
	}
	if (!content) {
		return contentRequired(c);
	}
	await env.db.prepare('INSERT INTO ticket_quick_reply (title, content, creator) VALUES (?, ?, ?)').bind(title, content, c.get('currentUser')!.id).run();
	return c.redirect('/admin/ticket-quick-reply');
});
export default app;