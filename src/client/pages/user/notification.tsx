import { Card } from "../../components/card";
import { Form } from "../../components/form";
import { Time } from "../../components/time";
import { Pages } from "../../components/pages";
import { TicketStatus } from "../../components/ticketStatus";
import { permissionCount, type allPermissions } from "../../../settings";
import { t, tString } from "../../i18n";
import { User } from "../../components/user";
import { useCurrentUser } from "../../utils/currentUser";
import { LoginRequired } from "../error";
import { useEffect, useRef, useState } from "hono/jsx";
import type { NotificationItem } from "../../../routes/api/user";
import { setTitle } from "../../utils/setTitle";
import { subscribeUrlChange } from "../../utils/urlSearch";
import { toast } from "../../components/toast";
import { A } from "../../components/a";
import { PermissionChangeList } from "../../components/permissionChangeList";

export const notificationContent = (notification: NotificationItem) => {
	switch (notification.type) {
		case 'feed-reply':
			return t('user.notification.types.feed-reply', {
				user: <User user={notification.payload.user} />,
				feed: <A href={'/feed/' + notification.payload.id}>{t('feed')}</A>,
				target: <A href={'/feed/' + notification.payload.parent_id}>{t('user.notification.yourFeed')}</A>
			});
		case 'discussion-reply-replied':
			return t('user.notification.types.discussion-reply-replied', {
				user: <User user={notification.payload.user} />,
				discussion: <A href={'/discussion/' + notification.payload.discussion_id}>{notification.payload.discussion_name}</A>,
				parentReply: notification.payload.parent_id ? <A href={'/discussion/reply/' + notification.payload.parent_id}>{t('user.notification.yourReply')}</A> : t('user.notification.yourDiscussion'),
				reply: <A href={'/discussion/reply/' + notification.payload.id}>{t('reply')}</A>
			});
		case 'ticket-reply-replied':
			return t('user.notification.types.ticket-reply-replied', {
				user: <User user={notification.payload.user} />,
				ticket: <A href={'/ticket/' + notification.payload.ticket_id}>{notification.payload.ticket_name}</A>,
				parentReply: notification.payload.parent_id ? <A href={'/ticket/reply/' + notification.payload.parent_id}>{t('user.notification.yourReply')}</A> : t('user.notification.yourTicket'),
				reply: <A href={'/ticket/reply/' + notification.payload.id}>{t('reply')}</A>
			});
		case 'ticket-status-changed':
			return t('user.notification.types.ticket-status-changed', {
				ticket: <A href={'/ticket/' + notification.payload.ticket_id}>{notification.payload.ticket_name}</A>,
				status: <TicketStatus status={notification.payload.status} />
			});
		case 'permission-changed':
			return t('user.notification.types.permission-changed', {
				comment: <blockquote>{notification.payload.comment || t('noReason')}</blockquote>,
				operator: <User user={notification.payload.operator} />,
				changeList: <PermissionChangeList oldPermission={notification.payload.oldPermission} newPermission={notification.payload.newPermission} />
			});
		case 'name-violation': 
			return t('user.notification.types.name-violation', {
				comment: <blockquote>{notification.payload.comment || t('noReason')}</blockquote>,
				operator: <User user={notification.payload.operator} />,
				set: notification.payload.newViolation ? t('usernameViolation.setted') : t('usernameViolation.unsetted')
			});
		case 'warn':
			return t('user.notification.types.warn', {
				comment: <blockquote>{notification.payload.comment || t('noReason')}</blockquote>,
				operator: <User user={notification.payload.operator} />
			});
		case 'at': 
			return t('user.notification.types.at', {
				user: <User user={notification.payload.user} />,
				link: <A href={notification.payload.link}>{t('user.notification.atHere')}</A>
			});
		default:
			return t('user.notification.types.unknown');
	}
};
export const UserNotification = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const searchParams = new URLSearchParams(search);
	const currentUser = useCurrentUser();
	if (!currentUser) {
		return <LoginRequired />;
	}
	const perPage = 20;
	const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
	const [data, setData] = useState<{
		results: NotificationItem[],
		total: number
	} | null>(null);
	const reload = async () => setData(await (await fetch(`/api/user/notification?page=${page}&perpage=${perPage}`)).json());
	useEffect(() => {
		if (localStorage.userNotificationAutoReadAll === '1') {
			fetch('/api/user/notification/read-all', { method: 'post' }).then(reload);
		} else {
			reload();
		}
	}, [page]);
	const autoReadAllCheckboxRef = useRef<HTMLInputElement>(null);
	if (!data) {
		return <Card style={{ position: 'relative' }}>
			<h1>{t('user.notification.name')}</h1>
			<input id='auto-read-all' type='checkbox' ref={autoReadAllCheckboxRef} checked={localStorage.userNotificationAutoReadAll === '1'} onChange={() => {
				if (autoReadAllCheckboxRef.current) {
					localStorage.userNotificationAutoReadAll = autoReadAllCheckboxRef.current.checked ? '1' : '0';
					fetch('/api/user/notification/read-all', { method: 'post' }).then(reload);
				}
			}} />
			<label for='auto-read-all'>{t('user.notification.autoReadAll')}</label>
			<Form action='/api/user/notification/read-all' method='post' style={{ margin: 0 }} onSuccess={() => {
				toast(t('operationSuccessful'), 'success');
				reload();
			}}>
				<button type='submit' style={{ position: 'absolute', right: '15px', top: '15px' }}>{t('readStatus.markReadAll')}</button>
			</Form>
			<p>{t('loading')}</p>
		</Card>;
	}
	setTitle(tString('user.notification.name'));
	return <>
		<Card style={{ position: 'relative' }}>
			<h1>{t('user.notification.name')}</h1>
			<input id='auto-read-all' type='checkbox' ref={autoReadAllCheckboxRef} checked={localStorage.userNotificationAutoReadAll === '1'} onChange={() => {
				if (autoReadAllCheckboxRef.current) {
					localStorage.userNotificationAutoReadAll = autoReadAllCheckboxRef.current.checked ? '1' : '0';
				}
			}} />
			<label for='auto-read-all'>{t('user.notification.autoReadAll')}</label>
			<Form action='/api/user/notification/read-all' method='post' style={{ margin: 0 }} onSuccess={() => {
				toast(t('operationSuccessful'), 'success');
				reload();
			}}>
				<button type='submit' style={{ position: 'absolute', right: '15px', top: '15px' }}>{t('readStatus.markReadAll')}</button>
			</Form>
		</Card>
		{data.results.length ? data.results.map(notification => <Card style={{
			padding: '16px',
			'margin-bottom': '10px',
			...(notification.read ? {} : {
				'background-color': 'light-dark(lightblue, darkblue)',
				'border': 'solid 1px blue'
			})
		}}>
			<div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', gap: '10px' }}>
				<small>({notification.read ? t('readStatus.read') : t('readStatus.unread')})</small>
				<Form method='post' action='/api/user/notification/read-status' style={{ margin: 0 }} onSuccess={() => {
					toast(t('operationSuccessful'), 'success');
					reload();
				}}>
					<input type='hidden' name='id' value={notification.id} />
					<input type='hidden' name='read' value={notification.read ? '0' : '1'} />
					<button type='submit'>{notification.read ? t('readStatus.markUnread') : t('readStatus.markRead')}</button>
				</Form>
			</div>
			<div style={{ margin: '12px 0' }}>{notificationContent(notification)}</div>
			<div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
				<Time time={notification.created_at} />
			</div>
		</Card>) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{t('user.notification.nothing')}</h2></Card>}
		<Pages currentPage={page} totalPage={Math.ceil(data.total / perPage)} />
	</>;
};