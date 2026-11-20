import { useParams } from "@w3cj/ruta";
import type { userInfo } from "../../../types";
import { useEffect, useState } from "hono/jsx";
import { Card } from "../../components/card";
import { t, tString } from "../../i18n";
import { User } from "../../components/user";
import { ErrorPage } from "../error";
import { setTitle } from "../../utils/setTitle";
import { SidebarLayout } from "../../components/layout/sidebar";
import { InfoList } from "../../components/infoList";
import type { ProblemBasicInfo } from "../../../routes/api/problem";
import { ProblemName } from "../../components/problemName";
import { Time } from "../../components/time";
import { toTimeDurationString } from "../../../utils/timeDuration";
import { Editor } from "../../components/editor/editor";
import { programmingLangsToDisplay, programmingLangsToEditorLangs } from "../../../settings";

export const RecordDetail = () => {
	const id = parseInt(useParams<'/record/:id'>().id || '0');
	const [data, setData] = useState<{ success: false, message: string } | { success: true, record: {
		id: number,
		created_at: string,
		status: string,
		score: number | null,
		time_ms: number | null,
		detail: {
			status: string,
			time_ms: number,
			stdout: string,
			stderr: string,
			returncode: number,
			wall_time_ms: number,
			case: number
		}[] | null,
		lang: string,
		code: string,
		user: userInfo,
		problem: ProblemBasicInfo
	} } | null>(null);
	useEffect(() => {
		let cancelled = false;
		const wsurl = new URL('/api/websocket/record/' + id, location.href);
		wsurl.protocol = wsurl.protocol === 'https:' ? 'wss:' : 'ws:';
		const ws = new WebSocket(wsurl.toString());
		let interval: ReturnType<typeof setInterval>;
		ws.addEventListener('message', async ev => {
			const data = JSON.parse(ev.data);
			if (!cancelled) {
				setData(data);
			}
			if (!data.success || !['Waiting', 'Judging'].includes(data.record.status)) {
				cancelled = true;
				clearInterval(interval);
			}
		})
		ws.addEventListener('open', () => {
			interval = setInterval(() => ws.send(''), 1000);
		});
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [id]);
	if (!data) {
		setTitle(tString('loading'));
		return <Card>{t('loading')}</Card>;
	}
	if (!data.success) {
		return <ErrorPage msg={data.message} />;
	}
	setTitle(tString('record.name'));
	return <>
		<Card><h1>{tString('record.name')}</h1></Card>
		<SidebarLayout sidebar={<Card>
			<InfoList items={[
				{ label: t('id'), value: data.record.id.toString() },
				{ label: t('user.user'), value: <User user={data.record.user} /> },
				{ label: t('problem.name'), value: <ProblemName problem={data.record.problem} /> },
				{ label: t('createdAt'), value: <Time time={data.record.created_at} /> },
				{ label: t('language'), value: programmingLangsToDisplay[data.record.lang] ?? t('unknown') },
				{ label: t('status'), value: data.record.status },
				{ label: t('score'), value: data.record.score?.toString() ?? t('none') },
				{ label: t('time'), value: data.record.time_ms ? toTimeDurationString(data.record.time_ms) : t('none') },
			]} />
		</Card>}>
			{data.record.detail && data.record.detail.length ? <Card>
				<table>
					<thead><tr>
						<th>{t('id')}</th>
						<th>{t('status')}</th>
						<th>{t('time')}</th>
					</tr></thead>
					<tbody>{data.record.detail.map(({ status, time_ms, case: caseId }) => <tr>
						<td>#{caseId}</td>
						<td>{status}</td>
						<td>{toTimeDurationString(time_ms)}</td>
					</tr>)}</tbody>
				</table>
			</Card> : null}
			<Card><Editor
				id='code'
				initialCode={data.record.code}
				height='500px'
				lang={programmingLangsToEditorLangs[data.record.lang as keyof typeof programmingLangsToEditorLangs]}
				readOnly
			/></Card>
		</SidebarLayout>
	</>;
}