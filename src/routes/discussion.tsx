import { Hono } from "hono";
import type { AppEnv, userInfo } from "../types";
import { emailVerifyRequired, loginRequired, muted, notFound } from "./errorPages";
import { Card } from "../components/card";
import { Form, FormInput, FormMdEditor, FormSelect } from "../components/form";
import { renderTemplate } from "../components/renderTemplate";
import { User } from "../components/user";
import { Time } from "../components/time";
import { Pages } from "../components/pages";
import { enableEmailVerify, permissionAdmin, permissionSpeak } from "../settings";
import { MdInit, MdRender } from "../components/mdeditor";
import { html } from "hono/html";
import { DeleteButton, PostButton, ReplyButton } from "../components/button";
import { discussionCategories, inDiscussionCategory, type discussionCategoriesType } from "./api/discussion";

const app = new Hono<AppEnv>();
app.get('/', async c => {
	const category = c.get('reqBody').category, env = c.env as any, translations = c.get('translations');
	if (category !== undefined && category !== '' && !inDiscussionCategory(category)) {
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
			<h1>{translations.discussion.name}</h1>
			<PostButton c={c} href={'/discussion/post' + (category ? '?category=' + category : '')} />
			<Form action='' method='get'>
				<FormSelect id='category' name='category' label={translations.category} options={[
					{ value: '', label: translations.allCategories, selected: !category },
					...((Object.entries(discussionCategories) as [ discussionCategoriesType, (user: userInfo) => boolean ][]).map(([key]) => ({ value: key, label: translations.discussion.categoryName[key], selected: category === key })))
				]} />
				<input type='submit' value={translations.filter} />
			</Form>
		</Card>
		<div style={{ display: 'inline-block', flex: 1 }}>
			{results.length ? results.map(({ id, uid, category, title, created_at, pin }: { id: number, uid: number, category: discussionCategoriesType, title: string, created_at: string, pin: number }) => <Card>
				{pin ? <i class='fa-solid fa-thumbtack' style={{ color: 'red' }}></i> : <></>}
				<a href={'/discussion/' + id}>{title}</a><br />
				{renderTemplate(translations.discussion.itemDescription, {
					__USER__: <User c={c} user={uid} />,
					__CATEGORY__: <a href={`/discussion?category=${category}`}>{translations.discussion.categoryName[category]}</a>,
					__CREATED_AT__: <Time c={c} time={created_at} />
				})}
			</Card>) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{translations.nothing}</h2></Card>}
			<Pages c={c} currentPage={currentPage} totalPage={totalPage} />
		</div>
	</div>, { title: (category ? translations.discussion.categoryName[category] + ' - ' : '') + translations.discussion.name });
});
app.get('/post', c => {
	const currentUser = c.get('currentUser'), category = c.get('reqBody').category, translations = c.get('translations');
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
		<h1>{translations.discussion.post}</h1>
		<Form action='/api/discussion/post' method='post'>
			<FormSelect id='category' name='category' label={translations.category} options={
				(Object.entries(discussionCategories) as [ discussionCategoriesType, (user: userInfo) => boolean ][]).map(([key, check]) => ({ value: key, label: translations.discussion.categoryName[key], selected: category === key, disabled: !check(currentUser) }))
			} />
			<FormInput id='title' name='title' label={translations.title} required type='text' />
			<FormMdEditor id='content' name='content' label={translations.content} locale={c.get('locale')} required />
			<input type='submit' value={translations.discussion.post} />
		</Form>
	</Card>, { title: translations.discussion.post });
});
app.get('/:discussion_id{[1-9][0-9]*}', async c => {
	const env = c.env as any, currentUser = c.get('currentUser'), discussion_id = parseInt(c.req.param('discussion_id')), translations = c.get('translations');
	const discussion_info = await env.db.prepare('SELECT uid, category, title, content, created_at, pin FROM discussion WHERE id = ?').bind(c.req.param('discussion_id')).first();
	if (!discussion_info) {
		return notFound(c);
	}
	const { uid, category, title, content, created_at, pin }: { uid: number, category: discussionCategoriesType, title: string, content: string, created_at: string, pin: number } = discussion_info;
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
					<button type='button' onclick={`document.getElementById('discussion-edit-${discussion_id}').dataset.vis *= -1`}>{translations.edit}</button>
					&nbsp;
					<DeleteButton c={c} href='/api/discussion/delete' arg={{ discussion_id }} redirect='/discussion' />
				</> : <></>}
			</div>
			<h1>{pin ? <i class='fa-solid fa-thumbtack' style={{ color: 'gold' }}></i> : <></>}{title}</h1>
			<p style={{ 'font-size': 'smaller', color: 'light-dark(gray, lightgray)' }} id='discussion-description'>{renderTemplate(translations.discussion.itemDescription, {
				__USER__: <User c={c} user={uid} />,
				__CATEGORY__: <a href={`/discussion?category=${category}`}>{translations.discussion.categoryName[category]}</a>,
				__CREATED_AT__: <Time c={c} time={created_at} />
			})}</p>
			<div id='discussion-content'><MdRender markdown={content} c={c} /></div>
			{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <Form id={'discussion-edit-' + discussion_id} data-vis='-1' method='post' action='/api/discussion/edit'>
				<input type='hidden' name='discussion_id' value={discussion_id} />
				<FormInput type='text' id={'discussion-title-' + discussion_id} name='title' label={translations.title} value={title} required />
				<FormMdEditor id={'discussion-edit-editor-' + discussion_id} name='content' required height='200px' locale={c.get('locale')} initialCode={content} />
				<input type='submit' value={translations.save} />
				<input type='button' value={translations.cancel} onclick={`document.getElementById('discussion-edit-${discussion_id}').dataset.vis='-1'`} />
				{html`<style>#discussion-edit-${discussion_id}[data-vis="-1"]{visibility:hidden;position:absolute;}#discussion-edit-${discussion_id}[data-vis="1"]{visibility:visible;position:relative;}</style>`}
			</Form> : <></>}
		</Card>
		{currentUser && (currentUser.permission & permissionAdmin) ? <Card><Form action='/admin/discussion/set-pin' method='post'>
			<input type='hidden' name='discussion_id' value={discussion_id} />
			<FormInput id='setPin' name='pin' label={translations.setPin} type='number' />
			<input type='submit' value={translations.save} />
		</Form></Card> : <></>}
		<hr />
		{results.length ? await Promise.all(results.map(async ({ id, parent_id, uid, content, created_at }: { id: number, parent_id: number, uid: number, content: string, created_at: string }) => <Card>
			<div style={{ position: 'absolute', right: '10px', top: '10px' }}>
				<ReplyButton c={c} onclick={`document.getElementById("replying-blockquote").style.display="block";document.getElementById("replying-description").innerHTML=document.getElementById("discussion-reply${id}-description").innerHTML;document.getElementById("replying-content").innerHTML=document.getElementById("discussion-reply${id}-content").innerHTML;document.getElementById("parent_id").value=${id};`} />
				{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <>
					<button type='button' onclick={`document.getElementById('discussion-reply-edit-${id}').dataset.vis *= -1`}>{translations.edit}</button>
					&nbsp;
					<DeleteButton c={c} href='/api/discussion/reply/delete' arg={{ discussion_id: c.req.param('discussion_id'), reply_id: id }} redirect='' />
				</> : <></>}
			</div>
			<p style={{ 'font-size': 'smaller', color: 'light-dark(gray, lightgray)' }} id={`discussion-reply${id}-description`}>{renderTemplate(translations.discussion.replyItemDescription, {
				__USER__: <User c={c} user={uid} />,
				__CREATED_AT__: <Time c={c} time={created_at} />
			})}</p>
			{parent_id !== null ? (x => x ? (({ uid, content, created_at }: { uid: number, content: string, created_at: string }) => <blockquote>
				{translations.reply}:&nbsp;
				<a href={parent_id ? `/discussion/reply/${parent_id}` : '#'}>{translations.viewDetail}</a>
				<p style={{ 'font-size': 'smaller', color: 'light-dark(gray, lightgray)' }}>{renderTemplate(translations.discussion.replyItemDescription, {
					__USER__: <User c={c} user={uid} />,
					__CREATED_AT__: <Time c={c} time={created_at} />
				})}</p>
				<div><MdRender markdown={content} c={c} /></div>
			</blockquote>)(x) : <blockquote>[{translations.deleted}]</blockquote>)(await env.db.prepare(parent_id ? 'SELECT uid, content, created_at FROM discussion_reply WHERE id = ?' : 'SELECT uid, content, created_at FROM discussion WHERE id = ?').bind(parent_id || discussion_id).first()) : <></>}
			<div id={`discussion-reply${id}-content`}><MdRender markdown={content} c={c} /></div>
			{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <Form id={'discussion-reply-edit-' + id} data-vis='-1' method='post' action='/api/discussion/reply/edit'>
				<input type='hidden' name='discussion_id' value={c.req.param('discussion_id')} />
				<input type='hidden' name='reply_id' value={id} />
				<FormMdEditor id={'discussion-reply-edit-editor-' + id} name='content' required height='100px' locale={c.get('locale')} initialCode={content} />
				<br />
				<input type='submit' value={translations.save} />
				<input type='button' value={translations.cancel} onclick={`document.getElementById('discussion-reply-edit-${id}').dataset.vis='-1'`} />
				{html`<style>#discussion-reply-edit-${id}[data-vis="-1"]{visibility:hidden;position:absolute;}#discussion-reply-edit-${id}[data-vis="1"]{visibility:visible;position:relative;}</style>`}
			</Form> : <></>}
		</Card>)) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{translations.noReplies}</h2></Card>}
		<Pages c={c} currentPage={currentPage} totalPage={totalPage} />
		<Card>
			<blockquote style={{ display: 'none', position: 'relative' }} id='replying-blockquote'>
				<i style={{ position: 'absolute', right: '10px', top: '10px' }} class='fa-solid fa-xmark' onclick='this.parentElement.style.display="none";document.getElementById("parent_id").value="";'></i>
				<p style={{ 'font-size': 'smaller', color: 'light-dark(gray, lightgray)' }} id='replying-description'></p>
				<div id='replying-content'></div>
			</blockquote>
			<Form action='/api/discussion/reply' method='post'>
				<input type='hidden' name='discussion_id' value={c.req.param('discussion_id')} />
				<input type='hidden' name='parent_id' value='' id='parent_id' />
				<FormMdEditor id='reply-editor' name='content' required locale={c.get('locale')} />
				<ReplyButton c={c} />
			</Form>
		</Card>
	</>, { title: title + ' - ' + translations.discussion.categoryName[category] + ' - ' + translations.discussion.name });
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