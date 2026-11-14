import { useParams } from "@w3cj/ruta";
import { enableEmailVerify } from "../../../settings";
import { Card } from "../../components/card";
import { Form, FormInput, FormMdEditor } from "../../components/form";
import { useCurrentUser, useCurrentUserEmail } from "../../utils/currentUser";
import { t, tString } from "../../i18n";
import { setTitle } from "../../utils/setTitle";
import { AccessDenied, EmailVerifyRequired, ErrorPage, LoginRequired } from "../error";
import { useEffect, useState } from "hono/jsx";
import type { userInfo } from "../../../types";
import { toast } from "../../components/toast";
import { A } from "../../components/a";

export const ProblemEdit = () => {
	const currentUser = useCurrentUser();
	const id = parseInt(useParams<'/problem/:id/edit'>().id || '0');
	const [data, setData] = useState<{ success: false, message: string } | { success: true, problem: { id: number, title: string, content: string, created_at: string, user: userInfo } } | null>(null);
	useEffect(() => {
		let cancelled = !currentUser || enableEmailVerify && !useCurrentUserEmail();
		if (!cancelled) {
			(async () => {
				const data = await (await fetch(`/api/problem/${id}`)).json<{ success: false, message: string } | { success: true, problem: { id: number, title: string, content: string, created_at: string, user: userInfo } }>();
				if (!cancelled) {
					setData(data);
				}
			})();
		}
		return () => cancelled = true;
	}, [id]);
	if (!currentUser) {
		return <LoginRequired />;
	}
	if (enableEmailVerify && !useCurrentUserEmail()) {
		return <EmailVerifyRequired />;
	}
	if (!data) {
		setTitle(tString('loading'));
		return <Card>{t('loading')}</Card>;
	}
	if (!data.success) {
		return <ErrorPage msg={data.message} />;
	}
	if (data.problem.user.id !== currentUser.id) {
		return <AccessDenied />;
	}
	setTitle(tString('problem.edit'));
	return <Card>
		<h1>{t('problem.edit')}</h1>
		<p><A href={`/problem/${data.problem.id}`}>{t('problem.back')}</A></p>
		<Form action={`/api/problem/${data.problem.id}`} method='put' onSuccess={() => toast(t('savedSuccessful'), 'success')}>
			<FormInput id='title' name='title' label={t('title')} required type='text' value={data.problem.title} />
			<FormMdEditor id='content' name='content' label={t('content')} required initialCode={data.problem.content} />
			<button type='submit'>{t('save')}</button>
		</Form>
	</Card>;
};