import { useParams } from "@w3cj/ruta";
import { useEffect, useState } from "hono/jsx";
import { Card } from "../../../components/card";
import { t } from "../../../i18n";
import { NotFound } from "../../error";
import { subscribeUrlChange } from "../../../utils/urlSearch";
import { Pages } from "../../../components/pages";
import { Judgements } from "../../../components/judgement";
import type { judgementInfo } from "../../../../types";

export const UserDetailJudgement = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const searchParams = new URLSearchParams(search);
	const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1);
	const id = useParams<'/user/:id/*'>().id;
	const [data, setData] = useState<{ results: judgementInfo[], total: number } | null>(null);
	const reload = () => {
		if (id) {
			(async () => setData(await (await fetch(`/api/user/detail/${id}/judgement?page=${page}`)).json()))();
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
			<Judgements data={data.results} />
			<Pages currentPage={page} totalPage={Math.ceil(data.total / 10)} />
		</>;
	}
	return <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{t('nothing')}</h2></Card>;
};