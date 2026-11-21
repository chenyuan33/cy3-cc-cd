import { useEffect, useState } from "hono/jsx";
import { useCurrentUser } from "../../utils/currentUser";
import { ErrorPage, LoginRequired } from "../error";
import { Card } from "../../components/card";
import { setTitle } from "../../utils/setTitle";
import { t, tString } from "../../i18n";
import { Form, FormInput } from "../../components/form";
import { subscribeUrlChange } from "../../utils/urlSearch";
import type { userInfo } from "../../../types";
import type { ProblemBasicInfo } from "../../../routes/api/problem";
import { Pages } from "../../components/pages";
import { User } from "../../components/user";
import { ProblemName } from "../../components/problemName";
import { Time } from "../../components/time";
import { A } from "../../components/a";
import { toTimeDurationString } from "../../../utils/timeDuration";
import { programmingLangsToDisplay } from "../../../settings";

export const RecordList = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const searchParams = new URLSearchParams(search);
	const currentUser = useCurrentUser();
	const pid = searchParams.get('pid') ?? '';
	const uid = searchParams.get('uid') ?? '';
	const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
	const perPage = 20;
	const [data, setData] = useState<{ success: false; message: string } | {
		success: true;
		list: {
			id: number;
			created_at: string;
			status: string;
			score: number;
			time_ms: number;
			lang: string;
			user: userInfo;
			problem: ProblemBasicInfo;
		}[];
		total: number;
	} | null>(null);
	useEffect(() => {
		let cancelled = false;
		(async () => setData(await (await fetch(`/api/record?pid=${pid}&uid=${uid}&page=${page}&perPage=${perPage}`)).json()))();
		return () => cancelled = true;
	}, [pid, uid]);
	if (!currentUser) {
		return <LoginRequired />;
	}
	if (!data) {
		setTitle(tString('loading') + ' - ' + tString('record.list'));
		return <Card>
			<h1>{t('record.list')}</h1>
			<Form action='' method='get'>
				<FormInput type='number' name='pid' label={t('problem.id')} />
				<FormInput type='number' name='uid' label={t('userInfo.uid')} />
				<button type='submit'>{t('filter')}</button>
			</Form>
			<p>{t('loading')}</p>
		</Card>;
	}
	if (!data.success) {
		return <ErrorPage msg={data.message} />;
	}
	setTitle(tString('record.list'));
	return <Card>
		<h1>{t('record.list')}</h1>
		<Form action='' method='get'>
			<FormInput type='number' name='pid' label={t('problem.id')} />
			<FormInput type='number' name='uid' label={t('userInfo.uid')} />
			<button type='submit'>{t('filter')}</button>
		</Form>
		<table>
			<thead><tr>
				<th>{t('user.user')}</th>
				<th>{t('status')}</th>
				<th>{t('score')}</th>
				<th>{t('problem.name')}</th>
				<th>{t('language')}</th>
				<th>{t('time')}</th>
				<th>{t('createdAt')}</th>
			</tr></thead>
			<tbody>
				{data.list.map(item => <tr key={'record-item-' + item.id}>
					<td><User user={item.user} /></td>
					<td><A href={`/record/${item.id}`}>{item.status}</A></td>
					<td>{item.score}</td>
					<td><ProblemName problem={item.problem} /></td>
					<td>{programmingLangsToDisplay[item.lang]}</td>
					<td>{item.time_ms ? toTimeDurationString(item.time_ms) : null}</td>
					<td><Time time={item.created_at} /></td>
				</tr>)}
			</tbody>
		</table>
		<Pages currentPage={page} totalPage={Math.ceil(data.total / perPage)} />
	</Card>;
};