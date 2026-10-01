import { Hono } from "hono";
import { type AppEnv, type ContextType } from "../types";
import { raw } from "hono/html";
import { alreadyLoggedIn, loginRequired, notFound } from "./errorPages";
import { Card } from "../components/card";
import { Form, FormCheckbox, FormInput } from "../components/form";
import { User, getDisplayUsername, userQuery } from "../components/user";
import { Time } from "../components/time";
import { Pages } from "../components/pages";
import { MdInit } from "../components/mdeditor";
import { Feed } from "../components/feed";
import { renderTemplate } from "../components/renderTemplate";
import { TicketStatus } from "../components/ticketStatus";
import { permissionAdmin, permissionCount, type allPermissions } from "../settings";
import { translations } from "../translations";
const app = new Hono<AppEnv>();
app.get('/register', c => {
	const translations = c.get('translations');
    if (c.get('currentUser')) {
        return alreadyLoggedIn(c);
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
                    'min-width': '400px',
                    display: 'flex',
                    'flex-direction': 'column',
                    'align-items': 'center',
                    position: 'relative'
                }}>
                    <link rel='stylesheet' type='text/css' href='/user/register.css' />
                    <h1>{translations.user.register}</h1>
                    <Form action='/api/user/register' method='post' id='registerForm'>
						<ul id='namechecklist'>
							<li><i class='fa-solid fa-xmark check-failed' id='namecheck-length'></i>{translations.user.registerUsernameLength}</li>
							<li><i class='fa-solid fa-check check-success' id='namecheck-used'></i>{translations.user.registerUsernameExists}</li>
						</ul>
						<FormInput id='name' name='name' label={translations.userInfo.username} type='text' oninput='checkname()' autocomplete='username' required />
						<FormInput id='password' name='password' label={translations.userInfo.password} type='password' autocomplete='new-password' required />
						<FormInput id='confirmPassword' name='confirmPassword' label={translations.user.confirmPassword} type='password' autocomplete='new-password' required />
						<input type='submit' value={translations.user.register} />
					</Form>
                    <p>{raw(translations.user.registerToLogin)}</p>
                    <script src='/user/register.js'></script>
                </Card>
            </div>
        </div>,
        { title: translations.user.register }
    );
});
app.get('/login', c => {
    if (c.get('currentUser')) {
        return alreadyLoggedIn(c);
    }
	const translations = c.get('translations');
    return c.render(
        <div style={{
            display: 'grid',
            'place-items': 'center',
            'min-height': '100vh'
        }}>
            <Card style={{
                'min-width': '400px',
                display: 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                position: 'relative'
            }}>
                <h1>{translations.user.login}</h1>
                <Form action='/api/user/login' method='post'>
					<FormInput id='name' name='name' label={translations.userInfo.username} type='text' autocomplete='username' required />
					<FormInput id='password' name='password' label={translations.userInfo.password} type='password' autocomplete='current-password' required />
					<input type='submit' value={translations.user.login} />
				</Form>
                <p>{raw(translations.user.loginToRegister)}</p>
            </Card>
        </div>,
        { title: translations.user.login }
    );
});
app.get('/settings', async c => {
    const translations = c.get('translations'), currentUser = c.get('currentUser'), currentEmail = c.get('currentUserEmail');
    if (!currentUser) {
        return loginRequired(c);
    }
    return c.render(
        <>
            <Card style={{ display: 'flex', 'justify-content': 'center' }}><h1>{translations.user.settings.name}</h1></Card>
            <div style={{ display: 'flex', gap: '10px', 'justify-content': 'center' }}>
                <Card style={{
                    display: 'inline-flex',
                    'flex-direction': 'column',
                    'align-items': 'center',
                    width: '300px'
                }}>
                    <h2>{translations.user.settings.general.name}</h2>
                    <button onclick='Notification.requestPermission()'>{translations.user.settings.general.enableBrowserNotification}</button>
                    <Form action='/api/user/general-settings' method='post'>
						<FormInput id='nameColorLight' name='nameColorLight' label={translations.user.settings.general.ChangeNameColorLight} type='color' value={'#' + currentUser.name_color_light} required />
						<FormInput id='nameColorDark' name='nameColorDark' label={translations.user.settings.general.ChangeNameColorDark} type='color' value={'#' + currentUser.name_color_dark} required />
						{((currentUser.permission & permissionAdmin) ? <FormInput id='tag' name='tag' label={translations.user.tag} type='text' value={currentUser.tag || ''} /> : null)}
						<input type='submit' value={translations.save} />
					</Form>
                </Card>
                <Card style={{
                    display: 'inline-flex',
                    'flex-direction': 'column',
                    'align-items': 'center',
                    width: '300px'
                }}>
                    <h2>{translations.user.settings.changePassword.name}</h2>
                    <Form action='/api/user/change-password' method='post' id='changePassword'>
						<FormInput id='oldPassword' name='old' label={translations.user.settings.changePassword.old} type='password' autocomplete='current-password' required />
						<FormInput id='newPassword' name='new' label={translations.user.settings.changePassword.new} type='password' autocomplete='new-password' required />
						<FormInput id='confirmPassword' name='confirm' label={translations.user.settings.changePassword.confirm} type='password' autocomplete='new-password' required />
						<input type='submit' value={translations.user.settings.changePassword.name} />
					</Form>
                </Card>
                <Card style={{
                    display: 'inline-flex',
                    'flex-direction': 'column',
                    'align-items': 'center',
                    width: '300px'
                }}>
                    <h2>{translations.user.settings.changeUsername.name}</h2>
                    <Form action='/api/user/change-username' method='post'>
						<FormInput id='password' name='password' label={translations.userInfo.password} type='password' autocomplete='current-password' required />
						<FormInput id='name' name='name' label={translations.userInfo.username} type='text' autocomplete='username' required />
						<input type='submit' value={translations.save} />
					</Form>
                </Card>
                <Card style={{
                    display: 'inline-flex',
                    'flex-direction': 'column',
                    'align-items': 'center',
                    width: '300px'
                }}>
                    <h2>{translations.user.settings.changeEmail.name}</h2>
                    <p>{currentEmail
                        ? translations.user.settings.changeEmail.current.replace('__EMAIL__', currentEmail)
                        : translations.user.settings.changeEmail.currentUnset
                    }</p>
                    <Form action='/api/user/change-email' method='post'>
						<FormInput id='password' name='password' label={translations.userInfo.password} type='password' autocomplete='current-password' required />
						<FormInput id='email' name='email' label={translations.userInfo.email} type='email' autocomplete='email' required />
						<input type='submit' value={translations.next} />
					</Form>
                </Card>
            </div>
            <script src='/user/settings.js'></script>
        </>,
        { title: translations.user.settings.name }
    );
});
const isANotificationType = (type: string): type is keyof typeof translations.en.user.notification.types => {
	return type in translations.en.user.notification.types;
}
export const notificationContent = (c: ContextType, type: string, payload: any) => {
	const translations = c.get('translations');
	if (isANotificationType(type)) {
		return renderTemplate(translations.user.notification.types[type], {
			'feed-reply': {
                __USER__: <User c={c} user={payload.uid} />,
                __FEED__: <a href={'/feed/' + payload.id}>{translations.feed}</a>,
                __TARGET__: <a href={'/feed/' + payload.parent_id}>{translations.user.notification.yourFeed}</a>
            },
			'discussion-reply-replied': {
                __USER__: <User c={c} user={payload.uid} />,
                __DISCUSSION__: <a href={'/discussion/' + payload.discussion_id}>{translations.discussion.name}</a>,
                __PARENT_REPLY__: payload.parent_id ? <a href={'/discussion/reply/' + payload.parent_id}>{translations.user.notification.yourReply}</a> : <>{translations.user.notification.yourDiscussion}</>,
                __REPLY__: <a href={'/discussion/reply/' + payload.id}>{translations.reply}</a>
            },
			'discussion-reply-deleted-by-discussion-owner': {
                __USER__: <User c={c} user={payload.uid} />,
                __DISCUSSION__: <a href={'/discussion/' + payload.discussion_id}>{translations.discussion.name}</a>,
                __REPLY_CREATED_AT__: <Time c={c} time={payload.reply_created_at} />,
                __REPLY_CONTENT__: payload.reply_content,
            },
			'ticket-reply-replied': {
                __USER__: <User c={c} user={payload.uid} />,
                __TICKET__: <a href={'/ticket/' + payload.ticket_id}>{translations.ticket.name}</a>,
                __PARENT_REPLY__: payload.parent_id ? <a href={'/ticket/reply/' + payload.parent_id}>{translations.user.notification.yourReply}</a> : <>{translations.user.notification.yourTicket}</>,
                __REPLY__: <a href={'/ticket/reply/' + payload.id}>{translations.reply}</a>
            },
			'ticket-reply-deleted-by-ticket-owner': {
                __USER__: <User c={c} user={payload.uid} />,
                __TICKET__: <a href={'/ticket/' + payload.ticket_id}>{translations.ticket.name}</a>,
                __REPLY_CREATED_AT__: <Time c={c} time={payload.reply_created_at} />,
                __REPLY_CONTENT__: payload.reply_content,
            },
			'ticket-status-changed': {
                __TICKET__: <a href={'/ticket/' + payload.ticket_id}>{translations.user.notification.yourTicket}</a>,
                __STATUS__: <TicketStatus c={c} status={payload.status} />
            },
			'permission-changed': {
				__COMMENT__: payload.comment || translations.noReason,
				__CHANGE_LIST__: Array.from({ length: permissionCount }, (_, i) => 1 << i)
					.filter(i => (payload.oldPermission ^ payload.newPermission) & i)
					.map((i, idx) => <li key={idx}>
						<span style={{ color: payload.newPermission & i ? '#52c41a' : '#e74c3c' }}>
							<i class={`fa-solid fa-user-${payload.newPermission & i ? 'plus' : 'minus'}`}></i>
							&nbsp;
							{payload.newPermission & i ? translations.permission.granted : translations.permission.revoked}
						</span>
						&nbsp;
						<code>{translations.permission[i as allPermissions]}</code>
						&nbsp;
						{translations.permission.name}
					</li>),
				__OPERATOR__: <User c={c} user={payload.operator} />
			},
			'name-violation': {
				__SET__: payload.newViolation ? translations.user.notification.nameViolationSet : translations.user.notification.nameViolationUnset,
				__OPERATOR__: <User c={c} user={payload.operator} />,
				__COMMENT__: payload.comment || translations.noReason
			},
			'warn': {
				__OPERATOR__: <User c={c} user={payload.operator} />,
				__COMMENT__: payload.comment || translations.noReason
			},
			'at': {
                __USER__: <User c={c} user={payload.uid} />,
                __LINK__: <a href={payload.link}>{translations.user.notification.atHere}</a>
            }
		}[type]);
	} else {
		return <>{translations.user.notification.unknownType}</>;
	}
};
app.get('/notification', async c => {
    const env = c.env as any, currentUser = c.get('currentUser'), translations = c.get('translations');
    if (!currentUser) {
        return loginRequired(c);
    }
    const perPage = 10;
    const currentPage = Math.max(1, parseInt(c.get('reqBody').page || '1') || 1);
    const { total } = await env.db.prepare('SELECT COUNT(*) as total FROM notification WHERE uid = ?').bind(currentUser.id).first();
    const totalPage = Math.max(1, Math.ceil(total / perPage));
    const { results } = (await env.db.prepare('SELECT id, type, read, payload, created_at FROM notification WHERE uid = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .bind(currentUser.id, perPage, (currentPage - 1) * perPage).all());
    return c.render(<>
        <Card style={{ position: 'relative' }}>
            <h1>{translations.user.notification.name}</h1>
            <Form action='/api/user/notification/read-all' method='post' style={{ margin: 0 }}>
                <button type='submit' style={{ position: 'absolute', right: '15px', top: '15px' }}>{translations.readStatus.markReadAll}</button>
            </Form>
        </Card>
        {results.length === 0 ? <Card><p>{translations.user.notification.nothing}</p></Card> : <></>}
        {await Promise.all(results.map(({ id, type, read, payload, created_at }: { id: number, type: string, read: number, payload: string, created_at: string }) => <Card style={{
            padding: '16px',
            'margin-bottom': '10px',
            ...(read ? {} : {
                'background-color': 'light-dark(lightblue, darkblue)',
                'border': 'solid 1px blue'
            })
        }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', gap: '10px' }}>
                <small>({read ? translations.readStatus.read : translations.readStatus.unread})</small>
                <Form method='post' action='/api/user/notification/read-status' style={{ margin: 0 }}>
                    <input type='hidden' name='id' value={id} />
                    <input type='hidden' name='read' value={read ? '0' : '1'} />
                    <button type='submit'>{read ? translations.readStatus.markUnread : translations.readStatus.markRead}</button>
                </Form>
            </div>
            <div style={{ margin: '12px 0' }}>{notificationContent(c, type, JSON.parse(payload))}</div>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                <Time c={c} time={created_at} />
            </div>
        </Card>))}
        <Pages c={c} currentPage={currentPage} totalPage={totalPage} />
    </>, { title: translations.user.notification.name });
});
app.get('/:uid{[1-9][0-9]*}', async c => {
    const currentUser = c.get('currentUser'), user = await userQuery(parseInt(c.req.param('uid')), c), translations = c.get('translations');
    if (user === null) {
        return notFound(c);
    }
    const displayName = getDisplayUsername(user, c);
    return c.render(
        <>
            <Card style={{ position: 'relative' }}>
                <h1><User user={user} c={c} /></h1>
                <table>
                    <tbody>
                        <tr><th>{translations.userInfo.uid}</th><td>{user.id}</td></tr>
                        <tr><th>{translations.userInfo.registeredAt}</th><td>{user.created_at}</td></tr>
                        <tr><th>{translations.feeds}</th><td><a href={`/user/${user.id}/feed`}>{translations.feeds}</a></td></tr>
                    </tbody>
                </table>
            </Card>
            {currentUser && (currentUser.permission & permissionAdmin) && (!(user.permission & permissionAdmin) || currentUser.id === 1) ? <>
				<Card>
					<Form action='/admin/user/warn' method='post'>
						<input name='uid' type='hidden' value={user.id.toString()} />
						<FormInput name='comment' type='text' required />
						<input type='submit' value={translations.warn} />
					</Form>
				</Card>
				<Card style={{ marginTop: '10px' }}>
					<Form action='/admin/user/name-violation' method='post'>
						<input type='hidden' name='uid' value={user.id.toString()} />
						<FormInput type='text' name='comment' required label={translations.reason} />
						<input type='submit' value={translations.user.toggleUsernameViolation} />
					</Form>
				</Card>
				<Card>
                    <Form action='/admin/user/permission/set' method='post'>
						<input type='hidden' name='uid' value={user.id.toString()} />
						<FormInput type='text' name='comment' label={translations.reason} required />
						{Array.from({ length: permissionCount }, (_, i) => i).map(x => 1 << x).filter(x => x !== permissionAdmin || currentUser.id === 1).map(permissionId => <FormCheckbox id={'permission-' + permissionId} name={'p' + permissionId} label={translations.permission[permissionId as allPermissions]} checked={!!(user.permission & permissionId)} />)}
						<input type='submit' value={translations.save} />
					</Form>
                </Card>
			</> : <></>}
        </>,
        { title: translations.user.profile.name.replace('__USERNAME__', displayName) }
    );
});
app.get('/:uid{[1-9][0-9]*}/feed', async c => {
    const uid = parseInt(c.req.param('uid')), env = c.env as any, translations = c.get('translations');
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
            <h1>{translations.user.profile.feed.replace('__USERNAME__', getDisplayUsername(user, c))}</h1>
        </Card>
        {await Promise.all((results || []).map(async ({ id }: { id: number }) => <Feed c={c} id={id} />))}
        <Pages c={c} currentPage={currentPage} totalPage={totalPage} />
    </>, { title: translations.user.profile.feed.replace('__USERNAME__', getDisplayUsername(user, c)) });
});
export default app;