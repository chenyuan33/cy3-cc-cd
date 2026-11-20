import { useParams } from "@w3cj/ruta";
import { enableEmailVerify } from "../../../settings";
import { Card } from "../../components/card";
import { Form, FormInput, FormMdEditor } from "../../components/form";
import { useCurrentUser, useCurrentUserEmail } from "../../utils/currentUser";
import { t, tString } from "../../i18n";
import { setTitle } from "../../utils/setTitle";
import { AccessDenied, EmailVerifyRequired, ErrorPage, LoginRequired } from "../error";
import { useEffect, useRef, useState } from "hono/jsx";
import { toast } from "../../components/toast";
import { A } from "../../components/a";
import type { ProblemInfo } from "../../../routes/api/problem";

export const ProblemEdit = () => {
	const currentUser = useCurrentUser();
	const id = parseInt(useParams<'/problem/:id/edit'>().id || '0');
	const [data, setData] = useState<{ success: false, message: string } | { success: true, problem: ProblemInfo } | null>(null);
	const [testCases, setTestCases] = useState<{ key: number, input: string, output: string }[] | null>(null);
	useEffect(() => {
		let cancelled = !currentUser || enableEmailVerify && !useCurrentUserEmail();
		if (!cancelled) {
			(async () => {
				const data = await (await fetch(`/api/problem/${id}`)).json<{ success: false, message: string } | { success: true, problem: ProblemInfo }>();
				if (!cancelled) {
					setData(data);
				}
			})();
			(async () => {
				const data = await (await fetch(`/api/problem/${id}/test-cases`)).json<{ success: false, message: string } | { success: true, test_cases: { input: string, output: string }[] }>();
				if (!cancelled && data.success) {
					setTestCases(data.test_cases.map(({ input, output }) => ({ input, output, key: Math.random() })))
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
			<h2>{t('problem.testCasesSettings')}</h2>
			{testCases ? <>
				<input type='hidden' name='testcases' value={JSON.stringify(testCases.map(({ key, input, output }) => ({ input, output })))} />
				<a href='javascript:void(0)' onClick={() => setTestCases(prev => prev ? [ ...prev, { key: Math.random(), input: '', output: '' } ] : null)}>{t('problem.addATestCase')}</a>
				&nbsp;
				<A href={`/file/problem/${data.problem.id}/`}>{t('problem.manageTheFilesForThisProblem')}</A>
				<table>
					<thead><tr>
						<th>{t('problem.inputFile')}</th>
						<th>{t('problem.outputFile')}</th>
						<th>{t('operations')}</th>
					</tr></thead>
					<tbody>{testCases.map(({ key, input, output }) => <tr key={key}>
						<td><input type='text' value={input} onInput={(ev) => setTestCases(prev => prev?.map(k => k.key === key ? { ...k, input: (ev.target! as HTMLInputElement).value } : k) ?? null)} /></td>
						<td><input type='text' value={output} onInput={(ev) => setTestCases(prev => prev?.map(k => k.key === key ? { ...k, output: (ev.target! as HTMLInputElement).value } : k) ?? null)} /></td>
						<a href='javascript:void(0)' onClick={() => setTestCases(prev => prev?.filter(({ key: curKey }) => curKey !== key) ?? null)}>{t('problem.removeThisTestCase')}</a>
					</tr>)}</tbody>
				</table>
			</> : <p>{t('loading')}</p>}
			<button type='submit'>{t('save')}</button>
		</Form>
	</Card>;
};