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
import { PostButton, ReplyButton } from "../components/button";
import { discussionCategories } from "./api/discussion";

const app = new Hono<AppEnv>();
app.get('/', async c => {
	const category = c.get('reqBody').category, env = c.env as any;
	if (category && !(category in discussionCategories)) {
		return notFound(c);
	}
	const perPage = 20;
	const currentPage = Math.max(parseInt(c.get('reqBody').page || '1') || 1);
	const { total } = category
		? await env.db.prepare('SELECT COUNT(*) as total FROM discussion WHERE category = ?').bind(category).first()
		: await env.db.prepare('SELECT COUNT(*) as total FROM discussion').bind().first();
	const totalPage = Math.ceil(total / perPage);
	const { results } = category
		? await env.db.prepare('SELECT id, uid, category, title, created_at, pin FROM discussion WHERE category = ? ORDER BY pin DESC, created_at DESC LIMIT ? OFFSET ?').bind(category, perPage, perPage * (currentPage - 1)).all()
		: await env.db.prepare('SELECT id, uid, category, title, created_at, pin FROM discussion ORDER BY pin DESC, created_at DESC LIMIT ? OFFSET ?').bind(perPage, perPage * (currentPage - 1)).all();
	return c.render(<div style={{ display: 'flex', gap: '20px' }}>
		<Card style={{ width: '300px' }}>
			<h1>{getText(c.get('locale'), 'discussion')}</h1>
			<PostButton c={c} href={'/discussion/post' + (category ? '?category=' + category : '')} />
			<Form action='' method='get' inputs={[{
				id: 'category',
				name: 'category',
				label: getText(c.get('locale'), 'discussionCategory'),
				main: {
					type: 'select',
					options: [
						{ value: '', label: getText(c.get('locale'), 'allCategories'), selected: !category },
						...(Object.entries(discussionCategories).map(([key]) => ({ value: key, label: getText(c.get('locale'), 'discussionCategoryName_' + key), selected: category === key })))
					]
				}
			}]} submit={{ content: getText(c.get('locale'), 'filter') }} locale={c.get('locale')} />
		</Card>
		<div style={{ display: 'inline-block', flex: 1 }}>
			{results.length ? results.map(({ id, uid, category, title, created_at, pin }: { id: number, uid: number, category: string, title: string, created_at: string, pin: number }) => <Card>
				{pin ? <i class='fa-solid fa-thumbtack' style={{ color: 'red' }}></i> : <></>}
				<a href={'/discussion/' + id}>{title}</a><br />
				{renderTemplate(getText(c.get('locale'), 'discussionItemDescription'), {
					__USER__: <User c={c} user={uid} />,
					__CATEGORY__: <a href={`/discussion?category=${category}`}>{getText(c.get('locale'), 'discussionCategoryName_' + category)}</a>,
					__CREATED_AT__: <Time c={c} time={created_at} />
				})}
			</Card>) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{getText(c.get('locale'), 'discussionNothing')}</h2></Card>}
			<Pages c={c} currentPage={currentPage} totalPage={totalPage} />
		</div>
	</div>, { title: (category ? getText(c.get('locale'), 'discussionCategoryName_' + category) + ' - ' : '') + getText(c.get('locale'), 'discussion') });
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
		<h1>{getText(c.get('locale'), 'discussionPost')}</h1>
		<Form action='/api/discussion/post' method='post' inputs={[
			{
				id: 'category',
				name: 'category',
				label: getText(c.get('locale'), 'discussionCategory'),
				main: {
					type: 'select',
					optionGroups: [],
					options: Object.entries(discussionCategories).map(([key, check]) => ({ value: key, label: getText(c.get('locale'), 'discussionCategoryName_' + key), selected: category === key, disabled: !check(currentUser) }))
				}
			},
			{ id: 'title', name: 'title', label: getText(c.get('locale'), 'discussionTitle'), main: { type: 'input', inputType: 'text' }, required: true },
			{ id: 'content', name: 'content', label: getText(c.get('locale'), 'discussionContent'), main: { type: 'mdeditor' }, required: true }
		]} submit={{ content: getText(c.get('locale'), 'post') }} />
	</Card>, { title: getText(c.get('locale'), 'discussionPost') });
});
app.get('/:discussion_id{[1-9][0-9]*}', async c => {
	const env = c.env as any, currentUser = c.get('currentUser'), discussion_id = parseInt(c.req.param('discussion_id'));
	const { uid, category, title, content, created_at } = await env.db.prepare('SELECT uid, category, title, content, created_at FROM discussion WHERE id = ?').bind(c.req.param('discussion_id')).first();
	const perPage = 10;
	const currentPage = Math.max(1, parseInt(c.get('reqBody').page || '1') || 1);
	const { total } = await env.db.prepare('SELECT COUNT(*) as total FROM discussion_reply WHERE discussion_id = ?').bind(c.req.param('discussion_id')).first();
	const totalPage = Math.ceil(total / perPage);
	const { results } = await env.db.prepare('SELECT id, parent_id, uid, content, created_at FROM discussion_reply WHERE discussion_id = ? ORDER BY created_at LIMIT ? OFFSET ?')
		.bind(discussion_id, perPage, (currentPage - 1) * perPage).all();
	return c.render(<>
		<MdInit />
		<Card>
			<div style={{ position: 'absolute', right: '10px', top: '10px' }}>
				<ReplyButton c={c} onclick='document.getElementById("replying-blockquote").style.display="block";document.getElementById("replying-description").innerHTML=document.getElementById("discussion-description").innerHTML;document.getElementById("replying-content").innerHTML=document.getElementById("discussion-content").innerHTML;document.getElementById("parent_id").value="0";' />
				{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <>
					<button type='button' onclick={`document.getElementById('discussion-edit-${discussion_id}').dataset.vis *= -1`}>{getText(c.get('locale'), 'edit')}</button>
					&nbsp;
					<button class='dangerousButton' onclick={`confirm('${getText(c.get('locale'), 'deleteConfirm')}') ? (fetch('/api/discussion/delete', { method: 'POST', body: 'discussion_id=${discussion_id}' }).then(() => location.href = '/discussion')) : undefined`}>{getText(c.get('locale'), 'delete')}</button>
				</> : <></>}
			</div>
			<h1>{title}</h1>
			<p style={{ 'font-size': 'smaller', color: 'light-dark(gray, lightgray)' }} id='discussion-description'>{renderTemplate(getText(c.get('locale'), 'discussionItemDescription'), {
				__USER__: <User c={c} user={uid} />,
				__CATEGORY__: <a href={`/discussion?category=${category}`}>{getText(c.get('locale'), 'discussionCategoryName_' + category)}</a>,
				__CREATED_AT__: <Time c={c} time={created_at} />
			})}</p>
			<div id='discussion-content'><MdRender markdown={content} /></div>
			{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <form id={'discussion-edit-' + discussion_id} data-vis='-1' method='post' action='/api/discussion/edit' onsubmit={createSubmitHandler()}>
				<input type='hidden' name='discussion_id' value={discussion_id} />
				<label for={'discussion-title-' + discussion_id}><strong>{getText(c.get('locale'), 'discussionTitle')}</strong></label>
				&nbsp;
				<input id={'discussion-title-' + discussion_id} name='title' value={title} required />
				<br />
				<MdEditor id={'discussion-edit-editor-' + discussion_id} name='content' required height='200px' locale={c.get('locale')} initialCode={content} />
				<br />
				<button type='submit'>{getText(c.get('locale'), 'save')}</button>
				<button type='button' onclick={`document.getElementById('discussion-edit-${discussion_id}').dataset.vis='-1'`}>{getText(c.get('locale'), 'cancel')}</button>
				{html`<style>#discussion-edit-${discussion_id}[data-vis="-1"]{visibility:hidden;position:absolute;}#discussion-edit-${discussion_id}[data-vis="1"]{visibility:visible;position:relative;}</style>`}
			</form> : <></>}
		</Card>
		{currentUser && (currentUser.permission & permissionAdmin) ? <Card><Form action='/admin/discussion/set-pin' method='post' inputs={[
			{ id: 'setPinDiscussionId', name: 'discussion_id', main: { type: 'input', inputType: 'hidden', value: discussion_id.toString() } },
			{ id: 'setPin', name: 'pin', label: getText(c.get('locale'), 'setPin'), main: { type: 'input', inputType: 'number' } }
		]} submit={{ content: getText(c.get('locale'), 'save') }} /></Card> : <></>}
		<hr />
		{results.length ? await Promise.all(results.map(async ({ id, parent_id, uid, content, created_at }: { id: number, parent_id: number, uid: number, content: string, created_at: string }) => <Card>
			<div style={{ position: 'absolute', right: '10px', top: '10px' }}>
				<ReplyButton c={c} onclick={`document.getElementById("replying-blockquote").style.display="block";document.getElementById("replying-description").innerHTML=document.getElementById("discussion-reply${id}-description").innerHTML;document.getElementById("replying-content").innerHTML=document.getElementById("discussion-reply${id}-content").innerHTML;document.getElementById("parent_id").value=${id};`} />
				{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <>
					<button type='button' onclick={`document.getElementById('discussion-reply-edit-${id}').dataset.vis *= -1`}>{getText(c.get('locale'), 'edit')}</button>
					&nbsp;
					<button class='dangerousButton' onclick={`confirm('${getText(c.get('locale'), 'deleteConfirm')}') ? (fetch('/api/discussion/reply/delete', { method: 'POST', body: 'discussion_id=${c.req.param('discussion_id')}&reply_id=${id}' }).then(() => location.href = '/discussion/${c.req.param('discussion_id')}')) : undefined`}>{getText(c.get('locale'), 'delete')}</button>
				</> : <></>}
			</div>
			<p style={{ 'font-size': 'smaller', color: 'light-dark(gray, lightgray)' }} id={`discussion-reply${id}-description`}>{renderTemplate(getText(c.get('locale'), 'discussionReplyItemDescription'), {
				__USER__: <User c={c} user={uid} />,
				__CREATED_AT__: <Time c={c} time={created_at} />
			})}</p>
			{parent_id !== null ? (x => x ? (({ uid, content, created_at }: { uid: number, content: string, created_at: string }) => <blockquote>
				{getText(c.get('locale'), 'reply')}:&nbsp;
				<a href={parent_id ? `/discussion/reply/${parent_id}` : '#'}>{getText(c.get('locale'), 'viewDetail')}</a>
				<p style={{ 'font-size': 'smaller', color: 'light-dark(gray, lightgray)' }}>{renderTemplate(getText(c.get('locale'), 'discussionReplyItemDescription'), {
					__USER__: <User c={c} user={uid} />,
					__CREATED_AT__: <Time c={c} time={created_at} />
				})}</p>
				<div><MdRender markdown={content} /></div>
			</blockquote>)(x) : <blockquote>[{getText(c.get('locale'), 'deleted')}]</blockquote>)(await env.db.prepare(parent_id ? 'SELECT uid, content, created_at FROM discussion_reply WHERE id = ?' : 'SELECT uid, content, created_at FROM discussion WHERE id = ?').bind(parent_id || discussion_id).first()) : <></>}
			<div id={`discussion-reply${id}-content`}><MdRender markdown={content} /></div>
			{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <form id={'discussion-reply-edit-' + id} data-vis='-1' method='post' action='/api/discussion/reply/edit' onsubmit={createSubmitHandler()}>
				<input type='hidden' name='discussion_id' value={c.req.param('discussion_id')} />
				<input type='hidden' name='reply_id' value={id} />
				<MdEditor id={'discussion-reply-edit-editor-' + id} name='content' required height='100px' locale={c.get('locale')} initialCode={content} />
				<br />
				<button type='submit'>{getText(c.get('locale'), 'save')}</button>
				<button type='button' onclick={`document.getElementById('discussion-reply-edit-${id}').dataset.vis='-1'`}>{getText(c.get('locale'), 'cancel')}</button>
				{html`<style>#discussion-reply-edit-${id}[data-vis="-1"]{visibility:hidden;position:absolute;}#discussion-reply-edit-${id}[data-vis="1"]{visibility:visible;position:relative;}</style>`}
			</form> : <></>}
		</Card>)) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{getText(c.get('locale'), 'discussionNoReplies')}</h2></Card>}
		<Pages c={c} currentPage={currentPage} totalPage={totalPage} />
		<Card>
			<blockquote style={{ display: 'none', position: 'relative' }} id='replying-blockquote'>
				<i style={{ position: 'absolute', right: '10px', top: '10px' }} class='fa-solid fa-xmark' onclick='this.parentElement.style.display="none";document.getElementById("parent_id").value="";'></i>
				<p style={{ 'font-size': 'smaller', color: 'light-dark(gray, lightgray)' }} id='replying-description'></p>
				<div id='replying-content'></div>
			</blockquote>
			<Form action='/api/discussion/reply' method='post' inputs={[
				{ id: 'discussion_id', name: 'discussion_id', main: { type: 'input', inputType: 'hidden', value: c.req.param('discussion_id') } },
				{ id: 'parent_id', name: 'parent_id', main: { type: 'input', inputType: 'hidden', value: '' } },
				{ id: 'content', name: 'content', main: { type: 'mdeditor' }, required: true }
			]} submit={<ReplyButton c={c} />} />
		</Card>
	</>, { title: title + ' - ' + getText(c.get('locale'), 'discussionCategoryName_' + category) + ' - ' + getText(c.get('locale'), 'discussion') });
});
app.get('/reply/:reply_id{[1-9][0-9]*}', async c => {
	const env = c.env as any;
	const { discussion_id } = await env.db.prepare('SELECT discussion_id FROM discussion_reply WHERE id = ?').bind(c.req.param('reply_id')).first();
	if (!discussion_id) {
		return notFound(c);
	}
	return c.redirect(`/discussion/${discussion_id}?page=${Math.floor((await env.db.prepare('SELECT COUNT(*) as total FROM discussion_reply WHERE discussion_id = ? AND id < ?').bind(discussion_id, c.req.param('reply_id')).first()).total / 10) + 1}`, 303);
});
export default app;