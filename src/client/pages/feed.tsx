import { MdRender } from "../components/md/renderer";
import { Card } from "../components/card";
import { Feed } from "../components/feed";
import { User } from "../components/user";
import { Time } from "../components/time";
import { Pages } from "../components/pages";
import { Form, FormMdEditor } from "../components/form";
import { DeleteButton, PostButton, ReplyButton } from "../components/button";
import { t, tString } from "../i18n";
import { useCurrentUser } from "../utils/currentUser";
import { NotFound } from "./error";
import { navigate, useParams } from "@w3cj/ruta";
import { setTitle } from "../utils/setTitle";
import { useEffect, useState } from "hono/jsx";
import type { feedInfo } from "../../routes/api/feed";
import { setValueMdEditor } from "../components/md/editor";
import { subscribeUrlChange } from "../utils/urlSearch";

export default () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const feed_id = parseInt((useParams<'/feed/:id' | '/feed'>() as { id?: string }).id || '0'), currentUser = useCurrentUser();
	setTitle(tString('feeds'));
	const [data, setData] = useState<{
		feed: feedInfo | null,
		replies: feedInfo[],
		total: number
	} | null | undefined>(undefined);
	const perPage = 10;
	const currentPage = Math.max(1, parseInt(new URLSearchParams(search).get('page') || '1') || 1);
	const loadData = async () => setData(await (await fetch(`/api/feed/query/${feed_id}?page=${currentPage}&perpage=${perPage}`)).json());
	useEffect(() => {loadData()}, [feed_id, currentPage]);
	if (data === undefined) {
		return <Card>
			<h1>{t('feeds')}</h1>
			<p>{t('loading')}</p>
		</Card>;
	}
	if (data === null || feed_id && data.feed === null) {
		return <NotFound />;
	}
	const { feed, replies, total } = data;
	const totalPage = Math.ceil(total / perPage);
	return <>
		<Card>
			<h1>{t('feeds')}</h1>
			{feed_id && feed ? <Card>
				{feed.parent ? <Feed feed={feed.parent} reload={() => navigate('/feed')} /> : <></>}
				<User user={feed.user} />
				&nbsp;
				<Time time={feed.created_at} />
				&nbsp;
				{currentUser && (currentUser.id === 1 || currentUser.id === feed.user.id) ? <>
					<button type='button' onclick={`document.getElementById('feed-edit-${feed_id}').dataset.vis *= -1`}>{t('edit')}</button>
					&nbsp;
					<DeleteButton href='/api/feed/delete' arg={{ id: feed_id }} redirect='/feed' />
				</> : <></>}
				<div><MdRender markdown={feed.content} /></div>
				{currentUser && (currentUser.id === 1 || currentUser.id === feed.user.id) ? <Form id={'feed-edit-' + feed_id} data-vis='-1' method='post' action='/api/feed/edit' onSuccess={() => {
					document.getElementById('feed-edit-' + feed_id)!.dataset.vis = '-1';
					loadData();
				}}>
					<input type='hidden' name='id' value={feed_id} />
					<FormMdEditor id={'feed-edit-editor-' + feed_id} name='content' required height='100px' initialCode={feed.content} />
					<button type='submit'>{t('save')}</button>
					<button type='button' onclick={() => document.getElementById('feed-edit-' + feed_id)!.dataset.vis = '-1'}>{t('cancel')}</button>
				</Form> : <></>}
			</Card> : <></>}
			<Form action='/api/feed/reply' method='post' onSuccess={() => {
				setValueMdEditor('main-reply', '');
				loadData();
			}}>
				<input type='hidden' name='parent_id' value={feed_id} />
				<FormMdEditor id='main-reply' name='content' required height='100px' />
				{feed_id ? <ReplyButton /> : <PostButton />}
			</Form>
		</Card>
		{replies.map(feed => <Feed feed={feed} reload={loadData} />)}
		<Pages currentPage={currentPage} totalPage={totalPage} />
	</>;
};