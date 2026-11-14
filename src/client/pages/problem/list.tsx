import { useEffect, useState } from "hono/jsx";
import type { userInfo } from "../../../types";
import { subscribeUrlChange } from "../../utils/urlSearch";
import { t, tString } from "../../i18n";
import { Card } from "../../components/card";
import { ProblemListTable } from "../../components/problemListTable";
import { setTitle } from "../../utils/setTitle";
import { A } from "../../components/a";

export const ProblemList = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const searchParams = new URLSearchParams(search);
	const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1);
	const [problems, setProblems] = useState<{
		problems: { id: number, title: string, created_at: string, user: userInfo }[],
		total: number
	} | null>(null);
	useEffect(() => {
		let cancelled = false;
		(async () => {
			const data = await (await fetch(`/api/problem?perpage=20&page=${page}`)).json<{
				problems: { id: number, title: string, created_at: string, user: userInfo }[],
				total: number
			}>();
			if (!cancelled) {
				setProblems(data);
			}
		})();
		return () => cancelled = true;
	}, [page]);
	if (!problems) {
		setTitle(tString('loading') + ' - ' + tString('problem.list'));
		return <Card>
			<h1>{t('problem.list')}</h1>
			<p><A href='/problem/post'>{t('problem.post')}</A></p>
			{t('loading')}
		</Card>;
	}
	setTitle(tString('problem.list'));
	return <Card>
		<h1>{t('problem.list')}</h1>
		<p><A href='/problem/post'>{t('problem.post')}</A></p>
		{problems.problems.length ? <ProblemListTable problems={problems.problems} /> : <h2 style={{ textAlign: 'center' }}>{t('nothing')}</h2>}
	</Card>;
};