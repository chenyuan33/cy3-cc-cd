import { useEffect, useState } from "hono/jsx";
import { Card } from "../../components/card";
import { t } from "../../i18n";
import { navigate, useParams } from "@w3cj/ruta";
import { NotFound } from "../error";

export const TicketReplyRedirect = () => {
	const [data, setData] = useState<{ ticket_id: null } | { ticket_id: number, page: number } | null>(null), replyId = parseInt(useParams<'/ticket/:id'>().id);
	let cancelled = false;
	const loadData = async () => {
		const data = await (await fetch('/api/ticket/reply/redirect?id=' + replyId)).json();
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
	if (!data.ticket_id) {
		return <NotFound />;
	}
	navigate('/ticket/' + data.ticket_id + '?page=' + data.page);
	return null;
};