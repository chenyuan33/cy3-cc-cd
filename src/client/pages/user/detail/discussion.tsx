import { useParams } from "@w3cj/ruta";
import { useEffect, useState } from "hono/jsx";
import { Card } from "../../../components/card";
import { t } from "../../../i18n";
import { NotFound } from "../../error";
import { subscribeUrlChange } from "../../../utils/urlSearch";
import { Pages } from "../../../components/pages";
import type { discussionBasicInfo } from "../../../../routes/api/discussion";
import { DiscussionItem } from "../../../components/discussionItem";

export const UserDetailDiscussion = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const searchParams = new URLSearchParams(search);
	const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1);
	const id = useParams<'/user/:id/*'>().id;
	const [data, setData] = useState<{ results: discussionBasicInfo[], total: number } | null>(null);
	const reload = () => {
		if (id) {
			(async () => setData(await (await fetch(`/api/user/detail/${id}/discussion?page=${page}`)).json()))();
		}
	};
	useEffect(reload, [id, page]);
	if (!id) {
		return <NotFound />;
	}
	if (!data) {
		return <Card><h1>{t('loading')}</h1></Card>;
	}
	if (!data.results) {
		return <NotFound />;
	}
	if (data.results.length) {
		return <>
			{data.results.map(discussion => <DiscussionItem discussion={discussion} />)}
			<Pages currentPage={page} totalPage={Math.ceil(data.total / 10)} />
		</>;
	}
	return <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{t('nothing')}</h2></Card>;
};