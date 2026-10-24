import type { FC } from "hono/jsx";
import { Card } from "./card";
import { User } from "./user";
import { Time } from "./time";
import { html } from "hono/html";
import { MdRender } from "./md/renderer";
import { Form, FormMdEditor } from "./form";
import { DeleteButton, ReplyButton } from "./button";
import { t } from "../i18n";
import { useCurrentUser } from "../utils/currentUser";
import { A } from "./a";
import type { feedInfo } from "../../routes/api/feed";
import { setValueMdEditor } from "./md/editor";

export const Feed: FC<{ feed: feedInfo, reload: () => void | Promise<void>, showParent?: boolean }> = ({ feed, reload, showParent = false }) => {
	const currentUser = useCurrentUser();
	const { id, user, content, created_at, replies, parent } = feed;
	return <Card>
		<User user={user} />
		&nbsp;
		<Time time={created_at} />
		&nbsp;
		<div style={{ position: 'absolute', top: '10px', right: '10px' }}>
			<A href={'/feed/' + id}>{t('viewDetail')}</A>
			&nbsp;
			<ReplyButton onClick={() => document.getElementById('feed-reply-' + id)!.dataset.vis = (-document.getElementById('feed-reply-' + id)!.dataset.vis!).toString()} />
			&nbsp;
			{currentUser && (currentUser.id === 1 || currentUser.id === user.id) ? <>
				<button type='button' onClick={() => document.getElementById('feed-edit-' + id)!.dataset.vis = (-document.getElementById('feed-edit-' + id)!.dataset.vis!).toString()}>{t('edit')}</button>
				&nbsp;
				<DeleteButton href='/api/feed/delete' arg={{ id }} redirect='' onSuccess={reload} />
			</> : <></>}
		</div>
		{showParent && parent ? <blockquote>
			{t('replyTo')}
			<Feed feed={parent} reload={reload} />
		</blockquote> : null}
		<div><MdRender markdown={content} /></div>
		{currentUser && (currentUser.id === 1 || currentUser.id === user.id) ? <Form id={'feed-edit-' + id} data-vis='-1' method='post' action='/api/feed/edit' onSuccess={() => {
			document.getElementById('feed-edit-' + id)!.dataset.vis = '-1';
			reload();
		}}>
			<input type='hidden' name='id' value={id} />
			<FormMdEditor id={'feed-edit-editor-' + id} name='content' required height='100px' initialCode={content} />
			<br />
			<button type='submit'>{t('save')}</button>
			<button type='button' onClick={() => document.getElementById('feed-edit-' + id)!.dataset.vis = (-document.getElementById('feed-edit-' + id)!.dataset.vis!).toString()}>{t('cancel')}</button>
		</Form> : <></>}
		{currentUser ? <Form id={'feed-reply-' + id} data-vis='-1' method='post' action='/api/feed/reply' onSuccess={() => {
			setValueMdEditor('feed-reply-' + id, '');
			document.getElementById('feed-reply-' + id)!.dataset.vis = '-1';
			reload();
		}}>
			<input type='hidden' name='parent_id' value={id} />
			<FormMdEditor id={'feed-reply-' + id} name='content' height='100px' />
			<br />
			<ReplyButton />
		</Form> : <></>}
		{replies.map(feed => <Feed feed={feed} reload={reload} />)}
	</Card>;
};