import { useEffect, useState } from "hono/jsx";
import { Card } from "../../components/card";
import { t } from "../../i18n";
import { navigate, useParams } from "@w3cj/ruta";
import { NotFound } from "../error";

export const DiscussionReplyRedirect = () => {
	const [data, setData] = useState<{ discussion_id: null } | { discussion_id: number, page: number } | null>(null), replyId = parseInt(useParams<'/discussion/:id'>().id);
	let cancelled = false;
	const loadData = async () => {
		const data = await (await fetch('/api/discussion/reply/redirect?id=' + replyId)).json();
		if (!cancelled) {
			setData(data);
		}
	};
	useEffect(() => {
		loadData();
		return () => cancelled = true;
	}, [replyId]);
	if (!data) {
		return <Card><p>{t('loading')}</p></Card>;
	}
	if (!data.discussion_id) {
		return <NotFound />;
	}
	navigate('/discussion/' + data.discussion_id + '?page=' + data.page);
	return null;
};