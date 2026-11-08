import { useEffect, useState } from "hono/jsx";
import { setTitle } from "../../../utils/setTitle";
import { subscribeUrlChange } from "../../../utils/urlSearch";
import { t, tString } from "../../../i18n";
import { Form } from "../../../components/form";
import { Card } from "../../../components/card";
import { toast } from "../../../components/toast";
import { navigate } from "@w3cj/ruta";

export const UserSettingsChangeEmailVerify = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const searchParams = new URLSearchParams(search);
	setTitle(tString('user.settings.security.changeEmail.name'));
	return <Form method='post' action='/api/user/settings/change-email/verify' onSuccess={() => {
		toast(t('user.settings.security.changeEmail.verifySuccessfully'), 'success');
		navigate('/user/settings/security');
	}}>
		<Card style={{
			display: 'flex',
			'flex-direction': 'column',
			'align-items': 'center',
			gap: '10px'
		}}>
			<h1>{t('user.settings.security.changeEmail.name')}</h1>
			<p>{t('user.settings.security.changeEmail.verify', { email: searchParams.get('email') ?? '' })}</p>
			<code style={{
				'font-size': 'xxx-large',
				cursor: 'pointer'
			}} onClick={() => {
				navigator.clipboard.writeText(searchParams.get('code') ?? '');
				toast(t('copiedSuccessfully'), 'success');
			}}>{searchParams.get('code')}</code>
			<input type='hidden' name='email' value={searchParams.get('email') ?? ''} />
			<button type='submit' style={{ 'font-size': 'large' }}>{t('verify')}</button>
		</Card>
	</Form>;
};