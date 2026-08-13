import { Hono } from "hono";
import type { AppEnv } from "../types";
import { notFound } from "./errorPages";
import { MdEditor, MdInit, MdRender } from "../components/mdeditor";
import { Card } from "../components/card";
import { getText } from "../translations";
import { Feed } from "../components/feed";
import { User } from "../components/user";
import { Time } from "../components/time";
import { html } from "hono/html";
import { Pages } from "../components/pages";
import { createSubmitHandler } from "../components/form";
import { PostButton, ReplyButton } from "../components/button";

const app = new Hono<AppEnv>();
app.get('/:feed_id{[1-9][0-9]*}?', async c => {
	const feed_id = parseInt(c.req.param('feed_id') || '0'), env = c.env as any, locale = c.get('locale'), currentUser = c.get('currentUser');
	let uid = 0, content = '', created_at = new Date().toISOString(), parent_id = 0;
	if (feed_id) {
		const feedRow = await env.db.prepare('SELECT uid, parent_id, content, created_at, deleted FROM feed WHERE id = ?').bind(feed_id).first();
		if (!feedRow || feedRow.deleted) {
			return notFound(c);
		}
		uid = feedRow.uid;
		content = feedRow.content;
		created_at = feedRow.created_at;
		parent_id = feedRow.parent_id;
	}
	const perPage = 10;
	const currentPage = Math.max(1, parseInt(c.get('reqBody').page || '1') || 1);
	const { total } = await env.db.prepare('SELECT COUNT(*) as total FROM feed WHERE parent_id = ? AND deleted = 0').bind(feed_id).first();
	const totalPage = Math.ceil(total / perPage);
	const { results } = (await env.db.prepare('SELECT id FROM feed WHERE parent_id = ? AND deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?')
		.bind(feed_id, perPage, (currentPage - 1) * perPage).all());
	return c.render(<>
		<MdInit />
		<Card>
			<h1>{getText(locale, 'feeds')}</h1>
			{feed_id ? <Card>
				{parent_id ? <Feed c={c} id={parent_id} recursionDepth={1} repliesCount={0} /> : <></>}
				<User user={uid} c={c} />
				&nbsp;
				<Time time={created_at} c={c} />
				&nbsp;
				{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <>
					<button type='button' onclick={`document.getElementById('feed-edit-${feed_id}').dataset.vis *= -1`}>{getText(locale, 'edit')}</button>
					&nbsp;
					<button class='dangerousButton' onclick={`confirm('${getText(locale, 'deleteConfirm')}') ? (fetch('/api/feed/delete', { method: 'POST', body: 'id=${feed_id}' }).then(() => location.href = '/feed')) : undefined`}>{getText(locale, 'delete')}</button>
				</> : <></>}
				<div><MdRender markdown={content} /></div>
				{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <form id={'feed-edit-' + feed_id} data-vis='-1' method='post' action='/api/feed/edit' onsubmit={createSubmitHandler()}>
					<input type='hidden' name='id' value={feed_id} />
					<MdEditor id={'feed-edit-editor-' + feed_id} name='content' required height='100px' locale={c.get('locale')} initialCode={content} />
					<br />
					<button type='submit'>{getText(locale, 'edit')}</button>
					<button type='button' onclick={`document.getElementById('feed-edit-${feed_id}').dataset.vis='-1'`}>{getText(locale, 'cancel')}</button>
					{html`<style>#feed-edit-${feed_id}[data-vis="-1"]{visibility:hidden;position:absolute;}#feed-edit-${feed_id}[data-vis="1"]{visibility:visible;position:relative;}</style>`}
				</form> : <></>}
			</Card> : <></>}
			<form action='/api/feed/reply' method='post' onsubmit={createSubmitHandler()}>
				<input type='hidden' name='parent_id' value={feed_id} />
				<MdEditor id='main-reply' name='content' required height='100px' locale={c.get('locale')} />
				<br />
				{feed_id ? <ReplyButton c={c} /> : <PostButton c={c} />}
			</form>
		</Card>
		{await Promise.all((results || []).map(async ({ id }: { id: number }) => <Feed c={c} id={id} />))}
		<Pages c={c} currentPage={currentPage} totalPage={totalPage} />
	</>, { title: getText(locale, 'feeds') });
});
export default app;