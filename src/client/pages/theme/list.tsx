import { useEffect, useState } from "hono/jsx";
import { subscribeUrlChange } from "../../utils/urlSearch";
import type { themeInfo } from "../../../types";
import { Card } from "../../components/card";
import { t, tString } from "../../i18n";
import { FetchButton } from "../../components/button";
import { setTitle } from "../../utils/setTitle";
import { Pages } from "../../components/pages";
import { A } from "../../components/a";
import { ThemeApplyLink } from "../../components/themeApply";
import { ThemeListTable } from "../../components/themeListTable";

export const ThemeList = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const searchParams = new URLSearchParams(search);
	const perPage = 20;
	const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1);
	const [data, setData] = useState<{
		results: themeInfo[],
		total: number
	} | null>(null);
	const reload = async () => setData(await (await fetch('/api/theme/list')).json());
	useEffect(() => {
		reload();
	}, [page]);
	if (!data) {
		setTitle(tString('loading') + ' - ' + tString('theme.list'));
		return <Card>
			<h1>{t('theme.list')}</h1>
			<button><a href='/theme/create'>{t('theme.create')}</a></button>
			<FetchButton href='/api/theme/apply/0' redirect='' text={t('theme.reset')} />
			<p>{t('loading')}</p>
		</Card>;
	}
	const totalPage = Math.ceil(data.total / perPage);
	setTitle(tString('theme.list'));
	return <Card>
		<h1>{t('theme.list')}</h1>
		<ThemeApplyLink themeId={0} text={t('theme.reset')} />
		&nbsp;
		<A href='/theme/create'>{t('theme.create')}</A>
		{data.results.length ? <ThemeListTable themes={data.results} reload={reload} /> : <p>{t('nothing')}</p>}
		<Pages currentPage={page} totalPage={totalPage} />
	</Card>;
};