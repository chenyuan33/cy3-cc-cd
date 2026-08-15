import { Hono } from "hono";
import type { AppEnv } from "../types";
import { getText } from "../translations";
import { Card } from "../components/card";
import { loginRequired } from "./errorPages";
import { User } from "../components/user";
import { MdInit, MdRender } from "../components/mdeditor";
import { Time } from "../components/time";
import { Form } from "../components/form";

const app = new Hono<AppEnv>();
app.get('/', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, locale = c.get('locale'), { uid } = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (uid) {
		await env.db.prepare('UPDATE private_messages SET read = 1 WHERE sender = ? AND receiver = ?').bind(uid, currentUser.id).run();
	}
	const { results: recent } = await env.db.prepare(`
		SELECT
			p1.sender,
			p1.receiver,
			p1.content,
			p1.created_at,
			p2.unread_count
		FROM
			private_messages p1
		INNER JOIN (
			SELECT
				MAX(id) as latest_id,
				COUNT(
					CASE
						WHEN receiver = ? AND read = 0 THEN 1
						ELSE NULL
					END
				) as unread_count
			FROM
				private_messages
			WHERE
				sender = ? OR receiver = ?
			GROUP BY
				MIN(sender, receiver),
				MAX(sender, receiver)
		) p2 ON p1.id = p2.latest_id
		ORDER BY
			p1.created_at DESC
		LIMIT
			50
	`).bind(currentUser.id, currentUser.id, currentUser.id).all();
	return c.render(<Card style={{ position: 'fixed', top: '50px', bottom: '10px', left: '70px', right: '10px' }}>
		<MdInit />
		<h1>{getText(locale, 'privateMessage')}</h1>
		<div style={{ border: 'solid', 'border-radius': '10px', display: 'flex', position: 'absolute', top: '100px', bottom: '10px', left: '10px', right: '10px' }}>
			<div style={{ padding: '10px', 'border-right': 'solid 1px lightgray', position: 'relative', overflow: 'auto' }}>
				<h2>{getText(locale, 'privateMessageRecent')}</h2>
				<Form action='' method='get' inputs={[{ id: 'findUser', name: 'uid', main: { type: 'input', inputType: 'number', placeHolder: getText(locale, 'searchUsernameOrUid') } }]} submit={{ content: getText(locale, 'go') }} />
				{ recent.map(({
					sender,
					receiver,
					content,
					created_at,
					unread_count
				}: {
					sender: number,
					receiver: number,
					content: string,
					created_at: string,
					unread_count: number
				}) => <div style={{ 'border-top': 'solid 1px lightgray' }}>
					{unread_count ? <span style={{
						padding: '1px 5px',
						backgroundColor: 'red',
						color: 'white',
						borderRadius: '5px',
						fontSize: '10px'
					}}>{unread_count}</span> : <></>}
					<User c={c} user={sender === currentUser.id ? receiver : sender} />
					&nbsp;
					<span style={{ color: 'lightgray' }}>
						<Time c={c} time={created_at} />
						&nbsp;
						<a href={'?uid=' + (sender === currentUser.id ? receiver : sender)}>{getText(locale, 'go')}</a>
					</span>
					<MdRender markdown={content} />
				</div>) }
			</div>
			<div style={{ flex: 1, position: 'relative' }}>{
				uid ? <>
					<div style={{ borderBottom: 'solid 1px lightgray', display: 'flex', justifyContent: 'center' }}><User c={c} user={parseInt(uid)} /></div>
					<div style={{ position: 'absolute', top: '30px', bottom: '170px', left: 0, right: 0, overflow: 'auto' }}>{(await env
						.db
						.prepare('SELECT sender, content, read, created_at FROM private_messages WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?) ORDER BY created_at DESC LIMIT 100')
						.bind(currentUser.id, uid, uid, currentUser.id)
						.all())
						.results
						.reverse()
						.map(({
							sender,
							content,
							read,
							created_at
						}: {
							sender: number,
							content: string,
							read: number,
							created_at: string
						}) => <div>
							<User c={c} user={sender} />
							&nbsp;
							<span style={{ color: 'lightgray' }}><Time c={c} time={created_at} />&nbsp;{getText(locale, read ? 'read' : 'unread')}</span>
							<MdRender markdown={content} />
						</div>)
					}</div>
					<Form action='/api/private-message/send' method='post' inputs={[
						{ id: 'receiver', name: 'uid', main: { type: 'input', inputType: 'hidden', value: uid } },
						{ id: 'content', name: 'content', main: { type: 'mdeditor', mdeditorHeight: '100px' }, required: true }
					]} submit={{ content: getText(locale, 'send') }} style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px' }} />
				</> : <></>
			}</div>
		</div>
	</Card>, { title: getText(c.get('locale'), 'privateMessage') });
});
export default app;