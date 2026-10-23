import { useParams } from "@w3cj/ruta";
import { Card } from "../../components/card";
import { t, tString } from "../../i18n";
import { useCurrentUser } from "../../utils/currentUser";
import { setTitle } from "../../utils/setTitle";
import { useEffect, useRef, useState } from "hono/jsx";
import { ticketStatus, type ticketInfo, type ticketReplyInfo } from "../../../routes/api/ticket";
import { NotFound } from "../error";
import { subscribeUrlChange } from "../../utils/urlSearch";
import { DeleteButton, ReplyButton } from "../../components/button";
import { User } from "../../components/user";
import { A } from "../../components/a";
import { Time } from "../../components/time";
import { MdRender } from "../../components/md/renderer";
import { Form, FormInput, FormMdEditor, FormSelect, FormUserSearch } from "../../components/form";
import { permissionAdmin } from "../../../settings";
import { toast } from "../../components/toast";
import { Pages } from "../../components/pages";
import { TicketStatus } from "../../components/ticketStatus";
import { replaceSelectionMdEditor } from "../../components/md/editor";

export const TicketDetail = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const currentUser = useCurrentUser(), id = parseInt(useParams<'/ticket/:id'>().id), page = Math.max(1, parseInt(new URLSearchParams(search).get('page') || '1') || 1), perPage = 10;
	const [data, setData] = useState<{ exists: false } | {
		exists: true,
		info: ticketInfo,
		replyCount: number,
		replies: ticketReplyInfo[],
		quickReplies: { title: string, content: string }[]
	} | null>(null);
	let cancelled = false;
	const loadData = async () => {
		const data = await (await fetch(`/api/ticket/detail/${id}?page=${page}&perpage=${perPage}`)).json();
		if (!cancelled) {
			setData(data);
		}
	};
	useEffect(() => {
		loadData();
		return () => cancelled = true;
	}, [id, page]);
	const replyingBlockquoteRef = useRef<HTMLElement>(null);
	const [replyingDescription, setReplyingDescription] = useState<string | null>(null);
	const [replyingContent, setReplyingContent] = useState<string | null>(null);
	const ticketDescriptionRef = useRef<HTMLElement>(null);
	const ticketContentRef = useRef<HTMLElement>(null);
	const ticketEditRef = useRef<HTMLFormElement>(null);
	const repliesDescriptionRef = useRef(new Map<string, HTMLElement>());
	const repliesContentRef = useRef(new Map<string, HTMLElement>());
	const repliesEditRef = useRef(new Map<string, HTMLElement>());
	const replyFormParentIdRef = useRef<HTMLInputElement>(null);
	if (!data) {
		setTitle(tString('loading') + ' - ' + tString('ticket.name'));
		return <Card>{t('loading')}</Card>;
	}
	if (!data.exists) {
		return <NotFound />;
	}
	setTitle(data.info.title + ' - ' + tString(`ticket.categoryName.${data.info.category}`) + ' - ' + tString('ticket.name'));
	return <>
		<Card>
			<div style={{ position: 'absolute', right: '10px', top: '10px', display: 'flex', gap: '10px' }}>
				<ReplyButton onClick={() => {
					if (replyingBlockquoteRef.current
						&& ticketDescriptionRef.current
						&& ticketContentRef.current
						&& replyFormParentIdRef.current) {
						replyingBlockquoteRef.current.dataset.vis = '1';
						setReplyingDescription(ticketDescriptionRef.current.innerHTML);
						setReplyingContent(ticketContentRef.current.innerHTML);
						replyFormParentIdRef.current.value = '0';
					}
				}} />
				{currentUser && (currentUser.id === 1 || currentUser.id === data.info.user.id) && <>
					<button onClick={() => {
						if (ticketEditRef.current) {
							ticketEditRef.current.dataset.vis = (-(ticketEditRef.current.dataset.vis || -1)).toString();
						}
					}}>{t('edit')}</button>
				</>}
			</div>
			<h1>{data.info.title}</h1>
			<p class='description' ref={ticketDescriptionRef}>{t('ticket.itemDescription', {
				user: <User user={data.info.user} />,
				status: <TicketStatus status={data.info.status} />,
				category: <A href={'/ticket?category=' + data.info.category}>{t(`ticket.categoryName.${data.info.category}`)}</A>,
				createdAt: <Time time={data.info.created_at} />,
				assignee: data.info.assignee ? <User user={data.info.assignee} /> : t('none')
			})}</p>
			<div ref={ticketContentRef}><MdRender markdown={data.info.content} /></div>
			{currentUser && (currentUser.id === 1 || currentUser.id === data.info.user.id) && <Form ref={ticketEditRef} data-vis='-1' method='post' action='/api/ticket/edit' onSuccess={loadData}>
				<input type='hidden' name='ticket_id' value={id} />
				<FormInput type='text' name='title' label={t('title')} value={data.info.title} required />
				<FormMdEditor name='content' required height='200px' initialCode={data.info.content} />
				<button type='submit'>{t('save')}</button>
				<button onClick={() => {
					if (ticketEditRef.current) {
						ticketEditRef.current.dataset.vis = (-(ticketEditRef.current.dataset.vis || -1)).toString();
					}
				}}>{t('cancel')}</button>
			</Form>}
		</Card>
		<hr />
		{data.replies.length ? data.replies.map(({ id, parent, user, content, set_status, set_assignee, created_at }) => <Card key={'ticket-reply-' + id}>
			<div style={{ position: 'absolute', right: '10px', top: '10px', display: 'flex', gap: '10px' }}>
				<ReplyButton onClick={() => {
					if (
						replyingBlockquoteRef.current
						&& repliesDescriptionRef.current
						&& repliesContentRef.current
						&& replyFormParentIdRef.current
					) {
						const replyDescription = repliesDescriptionRef.current.get(id.toString());
						const replyContent = repliesContentRef.current.get(id.toString());
						if (replyDescription && replyContent) {
							replyingBlockquoteRef.current.dataset.vis = '1';
							setReplyingDescription(replyDescription.innerHTML);
							setReplyingContent(replyContent.innerHTML);
							replyFormParentIdRef.current.value = id.toString();
						}
					}
				}} />
				{currentUser && (currentUser.id === 1 || currentUser.id === user.id) && <>
					<button onClick={() => {
						if (repliesEditRef.current) {
							const replyEdit = repliesEditRef.current.get(id.toString());
							if (replyEdit) {
								replyEdit.dataset.vis = (-(replyEdit.dataset.vis || -1)).toString();
							}
						}
					}}>{t('edit')}</button>
					<DeleteButton href='/api/ticket/reply/delete' arg={{ reply_id: id }} redirect='' onSuccess={loadData} />
				</>}
			</div>
			<div class='description' ref={(el: HTMLElement | null) => {
				if (!repliesDescriptionRef.current) {
					return;
				}
				if (el) {
					repliesDescriptionRef.current.set(id.toString(), el);
				} else {
					repliesDescriptionRef.current.delete(id.toString());
				}
			}}>
				<p>{t('ticket.replyItemDescription', {
					user: <User user={user} />,
					createdAt: <Time time={created_at} />
				})}</p>
				{set_status ? <p>{t('ticket.setStatusTo', { status: <TicketStatus status={set_status} /> })}</p> : null}
				{set_assignee ? <p>{t('ticket.setAssigneeTo', { assignee: <User user={set_assignee} /> })}</p> : null}
			</div>
			{parent && (parent.id === null ? <blockquote>[{t('deleted')}]</blockquote> : <blockquote>
				{t('reply')}&nbsp;{parent.id ? <A href={'/ticket/reply/' + parent.id}>{t('viewDetail')}</A> : <a href='#'>{t('viewDetail')}</a>}
				<div class='description'>
					<p>{t('ticket.replyItemDescription', {
						user: <User user={parent.user} />,
						createdAt: <Time time={parent.created_at} />
					})}</p>
					{parent.set_status ? <p>{t('ticket.setStatusTo', { status: <TicketStatus status={parent.set_status} /> })}</p> : null}
					{parent.set_assignee ? <p>{t('ticket.setAssigneeTo', { assignee: <User user={parent.set_assignee} /> })}</p> : null}
				</div>
				<div><MdRender markdown={parent.content} /></div>
			</blockquote>)}
			<div ref={(el: HTMLDivElement | null) => {
				if (!repliesContentRef.current) {
					return;
				}
				if (el) {
					repliesContentRef.current.set(id.toString(), el);
				} else {
					repliesContentRef.current.delete(id.toString());
				}
			}}><MdRender markdown={content} /></div>
			{currentUser && (currentUser.id === 1 || currentUser.id === user.id) && <Form data-vis='-1' action='/api/ticket/reply/edit' method='post' onSuccess={loadData} ref={(el: HTMLFormElement | null) => {
				if (!repliesEditRef.current) {
					return;
				}
				if (el) {
					repliesEditRef.current.set(id.toString(), el);
				} else {
					repliesEditRef.current.delete(id.toString());
				}
			}}>
				<input type='hidden' name='reply_id' value={id} />
				<FormMdEditor name='content' required height='100px' initialCode={content} />
				<button type='submit'>{t('save')}</button>
				<button onClick={() => {
					if (repliesEditRef.current) {
						const replyEdit = repliesEditRef.current.get(id.toString());
						if (replyEdit) {
							replyEdit.dataset.vis = (-(replyEdit.dataset.vis || -1)).toString();
						}
					}
				}}>{t('cancel')}</button>
			</Form>}
		</Card>) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{t('noReplies')}</h2></Card>}
		<Pages currentPage={page} totalPage={Math.ceil(data.replyCount / perPage)} />
		<Card>
			<blockquote data-vis='-1' ref={replyingBlockquoteRef}>
				<i style={{ position: 'absolute', right: '10px', top: '10px' }} class='fa-solid fa-xmark' onClick={() => {
					if (replyingBlockquoteRef.current && replyFormParentIdRef.current) {
						replyingBlockquoteRef.current.style.display = 'none';
						replyFormParentIdRef.current.value = '';
					}
				}}></i>
				<p class='description' dangerouslySetInnerHTML={{ __html: replyingDescription || '' }} />
				<div dangerouslySetInnerHTML={{ __html: replyingContent || '' }} />
			</blockquote>
			{currentUser && ((currentUser.permission & permissionAdmin) || data.info.assignee && data.info.assignee.id === currentUser.id) ? <div style={{ marginBottom: '10px' }}>
				<strong>{t('admin.ticketQuickReply.name')}</strong>
				&nbsp;
				<span style={{ display: 'inline-flex', gap: '10px' }}>
					{data.quickReplies.map(({ title, content }: { title: string, content: string }) => <button onClick={() => replaceSelectionMdEditor('content', content)}>{title}</button>)}
				</span>
			</div> : null}
			<Form action='/api/ticket/reply' method='post' onSuccess={() => {
				loadData();
				toast(t('postSuccessfully'), 'success');
			}}>
				<input type='hidden' name='ticket_id' value={id} />
				<input type='hidden' name='parent_id' ref={replyFormParentIdRef} value='' />
				{currentUser && ((currentUser.permission & permissionAdmin) || data.info.assignee && data.info.assignee.id === currentUser.id) ? <>
					<FormSelect name='set_status' label={t('ticket.setStatus')} options={[
						{ value: '', label: t('doNotModify'), selected: true },
						...ticketStatus.map(status => ({ value: status, label: <TicketStatus status={status} /> }))
					]} />
					<FormUserSearch name='set_assignee' label={t('ticket.setAssignee')} />
				</> : null}
				<FormMdEditor id='content' name='content' required />
				<ReplyButton />
			</Form>
		</Card>
	</>;
};