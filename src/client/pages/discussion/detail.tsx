import { useParams } from "@w3cj/ruta";
import { Card } from "../../components/card";
import { t, tString } from "../../i18n";
import { useCurrentUser } from "../../utils/currentUser";
import { useTitle } from "../../utils/useTitle";
import { useEffect, useRef, useState } from "hono/jsx";
import type { discussionInfo, discussionReplyInfo } from "../../../routes/api/discussion";
import { NotFound } from "../error";
import { subscribeUrlChange } from "../../utils/urlSearch";
import { DeleteButton, ReplyButton } from "../../components/button";
import { User } from "../../components/user";
import { A } from "../../components/a";
import { Time } from "../../components/time";
import { MdRender } from "../../components/md/renderer";
import { Form, FormInput, FormMdEditor } from "../../components/form";
import { permissionAdmin } from "../../../settings";
import { toast } from "../../components/toast";
import { Pages } from "../../components/pages";

export const DiscussionDetail = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const currentUser = useCurrentUser(), id = parseInt(useParams<'/discussion/:id'>().id), page = Math.max(1, parseInt(new URLSearchParams(search).get('page') || '1') || 1), perPage = 10;
	const [data, setData] = useState<{ exists: false } | {
		exists: true,
		info: discussionInfo,
		replyCount: number,
		replies: discussionReplyInfo[]
	} | null>(null);
	let cancelled = false;
	const loadData = async () => {
		const data = await (await fetch(`/api/discussion/detail/${id}?page=${page}&perpage=${perPage}`)).json();
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
	const discussionDescriptionRef = useRef<HTMLElement>(null);
	const discussionContentRef = useRef<HTMLElement>(null);
	const discussionEditRef = useRef<HTMLFormElement>(null);
	const repliesDescriptionRef = useRef(new Map<string, HTMLElement>());
	const repliesContentRef = useRef(new Map<string, HTMLElement>());
	const repliesEditRef = useRef(new Map<string, HTMLElement>());
	const replyFormParentIdRef = useRef<HTMLInputElement>(null);
	if (!data) {
		useTitle(tString('loading') + ' - ' + tString('discussion.name'));
		return <Card>{t('loading')}</Card>;
	}
	if (!data.exists) {
		return <NotFound />;
	}
	useTitle(data.info.title + ' - ' + tString(`discussion.categoryName.${data.info.category}`) + ' - ' + tString('discussion.name'));
	return <>
		<Card>
			<div style={{ position: 'absolute', right: '10px', top: '10px', display: 'flex', gap: '10px' }}>
				<ReplyButton onClick={() => {
					if (replyingBlockquoteRef.current
						&& discussionDescriptionRef.current
						&& discussionContentRef.current
						&& replyFormParentIdRef.current) {
						replyingBlockquoteRef.current.dataset.vis = '1';
						setReplyingDescription(discussionDescriptionRef.current.innerHTML);
						setReplyingContent(discussionContentRef.current.innerHTML);
						replyFormParentIdRef.current.value = '0';
					}
				}} />
				{currentUser && (currentUser.id === 1 || currentUser.id === data.info.user.id) && <>
					<button onClick={() => {
						if (discussionEditRef.current) {
							discussionEditRef.current.dataset.vis = (-(discussionEditRef.current.dataset.vis || -1)).toString();
						}
					}}>{t('edit')}</button>
					<DeleteButton href='/api/discussion/delete' arg={{ discussion_id: id }} redirect='/discussion' />
				</>}
			</div>
			<h1>{data.info.pin ? <i class='fa-solid fa-thumbtack' style={{ color: 'gold' }}></i> : <></>}{data.info.title}</h1>
			<p class='description' ref={discussionDescriptionRef}>{t('discussion.itemDescription', {
				user: <User user={data.info.user} />,
				category: <A href={'/discussion?category=' + data.info.category}>{t(`discussion.categoryName.${data.info.category}`)}</A>,
				createdAt: <Time time={data.info.created_at} />
			})}</p>
			<div ref={discussionContentRef}><MdRender markdown={data.info.content} /></div>
			{currentUser && (currentUser.id === 1 || currentUser.id === data.info.user.id) && <Form ref={discussionEditRef} data-vis='-1' method='post' action='/api/discussion/edit' onSuccess={loadData}>
				<input type='hidden' name='discussion_id' value={id} />
				<FormInput type='text' name='title' label={t('title')} value={data.info.title} required />
				<FormMdEditor name='content' required height='200px' initialCode={data.info.content} />
				<button type='submit'>{t('save')}</button>
				<button onClick={() => {
					if (discussionEditRef.current) {
						discussionEditRef.current.dataset.vis = (-(discussionEditRef.current.dataset.vis || -1)).toString();
					}
				}}>{t('cancel')}</button>
			</Form>}
		</Card>
		{currentUser && (currentUser.permission & permissionAdmin) && <Card><Form action='/api/admin/discussion/set-pin' method='post' onSuccess={() => {
			loadData();
			toast(t('setPinSuccessfully'), 'success');
		}}>
			<input type='hidden' name='discussion_id' value={id} />
			<FormInput name='pin' label={t('setPin')} type='number' />
			<button type='submit'>{t('save')}</button>
		</Form></Card>}
		<hr />
		{data.replies.length ? data.replies.map(({ id, parent, user, content, created_at }) => <Card key={'discussion-reply-' + id}>
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
					<DeleteButton href='/api/discussion/reply/delete' arg={{ reply_id: id }} redirect='' onSuccess={loadData} />
				</>}
			</div>
			<p class='description' ref={(el: HTMLElement | null) => {
				if (!repliesDescriptionRef.current) {
					return;
				}
				if (el) {
					repliesDescriptionRef.current.set(id.toString(), el);
				} else {
					repliesDescriptionRef.current.delete(id.toString());
				}
			}}>{t('discussion.replyItemDescription', {
				user: <User user={user} />,
				createdAt: <Time time={created_at} />
			})}</p>
			{parent && (parent.id === null ? <blockquote>[{t('deleted')}]</blockquote> : <blockquote>
				{t('reply')}&nbsp;{parent.id ? <A href={'/discussion/reply/' + parent.id}>{t('viewDetail')}</A> : <a href='#'>{t('viewDetail')}</a>}
				<p class='description'>{t('discussion.replyItemDescription', {
					user: <User user={parent.user} />,
					createdAt: <Time time={parent.created_at} />
				})}</p>
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
			{currentUser && (currentUser.id === 1 || currentUser.id === user.id) && <Form data-vis='-1' action='/api/discussion/reply/edit' method='post' onSuccess={loadData} ref={(el: HTMLFormElement | null) => {
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
			<Form action='/api/discussion/reply' method='post' onSuccess={() => {
				loadData();
				toast(t('postSuccessfully'), 'success');
			}}>
				<input type='hidden' name='discussion_id' value={id} />
				<input type='hidden' name='parent_id' ref={replyFormParentIdRef} value='' />
				<FormMdEditor name='content' required />
				<ReplyButton />
			</Form>
		</Card>
	</>;
};