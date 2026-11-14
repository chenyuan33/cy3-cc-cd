import { useParams } from "@w3cj/ruta";
import type { userInfo } from "../../../types";
import { useEffect, useState } from "hono/jsx";
import { Card } from "../../components/card";
import { t, tString } from "../../i18n";
import { User } from "../../components/user";
import { ErrorPage } from "../error";
import { setTitle } from "../../utils/setTitle";
import { useCurrentUser } from "../../utils/currentUser";
import { SidebarLayout } from "../../components/layout/sidebar";
import { InfoList } from "../../components/infoList";
import { A } from "../../components/a";
import { DeleteLink } from "../../components/button";

export const ProblemDetail = () => {
	const id = parseInt(useParams<'/problem/:id'>().id || '0'), currentUser = useCurrentUser();
	const [data, setData] = useState<{ success: false, message: string } | { success: true, problem: { id: number, title: string, content: string, created_at: string, user: userInfo } } | null>(null);
	useEffect(() => {
		let cancelled = false;
		(async () => {
			const data = await (await fetch(`/api/problem/${id}`)).json<{ success: false, message: string } | { success: true, problem: { id: number, title: string, content: string, created_at: string, user: userInfo } }>();
			if (!cancelled) {
				setData(data);
			}
		})();
		return () => cancelled = true;
	}, [id]);
	if (!data) {
		setTitle(tString('loading'));
		return <Card>{t('loading')}</Card>;
	}
	if (!data.success) {
		return <ErrorPage msg={data.message} />;
	}
	setTitle(data.problem.title);
	return <SidebarLayout sidebar={<Card>
		<InfoList items={[
			{ label: t('problem.id'), value: data.problem.id.toString() },
			{ label: t('createdAt'), value: data.problem.created_at },
			{ label: t('creator'), value: <User user={data.problem.user} /> }
		]} />
		{currentUser && (currentUser.id === data.problem.user.id || currentUser.id === 1) ? <>
			<p><A href={`/problem/${data.problem.id}/edit`}>{t('problem.edit')}</A></p>
			<p><DeleteLink href={`/api/problem/${data.problem.id}`} redirect='/problem' /></p>
		</> : null}
	</Card>}><Card>
		<h1>{data.problem.title}</h1>
		<p>{data.problem.content}</p>
	</Card></SidebarLayout>;
}