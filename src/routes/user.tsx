import { Hono } from "hono";
import { type AppEnv } from "../types";
import { getText } from "../translations";
import { html, raw } from "hono/html";
import { errorHTML, loginRequired, notFound } from "./errorPages";
import { Card } from "../components/card";
import { createSubmitHandler, Form } from "../components/form";
import { User, getDisplayUsername, userQuery } from "../components/user";
import { Time } from "../components/time";
import { Pages } from "../components/pages";
import { MdInit } from "../components/mdeditor";
import { Feed } from "../components/feed";
import { renderTemplate } from "../components/renderTemplate";
import { TicketStatus } from "../components/ticketStatus";
import { permissionAdmin, permissionCount } from "../settings";
const app = new Hono<AppEnv>();
app.get('/register', c => {
	if (c.get('currentUser')) {
		return errorHTML(c, getText(c.get('locale'), 'alreadyLoggedIn'));
	}
	return c.render(
		<div style={{
			display: 'flex',
			'justify-content': 'center',
			'align-items': 'center',
			'min-height': '100vh'
		}}>
			<div style={{
				display: 'flex',
				'flex-wrap': 'wrap',
				gap: '20px'
			}}>
				<Card style={{
					'min-width': '300px',
					display: 'flex',
					'flex-direction': 'column',
					'align-items': 'center',
					position: 'relative'
				}}>
					<link rel='stylesheet' type='text/css' href='/user/register.css' />
					<h1>{getText(c.get('locale'), 'register')}</h1>
					<Form action='/api/user/register' method='post' onsubmit='return checkpassword()' inputs={[
						{ id: 'name', name: 'name', label: getText(c.get('locale'), 'username'), main: { type: 'input', inputType: 'text', oninput: 'checkname()', autocomplete: 'username' }, required: true },
						{ id: 'password', name: 'password', label: getText(c.get('locale'), 'password'), main: { type: 'input', inputType: 'password', autocomplete: 'new-password' }, required: true },
						{ id: 'confirmPassword', label: getText(c.get('locale'), 'confirmPassword'), main: { type: 'input', inputType: 'password', autocomplete: 'new-password' }, required: true }
					]} submit={{ content: getText(c.get('locale'), 'register') }} />
					<p>{raw(getText(c.get('locale'), 'registerToLogin'))}</p>
					{html`<script>const passwordNotMatchText = '${getText(c.get('locale'), 'passwordNotMatch')}';</script>`}
					<script src='/user/register.js'></script>
				</Card>
				<Card style={{ 'max-width': '400px' }}>
					<ul id='namechecklist'>
						<li><i class='fa-solid fa-xmark check-failed' id='namecheck-length'></i>{getText(c.get('locale'), 'registerUsernameLength')}</li>
						<li><i class='fa-solid fa-check check-success' id='namecheck-consist'></i>{raw(getText(c.get('locale'), 'registerUsernameFormat'))}</li>
						<li><i class='fa-solid fa-check check-success' id='namecheck-start'></i>{getText(c.get('locale'), 'registerUsernameStartWithNumber')}</li>
						<li><i class='fa-solid fa-check check-success' id='namecheck-used'></i>{getText(c.get('locale'), 'registerUsernameExists')}</li>
					</ul>
				</Card>
			</div>
		</div>,
		{ title: getText(c.get('locale'), 'register') }
	);
});
app.get('/login', c => {
	if (c.get('currentUser')) {
		return errorHTML(c, getText(c.get('locale'), 'alreadyLoggedIn'));
	}
	return c.render(
		<div style={{
			display: 'grid',
			'place-items': 'center',
			'min-height': '100vh'
		}}>
			<Card style={{
				'min-width': '300px',
				display: 'flex',
				'flex-direction': 'column',
				'align-items': 'center',
				position: 'relative'
			}}>
				<h1>{getText(c.get('locale'), 'login')}</h1>
				<Form action='/api/user/login' method='post' inputs={[
					{ id: 'name', name: 'name', label: getText(c.get('locale'), 'username'), main: { type: 'input', inputType: 'text', autocomplete: 'username' } , required: true },
					{ id: 'password', name: 'password', label: getText(c.get('locale'), 'password'), main: { type: 'input', inputType: 'password', autocomplete: 'current-password' } , required: true }
				]} submit={{ content: getText(c.get('locale'), 'login') }} />
				<p>{raw(getText(c.get('locale'), 'loginToRegister'))}</p>
			</Card>
		</div>,
		{ title: getText(c.get('locale'), 'login') }
	);
});
app.get('/settings', async c => {
	const locale = c.get('locale'), currentUser = c.get('currentUser'), currentEmail = c.get('currentUserEmail');
	if (!currentUser) {
		return loginRequired(c);
	}
	return c.render(
		<>
			{html`<script>const __PASSWORD_DOES_NOT_MATCH__ = '${getText(c.get('locale'), 'userSettingsChangePasswordDoesNotMatch')}';</script>`}
			{html`<script>const __CHANGE_PASSWORD_CONFIRM__ = '${getText(c.get('locale'), 'userSettingsChangePasswordChangeConfirm')}';</script>`}
			<Card style={{ display: 'flex', 'justify-content': 'center' }}><h1>{getText(locale, 'userSettings')}</h1></Card>
			<div style={{ display: 'flex', gap: '10px', 'justify-content': 'center' }}>
				<Card style={{
					display: 'inline-flex',
					'flex-direction': 'column',
					'align-items': 'center',
					width: '300px'
				}}>
					<h2>{getText(locale, 'userSettingsChangeNameColor')}</h2>
					<Form action='/api/user/change-name-color' method='post' inputs={[
						{ id: 'nameColorLight', name: 'light', label: getText(locale, 'userSettingsChangeNameColorLight'), main: { type: 'input', inputType: 'color', value: '#' + currentUser.name_color_light }, required: true },
						{ id: 'nameColorDark', name: 'dark', label: getText(locale, 'userSettingsChangeNameColorDark'), main: { type: 'input', inputType: 'color', value: '#' + currentUser.name_color_dark }, required: true }
					]} submit={{ content: getText(locale, 'save') }} />
				</Card>
				<Card style={{
					display: 'inline-flex',
					'flex-direction': 'column',
					'align-items': 'center',
					width: '300px'
				}}>
					<h2>{getText(locale, 'userSettingsChangePassword')}</h2>
					<Form action='/api/user/change-password' method='post' onsubmit='return checkChangePassword()' inputs={[
						{ id: 'oldPassword', name: 'old', label: getText(locale, 'userSettingsChangePasswordOld'), main: { type: 'input', inputType: 'password', autocomplete: 'current-password' }, required: true },
						{ id: 'newPassword', name: 'new', label: getText(locale, 'userSettingsChangePasswordNew'), main: { type: 'input', inputType: 'password', autocomplete: 'new-password' }, required: true },
						{ id: 'confirmPassword', label: getText(locale, 'userSettingsChangePasswordConfirm'), main: { type: 'input', inputType: 'password', autocomplete: 'new-password' }, required: true }
					]} submit={{ content: getText(locale, 'userSettingsChangePassword') }} />
				</Card>
				<Card style={{
					display: 'inline-flex',
					'flex-direction': 'column',
					'align-items': 'center',
					width: '300px'
				}}>
					<h2>{getText(locale, 'userSettingsChangeUsername')}</h2>
					<p>{getText(locale, 'userSettingsChangeUsernameCurrent').replace('__USERNAME__', currentUser.name)}</p>
					<Form action='/api/user/change-username' method='post' inputs={[
						{ id: 'password', name: 'password', label: getText(locale, 'password'), main: { type: 'input', inputType: 'password', autocomplete: 'current-password' }, required: true },
						{ id: 'name', name: 'name', label: getText(locale, 'username'), main: { type: 'input', inputType: 'text', autocomplete: 'username' }, required: true }
					]} submit={{ content: getText(locale, 'save') }} />
				</Card>
				<Card style={{
					display: 'inline-flex',
					'flex-direction': 'column',
					'align-items': 'center',
					width: '300px'
				}}>
					<h2>{getText(locale, 'userSettingsChangeEmail')}</h2>
					<p>{currentEmail
						? getText(locale, 'userSettingsChangeEmailCurrent').replace('__EMAIL__', currentEmail)
						: getText(locale, 'userSettingsChangeEmailCurrentUnset')
					}</p>
					<Form action='/api/user/change-email' method='post' inputs={[
						{ id: 'password', name: 'password', label: getText(c.get('locale'), 'password'), main: { type: 'input', inputType: 'password', autocomplete: 'current-password' }, required: true },
						{ id: 'email', name: 'email', label: getText(locale, 'email'), main: { type: 'input', inputType: 'email', autocomplete: 'email' }, required: true }
					]} submit={{ content: getText(locale, 'next') }} />
				</Card>
			</div>
			<script src='/user/settings.js'></script>
		</>,
		{ title: getText(locale, 'userSettings') }
	);
});
app.get('/notification', async c => {
	const env = c.env as any, currentUser = c.get('currentUser'), locale = c.get('locale');
	if (!currentUser) {
		return loginRequired(c);
	}
	const perPage = 10;
	const currentPage = Math.max(1, parseInt(c.get('reqBody').page || '1') || 1);
	const { total } = await env.db.prepare('SELECT COUNT(*) as total FROM notification WHERE uid = ?').bind(currentUser.id).first();
	const totalPage = Math.max(1, Math.ceil(total / perPage));
	const { results } = (await env.db.prepare('SELECT id, type, read, payload, created_at FROM notification WHERE uid = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
		.bind(currentUser.id, perPage, (currentPage - 1) * perPage).all());
	const notificationContent = (type: string, payload: any) => {
		switch (type) {
			case 'feed-reply':
				return renderTemplate(getText(locale, 'userNotificationFeedReply'), {
					__USER__: <User c={c} user={payload.uid} />,
					__FEED__: <a href={'/feed/' + payload.id}>{getText(locale, 'feed')}</a>,
					__TARGET__: <a href={'/feed/' + payload.parent_id}>{getText(locale, 'userNotificationYourFeed')}</a>
				});
			case 'discussion-reply-replied':
				return renderTemplate(getText(locale, 'userNotificationDiscussionReplyReplied'), {
					__USER__: <User c={c} user={payload.uid} />,
					__DISCUSSION__: <a href={'/discussion/' + payload.discussion_id}>{getText(locale, 'discussion')}</a>,
					__PARENT_REPLY__: payload.parent_id ? <a href={'/discussion/reply/' + payload.parent_id}>{getText(locale, 'userNotificationYourReply')}</a> : <>{getText(locale, 'userNotificationYourDiscussion')}</>,
					__REPLY__: <a href={'/discussion/reply/' + payload.id}>{getText(locale, 'reply')}</a>
				});
			case 'discussion-reply-deleted-by-discussion-owner':
				return renderTemplate(getText(locale, 'userNotificationDiscussionReplyDeletedByDiscussionOwner'), {
					__USER__: <User c={c} user={payload.uid} />,
					__DISCUSSION__: <a href={'/discussion/' + payload.discussion_id}>{getText(locale, 'discussion')}</a>,
					__REPLY_CREATED_AT__: <Time c={c} time={payload.reply_created_at} />,
					__REPLY_CONTENT__: payload.reply_content,
				});
			case 'ticket-reply-replied':
				return renderTemplate(getText(locale, 'userNotificationTicketReplyReplied'), {
					__USER__: <User c={c} user={payload.uid} />,
					__TICKET__: <a href={'/ticket/' + payload.ticket_id}>{getText(locale, 'ticket')}</a>,
					__PARENT_REPLY__: payload.parent_id ? <a href={'/ticket/reply/' + payload.parent_id}>{getText(locale, 'userNotificationYourReply')}</a> : <>{getText(locale, 'userNotificationYourTicket')}</>,
					__REPLY__: <a href={'/ticket/reply/' + payload.id}>{getText(locale, 'reply')}</a>
				});
			case 'ticket-reply-deleted-by-ticket-owner':
				return renderTemplate(getText(locale, 'userNotificationTicketReplyDeletedByTicketOwner'), {
					__USER__: <User c={c} user={payload.uid} />,
					__TICKET__: <a href={'/ticket/' + payload.ticket_id}>{getText(locale, 'ticket')}</a>,
					__REPLY_CREATED_AT__: <Time c={c} time={payload.reply_created_at} />,
					__REPLY_CONTENT__: payload.reply_content,
				});
			case 'ticket-status-changed':
				return renderTemplate(getText(locale, 'userNotificationTicketStatusChanged'), {
					__TICKET__: <a href={'/ticket/' + payload.ticket_id}>{getText(locale, 'userNotificationYourTicket')}</a>,
					__STATUS__: <TicketStatus c={c} status={payload.status} />
				});
			case 'permission-changed':
				return <>
					<p>{getText(locale, 'userNotificationPermissionChanged')}</p>
					<blockquote>{payload.comment}</blockquote>
					<ul>
						{Array.from({ length: permissionCount }, (_, i) => i).map(x => 1 << x).map(permissionId => (payload.oldPermission ^ payload.newPermission) & permissionId ? <li>
							{payload.newPermission & permissionId
								? <span style={{ color: 'green' }}>{getText(locale, 'permissionGot')}</span>
								: <span style={{ color: 'red' }}>{getText(locale, 'permissionLost')}</span>}
							&nbsp;
							<span style={{ 'border': 'solid 1px', 'border-radius': '5px', 'padding': '3px', 'background-color': '#77777777' }}>{getText(locale, 'permission' + permissionId)}</span>
						</li> : <></>)}
					</ul>
				</>;
			case 'at':
				return renderTemplate(getText(locale, 'userNotificationAt'), {
					__USER__: <User c={c} user={payload.uid} />,
					__LINK__: <a href={payload.link}>{getText(locale, 'userNotificationAtHere')}</a>
				});
			default:
				return <>{getText(locale, 'userNotificationUnknownType')}</>;
		}
	};
	return c.render(<>
		<Card style={{ position: 'relative' }}>
			<h1>{getText(locale, 'userNotification')}</h1>
			<form method='post' action='/api/user/notification/read-all' style={{ margin: 0 }} onsubmit={createSubmitHandler()}>
				<button type='submit' style={{ position: 'absolute', right: '15px', top: '15px' }}>{getText(locale, 'markReadAll')}</button>
			</form>
		</Card>
		{results.length === 0 ? <Card><p>{getText(locale, 'userNotificationNothing')}</p></Card> : <></>}
		{await Promise.all(results.map(({ id, type, read, payload, created_at }: { id: number, type: string, read: number, payload: string, created_at: string }) => <Card style={{
			padding: '16px',
			'margin-bottom': '10px',
			...(read ? {} : {
				'background-color': 'light-dark(lightblue, darkblue)',
				'border': 'solid 1px blue'
			})
		}}>
			<div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', gap: '10px' }}>
				<small>({getText(locale, read ? 'read' : 'unread')})</small>
				<form method='post' action='/api/user/notification/read-status' style={{ margin: 0 }} onsubmit={createSubmitHandler()}>
					<input type='hidden' name='id' value={id} />
					<input type='hidden' name='read' value={read ? '0' : '1'} />
					<button type='submit'>{getText(locale, read ? 'markUnread' : 'markRead')}</button>
				</form>
			</div>
			<div style={{ margin: '12px 0' }}>{notificationContent(type, JSON.parse(payload))}</div>
			<div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
				<Time c={c} time={created_at} />
			</div>
		</Card>))}
		<Pages c={c} currentPage={currentPage} totalPage={totalPage} />
	</>, { title: getText(locale, 'userNotification') });
});
app.get('/:uid{[1-9][0-9]*}', async c => {
	const currentUser = c.get('currentUser'), user = await userQuery(parseInt(c.req.param('uid')), c), locale = c.get('locale');
	if (user === null) {
		return notFound(c);
	}
	const displayName = getDisplayUsername(user, locale);
	return c.render(
		<>
			<Card style={{ position: 'relative' }}>
				<h1><User user={user} c={c} /></h1>
				<table>
					<tbody>
						<tr><th>{getText(locale, 'uid')}</th><td>{user.id}</td></tr>
						<tr><th>{getText(locale, 'registeredAt')}</th><td>{user.created_at}</td></tr>
						<tr><th>{getText(locale, 'feeds')}</th><td><a href={`/user/${user.id}/feed`}>{getText(locale, 'feeds')}</a></td></tr>
					</tbody>
				</table>
			</Card>
			{currentUser && (currentUser.permission & permissionAdmin) && (!(user.permission & permissionAdmin) || currentUser.id === 1) ? <><Card style={{ marginTop: '10px' }}>
				<Form action='/admin/user/name-violation' method='post' inputs={[
					{ id: 'username-violation-uid', name: 'uid', main: { type: 'input', inputType: 'hidden', value: user.id.toString() } }
				]} submit={{ content: getText(locale, 'toggleUsernameViolation') }} />
			</Card><Card>
				<Form action='/admin/user/permission/set' method='post' inputs={[
					{ id: 'user-permission-set-uid', name: 'uid', main: { type: 'input', inputType: 'hidden', value: user.id.toString() } },
					{ id: 'user-permission-comment', name: 'comment', label: getText(locale, 'reason'), main: { type: 'input', inputType: 'text' } },
					...Array.from({ length: permissionCount }, (_, i) => i).map(x => 1 << x).filter(x => x !== permissionAdmin || currentUser.id === 1).map(permissionId => ({
						id: 'permission-' + permissionId,
						name: 'p' + permissionId,
						label: getText(locale, 'permission' + permissionId),
						main: { type: 'input', inputType: 'checkbox', checked: !!(user.permission & permissionId) }
					} as { id: string, name: string, label: string, main: { type: 'input', inputType: 'checkbox', checked: boolean } }))
				]} submit={{ content: getText(locale, 'save') }} />
			</Card></> : <></>}
		</>,
		{ title: getText(locale, 'userProfile').replace('__USERNAME__', displayName) }
	);
});
app.get('/:uid{[1-9][0-9]*}/feed', async c => {
	const uid = parseInt(c.req.param('uid')), env = c.env as any, locale = c.get('locale');
	const user = await userQuery(uid, c);
	if (!user) {
		return notFound(c);
	}
	const perPage = 10;
	const currentPage = Math.max(1, parseInt(c.get('reqBody').page || '1') || 1);
	const { total } = await env.db.prepare('SELECT COUNT(*) as total FROM feed WHERE uid = ? AND parent_id = 0 AND deleted = 0').bind(uid).first();
	const totalPage = Math.ceil(total / perPage);
	const { results } = (await env.db.prepare('SELECT id FROM feed WHERE uid = ? AND parent_id = 0 AND deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?')
		.bind(uid, perPage, (currentPage - 1) * perPage).all());
	return c.render(<>
		<MdInit />
		<Card>
			<h1>{getText(locale, 'userFeed').replace('__USERNAME__', getDisplayUsername(user, locale))}</h1>
		</Card>
		{await Promise.all((results || []).map(async ({ id }: { id: number }) => <Feed c={c} id={id} />))}
		<Pages c={c} currentPage={currentPage} totalPage={totalPage} />
	</>, { title: getText(locale, 'userFeed').replace('__USERNAME__', getDisplayUsername(user, locale)) });
});
export default app;