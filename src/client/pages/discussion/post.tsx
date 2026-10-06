import { navigate } from "@w3cj/ruta";
import { enableEmailVerify, permissionSpeak } from "../../../settings";
import { Card } from "../../components/card";
import { Form, FormInput, FormMdEditor, FormSelect } from "../../components/form";
import { useCurrentUser, useCurrentUserEmail } from "../../utils/currentUser";
import { t, tString } from "../../i18n";
import { useTitle } from "../../utils/useTitle";
import { EmailVerifyRequired, LoginRequired, Muted } from "../error";
import { discussionCategories } from "../../../routes/api/discussion";

export const DiscussionPost = () => {
	const currentUser = useCurrentUser();
	if (!currentUser) {
		return <LoginRequired />;
	}
	if (!(currentUser.permission & permissionSpeak)) {
		return <Muted />;
	}
	if (enableEmailVerify && !useCurrentUserEmail()) {
		return <EmailVerifyRequired />;
	}
	const category = new URLSearchParams(location.search).get('category');
	useTitle(tString('discussion.post'));
	return <Card>
		<h1>{t('discussion.post')}</h1>
		<Form action='/api/discussion/post' method='post' onSuccess={data => navigate('/discussion/' + data.id)}>
			<FormSelect id='category' name='category' label={t('category')} options={
				Object.entries(discussionCategories).map(([key, check]) => ({ value: key, label: t('discussion.categoryName.' + key), selected: category === key, disabled: !check(currentUser) }))
			} />
			<FormInput id='title' name='title' label={t('title')} required type='text' />
			<FormMdEditor id='content' name='content' label={t('content')} required />
			<button type='submit'>{t('discussion.post')}</button>
		</Form>
	</Card>;
};