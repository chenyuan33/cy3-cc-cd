import { navigate } from "@w3cj/ruta";
import { enableEmailVerify } from "../../../settings";
import { Card } from "../../components/card";
import { Form, FormInput, FormMdEditor } from "../../components/form";
import { useCurrentUser, useCurrentUserEmail } from "../../utils/currentUser";
import { t, tString } from "../../i18n";
import { setTitle } from "../../utils/setTitle";
import { EmailVerifyRequired, LoginRequired } from "../error";

export const ProblemPost = () => {
	const currentUser = useCurrentUser();
	if (!currentUser) {
		return <LoginRequired />;
	}
	if (enableEmailVerify && !useCurrentUserEmail()) {
		return <EmailVerifyRequired />;
	}
	setTitle(tString('problem.post'));
	return <Card>
		<h1>{t('problem.post')}</h1>
		<Form action='/api/problem' method='post' onSuccess={data => navigate('/problem/' + data.id)}>
			<FormInput id='title' name='title' label={t('title')} required type='text' />
			<FormMdEditor id='content' name='content' label={t('content')} required />
			<button type='submit'>{t('problem.post')}</button>
		</Form>
	</Card>;
};