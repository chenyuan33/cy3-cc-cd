import { Hono } from "hono";
import { type AppEnv, type ContextType } from "../types";
import { loginRequired } from "./errorPages";
import { Card } from "../client/components/card";
import { Form } from "../client/components/form";
import { Time } from "../client/components/time";
import { Pages } from "../client/components/pages";
import { renderTemplate } from "../components/renderTemplate";
import { TicketStatus } from "../client/components/ticketStatus";
import { permissionCount, type allPermissions } from "../settings";
import { messages } from "../i18n";
const translations = messages;
const app = new Hono<AppEnv>();
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
export default app;