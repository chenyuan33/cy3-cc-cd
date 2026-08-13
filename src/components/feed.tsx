import type { FC } from "hono/jsx";
import type { ContextType } from "../types";
import { Card } from "./card";
import { User } from "./user";
import { Time } from "./time";
import { getText } from "../translations";
import { html, raw } from "hono/html";
import { MdEditor, MdRender } from "./mdeditor";
import { enableEmailVerify } from "../settings";
import { createSubmitHandler } from "./form";
import { ReplyButton } from "./button";

export const Feed: FC<{ c: ContextType, id: number, recursionDepth?: number, repliesCount?: number, pathIds?: Set<number> }> = async ({ c, id, recursionDepth = 5, repliesCount = 5, pathIds = new Set<number>() }) => {
	if (pathIds.has(id) || recursionDepth <= 0 || !id) {
		return <></>;
	}
	const locale = c.get('locale'), currentUser = c.get('currentUser');
	const nextPathIds = new Set(pathIds);
	nextPathIds.add(id);
	const row = await (c.env as any).db.prepare('SELECT uid, content, created_at, deleted FROM feed WHERE id = ?').bind(id).first();
	if (!row || row.deleted) {
		return <></>;
	}
	const { uid, content, created_at } = row;
	return <Card>
		<User user={uid} c={c} />
		&nbsp;
		<Time c={c} time={created_at} />
		&nbsp;
		<div style={{ position: 'absolute', top: '10px', right: '10px' }}>
			<a href={'/feed/' + id}>{getText(locale, 'viewDetail')}</a>
			&nbsp;
			<ReplyButton c={c} onclick={`document.getElementById('feed-reply-${id}').dataset.vis *= -1`} />
			&nbsp;
			{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <>
				<button type='button' onclick={`document.getElementById('feed-edit-${id}').dataset.vis *= -1`}>{getText(locale, 'edit')}</button>
				&nbsp;
				<button class='dangerousButton' onclick={`confirm('${getText(locale, 'deleteConfirm')}') ? (fetch('/api/feed/delete', { method: 'POST', body: 'id=${id}' }).then(() => location.reload())) : undefined`}>{getText(locale, 'delete')}</button>
			</> : <></>}
		</div>
		<div><MdRender markdown={content} /></div>
		{currentUser && (currentUser.id === 1 || currentUser.id === uid) ? <form id={'feed-edit-' + id} data-vis='-1' method='post' action='/api/feed/edit' onsubmit={createSubmitHandler()}>
			<input type='hidden' name='id' value={id} />
			<MdEditor id={'feed-edit-editor-' + id} name='content' required height='100px' locale={c.get('locale')} initialCode={content} />
			<br />
			<button type='submit'>{getText(locale, 'save')}</button>
			<button type='button' onclick={`document.getElementById('feed-edit-${id}').dataset.vis='-1'`}>{getText(locale, 'cancel')}</button>
			{html`<style>#feed-edit-${id}[data-vis="-1"]{visibility:hidden;position:absolute;}#feed-edit-${id}[data-vis="1"]{visibility:visible;position:relative;}</style>`}
		</form> : <></>}
		{currentUser ? <form id={'feed-reply-' + id} data-vis='-1' method='post' action='/api/feed/reply' onsubmit={createSubmitHandler()}>
			<input type='hidden' name='parent_id' value={id} />
			<MdEditor id={'feed-reply-' + id} name='content' height='100px' locale={c.get('locale')} />
			<br />
			<button type='submit' disabled={!currentUser || enableEmailVerify && !c.get('currentUserEmail')}>{getText(locale, 'reply')}</button>
			{html`<style>#feed-reply-${id}[data-vis="-1"]{visibility:hidden;position:absolute;}#feed-reply-${id}[data-vis="1"]{visibility:visible;position:relative;}</style>`}
		</form> : <></>}
		{recursionDepth ? <FeedReplies c={c} id={id} recursionDepth={recursionDepth - 1} repliesCount={repliesCount} pathIds={nextPathIds} /> : <></>}
	</Card>;
};
const FeedReplies: FC<{ c: ContextType, id: number, recursionDepth?: number, repliesCount?: number, pathIds?: Set<number> }> = async ({ c, id, recursionDepth = 5, repliesCount = 5, pathIds = new Set<number>() }) => {
	if (recursionDepth <= 0) {
		return <></>;
	}
	const parentId = id, env: any = c.env;
	const rows = (await env.db.prepare('SELECT id FROM feed WHERE parent_id = ? AND deleted = 0 ORDER BY created_at DESC LIMIT ?')
		.bind(parentId, repliesCount).all()).results || [];
	return <>{await Promise.all(rows.map(async ({ id: childId }: { id: number }) => <Feed c={c} id={childId} recursionDepth={recursionDepth} repliesCount={repliesCount} pathIds={pathIds} />))}</>;
};