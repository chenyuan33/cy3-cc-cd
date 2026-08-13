import { Hono } from "hono";
import type { AppEnv } from "../types";
import { emailVerifyRequired, loginRequired, muted, notFound } from "./errorPages";
import { Card } from "../components/card";
import { getText } from "../translations";
import { createSubmitHandler, Form } from "../components/form";
import { renderTemplate } from "../components/renderTemplate";
import { User } from "../components/user";
import { Time } from "../components/time";
import { Pages } from "../components/pages";
import { enableEmailVerify, permissionAdmin, permissionSpeak } from "../settings";
import { MdEditor, MdInit, MdRender } from "../components/mdeditor";
import { html } from "hono/html";
import { ticketCategories, ticketStatus } from "./api/ticket";
import { TicketStatus } from "../components/ticketStatus";
import { PostButton, ReplyButton } from "../components/button";

const app = new Hono<AppEnv>();
app.get('/', async c => {
	const { category, status } = c.get('reqBody'), env = c.env as any;
	if (category && !ticketCategories.includes(category) || status && !ticketStatus.includes(status)) {
		return notFound(c);
	}
	const perPage = 20;
	const currentPage = Math.max(parseInt(c.get('reqBody').page || '1') || 1);
	const { total } = category
		? status
			? await env.db.prepare('SELECT COUNT(*) as total FROM ticket WHERE category = ? AND status = ?').bind(category, status).first()
			: await env.db.prepare('SELECT COUNT(*) as total FROM ticket WHERE category = ?').bind(category).first()
		: status
			? await env.db.prepare('SELECT COUNT(*) as total FROM ticket WHERE status = ?').bind(status).first()
			: await env.db.prepare('SELECT COUNT(*) as total FROM ticket').bind().first();
	const totalPage = Math.ceil(total / perPage);
	const { results } = category
		? status
			? await env.db.prepare('SELECT id, uid, assignee_uid, category, status, title, created_at FROM ticket WHERE category = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(category, status, perPage, perPage * (currentPage - 1)).all()
			: await env.db.prepare('SELECT id, uid, assignee_uid, category, status, title, created_at FROM ticket WHERE category = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(category, perPage, perPage * (currentPage - 1)).all()
		: status
			? await env.db.prepare('SELECT id, uid, assignee_uid, category, status, title, created_at FROM ticket WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(status, perPage, perPage * (currentPage - 1)).all()
			: await env.db.prepare('SELECT id, uid, assignee_uid, category, status, title, created_at FROM ticket ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(perPage, perPage * (currentPage - 1)).all();
	return c.render(<div style={{ display: 'flex', gap: '20px' }}>
		<Card style={{ width: '300px' }}>
			<h1>{getText(c.get('locale'), 'ticket')}</h1>
			<PostButton c={c} href={'/ticket/post' + (category ? '?category=' + category : '')} />
			<Form action='' method='get' inputs={[
				{
					id: 'category',
					name: 'category',
					label: getText(c.get('locale'), 'ticketCategory'),
					main: {
						type: 'select',
						optionGroups: [],
						options: [
							{ value: '', label: getText(c.get('locale'), 'allCategories'), selected: !category },
							...ticketCategories.map(categoryName => ({
								value: categoryName,
								label: getText(c.get('locale'), 'ticketCategoryName_' + categoryName),
								selected: category === categoryName
							}))
						]
					}
				},
				{
					id: 'status',
					name: 'status',
					label: getText(c.get('locale'), 'ticketStatus'),
					main: {
						type: 'select',
						optionGroups: [],
						options: [
							{ value: '', label: getText(c.get('locale'), 'allStatuses'), selected: !category },
							...ticketStatus.map(statusName => ({
								value: statusName,
								label: <TicketStatus c={c} status={statusName} />,
								selected: status === statusName
							}))
						]
					}
				}
			]} submit={{ content: getText(c.get('locale'), 'filter') }} locale={c.get('locale')} />
		</Card>
		<div style={{ display: 'inline-block', flex: 1 }}>
			{results.length ? results.map(({ id, uid, assignee_uid, category, status, title, created_at }: { id: number, uid: number, assignee_uid: number, category: string, status: string, title: string, created_at: string }) => <Card>
				<a href={'/ticket/' + id}>{title}</a><br />
				{renderTemplate(getText(c.get('locale'), 'ticketItemDescription'), {
					__USER__: <User c={c} user={uid} />,
					__ASSIGNEE__: assignee_uid ? <User c={c} user={assignee_uid} /> : getText(c.get('locale'), 'none'),
					__CATEGORY__: <a href={`/ticket?category=${category}`}>{getText(c.get('locale'), 'ticketCategoryName_' + category)}</a>,
					__CREATED_AT__: <Time c={c} time={created_at} />,
					__STATUS__: <TicketStatus c={c} status={status} />
				})}
			</Card>) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{getText(c.get('locale'), 'ticketNothing')}</h2></Card>}
			<Pages c={c} currentPage={currentPage} totalPage={totalPage} />
		</div>
	</div>, { title: (category ? getText(c.get('locale'), 'ticketCategoryName_' + category) + ' - ' : '') + getText(c.get('locale'), 'ticket') });
});
app.get('/post', c => {
	const currentUser = c.get('currentUser'), category = c.get('reqBody').category;
	if (!currentUser) {
		return loginRequired(c);
	}
	if (enableEmailVerify && !c.get('currentUserEmail')) {
		return emailVerifyRequired(c);
	}
	if (!(currentUser.permission & permissionSpeak)) {
		return muted(c);
	}
	return c.render(<Card>
		<MdInit />
		<h1>{getText(c.get('locale'), 'ticketPost')}</h1>
		<Form action='/api/ticket/post' method='post' inputs={[
			{
				id: 'category',
				name: 'category',
				label: getText(c.get('locale'), 'ticketCategory'),
				main: {
					type: 'select',
					options: ticketCategories.map(categoryName => ({
						value: categoryName,
						label: getText(c.get('locale'), 'ticketCategoryName_' + categoryName),
						selected: category === categoryName
					}))
				}
			},
			{ id: 'title', name: 'title', label: getText(c.get('locale'), 'ticketTitle'), main: { type: 'input', inputType: 'text' }, required: true },
			{ id: 'content', name: 'content', label: getText(c.get('locale'), 'ticketContent'), main: { type: 'mdeditor' }, required: true }
		]} submit={{ content: getText(c.get('locale'), 'post') }} />
	</Card>, { title: getText(c.get('locale'), 'ticketPost') });
});
app.get('/:ticket_id{[1-9][0-9]*}', async c => {
	const env = c.env as any, currentUser = c.get('currentUser'), ticket_id = parseInt(c.req.param('ticket_id'));
	const { uid, assignee_uid, category, title, content, status, created_at } = await env.db.prepare('SELECT uid, assignee_uid, category, title, content, status, created_at FROM ticket WHERE id = ?').bind(c.req.param('ticket_id')).first();
	const perPage = 10;
	const currentPage = Math.max(1, parseInt(c.get('reqBody').page || '1') || 1);
	const { total } = await env.db.prepare('SELECT COUNT(*) as total FROM ticket_reply WHERE ticket_id = ?').bind(c.req.param('ticket_id')).first();
	const totalPage = Math.ceil(total / perPage);
	const { results } = await env.db.prepare('SELECT id, parent_id, uid, content, set_status, set_assignee, created_at FROM ticket_reply WHERE ticket_id = ? ORDER BY created_at LIMIT ? OFFSET ?')
		.bind(ticket_id, perPage, (currentPage - 1) * perPage).all();
	const ticket_uid = uid;
	return c.render(<>
		<MdInit />
		<Card>
			<div style={{ position: 'absolute', right: '10px', top: '10px' }}>
				<ReplyButton c={c} onclick='document.getElementById("replying-blockquote").style.display="block";document.getElementById("replying-description").innerHTML=document.getElementById("ticket-description").innerHTML;document.getElementById("replying-content").innerHTML=document.getElementById("ticket-content").innerHTML;document.getElementById("parent_id").value="0";' />
				{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <>
					<button type='button' onclick={`document.getElementById('ticket-edit-${ticket_id}').dataset.vis *= -1`}>{getText(c.get('locale'), 'edit')}</button>
					&nbsp;
					{/* <button class='dangerousButton' onclick={`confirm('${getText(c.get('locale'), 'deleteConfirm')}') ? (fetch('/api/ticket/delete', { method: 'POST', body: 'ticket_id=${ticket_id}' }).then(() => location.href = '/ticket')) : undefined`}>{getText(c.get('locale'), 'delete')}</button> */}
				</> : <></>}
			</div>
			<h1>{title}</h1>
			<p style={{ 'font-size': 'smaller', color: 'light-dark(gray, lightgray)' }} id='ticket-description'>{renderTemplate(getText(c.get('locale'), 'ticketItemDescription'), {
				__USER__: <User c={c} user={uid} />,
				__ASSIGNEE__: assignee_uid ? <User c={c} user={assignee_uid} /> : getText(c.get('locale'), 'none'),
				__CATEGORY__: <a href={`/ticket?category=${category}`}>{getText(c.get('locale'), 'ticketCategoryName_' + category)}</a>,
				__CREATED_AT__: <Time c={c} time={created_at} />,
				__STATUS__: <TicketStatus c={c} status={status} />
			})}</p>
			<div id='ticket-content'><MdRender markdown={content} /></div>
			{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <form id={'ticket-edit-' + ticket_id} data-vis='-1' method='post' action='/api/ticket/edit' onsubmit={createSubmitHandler()}>
				<input type='hidden' name='ticket_id' value={ticket_id} />
				<label for={'ticket-title-' + ticket_id}><strong>{getText(c.get('locale'), 'ticketTitle')}</strong></label>
				&nbsp;
				<input id={'ticket-title-' + ticket_id} name='title' value={title} required />
				<br />
				<MdEditor id={'ticket-edit-editor-' + ticket_id} name='content' required height='200px' locale={c.get('locale')} initialCode={content} />
				<br />
				<button type='submit'>{getText(c.get('locale'), 'save')}</button>
				<button type='button' onclick={`document.getElementById('ticket-edit-${ticket_id}').dataset.vis='-1'`}>{getText(c.get('locale'), 'cancel')}</button>
				{html`<style>#ticket-edit-${ticket_id}[data-vis="-1"]{visibility:hidden;position:absolute;}#ticket-edit-${ticket_id}[data-vis="1"]{visibility:visible;position:relative;}</style>`}
			</form> : <></>}
		</Card>
		<hr />
		{results.length ? await Promise.all(results.map(async ({ id, parent_id, uid, content, set_status, set_assignee, created_at }: { id: number, parent_id: number, uid: number, content: string, set_status: string, set_assignee: number, created_at: string }) => <Card>
			<div style={{ position: 'absolute', right: '10px', top: '10px' }}>
				<ReplyButton c={c} onclick={`document.getElementById("replying-blockquote").style.display="block";document.getElementById("replying-description").innerHTML=document.getElementById("ticket-reply${id}-description").innerHTML;document.getElementById("replying-content").innerHTML=document.getElementById("ticket-reply${id}-content").innerHTML;document.getElementById("parent_id").value=${id};`} />
				{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <>
					<button type='button' onclick={`document.getElementById('ticket-reply-edit-${id}').dataset.vis *= -1`}>{getText(c.get('locale'), 'edit')}</button>
					&nbsp;
					<button class='dangerousButton' onclick={`confirm('${getText(c.get('locale'), 'deleteConfirm')}') ? (fetch('/api/ticket/reply/delete', { method: 'POST', body: 'ticket_id=${c.req.param('ticket_id')}&reply_id=${id}' }).then(() => location.href = '/ticket/${c.req.param('ticket_id')}')) : undefined`}>{getText(c.get('locale'), 'delete')}</button>
				</> : <></>}
			</div>
			<div style={{ 'font-size': 'smaller', color: 'light-dark(gray, lightgray)' }} id={`ticket-reply${id}-description`}>
				<p>{renderTemplate(getText(c.get('locale'), 'ticketReplyItemDescription'), {
					__USER__: <User c={c} user={uid} />,
					__CREATED_AT__: <Time c={c} time={created_at} />
				})}</p>
				{set_status ? <p>{renderTemplate(getText(c.get('locale'), 'ticketSetStatusTo'), { __STATUS__: <TicketStatus c={c} status={set_status} /> })}</p> : <></>}
				{set_assignee ? <p>{renderTemplate(getText(c.get('locale'), 'ticketSetAssigneeTo'), { __ASSIGNEE__: <User c={c} user={set_assignee} /> })}</p> : <></>}
			</div>
			{parent_id !== null ? (({ uid, content, set_status, set_assignee, created_at }: { uid: number, content: string, set_status: string, set_assignee: number, created_at: string }) => <blockquote>
				{getText(c.get('locale'), 'reply')}:&nbsp;
				<a href={parent_id ? `/ticket/reply/${parent_id}` : '#'}>{getText(c.get('locale'), 'viewDetail')}</a>
				<div style={{ 'font-size': 'smaller', color: 'light-dark(gray, lightgray)' }}>
					<p>{renderTemplate(getText(c.get('locale'), 'ticketReplyItemDescription'), {
						__USER__: <User c={c} user={uid} />,
						__CREATED_AT__: <Time c={c} time={created_at} />
					})}</p>
					{set_status ? <p>{renderTemplate(getText(c.get('locale'), 'ticketSetStatusTo'), { __STATUS__: <TicketStatus c={c} status={set_status} /> })}</p> : <></>}
					{set_assignee ? <p>{renderTemplate(getText(c.get('locale'), 'ticketSetAssigneeTo'), { __ASSIGNEE__: <User c={c} user={set_assignee} /> })}</p> : <></>}
				</div>
				<div><MdRender markdown={content} /></div>
			</blockquote>)(await env.db.prepare(parent_id ? 'SELECT uid, content, set_status, set_assignee, created_at FROM ticket_reply WHERE id = ?' : 'SELECT uid, content, created_at FROM ticket WHERE id = ?').bind(parent_id || ticket_id).first()) : <></>}
			<div id={`ticket-reply${id}-content`}><MdRender markdown={content} /></div>
			{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <form id={'ticket-reply-edit-' + id} data-vis='-1' method='post' action='/api/ticket/reply/edit' onsubmit={createSubmitHandler()}>
				<input type='hidden' name='ticket_id' value={c.req.param('ticket_id')} />
				<input type='hidden' name='reply_id' value={id} />
				<MdEditor id={'ticket-reply-edit-editor-' + id} name='content' required height='100px' locale={c.get('locale')} initialCode={content} />
				<br />
				<button type='submit'>{getText(c.get('locale'), 'save')}</button>
				<button type='button' onclick={`document.getElementById('ticket-reply-edit-${id}').dataset.vis='-1'`}>{getText(c.get('locale'), 'cancel')}</button>
				{html`<style>#ticket-reply-edit-${id}[data-vis="-1"]{visibility:hidden;position:absolute;}#ticket-reply-edit-${id}[data-vis="1"]{visibility:visible;position:relative;}</style>`}
			</form> : <></>}
		</Card>)) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{getText(c.get('locale'), 'ticketNoReplies')}</h2></Card>}
		<Pages c={c} currentPage={currentPage} totalPage={totalPage} />
		<Card>
			<blockquote style={{ display: 'none', position: 'relative' }} id='replying-blockquote'>
				<i style={{ position: 'absolute', right: '10px', top: '10px' }} class='fa-solid fa-xmark' onclick='this.parentElement.style.display="none";document.getElementById("parent_id").value="";'></i>
				<p style={{ 'font-size': 'smaller', color: 'light-dark(gray, lightgray)' }} id='replying-description'></p>
				<div id='replying-content'></div>
			</blockquote>
			<Form action='/api/ticket/reply' method='post' inputs={[
				{ id: 'ticket_id', name: 'ticket_id', main: { type: 'input', inputType: 'hidden', value: c.req.param('ticket_id') } },
				{ id: 'parent_id', name: 'parent_id', main: { type: 'input', inputType: 'hidden', value: '' } },
				{ id: 'content', name: 'content', main: { type: 'mdeditor' }, required: !currentUser || !(currentUser.permission & permissionAdmin) && (!assignee_uid || assignee_uid !== currentUser.id) },
				...(currentUser && ((currentUser.permission & permissionAdmin) || assignee_uid && assignee_uid === currentUser.id) ? [
					{ id: 'status', name: 'set_status', label: getText(c.get('locale'), 'ticketSetStatus'), main: { type: 'select', options: [
						{ value: '', label: getText(c.get('locale'), 'doNotModify'), selected: true },
						...ticketStatus.map(status => ({ value: status, label: <TicketStatus c={c} status={status} /> }))
					] } },
					{ id: 'set_assignee', name: 'set_assignee', label: getText(c.get('locale'), 'ticketSetAssignee'), main: { type: 'input', inputType: 'number' } }
				] as any : [])
			]} submit={<ReplyButton c={c} />} />
		</Card>
	</>, { title: title + ' - ' + getText(c.get('locale'), 'ticketCategoryName_' + category) + ' - ' + getText(c.get('locale'), 'ticket') });
});
app.get('/reply/:reply_id{[1-9][0-9]*}', async c => {
	const env = c.env as any;
	const { ticket_id } = await env.db.prepare('SELECT ticket_id FROM ticket_reply WHERE id = ?').bind(c.req.param('reply_id')).first();
	if (!ticket_id) {
		return notFound(c);
	}
	return c.redirect(`/ticket/${ticket_id}?page=${Math.floor((await env.db.prepare('SELECT COUNT(*) as total FROM ticket_reply WHERE ticket_id = ? AND id < ?').bind(ticket_id, c.req.param('reply_id')).first()).total / 10) + 1}`, 303);
});
export default app;

/**
 * Initial Code:
 * 	await env.db.prepare(`CREATE TABLE IF NOT EXISTS ticket (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uid INTEGER NOT NULL,
		assignee_uid INTEGER,
		category TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT "new",
		title TEXT NOT NULL,
		content TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (uid) REFERENCES users(id)
	);`).bind().run();
	await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_ticket_created_at ON ticket(created_at DESC);').bind().run();
	await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_ticket_uid_created_at ON ticket(uid, created_at DESC);').bind().run();
	await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_ticket_category_created_at ON ticket(category, created_at DESC);').bind().run();
	await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_ticket_uid_category_created_at ON ticket(uid, category, created_at DESC);').bind().run();
	await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_ticket_status_created_at ON ticket(status, created_at DESC);').bind().run();
	await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_ticket_status_uid_created_at ON ticket(status, uid, created_at DESC);').bind().run();
	await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_ticket_status_category_created_at ON ticket(status, category, created_at DESC);').bind().run();
	await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_ticket_status_uid_category_created_at ON ticket(status, uid, category, created_at DESC);').bind().run();
	await env.db.prepare(`CREATE TABLE IF NOT EXISTS ticket_reply (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		ticket_id INTEGER NOT NULL,
		parent_id INTEGER,
		uid INTEGER NOT NULL,
		content TEXT,
		set_status TEXT,
		set_assignee NUMBER,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (ticket_id) REFERENCES ticket(id),
		FOREIGN KEY (uid) REFERENCES users(id)
	);`).bind().run();
 */